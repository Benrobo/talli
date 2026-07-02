import prisma from "../../../prisma/index.js";
import logger from "../../../lib/logger.js";
import { collectionService } from "../../../services/collection.service.js";
import { paymentService } from "../../../services/payment.service.js";
import { botCommandService } from "../../../services/bot-command.service.js";
import { messages } from "../ui/messages.js";
import { payButton } from "../ui/keyboards.js";
import type { TalliContext } from "../types.js";
import { safeReply, resolveDispatchContext } from "./shared.js";

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
 * A "Contribute" tap on an OPEN pot. There's no fixed amount, so we ask the
 * tapper how much with a force_reply and record a pending command keyed to the
 * collection. Their reply is matched back (by the question's message id) and
 * routed through the dispatcher, which creates the checkout for that amount.
 */
export async function handleContribute(ctx: TalliContext, collectionId: string): Promise<void> {
  await ctx.answerCallbackQuery().catch(() => {});

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { title: true, status: true },
  });
  if (!collection || !["active", "partially_paid"].includes(collection.status)) {
    await safeReply(ctx, messages.noPayableCollections);
    return;
  }

  const dispatchCtx = await resolveDispatchContext(ctx);
  if (!dispatchCtx) return;

  if (dispatchCtx.scope === "group") {
    await collectionService.bindToChat(collectionId, dispatchCtx.linkedChatId);
  }

  const question = messages.contributeAsk(collection.title);
  let messageId: number | null = null;
  try {
    const sent = await ctx.reply(question, {
      parse_mode: "Markdown",
      reply_markup: { force_reply: true },
    });
    messageId = sent.message_id;
  } catch (err) {
    logger.error(`[telegram] contribute force_reply failed: ${(err as Error).message}`);
    await safeReply(ctx, question);
    return;
  }

  await botCommandService.recordClarification(
    dispatchCtx,
    `contribute to ${collection.title}`,
    { intent: "pay_collection", status: "needs_clarification", target: collectionId, clarification: question },
    messageId,
    question
  );
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

    const dispatchCtx = await resolveDispatchContext(ctx);
    if (dispatchCtx?.scope === "group") {
      await collectionService.bindToChat(collectionId, dispatchCtx.linkedChatId);
    }

    const { flashAccountNumber, flashBankName } = await paymentService.createCollectionCheckout({
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
