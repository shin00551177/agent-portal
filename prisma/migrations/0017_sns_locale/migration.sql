ALTER TABLE "SnsApp" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'ja';
UPDATE "SnsApp" SET "locale" = 'pt-BR' WHERE "id" = 'buzzencer';
