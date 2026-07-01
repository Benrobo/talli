import { z } from "zod";
import type { ApiSuccess } from "@app/shared";

export const topUpSchema = z.object({
  amount: z.number().int().positive("Amount must be greater than zero"),
});

export type TopUpPayload = z.infer<typeof topUpSchema>;

export interface WalletBalanceData {
  balance: number;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  referenceId: string | null;
  createdAt: string;
}

export interface TopUpData {
  orderRefId: string;
  flashAccountNumber: string;
  flashAccountName: string;
  flashBankName: string;
  amount: number;
  expiresAt: string;
}

export type WalletBalanceResponse = ApiSuccess<WalletBalanceData>;
export type WalletHistoryResponse = ApiSuccess<WalletTransaction[]>;
export type TopUpResponse = ApiSuccess<TopUpData>;
