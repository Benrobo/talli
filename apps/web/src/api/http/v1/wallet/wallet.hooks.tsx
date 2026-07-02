import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { WALLET_API } from "./wallet.api";
import { transactionsQueryKeys } from "../transactions/transactions.hooks";
import type {
  TopUpPayload,
  TopUpResponse,
  WalletBalanceResponse,
  WalletHistoryResponse,
  WalletMetricsResponse,
  VerifyTopUpResponse,
  WithdrawPayload,
  WithdrawResponse,
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

export const useVerifyTopUp = () => {
  const queryClient = useQueryClient();

  return useMutation<VerifyTopUpResponse, AxiosError, string>({
    mutationFn: WALLET_API.VERIFY_TOP_UP,
    onSuccess: (response) => {
      if (response.data.status === "completed") {
        queryClient.invalidateQueries({ queryKey: walletQueryKeys.all() });
        queryClient.invalidateQueries({ queryKey: transactionsQueryKeys.all() });
      }
    },
  });
};

export const useWithdrawWallet = () => {
  const queryClient = useQueryClient();

  return useMutation<WithdrawResponse, AxiosError, WithdrawPayload>({
    mutationFn: WALLET_API.WITHDRAW,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletQueryKeys.all() });
      queryClient.invalidateQueries({ queryKey: transactionsQueryKeys.all() });
    },
  });
};
