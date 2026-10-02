-- CreateEnum
CREATE TYPE "StaffKind" AS ENUM ('ADMIN', 'SALES', 'SUPPORT');

-- CreateEnum
CREATE TYPE "KpiPeriod" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('NEW_USER', 'NEW_DRIVER', 'BOOKING', 'REVENUE', 'CALL', 'NOTE');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('TECHNICAL', 'PAYMENT', 'BOOKING', 'ACCOUNT', 'OTHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "staffKind" "StaffKind";
ALTER TABLE "User" ADD COLUMN "staffActive" BOOLEAN NOT NULL DEFAULT true;

UPDATE "User" SET "staffKind" = 'ADMIN' WHERE "passwordHash" IS NOT NULL AND "staffKind" IS NULL;

-- CreateTable
CREATE TABLE "OperatorKpiTarget" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "period" "KpiPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "newUsers" INTEGER NOT NULL DEFAULT 0,
    "newDrivers" INTEGER NOT NULL DEFAULT 0,
    "bookings" INTEGER NOT NULL DEFAULT 0,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorKpiTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorActivity" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "ticketNo" SERIAL NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requesterPhone" TEXT,
    "requesterName" TEXT,
    "userId" TEXT,
    "assigneeId" TEXT,
    "createdById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperatorKpiTarget_operatorId_period_periodStart_key" ON "OperatorKpiTarget"("operatorId", "period", "periodStart");
CREATE INDEX "OperatorKpiTarget_period_periodStart_idx" ON "OperatorKpiTarget"("period", "periodStart");
CREATE INDEX "OperatorActivity_operatorId_createdAt_idx" ON "OperatorActivity"("operatorId", "createdAt");
CREATE INDEX "OperatorActivity_kind_createdAt_idx" ON "OperatorActivity"("kind", "createdAt");
CREATE UNIQUE INDEX "SupportTicket_ticketNo_key" ON "SupportTicket"("ticketNo");
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");
CREATE INDEX "SupportTicket_assigneeId_status_idx" ON "SupportTicket"("assigneeId", "status");
CREATE INDEX "SupportTicketMessage_ticketId_createdAt_idx" ON "SupportTicketMessage"("ticketId", "createdAt");

-- AddForeignKey
ALTER TABLE "OperatorKpiTarget" ADD CONSTRAINT "OperatorKpiTarget_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperatorActivity" ADD CONSTRAINT "OperatorActivity_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
