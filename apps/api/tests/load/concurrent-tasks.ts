/**
 * Load test: 100 concurrent task creations.
 * Run with: SKIP_STRIPE=true SKIP_QUEUES=true tsx apps/api/tests/load/concurrent-tasks.ts
 *
 * Requires API running at YAAS_API_URL with a valid API key in YAAS_API_KEY.
 */

const API_URL = process.env.YAAS_API_URL ?? "http://localhost:3000";
const API_KEY = process.env.YAAS_API_KEY ?? "";
const CONCURRENCY = 100;

async function createTask(index: number): Promise<{ ok: boolean; ms: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${API_URL}/v1/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({
        taskType: "verify",
        description: `Load test task #${index}`,
        budget_usd: 1,
        urgency: "async_24h",
        proofRequired: "text",
      }),
    });
    return { ok: res.ok, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

async function main() {
  if (!API_KEY) {
    console.error("Set YAAS_API_KEY to run load test");
    process.exit(1);
  }

  console.log(`Creating ${CONCURRENCY} concurrent tasks...`);
  const start = Date.now();
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) => createTask(i))
  );
  const totalMs = Date.now() - start;

  const ok = results.filter((r) => r.ok).length;
  const times = results.map((r) => r.ms).sort((a, b) => a - b);
  const p95 = times[Math.floor(times.length * 0.95)];

  console.log(`\nResults:`);
  console.log(`  Success: ${ok}/${CONCURRENCY}`);
  console.log(`  Total time: ${totalMs}ms`);
  console.log(`  P95 latency: ${p95}ms`);
  console.log(`  Avg latency: ${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(0)}ms`);

  if (ok < CONCURRENCY) {
    console.error("FAIL: Not all tasks enqueued");
    process.exit(1);
  }
  if (p95 > 2000) {
    console.error("FAIL: P95 routing > 2s");
    process.exit(1);
  }
  console.log("PASS");
}

main();
