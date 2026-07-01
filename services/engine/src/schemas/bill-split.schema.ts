import { z } from "zod";

export const billSplitCheckoutSchema = z.object({
  payerName: z.string().trim().min(1, "Name is required").max(80),
  itemIds: z.array(z.string().min(1)).min(1, "Pick at least one item to pay for"),
});

export type BillSplitCheckoutInput = z.infer<typeof billSplitCheckoutSchema>;
