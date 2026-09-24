#!/usr/bin/env node
// PreToolUse (Write|Edit|MultiEdit|NotebookEdit). Read-only: blocks writes to .env files and content that looks like a secret.
// Exit 0 = allow, exit 2 = block with a reason. Unreadable input is allowed (never blocks normal work on a hook error).

import path from "node:path";

const ALLOWED_ENV_FILES = /^\.env\.(example|sample|template|defaults)$/i;

const SECRET_PATTERNS = [
  ["private key block", /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/],
  ["AWS access key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/],
  ["Anthropic API key", /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ["OpenAI-style API key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/],
  ["Supabase secret key", /\bsb_secret_[A-Za-z0-9_-]{20,}/],
  ["Stripe live key", /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}/],
  ["Slack token", /\bxox[abposr]-[A-Za-z0-9-]{10,}/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Meta access token", /\bEAA[A-Za-z0-9]{80,}/],
  ["Resend API key", /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/],
  ["JWT with service_role", /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*c2VydmljZV9yb2xl[A-Za-z0-9_-]*\.[A-Za-z0-9_-]{10,}/],
  ["hard-coded credential", /\b(?:secret|password|passwd|api[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key|client[_-]?secret|key[_-]?secret)\b["']?\s*[:=]\s*["'](?![^"']*(?:your|example|changeme|placeholder|xxx|\*\*\*|<|\$\{|process\.env|import\.meta\.env))[^"'\s]{12,}["']/i],
];

function contentOf(tool, input) {
  if (tool === "Write") return input.content || "";
  if (tool === "Edit") return input.new_string || "";
  if (tool === "MultiEdit") return (input.edits || []).map((e) => e.new_string || "").join("\n");
  if (tool === "NotebookEdit") return input.new_source || "";
  return "";
}

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
let data;
try { data = JSON.parse(raw); } catch { process.exit(0); }

const tool = data.tool_name;
const input = data.tool_input || {};
const file = String(input.file_path || input.notebook_path || "");
const base = path.basename(file.replace(/\\/g, "/"));

if (/^\.env(\..+)?$/i.test(base) && !ALLOWED_ENV_FILES.test(base)) {
  process.stderr.write(`ASEN secret guard: writing to "${base}" is blocked. Real .env files hold secrets and are set by a human. ` +
    "Put placeholder names in .env.example instead.\n");
  process.exit(2);
}

const text = contentOf(tool, input);
for (const [name, re] of SECRET_PATTERNS) {
  if (re.test(text)) {
    process.stderr.write(`ASEN secret guard: the new content looks like a ${name}. Secrets never go in code. ` +
      "Read it from an environment variable, and put only the variable name in .env.example.\n");
    process.exit(2);
  }
}
process.exit(0);
