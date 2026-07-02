import apiClient from "../../api-client";
import type {
  LogoutResponse,
  MeResponse,
  RefreshTokenPayload,
  RefreshTokenResponse,
  RequestOtpPayload,
  RequestOtpResponse,
  UpdateProfilePayload,
  UpdateProfileResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
} from "./auth.types";

export const AUTH_ENDPOINTS = {
  requestOtp: "/api/auth/request-otp",
  verifyOtp: "/api/auth/verify-otp",
  refresh: "/api/auth/refresh",
  me: "/api/auth/me",
  logout: "/api/auth/logout",
} as const;

export const AUTH_API = {
  REQUEST_OTP: async (payload: RequestOtpPayload): Promise<RequestOtpResponse> =>
    apiClient.post(AUTH_ENDPOINTS.requestOtp, payload).then((res) => res.data),

  VERIFY_OTP: async (payload: VerifyOtpPayload): Promise<VerifyOtpResponse> =>
    apiClient.post(AUTH_ENDPOINTS.verifyOtp, payload).then((res) => res.data),

  REFRESH: async (payload?: RefreshTokenPayload): Promise<RefreshTokenResponse> =>
    apiClient.post(AUTH_ENDPOINTS.refresh, payload ?? {}).then((res) => res.data),

  ME: async (): Promise<MeResponse> => apiClient.get(AUTH_ENDPOINTS.me).then((res) => res.data),

  UPDATE_ME: async (payload: UpdateProfilePayload): Promise<UpdateProfileResponse> =>
    apiClient.patch(AUTH_ENDPOINTS.me, payload).then((res) => res.data),

  LOGOUT: async (): Promise<LogoutResponse> =>
    apiClient.post(AUTH_ENDPOINTS.logout).then((res) => res.data),
};
