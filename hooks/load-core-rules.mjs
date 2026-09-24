#!/usr/bin/env node
// SessionStart: print core/CLAUDE.md plus THIS project's registry profile, so Claude Code adds them to context.
// Only the current project's entry is printed, never other projects or clients. Read-only; never blocks a session.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findProject, loadRegistry } from "./lib/registry.mjs";

const root = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
let cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
try { cwd = JSON.parse(raw).cwd || cwd; } catch { /* keep default */ }

let out = "";
try { out += readFileSync(path.join(root, "core", "CLAUDE.md"), "utf8"); } catch { /* missing rules never block */ }

const project = findProject(loadRegistry({ committed: true }), cwd);
if (project) {
  const notes = project.owner === "asen" ? "asen/" : project.owner === "personal" ? `personal/${project.id}/` : `clients/${project.owner.slice(7)}/`;
  out += `
## This project (from the ASEN project registry)

- Project: ${project.name} (id \`${project.id}\`), type ${project.type}
- Owner: ${project.owner}
- GitHub account: \`${project.github_account}\`. Use \`pgh\` for gh commands; git is already set to this account.
- Repos this project may write to: ${project.repos.map((r) => `\`${r}\``).join(", ") || "none"}
- Automation level: ${project.automation}
- Private notes and lessons for this project go to \`asen-engineering-private/${notes}\` only.
${project.owner === "asen" ? "" : "- This is not an ASEN project: never use, mention, or copy information from any other project or client, and never put anything from it in the public repo.\n"}`;
} else {
  out += `
## This folder is NOT in the ASEN project registry

GitHub writes are blocked here. Don't read or change git/gh settings. If Aakash wants this project managed, run \`/add-project\`.
`;
}
process.stdout.write(out);
