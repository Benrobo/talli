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
  status: z.enum(["draft", "active", "closed", "cancelled"]),
});

export const updateCollectionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  purpose: z.string().trim().max(280).default(""),
  amountPerMember: z.number().int().positive().optional(),
  targetAmount: z.number().int().positive().optional(),
  deadline: z.union([z.coerce.date(), z.null()]).optional(),
});

export const collectionPayCheckoutSchema = z
  .object({
    memberId: z.string().trim().min(1).optional(),
    payerName: z.string().trim().min(1).max(80).optional(),
    amount: z.number().int().positive().optional(),
  })
  .refine((data) => data.memberId || data.payerName, {
    message: "Select or enter your name",
  });

export const withdrawCollectionSchema = z.object({
  amount: z.number().int().positive("Amount must be greater than zero"),
  accountNumber: z.string().trim().min(6).max(20),
  bankName: z.string().trim().min(2).max(80),
  narration: z.string().trim().max(120).optional(),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateCollectionStatusInput = z.infer<typeof updateCollectionStatusSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type CollectionPayCheckoutInput = z.infer<typeof collectionPayCheckoutSchema>;
export type WithdrawCollectionInput = z.infer<typeof withdrawCollectionSchema>;
