import type { Context } from "hono";
import type { CollectionMemberStatus } from "@prisma/client";
import sendResponse from "../lib/send-response.js";
import { BadRequestException } from "../lib/exception.js";
import { collectionService } from "../services/collection.service.js";
import { paymentService } from "../services/payment.service.js";
import { workspaceService } from "../services/workspace.service.js";
import type {
  CreateCollectionInput,
  AddMemberInput,
  UpdateCollectionStatusInput,
  UpdateCollectionInput,
  CollectionPayCheckoutInput,
} from "../schemas/collection.schema.js";

class CollectionController {
  private async workspaceId(ctx: Context): Promise<string> {
    const userId = ctx.get("userId") as string;
    const workspaceId = await workspaceService.getActiveWorkspaceId(userId);
    if (!workspaceId) throw new BadRequestException("No active workspace");
    return workspaceId;
  }

  async create(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const workspaceId = await this.workspaceId(ctx);
    const input = ctx.get("validatedData") as CreateCollectionInput;
    const collection = await collectionService.create(workspaceId, userId, input);
    return sendResponse.success(ctx, "Collection created", 201, collection);
  }

  async list(ctx: Context) {
    const workspaceId = await this.workspaceId(ctx);
    const collections = await collectionService.list(workspaceId);
    return sendResponse.success(ctx, "Collections fetched", 200, collections);
  }

  async get(ctx: Context) {
    const workspaceId = await this.workspaceId(ctx);
    const collection = await collectionService.getWithProgress(workspaceId, ctx.req.param("id"));
    return sendResponse.success(ctx, "Collection fetched", 200, collection);
  }

  async listMembers(ctx: Context) {
    const workspaceId = await this.workspaceId(ctx);
    const page = Number(ctx.req.query("page") ?? "1");
    const pageSize = Number(ctx.req.query("pageSize") ?? "20");
    const status = ctx.req.query("status") as CollectionMemberStatus | undefined;

    const result = await collectionService.listMembers(workspaceId, ctx.req.param("id") ?? "", {
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
    const workspaceId = await this.workspaceId(ctx);
    const page = Number(ctx.req.query("page") ?? "1");
    const pageSize = Number(ctx.req.query("pageSize") ?? "20");

    const result = await collectionService.listPayments(workspaceId, ctx.req.param("id") ?? "", {
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
    const workspaceId = await this.workspaceId(ctx);
    const input = ctx.get("validatedData") as AddMemberInput;
    const member = await collectionService.addMember(workspaceId, ctx.req.param("id"), input);
    return sendResponse.success(ctx, "Member added", 201, member);
  }

  async updateStatus(ctx: Context) {
    const workspaceId = await this.workspaceId(ctx);
    const { status } = ctx.get("validatedData") as UpdateCollectionStatusInput;
    const collection = await collectionService.updateStatus(workspaceId, ctx.req.param("id"), status);
    return sendResponse.success(ctx, "Collection updated", 200, collection);
  }

  async update(ctx: Context) {
    const workspaceId = await this.workspaceId(ctx);
    const collectionId = ctx.req.param("id");
    if (!collectionId) throw new BadRequestException("Collection id is required");
    const input = ctx.get("validatedData") as UpdateCollectionInput;
    const collection = await collectionService.update(workspaceId, collectionId, input);
    return sendResponse.success(ctx, "Collection updated", 200, collection);
  }

  async remove(ctx: Context) {
    const workspaceId = await this.workspaceId(ctx);
    const collectionId = ctx.req.param("id");
    if (!collectionId) throw new BadRequestException("Collection id is required");
    await collectionService.remove(workspaceId, collectionId);
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
}

export const collectionController = new CollectionController();
