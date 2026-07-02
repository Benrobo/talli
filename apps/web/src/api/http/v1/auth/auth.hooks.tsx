import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export const useMe = () => {
  return useQuery<MeResponse, AxiosError>({
    queryKey: authQueryKeys.me(),
    queryFn: AUTH_API.ME,
  });
};

export const useRequestOtp = () => {
  return useMutation<RequestOtpResponse, AxiosError, RequestOtpPayload>({
    mutationFn: AUTH_API.REQUEST_OTP,
  });
};

export const useVerifyOtp = () => {
  const queryClient = useQueryClient();

  return useMutation<VerifyOtpResponse, AxiosError, VerifyOtpPayload>({
    mutationFn: AUTH_API.VERIFY_OTP,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.me() });
    },
  });
};

export const useRefreshToken = () => {
  return useMutation<RefreshTokenResponse, AxiosError, RefreshTokenPayload | undefined>({
    mutationFn: (payload) => AUTH_API.REFRESH(payload),
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation<LogoutResponse, AxiosError>({
    mutationFn: AUTH_API.LOGOUT,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: authQueryKeys.all });
    },
  });
};
