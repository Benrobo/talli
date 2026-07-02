import apiClient from "../../api-client";
import type {
  CreateSavingsJarPayload,
  CreateSavingsJarResponse,
  DepositToSavingsJarPayload,
  DepositToSavingsJarResponse,
  GetSavingsJarResponse,
  ListSavingsJarsResponse,
} from "./savings.types";

export const SAVINGS_ENDPOINTS = {
  list: "/api/savings",
  get: (id: string) => `/api/savings/${id}`,
  create: "/api/savings",
  deposit: (id: string) => `/api/savings/${id}/deposits`,
} as const;

export const SAVINGS_API = {
  LIST: async (): Promise<ListSavingsJarsResponse> =>
    apiClient.get(SAVINGS_ENDPOINTS.list).then((res) => res.data),

  GET: async (id: string): Promise<GetSavingsJarResponse> =>
    apiClient.get(SAVINGS_ENDPOINTS.get(id)).then((res) => res.data),

  CREATE: async (payload: CreateSavingsJarPayload): Promise<CreateSavingsJarResponse> =>
    apiClient.post(SAVINGS_ENDPOINTS.create, payload).then((res) => res.data),

  DEPOSIT: async (id: string, payload: DepositToSavingsJarPayload): Promise<DepositToSavingsJarResponse> =>
    apiClient.post(SAVINGS_ENDPOINTS.deposit(id), payload).then((res) => res.data),
};
