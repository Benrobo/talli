import type { Context } from "hono";
import { BadRequestException } from "../lib/exception.js";
import { workspaceService } from "../services/workspace.service.js";
import { receiptService } from "../services/receipt/index.js";

class ReceiptController {
  async download(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const workspaceId = await workspaceService.getActiveWorkspaceId(userId);
    if (!workspaceId) throw new BadRequestException("No active workspace");

    const reference = (ctx.req.param("reference") ?? "").replace(/\.png$/i, "");
    const png = await receiptService.renderByReference(reference, workspaceId);

    ctx.header("Content-Type", "image/png");
    ctx.header("Content-Disposition", `inline; filename="talli-receipt-${reference}.png"`);
    ctx.header("Cache-Control", "private, max-age=86400");
    return ctx.body(png);
  }
}

export const receiptController = new ReceiptController();
