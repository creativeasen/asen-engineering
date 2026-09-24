---
description: Save a lesson learned. General lessons go to the public asen-engineering repo (via a small PR as creativeasen); lessons naming a project or client go to the private repo.
argument-hint: <what we learned>
disable-model-invocation: true
---

# /lesson

Lesson: `$ARGUMENTS` (if empty, ask Aakash for one sentence).

1. **Rewrite** it as one or two plain sentences: what happened in general terms, and what to do next time.
2. **Classify**:
   - **General** (no client, project, person, email, domain, or private detail) → public repo.
   - **Specific** (mentions a project, client, account, or private detail) → private repo. If it also has a general version, save both.
3. **Public (general)**, in `%USERPROFILE%\Documents\AI_WORK\ASEN\asen-engineering`:
   - `git switch main && git pull`, then `git switch -c lesson/<yyyy-mm-dd>-<short-name>`.
   - If a matching lesson already exists in `knowledge/lessons.md`, increase its "seen N times" instead of adding a duplicate. Otherwise append:
     `- YYYY-MM-DD | area | lesson | seen 1 time`
   - Commit, push, then open a PR as creativeasen:
     `GH_TOKEN=$(gh auth token --user creativeasen) gh pr create --title "lesson: <short>" --body "<why>" --label tier:low`
4. **Private (specific)**, in `%USERPROFILE%\Documents\AI_WORK\ASEN\asen-engineering-private`: append to `private-lessons.md` in the same format with the project name, commit, and push.
5. Tell Aakash where it was saved, with the PR link if one was made.
