import apiClient from "../../api-client";
import type { HealthResponse } from "./health.types";

export const HEALTH_ENDPOINTS = {
  check: "/api/health",
} as const;

export const HEALTH_API = {
  CHECK: async (): Promise<HealthResponse> =>
    apiClient.get(HEALTH_ENDPOINTS.check).then((res) => res.data),
};
