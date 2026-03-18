# Automated Social Campaigns

A creative automation pipeline with a **Next.js dashboard** for creating campaign briefs, tracking image generation progress, and viewing final assets. Provide a brief describing your products and campaign message — the system validates it, generates hero images via Google Gemini Imagen, composites text overlays, and stores production-ready images in three aspect ratios on S3.

The project is a **pnpm workspace monorepo** with a Next.js frontend at the root and three backend services in `packages/` that communicate over AWS SNS and SQS. LocalStack provides all AWS services locally during development.

---

## Table of contents

- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Dashboard](#dashboard)
- [Running with Docker](#running-with-docker)
- [Usage (CLI)](#usage)
- [Campaign brief](#campaign-brief)
- [Architecture](#architecture)
- [Monorepo structure](#monorepo-structure)
- [Aspect ratios](#aspect-ratios)

---

## Requirements

- Node.js >= 22 and pnpm
- Docker and Docker Compose
- A Google Gemini API key with Imagen access
- AWS CLI (only needed for the setup script targeting real AWS)

---

## Quick start

```bash
git clone <repo>
cd automated-social-campaigns
pnpm install
cp .env.example .env    # add your GEMINI_API_KEY
```

Start the backend services (LocalStack + intake/processing/campaign-runner):

```bash
pnpm docker:up
```

Start the dashboard:

```bash
pnpm dev
```

Open http://localhost:4569, click "Create New Campaign", load the sample brief, and submit.

### Environment variables

Minimum required in `.env`:

```
GEMINI_API_KEY=your-gemini-api-key-here
AWS_REGION=us-east-1
AWS_ENDPOINT_URL=http://localhost:4566
S3_BUCKET=asc-campaign-assets
DYNAMO_TABLE_NAME=asc-campaigns
```

Optional values for email/Drive watchers (see `.env.example` for the full list):

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Gmail and Google Drive watchers |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Outlook watcher |
| `STATUS_PORT` | Campaign Runner status API port (default `3001`) |

---

## Dashboard

The Next.js App Router frontend runs locally (not in Docker) and proxies API calls to the backend services.

```bash
pnpm dev    # starts on http://localhost:4569
```

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Home — create campaign link, correlation ID lookup, recent campaigns |
| `/campaigns/new` | Brief creation — form builder or raw JSON editor (tabbed) |
| `/campaigns/[id]` | Campaign detail — real-time progress tracking and image gallery |

### Form builder

The form mirrors the campaign brief schema exactly:
- Campaign name and message (required)
- Dynamic product list with add/remove (name, slug, description, image prompt, brand colors)
- Target platform checkboxes (Instagram, TikTok, Facebook, YouTube)
- Collapsible text overlay section (headline, subheadline, CTA, font color, position)
- "Load Sample" button pre-fills from `briefs/sample-brief.json`
- Client-side Zod validation with inline field errors

### Raw JSON editor

Paste or type campaign brief JSON directly. Includes validate, load sample, and submit buttons with error feedback.

### Progress tracking

After submission, the dashboard navigates to `/campaigns/{correlationId}` and polls the Campaign Runner status API every 2 seconds. It shows:
- Overall campaign status with progress bar
- Per-product generation status
- Per-ratio (1x1, 9x16, 16x9) completion badges
- Compliance warnings if any

Polling stops automatically when the campaign completes or fails.

### Image gallery

When a campaign completes, all generated composites display in a responsive grid. Images are served through a Next.js API route that proxies S3 objects from LocalStack.

### API proxy routes

All backend communication goes through server-side Next.js Route Handlers:

| Route | Method | Proxies to |
|-------|--------|-----------|
| `/api/brief` | POST | Intake webhook (port 4567) |
| `/api/campaigns/[id]` | GET | Campaign Runner status API (port 4568) |
| `/api/images/[...key]` | GET | LocalStack S3 (port 4566) |

### Tech stack

- Next.js 15 (App Router)
- React 19
- Tailwind CSS 4
- shadcn/ui (base-nova style)
- Zod (shared schemas from `@asc/shared`)

---

## Running with Docker

The entire stack — LocalStack, Intake, Processing, and Campaign Runner — runs in Docker. A single command starts everything.

```bash
docker compose up --build
```

Or using the pnpm alias:

```bash
pnpm docker:up
```

This starts four containers:

| Container | Port | Role |
|-----------|------|------|
| `localstack` | 4566 | S3, SNS, SQS, DynamoDB emulation |
| `intake` | 4567 | Webhook server for brief submission |
| `processing` | — | SQS consumer — image generation and compositing |
| `campaign-runner` | 4568 | SQS consumer — progress tracking and status API |

LocalStack automatically initializes all AWS resources (S3 bucket, SNS topics, SQS queues, DynamoDB table) on startup via `scripts/localstack-init.sh`. The three app containers wait for LocalStack to be healthy before starting.

To stop everything:

```bash
docker compose down
# or
pnpm docker:down
```

To rebuild after code changes:

```bash
pnpm docker:rebuild
```

### AWS resources created

| Type | Name(s) |
|------|---------|
| S3 bucket | `asc-campaign-assets` |
| SNS topics | `asc-brief-validated`, `asc-processing-progress`, `asc-campaign-status` |
| SQS queues | `asc-processing-queue`, `asc-runner-queue`, `asc-notifications-queue` |
| SQS DLQs | `asc-processing-dlq`, `asc-runner-dlq`, `asc-notifications-dlq` |
| DynamoDB table | `asc-campaigns` |

### Running against real AWS

To create resources on real AWS instead of LocalStack, remove `AWS_ENDPOINT_URL` from your `.env` and run the setup script. It detects the absence of `AWS_ENDPOINT_URL` and uses the standard AWS CLI (requires configured credentials):

```bash
./scripts/setup-local.sh
```

The script reads your `.env` for `AWS_REGION`, `S3_BUCKET`, and `DYNAMO_TABLE_NAME`, resolves your account ID via `sts get-caller-identity`, and writes the derived `SNS_TOPIC_ARN_PREFIX` and `SQS_QUEUE_URL_PREFIX` back to `.env`.

### Local development without Docker

If you prefer running services directly:

```bash
pnpm install
pnpm -r build

# Start LocalStack for AWS services
docker compose up localstack -d

# In separate terminals:
pnpm dev:runner
pnpm dev:processing
pnpm dev:intake -- manual -b briefs/sample-brief.json
```

---

## Usage

All intake commands run through the `@asc/intake` package.

### Submit a brief manually

```bash
pnpm --filter @asc/intake dev -- manual -b briefs/sample-brief.json
```

The command validates the brief, uploads it to S3, and publishes to `asc-brief-validated`. It exits immediately with a correlation ID you can use to poll the status API.

```
====================================
  Brief Submitted
====================================
  Campaign:       Spring Fresh Launch 2026
  Correlation ID: 3f2a1b4c-...

  Brief published to processing queue.
====================================
```

### Start the webhook server

```bash
pnpm --filter @asc/intake dev -- watch --webhook --port 4569
```

POST a brief to the webhook:

```bash
curl -X POST http://localhost:4567/events/campaign-brief \
  -H "Content-Type: application/json" \
  -d @briefs/sample-brief.json
```

Response (HTTP 202):

```json
{
  "correlationId": "3f2a1b4c-...",
  "campaignName": "Spring Fresh Launch 2026",
  "complianceWarnings": [],
  "message": "Brief accepted and queued for processing"
}
```

### Start email and Drive watchers

Watchers poll at a configurable interval (default 60 seconds). You can combine multiple flags.

```bash
# Gmail + Google Drive
pnpm --filter @asc/intake dev -- watch --gmail --drive --poll-interval 30000

# Outlook
pnpm --filter @asc/intake dev -- watch --outlook

# All sources + webhook
pnpm --filter @asc/intake dev -- watch --webhook --gmail --drive --outlook
```

| Flag | Source | Auth required |
|------|--------|--------------|
| `--webhook` | HTTP POST to `/events/campaign-brief` | None |
| `--gmail` | Gmail — unread messages with JSON attachments | Google OAuth2 |
| `--drive` | Google Drive changes API — new JSON files in a folder | Google OAuth2 |
| `--outlook` | Microsoft Graph API — email attachments | MSAL confidential client |

### Check campaign status

The Campaign Runner exposes a read-only status API:

```bash
curl http://localhost:4568/campaigns/<correlationId>
```

### Inspect output in S3

```bash
aws --endpoint-url=http://localhost:4566 s3 ls s3://asc-campaign-assets/ --recursive
```

---

## Campaign brief

Briefs are JSON or YAML files. At minimum you need `campaignName`, `campaignMessage`, and at least one product.

```json
{
  "campaignName": "Spring Fresh Launch 2026",
  "campaignMessage": "Refresh your routine with nature's best ingredients",
  "products": [
    {
      "name": "EcoClean Detergent",
      "slug": "eco-clean-detergent",
      "description": "Plant-based laundry detergent with lavender essential oil. Eco-friendly packaging, vibrant purple and green branding.",
      "heroImagePrompt": "Professional product photography of a modern eco-friendly laundry detergent bottle, purple and green color scheme, lavender sprigs around the bottle, clean white background, studio lighting, commercial advertising style, high resolution, photorealistic",
      "brandColors": ["#6B2FA0", "#4CAF50"]
    },
    {
      "name": "Fresh Glow Moisturizer",
      "slug": "fresh-glow-moisturizer",
      "description": "Hydrating face moisturizer with vitamin C and hyaluronic acid. Minimalist white and gold packaging.",
      "heroImagePrompt": "Professional product photography of a premium face moisturizer jar, minimalist white and gold packaging, dewy fresh skin texture background, clean studio lighting, luxury cosmetics advertising style, high resolution, photorealistic",
      "brandColors": ["#FFFFFF", "#D4AF37"]
    }
  ],
  "targetPlatforms": ["instagram", "facebook", "tiktok"],
  "textOverlay": {
    "headline": "Spring Fresh Launch",
    "subheadline": "Refresh your routine with nature's best",
    "ctaText": "Shop Now",
    "fontColor": "#FFFFFF",
    "position": "bottom"
  }
}
```

### Top-level fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `campaignName` | string | Yes | Human-readable campaign identifier |
| `campaignMessage` | string | Yes | Core campaign message (used in compliance checks) |
| `products` | Product[] | Yes | One or more products to generate creatives for |
| `targetPlatforms` | string[] | No | `instagram`, `tiktok`, `facebook`, `youtube` |
| `textOverlay` | object | No | Text composited onto every output image |
| `locale` | string | No | Defaults to `en` |

### Product fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name |
| `slug` | string | Yes | Lowercase hyphenated identifier (e.g., `eco-clean-detergent`) |
| `description` | string | Yes | Used in compliance checks and logs |
| `heroImagePrompt` | string | No | Imagen 3 prompt; required if no existing asset in S3 |
| `logoPath` | string | No | S3 key for a logo file to overlay |
| `brandColors` | string[] | No | Hex colors (e.g., `["#6B2FA0", "#4CAF50"]`) |

### Text overlay fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `headline` | string | Yes | Primary text |
| `subheadline` | string | No | Secondary text |
| `ctaText` | string | No | Call-to-action text |
| `fontColor` | string | No | Hex color, defaults to white |
| `fontSize` | number | No | Base font size in pixels |
| `position` | string | No | `top`, `center`, or `bottom` |

### Providing existing assets

If a product already has a hero image, upload it to S3 before submitting the brief. The Processing Service checks S3 first and skips Imagen 3 generation when the key exists.

Expected S3 key: `products/<slug>/hero.png`

```bash
aws --endpoint-url=http://localhost:4566 s3 cp hero.png \
  s3://asc-campaign-assets/products/eco-clean-detergent/hero.png
```

---

## Architecture

### High-level system

```
  ┌──────────────────────────────────────────────────────┐
  │                   NEXT.JS DASHBOARD                   │
  │  Form builder  │  JSON editor  │  Progress tracker   │
  │                                                       │
  │  /api/brief ───────▶ Intake (proxy)                  │
  │  /api/campaigns ───▶ Campaign Runner (proxy)         │
  │  /api/images ──────▶ S3 (proxy)                      │
  └──────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────┐
  │                        INTAKE SERVICE                          │
  │  CLI manual  │  Webhook POST  │  Gmail  │  Drive  │  Outlook  │
  │              └────────────────┴─────────┴─────────┘           │
  │                         brief-handler                          │
  │          validate → compliance check → upload to S3            │
  └──────────────────────────────┬─────────────────────────────────┘
                                 │ publish
                                 ▼
                    ┌────────────────────────┐
                    │  SNS: asc-brief-       │
                    │       validated        │
                    └────────────┬───────────┘
                                 │ subscribe
                                 ▼
                    ┌────────────────────────┐
                    │  SQS: asc-processing-  │
                    │       queue            │
                    └────────────┬───────────┘
                                 │ consume
  ┌──────────────────────────────▼─────────────────────────────────┐
  │                      PROCESSING SERVICE                         │
  │    asset-resolver → generator → compositor → persister          │
  │      (internal EventBus pipeline)                               │
  │                                                                 │
  │    S3: read hero / write generated image / write composites     │
  └──────────────────────────────┬─────────────────────────────────┘
                                 │ publish per-asset progress
                                 ▼
                    ┌────────────────────────┐
                    │  SNS: asc-processing-  │
                    │       progress         │
                    └────────────┬───────────┘
                                 │ subscribe
                                 ▼
                    ┌────────────────────────┐
                    │  SQS: asc-runner-      │
                    │       queue            │
                    └────────────┬───────────┘
                                 │ consume
  ┌──────────────────────────────▼─────────────────────────────────┐
  │                      CAMPAIGN RUNNER                            │
  │    progress-handler → campaign-store (DynamoDB)                 │
  │    completion-handler → detect done → publish status           │
  │    status-server: GET /campaigns/:correlationId                 │
  └──────────────────────────────┬─────────────────────────────────┘
                                 │ publish on completion
                                 ▼
                    ┌────────────────────────┐
                    │  SNS: asc-campaign-    │
                    │       status           │
                    └────────────┬───────────┘
                                 │ subscribe
                                 ▼
                    ┌────────────────────────┐
                    │  SQS: asc-             │
                    │  notifications-queue   │
                    │  (future consumers)    │
                    └────────────────────────┘
```

### Message flow

```
  Intake                  SNS/SQS               Processing            Campaign Runner
    │                        │                       │                       │
    │── validate brief ──────│                       │                       │
    │── upload brief.json ──▶│ S3                    │                       │
    │── publish ────────────▶│ asc-brief-validated   │                       │
    │                        │──────────────────────▶│ asc-processing-queue  │
    │                        │                       │── resolve assets      │
    │                        │                       │── generate (Imagen 3) │
    │                        │                       │── composite (sharp)   │
    │                        │                       │── write to S3         │
    │                        │                       │   (per asset/ratio)   │
    │                        │◀── publish ───────────│ asc-processing-progress
    │                        │                       │                       │
    │                        │──────────────────────────────────────────────▶│
    │                        │                       │       asc-runner-queue│
    │                        │                       │                       │── update DynamoDB
    │                        │                       │                       │── detect completion
    │                        │◀── publish ───────────────────────────────────│ asc-campaign-status
    │                        │                       │                       │
    │                        │── asc-notifications-queue (future consumers) ─▶
```

### S3 bucket layout

Bucket: `asc-campaign-assets`

```
asc-campaign-assets/
├── products/
│   └── {slug}/
│       └── hero.png                           ← pre-existing or generated hero
│
└── campaigns/
    └── {correlationId}/
        ├── brief.json                         ← uploaded by Intake at submission
        ├── output/
        │   └── {slug}/
        │       ├── 1x1/
        │       │   └── {slug}_1x1.png         ← 1080 x 1080
        │       ├── 9x16/
        │       │   └── {slug}_9x16.png        ← 1080 x 1920
        │       └── 16x9/
        │           └── {slug}_16x9.png        ← 1920 x 1080
        └── manifest.json                      ← written by Processing on completion
```

### SNS topics

| Topic | Publisher | When |
|-------|-----------|------|
| `asc-brief-validated` | Intake | After validation and S3 upload succeed |
| `asc-processing-progress` | Processing | After each asset persisted, on generation failure, on campaign completion |
| `asc-campaign-status` | Campaign Runner | When all assets for a campaign are done or a fatal error occurs |

### SQS queues

| Queue | Subscribes to | Consumer | DLQ |
|-------|--------------|----------|-----|
| `asc-processing-queue` | `asc-brief-validated` | Processing Service | `asc-processing-dlq` |
| `asc-runner-queue` | `asc-processing-progress` | Campaign Runner | `asc-runner-dlq` |
| `asc-notifications-queue` | `asc-campaign-status` | Future consumers | `asc-notifications-dlq` |

All queues use `maxReceiveCount=3` before a message moves to the DLQ.

### Message envelope

Every message published to SNS uses this typed envelope:

```typescript
interface ServiceMessage<T> {
  eventType: string;     // PipelineEvent value, e.g. "campaign:completed"
  correlationId: string; // UUID linking all events for one brief
  timestamp: string;     // ISO 8601
  payload: T;
}
```

### Processing pipeline (internal)

Within the Processing Service, the original event-driven pipeline runs in-process using a typed `EventBus` over Node's `EventEmitter`. This coordinates the six stages for a single brief without going through SNS/SQS.

| # | Stage | Internal events | What happens |
|---|-------|----------------|--------------|
| 1 | Ingest | `BRIEF_RECEIVED` → `BRIEF_VALIDATED` | Validate with Zod; reject prohibited words |
| 2 | Asset resolution | `ASSET_RESOLUTION` → `ASSET_RESOLVED` | `headObject` on S3 to check for existing hero |
| 3 | Generation | `GENERATION_REQUESTED` → `GENERATION_COMPLETED` | Call Imagen 3 for missing assets; products run in parallel; write hero to S3 |
| 4 | Compositing | `COMPOSITE_REQUESTED` → `COMPOSITE_COMPLETED` | Read hero from S3; resize via sharp; composite SVG text overlay; write to S3 |
| 5 | Persist | `PERSIST_REQUESTED` → `PERSIST_COMPLETED` | Record S3 key; publish progress event to `asc-processing-progress` |
| 6 | Status | `CAMPAIGN_COMPLETED` | Write `manifest.json` to S3; publish final progress event |

---

## Monorepo structure

```
automated-social-campaigns/
├── next.config.ts                   ← Next.js config (transpiles @asc/shared)
├── tsconfig.json                    ← Next.js TypeScript config
├── tsconfig.build.json              ← Backend project references (tsc --build)
├── tsconfig.base.json               ← Base TS config for backend packages
├── pnpm-workspace.yaml              ← Workspace packages + version catalogs
├── Dockerfile                       ← Backend services (Node 22 Alpine)
├── docker-compose.yml               ← LocalStack + 3 backend services
├── components.json                  ← shadcn/ui config
│
├── src/                             ← Next.js dashboard (App Router)
│   ├── app/
│   │   ├── layout.tsx               Root layout + nav
│   │   ├── page.tsx                 Home — campaign lookup + recent list
│   │   ├── globals.css              Tailwind + theme variables
│   │   ├── campaigns/
│   │   │   ├── new/page.tsx         Brief creation (form + JSON tabs)
│   │   │   └── [correlationId]/page.tsx  Progress tracking + results
│   │   └── api/
│   │       ├── brief/route.ts       POST proxy → intake
│   │       ├── campaigns/[correlationId]/route.ts  GET proxy → campaign-runner
│   │       └── images/[...key]/route.ts  GET proxy → S3
│   ├── components/
│   │   ├── ui/                      shadcn/ui primitives (button, card, badge, etc.)
│   │   ├── brief-form/              BriefForm, ProductFieldset, TextOverlayFields, PlatformSelector
│   │   ├── json-editor/             JsonTextarea
│   │   ├── campaign/                CampaignProgress, ProductProgress, ImageGallery, StatusBadge
│   │   └── layout/                  Nav
│   └── lib/
│       ├── api.ts                   Client fetch helpers
│       ├── hooks.ts                 useCampaignPolling
│       ├── validation.ts            Zod schema wrapper
│       └── utils.ts                 cn() utility
│
├── scripts/
│   ├── localstack-init.sh           Auto-runs inside LocalStack on startup
│   └── setup-local.sh               Creates AWS resources (LocalStack or real AWS)
├── briefs/
│   └── sample-brief.json
│
└── packages/
    ├── shared/                      @asc/shared
    │   └── src/
    │       ├── schemas/
    │       │   ├── campaign-brief.ts    Zod schema — contract for all services
    │       │   └── campaign-state.ts    CampaignState, ProductState, RatioState types
    │       ├── events/
    │       │   ├── types.ts             PipelineEvent enum, typed payloads, ServiceMessage
    │       │   └── bus.ts               EventBus interface (in-process)
    │       ├── config.ts                ASPECT_RATIOS, AWS_CONFIG, S3 key helpers
    │       └── lib/                     S3, SNS, SQS clients + logger
    │
    ├── intake/                      @asc/intake
    │   └── src/
    │       ├── server.ts                Fastify webhook — returns 202 Accepted
    │       ├── handlers/brief-handler.ts  validate, compliance, S3, SNS publish
    │       ├── watchers/                Gmail, Google Drive, Outlook pollers
    │       └── auth/                    Google OAuth2, Microsoft MSAL
    │
    ├── processing/                  @asc/processing
    │   └── src/
    │       ├── orchestrator.ts          Internal EventBus pipeline + SNS progress
    │       ├── pipeline/                asset-resolver, generator, compositor
    │       └── lib/                     Gemini client, image utils
    │
    └── campaign-runner/             @asc/campaign-runner
        └── src/
            ├── state/campaign-store.ts  DynamoDB CRUD
            ├── handlers/                Progress + completion handlers
            └── api/status-server.ts     Fastify GET /campaigns/:correlationId
```

---

## Aspect ratios

The pipeline generates a single 1080x1080 hero image per product via Imagen 3, then uses sharp's attention-based crop (`fit: 'cover', position: 'attention'`) to resize it to the remaining ratios. This keeps API calls to one per product while correctly framing the subject across all formats.

| Key | Dimensions | Target platform |
|-----|------------|----------------|
| `1x1` | 1080 x 1080 | Instagram feed |
| `9x16` | 1080 x 1920 | Instagram / TikTok Stories |
| `16x9` | 1920 x 1080 | Facebook / YouTube landscape |

---

## Development commands

Run these from the repo root.

```bash
# Dashboard
pnpm dev                # Next.js dev server on http://localhost:4569
pnpm build:ui           # production build of the dashboard

# Backend packages (incremental via tsc project references)
pnpm build              # tsc --build tsconfig.build.json

# Tests and linting
pnpm test               # vitest
pnpm lint               # eslint on packages/*/src/**

# Docker (backend services)
pnpm docker:up          # build and start all containers
pnpm docker:down        # stop all containers
pnpm docker:rebuild     # rebuild and restart

# Individual services (without Docker)
pnpm dev:intake         # intake service via tsx
pnpm dev:processing     # processing service via tsx
pnpm dev:runner         # campaign runner via tsx
```

### Dependency management

Shared dependency versions are centralized in `pnpm-workspace.yaml` using [pnpm catalogs](https://pnpm.io/catalogs). Packages reference them with `"catalog:"` instead of hardcoded version ranges. To upgrade a shared dependency (e.g., typescript), update the version in one place:

```yaml
# pnpm-workspace.yaml
catalog:
  typescript: ^5.10.0    # bumped here, applies to all packages
```

Then run `pnpm install` to update the lockfile.

---

## License

MIT
