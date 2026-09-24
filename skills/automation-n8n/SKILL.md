---
name: automation-n8n
description: ASEN standard for n8n automations - self-hosting safely, credentials, webhook authentication, idempotency, error workflows, rate limits, versioned workflow exports. Use when building, changing, or hosting n8n workflows.
---

# Automations with n8n

Version and advisories: `${CLAUDE_PLUGIN_ROOT}/knowledge/stack.md` and `${CLAUDE_PLUGIN_ROOT}/knowledge/security-watchlist.md`. Template: `${CLAUDE_PLUGIN_ROOT}/templates/automation-n8n/`.

## When it applies

Any n8n workflow (self-hosted or cloud), and any system that calls or is called by n8n.

## Must-have checklist

- [ ] **Keep n8n updated**; subscribe to n8n security advisories. Self-hosted instances are never exposed without HTTPS and authentication.
- [ ] Editor UI not publicly reachable (IP allowlist, Cloudflare Access, or VPN); owner account has 2FA.
- [ ] `N8N_ENCRYPTION_KEY` set explicitly and backed up securely; credentials only in the n8n credential store, never in Code nodes or workflow JSON.
- [ ] **Webhook triggers authenticated**: header auth or HMAC signature check as the first step; unknown callers get 401.
- [ ] **Idempotency**: a dedupe key (event ID) checked before side effects (sending messages, creating records, charging).
- [ ] **Error workflow** configured for every production workflow; alerts go to Aakash; failed items can be retried safely.
- [ ] Rate limits respected with batching and wait nodes; bulk sends go through a queue, not a single giant loop.
- [ ] Code nodes: validate input shape; no `eval`; no disabling TLS verification.
- [ ] **Workflows exported to git** (JSON, with credentials stripped) after each change, so changes are reviewed and can be rolled back.
- [ ] Execution data retention limited (pruning on) because executions contain personal data (DPDP).

## Common AI-generated mistakes

- Public webhook URLs with no authentication ("the URL is secret").
- API keys pasted into HTTP Request node headers instead of credentials.
- No error branch: failures silently stop and nobody knows.
- Retrying a whole workflow that already sent half the messages (duplicates).
- Running an old n8n version with known vulnerabilities.

## Pre-launch checklist

- [ ] Webhook rejects a request without the correct auth header/signature.
- [ ] Duplicate trigger doesn't cause duplicate side effects.
- [ ] Error workflow fires on a forced failure and alerts arrive.
- [ ] Workflow JSON committed; backup of database and encryption key verified.
