import { z } from "zod";

export const createSavingsJarSchema = z.object({
  name: z.string().trim().min(1, "Jar name is required").max(80),
  targetAmount: z.number().int().positive().optional(),
  lockUntil: z.coerce.date().optional(),
});

export type CreateSavingsJarInput = z.infer<typeof createSavingsJarSchema>;
