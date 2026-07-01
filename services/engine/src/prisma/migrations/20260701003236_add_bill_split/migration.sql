-- CreateEnum
CREATE TYPE "BillSplitStatus" AS ENUM ('active', 'closed', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "BillSplitSource" AS ENUM ('telegram', 'web');

-- CreateEnum
CREATE TYPE "BillSplitItemStatus" AS ENUM ('available', 'claimed');

-- CreateTable
CREATE TABLE "bill_splits" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "linkedChatId" TEXT,
    "collectionId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "source" "BillSplitSource" NOT NULL DEFAULT 'telegram',
    "status" "BillSplitStatus" NOT NULL DEFAULT 'active',
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "subtotal" INTEGER,
    "total" INTEGER,
    "knownNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bill_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_split_items" (
    "id" TEXT NOT NULL,
    "billSplitId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "BillSplitItemStatus" NOT NULL DEFAULT 'available',
    "paidByName" TEXT,
    "claimedBySelectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bill_split_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_split_selections" (
    "id" TEXT NOT NULL,
    "billSplitId" TEXT NOT NULL,
    "collectionMemberId" TEXT NOT NULL,
    "payerName" TEXT NOT NULL,
    "itemIds" TEXT[],
    "amount" INTEGER NOT NULL,
    "checkoutLink" TEXT,
    "pendingPaymentId" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bill_split_selections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bill_splits_collectionId_key" ON "bill_splits"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "bill_splits_token_key" ON "bill_splits"("token");

-- CreateIndex
CREATE INDEX "bill_splits_workspaceId_idx" ON "bill_splits"("workspaceId");

-- CreateIndex
CREATE INDEX "bill_splits_linkedChatId_idx" ON "bill_splits"("linkedChatId");

-- CreateIndex
CREATE INDEX "bill_splits_status_idx" ON "bill_splits"("status");

-- CreateIndex
CREATE INDEX "bill_split_items_billSplitId_idx" ON "bill_split_items"("billSplitId");

-- CreateIndex
CREATE UNIQUE INDEX "bill_split_selections_collectionMemberId_key" ON "bill_split_selections"("collectionMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "bill_split_selections_pendingPaymentId_key" ON "bill_split_selections"("pendingPaymentId");

-- CreateIndex
CREATE INDEX "bill_split_selections_billSplitId_idx" ON "bill_split_selections"("billSplitId");

-- CreateIndex
CREATE INDEX "bill_split_selections_pendingPaymentId_idx" ON "bill_split_selections"("pendingPaymentId");

-- AddForeignKey
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_linkedChatId_fkey" FOREIGN KEY ("linkedChatId") REFERENCES "linked_chats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_split_items" ADD CONSTRAINT "bill_split_items_billSplitId_fkey" FOREIGN KEY ("billSplitId") REFERENCES "bill_splits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_split_selections" ADD CONSTRAINT "bill_split_selections_billSplitId_fkey" FOREIGN KEY ("billSplitId") REFERENCES "bill_splits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_split_selections" ADD CONSTRAINT "bill_split_selections_collectionMemberId_fkey" FOREIGN KEY ("collectionMemberId") REFERENCES "collection_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
