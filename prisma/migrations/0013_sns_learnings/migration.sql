CREATE TABLE "SnsLearning" (
    "id"        TEXT NOT NULL,
    "appId"     TEXT NOT NULL,
    "type"      TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "platform"  TEXT,
    "source"    TEXT NOT NULL DEFAULT 'human',
    "active"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SnsLearning_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SnsLearning_appId_active_idx" ON "SnsLearning"("appId", "active");
ALTER TABLE "SnsLearning" ADD CONSTRAINT "SnsLearning_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "SnsApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
