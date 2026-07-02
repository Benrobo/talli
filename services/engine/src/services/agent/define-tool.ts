import type { ZodType } from "zod";
import type { ChatScope } from "../../constants/chat-capabilities.js";
import type { Intent } from "../../schemas/intent.schema.js";
import type { InlineKeyboard } from "grammy";

/**
 * A money/mutating tool never moves money itself — it validates and hands back a
 * prepared intent the runner turns into the existing confirm card. A read tool
 * that shows chat UI (a pay button, a picker) attaches a keyboard instead.
 */
export interface ToolEmit {
  proposal(intent: Intent): void;
  keyboard(keyboard: InlineKeyboard): void;
  checkoutUrl(url: string): void;
}

export interface ToolContext {
  userId: string;
  linkedChatId: string;
  scope: ChatScope;
  senderName: string;
  senderPlatformId: string;
  isGroupAdmin: boolean;
  emit: ToolEmit;
}

export interface AgentTool<TParams extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> {
  name: string;
  description: string;
  label: string;
  parameters: ZodType<TParams>;
  execute: (params: TParams, ctx: ToolContext) => Promise<TResult>;
}

export function defineTool<TParams extends Record<string, unknown>, TResult>(
  config: AgentTool<TParams, TResult>
): AgentTool<TParams, TResult> {
  return config;
}
