import apiClient from "../../api-client";
import type {
  CreateSavingsJarPayload,
  CreateSavingsJarResponse,
  GetSavingsJarResponse,
  ListSavingsJarsResponse,
} from "./savings.types";

export const SAVINGS_ENDPOINTS = {
  list: "/api/savings",
  get: (id: string) => `/api/savings/${id}`,
  create: "/api/savings",
} as const;

export const SAVINGS_API = {
  LIST: async (): Promise<ListSavingsJarsResponse> =>
    apiClient.get(SAVINGS_ENDPOINTS.list).then((res) => res.data),

  GET: async (id: string): Promise<GetSavingsJarResponse> =>
    apiClient.get(SAVINGS_ENDPOINTS.get(id)).then((res) => res.data),

  CREATE: async (payload: CreateSavingsJarPayload): Promise<CreateSavingsJarResponse> =>
    apiClient.post(SAVINGS_ENDPOINTS.create, payload).then((res) => res.data),
};
