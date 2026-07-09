import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { agents } from "@yaas/db";
import { getDb } from "../db.js";
import { verifyApiKey } from "../lib/crypto.js";
import { verifyWorkerToken } from "../lib/jwt.js";

export type AgentContext = { agentId: string };
export type WorkerContext = { workerId: string };

export const agentAuth = createMiddleware<{
  Variables: AgentContext;
}>(async (c, next) => {
  const apiKey = c.req.header("X-API-Key");
  if (!apiKey) {
    return c.json({ error: "Missing X-API-Key header" }, 401);
  }

  const db = getDb();
  const allAgents = await db.select().from(agents);

  for (const agent of allAgents) {
    const valid = await verifyApiKey(apiKey, agent.apiKeyHash);
    if (valid) {
      c.set("agentId", agent.id);
      return next();
    }
  }

  return c.json({ error: "Invalid API key" }, 401);
});

export const workerAuth = createMiddleware<{
  Variables: WorkerContext;
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing Authorization header" }, 401);
  }

  const token = authHeader.slice(7);
  const result = await verifyWorkerToken(token);
  if (!result) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  c.set("workerId", result.workerId);
  return next();
});
