import type { Context } from "hono";
import sendResponse from "../lib/send-response.js";
import { BadRequestException } from "../lib/exception.js";
import { billSplitService } from "../services/bill-split.service.js";
import { billParserService } from "../services/bill-parser.service.js";
import type { BillSplitCheckoutInput } from "../schemas/bill-split.schema.js";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

class BillSplitController {
  async createFromImage(ctx: Context) {
    const userId = ctx.get("userId") as string;

    const body = await ctx.req.parseBody();
    const file = body.image;
    if (!(file instanceof File)) throw new BadRequestException("Attach a photo of the bill");
    if (file.size > MAX_IMAGE_BYTES) throw new BadRequestException("That image is too large (max 8MB)");
    if (!file.type.startsWith("image/")) throw new BadRequestException("Upload an image of the bill");

    const buffer = Buffer.from(await file.arrayBuffer());
    const bill = await billParserService.parse(buffer);
    
    if (!bill.confident || bill.items.length === 0) {
      throw new BadRequestException(bill.reason ?? "I couldn't read the items on that bill. Try a clearer photo.");
    }

    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Bill split";
    const { url, billSplit } = await billSplitService.createFromItems({
      ownerUserId: userId,
      source: "web",
      title,
      items: bill.items.map((item) => ({ name: item.name, unitPrice: item.unitPrice })),
      total: bill.total,
    });

    return sendResponse.success(ctx, "Bill split created", 201, { url, token: billSplit.token });
  }

  async getByToken(ctx: Context) {
    const token = ctx.req.param("token");
    if (!token) throw new BadRequestException("Bill split token is required");
    const billSplit = await billSplitService.getByToken(token);
    return sendResponse.success(ctx, "Bill split fetched", 200, billSplit);
  }

  async checkout(ctx: Context) {
    const token = ctx.req.param("token");
    if (!token) throw new BadRequestException("Bill split token is required");
    const input = ctx.get("validatedData") as BillSplitCheckoutInput;
    const result = await billSplitService.checkout(token, input);
    return sendResponse.success(ctx, "Checkout created", 201, result);
  }

  async list(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const billSplits = await billSplitService.list(userId);
    return sendResponse.success(ctx, "Bill splits fetched", 200, { billSplits });
  }

  async detail(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const billSplitId = ctx.req.param("id");
    if (!billSplitId) throw new BadRequestException("Bill split id is required");
    const billSplit = await billSplitService.getDetail(userId, billSplitId);
    return sendResponse.success(ctx, "Bill split fetched", 200, billSplit);
  }
}

export const billSplitController = new BillSplitController();
