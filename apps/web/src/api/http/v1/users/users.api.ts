import apiClient from "../../api-client";
import type { GetUserResponse, ListUsersResponse } from "./users.types";

export const USERS_ENDPOINTS = {
  list: "/api/users",
  get: (userId: string) => `/api/users/${userId}`,
} as const;

export const USERS_API = {
  LIST: async (): Promise<ListUsersResponse> =>
    apiClient.get(USERS_ENDPOINTS.list).then((res) => res.data),

  GET: async (userId: string): Promise<GetUserResponse> =>
    apiClient.get(USERS_ENDPOINTS.get(userId)).then((res) => res.data),
};
