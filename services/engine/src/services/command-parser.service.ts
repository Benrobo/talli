import retry from "async-retry";
import dayjs from "dayjs";
import { ai } from "./ai/index.js";
import { cleanLLMJson } from "../lib/clean-llm-json.js";
import { debugInDev } from "../lib/utils.js";
import { commandParserPrompt } from "../data/prompts/command-parser.prompt.js";
import { intentSchema, type Intent, type IntentName } from "../schemas/intent.schema.js";
import { allowedIntents, isAllowedIntent, type ChatScope } from "../constants/chat-capabilities.js";
import logger from "../lib/logger.js";

export type { ChatScope };

export interface PriorExchange {
  originalMessage: string;
  question: string;
  answer: string;
}

export interface ParseContext {
  scope: ChatScope;
  workspaceName?: string;
  knownJars?: string[];
  knownBeneficiaries?: string[];
  recentHistory?: string[];
  priorExchange?: PriorExchange;
}

/**
 * Turns a chat message into one structured intent using the LLM. Parses and
 * validates only — execution is the dispatcher's job. Group chats are limited
 * to a safe subset of intents; the model is told the allowed set and the
 * dispatcher re-checks at execute time.
 */
class CommandParserService {
  async parse(message: string, context: ParseContext): Promise<Intent> {
    const effectiveMessage = context.priorExchange
      ? [
          `Original request: "${context.priorExchange.originalMessage}"`,
          `You asked: "${context.priorExchange.question}"`,
          `They replied: "${context.priorExchange.answer}"`,
          "Combine these into one complete intent.",
        ].join("\n")
      : message;

    const prompt = commandParserPrompt.replace({
      message: effectiveMessage,
      context: this.contextBlock(context),
      allowedIntents: this.allowedIntents(context.scope).join(", "),
    });

    return retry(
      async () => {
        const { model, maxTokens } = await ai.getModelForFeature("ai.command.parse");
        const raw = await ai.generate(prompt, { model, temperature: 0.1, maxTokens });
        
        debugInDev((_, saveToFile) => {
          saveToFile("command-parser-prompt.txt", prompt);
          saveToFile("command-parser-response.txt", raw);
        });

        const json = cleanLLMJson({ response: raw, requiredFields: ["intent"] }) as Record<string, unknown>;
        if (json.status !== "ready") json.status = "needs_clarification";
        return intentSchema.parse(json);
      },
      {
        retries: 2,
        minTimeout: 500,
        onRetry: (err, attempt) => {
          logger.warn(`[parser] retry ${attempt}: ${(err as Error).message}`);
        },
      }
    );
  }

  allowedIntents(scope: ChatScope): IntentName[] {
    return allowedIntents(scope);
  }

  isAllowed(scope: ChatScope, intent: IntentName): boolean {
    return isAllowedIntent(scope, intent);
  }

  private contextBlock(context: ParseContext): string {
    const lines = [
      `Today: ${dayjs().format("YYYY-MM-DD")}`,
      `Chat type: ${context.scope === "group" ? "group" : "private DM"}`,
    ];
    if (context.workspaceName) lines.push(`Workspace: ${context.workspaceName}`);
    if (context.knownJars?.length) lines.push(`Known jars: ${context.knownJars.join(", ")}`);
    if (context.knownBeneficiaries?.length) {
      lines.push(`Known recipients: ${context.knownBeneficiaries.join(", ")}`);
    }
    if (context.recentHistory?.length) {
      lines.push(
        "",
        "Recent conversation (for understanding follow-ups only — do NOT re-run past actions):",
        ...context.recentHistory
      );
    }
    return lines.join("\n");
  }
}

export const commandParserService = new CommandParserService();
export default commandParserService;
