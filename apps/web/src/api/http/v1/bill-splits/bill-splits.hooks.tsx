import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { BILL_SPLITS_API } from "./bill-splits.api";
import type {
  BillSplitCheckoutPayload,
  BillSplitCheckoutResponse,
  CreateBillSplitFromImageInput,
  CreateBillSplitResponse,
  GetBillSplitByTokenResponse,
  GetBillSplitResponse,
  ListBillSplitsResponse,
} from "./bill-splits.types";

export const billSplitsQueryKeys = {
  all: ["bill-splits"] as const,
  list: () => [...billSplitsQueryKeys.all, "list"] as const,
  detail: (billSplitId: string) => [...billSplitsQueryKeys.all, "detail", billSplitId] as const,
  byToken: (token: string) => [...billSplitsQueryKeys.all, "by-token", token] as const,
};

export const useBillSplits = (): UseQueryResult<ListBillSplitsResponse, AxiosError> => {
  return useQuery<ListBillSplitsResponse, AxiosError>({
    queryKey: billSplitsQueryKeys.list(),
    queryFn: BILL_SPLITS_API.LIST,
  });
};

export const useBillSplit = (
  billSplitId: string
): UseQueryResult<GetBillSplitResponse, AxiosError> => {
  return useQuery<GetBillSplitResponse, AxiosError>({
    queryKey: billSplitsQueryKeys.detail(billSplitId),
    queryFn: () => BILL_SPLITS_API.GET(billSplitId),
    enabled: !!billSplitId,
  });
};

export const useBillSplitByToken = (
  token: string
): UseQueryResult<GetBillSplitByTokenResponse, AxiosError> => {
  return useQuery<GetBillSplitByTokenResponse, AxiosError>({
    queryKey: billSplitsQueryKeys.byToken(token),
    queryFn: () => BILL_SPLITS_API.GET_BY_TOKEN(token),
    enabled: !!token,
  });
};

export const useCreateBillSplitFromImage = (): UseMutationResult<
  CreateBillSplitResponse,
  AxiosError,
  CreateBillSplitFromImageInput
> => {
  const queryClient = useQueryClient();

  return useMutation<CreateBillSplitResponse, AxiosError, CreateBillSplitFromImageInput>({
    mutationFn: BILL_SPLITS_API.CREATE_FROM_IMAGE,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billSplitsQueryKeys.list() });
    },
  });
};

export const useBillSplitCheckout = (
  token: string
): UseMutationResult<BillSplitCheckoutResponse, AxiosError, BillSplitCheckoutPayload> => {
  return useMutation<BillSplitCheckoutResponse, AxiosError, BillSplitCheckoutPayload>({
    mutationFn: (payload) => BILL_SPLITS_API.CHECKOUT(token, payload),
  });
};
