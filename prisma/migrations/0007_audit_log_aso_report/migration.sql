-- Migration: audit_log + aso_report_structured
-- §7 監査ログ追加 / §8 AsoReport構造化

-- AuditLog table (§7)
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"          TEXT NOT NULL,
  "action"      TEXT NOT NULL,
  "targetTable" TEXT NOT NULL,
  "targetId"    TEXT NOT NULL,
  "beforeValue" JSONB,
  "afterValue"  JSONB,
  "performedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress"   TEXT,
  "userAgent"   TEXT,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_targetTable_targetId_idx" ON "AuditLog"("targetTable", "targetId");
CREATE INDEX IF NOT EXISTS "AuditLog_performedAt_idx" ON "AuditLog"("performedAt");

-- AsoReport: add store metrics columns (§8)
ALTER TABLE "AsoReport"
  ADD COLUMN IF NOT EXISTS "store"            TEXT,
  ADD COLUMN IF NOT EXISTS "country"          TEXT,
  ADD COLUMN IF NOT EXISTS "storeImpressions" INTEGER,
  ADD COLUMN IF NOT EXISTS "storePageViews"   INTEGER,
  ADD COLUMN IF NOT EXISTS "downloads"        INTEGER,
  ADD COLUMN IF NOT EXISTS "source"           TEXT,
  ADD COLUMN IF NOT EXISTS "lookerSyncedAt"   TIMESTAMPTZ;
