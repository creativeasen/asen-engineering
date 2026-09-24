---
description: Pre-launch gate for an ASEN project - runs every pre-launch checklist for its type and integrations, plus security, QA, backups, monitoring, and rollback checks. Reports GO / NO-GO.
disable-model-invocation: true
---

# /prelaunch

Rule 0 applies: ASEN repos only.

1. Identify the project type and integrations; load those ASEN skills plus `security-core` and `dpdp-compliance`.
2. Go through the **Pre-launch checklist** section of every loaded skill. For each item: ✅ verified (how), ❌ missing, or ⚠️ can't verify here (what Aakash must check).
3. Run: typecheck, lint, tests, dependency audit, gitleaks on full history, and a production build. Search the build output for secret key prefixes.
4. Run the security-reviewer and qa-tester agents on everything since the last release tag.
5. Confirm: backups + a tested restore, uptime/heartbeat monitors, Sentry receiving events, alerts reaching Aakash, a rehearsed rollback, and production env var names matching `.env.example`.
6. Output:
   - **GO / NO-GO** with a one-line reason.
   - Blockers (must fix), then should-fix items, then nice-to-have.
   - A short plain-English note for Aakash.
