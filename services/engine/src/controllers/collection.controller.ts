import type { Context } from "hono";
import sendResponse from "../lib/send-response.js";
import { BadRequestException } from "../lib/exception.js";
import { collectionService } from "../services/collection.service.js";
import { workspaceService } from "../services/workspace.service.js";
import type {
  CreateCollectionInput,
  AddMemberInput,
  UpdateCollectionStatusInput,
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
}

export const collectionController = new CollectionController();
