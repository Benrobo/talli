import prisma from "../../../prisma/index.js";
import logger from "../../../lib/logger.js";
import { collectionService } from "../../../services/collection.service.js";
import { pendingPaymentService } from "../../../services/pending-payment.service.js";
import { messages } from "../ui/messages.js";
import { payButton } from "../ui/keyboards.js";
import type { TalliContext } from "../types.js";
import { safeReply } from "./shared.js";

export async function handleSelectCollection(ctx: TalliContext, collectionId: string): Promise<void> {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { title: true, amountPerMember: true, status: true },
  });
  if (!collection || !["active", "partially_paid"].includes(collection.status)) {
    await safeReply(ctx, messages.noPayableCollections);
    return;
  }
  const amount = collection.amountPerMember ?? 0;
  await safeReply(ctx, messages.collectionCard(collection.title, amount), payButton(collectionId, amount));
}

/**
 * A "Pay" button tap. The tap is the trusted identity, so we upsert the member
 * from `ctx.from`, issue a flash account number for them to transfer to, and
 * show it. The polling cron credits the member once the transfer lands.
 */
export async function handlePay(ctx: TalliContext, collectionId: string): Promise<void> {
  try {
    const member = await collectionService.upsertMember({
      collectionId,
      platform: "telegram",
      platformUserId: String(ctx.from!.id),
      firstName: ctx.from?.first_name,
      username: ctx.from?.username,
    });
    if (member.expectedAmount <= 0) {
      await ctx.answerCallbackQuery({ text: "No amount set for this collection yet." }).catch(() => {});
      return;
    }

    const { flashAccountNumber, flashBankName } = await pendingPaymentService.create({
      purpose: "collection",
      amount: member.expectedAmount,
      collectionId,
      collectionMemberId: member.id,
      payerPlatformUserId: String(ctx.from!.id),
    });

    await ctx.answerCallbackQuery().catch(() => {});
    const payerName = ctx.from?.first_name || member.displayName || "member";
    await safeReply(
      ctx,
      messages.flashAccount(member.expectedAmount, flashAccountNumber, flashBankName, {
        id: String(ctx.from!.id),
        name: payerName,
      })
    );
  } catch (err) {
    logger.error(`[telegram] pay tap failed for collection ${collectionId}: ${(err as Error).message}`);
    await ctx.answerCallbackQuery({ text: "Couldn't start the payment. Please try again." }).catch(() => {});
    await safeReply(ctx, messages.payFailed);
  }
}
