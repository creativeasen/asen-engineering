# ASEN Engineering

A self-updating engineering system for ASEN Agency. Every ASEN project starts at a professional level and stays there: AI follows the same security rules, checklists, and reviewers on every project, and the system keeps itself up to date with the latest security news, tool versions, and Claude models. AI decides almost everything; Aakash approves only high-risk changes.

## What it does

- **Rules for every session**: core rules (`core/CLAUDE.md`) plus the current project's profile load automatically in every registered project.
- **Skills**: detailed checklists per project type (website, SaaS, Shopify, mobile, n8n, AI features, Python bots) and per integration (Supabase, WhatsApp, Razorpay, Vercel/Railway, DPDP).
- **Reviewers**: `security-reviewer`, `architect-reviewer`, `qa-tester`, and `knowledge-verifier` agents.
- **Commands**: `/kickoff`, `/add-project`, `/remove-project`, `/rollback`, `/plan-feature`, `/audit`, `/prelaunch`, `/handover`, `/incident`, `/lesson`.
- **Safety hooks** (read-only, never change files): identity guard, secret guard, gitleaks scan before commits, typecheck/lint after edits.
- **Templates**: each project type gets CI (typecheck, lint, tests, gitleaks, dependency audit, Claude security review), `.gitignore`, `.env.example`, `SECURITY.md`, and a PR template.
- **Knowledge**: `knowledge/` holds versions, deadlines, and model advice. Every fact has an official source link and a "verified" date.
- **Cloud routines** (they run even when the PC is off): Daily Scout, Weekly Upgrade, PR Verifier, and Weekly Project Audit.

## Rule 0: project isolation

The full rules are in [`policy/risk-tiers.md`](policy/risk-tiers.md). In short:

- The system works for ASEN, personal, and client projects, but **only projects you add with `/add-project`**. Nothing else is read or changed.
- Each project uses **only its own GitHub account and repos**, and the AI only does what that project's automation level allows.
- Information never crosses between projects or clients, and nothing about clients or personal projects ever appears in this public repo.
- The global default GitHub account on your PC never changes.
- Changing Rule 0 is always HIGH risk.

## Project Profiles: which project uses which account

A private list, `registry/projects.json` in `asen-engineering-private`, holds one entry per project: folder, owner (`asen`, `personal`, or `client-<name>`), GitHub account, allowed repos, project type, and automation level.

| Automation level | What the AI may do |
| --- | --- |
| `off` | Nothing. Listed only. |
| `rules-only` | Rules, skills, and read-only safety checks while you work in it. **Default for new client projects.** |
| `audit-readonly` | Plus scheduled audits; reports stay private. |
| `issues` | Plus it may open issues in that project's own repo. |
| `prs` | Plus it may open PRs there. It never merges. |

How it works:

- **Commits and pushes**: for each registered project, git gets a rule for that folder only (generated into `~/.gitconfig-asen-profiles`). It pushes with that project's account token, which is fetched from the Windows keyring at the moment of pushing and never written to a file. ASEN projects commit with the account's GitHub noreply email; client and personal projects keep their current commit identity unless you choose otherwise.
- **gh commands**: `pgh <command>` runs gh as the current project's account for that one command. (Long form: `GH_TOKEN=$(gh auth token --user <account>) gh <command>`.) Your global default account never changes.
- **Identity guard**: before every `git push` or gh write, a read-only check looks the folder up in the registry and blocks the command unless it uses exactly that project's account, targets one of its repos, and fits its automation level. Unregistered folders are blocked. It reads the registry as committed, so an unsaved edit can't widen access.
- **Client and personal projects** enable the plugin in `.claude/settings.local.json`, which is never committed. Nothing ASEN-related lands in their repos.

## Add any project with /add-project

```text
/add-project C:\Users\...\Documents\AI_WORK\my-project
```

Claude proposes a profile (owner, GitHub account, type, automation level) **before reading anything in the project** and waits for your OK. Then it registers the project, sets its identity, enables the plugin, and shows a before/after proof of which account commits and pushes. For personal projects it always asks which GitHub account to use. Undo with `/remove-project <id>`.

## AI processing and client contracts

Any Claude Code work, **even on your own PC**, sends the code and files it reads to Anthropic for processing. Before using this system on a client project, make sure that client's contract allows AI-assisted development (and, if needed, name Anthropic as a processor). Keep a note of that permission in the client's private folder.

## Client and personal projects: audits on your PC

Cloud routines run only for ASEN projects. Client and personal projects at `audit-readonly` or higher are audited by a scheduled read-only job on your PC (it runs when the PC is on) and the report is saved only in that owner's private folder. Cloud access for a client repo is used only if that client agrees in writing.

## Enable the plugin by hand (normally `/add-project` does this)

Open a terminal in the project folder and run, for an ASEN project:

```text
claude plugin marketplace add creativeasen/asen-engineering --scope project && claude plugin install asen-engineering@asen --scope project
```

For a client or personal project, use `--scope local` in both places. This affects that one folder only.

## Start a project with /kickoff

Open Claude Code in any registered ASEN folder (for example `Documents\AI_WORK\ASEN\asen-engineering`) and type:

```text
/kickoff whatsapp-crm saas-webapp
```

Claude asks up to 5 short questions, registers the project, creates `ASEN\asen-whatsapp-crm`, copies the template, creates a private GitHub repo under the right account, and writes a plan (including the threat model and DPDP data map) for your OK.

## Add a lesson with /lesson

When something goes wrong or you learn something, type:

```text
/lesson Webhook retries created duplicate orders because we didn't dedupe on the event ID
```

General lessons go to `knowledge/lessons.md` in this repo through a small PR (after a blocklist check). Lessons that name a project go only to that project's owner folder in the private repo. Lessons that repeat get turned into rules or checks by the Weekly Upgrade routine.

## Approve a HIGH-risk PR from your phone

AI and routines work as the machine account **`asenbot`**; you are **`creativeasen`**. GitHub only lets a *different* person approve a PR, so a HIGH-risk change can only merge after **you** approve it.

1. GitHub mobile app (signed in as **creativeasen**) → **Notifications** → open the PR labeled **needs-aakash**.
2. Read the PR Verifier's comment: *what you're deciding* + *AI recommendation*.
3. To approve: **Files changed** → **Review changes** → **Approve** → **Submit**. The `risk-gate` check re-runs and the PR merges once all checks pass.
4. To reject: **Review changes** → **Request changes** (or close the PR).

If new commits are pushed after you approve, your approval no longer counts and you'll be asked again.

## Read the weekly digest

Every Sunday a new file appears in [`digests/`](digests/) named `YYYY-WW.md`. Open it on GitHub (web or mobile). Read the **Needs Aakash** section first; the rest explains what changed and what deadlines are coming.

## Pause or resume routines

Open [claude.ai/code/routines](https://claude.ai/code/routines), select a routine, and switch it **off** (pause) or **on** (resume). Nothing else changes; the instructions stay in `routines/`.

## Roll back a bad update

Every merge to `main` is tagged `merge-<PR number>`.

- **One step:** in any Claude Code session in an ASEN folder (or on claude.ai/code on your phone), type `/rollback <PR number>`. Claude (as asenbot) opens a revert PR; it goes through the same checks, and a revert of a HIGH-risk change needs your approval like any HIGH change.
- **Pin a project to a known-good version** while you investigate:
  `claude plugin marketplace add creativeasen/asen-engineering@merge-<PR number> --scope project`

## Where things live

| Path | What |
| --- | --- |
| `.claude-plugin/` | Plugin manifest and marketplace file |
| `core/CLAUDE.md` | Core rules loaded in every ASEN session |
| `skills/`, `agents/`, `commands/` | Skills, reviewer agents, slash commands |
| `hooks/` | Read-only safety hooks |
| `scripts/asen-project.mjs`, `bin/pgh` | Project registry tool and the per-project gh helper |
| `templates/` | Starter files per project type |
| `knowledge/` | Stack versions, watchlist, models, lessons, trusted sources |
| `policy/risk-tiers.md` | Rule 0 and risk tiers |
| `routines/` | Instructions for the cloud routines |
| `digests/` | Weekly summaries |
