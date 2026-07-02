import { z } from "zod";
import type { ApiSuccess } from "@app/shared";

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

export type LookupAccountPayload = z.infer<typeof lookupAccountSchema>;
export type SendMoneyPayload = z.infer<typeof sendMoneySchema>;

export interface Bank {
  name: string;
  code: string;
}

export interface LookupAccountData {
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
}

export interface TransferRecord {
  id: string;
  merchantTxRef: string;
  amount: number;
  status: string;
  accountNumber: string;
  bankName: string;
  accountName: string | null;
  narration: string | null;
  createdAt: string;
}

export interface SendMoneyData {
  status: string;
  transferRef: string;
  amount: number;
  accountNumber: string;
  bankName: string;
}

export interface ListBanksParams {
  q?: string;
}

export type ListBanksResponse = ApiSuccess<Bank[]>;
export type TransferHistoryResponse = ApiSuccess<TransferRecord[]>;
export type LookupAccountResponse = ApiSuccess<LookupAccountData>;
export type SendMoneyResponse = ApiSuccess<SendMoneyData>;
