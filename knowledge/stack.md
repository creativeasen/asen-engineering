# ASEN standard stack

Every row was checked on an official source (see `sources.md`). Each row needs a source URL and a "Verified" date. Routines re-check rows older than 30 days.

"Use" means the version new ASEN projects start on. Latest ≠ automatically adopted: major upgrades are HIGH risk until reviewed.

## Runtimes

| Item | Use | Latest seen | Notes | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| Node.js | 24.x LTS ("Krypton") | 24.22.1 LTS (Maintenance); 26.13.0 LTS "Lithium" | 24 moved to Maintenance on 2026-10-20 (until 2028-04-30). Node 26 became LTS on 2026-10-28 (Maintenance 2027-10-20, end 2029-04-30). New projects stay on 24.x until a reviewer approves moving the baseline to 26 (needs-aakash). Node 20 reached end-of-life 2026-04-30: do not use. | https://github.com/nodejs/Release/blob/main/schedule.json | 2026-11-01 |
| Node.js release list | — | v26.13.0 (2026-10-28), v24.22.1 (2026-10-20), v22.23.4 (2026-10-20) | Official download index | https://nodejs.org/dist/index.json | 2026-11-01 |
| Python | 3.14.x | 3.14.10 (2026-10-25); 3.15.2 (2026-10-25) | 3.15.0 was released 2026-10-09. New projects stay on 3.14.x until a reviewer approves the 3.15 baseline (needs-aakash). | https://www.python.org/downloads/ | 2026-11-01 |
| TypeScript | 7.0.x | 7.0.2 | Major version: check tooling support before adopting in an existing project. | https://registry.npmjs.org/typescript/latest | 2026-10-25 |

## Frontend

| Item | Use | Latest seen | Notes | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| React | 19.x | 19.3.1 | | https://registry.npmjs.org/react/latest | 2026-10-25 |
| Vite | 8.x | 8.3.5 | | https://registry.npmjs.org/vite/latest | 2026-10-25 |
| Tailwind CSS | 4.x with `@tailwindcss/vite` | 4.3.3 | | https://registry.npmjs.org/tailwindcss/latest | 2026-10-25 |
| Expo (mobile) | SDK 57 | 58.0.19 | SDK 58 is the latest; new projects stay on SDK 57 until a reviewer approves the major upgrade (needs-aakash). Secrets on device: `expo-secure-store`. | https://registry.npmjs.org/expo/latest | 2026-10-25 |

## Python services

| Item | Use | Latest seen | Notes | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| FastAPI | 0.141.x | 0.162.0 | For Python HTTP services and webhook receivers. Latest is 0.162.x; the 0.141.x baseline is behind, so review before the next bump (needs-aakash). | https://pypi.org/project/fastapi/ | 2026-10-25 |
| httpx | 0.28.x | 0.28.1 | HTTP client with timeouts. | https://pypi.org/project/httpx/ | 2026-10-25 |
| aiogram (Telegram) | 3.x | 3.31.0 | Async Telegram bots. `python-telegram-bot` 22.8 is also current. | https://pypi.org/project/aiogram/ | 2026-10-25 |
| pip-audit | 2.x | 2.10.1 | Dependency audit in CI. | https://pypi.org/project/pip-audit/ | 2026-10-25 |

## Backend, data, queues

| Item | Use | Latest seen | Notes | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| Supabase JS | `@supabase/supabase-js` 2.x | 2.118.0 | | https://registry.npmjs.org/@supabase%2Fsupabase-js/latest | 2026-10-25 |
| Supabase CLI | `supabase` 2.x | 2.122.0 | Migrations live in `supabase/migrations`. | https://registry.npmjs.org/supabase/latest | 2026-10-25 |
| Supabase API keys | Publishable (`sb_publishable_...`) in clients, Secret (`sb_secret_...`) only on servers | — | Legacy `anon` / `service_role` JWT keys are being deprecated by end of 2026. New projects: use new keys only. | https://supabase.com/docs/guides/api/api-keys | 2026-11-08 |
| Valkey | 9.x | 9.1.2 (2026-09-01) | Open-source Redis-compatible server. Redis 8.10.2 also current. | https://github.com/valkey-io/valkey/releases | 2026-09-24 |
| Redis | 8.x | 8.10.2 (2026-09-17) | | https://github.com/redis/redis/releases | 2026-09-24 |
| BullMQ | 6.x | 6.4.2 | Queues for all bulk work. | https://registry.npmjs.org/bullmq/latest | 2026-10-25 |
| ioredis | 6.x | 6.0.0 | Client used by BullMQ. | https://registry.npmjs.org/ioredis/latest | 2026-10-25 |
| Zod | 4.x | 4.6.7 | Validate every boundary. | https://registry.npmjs.org/zod/latest | 2026-10-25 |
| Pydantic (Python) | 2.x | 2.14.1 | Python equivalent of Zod. | https://pypi.org/project/pydantic/ | 2026-10-25 |

## Integrations

| Item | Use | Latest seen | Notes | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| n8n | 2.x | 2.44.6 (2026-10-22, latest stable; 2.45.x is pre-release) | Self-hosted: keep updated; n8n has had critical advisories. | https://github.com/n8n-io/n8n/releases | 2026-10-23 |
| Meta Graph API (WhatsApp Cloud API) | v26.0 | v27.0 (changelog lists it as latest; release date not shown); v26.0 introduced 2026-07-29 | v26.0 baseline stays until a reviewer approves v27 (needs-aakash). v25.0 available until 2028-07-29; v21.0 until 2027-01-21; v20.0 expired 2026-09-24. Pin the version in the URL. | https://developers.facebook.com/docs/graph-api/changelog/ | 2026-11-08 |
| Razorpay Node SDK | `razorpay` 2.x | 2.9.8 | Webhooks: HMAC-SHA256 of the raw body in `X-Razorpay-Signature`; dedupe on `x-razorpay-event-id`. | https://razorpay.com/docs/webhooks/validate-test/ | 2026-09-24 |
| Shopify Admin API | 2026-10 (latest stable) | 2027-01 is a release candidate (releases 2027-01-01) | Each version is supported for at least 12 months. 2026-10 is accessible until 2027-10-16; 2026-07 until 2027-07-16; 2026-01 until 2027-01-16. 2025-10 stopped being accessible on 2026-10-16. | https://shopify.dev/docs/api/usage/versioning | 2026-10-16 |
| Shopify API library | `@shopify/shopify-api` 15.x | 15.0.1 | | https://registry.npmjs.org/@shopify%2Fshopify-api/latest | 2026-10-25 |
| Shopify CLI | `@shopify/cli` 4.x | 4.9.4 | | https://registry.npmjs.org/@shopify%2Fcli/latest | 2026-10-25 |
| Resend | `resend` 6.x | 6.34.1 | Transactional email. | https://registry.npmjs.org/resend/latest | 2026-10-25 |
| Anthropic SDK (JS) | `@anthropic-ai/sdk` | 1.7.0 (1.0.0 published 2026-10-21) | Model choice: see `models.md`. 1.x is a new major version (npm registry): read its migration notes before upgrading existing projects (needs-aakash). Sonnet 4.5 is deprecated in the client ([v0.131.0 release notes](https://github.com/anthropics/anthropic-sdk-typescript/releases/tag/sdk-v0.131.0)). | https://registry.npmjs.org/@anthropic-ai%2Fsdk/latest | 2026-11-10 |
| Anthropic SDK (Python) | `anthropic` | 2.3.0 | | https://pypi.org/project/anthropic/ | 2026-10-25 |

## Hosting and edge

| Item | Use | Latest seen | Notes | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| Vercel | Node.js 24.x runtime | Vercel CLI 59.26.0 | Vercel now offers 26.x (its default), 24.x and 22.x; Node 20 is no longer listed (deprecated 2026-10-01). Pin `"engines": {"node": "24.x"}` so the default moving to 26 does not change the baseline (Node 26 move is needs-aakash). | https://vercel.com/docs/functions/runtimes/node-js/node-js-versions | 2026-11-08 |
| Railway CLI | `@railway/cli` | 5.71.0 | For workers, queues, long-running services. | https://registry.npmjs.org/@railway%2Fcli/latest | 2026-10-25 |
| Cloudflare Wrangler | `wrangler` 4.x | 4.152.0 | DNS, WAF, Workers. | https://registry.npmjs.org/wrangler/latest | 2026-10-25 |

## Observability and analytics

| Item | Use | Latest seen | Notes | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| Sentry | `@sentry/node`, `@sentry/react` 11.x | 11.9.0 | Major release: read the migration guide before upgrading existing projects. Python: `sentry-sdk` 2.73.0. | https://registry.npmjs.org/@sentry%2Fnode/latest | 2026-10-25 |
| Better Stack | Uptime monitors + log drains | — | Service (no SDK pin). Set heartbeat monitors for queue workers. | https://betterstack.com/docs/ | 2026-09-24 |
| PostHog | `posthog-js` 1.x, `posthog-node` 5.x | 1.438.21 / 5.57.1 | Don't send personal data in event properties (DPDP). | https://registry.npmjs.org/posthog-js/latest | 2026-10-25 |

## Quality tooling

| Item | Use | Latest seen | Notes | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| Biome | 2.x (default formatter + linter) | 2.6.3 | Use Biome for new projects; ESLint where a plugin is needed. | https://registry.npmjs.org/@biomejs%2Fbiome/latest | 2026-10-25 |
| ESLint | 10.x with `typescript-eslint` 8.x | 10.13.0 / 8.72.0 | | https://registry.npmjs.org/eslint/latest | 2026-10-25 |
| Vitest | 5.x | 5.0.5 | Major release: check config changes. | https://registry.npmjs.org/vitest/latest | 2026-10-25 |
| Playwright | `@playwright/test` 1.x | 1.64.1 | E2E + mobile viewport tests. | https://registry.npmjs.org/@playwright%2Ftest/latest | 2026-10-25 |
| Ruff (Python) | 0.16.x | 0.17.2 | Lint + format for Python. 0.17.x is out; 0.16.x stays the baseline until reviewed. | https://pypi.org/project/ruff/ | 2026-10-25 |
| pytest (Python) | 9.x | 9.1.1 | | https://pypi.org/project/pytest/ | 2026-10-25 |
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
