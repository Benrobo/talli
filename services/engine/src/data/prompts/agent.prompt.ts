import { createPrompt } from "./create-prompt.js";
import { withSoul } from "./soul.js";

export interface AgentPromptVars extends Record<string, string> {
  scope: string;
  context: string;
}

const template = createPrompt<AgentPromptVars>(`
## Right Now
You are in a [{{scope}}] chat.

What you know about this person:
{{context}}
`);

export function buildAgentPrompt(vars: AgentPromptVars): string {
  return withSoul(template.replace(vars));
}
