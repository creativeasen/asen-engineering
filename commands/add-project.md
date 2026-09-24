---
description: Onboard any project (ASEN, personal, or client) into the ASEN system in one step - propose a profile, get Aakash's OK, then register it, set its GitHub identity, enable the plugin, and prove the identity. Nothing inside the project is read before the OK.
argument-hint: <folder path>
disable-model-invocation: true
---

# /add-project

Folder: `$ARGUMENTS` (if empty, ask for the full folder path).

Tools: `REG=node "${CLAUDE_PLUGIN_ROOT}/scripts/asen-project.mjs"`. The private repo is `%USERPROFILE%\Documents\AI_WORK\ASEN\asen-engineering-private`.

## 1. Propose (read nothing inside the folder yet)

- Only check that the folder exists and isn't already registered (`$REG lookup "<folder>"` must say "not registered").
- Ask Aakash, in one AskUserQuestion call:
  - **Owner**: `asen`, `personal`, or `client`. For a client, ask for a short client name (lowercase, hyphens) → owner `client-<name>`.
  - **GitHub account**:
    - ASEN → `creativeasen` (default).
    - Personal → **ask which account** (list the accounts shown by `gh auth status`; never change the active one).
    - Client → ask which account (usually the client account already used for that project).
  - **Project type**: website, saas-webapp, ecommerce-shopify, mobile-app, automation-n8n, python-bot, or other.
  - **Automation level**: `off`, `rules-only`, `audit-readonly`, `issues`, `prs`. **Default for clients: `rules-only`** unless Aakash picks higher. For personal: `rules-only` default. For ASEN: `rules-only` default; suggest `audit-readonly` if it should be in the weekly audit.
  - **Commit identity**: ASEN → `noreply` (commits as the account's GitHub noreply email). Personal/client → `keep-current` (commits exactly as today) unless Aakash chooses `noreply`.
- Show the proposed profile as a short table, plus exactly what will change:
  - a git identity rule for this folder only (generated file `~/.gitconfig-asen-profiles`)
  - the plugin enabled in `.claude/settings.json` (ASEN, committed) or `.claude/settings.local.json` (personal/client, **never committed**; git ignores it globally)
  - a notes folder in the private repo
- **Wait for an explicit OK.** If Aakash says no, stop; nothing was changed.

## 2. After the OK

1. **Read the remote now** (allowed after approval): `git -C "<folder>" remote -v`. Put the GitHub `owner/repo` values in `repos`. If there is no remote, `repos` is empty (pushes stay blocked until one is added).
2. **Check the account can reach each repo** (read-only): `GH_TOKEN=$(gh auth token --user <account>) gh api repos/<owner>/<repo> --jq .permissions`. If the account isn't logged in to gh, stop and tell Aakash (a login window is needed; never switch the active account).
3. **Before-proof**: `$REG whoami "<folder>"` (shows current author and push account).
4. For `noreply` with an account not yet in `accounts`, get its numeric id: `GH_TOKEN=$(gh auth token --user <account>) gh api user --jq .id`, and add it to `accounts` in the registry file.
5. **Register**: `$REG add '<json>'` with `id, name, path, owner, github_account, repos, type, automation, commit_identity` (the tool fills `plugin_scope` and `approved`). Then in the private repo: create the notes folder (`asen/`, `personal/<id>/`, or `clients/<name>/` with a README if new), `git add -A && git commit -m "registry: add <id>" && git push`.
6. **Apply identity**: `$REG sync`.
7. **Enable the plugin** inside the folder, at the profile's `plugin_scope` (`project` for ASEN, `local` for everything else):
   `cd "<folder>" && claude plugin marketplace add creativeasen/asen-engineering --scope <scope> && claude plugin install asen-engineering@asen --scope <scope>`
   For `project` scope, leave `.claude/settings.json` for Aakash to commit (say so).
8. **Blocklist** (personal and client projects only): refresh the public repo's safety list so this project's names can never be published:
   `cd "%USERPROFILE%\Documents\AI_WORK\ASEN\asen-engineering" && $REG blocklist | pgh secret set PUBLIC_BLOCKLIST --repo creativeasen/asen-engineering`
9. **After-proof**: `$REG whoami "<folder>"`. The push account and gh account must equal the profile's account; for `noreply`, the author email must be the noreply email.

## 3. Report (simple words)

Before vs after identity, the automation level and what it allows, where notes go, and how to undo (`/remove-project <id>`).

Never print tokens. Never put client or personal names in the public repo.
