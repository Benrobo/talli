import { z } from "zod";
import { defineTool } from "../define-tool.js";
import { receiptService } from "../../receipt/index.js";

export const listReceiptsTool = defineTool({
  name: "listReceipts",
  label: "list your recent payments so you can pick a receipt",
  description:
    "List the user's recent payments — each with a reference, amount, what it was, and when. Use this to FIND " +
    "the right receipt before sending one: when someone asks for a receipt but not clearly the latest ('the " +
    "one I sent Samuel', 'my ₦5k transfer', 'yesterday's payment'), call this first, match the payment they " +
    "mean, then call getReceipt with that reference. Don't guess or default to the latest. Read-only.",
  parameters: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("How many recent payments to list (default 8, max 20)."),
  }),
  execute: async ({ limit }, ctx) => {
    const items = await receiptService.recentList(ctx.userId, limit ?? 8);
    return {
      count: items.length,
      receipts: items.map((r) => ({
        reference: r.reference,
        amount: r.amount,
        what: r.label,
        date: r.date.toISOString(),
      })),
    };
  },
});
