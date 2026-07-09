CREATE TYPE "public"."task_type" AS ENUM('verify', 'collect', 'judge', 'act', 'fix');--> statement-breakpoint
CREATE TYPE "public"."urgency" AS ENUM('sync_60s', 'async_1h', 'async_24h');--> statement-breakpoint
CREATE TYPE "public"."proof_type" AS ENUM('photo', 'gps', 'signature', 'text', 'video');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('open', 'claimed', 'in_progress', 'verification', 'complete', 'expired');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('USD', 'USDC');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('escrowed', 'released', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('stripe', 'onchain');--> statement-breakpoint
CREATE TYPE "public"."task_event_type" AS ENUM('created', 'claimed', 'proof_submitted', 'verified', 'verification_failed', 'refunded', 'expired');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"api_key_hash" text NOT NULL,
	"stripe_customer_id" text,
	"daily_budget_cents" integer DEFAULT 100000,
	"monthly_budget_cents" integer DEFAULT 1000000,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"lat" real,
	"lng" real,
	"availability_json" jsonb,
	"hourly_rate_cents" integer DEFAULT 1500 NOT NULL,
	"rating" real DEFAULT 5,
	"completed_tasks" integer DEFAULT 0,
	"wallet_address" text,
	"stripe_connect_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"worker_id" uuid,
	"type" "task_type" NOT NULL,
	"description" text NOT NULL,
	"location" jsonb,
	"skills_required" text[] DEFAULT '{}' NOT NULL,
	"urgency" "urgency" NOT NULL,
	"budget_cents" integer NOT NULL,
	"currency" "currency" DEFAULT 'USD' NOT NULL,
	"status" "task_status" DEFAULT 'open' NOT NULL,
	"sla_minutes" integer NOT NULL,
	"proof_type" "proof_type",
	"proof_url" text,
	"proof_metadata" jsonb,
	"result_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"worker_id" uuid,
	"amount_cents" integer NOT NULL,
	"currency" "currency" DEFAULT 'USD' NOT NULL,
	"status" "payment_status" DEFAULT 'escrowed' NOT NULL,
	"method" "payment_method" DEFAULT 'stripe' NOT NULL,
	"payment_intent_id" text,
	"transfer_id" text,
	"tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_task_id_unique" UNIQUE("task_id")
);
--> statement-breakpoint
CREATE TABLE "task_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"event_type" "task_event_type" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workers_skills_idx" ON "workers" USING btree ("skills");--> statement-breakpoint
CREATE INDEX "workers_location_idx" ON "workers" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "tasks_status_created_idx" ON "tasks" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "tasks_agent_idx" ON "tasks" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "tasks_worker_idx" ON "tasks" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "payments_task_idx" ON "payments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_events_task_idx" ON "task_events" USING btree ("task_id");
