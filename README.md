# op-agent-portal

> AI AVATAR Agent Portal — ASO Agent & SNS PDCA Engine

An internal operations portal for managing AI AVATAR Group products across App Store Optimization and Social Media Strategy. Built on Next.js App Router + PostgreSQL, deployed on Railway.

---

## Overview

The Agent Portal automates two core operational loops:

| Agent | What it does |
|---|---|
| **ASO Agent** | Monitors keyword rankings, generates metadata improvement proposals, and syncs changes to App Store / Google Play via API |
| **SNS Agent** | Runs a PDCA loop — ego monitoring → hypothesis generation → human approval → Content-lab handoff — across multiple products and languages |

---

## Products Covered

| Product | Category | Markets |
|---|---|---|
| Twomi | AI avatar chat / live streaming app | JP |
| BUZZENCER | Viral content marketing tool (ASP) | BR / VN / ID / BD |
| AI AVATAR | AI avatar creation | JP |
| SOULRiZA | Spiritual AI app | JP |
| KING Together | Historical character chat | JP |
| Education | AI learning support | JP |
| パチナビ | Pachinko/slot AI analysis | JP |

---

## ASO Agent

- **Keyword tracking** via Apptweak API (iOS + Android)
- **Metadata proposals** — AI generates `result → cause → next action` triples, human approves
- **Store tab separation** — App Store / Google Play data displayed independently
- **Health Score** — character utilization × industry best practices scoring per field
- **Auto-sync** — approved proposals pushed to ASC / Play Console via API

---

## SNS Agent

Designed around one principle: **generate high-accuracy viral hypotheses continuously**.

Content creation is outsourced to [Content-lab](https://github.com/torilab-ai/op-agent-contentlab). The portal decides *what* to post and *why*.

### PDCA Loop

```
Ego Search (YouTube API + Google CSE)
    ↓ trend detection + buzz scoring
Hypothesis Generation (Claude, auto 08:00 / 20:00 JST)
    ↓ uses learning DB from past rejections
Human Review (approve / reject with feedback)
    ↓
Content-lab Brief → Content Creation (external)
    ↓
Post → Ego Search (loop)
```

### Key Features

- **Multilingual** — full UI + AI output in JA / PT-BR / VI / ID / BN
- **Multi-account login** — flag selector at login, shared password, apps filtered per account
- **Learning DB** — rejection feedback distilled into principles, injected into future generation
- **Posting frequency AI** — suggests optimal cadence based on ego data
- **Buzz scoring** — `Claude relevance + log10(views)×8 + log10(likes)×5 + log10(comments)×3`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | PostgreSQL via Prisma ORM |
| AI | Claude Sonnet 4.6 |
| Ego Search | YouTube Data API v3 + Google Custom Search |
| Image Generation | Gemini Imagen 3 |
| Infrastructure | Railway |
| Design System | Neksai (Helvetica Neue + PT Mono, `#079147`) |

---

## Architecture

```
app/
├── aso/[appId]/        # ASO Agent pages (health score, proposals, analytics)
├── sns/[appId]/        # SNS Agent pages (hypotheses, ego, frequency, learnings)
├── login/              # multi-account flag selector
└── api/
    ├── aso/[appId]/    # sync, analyze, keywords, reviews
    ├── sns/[appId]/    # hypotheses, ego-hits, frequency, learnings
    └── cron/           # scheduled auto-generation

lib/
├── i18n/sns.ts         # JA / PT-BR / VI / ID / BN translations
├── snsAppContext.ts    # per-product locale + output language
└── apptweak.ts         # Apptweak API client (iOS + Android)
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | ✅ | Claude API |
| `PORTAL_PASSWORD` | ✅ | Shared login password |
| `SESSION_SECRET` | ✅ | Session token salt |
| `APPTWEAK_API_KEY` | ✅ | Apptweak (ASO data) |
| `YOUTUBE_API_KEY` | ✅ | YouTube Data API v3 |
| `GOOGLE_CSE_KEY` | — | Google Custom Search API |
| `GOOGLE_CSE_ID` | — | Google Custom Search Engine ID |
| `GEMINI_API_KEY` | — | Image generation |
| `CRON_SECRET` | — | GitHub Actions cron auth |
| `PORTAL_URL` | — | Production URL (for cron) |

---

## Local Development

```bash
git clone https://github.com/torilab-ai/op-agent-portal
cd op-agent-portal
npm install
cp .env.example .env.local
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

---

## Deployment

Auto-deploys to Railway on push to `main`.

```bash
git push origin main
```

---

## Related

- [op-agent-contentlab](https://github.com/torilab-ai/op-agent-contentlab) — Content creation pipeline
