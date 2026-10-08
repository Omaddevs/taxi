-- AlterEnum
ALTER TYPE "MapPlaceCategory" ADD VALUE 'SCOOTER' BEFORE 'OTHER';

-- CreateEnum
CREATE TYPE "RentalVehicleType" AS ENUM ('SCOOTER', 'E_SCOOTER', 'BICYCLE', 'E_BIKE', 'MOTORCYCLE');

-- CreateEnum
CREATE TYPE "RentalOwnerType" AS ENUM ('COMPANY', 'PERSON');

-- CreateEnum
CREATE TYPE "RentalListingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "RentalListing" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "ownerType" "RentalOwnerType" NOT NULL DEFAULT 'PERSON',
    "companyName" TEXT,
    "contactName" TEXT,
    "phone" TEXT NOT NULL,
    "telegram" TEXT,
    "vehicleType" "RentalVehicleType" NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "description" TEXT,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "pricePerHour" INTEGER,
    "pricePerDay" INTEGER,
    "pricePerWeek" INTEGER,
    "deposit" INTEGER,
    "maxSpeed" INTEGER,
    "rangeKm" INTEGER,
    "licenseRequired" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "status" "RentalListingStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentalListing_status_active_vehicleType_idx" ON "RentalListing"("status", "active", "vehicleType");

-- CreateIndex
CREATE INDEX "RentalListing_ownerId_idx" ON "RentalListing"("ownerId");

-- AddForeignKey
ALTER TABLE "RentalListing" ADD CONSTRAINT "RentalListing_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
