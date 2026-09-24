---
description: Audit an ASEN project (or its recent changes) for security, architecture, quality, and compliance problems. Produces a prioritized report; changes no code.
argument-hint: "[scope: full | since <git-ref> | path]"
disable-model-invocation: true
---

# /audit

Scope: `$ARGUMENTS` (default: full project; `since <ref>` audits only changes after that ref).

Rule 0: only audit ASEN-owned repos in folders starting with `asen-`. Never audit, comment on, or open issues in a client repo. **Change no code.**

1. **Map the project**: type, stack, entry points, data stores, integrations, where personal data lives. Load the matching ASEN skills and `security-core`.
2. **Automated checks** (read-only; skip any tool that's missing and say so): typecheck, lint, tests, `npm audit --omit=dev` / `pip-audit`, `gitleaks git --redact --no-banner .`, and a search for secret key prefixes in client code.
3. **Reviews**: run the security-reviewer, architect-reviewer, and qa-tester agents on the scope.
4. **Compliance**: `dpdp-compliance` checklist if personal data is stored.
5. **Deadlines**: compare the project with `${CLAUDE_PLUGIN_ROOT}/knowledge/security-watchlist.md` and `stack.md` (old Node, old Graph API version, legacy Supabase keys, retiring models, old Shopify API version).
6. **Report** saved to `docs/audits/<yyyy-mm-dd>-audit.md` in the project (or where the caller asks), with:
   - Summary for Aakash (5 lines, simple words).
   - Findings table: severity (critical/high/medium/low) | area | file:line | problem | fix | effort (S/M/L).
   - **Top 10 fixes in priority order.**
   - What was not checked and why.
