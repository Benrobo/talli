import axios, { type AxiosError, type AxiosResponse } from "axios";
import env from "@/config/env";

/**
 * Pre-configured Axios instance pointed at the engine API.
 * Cookies are sent automatically (`withCredentials: true`) so the
 * httpOnly auth cookie set by the engine reaches every request.
 */
export const apiClient = axios.create({
  baseURL: env.ENGINE_API_URL,
  withCredentials: true,
  timeout: 60_000,
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => Promise.reject(error)
);

export default apiClient;
