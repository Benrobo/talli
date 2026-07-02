import dayjs from "dayjs";
import type {
  TransactionFilterType,
  TransactionStatus,
} from "@/api/http/v1/transactions/transactions.types";

export type TypeValue = "all" | TransactionFilterType;
export type DateRange = "all" | "month" | "30d";
export type StatusFilter = "all" | TransactionStatus;

export function computeDateBounds(range: DateRange): { dateFrom?: string; dateTo?: string } {
  if (range === "all") return {};
  if (range === "month") {
    const from = dayjs().startOf("month");
    return { dateFrom: from.toISOString(), dateTo: dayjs().toISOString() };
  }
  const from = dayjs().subtract(30, "day");
  return { dateFrom: from.toISOString(), dateTo: dayjs().toISOString() };
}
