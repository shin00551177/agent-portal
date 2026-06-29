-- AlterTable: アカウント単位の活性フラグ（false=未連携/非活性。同期スキップ・データは保持）
ALTER TABLE "SnsAccount" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- Data backfill: Twomi の未連携 Instagram アカウントを非活性化（IGは公式 twomijp のみ運用。
-- 残り3アカウントは Meta Business 未連携で igUserId 解決不可 → 同期のたびにエラーになるため非活性化）。
UPDATE "SnsAccount"
SET "active" = false
WHERE "platform" = 'instagram'
  AND "username" IN ('twomi_lovemi', 'twomi_showmi', 'twomi_lifeme');
