import { Experimental_Agent as ToolLoopAgent, stepCountIs } from "ai";
import type { InlineKeyboard } from "grammy";
import { ai } from "../ai/index.js";
import { buildAgentPrompt } from "../../data/prompts/agent.prompt.js";
import { toAITools } from "./to-ai-tools.js";
import { toolsForScope, capabilitiesFor } from "./policy.js";
import type { ToolContext } from "./define-tool.js";
import type { Intent } from "../../schemas/intent.schema.js";
import { debugInDev } from "../../lib/utils.js";

const MAX_STEPS = 6;

export interface AgentInput {
  text: string;
  context: string;
  userId: string;
  linkedChatId: string;
  scope: ToolContext["scope"];
  senderName: string;
  senderPlatformId: string;
  isGroupAdmin: boolean;
}

export interface AgentOutput {
  text: string;
  keyboard?: InlineKeyboard;
  checkoutUrl?: string;
  proposal?: Intent;
}

/**
 * Runs the natural-language turn as a tool loop: the model picks and calls tools,
 * the SDK executes them and feeds results back, and the model writes the final
 * reply in Talli's voice. Money/mutating tools don't act — they emit a prepared
 * intent (proposal) the caller turns into the existing confirm card, so AI never
 * moves money on its own. Read tools may attach a keyboard.
 */
export async function runAgent(input: AgentInput): Promise<AgentOutput> {
  let proposal: Intent | undefined;
  let keyboard: InlineKeyboard | undefined;
  let checkoutUrl: string | undefined;

  const toolCtx: ToolContext = {
    userId: input.userId,
    linkedChatId: input.linkedChatId,
    scope: input.scope,
    senderName: input.senderName,
    senderPlatformId: input.senderPlatformId,
    isGroupAdmin: input.isGroupAdmin,
    emit: {
      proposal: (intent) => {
        proposal = intent;
      },
      keyboard: (kb) => {
        keyboard = kb;
      },
      checkoutUrl: (url) => {
        checkoutUrl = url;
      },
    },
  };

  const tools = toAITools(toolsForScope(input.scope, input.isGroupAdmin), toolCtx);
  const system = buildAgentPrompt({
    scope: input.scope,
    capabilities: capabilitiesFor(input.scope, input.isGroupAdmin),
    context: input.context,
  });
  const { model, temperature, maxTokens } = await ai.getModelForFeature("ai.agent", "google/gemini-2.5-flash");

  debugInDev((_, saveToFile) =>
    saveToFile("agent-system-prompt.txt", `${system}\n\n--- user (${input.scope}) ---\n${input.text}`)
  );

  const agent = new ToolLoopAgent({
    model,
    system,
    tools,
    temperature,
    maxOutputTokens: maxTokens,
    stopWhen: stepCountIs(MAX_STEPS),
  });

  const result = await agent.generate({ prompt: input.text });
  const text = result.text.trim();

  debugInDev((_, saveToFile) =>
    saveToFile(
      "agent-response.txt",
      [
        `tools: ${result.toolCalls.map((c) => c.toolName).join(", ") || "none"}`,
        `proposal: ${proposal?.intent ?? "none"}`,
        `reply: ${text}`,
      ].join("\n")
    )
  );

  return { text, keyboard, checkoutUrl, proposal };
}
