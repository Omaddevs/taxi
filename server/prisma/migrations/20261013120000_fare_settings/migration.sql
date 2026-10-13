-- CreateTable
CREATE TABLE "FareSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "perKm" INTEGER NOT NULL DEFAULT 500,
    "minPerSeat" INTEGER NOT NULL DEFAULT 10000,
    "spreadPercent" INTEGER NOT NULL DEFAULT 14,
    "wholeCarDiscountPercent" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FareSettings_pkey" PRIMARY KEY ("id")
);
