import apiClient from "./api-client";
import type { User } from "@app/shared";

interface MeResponse {
  data: { user: User };
}

interface RequestOtpResponse {
  data: { email: string; expiresIn: number };
}

interface VerifyOtpResponse {
  data: { user: User; accessToken: string; refreshToken: string };
}

/**
 * Auth API surface. Uses Axios under the hood so cookies set by the
 * engine work transparently across the SPA.
 */
export const authApi = {
  async me(): Promise<User> {
    const { data } = await apiClient.get<MeResponse>("/api/auth/me");
    return data.data.user;
  },
  async requestOtp(payload: { email: string; mode?: "signup" | "login" }) {
    const { data } = await apiClient.post<RequestOtpResponse>(
      "/api/auth/request-otp",
      payload
    );
    return data.data;
  },
  async verifyOtp(payload: { email: string; code: string }) {
    const { data } = await apiClient.post<VerifyOtpResponse>(
      "/api/auth/verify-otp",
      payload
    );
    return data.data;
  },
  async logout() {
    await apiClient.post("/api/auth/logout");
  },
};
