import {
  DM_ONLY_INTENTS,
  ADMIN_ONLY_IN_GROUP_INTENTS,
  type ChatScope,
} from "../../constants/chat-capabilities.js";
import type { IntentName } from "../../schemas/intent.schema.js";
import { ALL_TOOLS } from "./registry.js";
import type { AgentTool } from "./define-tool.js";

/**
 * Maps each tool to the intent capability it corresponds to, so scope/admin
 * gating stays single-sourced in chat-capabilities. Read-only tools that carry
 * no capability are always available in their allowed scope (handled below).
 */
const TOOL_INTENT: Record<string, IntentName> = {
  createCollection: "create_collection",
  createJar: "create_jar",
  saveToJar: "save_to_jar",
  sendMoney: "send_money",
};

/**
 * Read tools that only make sense in a group (collection-facing) or only in a
 * DM (personal money). Kept explicit so the group tool set never leaks personal
 * balances and the DM set isn't cluttered with group-pay UI.
 */
const GROUP_ONLY_READS = new Set(["listPayableCollections", "getCollectionProgress"]);
const DM_ONLY_READS = new Set(["getSavings", "getBalance", "listRecipients", "listReceipts"]);

export function toolsForScope(scope: ChatScope, isGroupAdmin: boolean): AgentTool<any, any>[] {
  return ALL_TOOLS.filter((tool) => {
    const intent = TOOL_INTENT[tool.name];

    if (intent) {
      if (scope === "group" && DM_ONLY_INTENTS.includes(intent)) return false;
      if (scope === "group" && ADMIN_ONLY_IN_GROUP_INTENTS.includes(intent) && !isGroupAdmin) return false;
      return true;
    }

    if (scope === "group" && DM_ONLY_READS.has(tool.name)) return false;
    if (scope === "private" && GROUP_ONLY_READS.has(tool.name)) return false;
    return true;
  });
}

/** The scope's allowed capabilities as a bullet list for the agent prompt. */
export function capabilitiesFor(scope: ChatScope, isGroupAdmin: boolean): string {
  return toolsForScope(scope, isGroupAdmin)
    .map((tool) => `- ${tool.label}`)
    .join("\n");
}
