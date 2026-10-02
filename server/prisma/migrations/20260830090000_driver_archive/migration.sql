-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedReason" TEXT;

-- CreateIndex
CREATE INDEX "Driver_archivedAt_idx" ON "Driver"("archivedAt");
