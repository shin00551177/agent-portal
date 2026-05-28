-- CreateTable: AnalysisRun
CREATE TABLE IF NOT EXISTS "AnalysisRun" (
  "id"         TEXT         NOT NULL,
  "domain"     TEXT         NOT NULL,
  "targetId"   TEXT,
  "status"     TEXT         NOT NULL DEFAULT 'running',
  "summary"    TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Proposal
CREATE TABLE IF NOT EXISTS "Proposal" (
  "id"            TEXT         NOT NULL,
  "domain"        TEXT         NOT NULL,
  "targetType"    TEXT,
  "targetId"      TEXT,
  "title"         TEXT         NOT NULL,
  "summary"       TEXT         NOT NULL,
  "rationale"     TEXT         NOT NULL,
  "decisionType"  TEXT         NOT NULL DEFAULT 'yesno',
  "options"       JSONB,
  "status"        TEXT         NOT NULL DEFAULT 'pending',
  "decision"      TEXT,
  "decidedAt"     TIMESTAMP(3),
  "actionType"    TEXT         NOT NULL,
  "actionPayload" JSONB,
  "executedAt"    TIMESTAMP(3),
  "result"        JSONB,
  "sourceJobId"   TEXT,
  "sourceData"    JSONB,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_sourceJobId_fkey"
  FOREIGN KEY ("sourceJobId") REFERENCES "AnalysisRun"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Proposal_status_idx"          ON "Proposal"("status");
CREATE INDEX IF NOT EXISTS "Proposal_domain_targetId_idx" ON "Proposal"("domain", "targetId");
CREATE INDEX IF NOT EXISTS "Proposal_sourceJobId_idx"     ON "Proposal"("sourceJobId");
