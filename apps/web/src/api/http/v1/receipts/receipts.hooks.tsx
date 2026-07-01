import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { workspaceScope } from "@/api/http/use-active-workspace-id";
import { RECEIPTS_API } from "./receipts.api";
import type { DownloadReceiptParams } from "./receipts.types";

export const receiptsQueryKeys = {
  all: (workspaceId?: string) => ["receipts", workspaceScope(workspaceId)] as const,
  download: (workspaceId: string | undefined, reference: string) =>
    [...receiptsQueryKeys.all(workspaceId), "download", reference] as const,
};

export const useDownloadReceipt = () => {
  return useMutation<Blob, AxiosError, DownloadReceiptParams>({
    mutationFn: RECEIPTS_API.DOWNLOAD,
  });
};
