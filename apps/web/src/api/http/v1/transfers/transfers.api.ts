import apiClient from "../../api-client";
import type {
  ListBanksParams,
  ListBanksResponse,
  LookupAccountPayload,
  LookupAccountResponse,
  SendMoneyPayload,
  SendMoneyResponse,
  TransferHistoryResponse,
} from "./transfers.types";

export const TRANSFERS_ENDPOINTS = {
  banks: "/api/transfers/banks",
  list: "/api/transfers",
  lookup: "/api/transfers/lookup",
  send: "/api/transfers",
} as const;

export const TRANSFERS_API = {
  LIST_BANKS: async (params?: ListBanksParams): Promise<ListBanksResponse> =>
    apiClient.get(TRANSFERS_ENDPOINTS.banks, { params }).then((res) => res.data),

  HISTORY: async (): Promise<TransferHistoryResponse> =>
    apiClient.get(TRANSFERS_ENDPOINTS.list).then((res) => res.data),

  LOOKUP: async (payload: LookupAccountPayload): Promise<LookupAccountResponse> =>
    apiClient.post(TRANSFERS_ENDPOINTS.lookup, payload).then((res) => res.data),

  SEND: async (payload: SendMoneyPayload): Promise<SendMoneyResponse> =>
    apiClient.post(TRANSFERS_ENDPOINTS.send, payload).then((res) => res.data),
};
