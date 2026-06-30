import prisma from "../src/prisma/index.js";
import { nomba } from "../src/integrations/nomba/index.js";
import { collectionService } from "../src/services/collection.service.js";
import { paymentService } from "../src/services/payment.service.js";
import { walletService } from "../src/services/wallet.service.js";

/**
 * Drives the whole collection money loop without Telegram, using the real poll
 * reconcile path (v2 settles by polling, not webhooks). The Nomba checkout calls
 * are stubbed so no live request or real money is involved:
 *   create collection → upsert member → start a (stubbed) checkout
 *   → reconcile (poll) once the transfer "lands"
 *   → confirm the member is credited, the workspace owner's wallet is credited,
 *     and a Payment row is written — then re-reconcile to prove idempotency.
 *
 * Run: bun run scripts/money-loop-test.ts
 */

const AMOUNT = 100;

function check(label: string, ok: boolean) {
  console.log(`${ok ? "✅" : "⚠️"} ${label}`);
}

function log(step: string, value: unknown) {
  console.log(`\n${step}`);
  console.dir(value, { depth: null });
}

async function main() {
  const ws = await prisma.workspace.findFirst({ select: { id: true, ownerUserId: true } });
  if (!ws) throw new Error("no workspace — sign up first");

  let seq = 0;
  nomba.checkout.createOrder = async () => ({ checkoutLink: "x", orderReference: `mock_${Date.now()}_${seq++}` });
  nomba.checkout.getFlashAccount = async () => ({
    accountNumber: "9999000011",
    accountName: "Talli/Test",
    bankName: "Nombank MFB",
  });
  let paid = false;
  nomba.checkout.confirmReceipt = async () => ({ status: paid, order: { orderReference: "x", amount: AMOUNT } });

  const ownerWallet = await walletService.ensureWallet(ws.ownerUserId);
  const startBalance = ownerWallet.balance;

  const collection = await collectionService.create(ws.id, ws.ownerUserId, {
    title: "Money-loop test",
    purpose: "automated test",
    collectionType: "fixed_per_person",
    amountPerMember: AMOUNT,
  });
  log("1) collection created", { id: collection.id, amount: collection.amountPerMember });

  const member = await collectionService.upsertMember({
    collectionId: collection.id,
    platform: "telegram",
    platformUserId: "tg_test_777",
    firstName: "Tester",
    username: "tester",
  });
  log("2) member upserted", { id: member.id, expected: member.expectedAmount, status: member.status });

  const started = await paymentService.create({
    purpose: "collection",
    amount: AMOUNT,
    collectionId: collection.id,
    collectionMemberId: member.id,
    payerPlatformUserId: "tg_test_777",
  });
  log("3) checkout started", {
    ref: started.pendingPayment.orderRefId,
    flash: started.flashAccountNumber,
    status: started.pendingPayment.status,
  });

  console.log("\n=== reconcile before payment (not yet paid) ===");
  let done = await paymentService.reconcile(started.pendingPayment.id);
  let m = await prisma.collectionMember.findUnique({ where: { id: member.id } });
  check("not credited while unpaid", !done && m!.paidAmount === 0);

  console.log("\n=== reconcile after payment lands ===");
  paid = true;
  done = await paymentService.reconcile(started.pendingPayment.id);

  const creditedMember = await prisma.collectionMember.findUnique({ where: { id: member.id } });
  const payment = await prisma.payment.findFirst({ where: { providerOrderId: started.pendingPayment.orderRefId } });
  const ownerAfter = await walletService.getByUser(ws.ownerUserId);
  log("5) result", {
    settled: done,
    memberPaidAmount: creditedMember?.paidAmount,
    memberStatus: creditedMember?.status,
    paymentStatus: payment?.status,
    ownerBalance: ownerAfter?.balance,
  });
  check("member credited", creditedMember?.paidAmount === AMOUNT);
  check("Payment row written (successful)", payment?.status === "successful");
  check("owner wallet credited", ownerAfter?.balance === startBalance + AMOUNT);

  console.log("\n=== reconcile again (idempotent — no double credit) ===");
  await paymentService.reconcile(started.pendingPayment.id);
  const afterDup = await prisma.collectionMember.findUnique({ where: { id: member.id } });
  const ownerDup = await walletService.getByUser(ws.ownerUserId);
  const paymentCount = await prisma.payment.count({
    where: { providerOrderId: started.pendingPayment.orderRefId },
  });
  check("no double-credit on member", afterDup?.paidAmount === AMOUNT);
  check("no double-credit on owner wallet", ownerDup?.balance === startBalance + AMOUNT);
  check("exactly one Payment row", paymentCount === 1);

  await prisma.walletTransaction.deleteMany({
    where: { walletId: ownerWallet.id, referenceId: started.pendingPayment.orderRefId },
  });
  await prisma.wallet.update({ where: { id: ownerWallet.id }, data: { balance: startBalance } });
  await prisma.payment.deleteMany({ where: { collectionId: collection.id } });
  await prisma.pendingPayment.deleteMany({ where: { collectionId: collection.id } });
  await prisma.collectionMember.deleteMany({ where: { collectionId: collection.id } });
  await prisma.collection.delete({ where: { id: collection.id } });
  await prisma.platformUser.deleteMany({ where: { platformUserId: "tg_test_777" } });
  console.log("\ncleaned up");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
