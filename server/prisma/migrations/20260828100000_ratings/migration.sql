
-- CreateEnum
CREATE TYPE "RatingDirection" AS ENUM ('PASSENGER_RATES_DRIVER', 'DRIVER_RATES_PASSENGER');

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "tripRef" TEXT NOT NULL,
    "direction" "RatingDirection" NOT NULL,
    "raterUserId" TEXT NOT NULL,
    "rateeUserId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Rating_rateeUserId_direction_idx" ON "Rating"("rateeUserId", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_tripRef_raterUserId_key" ON "Rating"("tripRef", "raterUserId");

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_raterUserId_fkey" FOREIGN KEY ("raterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_rateeUserId_fkey" FOREIGN KEY ("rateeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

