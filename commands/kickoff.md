---
description: Start a new ASEN project at professional level - register it, create the folder and GitHub repo under the right account, copy the template, write the project CLAUDE.md, and plan the first milestone.
argument-hint: <project-name> <type: website|saas-webapp|ecommerce-shopify|mobile-app|automation-n8n|python-bot>
disable-model-invocation: true
---

# /kickoff: start a new project

Arguments: `$ARGUMENTS` (project name and type). If either is missing, ask for it (one question).
Tools: `REG=node "${CLAUDE_PLUGIN_ROOT}/scripts/asen-project.mjs"`.

1. **Owner and place.** Ask (one AskUserQuestion) whether this is an ASEN, personal, or client project. Default folder: `%USERPROFILE%\Documents\AI_WORK\ASEN\asen-<name>` for ASEN projects; ask for the folder otherwise. If the folder already exists, stop and suggest `/add-project` instead.
2. **Brief.** Ask Aakash at most 5 short questions: who uses it, the one main job it does, what data it stores (personal data? payments? messages?), deadline, budget limits (AI, messaging).
3. **Register first** (so identity is right from the first commit). Follow `/add-project` steps 1 and 2 with these defaults: ASEN → account `creativeasen`, `commit_identity: noreply`; client → `rules-only` automation; personal → ask which account. Put the new repo (`<account>/<name>`) in `repos` before it exists. Get Aakash's OK on the profile.
4. **Scaffold.** Create the folder, copy `${CLAUDE_PLUGIN_ROOT}/templates/<type>/` into it including hidden files (`.github/`, `.gitignore`, `.env.example`), fill in the project name. Don't create a real `.env`.
5. **Identity + plugin.** `$REG sync`, then enable the plugin at the profile's scope (see `/add-project` step 7).
6. **Git + GitHub.** `git init -b main`, first commit, then `pgh repo create <account>/<name> --private --source . --push`. Prove it with `$REG whoami "<folder>"`.
7. **Plan.** Load the matching skill for the type plus `security-core` and each integration skill that applies. Write `docs/PLAN.md` with: goal, users, data map (for DPDP), architecture sketch, threat model ("how could this be abused?"), first milestone split into small tasks, and what needs Aakash's decision.
8. **Report** in simple words: what was created, the repo link, the identity proof, the plan summary, and the next step.
