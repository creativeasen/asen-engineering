---
name: saas-webapp
description: ASEN standard for multi-tenant SaaS web apps - React + Vite + Tailwind frontend, Supabase with RLS, server-side authorization, queues for bulk work, billing, roles, audit logs, observability. Use when building or changing a logged-in, multi-user or multi-tenant web application.
---

# SaaS web app (multi-tenant)

Stack and versions: `${CLAUDE_PLUGIN_ROOT}/knowledge/stack.md`. Template: `${CLAUDE_PLUGIN_ROOT}/templates/saas-webapp/`. Also apply `security-core`, `supabase`, and the integration skills you use.

## Standard stack

React + Vite + Tailwind SPA on Vercel · API/server functions (Vercel functions or a Node service on Railway) · Supabase (Postgres + Auth + Storage) with RLS · Redis/Valkey + BullMQ workers on Railway for bulk and scheduled work · Zod everywhere · Sentry + Better Stack + PostHog · Resend for email · Razorpay for billing.

## Must-have checklist

- [ ] **Tenancy model** written down: `tenants`, `memberships (user_id, tenant_id, role)`; every business table has `tenant_id` and RLS by membership.
- [ ] **Server-side authorization** in every API handler: resolve the caller from the verified JWT, load the resource, check tenant and role. One shared helper, used everywhere.
- [ ] **Roles** (owner/admin/member) enforced on the server; the UI only hides buttons.
- [ ] **Queues**: imports, exports, bulk messages, AI batches, and scheduled jobs run in BullMQ workers with retries, backoff, dead-letter handling, and idempotency keys.
- [ ] **Limits per tenant**: plan quotas, rate limits, and usage metering (messages, AI tokens, storage).
- [ ] **Audit log** for sensitive actions (role changes, exports, deletes, billing changes, impersonation).
- [ ] **Billing**: plan state comes from payment webhooks (see `payments-razorpay`), never from the client.
- [ ] **Observability**: Sentry (frontend + backend) with PII scrubbing, structured logs with request IDs, Better Stack uptime and heartbeat monitors for workers, alerts to a channel Aakash sees.
- [ ] **Every screen** has loading, empty, error, and no-permission states; works at 360px width.
- [ ] **Data export and account deletion** per tenant (DPDP).
- [ ] **Environments**: separate Supabase projects (or branches) and keys for dev/staging/prod.

## Common AI-generated mistakes

- Fetching `/api/items/:id` without checking the item's `tenant_id` against the caller.
- Storing the "current tenant" only in frontend state and trusting it on the server.
- Bulk operations in a request handler with `Promise.all` over thousands of rows.
- Feature flags or plan checks only in the UI.
- One Supabase project shared by dev and prod.
- Missing pagination: list endpoints return every row.

## Pre-launch checklist

- [ ] Cross-tenant tests (API + RLS) pass in CI.
- [ ] Load test: a 10k-item bulk job completes through the queue; the API stays responsive.
- [ ] Backups + restore test; migrations applied cleanly on a copy of prod.
- [ ] security-reviewer, architect-reviewer, and qa-tester agents run; findings fixed or accepted by Aakash.
- [ ] Runbook: how to roll back a deploy, pause workers, and rotate keys.
