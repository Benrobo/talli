/*
  Warnings:

  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `media` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actorUserId_fkey";

-- DropTable
DROP TABLE "audit_logs";

-- DropTable
DROP TABLE "media";

-- DropTable
DROP TABLE "notifications";

-- DropEnum
DROP TYPE "MediaStatus";
