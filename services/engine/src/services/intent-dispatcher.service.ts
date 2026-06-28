import dayjs from "dayjs";
import prisma from "../prisma/index.js";
import { messages } from "../integrations/telegram/ui/messages.js";
import { confirmCancel, payButton } from "../integrations/telegram/ui/keyboards.js";
import type { InlineKeyboard } from "grammy";
import { commandParserService, type ChatScope } from "./command-parser.service.js";
import { botCommandService, type CommandContext } from "./bot-command.service.js";
import { collectionService } from "./collection.service.js";
import { savingsService } from "./savings.service.js";
import { balanceService } from "./balance.service.js";
import { walletService } from "./wallet.service.js";
import { transferService } from "./transfer.service.js";
import { beneficiaryService } from "./beneficiary.service.js";
import { randomToken } from "../lib/utils.js";
import type { Intent } from "../schemas/intent.schema.js";
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
  ownerUserId: string;
  workspaceName?: string;
  senderName: string;
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
    const [jars, beneficiaries] = await Promise.all([
      savingsService.list(ctx.workspaceId),
      beneficiaryService.listAliases(ctx.workspaceId),
    ]);
    return {
      scope: ctx.scope,
      workspaceName: ctx.workspaceName,
      knownJars: jars.map((j) => j.name),
      knownBeneficiaries: beneficiaries,
    };
  }

  async handleMessage(text: string, ctx: DispatchContext): Promise<DispatchResult> {
    const intent = await commandParserService.parse(text, await this.parseContext(ctx));

    if (intent.intent === "unknown") {
      return { text: messages.unrecognized };
    }
    if (!commandParserService.isAllowed(ctx.scope, intent.intent)) {
      return { text: messages.dmOnly };
    }
    if (intent.intent === "status_query") {
      return this.runStatusQuery(ctx);
    }
    const gap = await this.missingInfo(intent, ctx);
    if (intent.status === "needs_clarification" || gap) {
      const command = await botCommandService.recordClarification(ctx, text, intent, null);
      const question = gap ?? intent.clarification ?? messages.unrecognized;
      return { text: question, clarify: { commandId: command.id } };
    }

    const command = await botCommandService.record(ctx, text, intent);
    return this.planConfirm(intent, command.id);
  }

  /**
   * Deterministic backstop for when the LLM marks an intent "ready" that isn't
   * actually actionable — e.g. send_money to a name that isn't a saved recipient
   * and has no account number. Returns a clarification question, or null if the
   * intent is genuinely complete. Trust the parser, but verify the money path.
   */
  private async missingInfo(intent: Intent, ctx: DispatchContext): Promise<string | null> {
    if (intent.intent === "send_money") {
      if (!intent.recipientName) return messages.needsRecipient("that person");
      if (intent.accountNumber && intent.bankName) return null;
      const recipient = await transferService.resolveRecipient(ctx.workspaceId, intent.recipientName);
      if (!recipient.found) return messages.needsRecipient(intent.recipientName);
    }
    return null;
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

    const gap = await this.missingInfo(intent, ctx);
    if (intent.status === "needs_clarification" || gap) {
      if (rounds + 1 >= MAX_CLARIFY_ROUNDS) {
        await botCommandService.setStatus(pendingId, "failed", "too many clarification rounds");
        return { text: messages.unrecognized };
      }
      await botCommandService.updateIntent(pendingId, intent, null, rounds + 1);
      const question = gap ?? intent.clarification ?? messages.unrecognized;
      return { text: question, clarify: { commandId: pendingId } };
    }

    await botCommandService.updateIntent(pendingId, intent);
    return this.planConfirm(intent, pendingId);
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
        return { text: messages.confirmCreateJar(intent.title!, intent.amount), keyboard };
      case "save_to_jar":
        return { text: messages.confirmSaveToJar(intent.title!, intent.amount!), keyboard };
      case "send_money":
        return { text: messages.confirmSend(intent.recipientName!, intent.bankName, intent.amount!), keyboard };
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
      default:
        return { text: messages.actionFailed };
    }
  }

  private async runCreateCollection(intent: Intent, ctx: DispatchContext): Promise<DispatchResult> {
    const deadline = intent.deadline ? dayjs(intent.deadline) : null;
    const collection = await collectionService.create(ctx.workspaceId, ctx.ownerUserId, {
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

  private async runCreateJar(intent: Intent, ctx: DispatchContext): Promise<DispatchResult> {
    const jar = await savingsService.createJar(ctx.workspaceId, ctx.ownerUserId, {
      name: intent.title!,
      targetAmount: intent.amount,
    });
    return { text: messages.jarCreated(jar.name) };
  }

  private async runSaveToJar(intent: Intent, ctx: DispatchContext): Promise<DispatchResult> {
    const jar = await savingsService.findByName(ctx.workspaceId, intent.title!);
    if (!jar) return { text: messages.jarNotFound(intent.title!) };

    const wallet = await walletService.ensureWallet(ctx.ownerUserId);
    const amount = intent.amount!;
    if (wallet.balance < amount) {
      return { text: messages.insufficientForSave(jar.name, amount, wallet.balance) };
    }

    const reference = `talli_save_${randomToken(8)}`;
    await walletService.debit(wallet.id, amount, "savings_deposit", reference);
    await savingsService.creditJar(jar.id, amount);
    return { text: messages.savedToJar(jar.name, amount) };
  }

  private async runSend(intent: Intent, ctx: DispatchContext): Promise<DispatchResult> {
    const recipient = await transferService.resolveRecipient(ctx.workspaceId, intent.recipientName!);
    if (!recipient.found) {
      return { text: messages.needsRecipient(intent.recipientName!) };
    }

    const wallet = await walletService.ensureWallet(ctx.ownerUserId);
    const amount = intent.amount!;
    if (wallet.balance < amount) {
      return { text: messages.insufficientForSend(recipient.accountName!, amount, wallet.balance) };
    }

    const reference = `talli_send_${randomToken(8)}`;
    await walletService.debit(wallet.id, amount, "send", reference);

    try {
      await transferService.sendToBank({
        workspaceId: ctx.workspaceId,
        amount,
        accountNumber: recipient.accountNumber!,
        accountName: recipient.accountName!,
        bankCode: recipient.bankCode!,
        bankName: recipient.bankName,
        senderName: ctx.workspaceName ?? ctx.senderName,
        alias: intent.recipientName,
        createdByPlatformUserId: ctx.senderPlatformId,
      });
      return { text: messages.sendQueued(recipient.accountName!, amount) };
    } catch (err) {
      await walletService.credit(wallet.id, amount, "refund", `${reference}_refund`);
      logger.error(`[dispatch] send failed, refunded wallet: ${(err as Error).message}`);
      return { text: messages.sendUnavailable };
    }
  }

  /**
   * Answers a natural-language status question ("how much have we collected?")
   * with the financial overview. Scope-gated: a DM shows the full picture (wallet,
   * savings, collections) like `/balance`, but a group shows ONLY collection
   * progress — wallet and savings are personal and must not leak into a group.
   */
  private async runStatusQuery(ctx: DispatchContext): Promise<DispatchResult> {
    const overview = await balanceService.overview(ctx.ownerUserId, ctx.workspaceId);
    if (ctx.scope === "group") {
      return { text: messages.collectionsOverview(overview.collections) };
    }
    return { text: messages.balance(overview) };
  }

  private async loadCommand(commandId: string) {
    return prisma.botCommand.findUnique({ where: { id: commandId } });
  }
}

export const intentDispatcherService = new IntentDispatcherService();
export default intentDispatcherService;
