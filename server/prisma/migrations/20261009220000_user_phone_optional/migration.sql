-- Google sign-ups get an account without a phone; it is asked when first needed (booking etc.)
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;
