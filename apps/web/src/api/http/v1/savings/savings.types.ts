import { z } from "zod";
import type { ApiSuccess } from "@app/shared";

export const createSavingsJarSchema = z.object({
  name: z.string().trim().min(1, "Jar name is required").max(80),
  icon: z.string().trim().min(1).max(40).optional(),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color")
    .optional(),
  targetAmount: z.number().int().positive().optional(),
  lockUntil: z.coerce.date().optional(),
});

export const depositToSavingsJarSchema = z.object({
  amount: z.number().int().positive("Amount must be greater than zero"),
});

export const updateSavingsJarSchema = z.object({
  name: z.string().trim().min(1, "Jar name is required").max(80),
  icon: z.string().trim().min(1).max(40).optional(),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color")
    .optional(),
  targetAmount: z.number().int().positive().optional(),
  lockUntil: z.union([z.coerce.date(), z.null()]).optional(),
});

export type CreateSavingsJarPayload = z.infer<typeof createSavingsJarSchema>;
export type DepositToSavingsJarPayload = z.infer<typeof depositToSavingsJarSchema>;
export type UpdateSavingsJarPayload = z.infer<typeof updateSavingsJarSchema>;

export interface SavingsJarRecord {
  id: string;
  ownerUserId: string;
  name: string;
  icon: string;
  accentColor: string;
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
export type UpdateSavingsJarResponse = ApiSuccess<SavingsJarRecord>;
export type DeleteSavingsJarResponse = ApiSuccess<null>;
export interface SavingsDepositIntent {
  pendingPaymentId: string;
  orderRefId: string;
  virtualAccountNumber: string;
  accountName: string;
  bankName: string;
  amount: number;
  expiresAt: string | null;
}

export type DepositToSavingsJarResponse = ApiSuccess<SavingsDepositIntent>;

export type SavingsDepositStatus =
  | "pending"
  | "completed"
  | "failed"
  | "expired"
  | "cancelled";

export type VerifySavingsDepositResponse = ApiSuccess<{
  status: SavingsDepositStatus;
  amount: number;
}>;

export const withdrawSavingsSchema = z.object({
  amount: z.number().int().positive("Amount must be greater than zero"),
});

export type WithdrawSavingsPayload = z.infer<typeof withdrawSavingsSchema>;

export type WithdrawSavingsResponse = ApiSuccess<{
  jar: SavingsJarRecord;
  walletBalance: number;
}>;
