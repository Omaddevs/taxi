-- CreateEnum
CREATE TYPE "GiveawayPrize" AS ENUM ('GOING', 'RETURN');
-- CreateTable
CREATE TABLE "GiveawaySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "title" TEXT NOT NULL DEFAULT 'Random mijoz',
    "prizeText" TEXT,
    "channelChatId" TEXT,
    "channelUrl" TEXT,
    "groupChatId" TEXT,
    "groupUrl" TEXT,
    "entriesOpen" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GiveawaySettings_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "GiveawayEntry" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "linkToken" TEXT NOT NULL,
    "telegramId" TEXT,
    "telegramUsername" TEXT,
    "channelMember" BOOLEAN,
    "groupMember" BOOLEAN,
    "checkedAt" TIMESTAMP(3),
    "checkError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GiveawayEntry_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "GiveawayDraw" (
    "id" TEXT NOT NULL,
    "prize" "GiveawayPrize" NOT NULL,
    "count" INTEGER NOT NULL,
    "poolSize" INTEGER NOT NULL,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GiveawayDraw_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "GiveawayWinner" (
    "id" TEXT NOT NULL,
    "drawId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "prize" "GiveawayPrize" NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GiveawayWinner_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "GiveawayEntry_phone_key" ON "GiveawayEntry"("phone");
-- CreateIndex
CREATE UNIQUE INDEX "GiveawayEntry_linkToken_key" ON "GiveawayEntry"("linkToken");
-- CreateIndex
CREATE UNIQUE INDEX "GiveawayEntry_telegramId_key" ON "GiveawayEntry"("telegramId");
-- CreateIndex
CREATE INDEX "GiveawayEntry_createdAt_idx" ON "GiveawayEntry"("createdAt");
-- CreateIndex
CREATE INDEX "GiveawayDraw_createdAt_idx" ON "GiveawayDraw"("createdAt");
-- CreateIndex
CREATE INDEX "GiveawayWinner_entryId_idx" ON "GiveawayWinner"("entryId");
-- CreateIndex
CREATE UNIQUE INDEX "GiveawayWinner_drawId_entryId_key" ON "GiveawayWinner"("drawId", "entryId");
-- AddForeignKey
ALTER TABLE "GiveawayWinner" ADD CONSTRAINT "GiveawayWinner_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "GiveawayDraw"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "GiveawayWinner" ADD CONSTRAINT "GiveawayWinner_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "GiveawayEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
