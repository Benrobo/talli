import type { AgentTool } from "./define-tool.js";
import { getBalanceTool } from "./tools/get-balance.tool.js";
import { getSavingsTool } from "./tools/get-savings.tool.js";
import { getCollectionProgressTool } from "./tools/get-collection-progress.tool.js";
import { listPayableCollectionsTool } from "./tools/list-payable-collections.tool.js";
import { helpTool } from "./tools/help.tool.js";
import { createCollectionTool } from "./tools/create-collection.tool.js";
import { createJarTool } from "./tools/create-jar.tool.js";
import { saveToJarTool } from "./tools/save-to-jar.tool.js";
import { sendMoneyTool } from "./tools/send-money.tool.js";

export const ALL_TOOLS: AgentTool<any, any>[] = [
  getBalanceTool,
  getSavingsTool,
  getCollectionProgressTool,
  listPayableCollectionsTool,
  helpTool,
  createCollectionTool,
  createJarTool,
  saveToJarTool,
  sendMoneyTool,
];
