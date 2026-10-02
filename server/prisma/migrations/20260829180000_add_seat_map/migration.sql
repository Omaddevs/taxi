
-- CreateEnum
CREATE TYPE "SeatPosition" AS ENUM ('FRONT', 'REAR_LEFT', 'REAR_MIDDLE', 'REAR_RIGHT');

-- CreateEnum
CREATE TYPE "SeatStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'BOOKED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "RideOffer" ADD COLUMN     "contactPhones" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" "Gender";

-- CreateTable
CREATE TABLE "OfferSeat" (
    "id" TEXT NOT NULL,
    "rideOfferId" TEXT NOT NULL,
    "position" "SeatPosition" NOT NULL,
    "status" "SeatStatus" NOT NULL DEFAULT 'AVAILABLE',
    "gender" "Gender",

    CONSTRAINT "OfferSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingSeat" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "offerSeatId" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,

    CONSTRAINT "BookingSeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OfferSeat_rideOfferId_position_key" ON "OfferSeat"("rideOfferId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "BookingSeat_offerSeatId_key" ON "BookingSeat"("offerSeatId");

-- CreateIndex
CREATE INDEX "BookingSeat_bookingId_idx" ON "BookingSeat"("bookingId");

-- AddForeignKey
ALTER TABLE "OfferSeat" ADD CONSTRAINT "OfferSeat_rideOfferId_fkey" FOREIGN KEY ("rideOfferId") REFERENCES "RideOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSeat" ADD CONSTRAINT "BookingSeat_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSeat" ADD CONSTRAINT "BookingSeat_offerSeatId_fkey" FOREIGN KEY ("offerSeatId") REFERENCES "OfferSeat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

