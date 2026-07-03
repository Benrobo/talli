import type { ApiSuccess } from "@app/shared";

export type TransactionKind =
  | "wallet_topup"
  | "collection_payment"
  | "savings_deposit"
  | "savings_withdrawal"
  | "collection_withdrawal"
  | "transfer_out"
  | "refund";

export type TransactionDirection = "credit" | "debit";

export type TransactionStatus = "pending" | "successful" | "failed" | "cancelled";

export type TransactionFilterType =
  | "in"
  | "out"
  | "sent"
  | "saved"
  | "topup"
  | "collection"
  | "refund";

export interface TransactionRecipient {
  accountName: string;
  accountNumber: string;
  bankName: string | null;
}

export interface TransactionRecord {
  id: string;
  direction: TransactionDirection;
  kind: TransactionKind;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  savingsJarId: string | null;
  collectionId: string | null;
  transferId: string | null;
  recipient: TransactionRecipient | null;
  narration: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface TransactionsSummary {
  moneyIn: number;
  moneyOut: number;
  net: number;
}

export interface TransactionsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListTransactionsParams {
  page?: number;
  pageSize?: number;
  type?: TransactionFilterType;
  status?: TransactionStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export type TransactionCounts = Record<"all" | TransactionFilterType, number>;

export type ListTransactionsResponse = ApiSuccess<{
  transactions: TransactionRecord[];
  summary: TransactionsSummary;
  counts: TransactionCounts;
  pagination: TransactionsPagination;
}>;
