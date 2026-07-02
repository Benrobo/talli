import type { Context } from "hono";
import type { CollectionMemberStatus } from "@prisma/client";
import sendResponse from "../lib/send-response.js";
import { BadRequestException } from "../lib/exception.js";
import { collectionService } from "../services/collection.service.js";
import { paymentService } from "../services/payment.service.js";
import type {
  CreateCollectionInput,
  AddMemberInput,
  UpdateCollectionStatusInput,
  UpdateCollectionInput,
  CollectionPayCheckoutInput,
  WithdrawCollectionInput,
} from "../schemas/collection.schema.js";
import type { AuthUser } from "../services/auth.service.js";

class CollectionController {
  async create(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const input = ctx.get("validatedData") as CreateCollectionInput;
    const collection = await collectionService.create(userId, input);
    return sendResponse.success(ctx, "Collection created", 201, collection);
  }

  async list(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const collections = await collectionService.list(userId);
    return sendResponse.success(ctx, "Collections fetched", 200, collections);
  }

  async get(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const id = ctx.req.param("id");
    if (!id) throw new BadRequestException("Collection id is required");
    const collection = await collectionService.getWithProgress(userId, id);
    return sendResponse.success(ctx, "Collection fetched", 200, collection);
  }

  async listMembers(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const page = Number(ctx.req.query("page") ?? "1");
    const pageSize = Number(ctx.req.query("pageSize") ?? "20");
    const status = ctx.req.query("status") as CollectionMemberStatus | undefined;

    const result = await collectionService.listMembers(userId, ctx.req.param("id") ?? "", {
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
      status,
    });

    return sendResponse.success(ctx, "Members fetched", 200, {
      members: result.members,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  }

  async listPayments(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const page = Number(ctx.req.query("page") ?? "1");
    const pageSize = Number(ctx.req.query("pageSize") ?? "20");

    const result = await collectionService.listPayments(userId, ctx.req.param("id") ?? "", {
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    });

    return sendResponse.success(ctx, "Payments fetched", 200, {
      payments: result.payments,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  }

  async addMember(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const id = ctx.req.param("id");
    if (!id) throw new BadRequestException("Collection id is required");
    const input = ctx.get("validatedData") as AddMemberInput;
    const member = await collectionService.addMember(userId, id, input);
    return sendResponse.success(ctx, "Member added", 201, member);
  }

  async updateStatus(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const id = ctx.req.param("id");
    if (!id) throw new BadRequestException("Collection id is required");
    const { status } = ctx.get("validatedData") as UpdateCollectionStatusInput;
    const collection = await collectionService.updateStatus(userId, id, status);
    return sendResponse.success(ctx, "Collection updated", 200, collection);
  }

  async update(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const collectionId = ctx.req.param("id");
    if (!collectionId) throw new BadRequestException("Collection id is required");
    const input = ctx.get("validatedData") as UpdateCollectionInput;
    const collection = await collectionService.update(userId, collectionId, input);
    return sendResponse.success(ctx, "Collection updated", 200, collection);
  }

  async remove(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const collectionId = ctx.req.param("id");
    if (!collectionId) throw new BadRequestException("Collection id is required");
    await collectionService.remove(userId, collectionId);
    return sendResponse.success(ctx, "Collection deleted", 200, null);
  }

  async getPayView(ctx: Context) {
    const reference = ctx.req.param("reference");
    if (!reference) throw new BadRequestException("Collection reference is required");
    const view = await collectionService.getPayView(reference);
    return sendResponse.success(ctx, "Collection pay view fetched", 200, view);
  }

  async checkoutPay(ctx: Context) {
    const reference = ctx.req.param("reference");
    if (!reference) throw new BadRequestException("Collection reference is required");
    const input = ctx.get("validatedData") as CollectionPayCheckoutInput;
    const result = await paymentService.checkoutCollectionPay(reference, input);
    return sendResponse.success(ctx, "Checkout created", 201, result);
  }

  async cancelPay(ctx: Context) {
    const reference = ctx.req.param("reference");
    if (!reference) throw new BadRequestException("Collection reference is required");
    const body = (await ctx.req.json().catch(() => ({}))) as { memberId?: string };
    if (!body.memberId) throw new BadRequestException("memberId is required");
    await collectionService.cancelMemberPending(reference, body.memberId);
    return sendResponse.success(ctx, "Pending payment cancelled", 200, { cancelled: true });
  }

  async verifyPay(ctx: Context) {
    const reference = ctx.req.param("reference");
    if (!reference) throw new BadRequestException("Collection reference is required");
    const body = (await ctx.req.json().catch(() => ({}))) as { pendingPaymentId?: string };
    if (!body.pendingPaymentId) throw new BadRequestException("pendingPaymentId is required");
    const result = await paymentService.reconcileOnce(body.pendingPaymentId, reference);
    return sendResponse.success(ctx, "Payment status fetched", 200, {
      status: result.status,
      amount: result.amount,
    });
  }

  /** How much of this collection is still available to withdraw. Owner-only. */
  async withdrawable(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const id = ctx.req.param("id");
    if (!id) throw new BadRequestException("Collection id is required");
    const available = await collectionService.availableToWithdraw(userId, id);
    return sendResponse.success(ctx, "Available balance fetched", 200, { available });
  }

  /** Withdraw collected funds to a bank account. Owner-only. */
  async withdraw(ctx: Context) {
    const user = ctx.get("user") as AuthUser;
    const id = ctx.req.param("id");
    if (!id) throw new BadRequestException("Collection id is required");
    const { amount, accountNumber, bankName, narration } = ctx.get("validatedData") as WithdrawCollectionInput;

    const result = await collectionService.withdraw(user.id, id, {
      amount,
      accountNumber,
      bankName,
      narration,
      senderName: user.name ?? user.email,
    });

    const message =
      result.status === "sent"
        ? "Withdrawal sent"
        : result.status === "pending"
          ? "Withdrawal is processing"
          : "Withdrawal failed, funds restored";
    return sendResponse.success(ctx, message, 200, result);
  }
}

export const collectionController = new CollectionController();
