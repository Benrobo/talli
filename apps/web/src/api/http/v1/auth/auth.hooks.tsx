import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { AUTH_API } from "./auth.api";
import type {
  LogoutResponse,
  MeResponse,
  RefreshTokenPayload,
  RefreshTokenResponse,
  RequestOtpPayload,
  RequestOtpResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
} from "./auth.types";

export const authQueryKeys = {
  all: ["auth"] as const,
  me: () => [...authQueryKeys.all, "me"] as const,
};

export const meQueryOptions = () =>
  queryOptions<MeResponse, AxiosError>({
    queryKey: authQueryKeys.me(),
    queryFn: AUTH_API.ME,
    staleTime: 5 * 60 * 1000,
  });

export const useMe = (): UseQueryResult<MeResponse, AxiosError> => {
  return useQuery(meQueryOptions());
};

export const useRequestOtp = (): UseMutationResult<
  RequestOtpResponse,
  AxiosError,
  RequestOtpPayload
> => {
  return useMutation<RequestOtpResponse, AxiosError, RequestOtpPayload>({
    mutationFn: AUTH_API.REQUEST_OTP,
  });
};

export const useVerifyOtp = (): UseMutationResult<
  VerifyOtpResponse,
  AxiosError,
  VerifyOtpPayload
> => {
  const queryClient = useQueryClient();

  return useMutation<VerifyOtpResponse, AxiosError, VerifyOtpPayload>({
    mutationFn: AUTH_API.VERIFY_OTP,
    onSuccess: (response) => {
      queryClient.setQueryData<MeResponse>(authQueryKeys.me(), {
        data: { user: response.data.user },
      });
    },
  });
};

export const useRefreshToken = (): UseMutationResult<
  RefreshTokenResponse,
  AxiosError,
  RefreshTokenPayload | undefined
> => {
  return useMutation<RefreshTokenResponse, AxiosError, RefreshTokenPayload | undefined>({
    mutationFn: (payload) => AUTH_API.REFRESH(payload),
  });
};

export const useLogout = (): UseMutationResult<LogoutResponse, AxiosError, void> => {
  const queryClient = useQueryClient();

  return useMutation<LogoutResponse, AxiosError>({
    mutationFn: AUTH_API.LOGOUT,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: authQueryKeys.all });
      window.location.href = "/auth";
    },
  });
};
