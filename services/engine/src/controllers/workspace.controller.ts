import type { Context } from "hono";
import sendResponse from "../lib/send-response.js";
import { workspaceService } from "../services/workspace.service.js";
import type { CreateWorkspaceInput } from "../schemas/workspace.schema.js";

class WorkspaceController {
  async list(ctx: Context) {
    const userId = ctx.get("userId") as string;
    await workspaceService.ensureDefaultWorkspace(userId);
    const workspaces = await workspaceService.getUserWorkspaces(userId);
    return sendResponse.success(ctx, "Workspaces fetched", 200, workspaces);
  }

  async create(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const { name } = ctx.get("validatedData") as CreateWorkspaceInput;
    const workspace = await workspaceService.createWorkspace(userId, name);
    return sendResponse.success(ctx, "Workspace created", 201, workspace);
  }

  async switch(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const workspaceId = ctx.req.param("workspaceId");
    await workspaceService.setActiveWorkspace(userId, workspaceId);
    return sendResponse.success(ctx, "Active workspace updated", 200, null);
  }
}

export const workspaceController = new WorkspaceController();
