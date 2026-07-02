import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
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
  all: () => ["transfers"] as const,
  banks: (params?: ListBanksParams) =>
    [...transfersQueryKeys.all(), "banks", params] as const,
  history: () => [...transfersQueryKeys.all(), "history"] as const,
};

export const useBanks = (params?: ListBanksParams) => {
  return useQuery<ListBanksResponse, AxiosError>({
    queryKey: transfersQueryKeys.banks(params),
    queryFn: () => TRANSFERS_API.LIST_BANKS(params),
  });
};

export const useTransferHistory = () => {
  return useQuery<TransferHistoryResponse, AxiosError>({
    queryKey: transfersQueryKeys.history(),
    queryFn: TRANSFERS_API.HISTORY,
  });
};

export const useLookupAccount = () => {
  return useMutation<LookupAccountResponse, AxiosError, LookupAccountPayload>({
    mutationFn: TRANSFERS_API.LOOKUP,
  });
};

export const useSendMoney = () => {
  const queryClient = useQueryClient();

  return useMutation<SendMoneyResponse, AxiosError, SendMoneyPayload>({
    mutationFn: TRANSFERS_API.SEND,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transfersQueryKeys.history() });
      queryClient.invalidateQueries({ queryKey: paymentsQueryKeys.all() });
    },
  });
};
