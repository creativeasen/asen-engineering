#!/usr/bin/env node
// ASEN knowledge cross-check (PreToolUse Bash + PostToolUse Write|Edit). Never blocks; only adds context for Claude.
// - Before a package install (npm/pnpm/yarn/bun add|install <pkg>, pip/uv/poetry add|install <pkg>):
//   tells Claude what ASEN knows about each package (outdated major, advisories, deprecations, radar status).
// - After an edit to package.json / requirements.txt / pyproject.toml: reports problems in the project's dependencies.
// Runs only in registered projects. Silent when there is nothing to say.

import path from "node:path";
import { findProject, loadRegistry } from "./lib/registry.mjs";
import { loadKnowledge, packageFindings, projectStack, stackRow } from "./lib/knowledge.mjs";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
let input;
try { input = JSON.parse(raw); } catch { process.exit(0); }
const cwd = input.cwd || process.cwd();
const project = findProject(loadRegistry({ committed: true }), cwd);
if (!project || project.automation === "off") process.exit(0);

const event = input.hook_event_name;
let pkgs = {};
let label = "";

if (event === "PreToolUse") {
  const command = String(input.tool_input?.command || "");
  const re = /\b(?:npm|pnpm|yarn|bun)\s+(?:i|install|add)\b([^;&|\n]*)|\b(?:pip3?|uv\s+pip)\s+install\b([^;&|\n]*)|\b(?:uv|poetry)\s+add\b([^;&|\n]*)/g;
  for (const m of command.matchAll(re)) {
    for (const tok of (m[1] || m[2] || m[3] || "").trim().split(/\s+/)) {
      if (!tok || tok.startsWith("-") || tok.startsWith(".") || tok.includes("/") && !tok.startsWith("@")) continue;
      const clean = tok.replace(/^["']|["']$/g, "");
      const py = clean.match(/^([A-Za-z0-9_.-]+)\s*(?:==|>=|~=)\s*(.+)$/);
      if (py) { pkgs[py[1].toLowerCase()] = py[2]; continue; }
      const at = clean.lastIndexOf("@");
      if (at > 0) pkgs[clean.slice(0, at).toLowerCase()] = clean.slice(at + 1); else pkgs[clean.toLowerCase()] = "";
    }
  }
  label = `Package install: ${Object.keys(pkgs).join(", ")}`;
} else if (event === "PostToolUse") {
  const file = String(input.tool_input?.file_path || "");
  if (!/(^|[\\/])(package\.json|requirements\.txt|pyproject\.toml)$/.test(file)) process.exit(0);
  const ps = projectStack(path.dirname(file));
  pkgs = { ...ps.npm, ...ps.py };
  label = `Dependencies in ${path.basename(file)}`;
}
if (!Object.keys(pkgs).length) process.exit(0);

const k = loadKnowledge();
const findings = packageFindings(k, pkgs, { install: event === "PreToolUse" });
const unknown = Object.keys(pkgs).filter((n) => event === "PreToolUse" && !stackRow(k.stack, n));
if (!findings.length && !unknown.length) process.exit(0);

let ctx = `ASEN knowledge cross-check (${label}):\n${findings.map((f) => `- ${f}`).join("\n")}`;
if (unknown.length) ctx += `\n- Not in ASEN knowledge: ${unknown.join(", ")}. Confirm each exists on the official registry, is maintained and widely used before relying on it.`;
ctx += "\nApply the safer/current choice if it is LOW/MEDIUM risk and tell Aakash in one line what you changed and why; propose major upgrades instead of forcing them.";
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: ctx.slice(0, 3000) } }));
