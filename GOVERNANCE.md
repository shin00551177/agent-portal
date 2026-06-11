# GOVERNANCE.md

## Agent Identity
- Name: agent-portal (ASO-SNS Portal)
- Product: Twomi
- Owner: shinnosuke.h@aiavatar.work
- Operator: Hori Shinnosuke (AI Avatar Japan)
- Repository: https://github.com/shin00551177/agent-portal
- Runtime: Railway (Next.js)

## Purpose
- Tasks automated:
  1. ASO: analyze App Store / Google Play metadata, generate optimization proposals, execute approved changes
  2. SNS: generate content hypotheses, post drafts for human approval
- Expected value: reduce manual ASO review cycle from weekly to daily; eliminate blank-page content drafting
- Business KPI: proposals_approved_and_executed / week

## Data Access
- Data level: Level 2–3
  - Level 2: aggregated app metrics (downloads, ratings, keyword rankings)
  - Level 3: write access to App Store Connect and Google Play Console (metadata updates)
- External read sources: App Store Connect API, Google Play API, Apptweak API, YouTube Data API, Google Custom Search
- External write targets: App Store Connect (title/subtitle/keywords/description), Google Play Console (title/short description/description), Slack (ASO alert channel)

## Approval Chain
- All ASO/SNS metadata changes require human approval via the portal UI before execution
- Approval required from: portal session holder (authenticated operator)
- Automated execution is blocked until status = "approved" in the Proposal table
- Unauthenticated callers receive 401 on all approval and execution endpoints

## Kill Switch
- Set env var `AGENT_ENABLED=false` to disable all cron jobs and analysis runs
- Individual agents can be stopped by removing their cron schedule in Railway
- Emergency: set `PORTAL_PASSWORD` to a random value to invalidate all active sessions

## Retirement Conditions
- Agent should be retired if: App Store Connect API is deprecated, Google Play API access is revoked, or the Twomi product is sunset
- Retirement checklist: remove Railway service, revoke Apple/Google API credentials, archive repository

## Change Control
- All code changes require PR review before merge to main
- Security-relevant changes (auth, external write endpoints) require explicit review note
