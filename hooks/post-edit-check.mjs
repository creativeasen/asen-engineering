#!/usr/bin/env node
// PostToolUse (Write|Edit|MultiEdit), runs in the background (asyncRewake). Read-only checks:
// the project's own typecheck and lint scripts (never --fix/--write), or `ruff check` for Python.
// Exit 2 wakes Claude with the errors. Missing tools or scripts mean "nothing to check", never a block.

import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";

const DEBOUNCE_MS = 20000;
const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte|py)$/i;

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
let data;
try { data = JSON.parse(raw); } catch { process.exit(0); }

const file = String(data?.tool_input?.file_path || "");
if (!CODE_FILE.test(file)) process.exit(0);

// Nearest folder (walking up from the edited file, stopping at the project root) that has one of `names`.
function findUp(start, names, stopAt) {
  let dir = path.dirname(start);
  for (;;) {
    for (const n of names) if (existsSync(path.join(dir, n))) return { dir, name: n };
    const parent = path.dirname(dir);
    if (parent === dir || (stopAt && path.resolve(dir) === path.resolve(stopAt))) return null;
    dir = parent;
  }
}

const stopAt = process.env.CLAUDE_PROJECT_DIR || data.cwd;
const found = findUp(file, ["package.json", "pyproject.toml"], stopAt);
if (!found) process.exit(0);

// Debounce: many edits in a row trigger one check per project, not one per edit.
const stamp = path.join(os.tmpdir(), `asen-check-${createHash("sha1").update(found.dir).digest("hex").slice(0, 12)}`);
try { if (Date.now() - statSync(stamp).mtimeMs < DEBOUNCE_MS) process.exit(0); } catch { /* first run */ }
try { writeFileSync(stamp, String(Date.now())); } catch { /* temp dir not writable: still run */ }

const run = (cmd) => spawnSync(cmd, { cwd: found.dir, shell: true, encoding: "utf8", timeout: 150000, windowsHide: true });
const failures = [];

if (found.name === "package.json") {
  let scripts = {};
  try { scripts = JSON.parse(readFileSync(path.join(found.dir, "package.json"), "utf8")).scripts || {}; } catch { process.exit(0); }
  for (const name of ["typecheck", "lint"]) {
    const script = scripts[name];
    if (!script || /--fix|--write|--apply/.test(script)) continue; // only read-only scripts
    const res = run(`npm run ${name} --silent`);
    if (res.error || res.status === null) continue;
    if (res.status !== 0) failures.push(`npm run ${name}:\n${`${res.stdout}${res.stderr}`.trim().split("\n").slice(-30).join("\n")}`);
  }
} else {
  const res = run("ruff check --quiet .");
  if (!res.error && res.status !== null && res.status !== 0 && !/not (recognized|found)/i.test(res.stderr || "")) {
    failures.push(`ruff check:\n${`${res.stdout}${res.stderr}`.trim().split("\n").slice(-30).join("\n")}`);
  }
}

if (failures.length) {
  process.stderr.write(`ASEN post-edit check found problems in ${found.dir}:\n\n${failures.join("\n\n")}\n`);
  process.exit(2);
}
process.exit(0);
