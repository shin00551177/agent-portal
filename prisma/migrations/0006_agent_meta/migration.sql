-- Migration: agent_meta
-- Adds agentMeta JSON field for Agent台帳管理 (運用ポリシー §5)

ALTER TABLE "SnsApp"
  ADD COLUMN IF NOT EXISTS "agentMeta" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "AsoApp"
  ADD COLUMN IF NOT EXISTS "agentMeta" JSONB NOT NULL DEFAULT '{}';
