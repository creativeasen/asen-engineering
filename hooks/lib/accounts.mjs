// Account check for a registered project (read-only; never prints tokens).
// Compares the GitHub accounts that git, gh and claude.ai's GitHub connection would use with the registry entry.
// The result is saved in ~/.asen/account-check/<project-id>.json: the SessionStart hook warns at the top of the session,
// and the identity guard blocks pushes and gh writes while the latest check for that project failed.
//
// claude.ai's connection can't be read locally: the asen-radar watchdog checks it every day (who pushed the cloud
// routines' commits, and whether the routines could clone all 3 system repos) and writes raw/claude-connection.json,
// which reaches this PC through the auto-synced asen-radar clone. It only applies to ASEN projects (cloud routines are ASEN-only).

import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { noreplyEmail } from "./registry.mjs";

const STATE_DIR = path.join(os.homedir(), ".asen", "account-check");
const CLAUDE_ACCOUNT = "asenbot";
const CONNECTION_MAX_AGE_DAYS = 3;

function run(cmd, args, { cwd, input } = {}) {
  return new Promise((resolve) => {
    const child = execFile(cmd, args, {
      cwd, timeout: 10000, windowsHide: true, encoding: "utf8",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
    }, (err, stdout) => resolve(err ? "" : String(stdout).trim()));
    if (input) child.stdin.end(input);
  });
}

async function tokenLogin(token) {
  if (!token) return null;
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "asen-account-check" }, signal: AbortSignal.timeout(8000),
    });
    return res.ok ? (await res.json()).login : null;
  } catch { return null; }
}

function claudeConnection(radarDir) {
  let s;
  try { s = JSON.parse(readFileSync(path.join(radarDir, "raw", "claude-connection.json"), "utf8")); } catch { return { known: false }; }
  const ageDays = (Date.now() - Date.parse(s.checked_at)) / 864e5;
  return { known: true, ok: s.ok === true, account: s.account || null, reason: s.reason || "", fix: s.fix || "", stale: !(ageDays <= CONNECTION_MAX_AGE_DAYS), checked_at: s.checked_at };
}

// Returns { project, ok, problems: [..], notes: [..], git, gh, claude, checked_at } and saves it.
export async function checkAccounts(dir, project, registry, { radarDir } = {}) {
  const expected = project.github_account;
  const problems = [];
  const notes = [];

  const fill = await run("git", ["-C", dir, "credential", "fill"], { input: "protocol=https\nhost=github.com\n\n" });
  const [gitLogin, ghLogin, email] = await Promise.all([
    tokenLogin((/^password=(.*)$/m.exec(fill) || [])[1]),
    run("gh", ["auth", "token", "--user", expected]).then(tokenLogin),
    run("git", ["-C", dir, "config", "user.email"]),
  ]);
  const same = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();
  if (!same(gitLogin, expected)) problems.push(`git push would log in as "${gitLogin || "unknown"}", registry says ${expected}.`);
  if (!same(ghLogin, expected)) problems.push(`gh token for ${expected} resolves to "${ghLogin || "nothing"}" (pgh would fail).`);
  if (project.commit_identity === "noreply") {
    const want = noreplyEmail(registry, expected);
    if (!same(email, want)) problems.push(`commit email is "${email || "unset"}", registry expects ${expected}'s noreply email.`);
  }

  let claude = null;
  if (project.owner === "asen" && radarDir) {
    claude = claudeConnection(radarDir);
    if (claude.known && !claude.ok) problems.push(`claude.ai GitHub connection: ${claude.reason} Fix: ${claude.fix}`);
    else if (!claude.known) notes.push("claude.ai connection not checked yet (the radar watchdog writes it daily).");
    else if (claude.stale) notes.push(`claude.ai connection last confirmed ${claude.checked_at.slice(0, 10)} (older than ${CONNECTION_MAX_AGE_DAYS} days).`);
  }

  const result = {
    project: project.id, expected, ok: problems.length === 0, problems, notes,
    git: gitLogin, gh: ghLogin, commit_email: email, claude: claude?.known ? (claude.ok ? CLAUDE_ACCOUNT : "WRONG") : "unknown",
    checked_at: new Date().toISOString(),
  };
  try {
    mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(path.join(STATE_DIR, `${project.id}.json`), `${JSON.stringify(result, null, 1)}\n`);
  } catch { /* state is best-effort; live checks in the guard still run */ }
  return result;
}

export function lastCheck(projectId) {
  try { return JSON.parse(readFileSync(path.join(STATE_DIR, `${projectId}.json`), "utf8")); } catch { return null; }
}

export function formatCheck(r) {
  if (r.ok) {
    return `**Account check: OK.** git ${r.git}, gh ${r.gh}, claude.ai ${r.claude} = registry (${r.expected}).${r.notes.length ? ` Note: ${r.notes.join(" ")}` : ""}\n`;
  }
  return [
    "# ⚠️ ASEN ACCOUNT CHECK FAILED: pushes and GitHub writes are BLOCKED in this project",
    "",
    "Tell Aakash this first, in one short message, before doing anything else:",
    ...r.problems.map((p) => `- ${p}`),
    "",
    "After the fix, re-check with: `node <asen-engineering>/scripts/asen-project.mjs check-accounts .` (or start a new session).",
    "",
  ].join("\n");
}
