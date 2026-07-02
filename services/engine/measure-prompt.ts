import { buildAgentPrompt } from "./src/data/prompts/agent.prompt.js";
import { capabilitiesFor } from "./src/services/agent/policy.js";

const sample = buildAgentPrompt({
  scope: "group",
  capabilities: capabilitiesFor("group", true),
  context: "Saved recipients (use directly, no lookup):\n- Samuel: Onyemaechi Samuel Ikoro (Kuda 1101194861)\n\nLast few turns (for continuity only — never a source of live numbers):\nUser: what can you do?\nTalli: I can collect from a group, keep jars, and send money.",
});
console.log(`chars: ${sample.length}`);
console.log(`~tokens: ${Math.round(sample.length / 4)}`);
