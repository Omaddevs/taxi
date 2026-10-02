-- AlterTable
ALTER TABLE "RideOffer" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "RideOffer_deletedAt_idx" ON "RideOffer"("deletedAt");
