import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { PAYMENTS_API } from "./payments.api";
import type { ListPaymentsParams, ListPaymentsResponse } from "./payments.types";

export const paymentsQueryKeys = {
  all: ["payments"] as const,
  list: (params?: ListPaymentsParams) => [...paymentsQueryKeys.all, "list", params] as const,
};

export const usePayments = (params?: ListPaymentsParams) => {
  return useQuery<ListPaymentsResponse, AxiosError>({
    queryKey: paymentsQueryKeys.list(params),
    queryFn: () => PAYMENTS_API.LIST(params),
  });
};
