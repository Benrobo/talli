import { z } from "zod";
import type { ApiSuccess } from "@app/shared";

export const topUpSchema = z.object({
  amount: z.number().int().positive("Amount must be greater than zero"),
});

export type TopUpPayload = z.infer<typeof topUpSchema>;

export const withdrawSchema = z.object({
  amount: z.number().int().positive("Amount must be greater than zero"),
  accountNumber: z.string().min(6, "Account number looks too short"),
  bankName: z.string().min(2, "Bank name is required"),
  narration: z.string().optional(),
});

export type WithdrawPayload = z.infer<typeof withdrawSchema>;

export type WithdrawStatus = "sent" | "pending" | "failed";

export interface WithdrawData {
  status: WithdrawStatus;
  transferRef: string;
  amount: number;
  accountName: string;
  accountNumber: string;
  bankName: string;
}

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
  activeCollection: {
    id: string;
    title: string;
    status: string;
    amountPerMember: number;
    targetAmount: number;
    collected: number;
    paidMembers: number;
    totalMembers: number;
  } | null;
  topJars: {
    id: string;
    name: string;
    saved: number;
    target: number;
  }[];
  recentTransactions: {
    id: string;
    type: "credit" | "debit";
    reason: string;
    amount: number;
    createdAt: string;
    referenceId: string | null;
  }[];
}

export type TopUpStatus = "pending" | "completed" | "failed" | "expired" | "cancelled";

export type WalletBalanceResponse = ApiSuccess<WalletBalanceData>;
export type WalletHistoryResponse = ApiSuccess<WalletTransaction[]>;
export type WalletMetricsResponse = ApiSuccess<WalletMetricsData>;
export type TopUpResponse = ApiSuccess<TopUpData>;
export type VerifyTopUpResponse = ApiSuccess<{ status: TopUpStatus; amount: number }>;
export type WithdrawResponse = ApiSuccess<WithdrawData>;
