# Split payment — design

Splitting money across people, beyond the current "everyone pays the same"
collection. Three split styles, paid via shareable checkout links so anyone can
pay without being on Telegram/WhatsApp, with all updates routed back to wherever
the split was created.

## The DB already supports it

A collection's members each carry their **own** `expectedAmount` — never forced to
be uniform. The `named_members` collection type and `addMember(displayName,
expectedAmount)` already exist. So splits need no schema change — only:

1. the **parser** to understand split phrasings, and
2. a **create flow** that seeds members with the right per-person amounts.

```prisma
// already exists — expectedAmount is PER MEMBER
model CollectionMember {
  displayName    String
  expectedAmount Int     // each person can owe a different amount
  paidAmount     Int     @default(0)
  status         CollectionMemberStatus
}

enum CollectionType {
  fixed_per_person   // current: everyone pays amountPerMember
  open_contribution
  named_members      // splits use this: explicit members, each with their own amount
}
```

## The three split styles

### 1. Even split — "split 30k between Tolu, Ada and me"
Total ÷ number of people. Odd naira (₦30,000 ÷ 3 is exact, but e.g. 10,000 ÷ 3 isn't)
go to the first member so the parts always sum to the total.

```
split ₦30,000 between Tolu, Ada, me
  → Tolu ₦10,000 · Ada ₦10,000 · You ₦10,000
```

### 2. Custom amounts — "Tolu owes 10k, Ada 5k, Bola 15k"
Each named person gets their exact stated amount; the sum is the target.

```
Tolu 10k, Ada 5k, Bola 15k
  → Tolu ₦10,000 · Ada ₦5,000 · Bola ₦15,000  (target ₦30,000)
```

### 3. Split a bill by N — "split the 30k bill 3 ways"
Equal share, no names — a per-head amount and a headcount. This is today's
`fixed_per_person`: `amountPerMember = total / N`, members enroll by paying.

```
split ₦30,000 3 ways
  → ₦10,000 per person, 3 expected
```

## Parser shape

The flat intent schema gains a split style + a members array.

```ts
intent: "split_payment"
mode: "even" | "custom" | "by_count"
amount: 30000            // total (even / by_count)
count: 3                 // by_count only
members: [               // even / custom
  { name: "Tolu", amount?: 10000 },
  { name: "Ada",  amount?: 5000  },
  { name: "me" }         // resolved to the sender
]
```

- **even**: `amount` + names → divide.
- **custom**: each member's `amount` → sum is the target.
- **by_count**: `amount` + `count` → per-head = amount / count, no names.

Decisions:
- **"me" / "myself"** → the sender becomes a member too.
- **Name resolution** → store the display name; bind to a real identity when that
  person actually pays (same as today's pay-to-enroll). No pre-tagging required.
- **Custom amounts** are taken as stated; the computed total is just the sum.

## Create flow

```
"@bot split 30k between Tolu, Ada and me"
  parser → split_payment (mode + total/amount + members[])
  → resolve "me" to the sender, compute each member's expectedAmount
  → confirm card: the breakdown (each person + amount) → admin proceeds
  → create a named_members collection, addMember() per share
  → mint one checkout link per share (see below)
  → post the breakdown + each share's pay link to the home channel
```

The **payment + reconcile side is unchanged** — once members exist with their
amounts, the existing reconcile → credit loop already reads `expectedAmount` per
member.

---

## Bill from an image (vision parsing)

Instead of typing the amount, the user **pastes a photo of the bill** (a restaurant
receipt, an invoice) and Talli reads the total off it, then splits from there.

```
user sends a photo of a ₦30,000 restaurant receipt
  caption: "@bot split this between Tolu, Ada and me"
  → Talli OCR/vision-parses the image → total ₦30,000 (+ line items if useful)
  → same split flow as above: even between the 3 named people
  → confirm card shows the extracted total so the user can correct it
```

What it needs (this is net-new infra, but small):
- **Receive the photo** — add a `message:photo` handler (today only `message:text`
  is handled) and download the Telegram file to a buffer.
- **Vision parse** — `ai.generate` is text-only today, but the underlying AI SDK is
  multimodal; add an image-capable call (e.g. `ai.parseImage(buffer, prompt)`) that
  asks the model for the bill **total** (and optionally currency + line items),
  returned as structured JSON. Use a vision-capable model via
  `getModelForFeature("ai.bill.parse")`.
- **Hand off to the split parser** — feed the extracted total + the caption ("split
  this between Tolu, Ada, me") into the normal `split_payment` flow. The image only
  supplies the **amount**; the caption supplies the **mode + people**.

Rules:
- **Always confirm the extracted total** on the card before creating anything —
  vision can misread. The user can tap to correct the amount.
- **Caption optional:** photo with no caption → ask "How do you want to split this
  ₦30,000?" (falls into the normal ask-back flow).
- Scope: extract the **total to split**, not a full itemized ledger (line items are
  a nice-to-have for the card, not required).

---

## Paying a share: checkout links (platform-free)

The payer does **not** need to be on Telegram or WhatsApp. Each share gets a
hosted Nomba checkout URL the creator forwards through any channel; identity is
**which order the money settled**, not who they are in chat.

`createOrder` already returns a `checkoutLink` we currently discard:

```ts
// src/integrations/nomba/resources/checkout.ts
interface CreateCheckoutOrderResult {
  checkoutLink: string;     // hosted Nomba pay page — already returned
  orderReference: string;   // the order key reconcile already uses
}
```

```
"split 30k: Tolu 10k, Ada 5k, Bola 15k"
  → per share, createOrder(amount) → { checkoutLink, orderReference }
  → Tolu → https://pay.nomba.com/checkout/<uuid>  (₦10,000)
  → Ada  → https://pay.nomba.com/checkout/<uuid>  (₦5,000)
  → creator forwards each link to each person (SMS, DM, paper, anywhere)
  → payer opens the page → pays by card or transfer → done
  → poller confirms via orderReference → credits that member's share
```

**Verified live (Nomba, 2026-06-28):**
- `checkoutLink` is a real hosted, shareable URL (`https://pay.nomba.com/checkout/<uuid>`)
  — opens in any browser, no SDK/iframe.
- The returned `orderReference` **is** that checkout uuid — the same key the
  flash-account flow already uses.
- `confirmReceipt(orderReference)` works on a checkout order (`status:false` while
  unpaid; flips to `true` + amount once paid — identical to flash-account reconcile).
- **Reconcile needs zero changes.** A checkout-link payment and a flash-account
  payment are two faces of the same order; the existing poller settles both. Only
  *how* the payer pays differs (hosted page vs. bank transfer); crediting and
  attribution are unchanged.

One `orderReference` per share is the identity. The payer needs no account; the
order tells us whose share settled. Reporting goes to the creator in chat.

To build: store the per-share `orderReference` + `checkoutLink` on each member's
`PendingPayment` (already created on pay) and surface the link instead of only the
flash account.

---

## Update routing: origin = home channel

A split's **home channel** is the LinkedChat it was created in, and **every update
goes only there**. Created in a group → updates in that group. Created in a 1:1 DM
→ updates in that DM.

This needs almost no new code — a DM is a `LinkedChat` too (`chatType: private`),
so "where updates go" is already first-class for both. In the current code:
- the dispatcher carries `ctx.linkedChatId` (the origin) and `runCreateCollection`
  stamps it on the collection;
- `creditMember` announces to `collection.linkedChat.platformChatId`, which resolves
  to the DM's chat id for a DM-created collection automatically.

So a DM-created split already sends "X paid / progress / done" to that DM.

### Rules

1. **Home channel = `collection.linkedChatId`**, set at creation, never changes.
2. **All updates** (payment landed, progress, target reached, expiry) go to the home
   channel. Group → group, DM → DM.
3. **The creator is the audience.** Payers are off-platform — they get nothing in
   chat. A group split announces publicly ("Tolu paid"); a DM split is creator-only.
4. **Links vs. updates are separate channels:** the per-share **checkout links** go
   to the creator in the home channel once, at creation, to forward as they like;
   the **updates** stream into the home channel as payments land.

### Edge cases

- **Bot removed / group dead:** updates fail silently (existing swallow behavior) —
  money still reconciles; state readable via `/balance` or the dashboard.
- **DM split, a named person is on Telegram:** still not pinged — they pay via their
  link like everyone else; only the home channel gets updates. Keeps the model
  uniform when some payers are off-platform.
- **Same person, group and DM splits running:** separate collections, separate home
  channels; updates never cross.

---

## Out of scope

- Peer-to-peer settling (Tolu pays Ada directly) — Talli collects to a pool, it's
  not an IOU tracker.
- Editing a split after creation.
- A branded Talli pay page wrapping the Nomba link (possible later for trust +
  one-link-both-methods; not needed for v1 since the Nomba link already works).
