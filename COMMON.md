# agent-portal — Common Operating Base

Shared contract for any agent (Claude Code, Codex) working in this repo.

## What this is
- Purpose: ASO optimization and SNS content automation for Twomi (iOS/Android)
- Product / Owner: Twomi / shinnosuke.h@aiavatar.work
- Stack: Next.js 16, TypeScript, Prisma (PostgreSQL), Railway
- All external write operations (App Store, Google Play) require human approval via the portal UI before execution

## Hard rules

1. **Never execute without approval.** External write endpoints (`/api/proposals/[id]/execute`) must verify `isAuthenticated()` and proposal `status === "approved"` before proceeding.
2. **No credential fallbacks.** `SESSION_SECRET` and `PORTAL_PASSWORD` must be set; crash on startup if missing. Never fall back to hardcoded strings.
3. **Audit every write.** All state-changing actions must call `writeAuditLog()` before returning.
4. **Proposal-gated writes only.** Direct writes to App Store Connect or Google Play must always go through the Proposal → approval → execute flow. Never bypass via a direct API call from a cron job.
5. **One feature per PR.** Security-relevant changes require explicit review note in PR description.

## Data boundaries
- Level 2 data (aggregated metrics): freely readable by agents for analysis
- Level 3 data (raw listings, write targets): only touched after human approval; all changes logged
- Never expose raw API credentials in responses, logs, or error messages

## Secrets
- All secrets via environment variables (see `.env.example`)
- Never hardcode secrets or commit `.env.local`
- API keys must be server-side only; never expose to the browser

## Directory structure
```
app/api/          — Next.js route handlers (all server-side)
app/api/proposals/  — proposal approval and execution endpoints (auth required)
app/api/aso/      — ASO analysis and reporting
app/api/sns/      — SNS hypothesis generation
lib/              — shared utilities (auth, db, external APIs)
prisma/           — database schema and migrations
```

## Auth model
- Browser UI: cookie-based session (`isAuthenticated()` from `lib/auth.ts`)
- Agent-to-portal writes (proposal creation): `x-api-key: PORTAL_API_KEY`
- Cron jobs: `Authorization: Bearer CRON_SECRET`
- Unauthenticated callers on protected endpoints: 401
