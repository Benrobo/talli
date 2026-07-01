# NL command parser — design

Turning chat messages ("collect ₦5,000 from the group", "send ₦10k to Tolu",
"save ₦2,000 to rent") into structured, validated, confirmed actions across
**all** Talli flows — collections, savings, send. Backend only.

Follows the existing AI pattern (`scribe` + Talli's `services/ai`): typed prompt
templates → `ai.generate(...)` → `cleanLLMJson(...)` → Zod-validate → act, wrapped
in `async-retry`. The LLM **only parses intent**; the deterministic services
(already built for collections/payments) do the money. Nothing moves without an
explicit user confirm.

---

## 1. The flow

```
chat message
  → [gate] linked? group vs DM allowed? (per-intent)
  → bot_command row (status: received)
  → AI parse: prompt → ai.generate → cleanLLMJson → Zod schema
       → status "needs_clarification" / unparseable → ask back with its reason
  → resolve references (beneficiary "Tolu" → account; member names)
       → missing details → ask back, keep the partial intent
  → build a confirm card (parse-and-confirm) → user taps Confirm
  → call the deterministic service (collection / payment / transfer)
  → bot_command status: parsed → confirmed | rejected | failed
```

The parse step is **one** parser that classifies into an intent, then dispatches
to the right handler. Validation is a real step (Zod + business rules), not an
afterthought.

---

## 2. Intents (all CRUD, one schema)

One flat schema: the intent name + every field any intent might use, all
optional. The parser only checks the *shape*; each handler checks the fields *it*
needs (a missing one triggers the ask-back, §7 — so the schema must NOT reject
incomplete intents). Add a field here when a new intent needs it.

```ts
// schemas/intent.schema.ts
export const intentSchema = z.object({
  intent: z.enum([
    "create_collection", "create_jar", "save_to_jar",
    "send_money", "status_query", "unknown",
  ]),
  // does the bot have enough to act, or should it ask back?
  status: z.enum(["ready", "needs_clarification"]),
  clarification: z.string().optional(),  // set when status = needs_clarification: what to ask / why

  amount: z.number().int().positive().optional(),
  title: z.string().optional(),          // collection title / jar name
  recipientName: z.string().optional(),  // "Tolu" — resolve via phone book
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  target: z.string().optional(),         // status_query subject
});
export type Intent = z.infer<typeof intentSchema>;
```

No confidence score — a model can't calibrate a 0–1 number honestly, and we'd
only ever threshold it anyway. Instead the model says plainly whether it's
`ready` or `needs_clarification`, and if the latter, a `clarification` string the
bot asks back verbatim ("Which jar — rent or savings?"). `intent: "unknown"` is
the couldn't-understand case (rephrase). Handlers still re-check their own
required fields as a safety net.

Why flat, not a discriminated union: the model's output is fuzzy and often
*incomplete* on purpose (no amount yet → ask back). A union would make parse
*fail* on a half-filled `send_money`; we want it to parse and let the handler ask
for the missing piece.

---

## 3. The AI call — exact existing pattern

Talli already has `ai.generate(prompt, { model?, temperature?, maxTokens? })` and
`cleanLLMJson(...)`. We add a `data/prompts/` dir (scribe-style `createPrompt`)
and a `command-parser.service.ts`. No new AI infra.

```ts
// data/prompts/command-parser.prompt.ts  (scribe createPrompt template)
export const commandParserPrompt = createPrompt<{
  message: string; context: string; allowedIntents: string;
}>(`
You are Talli's command parser. Convert the user's message into ONE intent JSON.

Context: {{context}}
Allowed intents (only these): {{allowedIntents}}

Return ONLY valid JSON for one intent, with "status": "ready" or
"needs_clarification". If a required detail is missing, set
"needs_clarification" and put the question in "clarification".
If you can't tell what they want at all, use "intent":"unknown".

Message: "{{message}}"
`);
```

```ts
// services/command-parser.service.ts  (thin — logic here, mirrors scribe engines)
async parse(message: string, ctx: ParseContext): Promise<Intent> {
  const prompt = commandParserPrompt.replace({
    message,
    context: this.contextBlock(ctx),                 // workspace, chat type, known jars/beneficiaries
    allowedIntents: ctx.allowedIntents.join(", "),   // ← group/DM gating happens here (§5)
  });

  return retry(async () => {
    const raw = await ai.generate(prompt, { temperature: 0.1, maxTokens: 1024 });
    const json = cleanLLMJson({ response: raw, requiredFields: ["intent"] });
    return intentSchema.parse(json);                  // ← validation step
  }, { retries: 2, minTimeout: 500 });
}
```

> When modelkit is wired (it's a placeholder today), swap to a feature id
> (`ai.command.parse`) exactly like scribe's `getModelForFeature`. Until then,
> `ai.generate` defaults (Gemini Flash + fallbacks) are used.

---

## 4. The beneficiary "phone book" (your idea)

The model has no idea of recipient account details. So the **workspace keeps a
phone book** of past/saved recipients; the parser resolves a name against it. If
not found, the bot asks for the details and saves them for next time.

New table:

```prisma
/// Saved transfer recipients per workspace — the "phone book". Populated when a
/// user completes a transfer (or adds one explicitly), so "send to Tolu" resolves
/// to a known account instead of re-asking every time.
model Beneficiary {
  id            String   @id @default(cuid())
  workspaceId   String
  workspace     Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  alias         String   /// "Tolu", "mum" — what people call them in chat
  accountName   String   /// verified via Nomba bank lookup
  accountNumber String
  bankCode      String
  createdByPlatformUserId String?
  lastUsedAt    DateTime @default(now())
  @@unique([workspaceId, alias])
  @@index([workspaceId])
  @@map("beneficiaries")
}
```

Resolution flow for `send_money`:

```ts
// 1. did the model give raw account details? verify + offer to save
// 2. else resolve the name against the phone book
const match = await beneficiaryService.findByAlias(workspaceId, intent.recipientName);
if (!match) {
  // ask back — keep the partial intent in bot_command.parsedIntent
  return bot.ask(`I don't have "${intent.recipientName}" saved. Reply with the account number and bank.`);
}
// 3. confirm card uses match.accountName (Nomba lookup already verified at save time)
```

So the model never needs to know account numbers — it extracts the *name*, and
the phone book (deterministic) turns it into a real account. New recipients get
saved on first successful transfer.

---

## 5. Group vs DM behaviour

The bot behaves differently by chat type. **Sending/transfers are DM-only** —
never in a group (you don't broadcast a personal payout). Collections live in
groups; saving + sending are personal.

The gate is enforced two ways — at parse time (limit allowed intents) and at
execute time (defence in depth):

```ts
const DM_ONLY: Intent["intent"][]   = ["send_money", "save_to_jar", "create_jar"];
const GROUP_OK: Intent["intent"][]  = ["create_collection", "status_query"];

function allowedIntents(chatType: "private" | "group") {
  return chatType === "group" ? GROUP_OK : [...GROUP_OK, ...DM_ONLY];
}

// execute-time guard (even if the model ignores the prompt)
if (chatType === "group" && DM_ONLY.includes(intent.intent)) {
  return bot.reply("That can only be done in a private chat with me. DM me to continue.");
}
```

Passing `allowedIntents` into the prompt means the model won't even propose a
send in a group; the execute-time check is the safety net.

---

## 6. Layers to add (everything new, follows existing conventions)

| Layer | New | Mirrors |
|---|---|---|
| Schema | `beneficiaries` table; reuse `bot_commands` (already exists) | collection/payment migrations |
| Prompts | `data/prompts/command-parser.prompt.ts` (+ `createPrompt` helper, scribe-style) | scribe `data/prompts/` |
| Intent schema | `schemas/intent.schema.ts` (Zod discriminated union = validation) | `collection.schema.ts` |
| Service | `command-parser.service.ts` (parse), `beneficiary.service.ts`, `intent-dispatcher.service.ts` (intent → existing services) | `collection.service.ts`, scribe engines |
| Bot | `message.handler.ts` linked-chat branch → parser → confirm card; reuse `confirmCancel` keyboard + `pay`/`confirm`/`cancel` callbacks | existing handlers/ui |
| AI | none — reuse `services/ai` + `cleanLLMJson`; later add `ai.command.parse` modelkit id | — |

Dispatcher maps an intent to a **service we already built**:
`create_collection → collectionService.create`, `send_money →
transferService.send` (new, wraps `nomba.transfers`), `save_to_jar →
savingsService.deposit` (next slice).

---

## 7. Conversation state (asking back)

When info is missing (no amount, unknown recipient), we don't drop the intent —
store it on the `bot_commands` row (`parsedIntent` JSON, `status: received`) and
treat the user's next message as the answer. Minimal state machine: a chat has at
most one pending `bot_command`; the next message either fills the gap or starts
fresh.

```
parse → missing field → save partial intent (status: received) → ask
next msg → merge answer → re-validate → confirm card → execute
```

---

## 8. Build order

1. `createPrompt` helper + `command-parser.prompt.ts` + `intent.schema.ts`.
2. `command-parser.service.ts` — parse + validate. Test with a script over
   sample messages (no bot needed), like the smoke scripts.
3. `intent-dispatcher` for the **two intents already buildable**
   (`create_collection`, `status_query`) → confirm card → existing services.
4. `beneficiaries` table + `beneficiary.service.ts` + the ask-back flow.
5. `transferService` (wraps `nomba.transfers`, DM-only) → `send_money`.
6. Savings intents when the savings slice lands.

Each step testable by script before wiring the live bot.

---

## 9. Out of scope (now)

- Multi-turn agents / tool-calling — this is single-shot parse + confirm.
- Voice / image messages.
- modelkit feature-flagging (use `ai.generate` defaults until it's wired).
- Frontend.
