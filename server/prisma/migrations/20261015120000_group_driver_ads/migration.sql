-- CreateEnum
CREATE TYPE "GroupDriverAdStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');

-- CreateTable
CREATE TABLE "GroupDriverAd" (
    "id" TEXT NOT NULL,
    "status" "GroupDriverAdStatus" NOT NULL DEFAULT 'PENDING',
    "chatId" TEXT NOT NULL,
    "chatTitle" TEXT,
    "chatUsername" TEXT,
    "messageId" TEXT,
    "authorTelegramId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorUsername" TEXT,
    "rawText" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "repostCount" INTEGER NOT NULL DEFAULT 1,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromLabel" TEXT,
    "toLabel" TEXT,
    "departAt" TIMESTAMP(3),
    "departNote" TEXT,
    "seats" INTEGER,
    "pricePerSeat" INTEGER,
    "carModel" TEXT,
    "driverName" TEXT,
    "phones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "driverId" TEXT,
    "editedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "rejectReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupDriverAd_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupDriverAd_status_expiresAt_idx" ON "GroupDriverAd"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "GroupDriverAd_dedupeKey_createdAt_idx" ON "GroupDriverAd"("dedupeKey", "createdAt");

-- CreateIndex
CREATE INDEX "GroupDriverAd_createdAt_idx" ON "GroupDriverAd"("createdAt");

-- AddForeignKey
ALTER TABLE "GroupDriverAd" ADD CONSTRAINT "GroupDriverAd_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
