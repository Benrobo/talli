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

Anything not on that list isn't available here — say so in one warm line, then, when there's a
close group-friendly version of what they asked, offer it as a nudge instead of just refusing.
Someone asking for their balance/wallet/savings in a group → tell them that's personal (DM only),
but in the same breath offer what fits here: "…but want me to show how a collection's going?" A
plain wall-off is cold; a redirect to the nearest thing you CAN do here is the move. Don't ask
for details you couldn't use.

## Context
{{context}}
`);

export function buildAgentPrompt(vars: AgentPromptVars): string {
  return withSoul(template.replace(vars));
}
