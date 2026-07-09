import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { startQueueWorkers } from "./queue/index.js";
import { config } from "./config.js";

console.log(`Starting YAAS API on port ${config.port}...`);

if (!config.skipQueues) {
  startQueueWorkers();
}

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`YAAS API listening on http://localhost:${info.port}`);
});
