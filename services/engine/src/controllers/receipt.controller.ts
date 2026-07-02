import type { Context } from "hono";
import { receiptService } from "../services/receipt/index.js";

class ReceiptController {
  async download(ctx: Context) {
    const userId = ctx.get("userId") as string;

    const reference = (ctx.req.param("reference") ?? "").replace(/\.png$/i, "");
    const png = await receiptService.renderByReference(reference, userId);

    ctx.header("Content-Type", "image/png");
    ctx.header("Content-Disposition", `inline; filename="talli-receipt-${reference}.png"`);
    ctx.header("Cache-Control", "private, max-age=86400");
    return ctx.body(new Uint8Array(png));
  }
}

export const receiptController = new ReceiptController();
