## What changed (simple words)

<!-- 2–3 sentences anyone can understand -->

## Why

## What could break

<!-- list anything that might behave differently, and how we'd roll back -->

## Checklist

- [ ] Typecheck, lint, and tests pass
- [ ] No secrets, `.env` files, or personal data in the diff
- [ ] New/changed tables have RLS with tenant-scoped policies (+ tests)
- [ ] Every new endpoint checks authorization on the server and validates input (Zod/Pydantic)
- [ ] Webhooks verify signatures on the raw body; sends/charges are idempotent
- [ ] Database changes are in migration files
- [ ] Loading, empty, and error states handled
