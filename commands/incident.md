---
description: Guide an incident response - contain first, then investigate, fix, notify (including DPDP breach duties), and write a blameless report with lessons.
argument-hint: <what is happening>
disable-model-invocation: true
---

# /incident

What's happening: `$ARGUMENTS`

Stay calm and be brief. Explain each step to Aakash in one line before doing it. Ask before any destructive action.

1. **Size it (2 minutes)**: what's broken, who is affected, since when, is personal data or money involved? Severity: SEV1 (data leak, money loss, full outage), SEV2 (major feature down), SEV3 (minor).
2. **Contain first**: roll back the last deploy, pause workers/bots/campaigns, disable the affected feature flag or webhook, rotate any exposed key. List the containment options and recommend one; wait for OK unless every minute causes harm and the action is reversible.
3. **Preserve evidence**: note times (IST and UTC), save relevant logs, Sentry events, and database state before changing more.
4. **Find the cause**: recent deploys, config changes, provider status pages, logs. State facts and guesses separately.
5. **Fix** with a small, reviewed change; add a test that would have caught it.
6. **Personal data breach?** Follow `dpdp-compliance`: tell affected users and the Data Protection Board without delay, and send the Board a detailed report within 72 hours. Draft both notices for Aakash to review.
7. **Report**: write `docs/incidents/<yyyy-mm-dd>-<name>.md` covering timeline, impact, root cause, what went well, what didn't, and actions with owners.
8. **Lesson**: run `/lesson` with the general lesson (no client names in the public repo).
