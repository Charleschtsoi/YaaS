import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { workers } from "@yaas/db";
import { registerWorkerSchema, loginWorkerSchema } from "@yaas/shared";
import { getDb } from "../db.js";
import { workerAuth, type WorkerContext } from "../middleware/auth.js";
import { hashPassword, verifyPassword } from "../lib/crypto.js";
import { signWorkerToken } from "../lib/jwt.js";
import {
  createStripeClient,
  createConnectAccount,
  createConnectOnboardingLink,
} from "@yaas/stripe";
import { config } from "../config.js";

export const workerRoutes = new Hono<{ Variables: WorkerContext }>();

workerRoutes.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = registerWorkerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const db = getDb();
  const existing = await db
    .select()
    .from(workers)
    .where(eq(workers.email, parsed.data.email));

  if (existing.length > 0) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const passwordHash = await hashPassword(parsed.data.password);

  let stripeConnectId: string | undefined;
  if (config.stripeSecretKey && !config.skipStripe) {
    const stripe = createStripeClient(config.stripeSecretKey);
    stripeConnectId = await createConnectAccount(stripe, parsed.data.email);
  }

  const [worker] = await db
    .insert(workers)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      skills: parsed.data.skills,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      hourlyRateCents: parsed.data.hourlyRateCents,
      stripeConnectId,
    })
    .returning();

  const token = await signWorkerToken(worker.id);

  return c.json({
    id: worker.id,
    name: worker.name,
    email: worker.email,
    token,
  });
});

workerRoutes.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = loginWorkerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const db = getDb();
  const [worker] = await db
    .select()
    .from(workers)
    .where(eq(workers.email, parsed.data.email));

  if (!worker) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(parsed.data.password, worker.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await signWorkerToken(worker.id);

  return c.json({
    id: worker.id,
    name: worker.name,
    email: worker.email,
    token,
  });
});

workerRoutes.use("/me/*", workerAuth);
workerRoutes.use("/feed", workerAuth);

workerRoutes.get("/me", async (c) => {
  const workerId = c.get("workerId");
  const db = getDb();
  const [worker] = await db.select().from(workers).where(eq(workers.id, workerId));
  if (!worker) return c.json({ error: "Not found" }, 404);

  return c.json({
    id: worker.id,
    name: worker.name,
    email: worker.email,
    skills: worker.skills,
    lat: worker.lat,
    lng: worker.lng,
    hourlyRateCents: worker.hourlyRateCents,
    rating: worker.rating,
    completedTasks: worker.completedTasks,
    stripeConnectId: worker.stripeConnectId,
  });
});

workerRoutes.get("/me/earnings", async (c) => {
  const workerId = c.get("workerId");
  const db = getDb();
  const { payments: paymentsTable } = await import("@yaas/db");

  const earnings = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.workerId, workerId));

  const totalReleased = earnings
    .filter((p) => p.status === "released")
    .reduce((sum, p) => sum + p.amountCents, 0);

  return c.json({
    totalEarnedCents: totalReleased,
    payments: earnings.map((p) => ({
      id: p.id,
      taskId: p.taskId,
      amountCents: p.amountCents,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
  });
});

workerRoutes.post("/me/connect-onboarding", async (c) => {
  const workerId = c.get("workerId");
  const db = getDb();
  const [worker] = await db.select().from(workers).where(eq(workers.id, workerId));
  if (!worker) return c.json({ error: "Not found" }, 404);

  if (!worker.stripeConnectId) {
    return c.json({ error: "No Connect account" }, 400);
  }

  if (config.skipStripe || !config.stripeSecretKey) {
    return c.json({ url: "https://connect.stripe.com/setup/dev" });
  }

  const stripe = createStripeClient(config.stripeSecretKey);
  const url = await createConnectOnboardingLink(
    stripe,
    worker.stripeConnectId,
    `${c.req.header("origin") ?? "http://localhost:5174"}/profile`,
    `${c.req.header("origin") ?? "http://localhost:5174"}/profile`
  );

  return c.json({ url });
});
