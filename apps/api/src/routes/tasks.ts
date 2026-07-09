import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { tasks, payments, taskEvents, workers } from "@yaas/db";
import {
  createTaskSchema,
  SLA_MINUTES,
  workerFeedQuerySchema,
} from "@yaas/shared";
import { getDb } from "../db.js";
import { agentAuth, workerAuth, type AgentContext, type WorkerContext } from "../middleware/auth.js";
import { checkBudgetCaps, formatTask } from "./agents.js";
import { enqueueTaskJobs, verificationQueue, processVerificationInline } from "../queue/index.js";
import { verifyProof } from "../verify/index.js";
import { uploadProof } from "../storage/r2.js";
import {
  createStripeClient,
  createEscrowPaymentIntent,
} from "@yaas/stripe";
import { config } from "../config.js";
import { haversineKm } from "../lib/geo.js";
import { getLocalProof } from "../storage/r2.js";

export const taskRoutes = new Hono<{ Variables: AgentContext & WorkerContext }>();

taskRoutes.post("/", agentAuth, async (c) => {
  const agentId = c.get("agentId");
  const body = await c.req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const budgetCents = Math.round(parsed.data.budget_usd * 100);
  const slaMinutes = SLA_MINUTES[parsed.data.urgency];

  const budgetCheck = await checkBudgetCaps(agentId, budgetCents);
  if (!budgetCheck.ok) {
    return c.json({ error: budgetCheck.reason }, 402);
  }

  const db = getDb();
  const { agents: agentsTable } = await import("@yaas/db");
  const [agent] = await db
    .select()
    .from(agentsTable)
    .where(eq(agentsTable.id, agentId));

  let paymentIntentId: string | undefined;

  if (config.stripeSecretKey && agent?.stripeCustomerId && !config.skipStripe) {
    const stripe = createStripeClient(config.stripeSecretKey);
    paymentIntentId = await createEscrowPaymentIntent(
      stripe,
      budgetCents,
      agent.stripeCustomerId,
      { agentId }
    );
  } else {
    paymentIntentId = `pi_dev_${Date.now()}`;
  }

  const [task] = await db
    .insert(tasks)
    .values({
      agentId,
      type: parsed.data.taskType,
      description: parsed.data.description,
      location: parsed.data.location,
      skillsRequired: parsed.data.skillsRequired,
      urgency: parsed.data.urgency,
      budgetCents,
      slaMinutes,
      proofType: parsed.data.proofRequired ?? "photo",
      status: "open",
    })
    .returning();

  await db.insert(payments).values({
    taskId: task.id,
    amountCents: budgetCents,
    status: "escrowed",
    method: "stripe",
    paymentIntentId,
  });

  await db.insert(taskEvents).values({
    taskId: task.id,
    eventType: "created",
    metadata: { budgetCents, urgency: parsed.data.urgency },
  });

  await enqueueTaskJobs(task.id, slaMinutes);

  return c.json(formatTask(task), 201);
});

taskRoutes.get("/feed", workerAuth, async (c) => {
  const workerId = c.get("workerId");
  const query = workerFeedQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    return c.json({ error: "Invalid query", details: query.error.flatten() }, 400);
  }

  const db = getDb();
  const [worker] = await db.select().from(workers).where(eq(workers.id, workerId));

  const openTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.status, "open"))
    .orderBy(sql`${tasks.createdAt} DESC`);

  const lat = query.data.lat ?? worker?.lat;
  const lng = query.data.lng ?? worker?.lng;
  const radiusKm = query.data.radius_km;

  const filtered = openTasks.filter((task) => {
    if (query.data.minPayCents && task.budgetCents < query.data.minPayCents) {
      return false;
    }
    if (query.data.skills) {
      const required = query.data.skills.split(",");
      if (!required.every((s) => task.skillsRequired?.includes(s))) return false;
    }
    if (task.location && lat != null && lng != null) {
      const dist = haversineKm(lat, lng, task.location.lat, task.location.lng);
      if (dist > radiusKm) return false;
    }
    return true;
  });

  return c.json(filtered.map(formatTask));
});

taskRoutes.get("/:id", agentAuth, async (c) => {
  const agentId = c.get("agentId");
  const taskId = c.req.param("id");
  const db = getDb();

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.agentId, agentId)));

  if (!task) return c.json({ error: "Task not found" }, 404);
  return c.json(formatTask(task));
});

taskRoutes.get("/:id/public", async (c) => {
  const taskId = c.req.param("id");
  const db = getDb();
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) return c.json({ error: "Task not found" }, 404);
  return c.json(formatTask(task));
});

taskRoutes.post("/:id/claim", workerAuth, async (c) => {
  const workerId = c.get("workerId");
  const taskId = c.req.param("id");
  const db = getDb();

  const [updated] = await db
    .update(tasks)
    .set({
      status: "claimed",
      workerId,
      claimedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.status, "open")))
    .returning();

  if (!updated) {
    return c.json({ error: "Task not available for claim" }, 409);
  }

  await db.insert(taskEvents).values({
    taskId,
    eventType: "claimed",
    metadata: { workerId },
  });

  return c.json(formatTask(updated));
});

taskRoutes.patch("/:id/complete", workerAuth, async (c) => {
  const workerId = c.get("workerId");
  const taskId = c.req.param("id");
  const db = getDb();

  const [task] = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.workerId, workerId),
        sql`${tasks.status} IN ('claimed', 'in_progress', 'verification')`
      )
    );

  if (!task) {
    return c.json({ error: "Task not found or not claimable" }, 404);
  }

  const contentType = c.req.header("content-type") ?? "";
  let fileBuffer: Buffer | undefined;
  let submittedLat: number | undefined;
  let submittedLng: number | undefined;
  let text: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const form = await c.req.parseBody();
    const file = form["file"];
    if (file && typeof file !== "string") {
      fileBuffer = Buffer.from(await file.arrayBuffer());
    }
    if (form["lat"]) submittedLat = parseFloat(String(form["lat"]));
    if (form["lng"]) submittedLng = parseFloat(String(form["lng"]));
    if (form["text"]) text = String(form["text"]);
  } else {
    const body = await c.req.json();
    if (body.lat) submittedLat = body.lat;
    if (body.lng) submittedLng = body.lng;
    if (body.text) text = body.text;
  }

  const proofType = task.proofType ?? "photo";
  const result = await verifyProof({
    proofType,
    fileBuffer,
    submittedLat,
    submittedLng,
    text,
    taskLocation: task.location ?? undefined,
  });

  if (!result.passed) {
    await db
      .update(tasks)
      .set({ status: "verification" })
      .where(eq(tasks.id, taskId));

    await db.insert(taskEvents).values({
      taskId,
      eventType: "verification_failed",
      metadata: { reason: result.reason },
    });

    return c.json({ error: result.reason, status: "verification_failed" }, 422);
  }

  let proofUrl = "";
  if (fileBuffer) {
    const key = `proofs/${taskId}/${Date.now()}`;
    proofUrl = await uploadProof(key, fileBuffer, "image/jpeg");
  }

  await db
    .update(tasks)
    .set({ status: "in_progress" })
    .where(eq(tasks.id, taskId));

  await db.insert(taskEvents).values({
    taskId,
    eventType: "proof_submitted",
    metadata: result.metadata,
  });

  const verifyData = {
    taskId,
    workerId,
    proofUrl,
    proofMetadata: result.metadata ?? {},
  };

  if (config.skipQueues) {
    await processVerificationInline(verifyData);
  } else {
    await verificationQueue.add("verify", verifyData);
  }

  const [updated] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId));

  return c.json(formatTask(updated!));
});

export const proofRoutes = new Hono();

proofRoutes.get("/proofs/:key{.+}", async (c) => {
  const key = c.req.param("key");
  const buffer = getLocalProof(key);
  if (!buffer) return c.json({ error: "Not found" }, 404);
  return c.body(new Uint8Array(buffer), 200, { "Content-Type": "image/jpeg" });
});
