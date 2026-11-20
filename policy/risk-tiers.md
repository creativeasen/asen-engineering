# Risk tiers and Rule 0

This file decides what the AI may change on its own and what needs Aakash. **Any change to this file is HIGH risk.**

## Rule 0: project isolation (highest priority, never break)

Version 2 (2026-09-24, approved by Aakash): the system can serve ASEN, personal, and client projects, but only through the private **project registry** (`asen-engineering-private/registry/projects.json`).

1. **Opt-in only.** Nothing happens in a project that isn't in the registry with Aakash's approval for that specific project. Before approval, nothing inside it is read or changed, including its git and gh settings.
2. **One account per project.** Each project uses only the GitHub account listed for it, and writes only to the repos listed for it. The identity guard enforces this before every push or GitHub write.
3. **Automation levels.** Each project's level (`off`, `rules-only`, `audit-readonly`, `issues`, `prs`) caps what the AI may do there. New client projects start at `rules-only` unless Aakash chooses higher. Nothing ever merges without the repo's own checks.
   **Exception (Aakash, 2026-11-20): auto-save.** Aakash's own user-level auto-save hook on his PC (`C:\Backup-System\autosave-worker.ps1`, not part of this plugin) may commit and push his work in every registered project after every Claude Code response, whatever the automation level: only after a gitleaks scan (a hit = nothing committed + a warning), only with that project's registered account, never changing file contents, never opening PRs or issues. In `asen-engineering`, `asen-engineering-private` and `asen-radar` it only pushes snapshots to the `autosave/pc` branch, never to `main`. Closed client projects are excluded (list in the private config).
4. **No mixing.** Information never crosses between projects or clients. Private notes live in separate folders per owner in the private repo (`asen/`, `personal/<id>/`, `clients/<name>/`).
5. **Public repo stays generic.** No client names, personal project details, emails, tokens, or private repo names ever appear in `asen-engineering`. CI enforces this with a blocklist generated from the registry and stored as a GitHub secret.
6. **Cloud routines are for ASEN projects only.** Client and personal projects are audited only by scheduled jobs on Aakash's PC (read-only, reports kept private), unless a client agrees in writing to more.
7. **The global default GitHub account is `creativeasen`** (changed once by Aakash on 2026-11-20; the previous default belonged to a client project that has closed). It changes again only through a HIGH-risk PR. The AI never runs `gh auth switch/login/logout/setup-git`.
8. **Plugin scope.** ASEN projects enable the plugin in the committed `.claude/settings.json`; client and personal projects use the uncommitted `.claude/settings.local.json`, so nothing is ever committed into their repos. Never user-wide; the plugin never writes `~/.claude/CLAUDE.md`. **Exception (Aakash, 2026-11-20):** that file is Aakash's own (docs-after-every-task rule, new-project steps) and may exist; it never weakens Rule 0.
9. **Hooks are read-only checks.** The plugin's hooks never modify files by themselves. **Exception (Aakash, 2026-11-20):** the user-level auto-save Stop hook from item 3 may create commits and push; it never edits file contents.

Changing Rule 0 or the registry rules in any way is always **HIGH** risk.

## Tiers

### LOW: auto-merge after CI passes

- Knowledge and version updates in `knowledge/stack.md`, `knowledge/models.md`, `knowledge/security-watchlist.md`, each confirmed on an official source with URL and date.
- New general lessons in `knowledge/lessons.md`.
- New checks or checklist items that only make things **stricter**.
- Docs and typo fixes (`README.md`, `CHANGELOG.md`, `digests/`), with no change in meaning to any rule.

### MEDIUM: auto-merge only after the knowledge-verifier approves and CI passes

- Changes to skills (`skills/`), commands (`commands/`), and agents (`agents/`), **except** the knowledge-verifier.
- Changes to routine instructions (`routines/`).
- Changes to templates (`templates/`), including template CI files.
- Changes to model recommendations in `knowledge/models.md` (which model for which task).

### HIGH: needs Aakash's manual approval

- Removing or weakening any security rule, check, or checklist item (anywhere).
- Any change to Rule 0.
- Changes to hooks or any code that executes: `hooks/`, `scripts/`, `bin/`, `.claude-plugin/`, `.claude/`, any `*.js`, `*.mjs`, `*.ts`, `*.py`, `*.sh`, `*.ps1` file outside `templates/`.
- Changes to `policy/`, `agents/knowledge-verifier.md`, `knowledge/sources.md`, `.github/` (workflows, CODEOWNERS, settings), `core/CLAUDE.md`, and the repo rules in `.claude/CLAUDE.md`.
- Permission or tool-access changes (agent `tools`, skill `allowed-tools`, settings, repo access).
- Major version upgrades with breaking changes.
- Anything the knowledge-verifier is unsure about.

**If a PR mixes tiers, the highest tier wins.**

## High-risk paths (checked by the `risk-gate` workflow)

```text
policy/**
core/CLAUDE.md
.claude/CLAUDE.md
hooks/**
scripts/**
bin/**
.claude-plugin/**
.claude/**
.github/**
agents/knowledge-verifier.md
knowledge/sources.md
**/*.js  **/*.mjs  **/*.cjs  **/*.ts  **/*.py  **/*.sh  **/*.ps1   (outside templates/)
```

## Who is who

| Account | Used by | Can |
| --- | --- | --- |
| `creativeasen` | **Aakash only** (human) | Approve HIGH-risk PRs with a real GitHub review on his phone; admin settings. Never used by AI or routines. |
| `asenbot` | AI and automation only (routines, local AI sessions) | Open branches, PRs, issues, and labels. Can never approve or merge a HIGH-risk PR. |

HIGH-risk PRs merge only after `creativeasen` approves the latest commit. GitHub enforces this twice: the `main` ruleset requires a Code Owner review (`.github/CODEOWNERS`) for high-risk paths, and the `risk-gate` status requires the approval for any PR whose tier is high.

## Labels

| Label | Meaning | Who sets it |
| --- | --- | --- |
| `tier:low` / `tier:medium` / `tier:high` | Risk tier | The PR author (routine), corrected by the PR Verifier and `risk-gate` (path-based) |
| `ai-verified` | The knowledge-verifier checked every claim and approved | PR Verifier routine only |
| `needs-aakash` | HIGH risk: waiting for Aakash | PR Verifier or `risk-gate` |
| `external` | Opened by someone outside ASEN; never auto-merged | `risk-gate` |
