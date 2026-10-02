-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('PASSENGER', 'DRIVER');

-- CreateEnum
CREATE TYPE "LeadChannel" AS ENUM ('MANUAL', 'INSTAGRAM_DM', 'INSTAGRAM_LEAD_AD');

-- CreateEnum
CREATE TYPE "LeadMessageDirection" AS ENUM ('IN', 'OUT');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "adName" TEXT,
ADD COLUMN     "channel" "LeadChannel" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "formName" TEXT,
ADD COLUMN     "igUserId" TEXT,
ADD COLUMN     "igUsername" TEXT,
ADD COLUMN     "leadType" "LeadType" NOT NULL DEFAULT 'PASSENGER',
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LeadMessage" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "direction" "LeadMessageDirection" NOT NULL,
    "body" TEXT NOT NULL,
    "igMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramAccount" (
    "id" TEXT NOT NULL,
    "igBusinessId" TEXT NOT NULL,
    "igUsername" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageAccessTokenEnc" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "lastError" TEXT,
    "connectedById" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadMessage_igMessageId_key" ON "LeadMessage"("igMessageId");

-- CreateIndex
CREATE INDEX "LeadMessage_leadId_createdAt_idx" ON "LeadMessage"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAccount_igBusinessId_key" ON "InstagramAccount"("igBusinessId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_igUserId_key" ON "Lead"("igUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_externalId_key" ON "Lead"("externalId");

-- CreateIndex
CREATE INDEX "Lead_channel_idx" ON "Lead"("channel");

-- AddForeignKey
ALTER TABLE "LeadMessage" ADD CONSTRAINT "LeadMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramAccount" ADD CONSTRAINT "InstagramAccount_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

