# asen-engineering (repo rules)

This repo is the ASEN Engineering system (a Claude Code plugin + marketplace). It is **PUBLIC**: never write secrets, tokens, email addresses, client names, project names, or private details here. Private material goes in `asen-engineering-private`.

Rule 0 and the risk tiers are in `policy/risk-tiers.md`. Read them before changing anything.

## GitHub identity

- `git` in `ASEN\asen-*` folders commits and pushes as `creativeasen` automatically (git `includeIf`). Never add `-c` overrides or `GIT_*` identity variables.
- Run every `gh` command with the creativeasen token from the keyring, per command:
  - Bash: `GH_TOKEN=$(gh auth token --user creativeasen) gh <command>`
  - PowerShell: `$env:GH_TOKEN = (gh auth token --user creativeasen); gh <command>`
- Never run `gh auth switch`, `gh auth login`, `gh auth logout`, or `gh auth setup-git`: the global default account must not change.
- Never write a token to a file, log, or commit.
- The identity guard (`hooks/identity-guard.mjs`) blocks pushes and gh writes that break these rules. If it blocks you, stop and tell Aakash.

## Working in this repo

- `main` is protected: every change goes through a PR with the right `tier:*` label.
- Never add the `aakash-approved` label. Only Aakash adds it, by hand.
- Knowledge rows need an official source URL (from `knowledge/sources.md`) and a `Verified` date.
- Keep `core/CLAUDE.md` under ~150 lines; details belong in skills.
- Follow the current official Claude Code docs for plugin, skill, agent, command, and hook formats.
