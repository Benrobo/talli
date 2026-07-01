import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import prisma from "../src/prisma/index.js";

/**
 * Preserves the money data (wallet + wallet transactions + payments + topup
 * pending payments) for a specific user across a `prisma migrate reset`, which
 * wipes the whole dev DB.
 *
 *   bun run scripts/preserve-money-data.ts export   # BEFORE the reset — dumps to JSON
 *   <run prisma migrate reset>                       # DB wiped + migrations replayed
 *   bun run scripts/preserve-money-data.ts import   # AFTER the reset — re-seeds by email
 *
 * The reset creates fresh user/workspace/wallet rows, so import re-links by
 * EMAIL (not old ids): it finds the user, ensures a wallet, and restores the
 * ledger + payments against the new ids. Wallet transactions keep their original
 * `referenceId` so the ledger stays idempotent. Payments are re-attached to the
 * user's active workspace; their now-dangling collection links are dropped (the
 * money record — amount/status/provider/paidAt — is what we care about).
 */

const EMAIL = "alumonabenaiah71@gmail.com";
const BACKUP_FILE = join(import.meta.dirname, "money-backup.json");

interface Backup {
  email: string;
  wallet: { balance: number; currency: string } | null;
  walletTransactions: {
    type: "credit" | "debit";
    amount: number;
    reason: string;
    referenceId: string | null;
    balanceAfter: number;
    createdAt: string;
  }[];
  payments: {
    amount: number;
    currency: string;
    provider: string;
    providerReference: string | null;
    providerOrderId: string | null;
    status: string;
    payerPlatformId: string | null;
    paidAt: string | null;
    createdAt: string;
  }[];
  pendingTopups: {
    orderRefId: string;
    amount: number;
    status: string;
    flashAccountNumber: string | null;
    flashBankName: string | null;
    flashAccountName: string | null;
    completedAt: string | null;
    createdAt: string;
  }[];
}

async function exportData(): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
  if (!user) throw new Error(`No user for ${EMAIL} — nothing to export`);

  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  const walletTransactions = wallet
    ? await prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const workspaces = await prisma.workspace.findMany({
    where: { ownerUserId: user.id },
    select: { id: true },
  });
  const payments = await prisma.payment.findMany({
    where: { workspaceId: { in: workspaces.map((w) => w.id) } },
    orderBy: { createdAt: "asc" },
  });
  const pendingTopups = wallet
    ? await prisma.pendingPayment.findMany({
        where: { walletId: wallet.id, purpose: "topup" },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const backup: Backup = {
    email: EMAIL,
    wallet: wallet ? { balance: wallet.balance, currency: wallet.currency } : null,
    walletTransactions: walletTransactions.map((t) => ({
      type: t.type,
      amount: t.amount,
      reason: t.reason,
      referenceId: t.referenceId,
      balanceAfter: t.balanceAfter,
      createdAt: t.createdAt.toISOString(),
    })),
    payments: payments.map((p) => ({
      amount: p.amount,
      currency: p.currency,
      provider: p.provider,
      providerReference: p.providerReference,
      providerOrderId: p.providerOrderId,
      status: p.status,
      payerPlatformId: p.payerPlatformId,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
    pendingTopups: pendingTopups.map((p) => ({
      orderRefId: p.orderRefId,
      amount: p.amount,
      status: p.status,
      flashAccountNumber: p.flashAccountNumber,
      flashBankName: p.flashBankName,
      flashAccountName: p.flashAccountName,
      completedAt: p.completedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
  };

  writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));
  console.log(
    `✅ exported → ${BACKUP_FILE}\n   wallet: ${backup.wallet ? "yes" : "no"}, ` +
      `tx: ${backup.walletTransactions.length}, payments: ${backup.payments.length}, ` +
      `topups: ${backup.pendingTopups.length}`
  );
}

async function importData(): Promise<void> {
  if (!existsSync(BACKUP_FILE)) throw new Error(`No backup at ${BACKUP_FILE} — run 'export' first`);
  const backup: Backup = JSON.parse(readFileSync(BACKUP_FILE, "utf8"));

  const user = await prisma.user.findUnique({ where: { email: backup.email }, select: { id: true, activeWorkspaceId: true } });
  if (!user) throw new Error(`No user for ${backup.email} after reset — sign in once to create it, then re-run import`);

  // Wallet: restore balance cache; the ledger below is the source of truth.
  const wallet = await prisma.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance: backup.wallet?.balance ?? 0, currency: backup.wallet?.currency ?? "NGN" },
    update: { balance: backup.wallet?.balance ?? 0 },
  });

  let txRestored = 0;
  for (const t of backup.walletTransactions) {
    // Idempotent on referenceId where present; skip if already there.
    if (t.referenceId) {
      const seen = await prisma.walletTransaction.findUnique({ where: { referenceId: t.referenceId } });
      if (seen) continue;
    }
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: t.type,
        amount: t.amount,
        reason: t.reason as never,
        referenceId: t.referenceId,
        balanceAfter: t.balanceAfter,
        createdAt: new Date(t.createdAt),
      },
    });
    txRestored++;
  }

  // Payments need a workspace. Use the user's active/first workspace (created fresh
  // on first sign-in). Dangling collection links are dropped — the money record stays.
  const workspaceId =
    user.activeWorkspaceId ??
    (await prisma.workspace.findFirst({ where: { ownerUserId: user.id }, select: { id: true } }))?.id;

  let payRestored = 0;
  if (!workspaceId) {
    console.warn("⚠️  no workspace for user yet — skipping payments. Sign in to create one, then re-run import.");
  } else {
    for (const p of backup.payments) {
      if (p.providerOrderId) {
        const seen = await prisma.payment.findFirst({ where: { providerOrderId: p.providerOrderId } });
        if (seen) continue;
      }
      await prisma.payment.create({
        data: {
          workspaceId,
          amount: p.amount,
          currency: p.currency,
          provider: p.provider as never,
          providerReference: p.providerReference,
          providerOrderId: p.providerOrderId,
          status: p.status as never,
          payerPlatformId: p.payerPlatformId,
          paidAt: p.paidAt ? new Date(p.paidAt) : null,
          createdAt: new Date(p.createdAt),
        },
      });
      payRestored++;
    }
  }

  let topupRestored = 0;
  for (const p of backup.pendingTopups) {
    const seen = await prisma.pendingPayment.findUnique({ where: { orderRefId: p.orderRefId } });
    if (seen) continue;
    await prisma.pendingPayment.create({
      data: {
        orderRefId: p.orderRefId,
        purpose: "topup",
        walletId: wallet.id,
        amount: p.amount,
        status: p.status as never,
        flashAccountNumber: p.flashAccountNumber,
        flashBankName: p.flashBankName,
        flashAccountName: p.flashAccountName,
        completedAt: p.completedAt ? new Date(p.completedAt) : null,
        createdAt: new Date(p.createdAt),
      },
    });
    topupRestored++;
  }

  console.log(
    `✅ imported for ${backup.email}\n   wallet balance: ${wallet.balance}, ` +
      `tx restored: ${txRestored}/${backup.walletTransactions.length}, ` +
      `payments: ${payRestored}/${backup.payments.length}, topups: ${topupRestored}/${backup.pendingTopups.length}`
  );
}

const cmd = process.argv[2];
const run = cmd === "export" ? exportData : cmd === "import" ? importData : null;
if (!run) {
  console.error("usage: preserve-money-data.ts export | import");
  process.exit(1);
}
run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(`❌ ${(e as Error).message}`);
    process.exit(1);
  });
