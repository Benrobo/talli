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
  status: z.enum(["active", "closed", "cancelled"]),
});

export type CreateCollectionPayload = z.infer<typeof createCollectionSchema>;
export type AddCollectionMemberPayload = z.infer<typeof addCollectionMemberSchema>;
export type UpdateCollectionStatusPayload = z.infer<typeof updateCollectionStatusSchema>;

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
