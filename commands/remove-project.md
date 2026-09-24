---
description: Remove a project from the ASEN system - unregister it, remove its git identity rule, and disable the plugin there, after Aakash's OK. Private notes are kept unless Aakash asks to delete them.
argument-hint: <project id>
disable-model-invocation: true
---

# /remove-project

Project id: `$ARGUMENTS`. Tools: `REG=node "${CLAUDE_PLUGIN_ROOT}/scripts/asen-project.mjs"`.

1. Show the current profile (from `registry/projects.json` in the private repo) and what will change: the folder goes back to the global git identity, the plugin is disabled there, and routines/scheduled audits stop for it. **Wait for an explicit OK.**
2. `$REG remove <id>`; in the private repo `git add -A && git commit -m "registry: remove <id>" && git push`.
3. `$REG sync` (removes this folder's identity rule).
4. In the project folder: `claude plugin uninstall asen-engineering@asen --scope <plugin_scope>`.
5. For personal/client projects, refresh the blocklist secret (same command as in `/add-project` step 8). Removed names stay blocked if they are also in `registry/blocklist-extra.txt`; ask Aakash whether to add them there.
6. Ask whether to keep or delete the project's private notes folder (default: keep). Deleting needs a second explicit OK.
7. Prove it: `$REG whoami "<folder>"` shows "NOT REGISTERED" and the global identity.
