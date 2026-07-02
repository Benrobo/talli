import prisma from "../src/prisma/index.js";

async function main() {
  const vas = await prisma.virtualAccount.findMany({ orderBy: { createdAt: "desc" } });
  console.log("=== VIRTUAL ACCOUNTS ===");
  for (const va of vas) {
    console.log({
      userId: va.userId,
      accountRef: va.accountRef,
      accountNumber: va.accountNumber,
      bankName: va.bankName,
      accountName: va.accountName,
    });
  }

  const pendings = await prisma.pendingPayment.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log("\n=== RECENT PENDING PAYMENTS ===");
  for (const p of pendings) {
    console.log({
      id: p.id,
      purpose: p.purpose,
      status: p.status,
      amount: p.amount,
      userId: p.userId,
      savingsJarId: p.savingsJarId,
      collectionId: p.collectionId,
      virtualAccountNumber: p.virtualAccountNumber,
      flashAccountNumber: p.flashAccountNumber,
      orderRefId: p.orderRefId,
      pollAttempts: p.pollAttempts,
      expiresAt: p.expiresAt,
      createdAt: p.createdAt,
    });
}

  const users = await prisma.user.findMany({ select: { id: true, email: true, walletBalance: true } });
  console.log("\n=== USERS (balance) ===");
  console.log(users);

  const payments = await prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
  console.log("\n=== RECENT LEDGER (payments) ===");
  console.log(payments.map((p) => ({ kind: p.kind, direction: p.direction, amount: p.amount, status: p.status, balanceAfter: p.balanceAfter, referenceId: p.referenceId })));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
