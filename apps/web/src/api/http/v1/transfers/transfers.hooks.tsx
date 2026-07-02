import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useActiveWorkspaceId, workspaceScope } from "@/api/http/use-active-workspace-id";
import { TRANSFERS_API } from "./transfers.api";
import { paymentsQueryKeys } from "../payments/payments.hooks";
import type {
  ListBanksParams,
  ListBanksResponse,
  LookupAccountPayload,
  LookupAccountResponse,
  SendMoneyPayload,
  SendMoneyResponse,
  TransferHistoryResponse,
} from "./transfers.types";

export const transfersQueryKeys = {
  all: (workspaceId?: string) => ["transfers", workspaceScope(workspaceId)] as const,
  banks: (workspaceId?: string, params?: ListBanksParams) =>
    [...transfersQueryKeys.all(workspaceId), "banks", params] as const,
  history: (workspaceId?: string) => [...transfersQueryKeys.all(workspaceId), "history"] as const,
};

export const useBanks = (params?: ListBanksParams) => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<ListBanksResponse, AxiosError>({
    queryKey: transfersQueryKeys.banks(workspaceId, params),
    queryFn: () => TRANSFERS_API.LIST_BANKS(params),
    enabled: !!workspaceId,
  });
};

export const useTransferHistory = () => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<TransferHistoryResponse, AxiosError>({
    queryKey: transfersQueryKeys.history(workspaceId),
    queryFn: TRANSFERS_API.HISTORY,
    enabled: !!workspaceId,
  });
};

export const useLookupAccount = () => {
  return useMutation<LookupAccountResponse, AxiosError, LookupAccountPayload>({
    mutationFn: TRANSFERS_API.LOOKUP,
  });
};

export const useSendMoney = () => {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId();

  return useMutation<SendMoneyResponse, AxiosError, SendMoneyPayload>({
    mutationFn: TRANSFERS_API.SEND,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transfersQueryKeys.history(workspaceId) });
      queryClient.invalidateQueries({ queryKey: paymentsQueryKeys.all(workspaceId) });
    },
  });
};
