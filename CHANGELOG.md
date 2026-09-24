# Changelog

All notable changes to ASEN Engineering. Each merged PR is also tagged (`merge-<PR number>`), so any version can be restored.

## 0.2.0 (2026-09-24)

- **Project Profiles** (Rule 0 version 2, approved by Aakash): the system can serve ASEN, personal, and client projects through a private project registry. Each project is opt-in, uses only its registered GitHub account and repos, and has an automation level (`off`, `rules-only`, `audit-readonly`, `issues`, `prs`).
- New commands `/add-project` and `/remove-project`; new `pgh` helper; registry tool `scripts/asen-project.mjs`.
- Identity guard now checks the registry (account, repos, automation level) and ignores uncommitted registry edits.
- Session start now also shows the current project's profile (only that project).
- README: note that Claude Code sends code to Anthropic for processing, so client contracts must allow AI-assisted development.

## 0.1.0 (2026-09-24)

- First version: core rules, 13 skills, 4 reviewer agents, 7 commands, read-only safety hooks (identity guard, secret guard, gitleaks before commit, typecheck/lint after edits), 6 project templates, knowledge files verified on official sources, risk policy, and routine instructions.
