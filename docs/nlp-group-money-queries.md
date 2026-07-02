# Group money queries & reminders in NLP

**Status:** design discussion
**Scope:** the chat NLP commands `who has (not) paid?`, `how much have we collected?`, and `remind (unpaid) people` — for group collections.
**Grounded in:** `services/engine/src/services/intent-dispatcher.service.ts`, `command-parser`, `intent.schema.ts`, `collection.service.ts`, `CollectionMember` model.

---

## 1. Why this needs a design, not just a prompt tweak

Three questions look similar but have very different feasibility, and the honest answer is: **one of them is easy, one is easy-but-needs-a-new-intent, and one ("who has NOT paid") is genuinely hard given how the data model works today.**

### 1.1 What the code does now

- `intent.schema.ts` has a single **`status_query`** intent. Every "money question" collapses into it.
- `intent-dispatcher.runStatusQuery()` ignores the actual question. It just calls `balanceService.overview(userId)` and dumps either a collections overview (group) or a balance (private). So "who hasn't paid?", "how much collected?", and "did Ope pay?" all return the **same** generic overview. There is no per-collection, per-member answering.
- The confirm-path `status_query` branch literally returns `messages.unrecognized`.

So today these queries don't really work — they return a blob. That's the first thing to fix.

### 1.2 The hard part: there is no roster of who *should* pay

`CollectionMember` rows are created **pay-to-enroll** — `collection.service.upsertMember()` says *"creating them on first sight… the tap is the trusted identity."* A member row only exists once someone **taps Pay**.

Consequence for a "collect ₦3,000 from everyone in this group" collection:

| Question | Answerable today? | Why |
|---|---|---|
| How much have we collected? | ✅ Yes | Sum of `paidAmount` across existing members. No roster needed. |
| Who **has** paid? | ✅ Yes | List members with `status = paid`. They exist because they paid. |
| Did **Ope** pay? | ⚠️ Partial | Only if Ope tapped Pay (so a row exists) or is a named member. Otherwise "no record." |
| Who has **not** paid? | ❌ Not really | We don't know the denominator. "Everyone in the group" isn't a list Talli holds. A member who never interacted has **no row**, so there's nothing to report as unpaid. |
| Remind unpaid people | ❌ Blocked by the above | Can't remind people we can't enumerate; and Telegram bots can't DM users who haven't messaged the bot. |

This is the real question the user flagged: **"I'm not sure we can do who has not paid."** They're right — not without changing how the roster is established. Below are realistic ways to make each one work, from cheapest to most complete.

---

## 2. Split `status_query` into real, resolvable intents

Regardless of the roster question, step one is to stop collapsing everything into one blob. Proposed intents (extend `INTENTS` in `intent.schema.ts`):

- `collection_progress` — "how much have we collected / how much remains / how many paid" → aggregate numbers.
- `collection_roster` — "who has paid / who hasn't paid / did X pay" → per-member listing, with a `filter` field (`paid` | `unpaid` | a specific `name`).
- `remind_unpaid` — "remind people who haven't paid / nudge defaulters" → action, owner/admin-only, confirmation-gated.

Add optional fields to `intentSchema`: `target` (collection name/purpose, already present) and a `rosterFilter: "paid" | "unpaid" | "all"` plus reuse `recipientName` for "did X pay?". The parser prompt gets examples for each. `status_query` can stay as the fallback for vague "what's my status" questions.

The dispatcher then routes each to a dedicated resolver against **one specific collection** (resolved from `target`, or the single active collection in the chat, or a disambiguation prompt when there are several — mirror the existing `runPayCollection` multi-collection picker pattern).

This alone makes "how much have we collected?" and "who has paid?" work properly. The rest of this doc is about closing the "who has NOT paid" gap.

---

## 3. Options for "who has not paid?" (the denominator problem)

We need a **roster** — the set of people expected to pay — to compute `expected − paid = unpaid`. Four realistic ways to get one, which can coexist (a collection picks a mode at creation).

### Option A — Named-member collections (already half-built, ship this first)

The PRD already defines a `named_members` collection type, and `collection.service.addMember()` already exists. If the admin says:

```
Collect ₦5,000 from Tolu, Ope, Daniel and Mary for the jersey
```

the parser captures `payerNames` (that array field **already exists** in `intent.schema.ts` for bill-split) and we pre-create one `CollectionMember` per name with `status = not_paid`. Now the roster is explicit, so:

- **who hasn't paid** = members where `status != paid`. ✅
- **how much remains** = `Σ expected − Σ paid`. ✅
- **remind** = we have the names to list. ✅ (delivery caveat in §4)

**Cost:** small. New collection type in the create flow + map `payerNames` → member rows. No new infra. **This is the highest-leverage, most realistic first step** and makes the demo's "who hasn't paid" real for named collections.

**Limitation:** doesn't cover "everyone in the group" — you must name people. That's the honest tradeoff, and for treasurer use cases (dues, jersey money, committee) naming people is normal.

### Option B — Roster snapshot from the group at creation time

For "from everyone", capture the group's member list when the collection is created and freeze it as the roster.

**Reality check — this is where it gets shaky:** Telegram bots **cannot list all members of a group** via the Bot API (no `getChatMembers`). They can only see `getChatMemberCount` and users who have interacted. So "everyone in the group" is **not enumerable** by a bot. This option is largely **not feasible on Telegram** and should be documented as such, not promised. (WhatsApp Cloud API is worse for this.)

Verdict: **reject for MVP** as a general solution; keep the note so nobody re-proposes it expecting it to work.

### Option C — Expected headcount + implicit unpaid ("N of M paid")

Cheapest way to give a *useful* "who hasn't paid" answer for "everyone" collections without a name roster: let the admin declare a **headcount** at creation.

```
Collect ₦3,000 from everyone for football — we're 12 people
```

Store `expectedMemberCount = 12`. Then:

- **progress** = "8 of 12 paid, ₦24,000 of ₦36,000." ✅ real and useful.
- **who hasn't paid** = we can't name them, but we can say *"4 people haven't paid yet"* and list the **names we DO have** who are marked unpaid (named members / people who started but didn't finish). Honest and demo-friendly.
- **remind** = post a public nudge in the group ("4 of you still owe ₦3,000 — [Pay]") rather than DMing individuals. ✅ works within Telegram's constraints.

**Cost:** one integer field + parser captures the headcount. Good ROI. Pairs well with Option A (named people show individually, the rest as a count).

### Option D — Enrollment step ("join this collection")

Make paying a two-phase thing: members first **tap "I'm in"** (enroll → `not_paid` row), then pay later. The roster becomes everyone who opted in.

**Cost:** medium — new enroll button, new member state, more group-chat noise, and it changes the pay UX. Better for recurring dues than one-off collections. **Post-MVP**; note it as the "proper" long-term answer for standing groups.

---

## 4. "Remind people who have not paid" — delivery reality

Even with a roster, **how** you remind matters and is constrained:

- **Telegram private DM to a specific user:** only possible if that user has **already started a chat with the bot** (has a known `platformUserId` from a prior interaction). You cannot cold-DM a group member. So targeted DM reminders only work for people who've touched the bot.
- **Group @-mention nudge (recommended default):** the bot posts one message in the group that @-mentions the unpaid named members (or states "4 people still owe") with the `[Pay]` button. Works within platform limits, no DM permission needed. This should be the MVP reminder mechanism.
- **Web-dashboard-triggered reminders:** owner hits "Remind unpaid" in the dashboard; same group-post mechanism.

**Rules to enforce (from PRD §8.7):** `remind_unpaid` is owner/admin-only in groups, must be confirmation-gated (don't spam on a mis-parse), and should be rate-limited per collection (e.g. once per N hours) to avoid nagging. Record it in `bot_commands`/audit.

---

## 5. Recommended path (realistic, staged)

1. **Split the intent** (§2): add `collection_progress`, `collection_roster`, `remind_unpaid`; give each a real resolver against a specific collection. This immediately makes *"how much have we collected?"* and *"who has paid?"* correct — both are answerable with today's data. **Do this first; it's pure win, no model gap.**
2. **Ship named-member collections** (Option A): pre-create members from `payerNames`. Now *"who hasn't paid?"* and *"remind unpaid"* are **fully real** for named collections — the strongest, most honest demo. Reuses fields/methods that already exist.
3. **Add expected headcount** (Option C) for "everyone" collections: gives an honest *"N of M paid / 4 haven't paid yet"* plus a public group nudge, without pretending to enumerate a Telegram group.
4. **Reminders** = group @-mention post (§4), owner/admin-only, confirmed, rate-limited. Targeted DM only for members with a known `platformUserId`.
5. **Document Option B as infeasible** (bots can't list group members) and **Option D (enroll-first) as post-MVP** for recurring dues.

### What we explicitly do NOT promise
- "Who hasn't paid?" for an **unrostered** "everyone" collection returning **named individuals** — impossible on Telegram. We answer with counts + the names we do have, and that's the honest ceiling.
- Cold DM reminders to group members who never messaged the bot.

---

## 6. Concrete next changes (when we build it)

- `intent.schema.ts`: add the three intents + `rosterFilter`; keep `status_query` as fallback.
- `command-parser` prompt: add labeled examples for progress vs roster vs remind, and for "did X pay?" (fills `recipientName`).
- `intent-dispatcher`: replace the single `runStatusQuery` with `runCollectionProgress`, `runCollectionRoster`, `runRemindUnpaid`; resolve the target collection (reuse the multi-collection picker from `runPayCollection`).
- `collection.service`: `progress(collectionId)` (paid/expected/count), `roster(collectionId, filter)`, `unpaidMembers(collectionId)`; support creating members from `payerNames`; add `expectedMemberCount` to `Collection` for headcount mode.
- `messages.ts`: templates for progress card, roster list (paid ✓ / unpaid •), and the reminder nudge.
- Guardrails: `remind_unpaid` owner/admin-only + confirm + per-collection cooldown + audit log.
