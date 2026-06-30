/*
  Warnings:

  - You are about to drop the column `orderReference` on the `pending_payments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderRefId]` on the table `pending_payments` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `purpose` on the `pending_payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `orderRefId` on table `pending_payments` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `reason` on the `wallet_transactions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "WalletTransactionReason" AS ENUM ('topup', 'savings_deposit', 'savings_withdrawal', 'collection', 'send', 'refund');

-- CreateEnum
CREATE TYPE "PendingPaymentPurpose" AS ENUM ('topup', 'collection');

-- DropIndex
DROP INDEX "pending_payments_orderReference_key";

-- AlterTable
ALTER TABLE "bot_commands" ADD COLUMN     "askedBy" TEXT,
ADD COLUMN     "clarifyMessageId" INTEGER,
ADD COLUMN     "clarifyRounds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "replyText" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "pending_payments" DROP COLUMN "orderReference",
DROP COLUMN "purpose",
ADD COLUMN     "purpose" "PendingPaymentPurpose" NOT NULL,
ALTER COLUMN "orderRefId" SET NOT NULL;

-- AlterTable
ALTER TABLE "wallet_transactions" DROP COLUMN "reason",
ADD COLUMN     "reason" "WalletTransactionReason" NOT NULL;

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "merchantTxRef" TEXT NOT NULL,
    "nombaTxId" TEXT,
    "walletRef" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "bankName" TEXT,
    "narration" TEXT,
    "senderName" TEXT,
    "createdByPlatformUserId" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'pending',
    "failureReason" TEXT,
    "pollAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transfers_merchantTxRef_key" ON "transfers"("merchantTxRef");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_walletRef_key" ON "transfers"("walletRef");

-- CreateIndex
CREATE INDEX "transfers_workspaceId_idx" ON "transfers"("workspaceId");

-- CreateIndex
CREATE INDEX "transfers_status_idx" ON "transfers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pending_payments_orderRefId_key" ON "pending_payments"("orderRefId");

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
