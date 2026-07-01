import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { WORKSPACES_API } from "./workspaces.api";
import type {
  CreateWorkspacePayload,
  CreateWorkspaceResponse,
  ListWorkspacesResponse,
  SwitchWorkspaceResponse,
} from "./workspaces.types";

export const workspacesQueryKeys = {
  all: ["workspaces"] as const,
  list: () => [...workspacesQueryKeys.all, "list"] as const,
};

export const useWorkspaces = () => {
  return useQuery<ListWorkspacesResponse, AxiosError>({
    queryKey: workspacesQueryKeys.list(),
    queryFn: WORKSPACES_API.LIST,
  });
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateWorkspaceResponse, AxiosError, CreateWorkspacePayload>({
    mutationFn: WORKSPACES_API.CREATE,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspacesQueryKeys.list() });
    },
  });
};

export const useSwitchWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation<SwitchWorkspaceResponse, AxiosError, string>({
    mutationFn: WORKSPACES_API.SWITCH,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspacesQueryKeys.list() });
    },
  });
};
