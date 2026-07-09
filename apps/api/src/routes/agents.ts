import { Hono } from "hono";
import { eq, and, gte, sql } from "drizzle-orm";
import { agents, tasks, payments, taskEvents } from "@yaas/db";
import { registerAgentSchema, updateBudgetSchema, SLA_MINUTES } from "@yaas/shared";
import { getDb } from "../db.js";
import { agentAuth, type AgentContext } from "../middleware/auth.js";
import {
  generateApiKey,
  hashApiKey,
} from "../lib/crypto.js";
import { createStripeClient, createCustomer, createSetupIntent } from "@yaas/stripe";
import { config } from "../config.js";

export const agentRoutes = new Hono<{ Variables: AgentContext }>();

agentRoutes.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = registerAgentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const apiKey = generateApiKey();
  const apiKeyHash = await hashApiKey(apiKey);
  const db = getDb();

  let stripeCustomerId: string | undefined;
  if (config.stripeSecretKey && !config.skipStripe) {
    const stripe = createStripeClient(config.stripeSecretKey);
    stripeCustomerId = await createCustomer(stripe, parsed.data.name, parsed.data.email);
  }

  const [agent] = await db
    .insert(agents)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      apiKeyHash,
      stripeCustomerId,
    })
    .returning();

  return c.json({
    id: agent.id,
    name: agent.name,
    apiKey,
    message: "Save your API key — it won't be shown again.",
  });
});

agentRoutes.use("/me/*", agentAuth);

agentRoutes.get("/me", async (c) => {
  const agentId = c.get("agentId");
  const db = getDb();
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) return c.json({ error: "Not found" }, 404);

  return c.json({
    id: agent.id,
    name: agent.name,
    email: agent.email,
    dailyBudgetCents: agent.dailyBudgetCents,
    monthlyBudgetCents: agent.monthlyBudgetCents,
    stripeCustomerId: agent.stripeCustomerId,
  });
});

agentRoutes.patch("/me/budget", async (c) => {
  const agentId = c.get("agentId");
  const body = await c.req.json();
  const parsed = updateBudgetSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const db = getDb();
  const [agent] = await db
    .update(agents)
    .set(parsed.data)
    .where(eq(agents.id, agentId))
    .returning();

  return c.json({
    dailyBudgetCents: agent.dailyBudgetCents,
    monthlyBudgetCents: agent.monthlyBudgetCents,
  });
});

agentRoutes.get("/me/tasks", async (c) => {
  const agentId = c.get("agentId");
  const db = getDb();
  const agentTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.agentId, agentId))
    .orderBy(sql`${tasks.createdAt} DESC`);

  return c.json(agentTasks.map(formatTask));
});

agentRoutes.post("/me/setup-intent", async (c) => {
  const agentId = c.get("agentId");
  const db = getDb();
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent?.stripeCustomerId) {
    return c.json({ error: "No Stripe customer" }, 400);
  }

  if (config.skipStripe || !config.stripeSecretKey) {
    return c.json({ clientSecret: "dev_setup_intent_secret" });
  }

  const stripe = createStripeClient(config.stripeSecretKey);
  const { clientSecret } = await createSetupIntent(stripe, agent.stripeCustomerId);
  return c.json({ clientSecret });
});

export async function checkBudgetCaps(
  agentId: string,
  amountCents: number
): Promise<{ ok: boolean; reason?: string }> {
  const db = getDb();
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) return { ok: false, reason: "Agent not found" };

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [dailySpend] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)` })
    .from(payments)
    .innerJoin(tasks, eq(payments.taskId, tasks.id))
    .where(
      and(
        eq(tasks.agentId, agentId),
        gte(payments.createdAt, startOfDay),
        sql`${payments.status} IN ('escrowed', 'released')`
      )
    );

  const [monthlySpend] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)` })
    .from(payments)
    .innerJoin(tasks, eq(payments.taskId, tasks.id))
    .where(
      and(
        eq(tasks.agentId, agentId),
        gte(payments.createdAt, startOfMonth),
        sql`${payments.status} IN ('escrowed', 'released')`
      )
    );

  if (agent.dailyBudgetCents && dailySpend.total + amountCents > agent.dailyBudgetCents) {
    return { ok: false, reason: "Daily budget cap exceeded" };
  }
  if (
    agent.monthlyBudgetCents &&
    monthlySpend.total + amountCents > agent.monthlyBudgetCents
  ) {
    return { ok: false, reason: "Monthly budget cap exceeded" };
  }

  return { ok: true };
}

function formatTask(task: typeof tasks.$inferSelect) {
  return {
    id: task.id,
    agentId: task.agentId,
    workerId: task.workerId,
    type: task.type,
    description: task.description,
    location: task.location,
    skillsRequired: task.skillsRequired,
    urgency: task.urgency,
    budgetCents: task.budgetCents,
    currency: task.currency,
    status: task.status,
    slaMinutes: task.slaMinutes,
    proofType: task.proofType,
    proofUrl: task.proofUrl,
    resultPayload: task.resultPayload,
    createdAt: task.createdAt.toISOString(),
    claimedAt: task.claimedAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
  };
}

export { formatTask };
