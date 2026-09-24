# ASEN standard stack

Every row was checked on an official source (see `sources.md`). Each row needs a source URL and a "Verified" date. Routines re-check rows older than 30 days.

"Use" means the version new ASEN projects start on. Latest ≠ automatically adopted: major upgrades are HIGH risk until reviewed.

## Runtimes

| Item | Use | Latest seen | Notes | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| Node.js | 24.x LTS ("Krypton") | 24.21.0 LTS; 26.10.0 Current | 24 = Active LTS until 2026-10-20, then Maintenance until 2028-04-30. Node 26 becomes LTS on 2026-10-28. Node 20 reached end-of-life 2026-04-30: do not use. | https://github.com/nodejs/Release/blob/main/schedule.json | 2026-09-24 |
| Node.js release list | — | v24.21.0 (2026-09-07), v22.23.3 (2026-09-23) | Official download index | https://nodejs.org/dist/index.json | 2026-09-24 |
| Python | 3.14.x | 3.14.7 (2026-08-05) | 3.15 is at release candidate (3.15.0rc2, 2026-09-01): don't use in production yet. | https://www.python.org/downloads/ | 2026-09-24 |
| TypeScript | 7.0.x | 7.0.2 | Major version: check tooling support before adopting in an existing project. | https://registry.npmjs.org/typescript/latest | 2026-09-24 |

## Frontend

| Item | Use | Latest seen | Notes | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| React | 19.x | 19.3.0 | | https://registry.npmjs.org/react/latest | 2026-09-24 |
| Vite | 8.x | 8.3.0 | | https://registry.npmjs.org/vite/latest | 2026-09-24 |
| Tailwind CSS | 4.x with `@tailwindcss/vite` | 4.3.3 | | https://registry.npmjs.org/tailwindcss/latest | 2026-09-24 |
| Expo (mobile) | SDK 57 | 57.0.25 | React Native 0.87.1. Secrets on device: `expo-secure-store` 57.0.4. | https://registry.npmjs.org/expo/latest | 2026-09-24 |

## Python services

| Item | Use | Latest seen | Notes | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| FastAPI | 0.141.x | 0.141.1 | For Python HTTP services and webhook receivers. | https://pypi.org/project/fastapi/ | 2026-09-24 |
| httpx | 0.28.x | 0.28.1 | HTTP client with timeouts. | https://pypi.org/project/httpx/ | 2026-09-24 |
| aiogram (Telegram) | 3.x | 3.31.0 | Async Telegram bots. `python-telegram-bot` 22.8 is also current. | https://pypi.org/project/aiogram/ | 2026-09-24 |
| pip-audit | 2.x | 2.10.1 | Dependency audit in CI. | https://pypi.org/project/pip-audit/ | 2026-09-24 |

## Backend, data, queues

| Item | Use | Latest seen | Notes | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| Supabase JS | `@supabase/supabase-js` 2.x | 2.117.1 | | https://registry.npmjs.org/@supabase%2Fsupabase-js/latest | 2026-09-24 |
| Supabase CLI | `supabase` 2.x | 2.117.0 | Migrations live in `supabase/migrations`. | https://registry.npmjs.org/supabase/latest | 2026-09-24 |
| Supabase API keys | Publishable (`sb_publishable_...`) in clients, Secret (`sb_secret_...`) only on servers | — | Legacy `anon` / `service_role` JWT keys are being deprecated by end of 2026. New projects: use new keys only. | https://supabase.com/docs/guides/api/api-keys | 2026-09-24 |
| Valkey | 9.x | 9.1.2 (2026-09-01) | Open-source Redis-compatible server. Redis 8.10.2 also current. | https://github.com/valkey-io/valkey/releases | 2026-09-24 |
| Redis | 8.x | 8.10.2 (2026-09-17) | | https://github.com/redis/redis/releases | 2026-09-24 |
| BullMQ | 6.x | 6.3.8 | Queues for all bulk work. | https://registry.npmjs.org/bullmq/latest | 2026-09-24 |
| ioredis | 6.x | 6.0.0 | Client used by BullMQ. | https://registry.npmjs.org/ioredis/latest | 2026-09-24 |
| Zod | 4.x | 4.6.5 | Validate every boundary. | https://registry.npmjs.org/zod/latest | 2026-09-24 |
| Pydantic (Python) | 2.x | 2.13.5 | Python equivalent of Zod. | https://pypi.org/project/pydantic/ | 2026-09-24 |

## Integrations

| Item | Use | Latest seen | Notes | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| n8n | 2.x | 2.40.6 (2026-09-24) | Self-hosted: keep updated; n8n has had critical advisories. | https://github.com/n8n-io/n8n/releases | 2026-09-24 |
| Meta Graph API (WhatsApp Cloud API) | v26.0 | v26.0 (introduced 2026-07-29) | v25.0 available until 2028-07-29. v20.0 expires 2026-09-24. Pin the version in the URL. | https://developers.facebook.com/docs/graph-api/changelog/ | 2026-09-24 |
| Razorpay Node SDK | `razorpay` 2.x | 2.9.8 | Webhooks: HMAC-SHA256 of the raw body in `X-Razorpay-Signature`; dedupe on `x-razorpay-event-id`. | https://razorpay.com/docs/webhooks/validate-test/ | 2026-09-24 |
| Shopify Admin API | 2026-07 (stable) | 2026-10 releases 2026-10-01 | Each version is supported for at least 12 months. 2025-10 stops being accessible 2026-10-16. | https://shopify.dev/docs/api/usage/versioning | 2026-09-24 |
| Shopify API library | `@shopify/shopify-api` 15.x | 15.0.0 | | https://registry.npmjs.org/@shopify%2Fshopify-api/latest | 2026-09-24 |
| Shopify CLI | `@shopify/cli` 4.x | 4.8.2 | | https://registry.npmjs.org/@shopify%2Fcli/latest | 2026-09-24 |
| Resend | `resend` 6.x | 6.28.1 | Transactional email. | https://registry.npmjs.org/resend/latest | 2026-09-24 |
| Anthropic SDK (JS) | `@anthropic-ai/sdk` | 0.128.0 | Model choice: see `models.md`. | https://registry.npmjs.org/@anthropic-ai%2Fsdk/latest | 2026-09-24 |
| Anthropic SDK (Python) | `anthropic` | 1.8.0 | | https://pypi.org/project/anthropic/ | 2026-09-24 |

## Hosting and edge

| Item | Use | Latest seen | Notes | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| Vercel | Node.js 24.x runtime | Vercel CLI 59.26.0 | 24.x is Vercel's default. Node 20 deprecated on Vercel from 2026-10-01. | https://vercel.com/docs/functions/runtimes/node-js/node-js-versions | 2026-09-24 |
| Railway CLI | `@railway/cli` | 5.62.1 | For workers, queues, long-running services. | https://registry.npmjs.org/@railway%2Fcli/latest | 2026-09-24 |
| Cloudflare Wrangler | `wrangler` 4.x | 4.138.0 | DNS, WAF, Workers. | https://registry.npmjs.org/wrangler/latest | 2026-09-24 |

## Observability and analytics

| Item | Use | Latest seen | Notes | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| Sentry | `@sentry/node`, `@sentry/react` 11.x | 11.0.0 | Major release: read the migration guide before upgrading existing projects. Python: `sentry-sdk` 2.70.0. | https://registry.npmjs.org/@sentry%2Fnode/latest | 2026-09-24 |
| Better Stack | Uptime monitors + log drains | — | Service (no SDK pin). Set heartbeat monitors for queue workers. | https://betterstack.com/docs/ | 2026-09-24 |
| PostHog | `posthog-js` 1.x, `posthog-node` 5.x | 1.434.12 / 5.53.0 | Don't send personal data in event properties (DPDP). | https://registry.npmjs.org/posthog-js/latest | 2026-09-24 |

## Quality tooling

| Item | Use | Latest seen | Notes | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| Biome | 2.x (default formatter + linter) | 2.5.14 | Use Biome for new projects; ESLint where a plugin is needed. | https://registry.npmjs.org/@biomejs%2Fbiome/latest | 2026-09-24 |
| ESLint | 10.x with `typescript-eslint` 8.x | 10.11.0 / 8.70.1 | | https://registry.npmjs.org/eslint/latest | 2026-09-24 |
| Vitest | 5.x | 5.0.1 | Major release: check config changes. | https://registry.npmjs.org/vitest/latest | 2026-09-24 |
| Playwright | `@playwright/test` 1.x | 1.63.0 | E2E + mobile viewport tests. | https://registry.npmjs.org/@playwright%2Ftest/latest | 2026-09-24 |
| Ruff (Python) | 0.16.x | 0.16.8 | Lint + format for Python. | https://pypi.org/project/ruff/ | 2026-09-24 |
| pytest (Python) | 9.x | 9.1.1 | | https://pypi.org/project/pytest/ | 2026-09-24 |
| gitleaks | 8.x | 8.30.1 | Secret scanning locally and in CI. | https://github.com/gitleaks/gitleaks/releases | 2026-09-24 |

## CI actions (pin by commit SHA)

| Action | Version | Commit SHA | Source | Verified |
| --- | --- | --- | --- | --- |
| actions/checkout | v7.0.1 | 3d3c42e5aac5ba805825da76410c181273ba90b1 | https://github.com/actions/checkout/releases | 2026-09-24 |
| actions/setup-node | v7.0.0 | 820762786026740c76f36085b0efc47a31fe5020 | https://github.com/actions/setup-node/releases | 2026-09-24 |
| actions/setup-python | v6 | ece7cb06caefa5fff74198d8649806c4678c61a1 | https://github.com/actions/setup-python/releases | 2026-09-24 |
| anthropics/claude-code-action | v1 | 8cf3482550831fb35a4fc3fbf7ca139cf8028b4c | https://github.com/anthropics/claude-code-action | 2026-09-24 |
| anthropics/claude-code-security-review | main (no releases) | 0c6a49f1fa56a1d472575da86a94dbc1edb78eda | https://github.com/anthropics/claude-code-security-review | 2026-09-24 |
| DavidAnson/markdownlint-cli2-action | v24.2.0 | 21c1be1b93ad9ed58fa840aacc3f279cde2a72ff | https://github.com/DavidAnson/markdownlint-cli2-action/releases | 2026-09-24 |
| lycheeverse/lychee-action | v2.9.0 | e7477775783ea5526144ba13e8db5eec57747ce8 | https://github.com/lycheeverse/lychee-action/releases | 2026-09-24 |
