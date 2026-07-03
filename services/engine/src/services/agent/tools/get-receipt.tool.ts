import { z } from "zod";
import { defineTool } from "../define-tool.js";
import { receiptService } from "../../receipt/index.js";

export const getReceiptTool = defineTool({
  name: "getReceipt",
  label: "send you a receipt for a payment you made",
  description:
    "Send the requester a receipt image for a specific payment THEY made — a transfer, collection contribution, " +
    "or top-up. Pass `reference` (from listReceipts) to send that exact one — do this whenever the request isn't " +
    "clearly 'the latest', so you send the RIGHT receipt, not a guess. Omit `reference` only when they plainly " +
    "mean their most recent payment. If they have nothing, it returns found:false — tell them there's no payment " +
    "to receipt yet. The image is attached automatically.",
  parameters: z.object({
    reference: z
      .string()
      .optional()
      .describe("The exact payment reference to receipt, from listReceipts. Omit to send the latest payment."),
  }),
  execute: async ({ reference: requested }, ctx) => {
    let reference: string | null = null;

    if (requested) {
      const owned = await receiptService.ownsReference(ctx.userId, ctx.senderPlatformId, requested);
      if (!owned) {
        console.log(`🧾 [getReceipt] reference ${requested} not owned by user=${ctx.userId}`);
        return { found: false, reason: "not_yours" };
      }
      reference = requested;
    } else {
      reference =
        (await receiptService.latestReferenceForPayer(ctx.senderPlatformId)) ??
        (ctx.scope === "private" ? await receiptService.latestReference(ctx.userId) : null);
    }

    console.log(
      `🧾 [getReceipt] sender=${ctx.senderPlatformId} user=${ctx.userId} reference=${reference ?? "none"}`
    );

    if (!reference) {
      return { found: false, reason: "no_payment" };
    }

    try {
      const image = await receiptService.renderByReference(reference);
      ctx.emit.photo(image, "🧾 Here's your receipt.");
      return { found: true, reference };
    } catch (err) {
      console.log(`🧾 [getReceipt] render failed for ${reference}: ${(err as Error).message}`);
      return { found: false, reason: "render_failed", reference };
    }
  },
});
