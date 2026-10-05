-- CreateEnum
CREATE TYPE "MapPlaceCategory" AS ENUM ('FUEL', 'SERVICE', 'WASH', 'PARKING', 'EV', 'FOOD', 'HELP', 'OTHER');

-- CreateTable
CREATE TABLE "MapPlace" (
    "id" TEXT NOT NULL,
    "category" "MapPlaceCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "hours" TEXT,
    "description" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT,
    "prices" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapPlace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapPlace_active_category_idx" ON "MapPlace"("active", "category");

