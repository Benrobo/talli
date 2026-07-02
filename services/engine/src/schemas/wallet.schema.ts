import { z } from "zod";

export const topUpSchema = z.object({
  amount: z.number().int().positive("Amount must be greater than zero"),
});

export const withdrawSchema = z.object({
  amount: z.number().int().positive("Amount must be greater than zero"),
  accountNumber: z.string().trim().min(6).max(20),
  bankName: z.string().trim().min(2).max(80),
  narration: z.string().trim().max(120).optional(),
});

export type TopUpInput = z.infer<typeof topUpSchema>;
export type WithdrawInput = z.infer<typeof withdrawSchema>;
