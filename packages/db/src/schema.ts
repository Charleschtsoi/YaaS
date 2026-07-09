import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  real,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

export const taskTypeEnum = pgEnum("task_type", [
  "verify",
  "collect",
  "judge",
  "act",
  "fix",
]);

export const urgencyEnum = pgEnum("urgency", ["sync_60s", "async_1h", "async_24h"]);

export const proofTypeEnum = pgEnum("proof_type", [
  "photo",
  "gps",
  "signature",
  "text",
  "video",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "open",
  "claimed",
  "in_progress",
  "verification",
  "complete",
  "expired",
]);

export const currencyEnum = pgEnum("currency", ["USD", "USDC"]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "escrowed",
  "released",
  "refunded",
]);

export const paymentMethodEnum = pgEnum("payment_method", ["stripe", "onchain"]);

export const taskEventTypeEnum = pgEnum("task_event_type", [
  "created",
  "claimed",
  "proof_submitted",
  "verified",
  "verification_failed",
  "refunded",
  "expired",
]);

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  apiKeyHash: text("api_key_hash").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  dailyBudgetCents: integer("daily_budget_cents").default(100000),
  monthlyBudgetCents: integer("monthly_budget_cents").default(1000000),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workers = pgTable(
  "workers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    skills: text("skills").array().notNull().default([]),
    lat: real("lat"),
    lng: real("lng"),
    availabilityJson: jsonb("availability_json").$type<Record<string, unknown>>(),
    hourlyRateCents: integer("hourly_rate_cents").notNull().default(1500),
    rating: real("rating").default(5.0),
    completedTasks: integer("completed_tasks").default(0),
    walletAddress: text("wallet_address"),
    stripeConnectId: text("stripe_connect_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("workers_skills_idx").on(table.skills),
    index("workers_location_idx").on(table.lat, table.lng),
  ]
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    workerId: uuid("worker_id").references(() => workers.id),
    type: taskTypeEnum("type").notNull(),
    description: text("description").notNull(),
    location: jsonb("location").$type<{
      lat: number;
      lng: number;
      radius_km: number;
    }>(),
    skillsRequired: text("skills_required").array().notNull().default([]),
    urgency: urgencyEnum("urgency").notNull(),
    budgetCents: integer("budget_cents").notNull(),
    currency: currencyEnum("currency").notNull().default("USD"),
    status: taskStatusEnum("status").notNull().default("open"),
    slaMinutes: integer("sla_minutes").notNull(),
    proofType: proofTypeEnum("proof_type"),
    proofUrl: text("proof_url"),
    proofMetadata: jsonb("proof_metadata").$type<Record<string, unknown>>(),
    resultPayload: jsonb("result_payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("tasks_status_created_idx").on(table.status, table.createdAt),
    index("tasks_agent_idx").on(table.agentId),
    index("tasks_worker_idx").on(table.workerId),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id)
      .unique(),
    workerId: uuid("worker_id").references(() => workers.id),
    amountCents: integer("amount_cents").notNull(),
    currency: currencyEnum("currency").notNull().default("USD"),
    status: paymentStatusEnum("status").notNull().default("escrowed"),
    method: paymentMethodEnum("method").notNull().default("stripe"),
    paymentIntentId: text("payment_intent_id"),
    transferId: text("transfer_id"),
    txHash: text("tx_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("payments_task_idx").on(table.taskId)]
);

export const taskEvents = pgTable(
  "task_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id),
    eventType: taskEventTypeEnum("event_type").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("task_events_task_idx").on(table.taskId)]
);

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Worker = typeof workers.$inferSelect;
export type NewWorker = typeof workers.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type TaskEvent = typeof taskEvents.$inferSelect;
