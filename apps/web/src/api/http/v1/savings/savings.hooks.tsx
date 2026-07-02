import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
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
  all: ["savings"] as const,
  list: () => [...savingsQueryKeys.all, "list"] as const,
  detail: (id: string) => [...savingsQueryKeys.all, "detail", id] as const,
};

export const useSavingsJars = () => {
  return useQuery<ListSavingsJarsResponse, AxiosError>({
    queryKey: savingsQueryKeys.list(),
    queryFn: SAVINGS_API.LIST,
  });
};

export const useSavingsJar = (id: string) => {
  return useQuery<GetSavingsJarResponse, AxiosError>({
    queryKey: savingsQueryKeys.detail(id),
    queryFn: () => SAVINGS_API.GET(id),
    enabled: !!id,
  });
};

export const useCreateSavingsJar = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateSavingsJarResponse, AxiosError, CreateSavingsJarPayload>({
    mutationFn: SAVINGS_API.CREATE,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsQueryKeys.all });
    },
  });
};

export const useDepositToSavingsJar = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation<DepositToSavingsJarResponse, AxiosError, DepositToSavingsJarPayload>({
    mutationFn: (payload) => SAVINGS_API.DEPOSIT(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: savingsQueryKeys.detail(id) });
    },
  });
};

export const useUpdateSavingsJar = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation<UpdateSavingsJarResponse, AxiosError, UpdateSavingsJarPayload>({
    mutationFn: (payload) => SAVINGS_API.UPDATE(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: savingsQueryKeys.detail(id) });
    },
  });
};

export const useDeleteSavingsJar = () => {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError, string>({
    mutationFn: async (id) => {
      await SAVINGS_API.DELETE(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsQueryKeys.all });
    },
  });
};
