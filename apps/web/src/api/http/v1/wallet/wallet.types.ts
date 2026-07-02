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

export interface MetricDelta {
  value: string;
  direction: "up" | "down";
}

export interface WalletMetricsData {
  currency: string;
  totalBalance: {
    amount: number;
    delta: MetricDelta | null;
  };
  savedAcrossJars: {
    amount: number;
    activeJars: number;
    delta: MetricDelta | null;
  };
  collectingNow: {
    amount: number;
    collectionsCount: number;
    delta: MetricDelta | null;
  };
  sentThisMonth: {
    amount: number;
    transfersCount: number;
    delta: MetricDelta | null;
  };
}

export type WalletBalanceResponse = ApiSuccess<WalletBalanceData>;
export type WalletHistoryResponse = ApiSuccess<WalletTransaction[]>;
export type WalletMetricsResponse = ApiSuccess<WalletMetricsData>;
export type TopUpResponse = ApiSuccess<TopUpData>;
