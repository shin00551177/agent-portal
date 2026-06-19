-- AlterTable: 外部プラットフォームの安定IDと最終同期時刻
ALTER TABLE "SnsAccount" ADD COLUMN     "channelId" TEXT,
ADD COLUMN     "igUserId" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3);

-- CreateTable: 動画ごとの成果データ（時系列）
CREATE TABLE "SnsVideoStat" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "accountId" TEXT,
    "platform" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT,
    "url" TEXT,
    "thumbnail" TEXT,
    "publishedAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "extra" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SnsVideoStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SnsVideoStat_appId_platform_videoId_idx" ON "SnsVideoStat"("appId", "platform", "videoId");

-- CreateIndex
CREATE INDEX "SnsVideoStat_accountId_fetchedAt_idx" ON "SnsVideoStat"("accountId", "fetchedAt");

-- AddForeignKey
ALTER TABLE "SnsVideoStat" ADD CONSTRAINT "SnsVideoStat_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SnsAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
