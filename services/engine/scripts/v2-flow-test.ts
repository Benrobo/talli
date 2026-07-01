import prisma from "../src/prisma/index.js";
import { nomba } from "../src/integrations/nomba/index.js";
import { walletService } from "../src/services/wallet.service.js";
import { paymentService } from "../src/services/payment.service.js";
import { savingsService } from "../src/services/savings.service.js";

function check(label: string, ok: boolean) {
  console.log(`${ok ? "✅" : "⚠️"} ${label}`);
}

async function main() {
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) throw new Error("no user");
  const ws = await prisma.workspace.findFirst({ select: { id: true, ownerUserId: true } });
  if (!ws) throw new Error("no workspace");

  // Stub the Nomba checkout calls so no real money / live request happens.
  let seq = 0;
  nomba.checkout.createOrder = async () => ({ checkoutLink: "x", orderReference: `mock_${Date.now()}_${seq++}` });
  nomba.checkout.getFlashAccount = async () => ({
    accountNumber: "9999000011",
    accountName: "Talli/Test",
    bankName: "Nombank MFB",
  });
  let paid = false;
  nomba.checkout.confirmReceipt = async () => ({ status: paid, order: { orderReference: "x", amount: 5000 } });

  const wallet = await walletService.ensureWallet(user.id);
  const start = wallet.balance;

  console.log("\n=== top-up ===");
  const topup = await walletService.startTopUp(user.id, 5000);
  check("flash account number issued", topup.flashAccountNumber === "9999000011");
  check("pending payment created (pending)", topup.pendingPayment.status === "pending");

  console.log("\n=== reconcile before payment (not yet paid) ===");
  let done = await paymentService.reconcile(topup.pendingPayment.id);
  let w = await walletService.getByUser(user.id);
  check("not credited while unpaid", !done && w!.balance === start);

  console.log("\n=== reconcile after payment lands ===");
  paid = true;
  done = await paymentService.reconcile(topup.pendingPayment.id);
  w = await walletService.getByUser(user.id);
  check("wallet credited 5000", done && w!.balance === start + 5000);

  console.log("\n=== reconcile again (idempotent — no double credit) ===");
  await paymentService.reconcile(topup.pendingPayment.id);
  w = await walletService.getByUser(user.id);
  check("no double credit (status guard)", w!.balance === start + 5000);

  console.log("\n=== savings: debit wallet ===");
  const jar = await savingsService.createJar(ws.id, ws.ownerUserId, { name: `v2test_${Date.now()}` });
  await walletService.debit(wallet.id, 2000, "savings_deposit", `v2_save_${Date.now()}`);
  await savingsService.creditJar(jar.id, 2000);
  w = await walletService.getByUser(user.id);
  const freshJar = await prisma.savingsJar.findUnique({ where: { id: jar.id } });
  check("wallet debited 2000 → balance +3000", w!.balance === start + 3000);
  check("jar credited 2000", freshJar?.currentAmount === 2000);

  // cleanup
  await prisma.savingsTransaction.deleteMany({ where: { savingsJarId: jar.id } });
  await prisma.savingsJar.delete({ where: { id: jar.id } });
  await prisma.pendingPayment.delete({ where: { id: topup.pendingPayment.id } });
  await prisma.walletTransaction.deleteMany({ where: { walletId: wallet.id, reason: { in: ["topup", "savings_deposit"] } } });
  await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: start } });
  console.log("\ncleaned up");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
