import dayjs from "dayjs";
import prisma from "../prisma/index.js";
import { messages } from "../integrations/telegram/ui/messages.js";
import { confirmCancel, payButton, selectCollectionKeyboard, openBillLink } from "../integrations/telegram/ui/keyboards.js";
import type { InlineKeyboard } from "grammy";
import { commandParserService } from "./command-parser.service.js";
import { isAdminOnlyInGroup, type ChatScope } from "../constants/chat-capabilities.js";
import { botCommandService, type CommandContext } from "./bot-command.service.js";
import { collectionService } from "./collection.service.js";
import { billSplitService } from "./bill-split.service.js";
import { savingsService } from "./savings.service.js";
import { balanceService } from "./balance.service.js";
import { ledgerService } from "./ledger.service.js";
import { transferService } from "./transfer.service.js";
import { beneficiaryService } from "./beneficiary.service.js";
import type { Intent } from "../schemas/intent.schema.js";
import type { ParsedBill } from "./bill-parser.service.js";
import logger from "../lib/logger.js";


export interface DispatchResult {
  text: string;
  keyboard?: InlineKeyboard;
  checkoutUrl?: string;
  /** When set, the bot should ask this as a clarification (force_reply in groups). */
  clarify?: { commandId: string };
}

const MAX_CLARIFY_ROUNDS = 3;

export interface DispatchContext extends CommandContext {
  scope: ChatScope;
  senderName: string;
  isGroupAdmin: boolean;
}

/**
 * Turns a chat message into a bot action: parse → gate by chat type → either
 * ask for missing info or show a parse-and-confirm card. On a Confirm tap it
 * executes the stored intent against the deterministic services. Returns a
 * neutral DispatchResult the bot handler renders, so no grammY logic lives here.
 */
class IntentDispatcherService {
  /** Builds the parse context shared by first-pass and clarification re-parses. */
  private async parseContext(ctx: DispatchContext) {
    const [jars, beneficiaries, recentHistory] = await Promise.all([
      savingsService.list(ctx.userId),
      beneficiaryService.listAliases(ctx.userId),
      botCommandService.recentHistory(ctx.linkedChatId, ctx.senderPlatformId),
    ]);
    return {
      scope: ctx.scope,
      knownJars: jars.map((j) => j.name),
      knownBeneficiaries: beneficiaries,
      recentHistory,
    };
  }

  async handleMessage(text: string, ctx: DispatchContext): Promise<DispatchResult> {
    const intent = await commandParserService.parse(text, await this.parseContext(ctx));

    if (intent.intent === "unknown") {
      const reply = intent.reply ?? intent.clarification ?? messages.unrecognized;
      await botCommandService.recordConversational(ctx, text, intent, reply);
      return { text: reply };
    }
    if (!commandParserService.isAllowed(ctx.scope, intent.intent)) {
      await botCommandService.recordConversational(ctx, text, intent, messages.dmOnly);
      return { text: messages.dmOnly };
    }
    if (ctx.scope === "group" && isAdminOnlyInGroup(intent.intent) && !ctx.isGroupAdmin) {
      await botCommandService.recordConversational(ctx, text, intent, messages.adminOnlyCreate);
      return { text: messages.adminOnlyCreate };
    }
    if (intent.intent === "status_query") {
      const result = await this.runStatusQuery(ctx);
      await botCommandService.recordConversational(ctx, text, intent, result.text);
      return result;
    }
    if (intent.intent === "help_query") {
      const reply = messages.help(ctx.scope === "group" ? "group" : "private");
      await botCommandService.recordConversational(ctx, text, intent, reply);
      return { text: reply };
    }
    if (intent.intent === "pay_collection") {
      const result = await this.runPayCollection(ctx);
      await botCommandService.recordConversational(ctx, text, intent, result.text);
      return result;
    }
    const prepared = await this.prepareIntent(intent, ctx);
    if (intent.status === "needs_clarification" || prepared.clarify) {
      const question = prepared.clarify ?? intent.clarification ?? messages.unrecognized;
      const command = await botCommandService.recordClarification(ctx, text, intent, null, question);
      return { text: question, clarify: { commandId: command.id } };
    }

    const command = await botCommandService.record(ctx, text, prepared.intent);
    const result = this.planConfirm(prepared.intent, command.id);
    await botCommandService.setReplyText(command.id, result.text);
    return result;
  }

  async handleBillPhoto(bill: ParsedBill, caption: string, ctx: DispatchContext): Promise<DispatchResult> {
    const instruction = caption.trim() || "split this bill";

    if (!bill.confident || bill.items.length === 0) {
      const reply = bill.reason ? messages.billRejected(bill.reason) : messages.billUnreadable;
      return { text: reply };
    }

    if (!commandParserService.isAllowed(ctx.scope, "bill_split")) {
      return { text: messages.dmOnly };
    }
    if (ctx.scope === "group" && isAdminOnlyInGroup("bill_split") && !ctx.isGroupAdmin) {
      return { text: messages.adminOnlyCreate };
    }

    const parsed = await commandParserService.parse(instruction, await this.parseContext(ctx));
    const intent: Intent = {
      intent: "bill_split",
      status: "ready",
      title: parsed.title?.trim() || "Bill split",
      payerNames: parsed.payerNames,
      items: bill.items.map((item) => ({ name: item.name, unitPrice: item.unitPrice })),
    };

    const command = await botCommandService.record(ctx, instruction, intent);
    const result = this.planConfirm(intent, command.id);
    await botCommandService.setReplyText(command.id, result.text);
    return result;
  }

  /**
   * Verifies and enriches a "ready" intent before it reaches a confirm card.
   * Trust the parser, but verify the money path: for send_money, resolve the
   * destination (saved beneficiary, or account number + bank looked up against
   * Nomba) so the card shows the REAL account-holder name. Returns either a
   * clarification to ask, or the intent with resolved details attached.
   */
  private async prepareIntent(
    intent: Intent,
    ctx: DispatchContext
  ): Promise<{ clarify?: string; intent: Intent }> {
    switch (intent.intent) {
      case "send_money":
        return this.prepareSend(intent, ctx);
      case "create_jar":
        if (!intent.title) return { clarify: messages.needsJarName, intent };
        if (!intent.amount) return { clarify: messages.needsJarTarget(intent.title), intent };
        return { intent };
      case "save_to_jar": {
        if (!intent.title) return { clarify: messages.needsJarName, intent };
        if (!intent.amount) return { clarify: messages.needsSaveAmount(intent.title), intent };
        const jar = await savingsService.findByName(ctx.userId, intent.title);
        if (!jar) return { clarify: messages.jarNotFound(intent.title), intent };
        return { intent };
      }
      case "bill_split":
        return this.prepareBillSplit(intent);
      default:
        return { intent };
    }
  }

  private prepareBillSplit(intent: Intent): { clarify?: string; intent: Intent } {
    const items = intent.items ?? [];
    if (items.length === 0) {
      return { clarify: messages.billSplitNeedsPhoto, intent };
    }
    const resolved: Intent = {
      ...intent,
      title: intent.title?.trim() || "Bill split",
      items,
    };
    return { intent: resolved };
  }

  private async prepareSend(
    intent: Intent,
    ctx: DispatchContext
  ): Promise<{ clarify?: string; intent: Intent }> {
    if (!intent.recipientName && !intent.accountNumber) {
      return { clarify: messages.needsRecipient("that person"), intent };
    }

    if (intent.recipientName) {
      const saved = await transferService.resolveRecipient(ctx.userId, intent.recipientName);
      if (saved.found) {
        return {
          intent: {
            ...intent,
            accountNumber: saved.accountNumber,
            bankName: saved.bankName,
            resolvedAccountName: saved.accountName,
            resolvedBankCode: saved.bankCode,
          },
        };
      }
    }

    if (!intent.accountNumber || !intent.bankName) {
      return { clarify: messages.needsRecipient(intent.recipientName ?? "that person"), intent };
    }

    const verified = await transferService.verifyDestination(intent.accountNumber, intent.bankName);
    if (!verified.ok) {
      const question =
        verified.reason === "bank_unknown"
          ? messages.bankNotFound(intent.bankName)
          : messages.accountNotVerified(intent.accountNumber, intent.bankName);
      return { clarify: question, intent };
    }

    return {
      intent: {
        ...intent,
        accountNumber: verified.accountNumber,
        bankName: verified.bankName,
        resolvedAccountName: verified.accountName,
        resolvedBankCode: verified.bankCode,
      },
    };
  }

  /**
   * Continues a pending command with the user's clarification answer: re-parses
   * the original request + the Q&A into a complete intent, then confirms or asks
   * again (capped). The bot handler records any new force_reply message id.
   */
  async continue(pendingId: string, answer: string, ctx: DispatchContext): Promise<DispatchResult> {
    const command = await botCommandService.get(pendingId);
    if (!command) return this.handleMessage(answer, ctx);

    const prior = botCommandService.getIntent(command);
    const rounds = command.clarifyRounds;

    const intent = await commandParserService.parse(command.rawText, {
      ...(await this.parseContext(ctx)),
      priorExchange: {
        originalMessage: command.rawText,
        question: prior.clarification ?? "more details",
        answer,
      },
    });

    if (ctx.scope === "group" && isAdminOnlyInGroup(intent.intent) && !ctx.isGroupAdmin) {
      return { text: messages.adminOnlyCreate };
    }

    const prepared = await this.prepareIntent(intent, ctx);
    if (intent.status === "needs_clarification" || prepared.clarify) {
      if (rounds + 1 >= MAX_CLARIFY_ROUNDS) {
        await botCommandService.setStatus(pendingId, "failed", "too many clarification rounds");
        return { text: messages.unrecognized };
      }
      await botCommandService.updateIntent(pendingId, intent, null, rounds + 1);
      const question = prepared.clarify ?? intent.clarification ?? messages.unrecognized;
      await botCommandService.setReplyText(pendingId, question);
      return { text: question, clarify: { commandId: pendingId } };
    }

    await botCommandService.updateIntent(pendingId, prepared.intent);
    const result = this.planConfirm(prepared.intent, pendingId);
    await botCommandService.setReplyText(pendingId, result.text);
    return result;
  }

  /** Confirm tap: execute the stored intent. */
  async confirm(commandId: string, ctx: DispatchContext): Promise<DispatchResult> {
    const command = await this.loadCommand(commandId);
    if (!command) return { text: messages.actionFailed };
    const intent = botCommandService.getIntent(command);

    try {
      const result = await this.execute(intent, ctx);
      await botCommandService.setStatus(commandId, "confirmed");
      return result;
    } catch (err) {
      logger.error(`[dispatch] execute failed: ${(err as Error).message}`);
      await botCommandService.setStatus(commandId, "failed", (err as Error).message);
      return { text: messages.actionFailed };
    }
  }

  async cancel(commandId: string): Promise<DispatchResult> {
    await botCommandService.setStatus(commandId, "rejected").catch(() => {});
    return { text: messages.actionCancelled };
  }

  private planConfirm(intent: Intent, commandId: string): DispatchResult {
    const keyboard = confirmCancel(commandId);
    switch (intent.intent) {
      case "create_collection":
        return {
          text: messages.confirmCollection(
            intent.title!,
            intent.amount ?? 0,
            intent.targetAmount,
            intent.deadline
          ),
          keyboard,
        };
      case "create_jar":
        return { text: messages.confirmCreateJar(intent.title!, intent.amount!), keyboard };
      case "save_to_jar":
        return { text: messages.confirmSaveToJar(intent.title!, intent.amount!), keyboard };
      case "send_money":
        return {
          text: messages.confirmSend({
            accountName: intent.resolvedAccountName ?? intent.recipientName!,
            accountNumber: intent.accountNumber,
            bankName: intent.bankName,
            amount: intent.amount!,
          }),
          keyboard,
        };
      case "bill_split":
        return {
          text: messages.confirmBillSplit({
            title: intent.title ?? "Bill split",
            total: intent.items?.reduce((s, i) => s + i.unitPrice, 0) ?? 0,
            items: (intent.items ?? []).map((i) => ({ name: i.name, unitPrice: i.unitPrice })),
          }),
          keyboard,
        };
      case "status_query":
        return { text: messages.unrecognized };
      default:
        return { text: messages.unrecognized };
    }
  }

  private async execute(intent: Intent, ctx: DispatchContext): Promise<DispatchResult> {
    switch (intent.intent) {
      case "create_collection":
        return this.runCreateCollection(intent, ctx);
      case "create_jar":
        return this.runCreateJar(intent, ctx);
      case "save_to_jar":
        return this.runSaveToJar(intent, ctx);
      case "send_money":
        return this.runSend(intent, ctx);
      case "bill_split":
        return this.runBillSplit(intent, ctx);
      default:
        return { text: messages.actionFailed };
    }
  }

  private async runCreateCollection(intent: Intent, ctx: DispatchContext): Promise<DispatchResult> {
    const deadline = intent.deadline ? dayjs(intent.deadline) : null;
    const collection = await collectionService.create(ctx.userId, {
      title: intent.title!,
      purpose: "",
      collectionType: "fixed_per_person",
      amountPerMember: intent.amount,
      targetAmount: intent.targetAmount,
      deadline: deadline?.isValid() ? deadline.toDate() : undefined,
      linkedChatId: ctx.linkedChatId,
    });
    const keyboard =
      collection.amountPerMember != null
        ? payButton(collection.id, collection.amountPerMember)
        : undefined;
    return { text: messages.collectionCreated(collection.title), keyboard };
  }

  private async runBillSplit(intent: Intent, ctx: DispatchContext): Promise<DispatchResult> {
    const items = intent.items ?? [];
    const { url } = await billSplitService.createFromItems({
      ownerUserId: ctx.userId,
      source: "telegram",
      linkedChatId: ctx.linkedChatId,
      title: intent.title ?? "Bill split",
      items: items.map((i) => ({ name: i.name, unitPrice: i.unitPrice })),
      knownNames: intent.payerNames,
    });
    return {
      text: messages.billSplitCreated(intent.title ?? "Bill split", url),
      keyboard: openBillLink(url),
    };
  }

  private async runCreateJar(intent: Intent, ctx: DispatchContext): Promise<DispatchResult> {
    const jar = await savingsService.createJar(ctx.userId, {
      name: intent.title!,
      targetAmount: intent.amount,
    });
    return { text: messages.jarCreated(jar.name) };
  }

  private async runSaveToJar(intent: Intent, ctx: DispatchContext): Promise<DispatchResult> {
    const jar = await savingsService.findByName(ctx.userId, intent.title!);
    if (!jar) return { text: messages.jarNotFound(intent.title!) };

    const amount = intent.amount!;
    const balance = await ledgerService.getBalance(ctx.userId);
    if (balance < amount) {
      return { text: messages.insufficientForSave(jar.name, amount, balance) };
    }

    await savingsService.depositFromWallet(ctx.userId, jar.id, amount);
    return { text: messages.savedToJar(jar.name, amount) };
  }

  private async runSend(intent: Intent, ctx: DispatchContext): Promise<DispatchResult> {
    if (!intent.accountNumber || !intent.bankName) {
      return { text: messages.needsRecipient(intent.recipientName ?? "that person") };
    }
    const amount = intent.amount!;
    const balance = await ledgerService.getBalance(ctx.userId);
    if (balance < amount) {
      const name = intent.resolvedAccountName ?? intent.recipientName ?? "that account";
      return { text: messages.insufficientForSend(name, amount, balance) };
    }

    const result = await transferService.payout({
      userId: ctx.userId,
      amount,
      accountNumber: intent.accountNumber,
      bankName: intent.bankName,
      senderName: ctx.senderName,
      alias: intent.recipientName,
      createdByPlatformUserId: ctx.senderPlatformId,
    });

    if (result.status === "sent") return { text: messages.sendSucceeded(result.accountName, amount) };
    if (result.status === "pending") return { text: messages.sendProcessing(result.accountName, amount) };
    return { text: messages.sendUnavailable };
  }

  /**
   * Answers a natural-language status question ("how much have we collected?")
   * with the financial overview. Scope-gated: a DM shows the full picture (wallet,
   * savings, collections) like `/balance`, but a group shows ONLY collection
   * progress — wallet and savings are personal and must not leak into a group.
   */
  private async runStatusQuery(ctx: DispatchContext): Promise<DispatchResult> {
    const overview = await balanceService.overview(ctx.userId);
    if (ctx.scope === "group") {
      return { text: messages.collectionsOverview(overview.collections) };
    }
    return { text: messages.balance(overview) };
  }

  private async runPayCollection(ctx: DispatchContext): Promise<DispatchResult> {
    const collections = await collectionService.listPayableForChat(ctx.linkedChatId);
    if (collections.length === 0) {
      return { text: messages.noPayableCollections };
    }
    if (collections.length === 1) {
      const c = collections[0]!;
      return { text: messages.collectionCard(c.title, c.amountPerMember ?? 0), keyboard: payButton(c.id, c.amountPerMember ?? 0) };
    }
    const items = collections.map((c) => ({
      id: c.id,
      title: c.title,
      amount: c.amountPerMember ?? 0,
      createdAt: c.createdAt,
    }));
    return {
      text: messages.pickCollection(items),
      keyboard: selectCollectionKeyboard(items),
    };
  }

  private async loadCommand(commandId: string) {
    return prisma.botCommand.findUnique({ where: { id: commandId } });
  }
}

export const intentDispatcherService = new IntentDispatcherService();
export default intentDispatcherService;
