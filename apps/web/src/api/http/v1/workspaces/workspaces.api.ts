import apiClient from "../../api-client";
import type {
  CreateWorkspacePayload,
  CreateWorkspaceResponse,
  ListWorkspacesResponse,
  SwitchWorkspaceResponse,
} from "./workspaces.types";

export const WORKSPACES_ENDPOINTS = {
  list: "/api/workspaces",
  create: "/api/workspaces",
  switch: (workspaceId: string) => `/api/workspaces/${workspaceId}/switch`,
} as const;

export const WORKSPACES_API = {
  LIST: async (): Promise<ListWorkspacesResponse> =>
    apiClient.get(WORKSPACES_ENDPOINTS.list).then((res) => res.data),

  CREATE: async (payload: CreateWorkspacePayload): Promise<CreateWorkspaceResponse> =>
    apiClient.post(WORKSPACES_ENDPOINTS.create, payload).then((res) => res.data),

  SWITCH: async (workspaceId: string): Promise<SwitchWorkspaceResponse> =>
    apiClient.post(WORKSPACES_ENDPOINTS.switch(workspaceId)).then((res) => res.data),
};
