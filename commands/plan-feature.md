---
description: Plan a feature before coding - requirements, threat model, data changes, tasks, tests, and what could break. Produces a plan for Aakash's OK; writes no code.
argument-hint: <feature description>
disable-model-invocation: true
---

# /plan-feature

Feature: `$ARGUMENTS`

Do not write code in this command. Produce a plan, then wait for Aakash's OK.

1. Read the project's `CLAUDE.md`, `docs/PLAN.md` (if any), and the code around the feature. Load the matching ASEN skills.
2. Write the plan in `docs/plans/<yyyy-mm-dd>-<short-name>.md`:
   - **What and why** (2–3 sentences, simple words).
   - **User flow** including empty, loading, error, and no-permission states.
   - **Data changes**: new tables/columns (with `tenant_id`, RLS policies), migrations, money in paise, times in UTC.
   - **API changes**: each endpoint with its Zod schema and the server-side authorization check.
   - **Threat model**: how could this be abused (other tenants, bots, replay, price tampering, spam, AI cost)? The control for each.
   - **Reliability**: queues for bulk work, idempotency keys, timeouts, retries.
   - **Tests**: unit, cross-tenant/RLS, and one end-to-end path.
   - **Tasks**: small steps, each a commit.
   - **What could break** and how we'd roll back.
   - **Decisions for Aakash** (if any), each with a recommendation.
3. Ask the architect-reviewer agent to review the plan; fold in its top points.
4. Summarise the plan in 5–8 lines and ask for OK.
