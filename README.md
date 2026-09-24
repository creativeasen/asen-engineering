# ASEN Engineering

A self-updating engineering system for ASEN Agency. Every ASEN project starts at a professional level and stays there: AI follows the same security rules, checklists, and reviewers on every project, and the system keeps itself up to date with the latest security news, tool versions, and Claude models. AI decides almost everything; Aakash approves only high-risk changes.

## What it does

- **Rules for every session**: core rules (`core/CLAUDE.md`) load automatically in ASEN projects.
- **Skills**: detailed checklists per project type (website, SaaS, Shopify, mobile, n8n, AI features, Python bots) and per integration (Supabase, WhatsApp, Razorpay, Vercel/Railway, DPDP).
- **Reviewers**: `security-reviewer`, `architect-reviewer`, `qa-tester`, and `knowledge-verifier` agents.
- **Commands**: `/kickoff`, `/plan-feature`, `/audit`, `/prelaunch`, `/handover`, `/incident`, `/lesson`.
- **Safety hooks** (read-only, never change files): identity guard, secret guard, gitleaks scan before commits, typecheck/lint after edits.
- **Templates**: each project type gets CI (typecheck, lint, tests, gitleaks, dependency audit, Claude security review), `.gitignore`, `.env.example`, `SECURITY.md`, and a PR template.
- **Knowledge**: `knowledge/` holds versions, deadlines, and model advice. Every fact has an official source link and a "verified" date.
- **Cloud routines** (they run even when the PC is off): Daily Scout, Weekly Upgrade, PR Verifier, and Weekly Project Audit.

## Rule 0: client separation

The full rules are in [`policy/risk-tiers.md`](policy/risk-tiers.md). In short:

- The system never touches client repos, client GitHub accounts, or any folder whose name doesn't start with `asen-`.
- All of its GitHub work runs as `creativeasen` on `creativeasen` repos.
- The plugin is enabled per ASEN project only, never for the whole computer.
- Changing Rule 0 is always HIGH risk.

## Two identities: which folder uses which account

| Where | Commits as | Pushes as | gh |
| --- | --- | --- | --- |
| `Documents\AI_WORK\ASEN\asen-*` folders | `creativeasen` (GitHub noreply email) | `creativeasen` | borrow the creativeasen token per command |
| Everywhere else (client and personal projects) | unchanged | unchanged | the existing default account stays active |

**Naming rule:** a new ASEN code project lives directly in `Documents\AI_WORK\ASEN\` and its folder name starts with `asen-` (for example `asen-whatsapp-platform`). Only those folders switch to creativeasen.

How it works:

- **Commits**: git's `includeIf` adds a small extra settings file (`~/.gitconfig-asen`) only in `ASEN\asen-*` folders. It sets the name `creativeasen` and the GitHub noreply email.
- **Pushes**: the same file makes git ask gh for creativeasen's token at the moment of pushing. The token stays in the Windows keyring and is never written to a file.
- **gh commands**: in ASEN work, each gh command borrows the creativeasen token for that one command, so the global default never changes:
  - Bash: `GH_TOKEN=$(gh auth token --user creativeasen) gh <command>`
  - PowerShell: `$env:GH_TOKEN = (gh auth token --user creativeasen); gh <command>`
- **Identity guard**: before every shell command in an ASEN Claude session, a read-only check blocks `git push` and gh write commands unless they run as creativeasen, from an `asen-*` folder, against a creativeasen repo. It also blocks `gh auth switch/login/logout`.

## Enable the plugin in a new ASEN project

Open a terminal in the project folder (e.g. `Documents\AI_WORK\ASEN\asen-myproject`) and run:

```
claude plugin marketplace add creativeasen/asen-engineering --scope project && claude plugin install asen-engineering@asen --scope project
```

This writes the setting into that project's `.claude/settings.json` only. Other folders are not affected.

## Start a project with /kickoff

Open Claude Code in `Documents\AI_WORK\ASEN\` (or any ASEN folder) and type:

```
/kickoff whatsapp-crm saas-webapp
```

Claude asks up to 5 short questions, creates `ASEN\asen-whatsapp-crm`, copies the template, creates a private GitHub repo as creativeasen, and writes a plan (including the threat model and DPDP data map) for your OK.

## Add a lesson with /lesson

When something goes wrong or you learn something, type:

```
/lesson Webhook retries created duplicate orders because we didn't dedupe on the event ID
```

General lessons go to `knowledge/lessons.md` in this repo through a small PR. Lessons that name a project go to the private repo. Lessons that repeat get turned into rules or checks by the Weekly Upgrade routine.

## Approve a HIGH-risk PR from your phone

1. GitHub mobile app → **Notifications** (or this repo → **Pull requests**) → open the PR labeled **needs-aakash**.
2. Read the PR Verifier's comment: *what you're deciding* + *AI recommendation*.
3. To approve: tap **Labels** → add **`aakash-approved`**. The `risk-gate` check re-runs, and the PR merges once all checks pass.
4. To reject: close the PR (optionally comment why).

If new commits are pushed after you approve, the approval no longer counts and you'll be asked again.

## Read the weekly digest

Every Sunday a new file appears in [`digests/`](digests/) named `YYYY-WW.md`. Open it on GitHub (web or mobile). Read the **Needs Aakash** section first; the rest explains what changed and what deadlines are coming.

## Pause or resume routines

Open [claude.ai/code/routines](https://claude.ai/code/routines), select a routine, and switch it **off** (pause) or **on** (resume). Nothing else changes; the instructions stay in `routines/`.

## Roll back a bad update

Every merge to `main` is tagged `merge-<PR number>`.

- **One step:** open the bad PR on GitHub → **Revert**. GitHub creates a revert PR; it goes through the same checks (a revert of a HIGH-risk change needs your `aakash-approved` label).
- **Pin a project to a known-good version** while you investigate:
  `claude plugin marketplace add creativeasen/asen-engineering@merge-<PR number> --scope project`

## Where things live

| Path | What |
| --- | --- |
| `.claude-plugin/` | Plugin manifest and marketplace file |
| `core/CLAUDE.md` | Core rules loaded in every ASEN session |
| `skills/`, `agents/`, `commands/` | Skills, reviewer agents, slash commands |
| `hooks/` | Read-only safety hooks |
| `templates/` | Starter files per project type |
| `knowledge/` | Stack versions, watchlist, models, lessons, trusted sources |
| `policy/risk-tiers.md` | Rule 0 and risk tiers |
| `routines/` | Instructions for the cloud routines |
| `digests/` | Weekly summaries |
