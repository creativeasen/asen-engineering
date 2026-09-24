---
name: deploy-vercel-railway
description: ASEN standard for deploying on Vercel (frontends, API functions) and Railway (workers, queues, Redis/Valkey, long-running services) - environments, env vars, Node version pinning, preview deployments, health checks, rollback. Use when setting up or changing deployment, environments, or hosting.
---

# Deploy on Vercel and Railway

Runtime versions and deprecation dates: `${CLAUDE_PLUGIN_ROOT}/knowledge/stack.md` and `${CLAUDE_PLUGIN_ROOT}/knowledge/security-watchlist.md`.

## Which goes where

- **Vercel**: static frontends, SSR, short API functions, webhooks that respond fast and enqueue work.
- **Railway**: BullMQ workers, schedulers, Redis/Valkey, Python bots, anything long-running or stateful.
- **Cloudflare**: DNS, WAF, bot protection, Turnstile.

## Must-have checklist

- [ ] **Node version pinned**: `"engines": { "node": "24.x" }` in `package.json` (Vercel deprecates Node 20 from 2026-10-01).
- [ ] **Three environments**: development, preview/staging, production, each with its own env vars, database, and API keys. Production secrets are never used in previews.
- [ ] Env vars set in the Vercel/Railway dashboards or CLI, never committed; `.env.example` documents names.
- [ ] **Preview deployments** protected (Vercel Deployment Protection) when they can reach real data.
- [ ] **Migrations run before the new code** that needs them, and are backward compatible (expand → migrate → contract).
- [ ] **Health checks**: Railway services expose `/health`; workers send heartbeats to Better Stack.
- [ ] **Rollback plan**: Vercel instant rollback to the previous deployment; Railway redeploy of the previous image; database changes reversible or forward-fixable.
- [ ] Function timeouts and regions set deliberately (region close to the database, e.g. Mumbai when the database is in India).
- [ ] Custom domain over HTTPS with HSTS; Cloudflare proxy and WAF rules on.

## Common AI-generated mistakes

- Running a queue worker as a Vercel function (it gets killed).
- Same database and keys for preview and production.
- Deploying code that needs a column before the migration has run.
- Forgetting to set env vars in production, then "fixing" it by hard-coding values.
- No `engines` field, so the platform picks a default that later changes.

## Pre-launch checklist

- [ ] Production env vars reviewed (names only) against `.env.example`.
- [ ] One rollback rehearsed.
- [ ] Uptime and heartbeat monitors on; alerts reach Aakash.
- [ ] Logs retained and searchable (Better Stack log drain).
