INSERT INTO "SnsApp" ("id", "name", "active", "platforms", "escalationRules", "haltConditions", "fallbackBehavior", "agentMeta", "createdAt")
VALUES ('buzzencer', 'BUZZENCER', true, '["youtube","tiktok","instagram","x"]', '{}', '{}', 'pause', '{}', NOW())
ON CONFLICT ("id") DO UPDATE SET "active" = true, "name" = 'BUZZENCER';
