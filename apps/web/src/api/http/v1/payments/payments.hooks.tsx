import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useActiveWorkspaceId, workspaceScope } from "@/api/http/use-active-workspace-id";
import { PAYMENTS_API } from "./payments.api";
import type { ListPaymentsParams, ListPaymentsResponse } from "./payments.types";

export const paymentsQueryKeys = {
  all: (workspaceId?: string) => ["payments", workspaceScope(workspaceId)] as const,
  list: (workspaceId?: string, params?: ListPaymentsParams) =>
    [...paymentsQueryKeys.all(workspaceId), "list", params] as const,
};

export const usePayments = (params?: ListPaymentsParams) => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<ListPaymentsResponse, AxiosError>({
    queryKey: paymentsQueryKeys.list(workspaceId, params),
    queryFn: () => PAYMENTS_API.LIST(params),
    enabled: !!workspaceId,
  });
};
