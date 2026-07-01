import apiClient from "../../api-client";
import type { ListPaymentsParams, ListPaymentsResponse } from "./payments.types";

export const PAYMENTS_ENDPOINTS = {
  list: "/api/payments",
} as const;

export const PAYMENTS_API = {
  LIST: async (params?: ListPaymentsParams): Promise<ListPaymentsResponse> =>
    apiClient.get(PAYMENTS_ENDPOINTS.list, { params }).then((res) => res.data),
};
