import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useActiveWorkspaceId, workspaceScope } from "@/api/http/use-active-workspace-id";
import { USERS_API } from "./users.api";
import type { GetUserResponse, ListUsersResponse } from "./users.types";

export const usersQueryKeys = {
  all: (workspaceId?: string) => ["users", workspaceScope(workspaceId)] as const,
  list: (workspaceId?: string) => [...usersQueryKeys.all(workspaceId), "list"] as const,
  detail: (workspaceId: string | undefined, userId: string) =>
    [...usersQueryKeys.all(workspaceId), "detail", userId] as const,
};

export const useUsers = () => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<ListUsersResponse, AxiosError>({
    queryKey: usersQueryKeys.list(workspaceId),
    queryFn: USERS_API.LIST,
    enabled: !!workspaceId,
  });
};

export const useUser = (userId: string) => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<GetUserResponse, AxiosError>({
    queryKey: usersQueryKeys.detail(workspaceId, userId),
    queryFn: () => USERS_API.GET(userId),
    enabled: !!workspaceId && !!userId,
  });
};
