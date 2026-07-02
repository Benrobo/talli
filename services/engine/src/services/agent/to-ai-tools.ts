import { tool, type Tool } from "ai";
import type { AgentTool, ToolContext } from "./define-tool.js";

/**
 * Converts our tools into the AI SDK's tool shape, currying the per-request
 * context into every execute so tools always act as the right user in the right
 * chat. Mirrors the scribe/cue/elorah pattern.
 *
 * Every execute is wrapped with a call log — tool name, the args the model
 * passed, and the request context (minus the non-serializable `emit`) — plus the
 * result, so any tool invocation is fully traceable from the console.
 */
export function toAITools(
  tools: AgentTool<any, any>[],
  ctx: ToolContext
): Record<string, Tool> {
  const { emit: _emit, ...loggableCtx } = ctx;
  const result: Record<string, Tool> = {};
  for (const def of tools) {
    result[def.name] = tool({
      description: def.description,
      inputSchema: def.parameters,
      execute: async (args: Record<string, unknown>) => {
        console.log(
          `🛠️  [tool] ${def.name} called\n${JSON.stringify({ args, ctx: loggableCtx }, null, 2)}`
        );
        const output = await def.execute(args, ctx);
        console.log(`✅ [tool] ${def.name} result\n${JSON.stringify(output, null, 2)}`);
        return output;
      },
    });
  }
  return result;
}
