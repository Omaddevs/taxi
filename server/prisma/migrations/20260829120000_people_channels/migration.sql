-- CreateEnum
CREATE TYPE "ChannelSource" AS ENUM ('WEBAPP', 'BOT', 'GROUP');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "telegramUsername" TEXT;
ALTER TABLE "User" ADD COLUMN "signupSource" "ChannelSource" NOT NULL DEFAULT 'WEBAPP';
ALTER TABLE "User" ADD COLUMN "fromWebapp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "fromBot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "fromGroup" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "notes" TEXT;

UPDATE "User" SET "fromBot" = true, "signupSource" = 'BOT' WHERE "telegramId" IS NOT NULL;
UPDATE "User" SET "fromWebapp" = true WHERE "telegramId" IS NULL AND "staffKind" IS NULL;
UPDATE "User" SET "fromWebapp" = true WHERE "telegramId" IS NOT NULL AND "verified" = true;
