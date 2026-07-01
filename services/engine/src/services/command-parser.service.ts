import retry from "async-retry";
import { ai } from "./ai/index.js";
import { cleanLLMJson } from "../lib/clean-llm-json.js";
import { commandParserPrompt } from "../data/prompts/command-parser.prompt.js";
import { intentSchema, type Intent, type IntentName } from "../schemas/intent.schema.js";
import logger from "../lib/logger.js";

export type ChatScope = "private" | "group";

export interface ParseContext {
  scope: ChatScope;
  workspaceName?: string;
  knownJars?: string[];
  knownBeneficiaries?: string[];
}

const DM_ONLY: IntentName[] = ["send_money", "save_to_jar", "create_jar"];
const GROUP_OK: IntentName[] = ["create_collection", "status_query"];

/**
 * Turns a chat message into one structured intent using the LLM. Parses and
 * validates only — execution is the dispatcher's job. Group chats are limited
 * to a safe subset of intents; the model is told the allowed set and the
 * dispatcher re-checks at execute time.
 */
class CommandParserService {
  async parse(message: string, context: ParseContext): Promise<Intent> {
    const prompt = commandParserPrompt.replace({
      message,
      context: this.contextBlock(context),
      allowedIntents: this.allowedIntents(context.scope).join(", "),
    });

    return retry(
      async () => {
        const raw = await ai.generate(prompt, { temperature: 0.1, maxTokens: 1024 });
        const json = cleanLLMJson({ response: raw, requiredFields: ["intent", "status"] });
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
    return scope === "group" ? GROUP_OK : [...GROUP_OK, ...DM_ONLY];
  }

  isAllowed(scope: ChatScope, intent: IntentName): boolean {
    return this.allowedIntents(scope).includes(intent);
  }

  private contextBlock(context: ParseContext): string {
    const lines = [
      `Chat type: ${context.scope === "group" ? "group" : "private DM"}`,
    ];
    if (context.workspaceName) lines.push(`Workspace: ${context.workspaceName}`);
    if (context.knownJars?.length) lines.push(`Known jars: ${context.knownJars.join(", ")}`);
    if (context.knownBeneficiaries?.length) {
      lines.push(`Known recipients: ${context.knownBeneficiaries.join(", ")}`);
    }
    return lines.join("\n");
  }
}

export const commandParserService = new CommandParserService();
export default commandParserService;
