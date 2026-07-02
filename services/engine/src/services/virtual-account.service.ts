import type { VirtualAccount } from "@prisma/client";
import prisma from "../prisma/index.js";
import { nomba } from "../integrations/nomba/index.js";
import logger from "../lib/logger.js";
import { NotFoundException } from "../lib/exception.js";

class VirtualAccountService {
  async getByUser(userId: string): Promise<VirtualAccount | null> {
    return prisma.virtualAccount.findUnique({ where: { userId } });
  }

  async requireByUser(userId: string): Promise<VirtualAccount> {
    const existing = await this.getByUser(userId);
    if (existing) return existing;
    const provisioned = await this.ensureForUser(userId);
    if (!provisioned) throw new NotFoundException("Virtual account not available yet");
    return provisioned;
  }

  async ensureForUser(userId: string): Promise<VirtualAccount | null> {
    const existing = await this.getByUser(userId);
    if (existing) return existing;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const accountRef = `talli_va_${userId}`;
    const accountName = user.name?.trim() || user.email;

    try {
      const account = await nomba.virtualAccounts.create({ accountRef, accountName });

      console.log(`✅ Virtual account created: ${JSON.stringify(account, null, 2)}`);

      return prisma.virtualAccount.upsert({
        where: { userId },
        create: {
          userId,
          accountRef,
          accountNumber: account.bankAccountNumber,
          bankName: account.bankName,
          accountName: account.bankAccountName,
        },
        update: {
          accountNumber: account.bankAccountNumber,
          bankName: account.bankName,
          accountName: account.bankAccountName,
        },
      });
    } catch (err) {
      logger.warn(`[virtual-account] provision failed for ${userId}: ${(err as Error).message}`);
      return null;
    }
  }
}

export const virtualAccountService = new VirtualAccountService();
export default virtualAccountService;
