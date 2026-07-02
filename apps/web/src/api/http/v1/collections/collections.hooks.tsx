import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { COLLECTIONS_API } from "./collections.api";
import type {
  AddCollectionMemberPayload,
  AddCollectionMemberResponse,
  CreateCollectionPayload,
  CreateCollectionResponse,
  GetCollectionResponse,
  ListCollectionMembersResponse,
  ListCollectionPaymentsResponse,
  ListCollectionsResponse,
  ListMembersParams,
  ListPaymentsParams,
  UpdateCollectionStatusPayload,
  UpdateCollectionStatusResponse,
  UpdateCollectionPayload,
  UpdateCollectionResponse,
  DeleteCollectionResponse,
  GetCollectionPayViewResponse,
  CollectionPayCheckoutResponse,
  CollectionPayCheckoutPayload,
  CollectionPayVerifyResponse,
} from "./collections.types";

export const collectionsQueryKeys = {
  all: () => ["collections"] as const,
  list: () => [...collectionsQueryKeys.all(), "list"] as const,
  detail: (collectionId: string) =>
    [...collectionsQueryKeys.all(), "detail", collectionId] as const,
  members: (collectionId: string, params?: ListMembersParams) =>
    [...collectionsQueryKeys.detail(collectionId), "members", params] as const,
  payments: (collectionId: string, params?: ListPaymentsParams) =>
    [...collectionsQueryKeys.detail(collectionId), "payments", params] as const,
  payView: (reference: string) => ["collection-pay", reference] as const,
};

export const useCollections = () => {
  return useQuery<ListCollectionsResponse, AxiosError>({
    queryKey: collectionsQueryKeys.list(),
    queryFn: COLLECTIONS_API.LIST,
  });
};

export const useCollection = (collectionId: string) => {
  return useQuery<GetCollectionResponse, AxiosError>({
    queryKey: collectionsQueryKeys.detail(collectionId),
    queryFn: () => COLLECTIONS_API.GET(collectionId),
    enabled: !!collectionId,
  });
};

export const useCollectionMembers = (collectionId: string, params?: ListMembersParams) => {
  return useQuery<ListCollectionMembersResponse, AxiosError>({
    queryKey: collectionsQueryKeys.members(collectionId, params),
    queryFn: () => COLLECTIONS_API.LIST_MEMBERS(collectionId, params),
    enabled: !!collectionId,
  });
};

export const useCollectionPayments = (collectionId: string, params?: ListPaymentsParams) => {
  return useQuery<ListCollectionPaymentsResponse, AxiosError>({
    queryKey: collectionsQueryKeys.payments(collectionId, params),
    queryFn: () => COLLECTIONS_API.LIST_PAYMENTS(collectionId, params),
    enabled: !!collectionId,
  });
};

export const useCreateCollection = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateCollectionResponse, AxiosError, CreateCollectionPayload>({
    mutationFn: COLLECTIONS_API.CREATE,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.list() });
    },
  });
};

export const useAddCollectionMember = (collectionId: string) => {
  const queryClient = useQueryClient();

  return useMutation<AddCollectionMemberResponse, AxiosError, AddCollectionMemberPayload>({
    mutationFn: (payload) => COLLECTIONS_API.ADD_MEMBER(collectionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.detail(collectionId) });
    },
  });
};

export const useUpdateCollectionStatus = (collectionId: string) => {
  const queryClient = useQueryClient();

  return useMutation<UpdateCollectionStatusResponse, AxiosError, UpdateCollectionStatusPayload>({
    mutationFn: (payload) => COLLECTIONS_API.UPDATE_STATUS(collectionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.detail(collectionId) });
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.list() });
    },
  });
};

export const useUpdateCollection = (collectionId: string) => {
  const queryClient = useQueryClient();

  return useMutation<UpdateCollectionResponse, AxiosError, UpdateCollectionPayload>({
    mutationFn: (payload) => COLLECTIONS_API.UPDATE(collectionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.detail(collectionId) });
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.list() });
    },
  });
};

export const useDeleteCollection = () => {
  const queryClient = useQueryClient();

  return useMutation<DeleteCollectionResponse, AxiosError, string>({
    mutationFn: (collectionId) => COLLECTIONS_API.DELETE(collectionId),
    onSuccess: (_data, collectionId) => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.list() });
      queryClient.removeQueries({ queryKey: collectionsQueryKeys.detail(collectionId) });
    },
  });
};

export const useCollectionPayView = (reference: string) =>
  useQuery<GetCollectionPayViewResponse, AxiosError>({
    queryKey: collectionsQueryKeys.payView(reference),
    queryFn: () => COLLECTIONS_API.GET_PAY_VIEW(reference),
    enabled: !!reference,
  });

export const useCheckoutCollectionPay = (reference: string) => {
  const queryClient = useQueryClient();

  return useMutation<CollectionPayCheckoutResponse, AxiosError, CollectionPayCheckoutPayload>({
    mutationFn: (payload) => COLLECTIONS_API.CHECKOUT_PAY(reference, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.payView(reference) });
    },
  });
};

export const useCancelCollectionPay = (reference: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError, string>({
    mutationFn: (memberId) => COLLECTIONS_API.CANCEL_PAY(reference, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.payView(reference) });
    },
  });
};

export const useVerifyCollectionPay = (reference: string) => {
  const queryClient = useQueryClient();

  return useMutation<CollectionPayVerifyResponse, AxiosError, string>({
    mutationFn: (pendingPaymentId) => COLLECTIONS_API.VERIFY_PAY(reference, pendingPaymentId),
    onSuccess: (response) => {
      if (response.data.status !== "pending") {
        queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.payView(reference) });
      }
    },
  });
};
