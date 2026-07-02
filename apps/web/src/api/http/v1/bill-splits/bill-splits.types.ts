import { z } from "zod";
import type { ApiSuccess } from "@app/shared";

export const createBillSplitFormSchema = z.object({
  title: z.string().trim().min(1).max(120).default("Bill split"),
});

export const billSplitCheckoutSchema = z.object({
  payerName: z.string().trim().min(1, "Name is required").max(80),
  itemIds: z.array(z.string().min(1)).min(1, "Pick at least one item to pay for"),
});

export type CreateBillSplitFormInput = z.infer<typeof createBillSplitFormSchema>;
export type BillSplitCheckoutPayload = z.infer<typeof billSplitCheckoutSchema>;

export interface BillSplitItem {
  id: string;
  name: string;
  unitPrice: number;
  status: string;
}

export interface BillSplitSummary {
  id: string;
  title: string;
  token: string;
  status: string;
  currency: string;
  total: number;
  itemCount: number;
  paidItemCount: number;
  shareUrl: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface BillSplitDetail extends BillSplitSummary {
  items: BillSplitItem[];
}

export interface CreateBillSplitData {
  url: string;
  token: string;
}

export interface BillSplitCheckoutData {
  checkoutUrl: string;
  amount: number;
}

export type CreateBillSplitResponse = ApiSuccess<CreateBillSplitData>;
export type ListBillSplitsResponse = ApiSuccess<{ billSplits: BillSplitSummary[] }>;
export type GetBillSplitResponse = ApiSuccess<BillSplitDetail>;
export type GetBillSplitByTokenResponse = ApiSuccess<BillSplitDetail>;
export type BillSplitCheckoutResponse = ApiSuccess<BillSplitCheckoutData>;

export interface CreateBillSplitFromImageInput {
  image: File;
  title?: string;
}
