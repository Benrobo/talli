import type { Context } from "hono";
import sendResponse from "../lib/send-response.js";
import { BadRequestException } from "../lib/exception.js";
import { chatLinkService } from "../services/chat-link.service.js";
import { workspaceService } from "../services/workspace.service.js";
import type { CreateLinkCodeInput } from "../schemas/chat-link.schema.js";

class ChatLinkController {
  async createCode(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const { platform, purpose } = ctx.get("validatedData") as CreateLinkCodeInput;

    const workspaceId = await workspaceService.getActiveWorkspaceId(userId);
    if (!workspaceId) {
      throw new BadRequestException("No active workspace");
    }

    const issued = await chatLinkService.issueCode(workspaceId, userId, platform, purpose);
    return sendResponse.success(ctx, "Link code created", 201, issued);
  }
}

export const chatLinkController = new ChatLinkController();
