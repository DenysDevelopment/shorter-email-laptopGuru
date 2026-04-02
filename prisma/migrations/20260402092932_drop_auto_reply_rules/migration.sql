/*
  Warnings:

  - You are about to drop the `AutoReplyRule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AutoReplyRule" DROP CONSTRAINT "AutoReplyRule_channelId_fkey";

-- DropForeignKey
ALTER TABLE "AutoReplyRule" DROP CONSTRAINT "AutoReplyRule_companyId_fkey";

-- DropForeignKey
ALTER TABLE "AutoReplyRule" DROP CONSTRAINT "AutoReplyRule_createdBy_fkey";

-- DropTable
DROP TABLE "AutoReplyRule";

-- DropEnum
DROP TYPE "AutoReplyTrigger";
