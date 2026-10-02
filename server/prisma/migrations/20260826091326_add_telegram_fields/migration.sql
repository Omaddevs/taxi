-- AlterTable
ALTER TABLE "User" ADD COLUMN     "language" TEXT,
ADD COLUMN     "telegramId" TEXT;

-- CreateTable
CREATE TABLE "TelegramLoginToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLoginToken_code_key" ON "TelegramLoginToken"("code");

-- CreateIndex
CREATE INDEX "TelegramLoginToken_userId_idx" ON "TelegramLoginToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- AddForeignKey
ALTER TABLE "TelegramLoginToken" ADD CONSTRAINT "TelegramLoginToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

