import type { Beneficiary } from "@prisma/client";
import prisma from "../prisma/index.js";

export interface SaveBeneficiaryInput {
  userId: string;
  alias: string;
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName?: string;
  createdByPlatformUserId?: string;
}

/**
 * The user's phone book of transfer recipients. Resolves a chat alias
 * ("Tolu") to a verified account so the parser never needs account numbers, and
 * records new recipients on first successful transfer.
 */
class BeneficiaryService {
  async findByAlias(userId: string, alias: string): Promise<Beneficiary | null> {
    return prisma.beneficiary.findFirst({
      where: { userId, alias: { equals: alias.trim(), mode: "insensitive" } },
    });
  }

  async listAliases(userId: string): Promise<string[]> {
    const rows = await prisma.beneficiary.findMany({
      where: { userId },
      select: { alias: true },
      orderBy: { lastUsedAt: "desc" },
      take: 20,
    });
    return rows.map((r) => r.alias);
  }

  async save(input: SaveBeneficiaryInput): Promise<Beneficiary> {
    return prisma.beneficiary.upsert({
      where: { userId_alias: { userId: input.userId, alias: input.alias } },
      create: {
        userId: input.userId,
        alias: input.alias,
        accountName: input.accountName,
        accountNumber: input.accountNumber,
        bankCode: input.bankCode,
        bankName: input.bankName,
        createdByPlatformUserId: input.createdByPlatformUserId,
      },
      update: {
        accountName: input.accountName,
        accountNumber: input.accountNumber,
        bankCode: input.bankCode,
        bankName: input.bankName,
        lastUsedAt: new Date(),
      },
    });
  }

  async touch(id: string): Promise<void> {
    await prisma.beneficiary.update({ where: { id }, data: { lastUsedAt: new Date() } });
  }
}

export const beneficiaryService = new BeneficiaryService();
export default beneficiaryService;
