import { z } from "zod";

export const lookupAccountSchema = z.object({
  accountNumber: z.string().min(6, "Account number looks too short"),
  bankName: z.string().min(2, "Bank name is required"),
});

export const sendMoneySchema = z.object({
  accountNumber: z.string().min(6, "Account number looks too short"),
  bankName: z.string().min(2, "Bank name is required"),
  amount: z.number().int().positive("Amount must be greater than zero"),
  alias: z.string().optional(),
  narration: z.string().optional(),
});

export type LookupAccountInput = z.infer<typeof lookupAccountSchema>;
export type SendMoneyInput = z.infer<typeof sendMoneySchema>;
