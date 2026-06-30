import prisma from "../src/prisma/index.js";
import { paymentService } from "../src/services/payment.service.js";
import logger from "../src/lib/logger.js";

/**
 * One-off sync for collection payments that settled before the Payment ledger +
 * wallet credit existed. For every completed `pending_payment` with
 * `purpose = collection`, it replays {@link paymentService.recordCollectionPayment}:
 * writes the missing Payment row and credits the workspace owner's wallet.
 *
 * Idempotent — the wallet ledger dedupes on `referenceId = orderRefId` and the
 * Payment is keyed on `providerOrderId` — so it is safe to run repeatedly and
 * safe to run alongside the live cron. Run with:
 *   bun run db:backfill:collection-payments
 */
async function main(): Promise<void> {
  const settled = await prisma.pendingPayment.findMany({
    where: {
      purpose: "collection",
      status: "completed",
      collectionId: { not: null },
      collectionMemberId: { not: null },
    },
    orderBy: { completedAt: "asc" },
  });

  logger.info(`[backfill] ${settled.length} settled collection payments to sync`);

  let credited = 0;
  let skipped = 0;
  let failed = 0;

  for (const pending of settled) {
    try {
      const before = await prisma.payment.findFirst({
        where: { providerOrderId: pending.orderRefId },
        select: { id: true },
      });

      await paymentService.recordCollectionPayment(pending, pending.amount);

      if (before) {
        skipped += 1;
      } else {
        credited += 1;
        logger.info(
          `[backfill] synced ${pending.orderRefId} (₦${pending.amount}) → collection ${pending.collectionId}`
        );
      }
    } catch (err) {
      failed += 1;
      logger.error(`[backfill] ${pending.orderRefId} failed: ${(err as Error).message}`);
    }
  }

  logger.info(
    `[backfill] done — ${credited} newly synced, ${skipped} already present, ${failed} failed`
  );

  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    logger.error(`[backfill] aborted: ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
