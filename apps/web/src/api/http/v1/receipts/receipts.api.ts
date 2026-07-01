import apiClient from "../../api-client";
import type { DownloadReceiptParams } from "./receipts.types";

export const RECEIPTS_ENDPOINTS = {
  download: (reference: string) => `/api/receipts/${reference}.png`,
} as const;

export const RECEIPTS_API = {
  DOWNLOAD: async ({ reference }: DownloadReceiptParams): Promise<Blob> =>
    apiClient
      .get(RECEIPTS_ENDPOINTS.download(reference), { responseType: "blob" })
      .then((res) => res.data),
};
