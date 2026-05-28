-- Migration: governance_fields
-- Adds governance compliance fields per AI AGENT 行動規範 v0.1

-- SnsApp: escalation thresholds (#8), halt conditions (#12), fallback behavior (#13)
ALTER TABLE "SnsApp"
  ADD COLUMN IF NOT EXISTS "escalationRules"  JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "haltConditions"   JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "fallbackBehavior" TEXT  NOT NULL DEFAULT 'pause';

-- AsoApp: same governance fields
ALTER TABLE "AsoApp"
  ADD COLUMN IF NOT EXISTS "escalationRules"  JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "haltConditions"   JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "fallbackBehavior" TEXT  NOT NULL DEFAULT 'pause';

-- SnsDraft: confidence (#11) and data freshness (#11)
ALTER TABLE "SnsDraft"
  ADD COLUMN IF NOT EXISTS "confidence"    TEXT      NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS "dataFreshness" TIMESTAMP WITH TIME ZONE;

-- Proposal: same uncertainty fields (#11)
ALTER TABLE "Proposal"
  ADD COLUMN IF NOT EXISTS "confidence"    TEXT      NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS "dataFreshness" TIMESTAMP WITH TIME ZONE;
