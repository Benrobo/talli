import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { HEALTH_API } from "./health.api";
import type { HealthResponse } from "./health.types";

export const healthQueryKeys = {
  all: ["health"] as const,
  check: () => [...healthQueryKeys.all, "check"] as const,
};

export const useHealthCheck = () => {
  return useQuery<HealthResponse, AxiosError>({
    queryKey: healthQueryKeys.check(),
    queryFn: HEALTH_API.CHECK,
  });
};
