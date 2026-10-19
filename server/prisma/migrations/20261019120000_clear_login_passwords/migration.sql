-- Passwords are kept only as passwordHash; drop the plaintext copies stored so far.
UPDATE "User" SET "loginPassword" = NULL WHERE "loginPassword" IS NOT NULL;
