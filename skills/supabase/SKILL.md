---
name: supabase
description: ASEN rules for Supabase - Row Level Security with tenant-scoped policies and tests, publishable vs secret keys, migrations, auth, storage, Edge Functions. Use when creating or changing tables, policies, auth, storage buckets, RPC functions, or Supabase client code.
---

# Supabase

Versions and key model: `${CLAUDE_PLUGIN_ROOT}/knowledge/stack.md` (Supabase rows).

## When it applies

Any project using Supabase for database, auth, storage, realtime, or Edge Functions.

## Must-have checklist

- [ ] **RLS enabled on every table** in exposed schemas, in the same migration that creates the table.
- [ ] **Tenant-scoped policies**: every row has `tenant_id` (or `owner_id`); policies compare it to the caller's membership, e.g. `tenant_id in (select tenant_id from memberships where user_id = (select auth.uid()))`. Wrap `auth.uid()` in `select` so it is evaluated once.
- [ ] Separate policies per action (`select`, `insert`, `update`, `delete`); `insert`/`update` use `with check` too.
- [ ] **RLS tests** in `supabase/tests` (pgTAP) or integration tests: user of tenant A gets zero rows from tenant B for every table, and can't insert into B.
- [ ] **Keys**: publishable key (`sb_publishable_...`) in browser/mobile; secret key (`sb_secret_...`) only in server code and Edge Functions. New projects don't use legacy `anon`/`service_role` JWT keys (deprecated by end of 2026).
- [ ] **Migrations only**: `supabase migration new <name>`; never change production schema in the dashboard. Migrations are committed and reviewed.
- [ ] `security definer` functions: set `search_path = ''`, check the caller inside, and revoke `execute` from `public`/`anon` unless intended.
- [ ] **Storage**: private buckets by default; storage policies scoped by path prefix (`tenant_id/...`); signed URLs with short expiry for private files.
- [ ] Money as `bigint` paise; times as `timestamptz` (UTC).
- [ ] Indexes on every foreign key and on columns used in RLS policies.
- [ ] Run the Supabase database advisors (security + performance) and fix warnings before launch.

## Common AI-generated mistakes

- `alter table ... disable row level security` or a policy `using (true)` to "fix" a permission error.
- Using the secret/service key in the frontend.
- Policies based on `user_metadata` in the JWT (users can edit it). Use `app_metadata` or a memberships table.
- Views that bypass RLS (views run as the owner unless `security_invoker = true`).
- Forgetting `with check`, so users can move rows into another tenant on update.
- Calling `supabase.auth.getSession()` on the server and trusting it. On the server use `getUser()` / verify the JWT.
- Realtime subscriptions without RLS on the table (leaks all changes).

## Pre-launch checklist

- [ ] Advisors show no security errors; every table has RLS enabled.
- [ ] Cross-tenant tests pass in CI.
- [ ] Point-in-time recovery or daily backups on; restore tested once.
- [ ] Auth: email confirmation on, OTP rate limits set, redirect URLs allowlisted, leaked-password protection on.
- [ ] No legacy keys used anywhere; old keys disabled if the project was migrated.
