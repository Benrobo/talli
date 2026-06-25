import type { Workspace } from "@app/shared";
import apiClient from "./api-client";

interface WorkspacesResponse {
  data: Workspace[];
}

interface WorkspaceResponse {
  data: Workspace;
}

/**
 * Workspace API — list, create, and switch the user's active workspace.
 */
export const workspacesApi = {
  async list(): Promise<Workspace[]> {
    const { data } = await apiClient.get<WorkspacesResponse>("/api/workspaces");
    return data.data;
  },

  async create(payload: { name: string }): Promise<Workspace> {
    const { data } = await apiClient.post<WorkspaceResponse>(
      "/api/workspaces",
      payload
    );
    return data.data;
  },

  async switch(workspaceId: string): Promise<void> {
    await apiClient.post(`/api/workspaces/${workspaceId}/switch`);
  },
};
