-- CreateEnum
CREATE TYPE "PersonPickerStatus" AS ENUM ('active', 'closed', 'expired', 'cancelled');

-- CreateTable
CREATE TABLE "person_pickers" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "linkedChatId" TEXT,
    "collectionId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "PersonPickerStatus" NOT NULL DEFAULT 'active',
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "subtotal" INTEGER,
    "total" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_pickers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_picker_items" (
    "id" TEXT NOT NULL,
    "pickerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "maxQuantity" INTEGER NOT NULL DEFAULT 99,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_picker_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_picker_selections" (
    "id" TEXT NOT NULL,
    "pickerId" TEXT NOT NULL,
    "collectionMemberId" TEXT NOT NULL,
    "payerName" TEXT NOT NULL,
    "selections" JSONB NOT NULL,
    "amount" INTEGER NOT NULL,
    "checkoutLink" TEXT,
    "pendingPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_picker_selections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "person_pickers_collectionId_key" ON "person_pickers"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "person_pickers_token_key" ON "person_pickers"("token");

-- CreateIndex
CREATE INDEX "person_pickers_workspaceId_idx" ON "person_pickers"("workspaceId");

-- CreateIndex
CREATE INDEX "person_pickers_linkedChatId_idx" ON "person_pickers"("linkedChatId");

-- CreateIndex
CREATE INDEX "person_pickers_status_idx" ON "person_pickers"("status");

-- CreateIndex
CREATE INDEX "person_picker_items_pickerId_idx" ON "person_picker_items"("pickerId");

-- CreateIndex
CREATE UNIQUE INDEX "person_picker_selections_collectionMemberId_key" ON "person_picker_selections"("collectionMemberId");

-- CreateIndex
CREATE INDEX "person_picker_selections_pickerId_idx" ON "person_picker_selections"("pickerId");

-- AddForeignKey
ALTER TABLE "person_pickers" ADD CONSTRAINT "person_pickers_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_pickers" ADD CONSTRAINT "person_pickers_linkedChatId_fkey" FOREIGN KEY ("linkedChatId") REFERENCES "linked_chats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_pickers" ADD CONSTRAINT "person_pickers_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_pickers" ADD CONSTRAINT "person_pickers_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_picker_items" ADD CONSTRAINT "person_picker_items_pickerId_fkey" FOREIGN KEY ("pickerId") REFERENCES "person_pickers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_picker_selections" ADD CONSTRAINT "person_picker_selections_pickerId_fkey" FOREIGN KEY ("pickerId") REFERENCES "person_pickers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_picker_selections" ADD CONSTRAINT "person_picker_selections_collectionMemberId_fkey" FOREIGN KEY ("collectionMemberId") REFERENCES "collection_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
