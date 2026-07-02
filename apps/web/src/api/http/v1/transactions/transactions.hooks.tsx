import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { TRANSACTIONS_API } from "./transactions.api";
import type {
  ListTransactionsParams,
  ListTransactionsResponse,
} from "./transactions.types";

export const transactionsQueryKeys = {
  all: () => ["transactions"] as const,
  list: (params?: ListTransactionsParams) =>
    [...transactionsQueryKeys.all(), params] as const,
};

export const useTransactions = (params?: ListTransactionsParams) => {
  return useQuery<ListTransactionsResponse, AxiosError>({
    queryKey: transactionsQueryKeys.list(params),
    queryFn: () => TRANSACTIONS_API.LIST(params),
    placeholderData: keepPreviousData,
  });
};
