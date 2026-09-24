---
name: python-bots
description: ASEN standard for Python bots, scrapers, and workers - typed config with Pydantic, timeouts and backoff, idempotent jobs, secrets handling, logging, packaging, Ruff and pytest. Use when building or changing Python bots (Telegram, WhatsApp helpers, trading or data bots), scripts, or workers.
---

# Python bots and workers

Versions: `${CLAUDE_PLUGIN_ROOT}/knowledge/stack.md` (Python, FastAPI, httpx, Pydantic, Ruff, pytest, pip-audit). Template: `${CLAUDE_PLUGIN_ROOT}/templates/python-bot/`.

## Standard stack

Python 3.14 · `uv` or `pip` with a lockfile · Pydantic settings for config · httpx with timeouts · FastAPI for webhook receivers · Ruff (lint + format) · pytest · Sentry (`sentry-sdk`) · deployed on Railway.

## Must-have checklist

- [ ] **Config via Pydantic settings** from environment variables; the app refuses to start if a required value is missing.
- [ ] **Every network call has a timeout** (`httpx.Timeout`), retries with exponential backoff + jitter, and a max attempts limit.
- [ ] **Idempotent jobs**: a job can run twice without double effects (dedupe keys, upserts).
- [ ] **Webhook receivers** verify signatures on the raw body before parsing (see `whatsapp-meta` / `payments-razorpay`).
- [ ] **Graceful shutdown** (SIGTERM) so deploys don't cut jobs in half.
- [ ] Structured logging (JSON) without tokens or personal data; Sentry for exceptions.
- [ ] **Trading/finance bots**: paper-trading mode by default, hard position and loss limits in code, a kill switch, and logs of every order decision.
- [ ] **Scrapers**: respect robots.txt and site terms, rate limit, identify the bot, and never store personal data you don't need.
- [ ] Dependencies pinned in a lockfile; `pip-audit` in CI.

## Common AI-generated mistakes

- `requests.get(url)` with no timeout (hangs forever).
- `except Exception: pass`.
- Secrets hard-coded "for testing" and committed.
- `while True:` loops with no backoff hammering an API after an error.
- Global mutable state shared between async tasks.

## Pre-launch checklist

- [ ] `ruff check`, `ruff format --check`, and `pytest` pass in CI.
- [ ] Kill the process mid-job and restart: no duplicates, no data loss.
- [ ] Health check / heartbeat monitor in Better Stack.
- [ ] Runbook: how to stop the bot immediately.
