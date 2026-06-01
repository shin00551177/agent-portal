CREATE TABLE "SnsHypothesis" (
    "id"             TEXT NOT NULL,
    "appId"          TEXT NOT NULL,
    "platform"       TEXT NOT NULL,
    "hypothesis"     TEXT NOT NULL,
    "reasoning"      TEXT NOT NULL,
    "targetAudience" TEXT,
    "format"         TEXT,
    "contentBrief"   TEXT,
    "status"         TEXT NOT NULL DEFAULT 'pending',
    "rejectionNote"  TEXT,
    "metrics"        JSONB,
    "briefSentAt"    TIMESTAMP(3),
    "postedAt"       TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SnsHypothesis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SnsProductFeedback" (
    "id"         TEXT NOT NULL,
    "appId"      TEXT NOT NULL,
    "source"     TEXT NOT NULL,
    "type"       TEXT NOT NULL,
    "content"    TEXT NOT NULL,
    "url"        TEXT,
    "author"     TEXT,
    "importance" TEXT NOT NULL DEFAULT 'medium',
    "processed"  BOOLEAN NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SnsProductFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SnsFrequencyRecommendation" (
    "id"                   TEXT NOT NULL,
    "appId"                TEXT NOT NULL,
    "platform"             TEXT NOT NULL,
    "currentFrequency"     INTEGER,
    "recommendedFrequency" INTEGER NOT NULL,
    "reasoning"            TEXT NOT NULL,
    "acceptedAt"           TIMESTAMP(3),
    "adjustedFrequency"    INTEGER,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SnsFrequencyRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SnsHypothesis_appId_status_idx" ON "SnsHypothesis"("appId", "status");
CREATE INDEX "SnsProductFeedback_appId_processed_idx" ON "SnsProductFeedback"("appId", "processed");
CREATE UNIQUE INDEX "SnsFrequencyRecommendation_appId_platform_key" ON "SnsFrequencyRecommendation"("appId", "platform");
CREATE INDEX "SnsFrequencyRecommendation_appId_idx" ON "SnsFrequencyRecommendation"("appId");

ALTER TABLE "SnsHypothesis" ADD CONSTRAINT "SnsHypothesis_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "SnsApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SnsProductFeedback" ADD CONSTRAINT "SnsProductFeedback_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "SnsApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SnsFrequencyRecommendation" ADD CONSTRAINT "SnsFrequencyRecommendation_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "SnsApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
