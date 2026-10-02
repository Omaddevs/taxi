-- CreateEnum
CREATE TYPE "CarFuelType" AS ENUM ('BENZIN', 'ELECTRO_HYBRID');

-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "fuelType" "CarFuelType" NOT NULL DEFAULT 'BENZIN',
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Car_brand_model_key" ON "Car"("brand", "model");
