-- "Skuter ijara" bo‘limi butunlay olib tashlandi: e’lonlar jadvali, uning enum turlari va
-- Smart xaritadagi ijara nuqtalari (MapPlace, category = SCOOTER) o‘chiriladi.
DROP TABLE "RentalListing";
DROP TYPE "RentalVehicleType";
DROP TYPE "RentalOwnerType";
DROP TYPE "RentalListingStatus";

DELETE FROM "MapPlace" WHERE "category" = 'SCOOTER';

-- Postgres enum qiymatini o‘chira olmaydi — tur SCOOTER siz qaytadan yaratiladi.
ALTER TYPE "MapPlaceCategory" RENAME TO "MapPlaceCategory_old";
CREATE TYPE "MapPlaceCategory" AS ENUM ('FUEL', 'SERVICE', 'WASH', 'PARKING', 'EV', 'FOOD', 'HELP', 'OTHER');
ALTER TABLE "MapPlace" ALTER COLUMN "category" TYPE "MapPlaceCategory" USING ("category"::text::"MapPlaceCategory");
DROP TYPE "MapPlaceCategory_old";
