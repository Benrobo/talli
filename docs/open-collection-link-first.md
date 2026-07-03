# Open collections should be link-first, not button-first

## The problem

Collections have two shapes today:

- **Fixed** (`fixed_per_person`) — everyone pays the same set amount, and the owner
  cares who paid (dues, a split where each owes ₦2,000). Per-person tracking matters.
- **Open** (`open_contribution`) — a fundraiser / "go fund me" / open pot. Anyone
  chips in any amount, the owner only cares about the total, and contributors don't
  have to be group members at all.

Right now BOTH go through the same in-chat flow: an inline button in the group.

- Fixed → "Pay ₦2,000" button → taps to a flash account. Correct.
- Open → "Contribute" button → taps `handleContribute` → Talli force-replies "how
  much?" → the reply creates a flash account. This is clumsy for an open pot:

1. The whole point of an open collection is that **anyone can pay, including people
   not in the chat**. An in-chat button only works for people in the group who tap
   it — the exact opposite of "share widely".
2. The owner then has to **separately ask for the link** to share it out.
3. The "Contribute → force-reply → amount" dance adds friction for something that
   the web pay page already does beautifully (name + amount + verify).

We already have a public pay page for it: `WEB_APP_URL/pay/:collectionId`
(`collectionService.payLink`), rendered by the web `pay-page` module, which fully
supports open contributions (enter name + amount → flash account → confirm).

## The proposal (merges the earlier "auto-include link" idea)

Make open collections **link-first**:

- When an **open** collection is created, Talli's confirmation already includes the
  shareable pay link (just shipped) — keep that.
- When someone asks to **pay/contribute** to an **open** collection, Talli surfaces
  the **link** (a tappable URL + an "Open to contribute" URL button), NOT the
  in-chat "Contribute → ask amount" flow. The web page collects name + amount.
- **Fixed** collections are unchanged: the in-chat "Pay ₦X" button + flash account,
  because per-person tracking and a fixed amount make the in-chat tap the right UX.

One sentence: **fixed = pay in chat (button), open = pay on the web (link).**

This isn't a new detection problem — the model already classifies open vs fixed
correctly (it made "Go Fund Me" an open pot). We just branch the pay UX on the type
we already store.

## What changes, file by file

Nothing here changes the money path (checkout, flash account, reconcile, ledger) —
only which surface (in-chat button vs web link) is offered for open collections.

### 1. `payButton()` — `ui/keyboards.ts`
Today: open pot (amount 0) → a `contribute` callback button. 
Change: open pot → a **URL button** to the pay link (`.url("Contribute", payLink)`),
guarded by `isPublicUrl` (falls back to no button on a localhost dev URL). Fixed
stays a `pay` callback button. Add a `payButtonForCollection(collection, payLink)`
helper so callers pass both the amount and the link.

### 2. `listPayableCollections` tool — `agent/tools/`
Today: single collection → `payButton`; multiple → `selectCollectionKeyboard`. 
Change: for a single **open** collection, emit the URL button + include the link in
the returned data so the model can also paste it. For **multiple**, the picker keeps
working (selecting one then routes by type — see #4).

### 3. `selectCollectionKeyboard` + `handleSelectCollection` — `keyboards.ts`, `pay.handler.ts`
When a user picks an **open** collection from the multi-collection picker,
`handleSelectCollection` should reply with the **link** (URL button), not the
`payButton` "Contribute". Fixed picks keep showing "Pay ₦X".

### 4. `handleContribute` — `pay.handler.ts`
Today: the `contribute` callback → force-reply "how much?" → pending →
`continueContribution`. 
Change: with open collections going link-first, the `contribute` **callback becomes
mostly unused**. Options:
- **(a) Keep it as a safety net** — if any old message still has a Contribute button,
  tapping it replies with the link instead of the force-reply flow. Safest for not
  breaking messages already sitting in chats.
- (b) Remove it and the `continueContribution` path. Cleaner, but any Contribute
  button on an already-sent message would go dead.
Recommendation: **(a)** — repoint `handleContribute` to send the link; keep
`continueContribution` for one release in case a pending amount-reply is in flight,
then delete next cleanup.

### 5. Prompt — `soul.ts` / tool descriptions
Add one idea to the pay guidance: *for an open/fundraiser collection, share the link
so anyone can pay (even outside the chat); for a fixed collection, the in-chat pay
button is right.* The tools do the actual surfacing, so this is light steering, not
logic. Keep it short (the soul is deliberately tight).

### 6. `runCreateCollection` — `intent-dispatcher.service.ts` (already done)
Open pots already return the pay link in `collectionCreated` + a button. Once #1
makes the open button a URL button, the created message is fully link-first with no
extra work.

## What must NOT break (seamlessness checklist)

- **Fixed collections**: zero behaviour change — "Pay ₦X" button → flash account.
- **In-flight open contributions**: a pending `pay_collection` clarification (someone
  mid amount-reply) must still settle. Keep `continueContribution` this release.
- **Old messages**: Contribute buttons already sent must not error on tap — #4(a)
  repoints them to the link.
- **Dev/localhost**: URL buttons are dropped when the link isn't public
  (`isPublicUrl`), so dev doesn't render a broken button — fall back to the tappable
  URL in the message text (which also degrades to plain text there).
- **Reconcile / ledger / receipts / announcements**: untouched. A web-paid open
  contribution already flows through the same `checkoutCollectionPay` → reconcile →
  `announcePayment` path, so the group still gets "X contributed ₦Y" and the payer
  still gets a receipt.
- **Web pay page**: already supports open contributions; no change needed.

## The three modes, and where each pays (decided)

| Mode | What it is | Default pay | Link |
|---|---|---|---|
| `named_members` (bill-split) | Receipt split, each picks their items | Link (web) | already the only surface |
| `open_contribution` (fundraiser/pot) | Anyone chips in any amount | Link (web) | highest priority + default |
| `fixed_per_person` (dues) | Everyone pays a set amount, owner tracks who | In-chat button | secondary, on-demand + shown beside the button with a warning |

Open pots follow the bill-split model — link-first — because for both, anyone (incl.
non-members) should be able to pay from anywhere. Bill-split already proves the pattern.

### Open (`open_contribution`) — link is default AND top priority
- Create → confirmation shows the link (done) + no in-chat amount flow.
- "I want to pay / contribute" → Talli surfaces the link (tappable URL + an
  "Open to contribute" URL button). No in-chat "Contribute → ask amount".
- The `contribute` callback / `continueContribution` amount-flow is retired for open
  pots (kept one release only so any in-flight amount-reply still settles).

### Fixed (`fixed_per_person`) — in-chat is default, link is on-demand with a warning
- "I want to pay" → the in-chat Pay-amount button (unchanged), shown together with a
  short note that a link exists but paying via link can't be tied to the group member.
- The link is also given when the owner explicitly asks for it.
- The warning must be TRUE — verified against the code:
  - In-chat pay (`handlePay`) records the payer's Telegram identity
    (`platformUserId` + `payerPlatformUserId`), so the group is told "Samuel from
    this group paid" and can @-tag them.
  - Web/link pay (`checkoutCollectionPay`) only has the name the payer typed — no
    identity. So we can only announce "Samuel paid" by that typed name; we can't
    confirm it's the group-member Samuel.
  - Warning copy (fixed only): "You can also share this link — but if someone pays
    through it, I can only confirm the name they enter, not that it's you from this
    group. Tapping Pay here keeps it tied to you."

### Presentation
- Link is a tappable URL in the text (copy/forwardable) AND, when public, an inline
  URL button — matching the create message. Dev/localhost drops the button and the
  URL degrades gracefully (already handled by `isPublicUrl`).

## Bill-split stays as-is
It is `named_members` and already link-first (web page collects who-had-what + pay).
No change — it is the template the open-pot flow now matches.
