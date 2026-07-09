export const TASK_TYPES = ["verify", "collect", "judge", "act", "fix"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const URGENCY_LEVELS = ["sync_60s", "async_1h", "async_24h"] as const;
export type Urgency = (typeof URGENCY_LEVELS)[number];

export const PROOF_TYPES = ["photo", "gps", "signature", "text", "video"] as const;
export type ProofType = (typeof PROOF_TYPES)[number];

export const TASK_STATUSES = [
  "open",
  "claimed",
  "in_progress",
  "verification",
  "complete",
  "expired",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const CURRENCIES = ["USD", "USDC"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const SLA_MINUTES: Record<Urgency, number> = {
  sync_60s: 5,
  async_1h: 60,
  async_24h: 1440,
};
