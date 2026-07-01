import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { WALLET_API } from "./wallet.api";
import type {
  TopUpPayload,
  TopUpResponse,
  WalletBalanceResponse,
  WalletHistoryResponse,
  WalletMetricsResponse,
} from "./wallet.types";

export const walletQueryKeys = {
  all: ["wallet"] as const,
  balance: () => [...walletQueryKeys.all, "balance"] as const,
  metrics: (workspaceId?: string) => [...walletQueryKeys.all, "metrics", workspaceId ?? "none"] as const,
  history: () => [...walletQueryKeys.all, "history"] as const,
};

export const useWalletBalance = () => {
  return useQuery<WalletBalanceResponse, AxiosError>({
    queryKey: walletQueryKeys.balance(),
    queryFn: WALLET_API.GET_BALANCE,
  });
};

export const useWalletMetrics = (workspaceId?: string) => {
  return useQuery<WalletMetricsResponse, AxiosError>({
    queryKey: walletQueryKeys.metrics(workspaceId),
    queryFn: WALLET_API.GET_METRICS,
    enabled: !!workspaceId,
  });
};

export const useWalletHistory = () => {
  return useQuery<WalletHistoryResponse, AxiosError>({
    queryKey: walletQueryKeys.history(),
    queryFn: WALLET_API.GET_HISTORY,
  });
};

export const useStartTopUp = () => {
  const queryClient = useQueryClient();

  return useMutation<TopUpResponse, AxiosError, TopUpPayload>({
    mutationFn: WALLET_API.START_TOP_UP,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletQueryKeys.all });
    },
  });
};
