# Making Talli's chat NLP agentic

Status: design discussion
Scope: replace the if/else intent dispatcher with a real agent tool-loop for natural-language chat (Telegram/WhatsApp), while keeping keyboards, photo uploads, and all guardrails intact.
Grounded in: Talli's current `intent-dispatcher.service.ts` + `command-parser.service.ts`, and the agent patterns already used in `~/projects/scribe`, `~/cue`, `~/projects/elorah`, `~/projects/mood-world`.

---

## 1. The problem with what we have

Today a Telegram message flows like this:

1. `command-parser.service.ts` does a single LLM call that returns one `Intent` JSON object (`{ intent: "create_collection", amount, title, ... }`).
2. `intent-dispatcher.service.ts` runs a big `if/else` + `switch` on `intent.intent` to decide what to do.

It works, but it feels like a bot with hardcoded branches, not an assistant. Concrete symptoms you already hit:

- "how many savings do I have?" got answered with the **Collections** overview, because `status_query` is one catch-all bucket that ignores what was actually asked (`runStatusQuery` just dumps `balanceService.overview`).
- Every new capability means a new enum value in `intent.schema.ts`, a new `case` in three different switch statements (`prepareIntent`, `planConfirm`, `execute`), and new parser prompt rules. It does not scale and it is easy to get out of sync.
- The model can only ever do ONE thing per message. It cannot chain steps ("find my rent jar, then tell me how close I am"), cannot ask for a missing detail and then continue naturally, and cannot answer a question that needs two lookups.

The good news: our four sibling apps already solved this the same way, and the SDK we need is already installed.

## 2. What the reference apps do (the pattern to copy)

Scribe, Cue, Elorah, and Mood-World all use the exact same shape. It is boring in a good way — one pattern, repeated:

- A **runner** builds a `ToolLoopAgent` (from the Vercel `ai` SDK) with a system prompt, a set of tools, and a stop condition, then streams it. The SDK itself runs the loop: call model, model asks for a tool, SDK runs the tool, feeds the result back, repeats until the model produces a final answer or hits the step cap.
- Tools live in a **tools folder**, one file per tool, each defined with a small `defineTool({ name, description, parameters, execute })` helper. `parameters` is a Zod schema where every field has a `.describe(...)`. The description string is where you tell the model what the tool does and when to use it.
- A **registry** collects the tools, and a `toAITools(registry, ctx)` adapter converts them to the SDK's `tool()` shape, currying a per-request **context** object into every `execute`.
- The **context** (userId, current state, permissions) is injected two ways: static facts go into the system prompt string; live capabilities and identity ride inside the tool `execute` closures so tools always act as the right user.

Here is Cue's runner, which is representative of all four:

```ts
// cue/packages/engine/src/agents/companion-runner.ts (trimmed)
const tools = toAITools(companionToolRegistry, toolContext);

const agent = new ToolLoopAgent({
  model,
  instructions: systemPrompt,
  tools,
  stopWhen: stepCountIs(6),
});

const result = await agent.stream({ messages, abortSignal });
for await (const event of result.fullStream) {
  switch (event.type) {
    case "text-delta": /* accumulate the final reply */ break;
    case "tool-call":  /* optional: trace */ break;
    case "tool-result":/* optional: trace */ break;
  }
}
```

And a representative tool (Elorah), showing how the description and parameters carry all the "context on what this does":

```ts
// elorah scripture-lookup.tool.ts
export const scriptureTool = tool({
  description:
    "Resolve a Bible reference to its exact verse text before you quote it. " +
    "Use only when you are about to quote scripture, so the words are exact. Never quote from memory.",
  inputSchema: z.object({
    reference: z.string().describe('e.g. "psalms:51:10", "romans:12:19-21"'),
  }),
  execute: async ({ reference }) => lookupScripture(reference),
});
```

The tool-definition + registry + adapter files are literally identical across scribe and cue:

```ts
// tool-registry.ts
const companionToolRegistry = { searchProfile, generateIcebreaker, scanProfile, /* ... */ };

// to-ai-tools.ts
export function toAITools(tools, ctx) {
  const result = {};
  for (const [name, def] of Object.entries(tools)) {
    result[name] = tool({
      description: def.description,
      inputSchema: def.parameters,
      execute: async (args) => def.execute(args, ctx), // ctx curried in
    });
  }
  return result;
}
```

Model config in all four: OpenRouter provider, model chosen per-feature through `@benrobo/modelkit` (`getModelForFeature("companion.chat", "anthropic/claude-sonnet-4")`), temperature ~0.3, `stopWhen: stepCountIs(6)`.

## 3. It runs on what we already have

Talli's engine already has:

- `ai` v5.0.185 installed. It already exports `generateText`, `tool`, `stepCountIs`, and `Experimental_Agent` (the same class the references import as `ToolLoopAgent` — it is just an alias). So the agent loop is available today, no upgrade needed.
- `@openrouter/ai-sdk-provider` v1.5.4 and `@benrobo/modelkit` v0.0.7, wired through `src/services/ai/` exactly like the references.
- `command-parser.service.ts` already calls `ai.getModelForFeature(...)` — we reuse that verbatim, just with a new feature id like `ai.agent`.

There is no existing tool-loop in the engine yet (grep for `tools:`/`stepCountIs` finds nothing), so this is net-new but small, and it sits right on top of infrastructure we already run.

Two SDK styles are available; we use whichever reads cleaner:

- `Experimental_Agent`/`ToolLoopAgent` (what the refs use) — nice for streaming.
- Plain `generateText({ model, system, messages, tools, stopWhen: stepCountIs(n) })` — same loop, returns the final text in one call. For Telegram we do not stream token-by-token (we send one message), so plain `generateText` with tools is the simplest fit. Either is fine.

## 4. The proposed Talli shape

Folder layout the user asked for, mirroring the references:

```
src/services/agent/
  runner.ts               // builds context, runs the tool loop, returns AgentResult
  define-tool.ts          // the { name, description, parameters, execute } helper + ToolContext type
  to-ai-tools.ts          // adapter: our tools -> ai SDK tool(), curries context
  registry.ts             // collects tools + returns the allowed subset for a scope
  policy.ts               // guardrails: which tools are allowed per scope/role, confirm-required set
  tools/
    get-balance.tool.ts        // wallet + savings + collections overview (splits today's status_query)
    get-savings.tool.ts        // "how much have I saved / how many jars"
    create-collection.tool.ts  // confirm-required
    create-jar.tool.ts         // confirm-required, DM-only
    save-to-jar.tool.ts        // confirm-required, DM-only, balance-checked
    send-money.tool.ts         // confirm-required, DM-only, balance-checked, resolves recipient
    list-payable-collections.tool.ts // returns collections + triggers pay keyboard
    collection-status.tool.ts  // progress / who paid (see nlp-group-money-queries.md)
    help.tool.ts
```

Each tool wraps the SAME deterministic service call the dispatcher already uses today. We are not rewriting business logic — we are re-exposing it as tools. The mapping is already one-to-one:

| Tool | Wraps (unchanged) |
| --- | --- |
| get-balance / get-savings | `balanceService.overview(userId)`, `savingsService.list(userId)` |
| create-collection | `collectionService.create(userId, input)` |
| create-jar | `savingsService.createJar(userId, input)` |
| save-to-jar | `savingsService.findByName` + `ledgerService.getBalance` + `savingsService.depositFromWallet` |
| send-money | `transferService.resolveRecipient` + `verifyDestination` + `ledgerService.getBalance` + `transferService.payout` |
| list-payable-collections | `collectionService.listPayableForChat(linkedChatId)` |
| collection-status | `collectionService` progress/roster (see the group-queries doc) |

A tool file looks like this (wrapping our real service):

```ts
// src/services/agent/tools/get-savings.tool.ts
import { z } from "zod";
import { defineTool } from "../define-tool.js";
import { savingsService } from "../../savings.service.js";

export default defineTool({
  name: "getSavings",
  description:
    "Look up the user's savings jars and how much is in each. " +
    "Use when they ask about savings, jars, how much they've saved, or a specific jar's progress. " +
    "This is read-only — never needs confirmation.",
  parameters: z.object({
    jarName: z
      .string()
      .optional()
      .describe("Optional: a specific jar name to focus on, e.g. 'rent'. Omit for all jars."),
  }),
  execute: async ({ jarName }, ctx) => {
    const jars = await savingsService.list(ctx.userId);
    if (jarName) {
      const match = jars.find((j) => j.name.toLowerCase().includes(jarName.toLowerCase()));
      return match ?? { note: `No jar matching "${jarName}". They have: ${jars.map((j) => j.name).join(", ")}` };
    }
    return { jars };
  },
});
```

The runner ties it together:

```ts
// src/services/agent/runner.ts (sketch)
export async function runAgent(text: string, ctx: DispatchContext): Promise<AgentResult> {
  const toolCtx: ToolContext = { userId: ctx.userId, linkedChatId: ctx.linkedChatId, scope: ctx.scope };

  const allowed = registry.forScope(ctx.scope, ctx.isGroupAdmin); // policy gate, see section 5
  const tools = toAITools(allowed, toolCtx);

  const { model, maxTokens } = await ai.getModelForFeature("ai.agent", "google/gemini-2.5-flash");

  const { text: reply, steps } = await generateText({
    model,
    system: buildAgentPrompt({ scope: ctx.scope, context: await parseContext(ctx) }),
    messages: [{ role: "user", content: text }],
    tools,
    stopWhen: stepCountIs(6),
    maxOutputTokens: maxTokens,
    temperature: 0.2,
  });

  // A confirm-required tool doesn't execute the money move; it returns a
  // "proposal" the runner turns into a confirm card (section 6).
  return interpret(reply, steps);
}
```

`buildAgentPrompt` replaces the old parser prompt: it explains the tools, the tone (reuse `TALLI_VOICE`), and the scope rules ("in a group you can only do X, refuse the rest politely"). Static per-request facts (their jar names, beneficiary aliases, recent history — the same things `parseContext` already gathers) go into the prompt so the model rarely needs a lookup just to disambiguate.

## 5. Guardrails must move into a policy layer (this is the important part)

Right now every guard is enforced imperatively inside the dispatcher and handlers. The services themselves do NOT enforce chat scope or role. If we just hand the model a pile of tools, we lose those guards. So the redesign has one hard rule: **every guard survives, re-expressed as a policy layer around the tools**, not as trust in the model.

The guards to preserve (all currently in the dispatcher):

1. DM-only tools (`send_money`, `save_to_jar`, `create_jar`) are simply NOT in the tool set when `scope === "group"`. The model can't call what it doesn't have. Belt and suspenders: the tool's `execute` re-checks scope and throws if violated.
2. Admin-only-in-group (`create_collection`, `bill_split`) excluded from the tool set unless `ctx.isGroupAdmin`. Re-checked in `execute`.
3. Unlinked-chat refusal stays in the message handler — we never even reach the agent for an unlinked chat.
4. Group non-mention silence stays in the message handler.
5. Confirm-before-action: money/mutating tools do NOT perform the side effect inside `execute`. They validate, resolve, and return a structured proposal; the runner renders the existing confirm card, and the real service call only runs on the Confirm tap (section 6). This keeps "AI never moves money on its own" from the PRD literally true — the agent proposes, the deterministic layer executes after a human taps Confirm.
6. Confirm ownership (only the original sender can tap Confirm) — unchanged, still in `confirm.handler.ts`.
7. Balance checks — stay inside the money tools' validation, same as `runSend`/`runSaveToJar` today.
8. Recipient/destination resolution (phone book or Nomba name enquiry) — stays inside `send-money.tool` so the confirm card always shows the real account name.
9. Scope-gated status leak — the group tool set only includes collection tools, so wallet/savings can never be read in a group.
10. Clarify cap and pending TTL — enforced by the runner / message handler, not the model.

`policy.ts` makes the allowed set explicit, reusing the constants we already have in `src/constants/chat-capabilities.ts`:

```ts
// src/services/agent/policy.ts
import { DM_ONLY_INTENTS, ADMIN_ONLY_IN_GROUP_INTENTS } from "../../constants/chat-capabilities.js";

const TOOL_TO_CAP = { sendMoney: "send_money", saveToJar: "save_to_jar", /* ... */ };
const CONFIRM_REQUIRED = new Set(["createCollection", "createJar", "saveToJar", "sendMoney"]);

export const policy = {
  forScope(scope, isGroupAdmin) {
    return registry.all().filter((t) => {
      const cap = TOOL_TO_CAP[t.name];
      if (scope === "group" && DM_ONLY_INTENTS.includes(cap)) return false;
      if (scope === "group" && ADMIN_ONLY_IN_GROUP_INTENTS.includes(cap) && !isGroupAdmin) return false;
      return true;
    });
  },
  requiresConfirm(toolName) {
    return CONFIRM_REQUIRED.has(toolName);
  },
};
```

The principle from the references holds here too: their guards are tool-level (return an error string, or omit the tool). We do the same but stricter, because money is involved — we also keep the human confirm step.

## 6. Keyboards, confirm cards, and photos stay non-agentic

This is exactly the boundary the user drew. The agent handles natural-language understanding and picking the tool; it does NOT hand-build Telegram UI, and it is not involved in photo uploads.

- Confirm cards: when the agent calls a confirm-required tool, the tool returns a proposal object (amount, resolved recipient, jar, etc.). The runner passes that to the existing `planConfirm` / `confirmCancel(commandId)` machinery. The buttons, the callback routing, and the Confirm tap → `execute()` path are unchanged and deterministic. The agent never emits button JSON.
- Read tools that show buttons (e.g. list-payable-collections → pay keyboard, or a collection picker) return the data; the runner attaches the existing keyboard from `ui/keyboards.ts`. Same rule: the model chooses the action, the deterministic layer draws the UI.
- Photo / bill-split flow stays entirely outside the agent. `photo.handler.ts` → `billParserService.parse` (vision) → `handleBillPhoto` → the same confirm card. No agent loop touches it. Bills are structured input, not conversation.
- So the agent loop is triggered only for a natural-language text message that mentions Talli (group) or any text in DM — exactly as the user specified.

Concretely, `AgentResult` is just today's `DispatchResult` shape, so `render()` in the handler does not change:

```ts
interface AgentResult {
  text: string;                       // the model's final natural-language reply
  keyboard?: InlineKeyboard;          // attached by the runner from ui/keyboards.ts, never by the model
  confirm?: { commandId: string };    // set when a confirm-required tool produced a proposal
  checkoutUrl?: string;
}
```

## 7. What "who has not paid / how much collected / reminders" becomes

This is why the agentic move helps the earlier question (see nlp-group-money-queries.md). Instead of one `status_query` blob, the model gets small, well-described tools:

- `getCollectionProgress(collectionName?)` — how much collected, how many paid.
- `getCollectionRoster(collectionName?, filter: "paid" | "unpaid")` — who paid / who hasn't (for named-member or headcount collections).
- `remindUnpaid(collectionName)` — confirm-required, owner/admin-only, posts a group nudge.

Now "how much have we collected for lunch?" and "did Ope pay?" and "how many savings do I have?" each route to the right tool with the right argument, with no new switch case — the model reads the descriptions and picks. And it can chain: "remind whoever hasn't paid for football" becomes getCollectionRoster(football, unpaid) then remindUnpaid(football), which the old one-shot parser could never do.

## 8. Migration plan (incremental, low risk)

We do not rip out the dispatcher in one commit. Suggested order:

1. Build the `agent/` folder: `define-tool`, `to-ai-tools`, `registry`, `policy`, the runner, and the read-only tools first (get-balance, get-savings, collection-progress, help). These have no money side effects, so they are safe to ship behind a flag.
2. Route only text messages through `runAgent`, keep the confirm/photo/keyboard handlers exactly as they are.
3. Add the confirm-required tools (create-collection, create-jar, save-to-jar, send-money) one at a time, each returning a proposal into the existing confirm card. Verify the money guards fire in a group and in DM.
4. Once parity is proven, delete the old `command-parser` single-shot path and the `prepareIntent`/`planConfirm`/`execute` switches. `intent.schema.ts` and its enum go away; tools are the new surface.
5. Keep `DispatchContext`, `DispatchResult`, `render()`, `confirm.handler.ts`, `keyboards.ts`, and the whole photo flow. Consolidate the 3 places that build `DispatchContext` into one while we are here.

Net result: adding a capability later means adding one file in `tools/` with a good description — no enum, no three switch edits, no parser-prompt surgery. And the bot stops feeling like if/else and starts feeling like an assistant, without giving up a single guardrail or letting AI move money on its own.
