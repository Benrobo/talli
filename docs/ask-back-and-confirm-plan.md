# Ask-back, confirm, and admin-gated actions — design

How Talli handles a multi-turn command: the bot asks for missing/verification
info, the user answers, and the action runs only after an explicit confirm. Plus
making a group confirm card **admin-only** to act on. Backend + Telegram only.

Decisions locked (this is the build spec, not options):
- **Ask-back stays** — needed for missing fields AND verification ("is X = Y?").
- **Group** → ask with **`force_reply`**; match the answer by `reply_to_message`
  AND the replier's id (force_reply + sender match).
- **DM** → no force_reply; the **next message is the answer** (1:1 has no ambiguity).
- **Group + vague** → ask. Otherwise → show a **confirm card** (proceed/cancel).
- **Admin-gated cards** → the card is posted to the group (Telegram can't hide a
  message), but only the initiator can tap; others tapping are **silently ignored**.

---

## 1. The gap today

`intent-dispatcher` already *records* a pending command on `needs_clarification`
and asks the question — but **nothing reads it back**. `message.handler` re-parses
every message from scratch, so the user's answer becomes a new (usually `unknown`)
command and the original intent is lost. The conversation state is write-only.

---

## 2. The two-turn flow

```
turn 1: "@bot collect 5000 from everyone"
   parse → needs_clarification? 
     GROUP → reply WITH force_reply, store pending (clarifyMessageId, askedBy)
     DM    → reply normally, store pending (askedBy)
turn 2: user answers
   GROUP → must be a reply to the bot's question (reply_to_message == clarifyMessageId)
           AND from the same user (askedBy) → else treat as a fresh command
   DM    → the next message from that user IS the answer
   → re-parse: original message + "you asked '<clarification>', they replied '<answer>'"
   → now ready? → confirm card.  still missing? → ask again (loop, capped).
```

The re-parse feeds the LLM the original text + the Q&A so it completes the intent
(fills the amount, verifies the recipient, etc.) — verification works the same way
("is this the right Tolu? yes" merges into a confirmed recipient).

---

## 3. Conversation state (extend `bot_commands`)

`bot_commands` already has `parsedIntent`, `status`, `linkedChatId`,
`senderPlatformId`. Add two columns for the matching:

```prisma
model BotCommand {
  // ...existing...
  clarifyMessageId Int?     /// telegram message id of the bot's force_reply question (group match)
  askedBy          String?  /// senderPlatformId the question was directed at
}
```

A chat has at most **one pending** command per (chat, sender), status `received`.
On answer it transitions to `parsed` (ready → confirm) or stays `received` (still
missing). TTL: a pending older than ~10 min is abandoned (the next message starts
fresh). `/cancel` clears it.

Service additions (`bot-command.service.ts`):
- `findPendingForReply(linkedChatId, senderPlatformId, replyToMessageId?)` —
  group: requires the reply id to match `clarifyMessageId` and sender to match
  `askedBy`; DM: just the latest `received` for that sender.
- `recordClarification(ctx, intent, clarifyMessageId, askedBy)` — store the ask.
- (existing `updateIntent`, `getIntent`, `setStatus`.)

---

## 4. Message handler — wire the read-back

`message.handler` gains a pre-step before the normal parse:

```ts
const pending = await botCommandService.findPendingForReply(
  linked.id, senderId, ctx.message?.reply_to_message?.message_id
);
if (pending) {
  // this message is the answer to a clarification
  const result = await intentDispatcherService.continue(pending.id, text, ctx);
  return render(result);
}
// else: normal new-command path (existing)
```

`dispatcher.continue(pendingId, answer, ctx)`:
1. load pending + its stored intent + original rawText
2. re-parse with the answer merged as context
3. ready → confirm card; still missing → ask again (force_reply in group); too
   many rounds → give up gracefully.

---

## 5. Asking in a group (force_reply)

When the dispatcher returns a clarification for a **group**, the handler sends it
with `force_reply` and records the sent message id:

```ts
const sent = await ctx.reply(clarification, {
  reply_markup: { force_reply: true, selective: true },
});
await botCommandService.recordClarification(ctx, intent, sent.message_id, senderId);
```

`selective: true` force-replies only the addressed user. In a DM we skip
force_reply (every message is already directed at the bot).

---

## 6. Admin-gated confirm cards

The confirm card (e.g. "Create collection — proceed?") is posted to the group so
everyone *sees* it, but only the initiator may act. Telegram has no true
per-user-visible message; we gate the **callback**, not the message.

- The confirm/cancel `callback_data` already carries the `bot_command.id`. That
  command row stores `senderPlatformId` (who started it).
- In `callback.handler`/`confirm.handler`, before acting:

```ts
const command = await botCommandService.get(commandId);
if (command.senderPlatformId !== String(ctx.from.id)) {
  await ctx.answerCallbackQuery();   // silent ignore — others can't act
  return;
}
// authorized → proceed (execute) / cancel
```

So a non-initiator tapping Proceed/Cancel gets a silent no-op (their tap is
acknowledged so the spinner clears, but nothing happens, no group spam). On the
admin's Proceed → execute → post the live collection announcement to everyone
(the existing `collectionCreated` / pay-button message).

Admin-only at creation is already enforced upstream (only group admins reach the
collection flow); this adds per-card initiator-locking on top.

---

## 7. Vague-vs-clear in a group

"Vague" = parser returns `needs_clarification` (missing a required field or a
verification it wants confirmed). "Clear" = `ready`. So the existing parser status
already decides: vague → ask (§5), clear → confirm card (§6). No separate
heuristic needed — `status` is the signal.

---

## 8. Build order

1. Schema: add `clarifyMessageId`, `askedBy` to `bot_commands`; migrate.
2. `bot-command.service`: `findPendingForReply`, `recordClarification`, `get`.
3. `dispatcher.continue(pendingId, answer, ctx)` — merge-reparse loop (cap rounds).
4. `message.handler`: pending pre-step → `continue`; send group clarifications with
   force_reply and record the message id.
5. `confirm.handler`/`callback.handler`: initiator-gate (silent ignore for others).
6. Parser prompt: keep verification clarifications; allow re-parse to consume the
   prior Q&A.
7. Type-check + script test the two-turn flow (group reply-match + DM next-message)
   and the initiator gate.

---

## 9. Out of scope

- True hidden-from-group messages (Telegram limitation; would need DM handoff).
- Multi-user simultaneous setup on the SAME pending command.
- Frontend.
