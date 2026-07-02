import { z } from "zod";
import { defineTool } from "../define-tool.js";
import { receiptService } from "../../receipt/index.js";

export const getReceiptTool = defineTool({
  name: "getReceipt",
  label: "send you a receipt for a payment you made",
  description:
    "Send the requester a receipt image for a payment THEY made — a collection contribution, a top-up, " +
    "or money they sent. Use for 'send my receipt', 'can I get a receipt', 'proof of payment'. It looks up " +
    "the person's own latest completed payment; if they haven't paid anything, it returns found:false and " +
    "you should tell them there's no payment to receipt yet. The receipt image is attached automatically.",
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    const reference =
      (await receiptService.latestReferenceForPayer(ctx.senderPlatformId)) ??
      (ctx.scope === "private" ? await receiptService.latestReference(ctx.userId) : null);

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
      console.log({err})
      console.log(`🧾 [getReceipt] render failed for ${reference}: ${(err as Error).message}`);
      return { found: false, reason: "render_failed", reference };
    }
  },
});
