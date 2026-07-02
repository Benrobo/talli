import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useActiveWorkspaceId, workspaceScope } from "@/api/http/use-active-workspace-id";
import { SAVINGS_API } from "./savings.api";
import type {
  CreateSavingsJarPayload,
  CreateSavingsJarResponse,
  DepositToSavingsJarPayload,
  DepositToSavingsJarResponse,
  GetSavingsJarResponse,
  ListSavingsJarsResponse,
  UpdateSavingsJarPayload,
  UpdateSavingsJarResponse,
} from "./savings.types";

export const savingsQueryKeys = {
  all: (workspaceId?: string) => ["savings", workspaceScope(workspaceId)] as const,
  list: (workspaceId?: string) => [...savingsQueryKeys.all(workspaceId), "list"] as const,
  detail: (workspaceId: string | undefined, id: string) =>
    [...savingsQueryKeys.all(workspaceId), "detail", id] as const,
};

export const useSavingsJars = () => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<ListSavingsJarsResponse, AxiosError>({
    queryKey: savingsQueryKeys.list(workspaceId),
    queryFn: SAVINGS_API.LIST,
    enabled: !!workspaceId,
  });
};

export const useSavingsJar = (id: string) => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<GetSavingsJarResponse, AxiosError>({
    queryKey: savingsQueryKeys.detail(workspaceId, id),
    queryFn: () => SAVINGS_API.GET(id),
    enabled: !!workspaceId && !!id,
  });
};

export const useCreateSavingsJar = () => {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId();

  return useMutation<CreateSavingsJarResponse, AxiosError, CreateSavingsJarPayload>({
    mutationFn: SAVINGS_API.CREATE,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsQueryKeys.all(workspaceId) });
    },
  });
};

export const useDepositToSavingsJar = (id: string) => {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId();

  return useMutation<DepositToSavingsJarResponse, AxiosError, DepositToSavingsJarPayload>({
    mutationFn: (payload) => SAVINGS_API.DEPOSIT(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsQueryKeys.all(workspaceId) });
      queryClient.invalidateQueries({ queryKey: savingsQueryKeys.detail(workspaceId, id) });
    },
  });
};

export const useUpdateSavingsJar = (id: string) => {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId();

  return useMutation<UpdateSavingsJarResponse, AxiosError, UpdateSavingsJarPayload>({
    mutationFn: (payload) => SAVINGS_API.UPDATE(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsQueryKeys.all(workspaceId) });
      queryClient.invalidateQueries({ queryKey: savingsQueryKeys.detail(workspaceId, id) });
    },
  });
};

export const useDeleteSavingsJar = () => {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId();

  return useMutation<void, AxiosError, string>({
    mutationFn: async (id) => {
      await SAVINGS_API.DELETE(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsQueryKeys.all(workspaceId) });
    },
  });
};
