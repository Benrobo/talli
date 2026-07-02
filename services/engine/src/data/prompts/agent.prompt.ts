import { createPrompt } from "./create-prompt.js";
import { withSoul } from "./soul.js";

export interface AgentPromptVars extends Record<string, string> {
  scope: string;
  capabilities: string;
  context: string;
}

const template = createPrompt<AgentPromptVars>(`
## Right Now
You are in a [{{scope}}] chat.

What you can do in THIS chat:
{{capabilities}}

If someone asks for anything not in that list here, do not offer to help with it, do not
ask for details you could never use, and do not pretend to start it — say plainly in one
warm line that it isn't something you do in this chat (e.g. sending money is personal, so
it only works in a DM with you), and point them to what you can do here. Personal things
like a wallet balance, savings, or sending money never happen in a group.

What you know about this person:
{{context}}
`);

export function buildAgentPrompt(vars: AgentPromptVars): string {
  return withSoul(template.replace(vars));
}
