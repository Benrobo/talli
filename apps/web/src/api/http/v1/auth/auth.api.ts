import apiClient from "../../api-client";
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
import type { User } from "@app/shared";

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

  LOGOUT: async (): Promise<LogoutResponse> =>
    apiClient.post(AUTH_ENDPOINTS.logout).then((res) => res.data),
};

/** Backward-compatible surface used by existing routes. */
export const authApi = {
  async me(): Promise<User> {
    const { data } = await AUTH_API.ME();
    return data.user;
  },
  async requestOtp(payload: RequestOtpPayload) {
    const { data } = await AUTH_API.REQUEST_OTP(payload);
    return data;
  },
  async verifyOtp(payload: VerifyOtpPayload) {
    const { data } = await AUTH_API.VERIFY_OTP(payload);
    return data;
  },
  async logout() {
    await AUTH_API.LOGOUT();
  },
};
