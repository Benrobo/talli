import { z } from "zod";
import type { ApiSuccess } from "@app/shared";

export const createSavingsJarSchema = z.object({
  name: z.string().trim().min(1, "Jar name is required").max(80),
  targetAmount: z.number().int().positive().optional(),
  lockUntil: z.coerce.date().optional(),
});

export const depositToSavingsJarSchema = z.object({
  amount: z.number().int().positive("Amount must be greater than zero"),
});

export type CreateSavingsJarPayload = z.infer<typeof createSavingsJarSchema>;
export type DepositToSavingsJarPayload = z.infer<typeof depositToSavingsJarSchema>;

export interface SavingsJarRecord {
  id: string;
  workspaceId: string;
  ownerUserId: string;
  name: string;
  targetAmount: number | null;
  currentAmount: number;
  currency: string;
  lockUntil: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type ListSavingsJarsResponse = ApiSuccess<SavingsJarRecord[]>;
export type GetSavingsJarResponse = ApiSuccess<{
  jar: SavingsJarRecord;
  deposits: { amount: number; createdAt: string }[];
}>;
export type CreateSavingsJarResponse = ApiSuccess<SavingsJarRecord>;
export type DepositToSavingsJarResponse = ApiSuccess<{
  orderRefId: string;
  flashAccountNumber: string;
  flashAccountName: string;
  flashBankName: string;
  amount: number;
  expiresAt: string;
  checkoutUrl: string;
}>;
