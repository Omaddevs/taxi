-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "authorAvatar" TEXT,
ADD COLUMN     "authorName" TEXT,
ADD COLUMN     "authorRole" TEXT,
ADD COLUMN     "bannerImage" TEXT,
ADD COLUMN     "bannerLabel" TEXT,
ADD COLUMN     "bannerText" TEXT,
ADD COLUMN     "bannerTitle" TEXT,
ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "coverCaption" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "NewsPost_published_views_idx" ON "NewsPost"("published", "views");
