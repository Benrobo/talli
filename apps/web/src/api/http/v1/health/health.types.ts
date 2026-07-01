import type { ApiSuccess } from "@app/shared";

export interface HealthData {
  status: string;
}

export type HealthResponse = ApiSuccess<HealthData>;
