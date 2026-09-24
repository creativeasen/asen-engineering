---
description: Start a new ASEN project at professional level - pick the project type, create the folder and repo as creativeasen, copy the template, write the project CLAUDE.md, and plan the first milestone.
argument-hint: <project-name> <type: website|saas-webapp|ecommerce-shopify|mobile-app|automation-n8n|python-bot>
disable-model-invocation: true
---

# /kickoff: start a new ASEN project

Arguments: `$ARGUMENTS` (project name and type). If either is missing, ask for it (one question).

1. **Name and place.** The folder must be `%USERPROFILE%\Documents\AI_WORK\ASEN\asen-<name>` (the `asen-` prefix makes git and gh use creativeasen automatically). If it exists, stop and ask.
2. **Brief.** Ask Aakash at most 5 short questions: who uses it, the one main job it does, what data it stores (personal data? payments? messages?), deadline, budget limits (AI, messaging).
3. **Scaffold.** Copy `${CLAUDE_PLUGIN_ROOT}/templates/<type>/` into the new folder, including hidden files (`.github/`, `.gitignore`, `.env.example`). Fill in the project name. Don't create a real `.env`.
4. **Enable the plugin at project scope** in the new folder:
   `claude plugin install asen-engineering@asen --scope project`
   (If the marketplace isn't known yet: `claude plugin marketplace add creativeasen/asen-engineering --scope project` first.)
5. **Git + GitHub as creativeasen.** `git init -b main`, first commit, then
   `GH_TOKEN=$(gh auth token --user creativeasen) gh repo create creativeasen/asen-<name> --private --source . --push`.
   Confirm with `git log -1 --format='%an <%ae>'` that the author is creativeasen.
6. **Plan.** Load the matching skill for the type plus `security-core` and each integration skill that applies. Write `docs/PLAN.md` with: goal, users, data map (for DPDP), architecture sketch, threat model ("how could this be abused?"), first milestone split into small tasks, and what needs Aakash's decision.
7. **Report** in simple words: what was created, the repo link, the plan summary, and the next step.

Never touch folders that don't start with `asen-`. Never use a client GitHub account.
