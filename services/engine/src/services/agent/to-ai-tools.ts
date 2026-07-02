import { tool, type Tool } from "ai";
import type { AgentTool, ToolContext } from "./define-tool.js";

/**
 * Converts our tools into the AI SDK's tool shape, currying the per-request
 * context into every execute so tools always act as the right user in the right
 * chat. Mirrors the scribe/cue/elorah pattern.
 */
export function toAITools(
  tools: AgentTool<any, any>[],
  ctx: ToolContext
): Record<string, Tool> {
  const result: Record<string, Tool> = {};
  for (const def of tools) {
    result[def.name] = tool({
      description: def.description,
      inputSchema: def.parameters,
      execute: async (args: Record<string, unknown>) => def.execute(args, ctx),
    });
  }
  return result;
}
