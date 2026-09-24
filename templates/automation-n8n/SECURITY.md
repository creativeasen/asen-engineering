# Security policy

## Reporting a vulnerability

Please **don't** open a public issue. Use GitHub's private vulnerability reporting instead:
**Security** tab → **Report a vulnerability**.

Include what you found, how to reproduce it, and the impact. We aim to reply within 3 working days and to fix confirmed critical issues within 7 days.

## How this project stays secure

- Secrets live only in the hosting provider's environment settings, never in the repo (`.env.example` lists names only).
- Every pull request runs secret scanning (gitleaks), a dependency audit, and an AI security review.
- Personal data is handled under India's DPDP Act and Rules; see `docs/PLAN.md` for the data map.
