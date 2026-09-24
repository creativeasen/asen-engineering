# Risk tiers and Rule 0

This file decides what the AI may change on its own and what needs Aakash. **Any change to this file is HIGH risk.**

## Rule 0: project isolation (highest priority, never break)

Version 2 (2026-09-24, approved by Aakash): the system can serve ASEN, personal, and client projects, but only through the private **project registry** (`asen-engineering-private/registry/projects.json`).

1. **Opt-in only.** Nothing happens in a project that isn't in the registry with Aakash's approval for that specific project. Before approval, nothing inside it is read or changed, including its git and gh settings.
2. **One account per project.** Each project uses only the GitHub account listed for it, and writes only to the repos listed for it. The identity guard enforces this before every push or GitHub write.
3. **Automation levels.** Each project's level (`off`, `rules-only`, `audit-readonly`, `issues`, `prs`) caps what the AI may do there. New client projects start at `rules-only` unless Aakash chooses higher. Nothing ever merges without the repo's own checks.
4. **No mixing.** Information never crosses between projects or clients. Private notes live in separate folders per owner in the private repo (`asen/`, `personal/<id>/`, `clients/<name>/`).
5. **Public repo stays generic.** No client names, personal project details, emails, tokens, or private repo names ever appear in `asen-engineering`. CI enforces this with a blocklist generated from the registry and stored as a GitHub secret.
6. **Cloud routines are for ASEN projects only.** Client and personal projects are audited only by scheduled jobs on Aakash's PC (read-only, reports kept private), unless a client agrees in writing to more.
7. **The global default GitHub account never changes.** No `gh auth switch/login/logout/setup-git`.
8. **Plugin scope.** ASEN projects enable the plugin in the committed `.claude/settings.json`; client and personal projects use the uncommitted `.claude/settings.local.json`, so nothing is ever committed into their repos. Never user-wide; `~/.claude/CLAUDE.md` is never touched.
9. **Hooks are read-only checks.** They never modify files by themselves.

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

```
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

## Labels

| Label | Meaning | Who sets it |
| --- | --- | --- |
| `tier:low` / `tier:medium` / `tier:high` | Risk tier | The PR author (routine), corrected by the PR Verifier and `risk-gate` (path-based) |
| `ai-verified` | The knowledge-verifier checked every claim and approved | PR Verifier routine only |
| `needs-aakash` | HIGH risk: waiting for Aakash | PR Verifier or `risk-gate` |
| `aakash-approved` | Aakash approved a HIGH-risk PR | **Only Aakash, by hand on GitHub** (see README) |
| `external` | Opened by someone outside ASEN; never auto-merged | `risk-gate` |
