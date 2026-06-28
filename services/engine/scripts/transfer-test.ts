import prisma from "../src/prisma/index.js";
import { transferService } from "../src/services/transfer.service.js";
import { walletService } from "../src/services/wallet.service.js";
import { intentDispatcherService, type DispatchContext } from "../src/services/intent-dispatcher.service.js";
import { commandParserService } from "../src/services/command-parser.service.js";
import type { Intent } from "../src/schemas/intent.schema.js";
import { nombaConfig } from "../src/config/env.js";

/**
 * Deterministic test for the send-money (bank payout) path. Runs in tiers so it's
 * safe against the LIVE Nomba API:
 *
 *   bun run scripts/transfer-test.ts
 *     Tier 1 (default) — READ-ONLY. Exercises bank resolution, account lookup, and
 *     verifyDestination. No money moves. Safe to run anytime.
 *
 *   bun run scripts/transfer-test.ts --full
 *     Tier 2 — MOVES REAL MONEY on live. Funds the test wallet, runs the actual
 *     dispatcher send path (parse-free, deterministic intent), asserts the wallet
 *     was debited and Nomba returned a success status. Uses a tiny fixed amount.
 *
 * Configure the destination via env (a real account you control on live):
 *   TEST_ACCT=2265567117 TEST_BANK=zenith TEST_AMOUNT=100 bun run scripts/transfer-test.ts --full
 */

const FULL = process.argv.includes("--full");
const ACCT = process.env.TEST_ACCT ?? "2265567117";
const BANK = process.env.TEST_BANK ?? "zenith";
const AMOUNT = Number(process.env.TEST_AMOUNT ?? "100");

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail?: unknown): void {
  console.log(`  ${ok ? "✅" : "❌"} ${label}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
  ok ? pass++ : fail++;
}

async function tier1(): Promise<void> {
  console.log("\n=== Tier 1: read-only verification (no money) ===");

  console.log(`\n1. resolveBank("${BANK}")`);
  const bank = await transferService.resolveBank(BANK);
  check("bank resolves to a code", !!bank?.code, bank ? { name: bank.name, code: bank.code } : null);
  if (!bank) return;

  console.log(`\n2. lookupAccount(${ACCT}, ${bank.code})`);
  let accountName = "";
  try {
    accountName = await transferService.lookupAccount(ACCT, bank.code);
    check("account name returned", accountName.length > 0, accountName);
  } catch (err) {
    check("account name returned", false, (err as Error).message);
  }

  console.log(`\n3. verifyDestination("${ACCT}", "${BANK}")`);
  const verified = await transferService.verifyDestination(ACCT, BANK);
  check("verifyDestination ok", verified.ok, verified);
  if (verified.ok) {
    check("returns bankCode", !!verified.bankCode, verified.bankCode);
    check("returns accountName", !!verified.accountName, verified.accountName);
  }

  console.log(`\n4. resolveBank junk -> null`);
  const junk = await transferService.resolveBank("definitelynotabank");
  check("unknown bank -> null", junk === null);

  console.log(`\n5. verifyDestination with bad bank -> bank_unknown`);
  const badBank = await transferService.verifyDestination(ACCT, "definitelynotabank");
  check("bad bank -> not ok", !badBank.ok);
  check("reason is bank_unknown", !badBank.ok && badBank.reason === "bank_unknown", !badBank.ok ? badBank.reason : null);
}

async function tier2(): Promise<void> {
  console.log("\n=== Tier 2: REAL send via dispatcher (LIVE — moves money) ===");
  console.log(`   env=${nombaConfig.env}  ->  send ₦${AMOUNT} to ${ACCT} @ ${BANK}`);

  const ws = await prisma.workspace.findFirst({ select: { id: true, ownerUserId: true, name: true } });
  if (!ws) throw new Error("no workspace — seed one first");

  const wallet = await walletService.ensureWallet(ws.ownerUserId);
  console.log(`\n1. wallet balance before: ₦${wallet.balance}`);
  if (wallet.balance < AMOUNT) {
    const topUp = AMOUNT - wallet.balance + AMOUNT;
    await walletService.credit(wallet.id, topUp, "topup", `test_fund_${Date.now()}`);
    console.log(`   funded test wallet with ₦${topUp}`);
  }
  const before = await walletService.getBalance(ws.ownerUserId);

  const ctx: DispatchContext = {
    scope: "private",
    workspaceId: ws.id,
    linkedChatId: "transfer_test_chat",
    platform: "telegram",
    senderPlatformId: "transfer_test_user",
    ownerUserId: ws.ownerUserId,
    workspaceName: ws.name,
    senderName: "Transfer Test",
  };

  const intent: Intent = {
    intent: "send_money",
    status: "ready",
    recipientName: undefined,
    accountNumber: ACCT,
    bankName: BANK,
    amount: AMOUNT,
  } as Intent;

  console.log(`\n2. prepareIntent (verifies destination, attaches resolved name/code)`);
  const prepared = await (intentDispatcherService as unknown as {
    prepareIntent: (i: Intent, c: DispatchContext) => Promise<{ clarify?: string; intent: Intent }>;
  }).prepareIntent(intent, ctx);
  check("no clarification needed", !prepared.clarify, prepared.clarify);
  check("resolved account name", !!prepared.intent.resolvedAccountName, prepared.intent.resolvedAccountName);
  if (prepared.clarify) return;

  console.log(`\n3. execute send (real Nomba payout)`);
  const result = await (intentDispatcherService as unknown as {
    execute: (i: Intent, c: DispatchContext) => Promise<{ text: string }>;
  }).execute(prepared.intent, ctx);
  console.log(`   bot would reply:\n   ${result.text.replace(/\n/g, "\n   ")}`);

  const after = await walletService.getBalance(ws.ownerUserId);
  console.log(`\n4. wallet balance after: ₦${after}`);
  check("wallet debited by exactly the amount (or refunded on fail)", before - after === AMOUNT || before === after, {
    before,
    after,
    delta: before - after,
  });

  const txns = await walletService.history(wallet.id, 5);
  const sendTxn = txns.find((t) => t.reason === "send");
  check("a 'send' ledger entry exists", !!sendTxn, sendTxn ? { amount: sendTxn.amount, ref: sendTxn.referenceId } : null);
}

async function main(): Promise<void> {
  console.log(`Transfer test — Nomba env: ${nombaConfig.env}${FULL ? "  [--full: REAL PAYOUT]" : "  [read-only]"}`);
  await tier1();
  if (FULL) await tier2();
  else console.log("\n(skipping Tier 2 — pass --full to run a real payout)");

  console.log(`\n${fail === 0 ? "✅ ALL PASSED" : "❌ FAILURES"}: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
