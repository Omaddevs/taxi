-- AlterTable
ALTER TABLE "DriverApplication" ADD COLUMN "consentAt" TIMESTAMP(3),
ADD COLUMN "consentVersion" TEXT;

-- AlterTable
ALTER TABLE "LeadDocument" ADD COLUMN "applicationId" TEXT;

-- CreateIndex
CREATE INDEX "LeadDocument_applicationId_idx" ON "LeadDocument"("applicationId");

-- AddForeignKey
ALTER TABLE "LeadDocument" ADD CONSTRAINT "LeadDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "DriverApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
