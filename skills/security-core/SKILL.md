---
name: security-core
description: ASEN baseline security rules for every project - auth, authorization (IDOR), input validation, secrets, webhooks, abuse cases, OWASP Top 10. Use whenever writing or reviewing code that touches users, data, money, messages, APIs, or config.
---

# Security core (applies to every ASEN project)

Versions: `${CLAUDE_PLUGIN_ROOT}/knowledge/stack.md`. Open risks: `${CLAUDE_PLUGIN_ROOT}/knowledge/security-watchlist.md`.

## Threat model first

For each feature, write 3–5 lines in the plan:

- Who can call this? What if they're logged out, another tenant, or a bot?
- What's the worst thing an attacker could make it do (read others' data, send 10,000 messages, refund money, run up an AI bill)?
- What limits stop that (authz check, rate limit, quota, idempotency, approval)?

## Must-have checklist

- [ ] **Authentication** from a proven provider (Supabase Auth). No home-made password or session code.
- [ ] **Authorization on the server for every request.** Load the record, then check it belongs to the caller's user/tenant. Never trust `user_id`, `tenant_id`, `role`, or `price` sent by the client.
- [ ] **Input validation** with Zod/Pydantic at every boundary: request body, query, params, headers you use, webhook payloads, queue jobs, env vars (fail fast on boot).
- [ ] **Output encoding**: no `dangerouslySetInnerHTML` with user data; parameterized SQL only.
- [ ] **Secrets** only in environment variables on the server. `.env` is gitignored; `.env.example` lists names only. Nothing secret has a `VITE_`/`NEXT_PUBLIC_`/`EXPO_PUBLIC_` prefix.
- [ ] **Webhooks**: verify the signature on the raw body (constant-time compare) before parsing; reject old timestamps where the provider sends one; dedupe by event ID.
- [ ] **Rate limits** on login, OTP, signup, password reset, AI endpoints, and anything that sends messages or email.
- [ ] **Idempotency** for sends, charges, and record creation (idempotency key + unique constraint).
- [ ] **Security headers**: HTTPS only, HSTS, CSP, `X-Content-Type-Options: nosniff`, `frame-ancestors`/`X-Frame-Options`, strict `Referrer-Policy`.
- [ ] **CORS**: explicit allowed origins; never `*` with credentials.
- [ ] **Logging** of security events (login, role change, payout, export) without secrets, tokens, OTPs, or full personal data.
- [ ] **Dependencies**: lockfile committed; `npm audit`/`pip-audit` in CI; new packages checked (exists, maintained, widely used).
- [ ] **Errors**: users see a generic message; details go to Sentry with personal data scrubbed.

## Common AI-generated mistakes

- Checking auth in the frontend or middleware only, then fetching by ID without an ownership check (IDOR).
- Using the Supabase secret/`service_role` key in client code "to make it work", or disabling RLS to fix an error.
- `JSON.parse`-ing a webhook body before verifying the signature (signature then fails, so the check gets removed).
- Trusting `amount`, `plan`, or `role` from the request body.
- Catch-all `catch (e) {}` that hides auth failures.
- Inventing package names or API fields that don't exist.
- Logging whole request bodies (tokens, OTPs, phone numbers) to the console.
- Open redirects via `?next=` without an allowlist.
- AI endpoints with no per-user quota (bill abuse) and no prompt-injection boundary around user content.

## Pre-launch checklist

- [ ] security-reviewer agent run on the whole diff since last release; all high/critical fixed.
- [ ] Two-account test: user A cannot read, edit, or delete user B's data through any API route.
- [ ] gitleaks clean on full history; no secrets in the frontend bundle (search the built files for key prefixes).
- [ ] Rate limits verified with a quick burst test.
- [ ] All webhooks reject a request with a wrong signature.
- [ ] Admin routes require an admin role checked on the server.
- [ ] Backups enabled and one restore tested.
