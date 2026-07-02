import apiClient from "../../api-client";
import type {
  ListTransactionsParams,
  ListTransactionsResponse,
} from "./transactions.types";

export const TRANSACTIONS_ENDPOINTS = {
  list: "/api/transactions",
} as const;

export const TRANSACTIONS_API = {
  LIST: async (
    params?: ListTransactionsParams
  ): Promise<ListTransactionsResponse> =>
    apiClient
      .get(TRANSACTIONS_ENDPOINTS.list, { params })
      .then((res) => res.data),
};
