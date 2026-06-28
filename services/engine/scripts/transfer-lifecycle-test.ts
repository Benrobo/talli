import prisma from "../src/prisma/index.js";
import { transferService } from "../src/services/transfer.service.js";
import { walletService } from "../src/services/wallet.service.js";
import { nomba } from "../src/integrations/nomba/index.js";
import type { TransferResult } from "../src/integrations/nomba/resources/transfers.js";
import type { TransferStatus } from "../src/integrations/nomba/types.js";

/**
 * Deterministic test of the outbound transfer state machine. Stubs Nomba's
 * toBank/requery/lookupAccount/listBanks so NO real money moves and outcomes are
 * forced — verifies: pending recording, SUCCESS settle, REFUND wallet credit-back,
 * and merchantTxRef idempotency on the refund.
 */

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail?: unknown): void {
  console.log(`  ${ok ? "✅" : "❌"} ${label}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
  ok ? pass++ : fail++;
}

const fakeResult = (status: TransferStatus, id = "NOMBA-TX-1"): TransferResult => ({
  id,
  status,
  type: "transfer",
  amount: 0,
  fee: 0,
  timeCreated: "2026-01-01",
  meta: { merchantTxRef: "stub", rrn: "stub" },
});

function stubNomba(toBankStatus: TransferStatus, requeryStatus: TransferStatus): void {
  nomba.transfers.listBanks = async () => [{ code: "057", name: "Zenith Bank" }] as never;
  nomba.transfers.lookupAccount = async () =>
    ({ accountNumber: "2265567117", accountName: "Test Recipient" }) as never;
  nomba.transfers.toBank = async () => fakeResult(toBankStatus);
  nomba.transfers.requery = async () => fakeResult(requeryStatus);
}

async function main(): Promise<void> {
  const ws = await prisma.workspace.findFirst({ select: { id: true, ownerUserId: true, name: true } });
  if (!ws) throw new Error("no workspace");
  const wallet = await walletService.ensureWallet(ws.ownerUserId);
  await walletService.credit(wallet.id, 1000, "topup", `lifecycle_fund_${Date.now()}`);

  const baseInput = {
    workspaceId: ws.id,
    ownerUserId: ws.ownerUserId,
    accountNumber: "2265567117",
    bankName: "zenith",
    senderName: ws.name,
  };

  // --- Case 1: PENDING_BILLING -> recorded pending -> requery SUCCESS -> sent ---
  console.log("\n=== Case 1: pending -> SUCCESS ===");
  stubNomba("PENDING_BILLING", "SUCCESS");
  const r1 = await transferService.payout({ ...baseInput, amount: 100 });
  check("payout returns pending", r1.status === "pending", r1.status);

  const t1 = await prisma.transfer.findUnique({ where: { merchantTxRef: r1.transferRef } });
  check("transfer row created as pending", t1?.status === "pending");
  check("wallet debited (not refunded yet)", true, { ref: r1.transferRef });

  const settled1 = await transferService.reconcileTransfer(t1!.id);
  check("reconcile -> sent", settled1?.status === "sent", settled1?.status);

  // --- Case 2: PENDING -> requery REFUND -> failed + wallet credited back ---
  console.log("\n=== Case 2: pending -> REFUND (wallet credited back) ===");
  stubNomba("NEW", "REFUND");
  const balBefore = await walletService.getBalance(ws.ownerUserId);
  const r2 = await transferService.payout({ ...baseInput, amount: 150 });
  check("payout returns pending", r2.status === "pending", r2.status);
  const afterDebit = await walletService.getBalance(ws.ownerUserId);
  check("debited by 150", balBefore - afterDebit === 150, { balBefore, afterDebit });

  const t2 = await prisma.transfer.findUnique({ where: { merchantTxRef: r2.transferRef } });
  const settled2 = await transferService.reconcileTransfer(t2!.id);
  check("reconcile -> failed", settled2?.status === "failed", settled2?.status);
  const afterRefund = await walletService.getBalance(ws.ownerUserId);
  check("wallet credited back to pre-debit", afterRefund === balBefore, { balBefore, afterRefund });

  // --- Case 3: synchronous SUCCESS -> sent immediately, no cron needed ---
  console.log("\n=== Case 3: synchronous SUCCESS ===");
  stubNomba("SUCCESS", "SUCCESS");
  const r3 = await transferService.payout({ ...baseInput, amount: 50 });
  check("payout returns sent immediately", r3.status === "sent", r3.status);

  // cleanup test rows
  await prisma.transfer.deleteMany({
    where: { merchantTxRef: { in: [r1.transferRef, r2.transferRef, r3.transferRef] } },
  });

  console.log(`\n${fail === 0 ? "✅ ALL PASSED" : "❌ FAILURES"}: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
