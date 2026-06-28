import { z } from "zod";

export const topUpSchema = z.object({
  amount: z.number().int().positive("Amount must be greater than zero"),
});

export type TopUpInput = z.infer<typeof topUpSchema>;
