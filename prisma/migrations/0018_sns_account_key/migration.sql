ALTER TABLE "SnsApp" ADD COLUMN IF NOT EXISTS "accountKey" TEXT;
-- Twomiはnull（全アカウントに表示）
-- BUZZENCERはpt-BR
UPDATE "SnsApp" SET "accountKey" = 'pt-BR' WHERE "id" = 'buzzencer';
