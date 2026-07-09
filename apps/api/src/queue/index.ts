import { Queue, Worker, type Job } from "bullmq";
import { eq, and, sql } from "drizzle-orm";
import { tasks, payments, workers, taskEvents } from "@yaas/db";
import { getDb } from "../db.js";
import { config } from "../config.js";
import { createStripeClient, cancelEscrow, captureAndTransfer } from "@yaas/stripe";
import { haversineKm } from "../lib/geo.js";

const connection = { url: config.redisUrl };

let _taskRoutingQueue: Queue | null = null;
let _slaMonitorQueue: Queue | null = null;
let _verificationQueue: Queue | null = null;

function getTaskRoutingQueue() {
  if (!_taskRoutingQueue) _taskRoutingQueue = new Queue("task-routing", { connection });
  return _taskRoutingQueue;
}

function getSlaMonitorQueue() {
  if (!_slaMonitorQueue) _slaMonitorQueue = new Queue("sla-monitor", { connection });
  return _slaMonitorQueue;
}

function getVerificationQueue() {
  if (!_verificationQueue) _verificationQueue = new Queue("verification", { connection });
  return _verificationQueue;
}

export const verificationQueue = {
  add: (...args: Parameters<Queue["add"]>) => {
    if (config.skipQueues) return Promise.resolve(null);
    return getVerificationQueue().add(...args);
  },
};

export async function enqueueTaskJobs(taskId: string, slaMinutes: number) {
  if (config.skipQueues) return;
  await getTaskRoutingQueue().add("route", { taskId });
  await getSlaMonitorQueue().add(
    "sla-check",
    { taskId },
    { delay: slaMinutes * 60 * 1000 }
  );
}

interface RouteJobData {
  taskId: string;
}

interface SlaJobData {
  taskId: string;
}

interface VerifyJobData {
  taskId: string;
  workerId: string;
  proofUrl: string;
  proofMetadata: Record<string, unknown>;
}

function scoreWorker(
  worker: typeof workers.$inferSelect,
  task: typeof tasks.$inferSelect
): number {
  const requiredSkills = task.skillsRequired ?? [];
  const workerSkills = worker.skills ?? [];
  const skillMatch =
    requiredSkills.length === 0
      ? 1
      : requiredSkills.filter((s) => workerSkills.includes(s)).length /
        requiredSkills.length;

  let proximityScore = 0.5;
  if (
    task.location &&
    worker.lat != null &&
    worker.lng != null
  ) {
    const dist = haversineKm(
      worker.lat,
      worker.lng,
      task.location.lat,
      task.location.lng
    );
    proximityScore = Math.max(0, 1 - dist / (task.location.radius_km || 50));
  }

  const rating = (worker.rating ?? 5) / 5;
  const availability = 1;

  return skillMatch * 40 + proximityScore * 30 + rating * 20 + availability * 10;
}

export function startQueueWorkers() {
  const routingWorker = new Worker<RouteJobData>(
    "task-routing",
    async (job: Job<RouteJobData>) => {
      const db = getDb();
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, job.data.taskId));

      if (!task || task.status !== "open") return;

      const allWorkers = await db.select().from(workers);
      const scored = allWorkers
        .filter((w) => {
          const required = task.skillsRequired ?? [];
          if (required.length > 0 && !required.every((s) => w.skills?.includes(s))) {
            return false;
          }
          if (task.location && w.lat != null && w.lng != null) {
            const dist = haversineKm(
              w.lat,
              w.lng,
              task.location.lat,
              task.location.lng
            );
            if (dist > (task.location.radius_km || 50)) return false;
          }
          return w.hourlyRateCents <= task.budgetCents;
        })
        .map((w) => ({ worker: w, score: scoreWorker(w, task) }))
        .sort((a, b) => b.score - a.score);

      console.log(
        `Task ${task.id} routed to ${scored.length} eligible workers`
      );
    },
    { connection }
  );

  const slaWorker = new Worker<SlaJobData>(
    "sla-monitor",
    async (job: Job<SlaJobData>) => {
      const db = getDb();
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, job.data.taskId));

      if (!task || task.status !== "open") return;

      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.taskId, task.id));

      if (payment?.paymentIntentId && !config.skipStripe && config.stripeSecretKey) {
        const stripe = createStripeClient(config.stripeSecretKey);
        try {
          await cancelEscrow(stripe, payment.paymentIntentId);
        } catch (err) {
          console.error("Failed to cancel escrow:", err);
        }
      }

      await db
        .update(tasks)
        .set({ status: "expired" })
        .where(eq(tasks.id, task.id));

      if (payment) {
        await db
          .update(payments)
          .set({ status: "refunded", updatedAt: new Date() })
          .where(eq(payments.id, payment.id));
      }

      await db.insert(taskEvents).values({
        taskId: task.id,
        eventType: "expired",
        metadata: { reason: "SLA expired with no claim" },
      });
    },
    { connection }
  );

  const verifyWorker = new Worker<VerifyJobData>(
    "verification",
    async (job: Job<VerifyJobData>) => {
      const db = getDb();
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, job.data.taskId));

      if (!task) return;

      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.taskId, task.id));

      const [worker] = task.workerId
        ? await db.select().from(workers).where(eq(workers.id, task.workerId))
        : [null];

      if (payment && worker) {
        if (!config.skipStripe && config.stripeSecretKey && worker.stripeConnectId && payment.paymentIntentId) {
          const stripe = createStripeClient(config.stripeSecretKey);
          try {
            const { transferId } = await captureAndTransfer(
              stripe,
              payment.paymentIntentId,
              worker.stripeConnectId,
              payment.amountCents
            );
            await db
              .update(payments)
              .set({
                status: "released",
                transferId,
                workerId: worker.id,
                updatedAt: new Date(),
              })
              .where(eq(payments.id, payment.id));
          } catch (err) {
            console.error("Payment release failed:", err);
            return;
          }
        } else {
          await db
            .update(payments)
            .set({ status: "released", workerId: worker.id, updatedAt: new Date() })
            .where(eq(payments.id, payment.id));
        }
      }

      await db
        .update(tasks)
        .set({
          status: "complete",
          completedAt: new Date(),
          proofUrl: job.data.proofUrl,
          proofMetadata: job.data.proofMetadata,
        })
        .where(eq(tasks.id, task.id));

      if (worker) {
        await db
          .update(workers)
          .set({ completedTasks: sql`${workers.completedTasks} + 1` })
          .where(eq(workers.id, worker.id));
      }

      await db.insert(taskEvents).values({
        taskId: task.id,
        eventType: "verified",
        metadata: job.data.proofMetadata,
      });
    },
    { connection }
  );

  routingWorker.on("failed", (job, err) =>
    console.error(`Routing job ${job?.id} failed:`, err)
  );
  slaWorker.on("failed", (job, err) =>
    console.error(`SLA job ${job?.id} failed:`, err)
  );
  verifyWorker.on("failed", (job, err) =>
    console.error(`Verify job ${job?.id} failed:`, err)
  );

  return { routingWorker, slaWorker, verifyWorker };
}

export async function processVerificationInline(data: VerifyJobData) {
  const db = getDb();
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, data.taskId));

  if (!task) return;

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.taskId, task.id));

  const [worker] = task.workerId
    ? await db.select().from(workers).where(eq(workers.id, task.workerId))
    : [null];

  if (payment && worker) {
    if (!config.skipStripe && config.stripeSecretKey && worker.stripeConnectId && payment.paymentIntentId) {
      const stripe = createStripeClient(config.stripeSecretKey);
      try {
        const { transferId } = await captureAndTransfer(
          stripe,
          payment.paymentIntentId,
          worker.stripeConnectId,
          payment.amountCents
        );
        await db
          .update(payments)
          .set({
            status: "released",
            transferId,
            workerId: worker.id,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));
      } catch (err) {
        console.error("Payment release failed:", err);
        return;
      }
    } else {
      await db
        .update(payments)
        .set({ status: "released", workerId: worker.id, updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
    }
  }

  await db
    .update(tasks)
    .set({
      status: "complete",
      completedAt: new Date(),
      proofUrl: data.proofUrl,
      proofMetadata: data.proofMetadata,
    })
    .where(eq(tasks.id, task.id));

  if (worker) {
    await db
      .update(workers)
      .set({ completedTasks: sql`${workers.completedTasks} + 1` })
      .where(eq(workers.id, worker.id));
  }

  await db.insert(taskEvents).values({
    taskId: task.id,
    eventType: "verified",
    metadata: data.proofMetadata,
  });
}
