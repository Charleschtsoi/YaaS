import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { tasks } from "@yaas/db";
import { workerFeedQuerySchema } from "@yaas/shared";
import { getDb } from "../db.js";
import { workerAuth, type WorkerContext } from "../middleware/auth.js";
import { formatTask } from "./agents.js";
import { haversineKm } from "../lib/geo.js";
import { workers } from "@yaas/db";

export const workerFeedRoutes = new Hono<{ Variables: WorkerContext }>();

workerFeedRoutes.get("/feed", workerAuth, async (c) => {
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
