-- AlterTable
ALTER TABLE "Driver" ALTER COLUMN "ratingAvg" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "ratingAvg" SET DEFAULT 0;

-- DataFix: rows created before real ratings existed carry the old fake 5.0 default with zero
-- actual ratings behind it — reset those back to the honest "no ratings yet" state. Any row
-- with ratingCount > 0 already reflects a real aggregate and is left untouched.
UPDATE "Driver" SET "ratingAvg" = 0 WHERE "ratingCount" = 0 AND "ratingAvg" != 0;
UPDATE "User" SET "ratingAvg" = 0 WHERE "ratingCount" = 0 AND "ratingAvg" != 0;
