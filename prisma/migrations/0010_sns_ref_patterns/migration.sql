-- CreateTable: SnsRefVideo
CREATE TABLE "SnsRefVideo" (
    "id"          TEXT NOT NULL,
    "appId"       TEXT NOT NULL,
    "url"         TEXT NOT NULL,
    "platform"    TEXT NOT NULL,
    "account"     TEXT,
    "title"       TEXT,
    "views"       INTEGER,
    "likes"       INTEGER,
    "comments"    INTEGER,
    "shares"      INTEGER,
    "duration"    INTEGER,
    "postedDate"  TEXT,
    "hashtags"    TEXT,
    "bgm"         TEXT,
    "thumbnail"   TEXT,
    "analyzed"    BOOLEAN NOT NULL DEFAULT false,
    "targetAge"   TEXT,
    "category"    TEXT,
    "creatorType" TEXT,
    "visualType"  TEXT,
    "tempo"       TEXT,
    "hook"        TEXT,
    "structure"   TEXT,
    "ctaContent"  TEXT,
    "ctaTiming"   TEXT,
    "whyBuzz"     TEXT,
    "credibility" TEXT,
    "peakMoment"  TEXT,
    "twomiIdea"   TEXT,
    "twomiScript" TEXT,
    "aiComment"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SnsRefVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SnsPattern
CREATE TABLE "SnsPattern" (
    "id"           TEXT NOT NULL,
    "appId"        TEXT NOT NULL,
    "title"        TEXT NOT NULL,
    "platform"     TEXT,
    "targetAge"    TEXT,
    "patternType"  TEXT NOT NULL,
    "description"  TEXT NOT NULL,
    "exampleHooks" JSONB NOT NULL DEFAULT '[]',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SnsPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SnsRefVideo_appId_analyzed_idx" ON "SnsRefVideo"("appId", "analyzed");
CREATE INDEX "SnsPattern_appId_idx" ON "SnsPattern"("appId");

-- AddForeignKey
ALTER TABLE "SnsRefVideo" ADD CONSTRAINT "SnsRefVideo_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "SnsApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SnsPattern" ADD CONSTRAINT "SnsPattern_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "SnsApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
