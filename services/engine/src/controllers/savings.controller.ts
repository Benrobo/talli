import type { Context } from "hono";
import sendResponse from "../lib/send-response.js";
import { BadRequestException } from "../lib/exception.js";
import { savingsService } from "../services/savings.service.js";
import { workspaceService } from "../services/workspace.service.js";
import type { CreateSavingsJarInput } from "../schemas/savings.schema.js";

class SavingsController {
  private async workspaceId(ctx: Context): Promise<string> {
    const userId = ctx.get("userId") as string;
    const workspaceId = await workspaceService.getActiveWorkspaceId(userId);
    if (!workspaceId) throw new BadRequestException("No active workspace");
    return workspaceId;
  }

  async list(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const workspaceId = await this.workspaceId(ctx);
    const jars = await savingsService.list(workspaceId, userId);
    return sendResponse.success(ctx, "Savings jars fetched", 200, jars);
  }

  async get(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const workspaceId = await this.workspaceId(ctx);
    const jar = await savingsService.get(workspaceId, ctx.req.param("id"), userId);
    return sendResponse.success(ctx, "Savings jar fetched", 200, jar);
  }

  async create(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const workspaceId = await this.workspaceId(ctx);
    const input = ctx.get("validatedData") as CreateSavingsJarInput;
    const jar = await savingsService.createJar(workspaceId, userId, input);
    return sendResponse.success(ctx, "Savings jar created", 201, jar);
  }
}

export const savingsController = new SavingsController();
