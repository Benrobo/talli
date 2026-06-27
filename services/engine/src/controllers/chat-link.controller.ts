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

  async listConnectedChats(ctx: Context) {
    const userId = ctx.get("userId") as string;

    const workspaceId = await workspaceService.getActiveWorkspaceId(userId);
    if (!workspaceId) {
      throw new BadRequestException("No active workspace");
    }

    const chats = await chatLinkService.listConnectedChats(workspaceId);
    return sendResponse.success(ctx, "Connected chats fetched", 200, chats);
  }

  async disconnectChat(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const linkedChatId = ctx.req.param("id");

    const workspaceId = await workspaceService.getActiveWorkspaceId(userId);
    if (!workspaceId) {
      throw new BadRequestException("No active workspace");
    }

    await chatLinkService.disconnectById(workspaceId, linkedChatId);
    return sendResponse.success(ctx, "Chat disconnected", 200, null);
  }
}

export const chatLinkController = new ChatLinkController();
