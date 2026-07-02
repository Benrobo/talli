# Telegram reply handling — new approach

## The problem with the old approach

Talli only engaged with a group reply if that reply matched a **stored pending
clarification** — we saved the `message_id` of a `force_reply` question and, on the
user's reply, looked for a `botCommand` whose `clarifyMessageId` equalled
`reply_to_message.message_id` and whose `askedBy` was the sender.

That coupling made replies silently dead in the common case:

- It only worked if the model asked its question via the `askForDetails` tool
  (which is the only path that stores a `clarifyMessageId` + sends a `force_reply`).
- The model frequently answered in **plain text** instead (`tools: none`), e.g.
  "Sure — which collection is it for?". A plain reply is recorded as a terminal
  `recordConversational` row: no `clarifyMessageId`, no `force_reply`.
- So when the user quote-replied to that message, `findPendingForReply` returned
  `null`. In a group the handler then hit `if (isGroup && !mentioned && !pending)
  return;` and **did nothing** — no response at all.

In short: engagement depended on our own bookkeeping being perfect, and it wasn't.

```ts
// OLD — engagement gated on a stored pending row
const pending = await botCommandService.findPendingForReply(
  linked.id, senderId, isGroup, ctx.message?.reply_to_message?.message_id
);
if (isGroup && !mentioned && !pending) return; // ← plain-text replies die here
```

## The new approach: replying to Talli *is* addressing Talli

Telegram already tells us who authored the message being replied to. If a user
quote-replies to a message **from our bot**, that is an unambiguous "I'm talking to
you" — the same signal as an `@mention`. We don't need any stored message id.

```ts
/** True when the message quotes one of Talli's OWN messages. */
function isReplyToBot(ctx: TalliContext): boolean {
  const repliedTo = ctx.message?.reply_to_message;
  // ctx.me is the bot's own User (populated by grammY).
  return !!repliedTo?.from?.is_bot && repliedTo.from.id === ctx.me?.id;
}
```

Engagement becomes: **mentioned OR reply-to-bot OR (it's a DM)**.

```ts
const mentioned  = !!ctx.message?.text?.match(MENTION);
const replyToBot = isReplyToBot(ctx);

// In a group, engage only when addressed.
if (isGroup && !mentioned && !replyToBot) return;
```

### Two independent concerns, no longer tangled

The old code conflated *"should I engage?"* with *"is this answering a pending
action?"*. They're now separate:

1. **Engagement** — decided by `mentioned || replyToBot || DM`. Simple, robust,
   depends only on Telegram-provided facts.
2. **Continuation** — if a reply happens to match a still-open `askForDetails`
   clarification, we continue that action (`continue()`); otherwise it's a fresh
   agent turn. Either way we already decided to engage, so a mismatch just means
   "treat it as a new message" instead of "ignore it entirely".

```ts
const pending = await botCommandService.findPendingForReply(
  linked.id, senderId, isGroup, ctx.message?.reply_to_message?.message_id
);

// The quoted Talli line is handed to the agent so it has the thread.
const quoted = replyToBot ? ctx.message?.reply_to_message?.text?.trim() : undefined;

const result = pending
  ? await intentDispatcherService.continue(pending.id, text, dispatchCtx)
  : await intentDispatcherService.handleMessageAgent(text, dispatchCtx, quoted);
```

### Giving the agent the thread

Because a plain reply is now a fresh agent turn, the model needs to know **what it
is replying to**. We pass the quoted Talli message into the context block:

```ts
// contextSummary(parseCtx, quotedTalliMessage)
if (quotedTalliMessage) {
  lines.push(`They replied to this message of yours:\n"${quotedTalliMessage}"`);
}
```

So if Talli said "which collection is it for?" and the user replies "the lunch one",
the agent sees both the quoted question and the answer, and can call
`listPayableCollections` / the pay tool with the right target.

## Why this is safer

- **No self-loop risk.** A user reply always has `ctx.from = the human`; the bot
  never programmatically "replies to its own message" on a user's behalf, so this
  can't make Talli talk to itself.
- **No dependence on model behaviour.** Whether the model used `askForDetails` or
  just typed a question, replying to it engages Talli. `askForDetails` is now an
  *optimization* (it lets `continue()` resume a specific action) rather than the
  *only* thing that makes replies work.
- **Matches user intuition.** In every chat app, replying to someone is how you
  talk to them. We now honour that literally.

## What `askForDetails` still buys us

`force_reply` + a stored `clarifyMessageId` is still worth keeping for genuine
"I need one specific value to finish this action" moments: it pops the reply box
automatically and lets `continue()` resume the *exact* pending action (open-pot
contribution amount, a collection name, etc.). It's just no longer load-bearing for
basic responsiveness.

## Observability

Both paths now log, so a dead reply is diagnosable at a glance:

```ts
// message.handler.ts
logger.info(
  `[telegram] msg chat=${chatId} scope=${scope} mentioned=${mentioned} ` +
  `replyToBot=${replyToBot} pending=${pending ? pending.id : "none"} text=${JSON.stringify(text)}`
);

// runner.ts (dev only) — full JSON of what the model did
debugInDev((_, saveToFile) => {
  console.log(`\n[agent] response:\n${JSON.stringify(trace, null, 2)}\n`);
  saveToFile("agent-response.txt", JSON.stringify(trace, null, 2));
});
```

`trace` includes `toolCalls` (with args), `proposal`, `clarify`, and `reply`, so
`tools: none` on a request that should have hit a tool is immediately visible.
