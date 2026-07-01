import type { Context } from "hono";
import prisma from "../prisma/index.js";
import sendResponse from "../lib/send-response.js";
import { NotFoundException } from "../lib/exception.js";

class UserController {
  async list(ctx: Context) {
    const users = await prisma.user.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    return sendResponse.success(ctx, null, 200, { users });
  }

  async byId(ctx: Context) {
    const id = ctx.req.param("id");
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return sendResponse.success(ctx, null, 200, { user });
  }
}

export const userController = new UserController();
