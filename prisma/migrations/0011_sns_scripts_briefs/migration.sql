-- CreateTable: SnsScript
CREATE TABLE "SnsScript" (
    "id"              TEXT NOT NULL,
    "appId"           TEXT NOT NULL,
    "platform"        TEXT NOT NULL,
    "targetAge"       TEXT,
    "title"           TEXT NOT NULL,
    "hook"            TEXT,
    "scriptContent"   TEXT,
    "productionNotes" TEXT,
    "imagePrompts"    TEXT,
    "refVideoId"      TEXT,
    "status"          TEXT NOT NULL DEFAULT 'draft',
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SnsScript_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SnsBrief
CREATE TABLE "SnsBrief" (
    "id"               TEXT NOT NULL,
    "appId"            TEXT NOT NULL,
    "platform"         TEXT NOT NULL,
    "targetAge"        TEXT,
    "scriptContent"    TEXT NOT NULL,
    "captions"         JSONB NOT NULL DEFAULT '[]',
    "higgsfieldPrompt" TEXT,
    "status"           TEXT NOT NULL DEFAULT 'draft',
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SnsBrief_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SnsScript_appId_idx" ON "SnsScript"("appId");
CREATE INDEX "SnsBrief_appId_idx"  ON "SnsBrief"("appId");

ALTER TABLE "SnsScript" ADD CONSTRAINT "SnsScript_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "SnsApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SnsBrief"  ADD CONSTRAINT "SnsBrief_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "SnsApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
