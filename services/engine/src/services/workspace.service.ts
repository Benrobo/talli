import prisma from "../prisma/index.js";
import { slugify, randomToken } from "../lib/utils.js";
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "../lib/exception.js";

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  currency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceWithMeta extends WorkspaceRecord {
  isActive: boolean;
  isOwner: boolean;
  role: string;
}

class WorkspaceService {
  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || "workspace";
    let candidate = base;
    for (let attempt = 0; attempt < 12; attempt++) {
      const existing = await prisma.workspace.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
      candidate = `${base}-${randomToken(3).slice(0, 6)}`;
    }
    throw new ConflictException("Could not generate a unique workspace slug");
  }

  async createWorkspace(userId: string, name: string): Promise<WorkspaceWithMeta> {
    const slug = await this.uniqueSlug(name);

    const workspace = await prisma.$transaction(async (tx) => {
      const created = await tx.workspace.create({
        data: {
          ownerUserId: userId,
          name,
          slug,
          members: {
            create: {
              userId,
              role: "owner",
            },
          },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { activeWorkspaceId: created.id },
      });

      return created;
    });

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      currency: workspace.currency,
      status: workspace.status,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      isActive: true,
      isOwner: true,
      role: "owner",
    };
  }

  async ensureDefaultWorkspace(userId: string): Promise<void> {
    const count = await prisma.workspaceMember.count({ where: { userId } });
    if (count > 0) return;
    await this.createWorkspace(userId, "My workspace");
  }

  async getUserWorkspaces(userId: string): Promise<WorkspaceWithMeta[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeWorkspaceId: true },
    });

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });

    const memberIds = memberships.map((membership) => membership.workspaceId);
    let activeId = user?.activeWorkspaceId ?? null;
    if (!activeId || !memberIds.includes(activeId)) {
      activeId = memberships[0]?.workspaceId ?? null;
      if (activeId && user?.activeWorkspaceId !== activeId) {
        await prisma.user.update({
          where: { id: userId },
          data: { activeWorkspaceId: activeId },
        });
      }
    }

    return memberships.map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      currency: membership.workspace.currency,
      status: membership.workspace.status,
      createdAt: membership.workspace.createdAt,
      updatedAt: membership.workspace.updatedAt,
      isActive: membership.workspace.id === activeId,
      isOwner: membership.role === "owner",
      role: membership.role,
    }));
  }

  async getActiveWorkspaceId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeWorkspaceId: true },
    });
    return user?.activeWorkspaceId ?? null;
  }

  async verifyWorkspaceAccess(workspaceId: string, userId: string): Promise<boolean> {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });
    return Boolean(member);
  }

  async setActiveWorkspace(userId: string, workspaceId: string): Promise<void> {
    const hasAccess = await this.verifyWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException("You don't have access to this workspace");
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, status: true },
    });
    if (!workspace) throw new NotFoundException("Workspace not found");
    if (workspace.status !== "active") {
      throw new ForbiddenException("This workspace is not active");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { activeWorkspaceId: workspaceId },
    });
  }
}

export const workspaceService = new WorkspaceService();
