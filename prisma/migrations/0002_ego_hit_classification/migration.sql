-- AlterTable: add classification fields to EgoHit
ALTER TABLE "EgoHit" ADD COLUMN IF NOT EXISTS "category"     TEXT;
ALTER TABLE "EgoHit" ADD COLUMN IF NOT EXISTS "sentiment"    TEXT;
ALTER TABLE "EgoHit" ADD COLUMN IF NOT EXISTS "feedbackType" TEXT;
ALTER TABLE "EgoHit" ADD COLUMN IF NOT EXISTS "engagement"   JSONB;
