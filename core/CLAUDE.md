# ASEN Engineering: core rules (non-negotiable)

These rules apply to every project registered with ASEN Engineering (ASEN, personal, or client). Details live in the ASEN skills; load the matching one.

## Rule 0: project isolation (highest priority)

- Nothing happens in a project that isn't in the private project registry with Aakash's approval. In an unregistered folder, don't read or change git/gh settings and don't write to GitHub; suggest `/add-project`.
- Each project uses only its registered GitHub account, writes only to its registered repos, and stays within its automation level (shown below under "This project").
- Use `pgh` for gh commands (it picks the project's account), or `GH_TOKEN=$(gh auth token --user <account>) gh ...`.
- Information never crosses between projects or clients. Nothing about clients or personal projects goes into the public `asen-engineering` repo.
- Never run `gh auth switch|login|logout|setup-git`: the global default account never changes. Never add `-c` or `GIT_*` identity overrides.
- If the identity guard blocks something, stop and tell Aakash. Do not work around it.

## How we work

1. Plan before coding. For every feature, threat-model it: "How could this be abused?" Write the answer in the plan.
2. Use the matching `asen-engineering` skill for the project type (website, saas-webapp, ecommerce-shopify, mobile-app, automation-n8n, ai-features, python-bots) and for each integration (supabase, whatsapp-meta, payments-razorpay, deploy-vercel-railway, dpdp-compliance). Always apply `security-core`.
3. Explain every change in simple words and list what could break.
4. Small commits with clear messages. Never commit `.env` files.
5. Leave no `console.log`, dead code, commented-out code, or empty `catch` blocks behind.

## Security

- Never put secrets in code or in the frontend. Secret/`service_role` keys never reach the browser or a mobile app.
- Row Level Security on every Supabase table, with tenant-scoped policies and tests that prove one tenant can't read another's data.
- Check authorization on the server for every request (prevent IDOR). Never trust an ID sent by the client.
- Validate all input with Zod (Pydantic in Python) at every boundary: HTTP, webhooks, queues, forms, env vars.
- Verify the signature of every incoming webhook against the raw body before doing anything else.
- Idempotency for anything that sends messages, charges money, or creates records (idempotency key or unique constraint).

## Reliability

- Bulk work goes through a queue (BullMQ), never a loop inside a request.
- Timeouts on all external calls; retries with exponential backoff and jitter; a maximum retry count.
- Store times in UTC. Store money as integers in the smallest unit (paise).
- Database changes only through migration files. Never edit the schema by hand in production.

## Dependencies

- Before adding any package: confirm it exists on the official registry, is actively maintained, and is widely used. AI models invent package names; check first.
- Prefer the versions in `knowledge/stack.md` of the asen-engineering repo.

## Before saying "done"

- Typecheck, lint, and tests pass. New logic has tests.
- Empty, loading, and error states exist for every screen.
- Run the security-reviewer agent on anything touching auth, payments, webhooks, or personal data.
