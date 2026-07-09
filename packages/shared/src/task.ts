import { z } from "zod";
import { TASK_TYPES, URGENCY_LEVELS, PROOF_TYPES, TASK_STATUSES, CURRENCIES } from "./constants.js";

export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius_km: z.number().positive().default(5),
});

export const createTaskSchema = z.object({
  taskType: z.enum(TASK_TYPES),
  description: z.string().min(1).max(5000),
  location: locationSchema.optional(),
  budget_usd: z.number().positive(),
  urgency: z.enum(URGENCY_LEVELS),
  proofRequired: z.enum(PROOF_TYPES).optional(),
  skillsRequired: z.array(z.string()).default([]),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const requestHumanSchema = createTaskSchema;

export const taskResponseSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  type: z.enum(TASK_TYPES),
  description: z.string(),
  location: locationSchema.nullable(),
  skillsRequired: z.array(z.string()),
  urgency: z.enum(URGENCY_LEVELS),
  budgetCents: z.number().int(),
  currency: z.enum(CURRENCIES),
  status: z.enum(TASK_STATUSES),
  slaMinutes: z.number().int(),
  proofType: z.enum(PROOF_TYPES).nullable(),
  proofUrl: z.string().nullable(),
  resultPayload: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
  claimedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export type TaskResponse = z.infer<typeof taskResponseSchema>;

export const completeTaskSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  text: z.string().optional(),
});

export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;
