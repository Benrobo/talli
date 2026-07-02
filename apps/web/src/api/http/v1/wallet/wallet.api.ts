import apiClient from "../../api-client";
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

export const WALLET_ENDPOINTS = {
  balance: "/api/wallet",
  metrics: "/api/wallet/metrics",
  history: "/api/wallet/history",
  topUp: "/api/wallet/topup",
  verifyTopUp: "/api/wallet/topup/verify",
  withdraw: "/api/wallet/withdraw",
} as const;

export const WALLET_API = {
  GET_BALANCE: async (): Promise<WalletBalanceResponse> =>
    apiClient.get(WALLET_ENDPOINTS.balance).then((res) => res.data),

  GET_METRICS: async (): Promise<WalletMetricsResponse> =>
    apiClient.get(WALLET_ENDPOINTS.metrics).then((res) => res.data),

  GET_HISTORY: async (): Promise<WalletHistoryResponse> =>
    apiClient.get(WALLET_ENDPOINTS.history).then((res) => res.data),

  START_TOP_UP: async (payload: TopUpPayload): Promise<TopUpResponse> =>
    apiClient.post(WALLET_ENDPOINTS.topUp, payload).then((res) => res.data),

  VERIFY_TOP_UP: async (orderRefId: string): Promise<VerifyTopUpResponse> =>
    apiClient.post(WALLET_ENDPOINTS.verifyTopUp, { orderRefId }).then((res) => res.data),

  WITHDRAW: async (payload: WithdrawPayload): Promise<WithdrawResponse> =>
    apiClient.post(WALLET_ENDPOINTS.withdraw, payload).then((res) => res.data),
};
