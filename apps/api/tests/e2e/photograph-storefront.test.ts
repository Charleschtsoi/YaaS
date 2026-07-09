import { describe, it, expect, beforeAll } from "vitest";
import { app } from "../../src/app.js";
import { createDb } from "@yaas/db";
import { sql } from "drizzle-orm";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://yaas:yaas@localhost:5432/yaas";

let agentApiKey: string;
let workerToken: string;
let taskId: string;
let dbAvailable = false;

const TASK_LAT = 37.7749;
const TASK_LNG = -122.4194;

function makeJpeg(): Buffer {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7b, 0xdf,
    0xff, 0xd9,
  ]);
}

beforeAll(async () => {
  try {
    const db = createDb(DATABASE_URL);
    await db.execute(sql`SELECT 1`);
    await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    const migration = await import("node:fs").then((fs) =>
      fs.readFileSync(
        new URL("../../../../../packages/db/drizzle/0000_init.sql", import.meta.url),
        "utf-8"
      )
    );

    const statements = migration
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      await db.execute(sql.raw(stmt));
    }
    dbAvailable = true;
  } catch {
    console.warn("Postgres not available — skipping E2E tests. Run: docker compose up -d");
  }
});

describe.skipIf(() => !dbAvailable)("E2E: photograph storefront", () => {
  it("registers agent and worker", async () => {
    const agentRes = await app.request("/v1/agents/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Agent", email: "agent@test.com" }),
    });
    expect(agentRes.status).toBe(200);
    const agent = await agentRes.json();
    agentApiKey = agent.apiKey;
    expect(agentApiKey).toMatch(/^sk_yaas_/);

    const workerRes = await app.request("/v1/workers/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Worker",
        email: `worker-${Date.now()}@test.com`,
        password: "password123",
        skills: ["general"],
        lat: TASK_LAT,
        lng: TASK_LNG,
      }),
    });
    expect(workerRes.status).toBe(200);
    const worker = await workerRes.json();
    workerToken = worker.token;
    expect(workerToken).toBeTruthy();
  });

  it("agent posts photograph storefront task", async () => {
    const res = await app.request("/v1/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": agentApiKey,
      },
      body: JSON.stringify({
        taskType: "verify",
        description: "photograph storefront at 123 Main St",
        location: { lat: TASK_LAT, lng: TASK_LNG, radius_km: 5 },
        budget_usd: 5,
        urgency: "sync_60s",
        proofRequired: "photo",
      }),
    });
    expect(res.status).toBe(201);
    const task = await res.json();
    taskId = task.id;
    expect(task.status).toBe("open");
    expect(task.budgetCents).toBe(500);
  });

  it("worker claims task", async () => {
    const res = await app.request(`/v1/tasks/${taskId}/claim`, {
      method: "POST",
      headers: { Authorization: `Bearer ${workerToken}` },
    });
    expect(res.status).toBe(200);
    const task = await res.json();
    expect(task.status).toBe("claimed");
  });

  it("worker submits photo proof with GPS", async () => {
    const form = new FormData();
    const jpeg = makeJpeg();
    form.append("file", new Blob([jpeg], { type: "image/jpeg" }), "proof.jpg");
    form.append("lat", String(TASK_LAT));
    form.append("lng", String(TASK_LNG));

    const res = await app.request(`/v1/tasks/${taskId}/complete`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${workerToken}` },
      body: form,
    });
    expect(res.status).toBe(200);
    const task = await res.json();
    expect(task.status).toBe("complete");
  });

  it("agent retrieves task with proof URL", async () => {
    const res = await app.request(`/v1/tasks/${taskId}`, {
      headers: { "X-API-Key": agentApiKey },
    });
    expect(res.status).toBe(200);
    const task = await res.json();
    expect(task.status).toBe("complete");
    expect(task.proofUrl).toBeTruthy();
    expect(task.completedAt).toBeTruthy();
  });
});
