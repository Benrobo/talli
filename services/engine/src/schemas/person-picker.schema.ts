import { z } from "zod";

export const pickerItemInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  unitPrice: z.number().int().positive(),
  quantity: z.number().int().positive().optional(),
});

export const pickerCheckoutSchema = z.object({
  payerName: z.string().trim().min(1, "Name is required").max(80),
  selections: z
    .array(
      z.object({
        itemId: z.string().min(1),
        quantity: z.number().int().min(0).max(999),
      })
    )
    .min(1, "Pick at least one item")
    .refine((rows) => rows.some((r) => r.quantity > 0), "Pick at least one item with quantity"),
});

export type PickerCheckoutInput = z.infer<typeof pickerCheckoutSchema>;
export type PickerItemInput = z.infer<typeof pickerItemInputSchema>;
