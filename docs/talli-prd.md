# Talli PRD

**Product:** Talli  
**Tagline:** AI treasurer, savings, and money-transfer assistant for chats  
**Platforms:** WhatsApp private chat, Telegram private chat, Telegram group chat, web dashboard  
**Payment provider:** Nomba  
**Primary stack:** Hono.js, Drizzle ORM, TanStack Router  
**Document status:** Hackathon PRD draft  
**Last updated:** 2026-06-26

---

## 1. Product Summary

Talli is a conversational money assistant that lets users collect money, send money, track payments, run savings jars, and manage group contributions directly inside chat.

Users configure their workspace from a web dashboard, connect their payment setup, then link the bot to WhatsApp private chat, Telegram private chat, or Telegram group chats.

The bot understands natural language commands like:

```txt
Save ₦2,000 to my rent jar
Collect ₦5,000 from everyone for Friday hangout
Send ₦5,000 to Tunde 0123456789 GTBank
Pay out the football money to my account
Withdraw ₦10,000 from my rent jar
Who has not paid?
How much have we collected?
Remind people who have not paid
Show me my receipt for yesterday's payment
```

Talli should not behave like an uncontrolled AI bank agent. AI is used to understand user intent, summarize payment status, and produce helpful replies. All actual money movement — incoming payments **and outgoing transfers/payouts** — must be deterministic, permission-checked, and confirmed by the user before Talli calls any Nomba payment or payout API. The LLM parses and proposes a transfer; it never executes one on its own.

---

## 2. Problem

A lot of financial coordination already happens inside WhatsApp and Telegram chats, but the actual payment tracking happens manually.

Common problems:

- People collect money for events, food, rent, class dues, church activities, football pitch, wedding committees, and group savings manually.
- Admins have to ask “who has paid?” repeatedly.
- Members send screenshots instead of having verifiable payment status.
- The person collecting money manually reconciles names, amounts, bank alerts, and chat messages.
- Personal saving apps require the user to open a separate app and behave with discipline before spending.
- Payment links are disconnected from the chat where the money conversation started.

The core pain is not just payment. The core pain is **coordination, tracking, confirmation, reminders, and trust**.

---

## 3. Product Vision

Talli should become the money assistant inside everyday chat.

The long-term vision:

> Anywhere money is discussed in chat, Talli can help structure it, collect it, track it, explain it, and remind the right people.

For the hackathon MVP:

> Talli helps users create collections and savings jars from chat, lets people pay through Nomba Checkout or virtual accounts, lets owners send money out (P2P transfers, collection payouts, and jar withdrawals) to bank accounts via confirmed Nomba payouts, and updates payment status automatically through Nomba webhooks.

---

## 4. Target Users

### 4.1 Individual Users

People who want to save money, fund personal goals, create quick collections, or track their own payment history through chat.

Examples:

- Young workers saving for rent, phone, laptop, school fees, relocation, or emergency fund.
- People who want to lock money before spending it impulsively.
- People who prefer sending a chat message over opening another finance app.

### 4.2 Group Admins

People responsible for collecting money from others.

Examples:

- Football group admins
- Class reps
- Church/youth group treasurers
- Office lunch organizers
- Roommate group admins
- Wedding committee members
- Event organizers
- Community/cooperative admins

### 4.3 Small Businesses and Communities

Small teams or communities that collect repeat payments from members.

Examples:

- Paid groups
- Coaches
- Tutors
- Market associations
- Informal cooperatives
- Social clubs
- Training cohorts

---

## 5. Platform Strategy

Talli is one product with multiple entry points.

### 5.1 WhatsApp

**Scope for MVP:** Private chat only.

WhatsApp should be used for one-on-one bot conversations where users can:

- Link their account.
- Create personal savings jars.
- Fund savings jars.
- Create payment collections.
- Ask payment/status questions.
- Receive receipts and reminders.

WhatsApp group support should be treated as future/experimental because WhatsApp Business Cloud API is primarily designed around business messaging and webhooks, while Telegram has first-class bot behavior for private and group chats.

### 5.2 Telegram

**Scope for MVP:** Private chat and group chat.

Telegram should be the primary demo platform because it supports bot commands, private chats, group chats, inline buttons, and webhooks more naturally.

Telegram supports bot interactions in private chats, groups, and channels depending on bot configuration. Telegram bots also support user inputs like text, media, voice messages, and interactive buttons.

### 5.3 Web App

The web app is the setup and control center.

Users should use the web dashboard to:

- Create workspace.
- Configure bot behavior.
- Link WhatsApp or Telegram chats.
- Manage collections.
- Manage savings jars.
- View payments and receipts.
- View webhook events.
- Manage permissions.
- Request payouts or exports where supported.

---

## 6. Core Product Modes

Talli has three major modes: **Collect**, **Save**, and **Send**.

---

# 6.1 Collect Mode

Collect Mode helps users collect money from one person, multiple people, or a group.

## Use Cases

- “Collect ₦3,000 from everyone for football pitch.”
- “Create a ₦10,000 payment link for Tunde’s birthday.”
- “Collect ₦50,000 total for office lunch.”
- “Start monthly dues of ₦5,000 for this group.”
- “Who hasn’t paid?”
- “Remind unpaid members.”

## Main Flow: Telegram Group Collection

1. Admin adds Talli to a Telegram group.
2. Admin verifies the group with a code from the web dashboard.
3. Admin sends:

```txt
@Talli collect ₦3,000 from everyone for Saturday football pitch by Friday
```

4. Bot parses the command and asks for confirmation:

```txt
Create collection?

Purpose: Saturday football pitch
Amount: ₦3,000 per person
Deadline: Friday
Scope: Everyone in this group

[Create Collection] [Cancel]
```

5. Admin confirms.
6. Bot posts payment CTA:

```txt
Saturday football pitch collection is live.

Amount: ₦3,000 per person
Paid: 0/12
Total collected: ₦0

[Pay ₦3,000]
```

7. Member clicks payment button.
8. Web payment page opens.
9. App creates Nomba Checkout order or virtual account payment flow.
10. Member pays.
11. Nomba sends webhook.
12. App verifies and processes webhook.
13. Bot updates group:

```txt
✅ Benaiah paid ₦3,000
Progress: ₦3,000 / ₦36,000
Paid: 1/12
```

14. Members/admins can ask:

```txt
Who has not paid?
How much remains?
Did Opeyemi pay?
Remind defaulters
```

---

# 6.2 Save Mode

Save Mode helps users create and fund savings jars through chat.

## Use Cases

- “Save ₦2,000 to my Rent Jar.”
- “Create a jar for laptop, target ₦500,000.”
- “Save ₦1,000 every Friday.”
- “Lock ₦10,000 until next month.”
- “How much have I saved this month?”
- “Start a 30-day ₦1,000 daily challenge.”

## Main Flow: Private Savings Jar

1. User links WhatsApp or Telegram private chat.
2. User sends:

```txt
Save ₦2,000 to my rent jar
```

3. Bot replies:

```txt
I’ll help you fund your Rent Jar with ₦2,000.

Current progress: ₦42,000 / ₦200,000

[Pay ₦2,000] [Cancel]
```

4. User clicks payment button.
5. Nomba Checkout opens.
6. User pays.
7. Nomba webhook confirms payment.
8. Bot replies:

```txt
✅ ₦2,000 saved to Rent Jar.

New progress: ₦44,000 / ₦200,000
```

---

# 6.3 Send Mode

Send Mode helps users move money **out** of Talli to a bank account through natural language. The LLM parses the request and proposes a transfer; the user must confirm before Talli calls the Nomba payout/transfer API. AI never moves money on its own.

Send Mode covers three MVP transfer types, all settling to a Nigerian bank account:

1. **P2P transfer** — send to any bank account/number.
2. **Collection payout** — owner disburses funds collected in a collection.
3. **Savings jar withdrawal** — owner moves funds out of their own jar.

Two transfer types are **post-MVP**:

- **Wallet-to-wallet** — instant transfer between two linked Talli users using internal Talli balances. Requires a custodial wallet/balance system (see §11 Won't-Have), so it is deferred.
- **Split payment / bill split** — a user uploads a receipt (e.g. a restaurant bill) to Talli, Talli reads it, and generates a custom payment link / collection so the bill can be split and collected from a group. (Payment-rail UX — hosted checkout URL vs. virtual account vs. pay-from-wallet — is still being decided; see §8.4.)

## Use Cases

- “Send ₦5,000 to Tunde 0123456789 GTBank.”
- “Pay out the football money to my account.”
- “Withdraw ₦10,000 from my rent jar to my GTBank account.”
- “Send ₦2,000 to my saved beneficiary ‘Mum’.”

## Main Flow: P2P Transfer (Private Chat)

1. User sends:

```txt
Send ₦5,000 to Tunde 0123456789 GTBank
```

2. Bot parses the intent and (if needed) resolves the account name through Nomba account lookup, then asks for confirmation:

```txt
Confirm transfer?

Amount: ₦5,000
To: TUNDE BELLO
Bank: GTBank • 0123456789

[Send ₦5,000] [Cancel]
```

3. User confirms.
4. Talli runs deterministic validation (role/permission, balance/limits, beneficiary).
5. Talli calls the Nomba payout/transfer API and stores the provider reference.
6. Nomba sends a payout webhook (success/failed).
7. App verifies and processes the webhook idempotently.
8. Bot replies:

```txt
✅ Sent ₦5,000 to TUNDE BELLO (GTBank).
Reference: NMB-XXXX
```

## Main Flow: Collection Payout

1. Owner sends in private chat or the linked group:

```txt
@Talli pay out the Saturday football money to my account
```

2. Bot confirms the destination and net amount (collected minus any fees):

```txt
Pay out collection?

Collection: Saturday football pitch
Available: ₦36,000
To: BENAIAH ALUMONA • GTBank • 0123456789

[Pay out ₦36,000] [Cancel]
```

3. Owner confirms.
4. Talli validates (owner-only), calls the Nomba payout API, stores the reference.
5. Payout webhook confirms; bot posts a receipt and writes an audit log.

## Send Mode Rules

- Only an **owner** can request a collection payout or a savings jar withdrawal.
- P2P transfers are available to linked users in private chat, subject to per-transfer and daily limits.
- Every transfer requires explicit user confirmation; AI cannot initiate a transfer autonomously.
- Bot must refuse transfer commands in unverified chats.
- Destination accounts should be resolved/validated (name enquiry) before confirmation when the provider supports it.
- Transfers must be idempotent on the provider reference and reconciled from the payout webhook, never from optimistic UI.

---

## 7. Product Differentiation

Talli should not be positioned as a PiggyVest clone or a normal contribution app.

The key difference:

> Talli brings payment coordination and savings actions into the chat where people already talk about money.

Unique angles:

1. **Chat-native finance**  
   Users create and manage money flows through natural language.

2. **Group money intelligence**  
   The bot can answer “who paid?”, “who hasn’t paid?”, and “how much remains?” instantly.

3. **Webhook-native tracking**  
   Payment status comes from Nomba webhooks, not screenshots or manual confirmation.

4. **Private and group use**  
   Same product works for personal savings and group collections.

5. **AI as treasurer interface, not payment authority**  
   AI understands commands, but business rules control payments.

6. **Verification and permissions**  
   Chats must be linked securely before the bot can act for a workspace.

---

## 8. High-Level Requirements

## 8.1 Web Dashboard

### Required Features

- User authentication.
- Workspace creation.
- Platform selection: WhatsApp private, Telegram private, Telegram group.
- Generate chat verification code.
- Show linked chats.
- Manage bot settings.
- Manage collections.
- Manage savings jars.
- View payments.
- View webhook events.
- View audit logs.
- Manage workspace members/admins.

### Nice-to-Have Features

- Export collection report as CSV.
- Custom bot personality/tone.
- Custom reminder schedule.
- Custom payment page branding.
- Manual payment reconciliation.

---

## 8.2 Chat Verification

Chat verification is required so the bot knows which workspace owns a private chat or group chat.

### Private Chat Linking

1. User opens web dashboard.
2. User selects platform.
3. System generates a private link code:

```txt
/start KOL-9281
```

4. User sends the code to the bot in private chat.
5. System links platform user ID or phone number to the app user.

### Telegram Group Linking

1. Workspace owner creates a group link code:

```txt
KOL-8F29
```

2. Owner adds Talli to Telegram group.
3. Owner sends:

```txt
@Talli verify KOL-8F29
```

4. Bot validates code.
5. Bot links Telegram `chat_id` to workspace.
6. Bot stores the verifier as group owner/admin.
7. Bot confirms:

```txt
This group is now linked to Benaiah Football Club.
Only approved admins can create collections or request payouts.
```

### Verification Rules

- Verification codes should expire after a short period, for example 15 minutes.
- Codes should be one-time use.
- Codes should be scoped to a workspace and platform.
- Group verification should store platform chat ID and verifier ID.
- Bot should refuse financial commands in unverified chats.

---

## 8.3 Bot Command Understanding

The bot should understand natural language commands and map them to structured intents.

### Example Input

```txt
@Talli abeg collect 2k from everybody for Tunde birthday before Saturday
```

### Parsed Output

```json
{
  "intent": "create_collection",
  "amount": 2000,
  "currency": "NGN",
  "scope": "all_group_members",
  "purpose": "Tunde birthday",
  "deadline": "Saturday",
  "requires_confirmation": true
}
```

### Supported MVP Intents

- `verify_chat`
- `create_collection`
- `confirm_collection`
- `cancel_collection`
- `collection_status`
- `list_unpaid_members`
- `remind_unpaid_members`
- `create_savings_jar`
- `fund_savings_jar`
- `savings_status`
- `send_money` // P2P transfer to a bank account
- `request_payout` // disburse collection funds to a bank account (owner only)
- `withdraw_savings` // move jar funds to a bank account (owner only)
- `confirm_transfer`
- `cancel_transfer`
- `show_receipt`
- `help`

### Post-MVP Intents

- `send_to_wallet` // wallet-to-wallet between Talli users
- `split_bill_from_receipt` // upload a receipt → generate a split payment link

### AI Rules

- AI should only parse, summarize, and propose actions.
- AI must not call Nomba APIs directly.
- AI must not move money on its own. For transfers/payouts it only proposes a structured transfer; the deterministic layer executes it via Nomba **after** explicit user confirmation.
- AI must not override role permissions.
- Low-confidence commands should trigger clarification.
- Financial actions (incoming payments and outgoing transfers) require confirmation.

---

## 8.4 Payment Flow

### Payment Options

MVP should support Nomba Checkout first.

Nomba Checkout provides a hosted payment page and supports multiple payment methods depending on availability, including card, bank transfer, USSD, QR, and other methods.

Virtual accounts can be added for more bank-transfer-native flows. Nomba virtual accounts can receive bank transfers and can be used for customer-specific or purpose-specific payment receiving.

### Payment Creation Flow

1. User clicks payment CTA from chat.
2. App opens web payment page.
3. App creates Nomba Checkout order.
4. App stores Nomba order reference.
5. User completes payment.
6. Nomba sends webhook.
7. App verifies webhook.
8. App updates ledger/payment status.
9. Bot sends confirmation message.

### Webhook Rules

- Store webhook event before processing.
- Verify webhook signature/header when available.
- Use event ID or transaction reference for idempotency.
- Do not double-credit payments.
- Do not trust frontend success redirect as final payment confirmation.
- Keep raw payload for audit/debugging.

### Outgoing Transfer / Payout Flow

Outgoing money (P2P transfer, collection payout, jar withdrawal) uses the Nomba payout/transfer API, not Checkout.

1. User issues a transfer command in chat.
2. AI parses it into a structured transfer intent.
3. App resolves/validates the destination account (name enquiry where supported).
4. App runs deterministic checks: role/permission, available balance or collected funds, per-transfer and daily limits.
5. Bot shows a confirmation card with amount, resolved recipient name, bank, and account number.
6. User confirms.
7. App calls the Nomba payout/transfer API with an idempotency key and stores the provider reference.
8. Nomba sends a payout webhook (success/failed/reversed).
9. App verifies and processes the webhook idempotently and updates transfer status.
10. App writes an audit log and bot sends a receipt.

### Transfer Rules

- A transfer is never executed without explicit user confirmation.
- Use a client-supplied idempotency key plus the provider reference so a retried or duplicated request never double-sends.
- Reconcile final status from the payout webhook, never from optimistic UI.
- Failed/reversed payouts must restore the source balance and notify the user.
- Enforce role checks server-side (payouts/withdrawals are owner-only) and apply transfer limits.

### Open Question: Incoming Payment Rail

Still being decided (see discussion in §8.4 notes): whether collections/split-bills present (a) a hosted Nomba Checkout URL only, (b) a dedicated virtual account number only, or (c) both — checkout link **and** a virtual account number — letting a payer either pay on the hosted page or bank-transfer directly, including paying from within Talli. This affects reconciliation (Checkout order ref vs. virtual-account credit webhook) and the data model.

---

## 8.5 Collections

### Collection Types

MVP collection types:

1. **Fixed-per-person collection**  
   Example: ₦3,000 from everyone.

2. **Open contribution collection**  
   Example: Collect any amount toward ₦100,000.

3. **Named-member collection**  
   Example: Collect ₦5,000 from Tolu, Ope, Daniel, and Mary.

Post-MVP collection types:

- Recurring dues.
- Tiered contribution amounts.
- Installment collection.
- Conditional group target.
- Group savings challenge.

### Collection Statuses

- `draft`
- `active`
- `paid`
- `partially_paid`
- `expired`
- `cancelled`
- `closed`

### Collection Member Payment Statuses

- `not_paid`
- `pending`
- `paid`
- `underpaid`
- `overpaid`
- `refunded`
- `manual_review`

---

## 8.6 Savings Jars

### Savings Jar Fields

- Name
- Target amount
- Current amount
- Lock date
- Description
- Owner
- Status

### Savings Jar Statuses

- `active`
- `locked`
- `completed`
- `cancelled`
- `withdrawn`

### MVP Savings Commands

```txt
Create a jar for rent, target ₦200,000
Save ₦2,000 to rent jar
How much is in my rent jar?
Lock ₦10,000 until July 30
```

### Recurring Savings

Recurring savings can be treated as post-MVP if direct debit or recurring card tokenization is not stable in the hackathon sandbox.

MVP can simulate recurring reminders:

```txt
Remind me every Friday to save ₦1,000
```

The bot sends a payment link on schedule instead of automatically debiting the user.

---

## 8.7 Roles and Permissions

### Workspace Roles

#### Owner

Can:

- Manage workspace.
- Link/unlink chats.
- Add/remove admins.
- Create collections.
- Manage savings rules.
- Request collection payout to a bank account.
- Withdraw funds from savings jars to a bank account.
- Request payout/export.
- View all payments and audit logs.

#### Admin

Can:

- Create collections.
- Send reminders.
- View group collection status.
- Close collections.

#### Member

Can:

- Pay collection.
- View own payment status.
- View public collection progress.
- Join savings challenge.
- Send a personal P2P transfer to a bank account (subject to limits).

### Safety Rules

- Only owner/admin can create group collections.
- Only owner can unlink a group.
- Only owner can request a collection payout or jar withdrawal.
- P2P transfers are personal to the sender and bounded by per-transfer/daily limits.
- Members cannot change payment amount unless collection allows open contributions.
- Bot must refuse commands (including transfers) in unverified chats.
- Bot must require confirmation for collection creation and all money movement, incoming and outgoing.

---

## 9. User Stories

## 9.1 Workspace Owner

As a workspace owner, I want to configure my bot from the web app so that my chat bot follows my rules.

Acceptance criteria:

- User can create workspace.
- User can generate platform-specific verification code.
- User can see linked chats.
- User can set who can create collections.

## 9.2 Telegram Group Admin

As a Telegram group admin, I want to create a collection from the group chat so that members can pay without leaving the conversation context.

Acceptance criteria:

- Admin can type natural language command.
- Bot parses amount, purpose, and deadline.
- Bot asks for confirmation.
- Bot creates collection after confirmation.
- Bot posts payment button.

## 9.3 Group Member

As a group member, I want to pay my contribution and have the group automatically know I paid.

Acceptance criteria:

- Member can click payment button.
- Payment page shows correct amount and purpose.
- Payment success updates member status.
- Bot announces payment confirmation.

## 9.4 Individual Saver

As an individual user, I want to save money from WhatsApp or Telegram private chat so that I do not have to open a separate savings app.

Acceptance criteria:

- User can create jar.
- User can fund jar using payment link.
- Jar balance updates after webhook.
- Bot replies with updated progress.

## 9.5 Treasurer

As a group treasurer, I want to ask who has not paid so that I do not manually check screenshots and bank alerts.

Acceptance criteria:

- Bot lists unpaid members.
- Bot can remind unpaid members.
- Bot can show total collected and remaining amount.

---

## 10. MVP Scope

## Must Have

1. Web dashboard onboarding.
2. Workspace creation.
3. Telegram private chat linking.
4. Telegram group linking.
5. WhatsApp private chat linking or simulated WhatsApp private webhook if setup is difficult.
6. Natural language command parser.
7. Create collection from Telegram group.
8. Pay collection through Nomba Checkout.
9. Nomba webhook handling.
10. Collection status updates in Telegram.
11. Private savings jar creation.
12. Fund savings jar through Nomba Checkout.
13. Payment/webhook event log.
14. Basic role checks.
15. Confirmation before financial actions.
16. Send money (P2P transfer to a bank account) from chat via natural language, parse-and-confirm only.
17. Collection payout to a bank account (owner-only, confirmed).
18. Savings jar withdrawal to a bank account (owner-only, confirmed).
19. Nomba payout/transfer integration with idempotent payout webhook handling.

## Should Have

1. Reminder unpaid members.
2. Receipt page.
3. Payment status query.
4. Savings jar progress.
5. Admin dashboard for collection details.
6. Manual mark-as-paid for demo fallback.

## Could Have

1. Voice note command parsing.
2. Recurring savings reminders.
3. Open contribution collection.
4. CSV export.
5. Custom payment page branding.
6. WhatsApp production integration.
7. Wallet-to-wallet transfers between Talli users (requires custodial wallet/balance system).
8. Split payment / bill split from an uploaded receipt (vision parsing → custom payment link).
9. Saved beneficiaries / address book for faster transfers.

## Won’t Have in MVP

1. Fully autonomous money transfer by AI.
2. WhatsApp group bot support.
3. Full wallet system.
4. Interest-bearing savings.
5. Regulated investment features.
6. Automated payouts without owner confirmation.
7. Complex KYC onboarding.
8. Loan/credit products.

---

## 11. Non-Goals

Talli MVP is not:

- A bank.
- A full PiggyVest replacement.
- A loan app.
- An investment app.
- A fully autonomous AI payment agent.
- A WhatsApp group automation tool.
- A crypto wallet.
- A replacement for accounting software.

---

## 12. System Architecture

## 12.1 Frontend

Technology:

- TanStack Router
- React
- Tailwind CSS or preferred styling system

Primary routes:

```txt
/
/onboarding
/dashboard
/workspaces
/workspaces/:workspaceId
/workspaces/:workspaceId/bot
/workspaces/:workspaceId/chats
/workspaces/:workspaceId/settings
/collections
/collections/:collectionId
/collections/:collectionId/pay
/collections/:collectionId/receipt
/savings
/savings/:jarId
/webhooks
/audit-logs
```

## 12.2 Backend

Technology:

- Hono.js
- Drizzle ORM
- PostgreSQL
- Optional Redis/queue for background processing

API routes:

```txt
POST /api/workspaces
GET  /api/workspaces
GET  /api/workspaces/:workspaceId

POST /api/workspaces/:workspaceId/link-codes
POST /api/chats/verify
GET  /api/workspaces/:workspaceId/chats

POST /telegram/webhook
POST /whatsapp/webhook

POST /api/collections
GET  /api/collections/:collectionId
POST /api/collections/:collectionId/checkout
POST /api/collections/:collectionId/remind
GET  /api/collections/:collectionId/status

POST /api/savings/jars
GET  /api/savings/jars/:jarId
POST /api/savings/jars/:jarId/fund
POST /api/savings/jars/:jarId/withdraw

POST /api/collections/:collectionId/payout

POST /api/transfers/resolve-account
POST /api/transfers
GET  /api/transfers/:transferId
POST /api/transfers/:transferId/confirm

POST /api/nomba/webhook
GET  /api/webhook-events
GET  /api/audit-logs
```

## 12.3 External Services

- Nomba Checkout
- Nomba Virtual Accounts, if used
- Nomba Webhooks
- Telegram Bot API
- WhatsApp Business Cloud API, private chat only
- LLM provider for command parsing

---

## 13. Data Model

## users

```txt
id
name
email
phone
created_at
updated_at
```

## workspaces

```txt
id
owner_user_id
name
slug
currency
status
created_at
updated_at
```

## workspace_members

```txt
id
workspace_id
user_id
role // owner | admin | member
created_at
```

## linked_chats

```txt
id
workspace_id
platform // telegram | whatsapp
chat_type // private | group
platform_chat_id
platform_user_id
title
verified_by_user_id
verified_at
status // active | disabled
created_at
updated_at
```

## chat_link_codes

```txt
id
workspace_id
platform
code_hash
purpose // private_link | group_link
expires_at
used_at
created_by_user_id
created_at
```

## bot_commands

```txt
id
workspace_id
linked_chat_id
platform
sender_platform_id
raw_text
parsed_intent
confidence
status // received | parsed | confirmed | rejected | failed
error_message
created_at
```

## collections

```txt
id
workspace_id
linked_chat_id
title
purpose
collection_type // fixed_per_person | open_contribution | named_members
amount_per_member
 target_amount
currency
deadline
status
created_by_user_id
created_at
updated_at
```

## collection_members

```txt
id
collection_id
display_name
platform_user_id
app_user_id
expected_amount
paid_amount
status // not_paid | pending | paid | underpaid | overpaid | manual_review
created_at
updated_at
```

## payments

```txt
id
workspace_id
collection_id
savings_jar_id
payer_user_id
payer_platform_id
amount
currency
provider // nomba
provider_reference
provider_order_id
status // pending | successful | failed | cancelled
paid_at
created_at
updated_at
```

## transfers

```txt
id
workspace_id
type // p2p | collection_payout | savings_withdrawal
source_collection_id // nullable
source_savings_jar_id // nullable
initiated_by_user_id
initiated_by_platform_id
amount
currency
beneficiary_id // nullable
recipient_account_number
recipient_bank_code
recipient_account_name // resolved via name enquiry
provider // nomba
provider_reference
idempotency_key
status // draft | awaiting_confirmation | processing | successful | failed | reversed
failure_reason
confirmed_at
completed_at
created_at
updated_at
```

## beneficiaries

```txt
id
workspace_id
owner_user_id
label // e.g. "Mum", "Landlord"
account_number
bank_code
account_name
created_at
updated_at
```

## savings_jars

```txt
id
workspace_id
owner_user_id
name
target_amount
current_amount
currency
lock_until
status
created_at
updated_at
```

## savings_transactions

```txt
id
savings_jar_id
payment_id
amount
type // deposit | withdrawal | adjustment
status
created_at
```

## webhook_events

```txt
id
provider
provider_event_id
event_type
raw_payload
signature_valid
processing_status // received | processed | ignored | failed
error_message
processed_at
created_at
```

## audit_logs

```txt
id
workspace_id
actor_user_id
actor_platform_id
action
entity_type
entity_id
metadata
created_at
```

---

## 14. Command Examples

## Telegram Group

```txt
@Talli verify KOL-8F29
@Talli collect 3k from everyone for Saturday football
@Talli who has paid?
@Talli who has not paid?
@Talli how much remains?
@Talli remind unpaid members
@Talli close collection
```

## Telegram Private

```txt
Create a rent jar for ₦200,000
Save ₦2,000 to rent jar
How much have I saved this month?
Show my receipt for yesterday
Create a collection for Tunde's birthday
Send ₦5,000 to Tunde 0123456789 GTBank
Pay out the football money to my account
Withdraw ₦10,000 from my rent jar
```

## WhatsApp Private

```txt
Save 5k for rent
Create a jar for laptop target 500k
How much is in my laptop jar?
Create a payment collection for my football guys
Send me my last receipt
```

---

## 15. Payment Safety and Compliance Principles

1. AI must not move money directly. It may only propose transfers/payouts; a deterministic, role-checked layer executes them via Nomba after explicit user confirmation.
2. Every payment and transfer creation must pass deterministic validation (amount, balance/funds, limits, beneficiary).
3. Every financial action must be role-checked (payouts and withdrawals are owner-only).
4. Every payment and transfer must require user confirmation.
5. Payment and transfer success must be confirmed through the Nomba webhook or verification endpoint, never optimistic UI.
6. Webhooks and transfer execution must be idempotent (provider reference + idempotency key); failed/reversed payouts must restore the source balance.
7. Sensitive actions must be logged.
8. Collection payouts and jar withdrawals are owner-only; P2P transfers are personal to the sender and bounded by per-transfer/daily limits.
9. Savings should be represented as internal ledger balances unless a compliant wallet/savings structure is provided.
10. Avoid promising interest, investment returns, or banking features in MVP.

---

## 16. Webhook Processing Design

Webhook endpoint:

```txt
POST /api/nomba/webhook
```

Processing steps:

1. Receive webhook.
2. Store raw payload in `webhook_events`.
3. Verify provider signature/header.
4. Check if event was already processed.
5. Identify related payment by provider reference/order ID.
6. Update payment status.
7. Update collection member status or savings jar balance.
8. Create audit log.
9. Send bot notification.
10. Mark webhook as processed.

Failure behavior:

- If signature invalid, mark as failed/ignored.
- If payment cannot be matched, mark as manual review.
- If bot notification fails, payment should remain successful; notification can be retried.
- If duplicate webhook arrives, ignore safely.

---

## 17. Bot Reply Style

The bot should be friendly, direct, and low-noise.

Good style:

```txt
✅ Payment confirmed.
Benaiah paid ₦3,000 for Saturday football.

Progress: ₦12,000 / ₦36,000
Paid: 4/12
```

Avoid:

```txt
Wow amazing! Your spectacular financial transaction has been successfully processed!
```

The bot should feel like a responsible treasurer, not a noisy mascot.

---

## 18. Hackathon Demo Script

## Scene 1: Web Setup

- Create workspace: “Benaiah Football Club”.
- Enable Telegram group collections.
- Enable private savings jars.
- Generate Telegram group verification code.

## Scene 2: Link Telegram Group

In Telegram group:

```txt
@Talli verify KOL-8F29
```

Bot replies:

```txt
This group is now linked to Benaiah Football Club.
```

## Scene 3: Create Collection

```txt
@Talli collect ₦3,000 from everyone for Saturday football pitch by Friday
```

Bot asks for confirmation.

Admin confirms.

Bot posts payment button.

## Scene 4: Member Pays

- Member clicks button.
- Payment page opens.
- Nomba Checkout flow starts.
- Payment success webhook updates system.

Bot posts:

```txt
✅ Opeyemi paid ₦3,000.
Progress: ₦3,000 / ₦36,000
Paid: 1/12
```

## Scene 5: Ask Money Questions

```txt
@Talli who hasn't paid?
```

Bot lists unpaid members.

```txt
@Talli how much remains?
```

Bot replies with outstanding amount.

## Scene 6: Private Savings

In private chat:

```txt
Save ₦2,000 to my rent jar
```

Bot creates payment link.

Payment webhook confirms.

Bot replies with new jar progress.

---

## 19. Success Metrics

For hackathon demo:

- User can link a Telegram group in under 60 seconds.
- User can create a collection from chat in under 30 seconds.
- Payment status updates automatically after webhook.
- Bot can answer at least 5 status questions.
- User can fund savings jar from private chat.
- Web dashboard clearly shows all payment and webhook events.

For real product:

- Number of linked chats.
- Number of collections created.
- Collection completion rate.
- Average time to first payment.
- Number of savings jars funded.
- Payment success rate.
- Webhook processing reliability.
- Retention of group admins.

---

## 20. Risks and Mitigations

## Risk: WhatsApp group support may be limited

Mitigation:

- MVP supports WhatsApp private chat only.
- Telegram supports both private and group use.
- Present WhatsApp group support as future/provider-dependent.

## Risk: AI misinterprets command

Mitigation:

- Always show confirmation before action.
- Use structured JSON intent parsing.
- Ask clarification when confidence is low.

## Risk: Duplicate webhook credits payment twice

Mitigation:

- Store provider event ID/reference.
- Use database uniqueness constraints.
- Make processing idempotent.

## Risk: Product sounds like a bank/savings institution

Mitigation:

- Position MVP as payment collection and savings ledger assistant.
- Avoid interest/investment claims.
- Use Nomba for payment collection.

## Risk: Users try unauthorized payout commands

Mitigation:

- Owner-only payout permissions.
- Confirmation and audit logs.
- Payout can be excluded from MVP.

---

## 21. Recommended MVP Build Order

1. Set up Hono API.
2. Set up Drizzle schema.
3. Build web dashboard shell.
4. Create workspace flow.
5. Build Telegram bot webhook.
6. Build chat verification flow.
7. Build collection creation command.
8. Build payment page.
9. Integrate Nomba Checkout.
10. Build Nomba webhook handler.
11. Update collection/member status after payment.
12. Add status question commands.
13. Add savings jar creation/funding.
14. Add Nomba payout/transfer integration: send money (P2P), collection payout, jar withdrawal — all parse-and-confirm with idempotent payout webhook handling.
15. Add webhook/audit log dashboard.
16. Polish demo flow.

---

## 22. Sources and Platform Notes

- Telegram Bot API is an HTTP-based interface for building Telegram bots. Telegram bots can receive private chat messages and, depending on bot privacy/settings, can work in groups.
- Telegram bots support user inputs such as text, files, locations, stickers, and voice messages, plus interactive UI tools like buttons.
- WhatsApp Business Cloud API supports business messaging and webhook events, but this PRD scopes WhatsApp to private chat for MVP to avoid group-bot complexity.
- Nomba Checkout is a hosted payment page for accepting payments through supported methods.
- Nomba virtual accounts can be created to receive bank transfers.
- Nomba webhooks notify the app when payment events occur and should be verified and processed idempotently.

---

## 23. Final Product Positioning

Talli is not just a savings app or contribution tracker.

It is:

> **An AI treasurer and savings assistant for the chats where money conversations already happen.**

MVP promise:

> Set it up on the web, link it to WhatsApp private chat or Telegram private/group chat, then collect money, fund savings jars, track who paid, and answer money questions naturally.
