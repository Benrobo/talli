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
  all: () => ["wallet"] as const,
  balance: () => [...walletQueryKeys.all(), "balance"] as const,
  metrics: () => [...walletQueryKeys.all(), "metrics"] as const,
  history: () => [...walletQueryKeys.all(), "history"] as const,
};

export const useWalletBalance = () => {
  return useQuery<WalletBalanceResponse, AxiosError>({
    queryKey: walletQueryKeys.balance(),
    queryFn: WALLET_API.GET_BALANCE,
  });
};

export const useWalletMetrics = () => {
  return useQuery<WalletMetricsResponse, AxiosError>({
    queryKey: walletQueryKeys.metrics(),
    queryFn: WALLET_API.GET_METRICS,
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
      queryClient.invalidateQueries({ queryKey: walletQueryKeys.all() });
    },
  });
};
