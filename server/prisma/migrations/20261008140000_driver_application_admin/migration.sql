-- AlterTable
ALTER TABLE "DriverApplication" ADD COLUMN     "blocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blockedReason" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'WEBAPP',
ADD COLUMN     "toRegion" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Applications whose owner is linked to Telegram almost always came through the bot wizard.
UPDATE "DriverApplication" a SET "source" = 'BOT'
FROM "User" u WHERE u."id" = a."userId" AND u."telegramId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "DriverApplication_blocked_idx" ON "DriverApplication"("blocked");
