# Changelog

All notable changes to ASEN Engineering. Each merged PR is also tagged (`merge-<PR number>`), so any version can be restored.

## 0.5.0 (2026-10-02)

- **Project Brain**: one shared, always-updated memory of every project. `scripts/asen-brain.mjs collect` runs hourly with the auto-register task (facts only, no Claude): new commits, changed files, dependency changes, the project's own README/CLAUDE.md/progress/TODO notes, new TODOs; credentials are redacted. Facts, summaries, plans and an overview live in the private repo, inside each owner's folder.
- The **session digest** now includes the project's brain summary (goal, recent work, open problems, radar ideas) and asks Claude to refresh the summary when the facts are newer.
- Unregistered project folders are **never read**: they are listed for one yes/no question (sent by the radar email); "no" is permanent.

## 0.4.0 (2026-10-01)

- **Knowledge flows into every session automatically.** At session start (registered projects only) the plugin fast-forwards the local `asen-engineering`, `asen-radar` and private clones (bounded, silent), then adds a small **ASEN knowledge digest** for this project's own stack: outdated or deprecated packages, deadlines and advisories, radar stack status (Keep / Watch / Switch), best right now, and the default Claude model.
- **Cross-check**: new `stack-crosscheck` skill and `scripts/asen-knowledge.mjs check <name>`; a hook adds context on package installs and dependency-file edits. Claude applies LOW/MEDIUM improvements and reports them in one line.
- **Auto-update**: the `asen` marketplace is set to `autoUpdate`; a throttled background update also runs at session start.
- **Auto-register**: `scripts/asen-autoregister.mjs` (hourly task + session start) registers new ASEN folders at `rules-only`, and asks once (GitHub issue, phone notification) for new client/personal folders.
- HIGH-risk PRs request a review from `creativeasen` so the approval request reaches the phone.

## 0.3.0 (2026-09-25)

- Safety rails: `main` ruleset (PR required, required checks, Code Owner review for high-risk paths, no force-push or deletion, no bypass for admins).
- CI: `repo-ci` (JSON/YAML, scripts, knowledge sources and dates, plugin validate, markdown lint, link check), `public-safety` (gitleaks + no emails + blocklist from a secret), `risk-gate` (tier from paths and labels, `external` label, `ai-verified` for LOW/MEDIUM, human approval for HIGH), `auto-merge` (merges and tags `merge-<PR>`).
- Two accounts: `creativeasen` (human, approves) and `asenbot` (automation). New `/rollback` command. Identity guard blocks AI merges and approvals.

## 0.2.0 (2026-09-24)

- **Project Profiles** (Rule 0 version 2, approved by Aakash): the system can serve ASEN, personal, and client projects through a private project registry. Each project is opt-in, uses only its registered GitHub account and repos, and has an automation level (`off`, `rules-only`, `audit-readonly`, `issues`, `prs`).
- New commands `/add-project` and `/remove-project`; new `pgh` helper; registry tool `scripts/asen-project.mjs`.
- Identity guard now checks the registry (account, repos, automation level) and ignores uncommitted registry edits.
- Session start now also shows the current project's profile (only that project).
- README: note that Claude Code sends code to Anthropic for processing, so client contracts must allow AI-assisted development.

## 0.1.0 (2026-09-24)

- First version: core rules, 13 skills, 4 reviewer agents, 7 commands, read-only safety hooks (identity guard, secret guard, gitleaks before commit, typecheck/lint after edits), 6 project templates, knowledge files verified on official sources, risk policy, and routine instructions.
