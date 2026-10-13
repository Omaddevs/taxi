-- Dastlab ko‘chirilgan "taklif bonusi" aksiyasi hozircha saytda ko‘rinmasin: o‘chirilmaydi, faqat
-- faolsiz qilinadi — admin panel → Aksiyalar ro‘yxatida qoladi va istalgan payt qayta yoqiladi.
UPDATE "LandingPromo" SET "active" = false WHERE "id" = 'referral';
