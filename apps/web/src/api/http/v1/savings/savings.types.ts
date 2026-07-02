import { z } from "zod";
import type { ApiSuccess } from "@app/shared";

export const createSavingsJarSchema = z.object({
  name: z.string().trim().min(1, "Jar name is required").max(80),
  targetAmount: z.number().int().positive().optional(),
  lockUntil: z.coerce.date().optional(),
});

export type CreateSavingsJarPayload = z.infer<typeof createSavingsJarSchema>;

export interface SavingsJarRecord {
  id: string;
  workspaceId: string;
  ownerUserId: string;
  name: string;
  targetAmount: number | null;
  currentAmount: number;
  currency: string;
  lockUntil: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type ListSavingsJarsResponse = ApiSuccess<SavingsJarRecord[]>;
export type GetSavingsJarResponse = ApiSuccess<SavingsJarRecord>;
export type CreateSavingsJarResponse = ApiSuccess<SavingsJarRecord>;
