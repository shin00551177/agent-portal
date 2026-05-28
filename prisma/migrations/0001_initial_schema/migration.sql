-- CreateTable
CREATE TABLE IF NOT EXISTS "AsoApp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "googlePlayId" TEXT,
    "iosId" TEXT,
    "country" TEXT NOT NULL DEFAULT 'jp',
    "language" TEXT NOT NULL DEFAULT 'ja',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AsoApp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AsoKeyword" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AsoKeyword_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AsoReport" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "slackSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AsoReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AsoRelease" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "releaseDate" TEXT NOT NULL,
    "notes" TEXT,
    "effectData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AsoRelease_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SnsApp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "platforms" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SnsApp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SnsAccount" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "url" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SnsAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SnsDraft" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "copy" TEXT NOT NULL,
    "hashtags" JSONB NOT NULL,
    "imagePrompt" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SnsDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EgoHit" (
    "id" TEXT NOT NULL,
    "appId" TEXT,
    "source" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "snippet" TEXT,
    "author" TEXT,
    "score" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EgoHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AsoKeyword_appId_keyword_key" ON "AsoKeyword"("appId", "keyword");

-- AddForeignKey
ALTER TABLE "AsoKeyword" ADD CONSTRAINT "AsoKeyword_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "AsoApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AsoReport" ADD CONSTRAINT "AsoReport_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "AsoApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AsoRelease" ADD CONSTRAINT "AsoRelease_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "AsoApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SnsAccount" ADD CONSTRAINT "SnsAccount_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "SnsApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SnsDraft" ADD CONSTRAINT "SnsDraft_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "SnsApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EgoHit" ADD CONSTRAINT "EgoHit_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "SnsApp"("id") ON DELETE SET NULL ON UPDATE CASCADE;
