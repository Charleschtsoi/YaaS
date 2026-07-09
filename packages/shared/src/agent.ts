import { z } from "zod";

export const registerAgentSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
});

export type RegisterAgentInput = z.infer<typeof registerAgentSchema>;

export const updateBudgetSchema = z.object({
  dailyBudgetCents: z.number().int().positive().optional(),
  monthlyBudgetCents: z.number().int().positive().optional(),
});

export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
