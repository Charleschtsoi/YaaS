import { z } from "zod";

export const registerWorkerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  skills: z.array(z.string()).default([]),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  hourlyRateCents: z.number().int().positive().default(1500),
});

export type RegisterWorkerInput = z.infer<typeof registerWorkerSchema>;

export const loginWorkerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginWorkerInput = z.infer<typeof loginWorkerSchema>;

export const workerFeedQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius_km: z.coerce.number().positive().default(50),
  minPayCents: z.coerce.number().int().optional(),
  skills: z.string().optional(),
});

export type WorkerFeedQuery = z.infer<typeof workerFeedQuerySchema>;
