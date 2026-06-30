import type { Context } from "hono";
import sendResponse from "../lib/send-response.js";
import { BadRequestException } from "../lib/exception.js";
import { personPickerService } from "../services/person-picker.service.js";
import { workspaceService } from "../services/workspace.service.js";
import type { PickerCheckoutInput } from "../schemas/person-picker.schema.js";

class PersonPickerController {
  private async workspaceId(ctx: Context): Promise<string> {
    const userId = ctx.get("userId") as string;
    const workspaceId = await workspaceService.getActiveWorkspaceId(userId);
    if (!workspaceId) throw new BadRequestException("No active workspace");
    return workspaceId;
  }

  async getByToken(ctx: Context) {
    const token = ctx.req.param("token");
    const picker = await personPickerService.getByToken(token);
    return sendResponse.success(ctx, "Picker fetched", 200, picker);
  }

  async checkout(ctx: Context) {
    const token = ctx.req.param("token");
    const input = ctx.get("validatedData") as PickerCheckoutInput;
    const result = await personPickerService.checkout(token, input);
    return sendResponse.success(ctx, "Checkout created", 201, result);
  }

  async list(ctx: Context) {
    const workspaceId = await this.workspaceId(ctx);
    const pickers = await personPickerService.list(workspaceId);
    return sendResponse.success(ctx, "Pickers fetched", 200, { pickers });
  }

  async progress(ctx: Context) {
    const workspaceId = await this.workspaceId(ctx);
    const progress = await personPickerService.getProgress(workspaceId, ctx.req.param("id"));
    return sendResponse.success(ctx, "Picker progress fetched", 200, progress);
  }
}

export const personPickerController = new PersonPickerController();
