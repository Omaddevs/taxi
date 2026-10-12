-- CreateTable
CREATE TABLE "LandingPromo" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "prizes" JSONB NOT NULL,
    "terms" TEXT NOT NULL,
    "termsBold" TEXT,
    "soon" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPromo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandingPromo_active_sortOrder_idx" ON "LandingPromo"("active", "sortOrder");

-- Hozir saytda turgan taklif bonusi aksiyasini bazaga ko‘chiramiz — deploydan keyin landing bo‘sh qolmasin.
INSERT INTO "LandingPromo" ("id", "period", "prizes", "terms", "termsBold", "soon", "active", "sortOrder", "updatedAt")
VALUES (
    'referral',
    'doimiy',
    '[{"place":"Siz","reward":"bonus","tail":"har bir do‘st uchun"},{"place":"Do‘stingiz","reward":"bonus","tail":"birinchi safardan keyin"}]',
    'Do‘stingizni taklif qiling: u ro‘yxatdan o‘tib, birinchi buyurtmasini bajarsa, ikkalangiz ham bonus olasiz.',
    'Bonus 24 soat ichida balansga tushadi',
    true,
    true,
    0,
    CURRENT_TIMESTAMP
);
