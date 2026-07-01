import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { RECEIPTS_API } from "./receipts.api";
import type { DownloadReceiptParams } from "./receipts.types";

export const receiptsQueryKeys = {
  all: ["receipts"] as const,
  download: (reference: string) => [...receiptsQueryKeys.all, "download", reference] as const,
};

export const useDownloadReceipt = () => {
  return useMutation<Blob, AxiosError, DownloadReceiptParams>({
    mutationFn: RECEIPTS_API.DOWNLOAD,
  });
};
