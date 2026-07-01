import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useActiveWorkspaceId, workspaceScope } from "@/api/http/use-active-workspace-id";
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
  all: (workspaceId?: string) => ["bill-splits", workspaceScope(workspaceId)] as const,
  list: (workspaceId?: string) => [...billSplitsQueryKeys.all(workspaceId), "list"] as const,
  detail: (workspaceId: string | undefined, billSplitId: string) =>
    [...billSplitsQueryKeys.all(workspaceId), "detail", billSplitId] as const,
  byToken: (token: string) => ["bill-splits", "by-token", token] as const,
};

export const useBillSplits = (): UseQueryResult<ListBillSplitsResponse, AxiosError> => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<ListBillSplitsResponse, AxiosError>({
    queryKey: billSplitsQueryKeys.list(workspaceId),
    queryFn: BILL_SPLITS_API.LIST,
    enabled: !!workspaceId,
  });
};

export const useBillSplit = (
  billSplitId: string
): UseQueryResult<GetBillSplitResponse, AxiosError> => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<GetBillSplitResponse, AxiosError>({
    queryKey: billSplitsQueryKeys.detail(workspaceId, billSplitId),
    queryFn: () => BILL_SPLITS_API.GET(billSplitId),
    enabled: !!workspaceId && !!billSplitId,
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
  const workspaceId = useActiveWorkspaceId();

  return useMutation<CreateBillSplitResponse, AxiosError, CreateBillSplitFromImageInput>({
    mutationFn: BILL_SPLITS_API.CREATE_FROM_IMAGE,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billSplitsQueryKeys.list(workspaceId) });
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
