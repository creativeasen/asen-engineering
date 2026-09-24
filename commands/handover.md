---
description: Write a handover document for an ASEN project so another developer (or a future AI session) can run, deploy, and maintain it safely.
disable-model-invocation: true
---

# /handover

Write `docs/HANDOVER.md` in the project. Simple words, no secrets (names of env vars only).

Sections:
1. **What it is**: purpose, users, status.
2. **Architecture**: components (frontend, API, workers, database, queues), where each is hosted, a small diagram in text.
3. **Run locally**: prerequisites with versions (from `knowledge/stack.md`), install, env var names from `.env.example`, start commands, test commands.
4. **Deploy**: environments, how deploys happen, how to roll back (one step), how migrations run.
5. **Integrations**: WhatsApp, Razorpay, Shopify, AI, email, each with the dashboard location, webhook URLs, how signatures are verified, and where keys live (by name).
6. **Data**: tables with personal data, retention, backup/restore steps, how to delete a user's data (DPDP).
7. **Operations**: monitors and alerts, logs, common failures and fixes, how to pause workers or a bot.
8. **Security notes**: auth model, roles, RLS approach, known risks and accepted trade-offs.
9. **Open issues and next steps.**
10. **Access checklist**: which accounts/dashboards a new maintainer needs (roles, not passwords).

Then list anything you couldn't find in the code and needs Aakash to fill in.
