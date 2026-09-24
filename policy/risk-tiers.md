# Risk tiers and Rule 0

This file decides what the AI may change on its own and what needs Aakash. **Any change to this file is HIGH risk.**

## Rule 0: strict client separation (highest priority, never break)

1. The ASEN system never creates, edits, pushes, comments on, or opens issues/PRs in any client repo or client GitHub account.
2. It never reads, modifies, or changes git or gh settings for any folder whose name does not start with `asen-`. Personal and client projects stay exactly as they are.
3. All client projects are off-limits: their folders, files, git config, remotes, and credentials.
4. Everything the system does happens in `Documents\AI_WORK\ASEN\asen-*` folders using the `creativeasen` identity.
5. Routines get access only to `asen-engineering`, `asen-engineering-private`, and ASEN-owned repos Aakash lists in the private `projects.md`.
6. The plugin is installed at project scope in ASEN repos only, never user-wide. The user-level `~/.claude/CLAUDE.md` is never touched.
7. Hooks are read-only checks. They never modify files by themselves.
8. Before any GitHub action (repo creation, push, PR, issue, settings change) the identity must be `creativeasen`. If not, stop and tell Aakash.

Changing Rule 0 in any way is always **HIGH** risk.

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
- Changes to hooks or any code that executes: `hooks/`, `scripts/`, `.claude-plugin/`, `.claude/`, any `*.js`, `*.mjs`, `*.ts`, `*.py`, `*.sh`, `*.ps1` file outside `templates/`.
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
