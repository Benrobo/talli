import prisma from "../src/prisma/index.js";
import { walletService } from "../src/services/wallet.service.js";

function check(label: string, ok: boolean) {
  console.log(`${ok ? "✅" : "⚠️"} ${label}`);
}

async function ledgerSum(walletId: string): Promise<number> {
  const rows = await prisma.walletTransaction.findMany({ where: { walletId } });
  return rows.reduce((s, r) => s + (r.type === "credit" ? r.amount : -r.amount), 0);
}

async function main() {
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) throw new Error("no user — sign up first");

  const wallet = await walletService.ensureWallet(user.id);
  check("ensureWallet creates/returns a wallet", !!wallet.id);

  const start = wallet.balance;

  await walletService.credit(wallet.id, 5000, "topup", "ref_topup_1");
  let w = await walletService.getByUser(user.id);
  check("credit 5000 → balance +5000", w!.balance === start + 5000);

  await walletService.debit(wallet.id, 2000, "savings_deposit", "ref_save_1");
  w = await walletService.getByUser(user.id);
  check("debit 2000 → balance +3000", w!.balance === start + 3000);

  check("balance == ledger sum", w!.balance === start + (await ledgerSum(wallet.id)));

  const dup = await walletService.credit(wallet.id, 5000, "topup", "ref_topup_1");
  w = await walletService.getByUser(user.id);
  check("duplicate referenceId → no double-credit", dup.duplicate && w!.balance === start + 3000);

  let blocked = false;
  try {
    await walletService.debit(wallet.id, 999_999_999, "send", "ref_overdraw_1");
  } catch {
    blocked = true;
  }
  w = await walletService.getByUser(user.id);
  check("overdraw rejected, balance unchanged", blocked && w!.balance === start + 3000);

  const noRow = await prisma.walletTransaction.findUnique({ where: { referenceId: "ref_overdraw_1" } });
  check("rejected debit wrote no ledger row", noRow === null);

  await prisma.walletTransaction.deleteMany({
    where: { referenceId: { in: ["ref_topup_1", "ref_save_1"] } },
  });
  await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: start } });
  console.log("\ncleaned up");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
