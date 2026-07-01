import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useActiveWorkspaceId, workspaceScope } from "@/api/http/use-active-workspace-id";
import { WALLET_API } from "./wallet.api";
import type {
  TopUpPayload,
  TopUpResponse,
  WalletBalanceResponse,
  WalletHistoryResponse,
  WalletMetricsResponse,
} from "./wallet.types";

export const walletQueryKeys = {
  all: (workspaceId?: string) => ["wallet", workspaceScope(workspaceId)] as const,
  balance: (workspaceId?: string) => [...walletQueryKeys.all(workspaceId), "balance"] as const,
  metrics: (workspaceId?: string) => [...walletQueryKeys.all(workspaceId), "metrics"] as const,
  history: (workspaceId?: string) => [...walletQueryKeys.all(workspaceId), "history"] as const,
};

export const useWalletBalance = () => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<WalletBalanceResponse, AxiosError>({
    queryKey: walletQueryKeys.balance(workspaceId),
    queryFn: WALLET_API.GET_BALANCE,
    enabled: !!workspaceId,
  });
};

export const useWalletMetrics = () => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<WalletMetricsResponse, AxiosError>({
    queryKey: walletQueryKeys.metrics(workspaceId),
    queryFn: WALLET_API.GET_METRICS,
    enabled: !!workspaceId,
  });
};

export const useWalletHistory = () => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<WalletHistoryResponse, AxiosError>({
    queryKey: walletQueryKeys.history(workspaceId),
    queryFn: WALLET_API.GET_HISTORY,
    enabled: !!workspaceId,
  });
};

export const useStartTopUp = () => {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId();

  return useMutation<TopUpResponse, AxiosError, TopUpPayload>({
    mutationFn: WALLET_API.START_TOP_UP,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletQueryKeys.all(workspaceId) });
    },
  });
};
