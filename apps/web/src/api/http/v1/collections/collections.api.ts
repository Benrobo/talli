import apiClient from "../../api-client";
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
} from "./collections.types";

export const COLLECTIONS_ENDPOINTS = {
  list: "/api/collections",
  create: "/api/collections",
  get: (collectionId: string) => `/api/collections/${collectionId}`,
  members: (collectionId: string) => `/api/collections/${collectionId}/members`,
  payments: (collectionId: string) => `/api/collections/${collectionId}/payments`,
} as const;

export const COLLECTIONS_API = {
  LIST: async (): Promise<ListCollectionsResponse> =>
    apiClient.get(COLLECTIONS_ENDPOINTS.list).then((res) => res.data),

  CREATE: async (payload: CreateCollectionPayload): Promise<CreateCollectionResponse> =>
    apiClient.post(COLLECTIONS_ENDPOINTS.create, payload).then((res) => res.data),

  GET: async (collectionId: string): Promise<GetCollectionResponse> =>
    apiClient.get(COLLECTIONS_ENDPOINTS.get(collectionId)).then((res) => res.data),

  LIST_MEMBERS: async (
    collectionId: string,
    params?: ListMembersParams
  ): Promise<ListCollectionMembersResponse> =>
    apiClient
      .get(COLLECTIONS_ENDPOINTS.members(collectionId), { params })
      .then((res) => res.data),

  LIST_PAYMENTS: async (
    collectionId: string,
    params?: ListPaymentsParams
  ): Promise<ListCollectionPaymentsResponse> =>
    apiClient
      .get(COLLECTIONS_ENDPOINTS.payments(collectionId), { params })
      .then((res) => res.data),

  ADD_MEMBER: async (
    collectionId: string,
    payload: AddCollectionMemberPayload
  ): Promise<AddCollectionMemberResponse> =>
    apiClient
      .post(COLLECTIONS_ENDPOINTS.members(collectionId), payload)
      .then((res) => res.data),

  UPDATE_STATUS: async (
    collectionId: string,
    payload: UpdateCollectionStatusPayload
  ): Promise<UpdateCollectionStatusResponse> =>
    apiClient
      .patch(COLLECTIONS_ENDPOINTS.get(collectionId), payload)
      .then((res) => res.data),
};
