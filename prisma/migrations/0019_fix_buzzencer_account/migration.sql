-- BUZZENCERとTwomiは全アカウントに表示（accountKey = null）
UPDATE "SnsApp" SET "accountKey" = NULL WHERE "id" IN ('buzzencer', 'twomi');
