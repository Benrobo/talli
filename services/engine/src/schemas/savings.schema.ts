import { z } from "zod";

export const createSavingsJarSchema = z.object({
  name: z.string().trim().min(1, "Jar name is required").max(80),
  targetAmount: z.number().int().positive().optional(),
  lockUntil: z.coerce.date().optional(),
});

export const depositToSavingsJarSchema = z.object({
  amount: z.number().int().positive("Amount must be greater than zero"),
});

export type CreateSavingsJarInput = z.infer<typeof createSavingsJarSchema>;
export type DepositToSavingsJarInput = z.infer<typeof depositToSavingsJarSchema>;
