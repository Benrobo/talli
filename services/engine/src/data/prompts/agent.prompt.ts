import { createPrompt } from "./create-prompt.js";
import { withSoul } from "./soul.js";

export interface AgentPromptVars extends Record<string, string> {
  scope: string;
  capabilities: string;
  context: string;
}

const template = createPrompt<AgentPromptVars>(`
## This chat
You're in a [{{scope}}] chat. Here you can:
{{capabilities}}

Anything not on that list isn't available here — say so in one warm line and point to what is
(e.g. sending money and personal balances only work in a DM, never a group). Don't ask for
details you couldn't use.

## Context
{{context}}
`);

export function buildAgentPrompt(vars: AgentPromptVars): string {
  return withSoul(template.replace(vars));
}
