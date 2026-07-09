import { Hono } from "hono";
import { cors } from "hono/cors";
import { agentRoutes } from "./routes/agents.js";
import { workerRoutes } from "./routes/workers.js";
import { workerFeedRoutes } from "./routes/worker-feed.js";
import { taskRoutes, proofRoutes } from "./routes/tasks.js";
import { webhookRoutes } from "./routes/webhooks.js";

export function createApp() {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
      ],
      allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    })
  );

  app.get("/health", (c) =>
    c.json({ status: "ok", timestamp: new Date().toISOString() })
  );

  const v1 = new Hono();
  v1.route("/agents", agentRoutes);
  v1.route("/workers", workerRoutes);
  v1.route("/workers", workerFeedRoutes);
  v1.route("/tasks", taskRoutes);
  v1.route("/webhooks", webhookRoutes);

  app.route("/v1", v1);
  app.route("/", proofRoutes);

  return app;
}

export const app = createApp();
