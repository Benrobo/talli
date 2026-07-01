import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { USERS_API } from "./users.api";
import type { GetUserResponse, ListUsersResponse } from "./users.types";

export const usersQueryKeys = {
  all: ["users"] as const,
  list: () => [...usersQueryKeys.all, "list"] as const,
  detail: (userId: string) => [...usersQueryKeys.all, "detail", userId] as const,
};

export const useUsers = () => {
  return useQuery<ListUsersResponse, AxiosError>({
    queryKey: usersQueryKeys.list(),
    queryFn: USERS_API.LIST,
  });
};

export const useUser = (userId: string) => {
  return useQuery<GetUserResponse, AxiosError>({
    queryKey: usersQueryKeys.detail(userId),
    queryFn: () => USERS_API.GET(userId),
    enabled: !!userId,
  });
};
