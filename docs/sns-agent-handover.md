# SNS Agent — Implementation Status & Operating Guide (for Wang)

> Owner: shinnosuke.h@aiavatar.work · Last updated: 2026-06-19
> Repo (canonical): `torilab-ai/op-agent-ASO-SNS` · Panel: **aso-sns-panel**
> Live portal: https://agent-portal-production-ba67.up.railway.app

This is the full implementation handover for the **SNS Agent** (and the ASO Agent it shares a panel with). You now have **admin** on the implementation repo — this doc gets you from zero to shipping with no discovery work.

---

## 0. Your access (what you have / what's still manual)

| What | Status | Notes |
|---|---|---|
| GitHub `torilab-ai/op-agent-ASO-SNS` | ✅ **admin** (`yitianwang-dev`) | Code, PRs, branch settings, **Actions Secrets**, collaborator mgmt. This is the source of truth. |
| GitHub `shin00551177/agent-portal` (mirror) | ⛔ not granted (by design) | Railway's deploy source. It is **force-pushed from canonical** by `mirror-to-railway.yml`. Don't edit it directly — changes get overwritten. |
| Railway project (env vars, deploy logs, redeploy) | ⏳ **manual invite needed** | Railway member invites are dashboard-only. Hori will invite `yitian.wang@aiavatar.work` as a project member (see §6). |
| Portal login (operate the agent in the UI) | ✅ shared password | URL above → pick flag → password. Ask Hori for `PORTAL_PASSWORD` if you don't have it. |

---

## 1. What this is

**aso-sns-panel** is a Next.js + PostgreSQL management panel on Railway that runs two operational agents:

| Agent | Loop |
|---|---|
| **ASO Agent** | keyword rank monitoring (Apptweak) → AI metadata proposals (`result → cause → next action`) → human approval → push to App Store Connect / Play Console via API |
| **SNS Agent** | **PDCA**: ego search → buzz scoring → AI hypothesis generation → human approve/reject → Content-lab handoff → post → loop |

> It is **not** a company-wide portal — it manages only the ASO and SNS agents. (Solo Unicorn Control Plane will eventually absorb it; see §8.)

Products covered: Twomi, BUZZENCER, AI AVATAR, SOULRiZA, KING Together, Education, パチナビ.

---

## 2. SNS Agent — current implementation status

**Principle: generate high-accuracy viral hypotheses continuously.** The panel decides *what* to post and *why*; content creation is outsourced to [Content-lab](https://github.com/torilab-ai/op-agent-contentlab).

### PDCA loop (implemented)
```
Ego Search (YouTube Data API v3 + Google CSE)
   ↓  trend detection + buzz scoring
Hypothesis Generation (Claude Sonnet 4.6, auto 08:00 / 20:00 JST)
   ↓  injects learning DB distilled from past rejections
Human Review (approve / reject + feedback)   ← the human gate
   ↓
Content-lab brief → content creation (external)
   ↓
Post → Ego Search (loop)
```

### Features that are built and live
- **Multilingual** — full UI + AI output in JA / PT-BR / VI / ID / BN
- **Multi-account login** — flag selector at login, shared password, apps filtered per account
- **Learning DB** — rejection feedback distilled into principles, re-injected into future generation
- **Posting-frequency AI** — suggests optimal cadence from ego data
- **Buzz scoring** — `Claude relevance + log10(views)×8 + log10(likes)×5 + log10(comments)×3`
- **Meta/IG posting path** (SNS No.5/6) — gated behind `META_*` secrets

### Where the code lives
```
app/sns/[appId]/
  hypotheses/   ego/   frequency/   learnings/   feedback/   accounts/   settings/
app/sns/calendar/                 # posting calendar
app/api/sns/[appId]/route.ts      # hypotheses, ego-hits, frequency, learnings
app/api/cron/sns-hypotheses/      # scheduled auto-generation endpoint
lib/i18n/sns.ts                   # JA / PT-BR / VI / ID / BN strings
lib/snsAppContext.ts              # per-product locale + output language
```

---

## 3. Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), TypeScript |
| DB | PostgreSQL via Prisma ORM |
| AI | Claude Sonnet 4.6 (hypotheses/captions) · Gemini Imagen 4.0-fast (images) |
| Research | YouTube Data API v3 + Google Custom Search |
| Host | Railway (nixpacks: nodejs_20, python311, yt-dlp) |
| Healthcheck | `GET /health` |

---

## 4. How to use it (operating the agent)

1. Open the portal → choose the product flag → enter the shared password.
2. Go to **SNS → [product] → Hypotheses**. New hypotheses are auto-generated twice daily (08:00 / 20:00 JST); you can also trigger generation manually.
3. **Review each hypothesis**: *Approve* (→ becomes a Content-lab brief) or *Reject with feedback* (→ feedback is distilled into the Learning DB and improves future output).
4. **Ego / Frequency / Learnings** tabs show the supporting data (trend hits, suggested cadence, learned principles).
5. ASO side (**ASO → [product]**): review keyword-rank proposals; approved proposals sync to the stores via API. **All store writes require approval in the UI first.**

> Your operational role (Tier 1, from the 2026-06-18 handover) is **review/approve**. You now also have implementation (admin) access on top of that.

---

## 5. How to develop & deploy

```bash
# canonical source of truth
git clone https://github.com/torilab-ai/op-agent-ASO-SNS
cd op-agent-ASO-SNS
npm install
cp .env.example .env.local      # fill secrets (see §7) — never commit
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

**Deploy flow (important):**
```
push to torilab-ai/op-agent-ASO-SNS  (main)
   → GitHub Action `mirror-to-railway.yml` force-pushes main → shin00551177/agent-portal
   → Railway deploys from the mirror
```
So: **commit/PR to the canonical repo only.** Railway picks it up automatically through the mirror. CI (`ci.yml`) runs a TypeScript type check on every push. One feature per PR; note any security-relevant change in the PR description.

### Scheduling (all cloud — no local machine dependency)
| Workflow | Schedule | Calls |
|---|---|---|
| `sns-hypotheses.yml` | `0 23 * * *` + `0 11 * * *` UTC (08:00 / 20:00 JST) | `POST PORTAL_URL/api/cron/sns-hypotheses` (Bearer `CRON_SECRET`) |
| `aso-weekly.yml` | `30 1 * * 1` (Mon 10:30 JST) | `POST PORTAL_URL/api/cron/aso-weekly` |
| `mirror-to-railway.yml` | on push to main | force-push main → personal mirror |
| `ci.yml` | on push | TypeScript type check |

---

## 6. Railway access (manual — Hori to action)

Railway member invites cannot be done via API/CLI. To give you env-var + deploy access:
1. Hori → Railway dashboard → the aso-sns-panel project → **Settings → Members → Invite**
2. Invite `yitian.wang@aiavatar.work`
3. Role: Member (can view/edit env vars, see deploy logs, trigger redeploys)

Until then, you have full code/CI control via GitHub; only Railway-side env editing and manual redeploys need Hori.

---

## 7. Secrets / env (names only — values in Railway + GitHub Actions Secrets)

| Group | Keys |
|---|---|
| Portal auth (required) | `SESSION_SECRET`, `PORTAL_PASSWORD` |
| Portal/cron auth | `PORTAL_API_KEY`, `CRON_SECRET`, `SYNC_SECRET` |
| Database (required) | `DATABASE_URL` |
| Apple ASC | `APPLE_IAP_ISSUER_ID`, `APPLE_IAP_KEY_ID`, `APPLE_IAP_PRIVATE_KEY_B64` |
| Google Play | `GOOGLE_SERVICE_ACCOUNT_JSON` |
| ASO data | `APPTWEAK_API_KEY` |
| SNS / research | `YOUTUBE_API_KEY`, `GOOGLE_CSE_KEY`, `GOOGLE_CSE_ID` |
| AI | `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` |
| GitHub dispatch | `GITHUB_TOKEN`, `GITHUB_REPO` |
| Slack | `SLACK_BOT_TOKEN`, `SLACK_ASO_CHANNEL` |
| Meta/IG (SNS No.5/6) | `META_SYSTEM_USER_TOKEN`, `META_IG_BUSINESS_ID`, `META_FB_PAGE_ID` |

> With repo admin you can edit **GitHub Actions Secrets** (Settings → Secrets and variables → Actions). Railway runtime env vars need the Railway invite (§6).

---

## 8. Hard rules (governance — please keep)

1. **Never execute without approval.** External write endpoints (`/api/proposals/[id]/execute`) must verify `isAuthenticated()` and `status === "approved"`.
2. **No credential fallbacks.** `SESSION_SECRET` / `PORTAL_PASSWORD` must be set; crash on startup if missing. Never hardcode.
3. **Audit every write** — all state-changing actions call `writeAuditLog()`.
4. **Proposal-gated writes only** — no direct App Store / Play writes from a cron job; always go through Proposal → approve → execute.
5. **Kill switch**: `AGENT_ENABLED=false`; rotate `PORTAL_PASSWORD` to invalidate all sessions in an emergency.

Data boundaries: read level-2 (aggregated metrics) freely; write level-3 (raw listings) only after human approval, always logged.

---

## 9. Migration / open items (context, not blocking)

The panel is **migration-ready** for the Solo Unicorn Control Plane. Deferred items (need owner/IT coordination — see `MIGRATION.md` §8):
- Rename Railway URL + GitHub repo to `aso-sns-panel` (deferred because external cron triggers call the Railway URL directly — rename must happen *with* the trigger update).
- Remove the mirror hop (point Railway directly at canonical).
- Declare a monthly spending/budget cap in `agent.yaml`.
- Decommission retired predecessors `~/aso-agent` / `~/sns-agent`.

Full detail: `README.md`, `COMMON.md`, `GOVERNANCE.md`, `MIGRATION.md`, `agent.yaml` in the repo root.
