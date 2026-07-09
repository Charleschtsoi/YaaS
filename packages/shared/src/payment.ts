import { z } from "zod";

export const PAYMENT_STATUSES = ["escrowed", "released", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["stripe", "onchain"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const paymentResponseSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  workerId: z.string().uuid().nullable(),
  amountCents: z.number().int(),
  currency: z.enum(["USD", "USDC"]),
  status: z.enum(PAYMENT_STATUSES),
  method: z.enum(PAYMENT_METHODS),
  txHash: z.string().nullable(),
});

export type PaymentResponse = z.infer<typeof paymentResponseSchema>;
