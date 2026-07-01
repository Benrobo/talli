import axios, { type AxiosError, type AxiosResponse } from "axios";
import env from "@/config/env";

export const apiClient = axios.create({
  baseURL: env.ENGINE_API_URL,
  withCredentials: true,
  timeout: 60_000,
});

let refreshing: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  if (!refreshing) {
    refreshing = apiClient
      .post("/api/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosError["config"] & { _retried?: boolean }) | undefined;
    const url = original?.url ?? "";
    const isAuthCall =
      url.includes("/auth/refresh") || url.includes("/auth/verify-otp") || url.includes("/auth/me");

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        await refreshSession();
        return apiClient(original);
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
