-- CreateEnum
CREATE TYPE "CargoOrderStatus" AS ENUM ('NEW', 'CLAIMED', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CargoOrder" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "driverId" TEXT,
    "fromLabel" TEXT NOT NULL,
    "toLabel" TEXT NOT NULL,
    "fromRegion" TEXT,
    "toRegion" TEXT,
    "fromLat" DOUBLE PRECISION,
    "fromLng" DOUBLE PRECISION,
    "toLat" DOUBLE PRECISION,
    "toLng" DOUBLE PRECISION,
    "cargoType" TEXT NOT NULL,
    "weightLabel" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "note" TEXT,
    "price" INTEGER NOT NULL,
    "status" "CargoOrderStatus" NOT NULL DEFAULT 'NEW',
    "claimedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CargoOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CargoOrder_status_createdAt_idx" ON "CargoOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CargoOrder_riderId_idx" ON "CargoOrder"("riderId");

-- CreateIndex
CREATE INDEX "CargoOrder_driverId_idx" ON "CargoOrder"("driverId");

-- AddForeignKey
ALTER TABLE "CargoOrder" ADD CONSTRAINT "CargoOrder_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoOrder" ADD CONSTRAINT "CargoOrder_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
