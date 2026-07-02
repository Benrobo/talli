import { z } from "zod";
import type { ApiSuccess, Workspace } from "@app/shared";

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required").max(80),
});

export type CreateWorkspacePayload = z.infer<typeof createWorkspaceSchema>;

export type ListWorkspacesResponse = ApiSuccess<Workspace[]>;
export type CreateWorkspaceResponse = ApiSuccess<Workspace>;
export type SwitchWorkspaceResponse = ApiSuccess<null>;
