import { z } from "zod";
import type { ApiSuccess } from "@app/shared";

export const createCollectionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  purpose: z.string().trim().max(280).default(""),
  collectionType: z.enum(["fixed_per_person", "open_contribution", "named_members"]),
  amountPerMember: z.number().int().positive().optional(),
  targetAmount: z.number().int().positive().optional(),
  deadline: z.coerce.date().optional(),
  linkedChatId: z.string().optional(),
});

export const addCollectionMemberSchema = z.object({
  displayName: z.string().trim().min(1, "Member name is required").max(80),
  expectedAmount: z.number().int().positive(),
  platformUserId: z.string().optional(),
});

export const updateCollectionStatusSchema = z.object({
  status: z.enum(["draft", "active", "closed", "cancelled"]),
});

export const updateCollectionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  purpose: z.string().trim().max(280).default(""),
  amountPerMember: z.number().int().positive().optional(),
  targetAmount: z.number().int().positive().optional(),
  deadline: z.union([z.coerce.date(), z.null()]).optional(),
});

export type CreateCollectionPayload = z.infer<typeof createCollectionSchema>;
export type AddCollectionMemberPayload = z.infer<typeof addCollectionMemberSchema>;
export type UpdateCollectionStatusPayload = z.infer<typeof updateCollectionStatusSchema>;
export type UpdateCollectionPayload = z.infer<typeof updateCollectionSchema>;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CollectionRecord {
  id: string;
  title: string;
  purpose: string;
  collectionType: string;
  status: string;
  targetAmount: number | null;
  amountPerMember: number | null;
  collected?: number;
  totalCollected?: number;
  paidCount?: number;
  enrolledCount?: number;
  deadline?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionMember {
  id: string;
  displayName: string;
  expectedAmount: number;
  paidAmount: number;
  status: string;
}

export interface CollectionPayment {
  id: string;
  amount: number;
  payerName: string | null;
  createdAt: string;
}

export interface ListMembersParams {
  page?: number;
  pageSize?: number;
  status?: "paid" | "pending" | "partial";
}

export interface ListPaymentsParams {
  page?: number;
  pageSize?: number;
}

export type CreateCollectionResponse = ApiSuccess<CollectionRecord>;
export type ListCollectionsResponse = ApiSuccess<CollectionRecord[]>;
export type GetCollectionResponse = ApiSuccess<CollectionRecord>;
export type ListCollectionMembersResponse = ApiSuccess<{
  members: CollectionMember[];
  pagination: PaginationMeta;
}>;
export type ListCollectionPaymentsResponse = ApiSuccess<{
  payments: CollectionPayment[];
  pagination: PaginationMeta;
}>;
export type AddCollectionMemberResponse = ApiSuccess<CollectionMember>;
export type UpdateCollectionStatusResponse = ApiSuccess<CollectionRecord>;
export type UpdateCollectionResponse = ApiSuccess<CollectionRecord>;
export type DeleteCollectionResponse = ApiSuccess<null>;

export type CollectionPayMemberStatus = "available" | "claimed";

export interface CollectionPendingPayment {
  pendingPaymentId: string;
  amount: number;
  flashAccountNumber: string | null;
  flashBankName: string | null;
  flashAccountName: string | null;
  expiresAt: string | null;
}

export interface CollectionPayMember {
  id: string;
  displayName: string;
  expectedAmount: number;
  paidAmount: number;
  status: CollectionPayMemberStatus;
  pendingPayment: CollectionPendingPayment | null;
  lastFailedAmount: number | null;
}

export interface CollectionPayView {
  title: string;
  purpose: string;
  currency: string;
  collectionType: "fixed_per_person" | "open_contribution" | "named_members";
  amountPerMember: number | null;
  targetAmount: number | null;
  payTo: string;
  due: string | null;
  members: CollectionPayMember[];
}

export interface CollectionPayCheckoutResult {
  amount: number;
  payerName: string;
  flashAccountNumber: string;
  flashBankName: string;
  flashAccountName?: string;
  checkoutUrl: string;
}

export interface CollectionPayCheckoutPayload {
  memberId?: string;
  payerName?: string;
  amount?: number;
}

export type CollectionPayVerifyStatus =
  | "pending"
  | "completed"
  | "failed"
  | "expired"
  | "cancelled";

export interface CollectionPayVerifyResult {
  status: CollectionPayVerifyStatus;
  amount: number;
}

export type GetCollectionPayViewResponse = ApiSuccess<CollectionPayView>;
export type CollectionPayCheckoutResponse = ApiSuccess<CollectionPayCheckoutResult>;
export type CollectionPayVerifyResponse = ApiSuccess<CollectionPayVerifyResult>;

export const withdrawCollectionSchema = z.object({
  amount: z.number().int().positive("Amount must be greater than zero"),
  accountNumber: z.string().min(6, "Account number looks too short"),
  bankName: z.string().min(2, "Bank name is required"),
  narration: z.string().optional(),
});

export type WithdrawCollectionPayload = z.infer<typeof withdrawCollectionSchema>;

export type WithdrawCollectionStatus = "sent" | "pending" | "failed";

export interface WithdrawCollectionData {
  status: WithdrawCollectionStatus;
  transferRef: string;
  amount: number;
  accountName: string;
  accountNumber: string;
  bankName: string;
}

export type CollectionWithdrawableResponse = ApiSuccess<{ available: number }>;
export type WithdrawCollectionResponse = ApiSuccess<WithdrawCollectionData>;
