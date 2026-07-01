import dayjs from "dayjs";
import prisma from "../src/prisma/index.js";
import { walletService } from "../src/services/wallet.service.js";
import { workspaceService } from "../src/services/workspace.service.js";
import { collectionService } from "../src/services/collection.service.js";
import { savingsService } from "../src/services/savings.service.js";
import { billSplitService } from "../src/services/bill-split.service.js";
import { paymentService } from "../src/services/payment.service.js";

/**
 * Seeds a dev account with realistic wallet, savings, collections, bill splits,
 * transfers, and receipt sources (completed top-ups + collection payments).
 *
 *   bun run scripts/seed-user.ts <userId>
 *   bun run scripts/seed-user.ts <userId> --reset
 *
 * All seeded rows are tagged so `--reset` only removes prior seed output:
 *   - reference ids: `seed_<userId>_…`
 *   - titles: `[Seed] …`
 *   - collection purpose: `seed:dev` (bill splits use `bill_split` + `[Seed]` title)
 */

const SEED_PURPOSE = "seed:dev";
const SEED_TITLE_PREFIX = "[Seed] ";

function ref(userId: string, key: string): string {
  return `seed_${userId}_${key}`;
}

function seedTitle(label: string): string {
  return `${SEED_TITLE_PREFIX}${label}`;
}

function log(step: string, detail?: Record<string, unknown>): void {
  const suffix = detail ? ` — ${JSON.stringify(detail)}` : "";
  console.log(`  ${step}${suffix}`);
}

async function reconcileWalletBalance(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return 0;

  const txs = await prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "asc" },
  });

  let balance = 0;
  for (const tx of txs) {
    balance += tx.type === "credit" ? tx.amount : -tx.amount;
  }

  await prisma.wallet.update({ where: { id: wallet.id }, data: { balance } });
  return balance;
}

async function clearSeedData(userId: string, workspaceId: string): Promise<void> {
  const refPrefix = `seed_${userId}_`;

  const seedCollections = await prisma.collection.findMany({
    where: {
      workspaceId,
      OR: [{ purpose: SEED_PURPOSE }, { title: { startsWith: SEED_TITLE_PREFIX } }],
    },
    select: { id: true },
  });
  const collectionIds = seedCollections.map((row) => row.id);

  const seedBillSplits = await prisma.billSplit.findMany({
    where: { workspaceId, title: { startsWith: SEED_TITLE_PREFIX } },
    select: { id: true },
  });
  const billSplitIds = seedBillSplits.map((row) => row.id);

  await prisma.billSplitSelection.deleteMany({ where: { billSplitId: { in: billSplitIds } } });
  await prisma.billSplitItem.deleteMany({ where: { billSplitId: { in: billSplitIds } } });
  await prisma.billSplit.deleteMany({ where: { id: { in: billSplitIds } } });

  await prisma.payment.deleteMany({
    where: {
      OR: [
        { collectionId: { in: collectionIds } },
        { providerOrderId: { startsWith: refPrefix } },
      ],
    },
  });

  await prisma.pendingPayment.deleteMany({
    where: {
      OR: [
        { orderRefId: { startsWith: refPrefix } },
        { collectionId: { in: collectionIds } },
      ],
    },
  });

  await prisma.savingsTransaction.deleteMany({
    where: { savingsJar: { workspaceId, name: { startsWith: SEED_TITLE_PREFIX } } },
  });

  await prisma.savingsJar.deleteMany({
    where: { workspaceId, ownerUserId: userId, name: { startsWith: SEED_TITLE_PREFIX } },
  });

  await prisma.transfer.deleteMany({
    where: { workspaceId, merchantTxRef: { startsWith: refPrefix } },
  });

  await prisma.walletTransaction.deleteMany({
    where: { wallet: { userId }, referenceId: { startsWith: refPrefix } },
  });

  await prisma.collectionMember.deleteMany({ where: { collectionId: { in: collectionIds } } });
  await prisma.collection.deleteMany({ where: { id: { in: collectionIds } } });

  const balance = await reconcileWalletBalance(userId);
  log("cleared prior seed data", { collections: collectionIds.length, walletBalance: balance });
}

async function seedCompletedTopup(
  userId: string,
  walletId: string,
  orderRef: string,
  amount: number,
  completedAt: Date
): Promise<void> {
  await prisma.pendingPayment.create({
    data: {
      orderRefId: orderRef,
      purpose: "topup",
      walletId,
      amount,
      status: "completed",
      completedAt,
      createdAt: completedAt,
      flashAccountNumber: "9999000011",
      flashBankName: "Nombank MFB",
      flashAccountName: "Talli/Seed",
    },
  });
  await walletService.credit(walletId, amount, "topup", orderRef);
}

async function seedCollectionPayment(input: {
  workspaceId: string;
  collectionId: string;
  memberId: string;
  amount: number;
  orderRef: string;
  payerName: string;
  completedAt: Date;
}): Promise<void> {
  const pending = await prisma.pendingPayment.create({
    data: {
      orderRefId: input.orderRef,
      purpose: "collection",
      collectionId: input.collectionId,
      collectionMemberId: input.memberId,
      payerPlatformUserId: `seed_payer_${input.payerName.toLowerCase()}`,
      amount: input.amount,
      status: "completed",
      completedAt: input.completedAt,
      createdAt: input.completedAt,
      flashAccountNumber: "9999000022",
      flashBankName: "Nombank MFB",
      flashAccountName: "Talli/Seed",
    },
  });

  await collectionService.creditMember(input.memberId, input.amount);
  await paymentService.recordCollectionPayment(pending, input.amount);
}

async function seedTransfer(input: {
  userId: string;
  workspaceId: string;
  walletId: string;
  orderRef: string;
  amount: number;
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  narration: string;
  createdAt: Date;
}): Promise<void> {
  await walletService.debit(input.walletId, input.amount, "send", input.orderRef);
  await prisma.transfer.create({
    data: {
      workspaceId: input.workspaceId,
      merchantTxRef: input.orderRef,
      walletRef: input.orderRef,
      amount: input.amount,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
      bankCode: input.bankCode,
      bankName: input.bankName,
      narration: input.narration,
      senderName: "Talli Wallet",
      status: "sent",
      completedAt: input.createdAt,
      createdAt: input.createdAt,
    },
  });
}

async function seedUser(userId: string, reset: boolean): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, activeWorkspaceId: true },
  });
  if (!user) throw new Error(`No user with id ${userId}`);

  await workspaceService.ensureDefaultWorkspace(userId);

  const workspaceId =
    user.activeWorkspaceId ??
    (await prisma.workspace.findFirst({ where: { ownerUserId: userId }, select: { id: true } }))?.id;
  if (!workspaceId) throw new Error(`User ${userId} has no workspace — sign in once first`);

  if (reset) {
    await clearSeedData(userId, workspaceId);
  } else {
    const existing = await prisma.collection.findFirst({
      where: { workspaceId, purpose: SEED_PURPOSE },
      select: { id: true },
    });
    if (existing) {
      console.log("Seed data already exists for this user. Pass --reset to replace it.");
      return;
    }
  }

  const wallet = await walletService.ensureWallet(userId);
  const now = dayjs();

  console.log(`\nSeeding ${user.email ?? userId} in workspace ${workspaceId}\n`);

  console.log("Wallet & receipts");
  await seedCompletedTopup(userId, wallet.id, ref(userId, "topup_recent"), 5_000_000, now.subtract(2, "day").toDate());
  await seedCompletedTopup(userId, wallet.id, ref(userId, "topup_older"), 3_000_000, now.subtract(12, "day").toDate());
  log("top-ups", { count: 2 });

  console.log("\nSavings jars");
  const rentJar = await savingsService.createJar(workspaceId, userId, {
    name: seedTitle("Rent"),
    targetAmount: 20_000_000,
  });
  await walletService.debit(wallet.id, 4_400_000, "savings_deposit", ref(userId, "savings_rent"));
  await savingsService.creditJar(rentJar.id, 4_400_000);
  await savingsService.createJar(workspaceId, userId, {
    name: seedTitle("Laptop"),
    targetAmount: 50_000_000,
  });
  log("jars", { rentSaved: 4_400_000, active: 2 });

  console.log("\nCollections");
  const perPerson = 300_000;
  const football = await collectionService.create(workspaceId, userId, {
    title: seedTitle("Saturday football pitch"),
    purpose: SEED_PURPOSE,
    collectionType: "fixed_per_person",
    amountPerMember: perPerson,
    targetAmount: perPerson * 12,
    deadline: now.add(2, "day").toDate(),
  });

  const footballMembers = [
    "Opeyemi",
    "Benaiah",
    "Ife",
    "Sam",
    "Tobi",
    "Daniel",
    "Mary",
    "Kemi",
    "Ada",
    "Chidi",
    "Ngozi",
    "Yusuf",
  ];
  const paidNames = ["Opeyemi", "Benaiah", "Ife", "Sam"];

  for (const name of footballMembers) {
    await collectionService.addMember(workspaceId, football.id, {
      displayName: name,
      expectedAmount: perPerson,
      platformUserId: `seed_member_${name.toLowerCase()}`,
    });
  }

  const members = await prisma.collectionMember.findMany({
    where: { collectionId: football.id },
    select: { id: true, displayName: true },
  });

  for (const name of paidNames) {
    const member = members.find((row) => row.displayName === name);
    if (!member) continue;
    await seedCollectionPayment({
      workspaceId,
      collectionId: football.id,
      memberId: member.id,
      amount: perPerson,
      orderRef: ref(userId, `collection_football_${name.toLowerCase()}`),
      payerName: name,
      completedAt: now.subtract(paidNames.indexOf(name) + 1, "hour").toDate(),
    });
  }

  await prisma.collection.update({
    where: { id: football.id },
    data: { status: "partially_paid" },
  });

  const closedLunch = await collectionService.create(workspaceId, userId, {
    title: seedTitle("Office lunch — June"),
    purpose: SEED_PURPOSE,
    collectionType: "open_contribution",
    targetAmount: 5_000_000,
  });
  const lunchMember = await collectionService.addMember(workspaceId, closedLunch.id, {
    displayName: "Team pool",
    expectedAmount: 5_000_000,
  });
  await seedCollectionPayment({
    workspaceId,
    collectionId: closedLunch.id,
    memberId: lunchMember.id,
    amount: 5_000_000,
    orderRef: ref(userId, "collection_lunch_closed"),
    payerName: "Team pool",
    completedAt: now.subtract(10, "day").toDate(),
  });
  await prisma.collection.update({ where: { id: closedLunch.id }, data: { status: "paid" } });

  await prisma.collection.create({
    data: {
      workspaceId,
      createdByUserId: userId,
      title: seedTitle("August monthly dues"),
      purpose: SEED_PURPOSE,
      collectionType: "fixed_per_person",
      amountPerMember: 500_000,
      status: "draft",
    },
  });
  log("collections", { live: 1, closed: 1, draft: 1 });

  console.log("\nBill splits");
  const dinnerItems = [
    { name: "Jollof rice", unitPrice: 350_000 },
    { name: "Fried rice", unitPrice: 350_000 },
    { name: "Grilled chicken", unitPrice: 450_000 },
    { name: "Chapman", unitPrice: 150_000 },
    { name: "Water", unitPrice: 50_000 },
    { name: "Service charge", unitPrice: 200_000 },
  ];
  const { billSplit: dinnerSplit } = await billSplitService.createFromItems({
    workspaceId,
    ownerUserId: userId,
    source: "web",
    title: seedTitle("Dinner at Bukka"),
    items: dinnerItems,
    knownNames: ["Tunde", "Amaka"],
  });

  const dinnerBillItems = await prisma.billSplitItem.findMany({
    where: { billSplitId: dinnerSplit.id },
    orderBy: { sortOrder: "asc" },
  });
  const dinnerPick = dinnerBillItems.slice(0, 2);
  const dinnerAmount = dinnerPick.reduce((sum, item) => sum + item.unitPrice, 0);
  const dinnerMember = await collectionService.addMember(workspaceId, dinnerSplit.collectionId, {
    displayName: "Tunde",
    expectedAmount: dinnerAmount,
  });
  const dinnerPending = await prisma.pendingPayment.create({
    data: {
      orderRefId: ref(userId, "billsplit_dinner_tunde"),
      purpose: "collection",
      collectionId: dinnerSplit.collectionId,
      collectionMemberId: dinnerMember.id,
      amount: dinnerAmount,
      status: "completed",
      completedAt: now.subtract(30, "minute").toDate(),
    },
  });
  await prisma.billSplitSelection.create({
    data: {
      billSplitId: dinnerSplit.id,
      collectionMemberId: dinnerMember.id,
      payerName: "Tunde",
      itemIds: dinnerPick.map((item) => item.id),
      amount: dinnerAmount,
      pendingPaymentId: dinnerPending.id,
      paid: false,
    },
  });
  await collectionService.creditMember(dinnerMember.id, dinnerAmount);
  await paymentService.recordCollectionPayment(dinnerPending, dinnerAmount);
  await billSplitService.settleByPendingPaymentId(dinnerPending.id);

  const lunchItems = [
    { name: "Small chops platter", unitPrice: 800_000 },
    { name: "Pasta", unitPrice: 650_000 },
    { name: "Salad", unitPrice: 400_000 },
    { name: "Soft drinks", unitPrice: 250_000 },
  ];
  const { billSplit: closedBillSplit } = await billSplitService.createFromItems({
    workspaceId,
    ownerUserId: userId,
    source: "web",
    title: seedTitle("Office lunch"),
    items: lunchItems,
    knownNames: ["Ada", "Chidi", "Mary", "Sam"],
  });
  const closedBillItems = await prisma.billSplitItem.findMany({
    where: { billSplitId: closedBillSplit.id },
    orderBy: { sortOrder: "asc" },
  });
  const closedTotal = closedBillItems.reduce((sum, item) => sum + item.unitPrice, 0);
  const closedMember = await collectionService.addMember(workspaceId, closedBillSplit.collectionId, {
    displayName: "Ada",
    expectedAmount: closedTotal,
  });
  const closedPending = await prisma.pendingPayment.create({
    data: {
      orderRefId: ref(userId, "billsplit_lunch_ada"),
      purpose: "collection",
      collectionId: closedBillSplit.collectionId,
      collectionMemberId: closedMember.id,
      amount: closedTotal,
      status: "completed",
      completedAt: now.subtract(3, "day").toDate(),
    },
  });
  await prisma.billSplitSelection.create({
    data: {
      billSplitId: closedBillSplit.id,
      collectionMemberId: closedMember.id,
      payerName: "Ada",
      itemIds: closedBillItems.map((item) => item.id),
      amount: closedTotal,
      pendingPaymentId: closedPending.id,
      paid: false,
    },
  });
  await collectionService.creditMember(closedMember.id, closedTotal);
  await paymentService.recordCollectionPayment(closedPending, closedTotal);
  await billSplitService.settleByPendingPaymentId(closedPending.id);
  await prisma.billSplit.update({
    where: { id: closedBillSplit.id },
    data: { status: "closed" },
  });
  log("bill splits", { active: dinnerSplit.token, closed: closedBillSplit.token });

  console.log("\nTransfers");
  await seedTransfer({
    userId,
    workspaceId,
    walletId: wallet.id,
    orderRef: ref(userId, "transfer_tunde"),
    amount: 500_000,
    accountName: "Tunde Adeyinka",
    accountNumber: "0123456789",
    bankCode: "058",
    bankName: "GTBank",
    narration: "Away jersey",
    createdAt: now.subtract(32, "minute").toDate(),
  });
  await seedTransfer({
    userId,
    workspaceId,
    walletId: wallet.id,
    orderRef: ref(userId, "transfer_mama"),
    amount: 2_000_000,
    accountName: "Mama Adeyinka",
    accountNumber: "8012345678",
    bankCode: "999992",
    bankName: "Opay",
    narration: "Upkeep",
    createdAt: now.subtract(12, "day").toDate(),
  });
  await seedTransfer({
    userId,
    workspaceId,
    walletId: wallet.id,
    orderRef: ref(userId, "transfer_sola"),
    amount: 350_000,
    accountName: "Sola Driver",
    accountNumber: "0987654321",
    bankCode: "044",
    bankName: "Access Bank",
    narration: "Weekend trip",
    createdAt: now.subtract(17, "day").toDate(),
  });
  log("transfers", { count: 3, sentThisMonthMinor: 500_000 });

  const balance = await reconcileWalletBalance(userId);

  console.log("\nDone");
  console.log(`  user:     ${user.email ?? userId}`);
  console.log(`  wallet:   ₦${(balance / 100).toLocaleString("en-NG")} (${balance} kobo)`);
  console.log(`  receipts: top-ups + collection payments + transfers (use /api/receipts/:reference)`);
  console.log(`  reset:    bun run scripts/seed-user.ts ${userId} --reset\n`);
}

const userId = process.argv[2];
const reset = process.argv.includes("--reset");

if (!userId || userId.startsWith("-")) {
  console.error("usage: seed-user.ts <userId> [--reset]");
  process.exit(1);
}

seedUser(userId, reset)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`❌ ${(err as Error).message}`);
    process.exit(1);
  });
