#!/usr/bin/env node
// PreToolUse (Bash|PowerShell). Read-only: before `git commit`, scan staged changes with gitleaks.
// Blocks (exit 2) only when gitleaks finds a leak. If gitleaks isn't installed or errors, the commit proceeds.

import { spawnSync } from "node:child_process";
import path from "node:path";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
let data;
try { data = JSON.parse(raw); } catch { process.exit(0); }

const command = data?.tool_input?.command;
if (typeof command !== "string") process.exit(0);
const m = /\bgit(?:\.exe)?(?:\s+-C\s+("[^"]+"|'[^']+'|\S+))?(?:\s+-c\s+\S+|\s+--[\w-]+(?:=\S+)?)*\s+commit\b/.exec(command);
if (!m) process.exit(0);

const cwd = data.cwd || process.cwd();
const dir = m[1] ? path.resolve(cwd, m[1].replace(/^["']|["']$/g, "")) : cwd;

// Commits with -a/--all stage tracked files at commit time; scan the working-tree diff too in that case.
const commitsAll = /\scommit\b[^;&|\n]*\s(-a|--all|-[a-zA-Z]*a[a-zA-Z]*)\b/.test(command);
const args = ["git", "--pre-commit", "--redact", "--no-banner", "--exit-code", "3", "--log-level", "warn"];
if (!commitsAll) args.push("--staged");
args.push(dir);

const res = spawnSync("gitleaks", args, { cwd: dir, encoding: "utf8", timeout: 50000, windowsHide: true });
if (res.error || res.status === null) process.exit(0); // gitleaks missing or timed out: don't block normal work
if (res.status === 3) {
  const out = `${res.stdout || ""}${res.stderr || ""}`.split("\n").slice(0, 40).join("\n");
  process.stderr.write(`ASEN gitleaks: possible secret in the changes being committed (values redacted):\n${out}\n` +
    "Remove the secret, rotate it if it was real, and use an environment variable instead.\n");
  process.exit(2);
}
process.exit(0);
