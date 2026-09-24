# General lessons

Short, general lessons learned while building. **No client names, project names, people, or private data here** (this repo is public). Lessons that mention a specific project go in the private repo, in that project's owner folder.

Add a lesson with `/lesson`. The Weekly Upgrade routine turns lessons that repeat into rules, skill checklist items, or CI checks.

Format: `- YYYY-MM-DD | area | lesson (one or two sentences) | seen N times`

## Lessons

- 2026-09-24 | tooling | Plugins don't load a `CLAUDE.md` from the plugin folder; ship always-on rules through a SessionStart hook or a skill. | seen 1 time
- 2026-09-24 | identity | When one machine uses two GitHub accounts, scope the second account by folder (git `includeIf`) and borrow its token per command, instead of switching the global account. | seen 1 time
- 2026-09-24 | windows | Node scripts on Windows can crash when they call `process.exit()` right after a `fetch`; set `process.exitCode` and let the script end. | seen 1 time
