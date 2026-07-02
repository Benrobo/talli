import apiClient from "../../api-client";
import type {
  BillSplitCheckoutPayload,
  BillSplitCheckoutResponse,
  CreateBillSplitFromImageInput,
  CreateBillSplitResponse,
  GetBillSplitByTokenResponse,
  GetBillSplitResponse,
  ListBillSplitsResponse,
} from "./bill-splits.types";

export const BILL_SPLITS_ENDPOINTS = {
  list: "/api/bill-splits",
  create: "/api/bill-splits",
  detail: (billSplitId: string) => `/api/bill-splits/${billSplitId}`,
  byToken: (token: string) => `/api/bill-splits/by-token/${token}`,
  checkout: (token: string) => `/api/bill-splits/by-token/${token}/checkout`,
} as const;

export const BILL_SPLITS_API = {
  LIST: async (): Promise<ListBillSplitsResponse> =>
    apiClient.get(BILL_SPLITS_ENDPOINTS.list).then((res) => res.data),

  CREATE_FROM_IMAGE: async (input: CreateBillSplitFromImageInput): Promise<CreateBillSplitResponse> => {
    const formData = new FormData();
    formData.append("image", input.image);
    if (input.title) formData.append("title", input.title);

    return apiClient
      .post(BILL_SPLITS_ENDPOINTS.create, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => res.data);
  },

  GET: async (billSplitId: string): Promise<GetBillSplitResponse> =>
    apiClient.get(BILL_SPLITS_ENDPOINTS.detail(billSplitId)).then((res) => res.data),

  GET_BY_TOKEN: async (token: string): Promise<GetBillSplitByTokenResponse> =>
    apiClient.get(BILL_SPLITS_ENDPOINTS.byToken(token)).then((res) => res.data),

  CHECKOUT: async (
    token: string,
    payload: BillSplitCheckoutPayload
  ): Promise<BillSplitCheckoutResponse> =>
    apiClient.post(BILL_SPLITS_ENDPOINTS.checkout(token), payload).then((res) => res.data),

  DELETE: async (billSplitId: string): Promise<void> => {
    await apiClient.delete(BILL_SPLITS_ENDPOINTS.detail(billSplitId));
  },
};
