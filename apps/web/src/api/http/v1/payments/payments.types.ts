import type { ApiSuccess } from "@app/shared";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SentPayment {
  id: string;
  recipient: string;
  meta: string;
  typed: string;
  date: string;
  amountMinor: number;
}

export interface SentPaymentsSummary {
  sentThisMonthMinor: number;
  monthLabel: string;
  transferCount: number;
  recipientCount: number;
}

export interface ListPaymentsParams {
  page?: number;
  pageSize?: number;
}

export type ListPaymentsResponse = ApiSuccess<{
  payments: SentPayment[];
  summary: SentPaymentsSummary;
  pagination: PaginationMeta;
}>;
