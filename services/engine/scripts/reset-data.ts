import prisma from "../src/prisma/index.js";

/**
 * Wipes all product data (money, collections, savings, chats, bill-splits,
 * notifications, etc.) while KEEPING the user, their auth, and their default
 * "My workspace". The wallet is kept but reset to a zero balance with no ledger.
 *
 *   bun run scripts/reset-data.ts
 *
 * Everything is deleted globally — this is a single-tenant dev database. Extra
 * workspaces (anything that is not "My workspace") are removed too.
 */

const KEEP_WORKSPACE_SLUG = "my-workspace";

async function main() {
  // Children first, then parents — explicit and FK-safe even though many rows
  // would cascade from workspace deletion.
  await prisma.billSplitSelection.deleteMany({});
  await prisma.billSplitItem.deleteMany({});
  await prisma.billSplit.deleteMany({});

  await prisma.savingsTransaction.deleteMany({});
  await prisma.savingsJar.deleteMany({});

  await prisma.collectionMember.deleteMany({});
  await prisma.collection.deleteMany({});

  await prisma.transfer.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.pendingPayment.deleteMany({});
  await prisma.walletTransaction.deleteMany({});

  await prisma.chatLinkCode.deleteMany({});
  await prisma.linkedChat.deleteMany({});
  await prisma.botCommand.deleteMany({});
  await prisma.platformUser.deleteMany({});

  await prisma.notification.deleteMany({});
  await prisma.beneficiary.deleteMany({});
  await prisma.webhookEvent.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.media.deleteMany({});

  // Reset every wallet to a clean zero balance (ledger already cleared above).
  await prisma.wallet.updateMany({ data: { balance: 0 } });

  // Drop any workspace that isn't the default. Point users whose active
  // workspace was removed back at their kept "My workspace".
  const kept = await prisma.workspace.findMany({
    where: { slug: KEEP_WORKSPACE_SLUG },
    select: { id: true, ownerUserId: true },
  });
  const keptIds = kept.map((w) => w.id);

  const removed = await prisma.workspace.deleteMany({
    where: { slug: { not: KEEP_WORKSPACE_SLUG } },
  });

  for (const w of kept) {
    await prisma.user.updateMany({
      where: { id: w.ownerUserId, activeWorkspaceId: { notIn: keptIds } },
      data: { activeWorkspaceId: w.id },
    });
  }

  const users = await prisma.user.count();
  console.log(
    `✅ data reset\n   users kept: ${users}, workspaces kept: ${kept.length} (my-workspace), ` +
      `workspaces removed: ${removed.count}, wallets zeroed.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(`❌ ${(e as Error).message}`);
    process.exit(1);
  });
