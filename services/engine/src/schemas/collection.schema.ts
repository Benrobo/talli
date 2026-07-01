import { z } from "zod";

export const createCollectionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  purpose: z.string().trim().max(280).default(""),
  collectionType: z.enum(["fixed_per_person", "open_contribution", "named_members"]),
  amountPerMember: z.number().int().positive().optional(),
  targetAmount: z.number().int().positive().optional(),
  deadline: z.coerce.date().optional(),
  linkedChatId: z.string().optional(),
});

export const addMemberSchema = z.object({
  displayName: z.string().trim().min(1, "Member name is required").max(80),
  expectedAmount: z.number().int().positive(),
  platformUserId: z.string().optional(),
});

export const updateCollectionStatusSchema = z.object({
  status: z.enum(["active", "closed", "cancelled"]),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateCollectionStatusInput = z.infer<typeof updateCollectionStatusSchema>;
