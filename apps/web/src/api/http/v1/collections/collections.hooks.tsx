import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useActiveWorkspaceId, workspaceScope } from "@/api/http/use-active-workspace-id";
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
} from "./collections.types";

export const collectionsQueryKeys = {
  all: (workspaceId?: string) => ["collections", workspaceScope(workspaceId)] as const,
  list: (workspaceId?: string) => [...collectionsQueryKeys.all(workspaceId), "list"] as const,
  detail: (workspaceId: string | undefined, collectionId: string) =>
    [...collectionsQueryKeys.all(workspaceId), "detail", collectionId] as const,
  members: (workspaceId: string | undefined, collectionId: string, params?: ListMembersParams) =>
    [...collectionsQueryKeys.detail(workspaceId, collectionId), "members", params] as const,
  payments: (workspaceId: string | undefined, collectionId: string, params?: ListPaymentsParams) =>
    [...collectionsQueryKeys.detail(workspaceId, collectionId), "payments", params] as const,
};

export const useCollections = () => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<ListCollectionsResponse, AxiosError>({
    queryKey: collectionsQueryKeys.list(workspaceId),
    queryFn: COLLECTIONS_API.LIST,
    enabled: !!workspaceId,
  });
};

export const useCollection = (collectionId: string) => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<GetCollectionResponse, AxiosError>({
    queryKey: collectionsQueryKeys.detail(workspaceId, collectionId),
    queryFn: () => COLLECTIONS_API.GET(collectionId),
    enabled: !!workspaceId && !!collectionId,
  });
};

export const useCollectionMembers = (collectionId: string, params?: ListMembersParams) => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<ListCollectionMembersResponse, AxiosError>({
    queryKey: collectionsQueryKeys.members(workspaceId, collectionId, params),
    queryFn: () => COLLECTIONS_API.LIST_MEMBERS(collectionId, params),
    enabled: !!workspaceId && !!collectionId,
  });
};

export const useCollectionPayments = (collectionId: string, params?: ListPaymentsParams) => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<ListCollectionPaymentsResponse, AxiosError>({
    queryKey: collectionsQueryKeys.payments(workspaceId, collectionId, params),
    queryFn: () => COLLECTIONS_API.LIST_PAYMENTS(collectionId, params),
    enabled: !!workspaceId && !!collectionId,
  });
};

export const useCreateCollection = () => {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId();

  return useMutation<CreateCollectionResponse, AxiosError, CreateCollectionPayload>({
    mutationFn: COLLECTIONS_API.CREATE,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.list(workspaceId) });
    },
  });
};

export const useAddCollectionMember = (collectionId: string) => {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId();

  return useMutation<AddCollectionMemberResponse, AxiosError, AddCollectionMemberPayload>({
    mutationFn: (payload) => COLLECTIONS_API.ADD_MEMBER(collectionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.detail(workspaceId, collectionId) });
    },
  });
};

export const useUpdateCollectionStatus = (collectionId: string) => {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId();

  return useMutation<UpdateCollectionStatusResponse, AxiosError, UpdateCollectionStatusPayload>({
    mutationFn: (payload) => COLLECTIONS_API.UPDATE_STATUS(collectionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.detail(workspaceId, collectionId) });
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.list(workspaceId) });
    },
  });
};

export const useUpdateCollection = (collectionId: string) => {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId();

  return useMutation<UpdateCollectionResponse, AxiosError, UpdateCollectionPayload>({
    mutationFn: (payload) => COLLECTIONS_API.UPDATE(collectionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.detail(workspaceId, collectionId) });
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.list(workspaceId) });
    },
  });
};

export const useDeleteCollection = () => {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId();

  return useMutation<DeleteCollectionResponse, AxiosError, string>({
    mutationFn: (collectionId) => COLLECTIONS_API.DELETE(collectionId),
    onSuccess: (_data, collectionId) => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.list(workspaceId) });
      queryClient.removeQueries({ queryKey: collectionsQueryKeys.detail(workspaceId, collectionId) });
    },
  });
};
