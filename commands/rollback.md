---
description: Roll back a merged change to asen-engineering by opening a revert PR as the automation account. The revert goes through the same checks; reverting a HIGH-risk change needs Aakash's approval.
argument-hint: <PR number>
disable-model-invocation: true
---

# /rollback

PR to roll back: `$ARGUMENTS` (if empty, list the last 10 `merge-*` tags with their PR titles and ask which one).

Work in `%USERPROFILE%\Documents\AI_WORK\ASEN\asen-engineering` (git and `pgh` act as the registered automation account).

1. Find the merge commit: `git fetch --tags origin && git rev-list -n 1 merge-<N>`. If the tag doesn't exist, stop and say so.
2. Show Aakash, in 3 lines: what PR #N changed, what the revert will undo, and its risk tier (from the files it touches). Continue only after OK.
3. `git switch main && git pull`, then `git switch -c rollback/pr-<N>` and `git revert --no-edit <merge-sha>`. If the revert conflicts, stop and explain; don't force anything.
4. `git push -u origin rollback/pr-<N>`, then open the PR:
   `pgh pr create --title "rollback: revert #<N>" --body "Reverts #<N> (<title>). Reason: <reason>." --label tier:<tier>`
   (Use the tier of the original PR; the risk gate raises it if the files require more.)
5. Tell Aakash the PR link. LOW/MEDIUM reverts still need the PR Verifier's `ai-verified`; HIGH reverts need his **Approve** on the phone.

Never push to `main` directly and never force-push.
