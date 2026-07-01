import apiClient from "@/lib/api-client";

export type BillItemStatus = "available" | "claimed";

export interface BillItem {
  id: string;
  label: string;
  unitPrice: number;
  status: BillItemStatus;
  paidByName: string | null;
}

export interface BillSplitView {
  title: string;
  status: "active" | "closed" | "expired" | "cancelled";
  currency: string;
  knownNames: string[];
  items: BillItem[];
  expiresAt: string | null;
}

export interface BillCheckoutResult {
  amount: number;
  flashAccountNumber: string;
  flashBankName: string;
  flashAccountName?: string;
  checkoutUrl: string;
  selectionId: string;
}

export interface ItemsClaimedEvent {
  selectionId: string;
  payerName: string;
  itemIds: string[];
  amount: number;
}

export interface CreateBillSplitResult {
  url: string;
  token: string;
}

export type BillSplitStatus = "active" | "closed" | "expired" | "cancelled";

export interface BillSplitSummary {
  id: string;
  token: string;
  title: string;
  status: BillSplitStatus;
  currency: string;
  total: number;
  itemCount: number;
  paidItemCount: number;
  shareUrl: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface BillSplitDetail extends BillSplitSummary {
  subtotal: number | null;
  collected: number;
  targetAmount: number;
  items: BillItem[];
  selections: {
    id: string;
    payerName: string;
    amount: number;
    paid: boolean;
    createdAt: string;
  }[];
}

export const billSplitApi = {
  async createFromImage(image: File, title?: string): Promise<CreateBillSplitResult> {
    const form = new FormData();
    form.append("image", image);
    if (title) form.append("title", title);
    const res = await apiClient.post("/api/bill-splits", form);
    return res.data.data;
  },

  async getByToken(token: string): Promise<BillSplitView> {
    const res = await apiClient.get(`/api/bill-splits/by-token/${token}`);
    return res.data.data;
  },

  async checkout(
    token: string,
    payload: { payerName: string; itemIds: string[] }
  ): Promise<BillCheckoutResult> {
    const res = await apiClient.post(`/api/bill-splits/by-token/${token}/checkout`, payload);
    return res.data.data;
  },

  async list(): Promise<BillSplitSummary[]> {
    const res = await apiClient.get("/api/bill-splits");
    return res.data.data.billSplits;
  },

  async getDetail(id: string): Promise<BillSplitDetail> {
    const res = await apiClient.get(`/api/bill-splits/${id}`);
    return res.data.data;
  },
};
