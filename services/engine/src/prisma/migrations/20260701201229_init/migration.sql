-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "AccountProvider" AS ENUM ('google', 'github', 'apple', 'email');

-- CreateEnum
CREATE TYPE "BillSplitStatus" AS ENUM ('active', 'closed', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "BillSplitSource" AS ENUM ('telegram', 'web');

-- CreateEnum
CREATE TYPE "BillSplitItemStatus" AS ENUM ('available', 'claimed');

-- CreateEnum
CREATE TYPE "ChatPlatform" AS ENUM ('telegram', 'whatsapp');

-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('private', 'group');

-- CreateEnum
CREATE TYPE "LinkedChatStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "ChatLinkPurpose" AS ENUM ('private_link', 'group_link');

-- CreateEnum
CREATE TYPE "BotCommandStatus" AS ENUM ('received', 'parsed', 'confirmed', 'rejected', 'failed');

-- CreateEnum
CREATE TYPE "CollectionType" AS ENUM ('fixed_per_person', 'open_contribution', 'named_members');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('draft', 'active', 'paid', 'partially_paid', 'expired', 'cancelled', 'closed');

-- CreateEnum
CREATE TYPE "CollectionMemberStatus" AS ENUM ('not_paid', 'pending', 'paid', 'underpaid', 'overpaid', 'refunded', 'manual_review');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('pending', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('nomba');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('wallet_topup', 'collection_payment', 'savings_deposit', 'savings_withdrawal', 'transfer_out', 'refund');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'successful', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "PendingPaymentStatus" AS ENUM ('pending', 'completed', 'expired', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "PendingPaymentPurpose" AS ENUM ('wallet_topup', 'savings_funding', 'collection');

-- CreateEnum
CREATE TYPE "SavingsJarStatus" AS ENUM ('active', 'locked', 'completed', 'cancelled', 'withdrawn');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('received', 'processed', 'ignored', 'failed');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorPlatformId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,
    "walletBalance" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountRef" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'nomba',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "provider" "AccountProvider" NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "bankName" TEXT,
    "createdByPlatformUserId" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_splits" (
    "id" TEXT NOT NULL,
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
    "conflicted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bill_split_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linked_chats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "ChatPlatform" NOT NULL,
    "chatType" "ChatType" NOT NULL,
    "platformChatId" TEXT NOT NULL,
    "platformUserId" TEXT,
    "title" TEXT,
    "connectedByPlatformUserId" TEXT,
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "status" "LinkedChatStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linked_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_link_codes" (
    "id" TEXT NOT NULL,
    "platform" "ChatPlatform" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "ChatLinkPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_link_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_users" (
    "id" TEXT NOT NULL,
    "platform" "ChatPlatform" NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "firstName" TEXT,
    "username" TEXT,
    "appUserId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_commands" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "linkedChatId" TEXT,
    "platform" "ChatPlatform" NOT NULL,
    "senderPlatformId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "replyText" TEXT,
    "parsedIntent" JSONB,
    "confidence" DOUBLE PRECISION,
    "status" "BotCommandStatus" NOT NULL DEFAULT 'received',
    "errorMessage" TEXT,
    "clarifyMessageId" INTEGER,
    "askedBy" TEXT,
    "clarifyRounds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "linkedChatId" TEXT,
    "title" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "collectionType" "CollectionType" NOT NULL,
    "amountPerMember" INTEGER,
    "targetAmount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "deadline" TIMESTAMP(3),
    "status" "CollectionStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_members" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "platformUserId" TEXT,
    "appUserId" TEXT,
    "expectedAmount" INTEGER NOT NULL,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "status" "CollectionMemberStatus" NOT NULL DEFAULT 'not_paid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "bucketKey" TEXT NOT NULL,
    "publicUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'ready',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "PaymentDirection" NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "PaymentStatus" NOT NULL DEFAULT 'successful',
    "balanceAfter" INTEGER,
    "collectionId" TEXT,
    "collectionMemberId" TEXT,
    "savingsJarId" TEXT,
    "transferId" TEXT,
    "payerUserId" TEXT,
    "payerPlatformId" TEXT,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'nomba',
    "providerReference" TEXT,
    "providerOrderId" TEXT,
    "referenceId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_payments" (
    "id" TEXT NOT NULL,
    "orderRefId" TEXT NOT NULL,
    "purpose" "PendingPaymentPurpose" NOT NULL,
    "userId" TEXT,
    "savingsJarId" TEXT,
    "collectionId" TEXT,
    "collectionMemberId" TEXT,
    "payerPlatformUserId" TEXT,
    "amount" INTEGER NOT NULL,
    "virtualAccountNumber" TEXT,
    "flashAccountNumber" TEXT,
    "flashBankName" TEXT,
    "flashAccountName" TEXT,
    "status" "PendingPaymentStatus" NOT NULL DEFAULT 'pending',
    "pollAttempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_jars" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" INTEGER,
    "currentAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "lockUntil" TIMESTAMP(3),
    "status" "SavingsJarStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_jars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "signatureValid" BOOLEAN,
    "processingStatus" "WebhookProcessingStatus" NOT NULL DEFAULT 'received',
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_accounts_userId_key" ON "virtual_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_accounts_accountRef_key" ON "virtual_accounts"("accountRef");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerId_key" ON "accounts"("provider", "providerId");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_sessionId_idx" ON "refresh_tokens"("sessionId");

-- CreateIndex
CREATE INDEX "beneficiaries_userId_idx" ON "beneficiaries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_userId_alias_key" ON "beneficiaries"("userId", "alias");

-- CreateIndex
CREATE UNIQUE INDEX "bill_splits_collectionId_key" ON "bill_splits"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "bill_splits_token_key" ON "bill_splits"("token");

-- CreateIndex
CREATE INDEX "bill_splits_createdByUserId_idx" ON "bill_splits"("createdByUserId");

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

-- CreateIndex
CREATE INDEX "linked_chats_userId_idx" ON "linked_chats"("userId");

-- CreateIndex
CREATE INDEX "linked_chats_status_idx" ON "linked_chats"("status");

-- CreateIndex
CREATE UNIQUE INDEX "linked_chats_platform_platformChatId_key" ON "linked_chats"("platform", "platformChatId");

-- CreateIndex
CREATE INDEX "chat_link_codes_createdByUserId_idx" ON "chat_link_codes"("createdByUserId");

-- CreateIndex
CREATE INDEX "chat_link_codes_codeHash_idx" ON "chat_link_codes"("codeHash");

-- CreateIndex
CREATE INDEX "chat_link_codes_expiresAt_idx" ON "chat_link_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "platform_users_appUserId_idx" ON "platform_users"("appUserId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_platform_platformUserId_key" ON "platform_users"("platform", "platformUserId");

-- CreateIndex
CREATE INDEX "bot_commands_userId_idx" ON "bot_commands"("userId");

-- CreateIndex
CREATE INDEX "bot_commands_linkedChatId_idx" ON "bot_commands"("linkedChatId");

-- CreateIndex
CREATE INDEX "bot_commands_status_idx" ON "bot_commands"("status");

-- CreateIndex
CREATE INDEX "collections_ownerUserId_idx" ON "collections"("ownerUserId");

-- CreateIndex
CREATE INDEX "collections_ownerUserId_status_idx" ON "collections"("ownerUserId", "status");

-- CreateIndex
CREATE INDEX "collections_status_idx" ON "collections"("status");

-- CreateIndex
CREATE INDEX "collections_linkedChatId_idx" ON "collections"("linkedChatId");

-- CreateIndex
CREATE INDEX "collection_members_collectionId_idx" ON "collection_members"("collectionId");

-- CreateIndex
CREATE INDEX "collection_members_collectionId_platformUserId_idx" ON "collection_members"("collectionId", "platformUserId");

-- CreateIndex
CREATE INDEX "collection_members_appUserId_idx" ON "collection_members"("appUserId");

-- CreateIndex
CREATE UNIQUE INDEX "media_bucketKey_key" ON "media"("bucketKey");

-- CreateIndex
CREATE INDEX "media_userId_idx" ON "media"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_referenceId_key" ON "payments"("referenceId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_userId_kind_idx" ON "payments"("userId", "kind");

-- CreateIndex
CREATE INDEX "payments_collectionId_idx" ON "payments"("collectionId");

-- CreateIndex
CREATE INDEX "payments_savingsJarId_idx" ON "payments"("savingsJarId");

-- CreateIndex
CREATE INDEX "payments_providerReference_idx" ON "payments"("providerReference");

-- CreateIndex
CREATE INDEX "payments_providerOrderId_idx" ON "payments"("providerOrderId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pending_payments_orderRefId_key" ON "pending_payments"("orderRefId");

-- CreateIndex
CREATE INDEX "pending_payments_status_idx" ON "pending_payments"("status");

-- CreateIndex
CREATE INDEX "pending_payments_userId_idx" ON "pending_payments"("userId");

-- CreateIndex
CREATE INDEX "savings_jars_ownerUserId_idx" ON "savings_jars"("ownerUserId");

-- CreateIndex
CREATE INDEX "savings_jars_status_idx" ON "savings_jars"("status");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_merchantTxRef_key" ON "transfers"("merchantTxRef");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_walletRef_key" ON "transfers"("walletRef");

-- CreateIndex
CREATE INDEX "transfers_userId_idx" ON "transfers"("userId");

-- CreateIndex
CREATE INDEX "transfers_status_idx" ON "transfers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_providerEventId_key" ON "webhook_events"("providerEventId");

-- CreateIndex
CREATE INDEX "webhook_events_provider_idx" ON "webhook_events"("provider");

-- CreateIndex
CREATE INDEX "webhook_events_processingStatus_idx" ON "webhook_events"("processingStatus");

-- CreateIndex
CREATE INDEX "webhook_events_createdAt_idx" ON "webhook_events"("createdAt");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_accounts" ADD CONSTRAINT "virtual_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "linked_chats" ADD CONSTRAINT "linked_chats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linked_chats" ADD CONSTRAINT "linked_chats_connectedByPlatformUserId_fkey" FOREIGN KEY ("connectedByPlatformUserId") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linked_chats" ADD CONSTRAINT "linked_chats_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_link_codes" ADD CONSTRAINT "chat_link_codes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_users" ADD CONSTRAINT "platform_users_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_commands" ADD CONSTRAINT "bot_commands_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_commands" ADD CONSTRAINT "bot_commands_linkedChatId_fkey" FOREIGN KEY ("linkedChatId") REFERENCES "linked_chats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_linkedChatId_fkey" FOREIGN KEY ("linkedChatId") REFERENCES "linked_chats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_members" ADD CONSTRAINT "collection_members_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_members" ADD CONSTRAINT "collection_members_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_collectionMemberId_fkey" FOREIGN KEY ("collectionMemberId") REFERENCES "collection_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_savingsJarId_fkey" FOREIGN KEY ("savingsJarId") REFERENCES "savings_jars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payerUserId_fkey" FOREIGN KEY ("payerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_jars" ADD CONSTRAINT "savings_jars_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
