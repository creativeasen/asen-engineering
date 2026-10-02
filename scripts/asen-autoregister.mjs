#!/usr/bin/env node
// ASEN auto-register (runs hourly from Windows Task Scheduler and, throttled, at the start of registered sessions).
//   node scripts/asen-autoregister.mjs scan           find new project folders and register / ask
//   node scripts/asen-autoregister.mjs install-task   create the hourly Windows scheduled task
// Rules (Aakash, 2026-10-01):
//   - New project folders under AI_WORK\ASEN (not the clients folder, not the numbered business folders) are registered
//     automatically at automation "rules-only" (ASEN rules + knowledge digest; account asenbot; no automation).
//   - New client (inside ASEN's numbered clients folder) or personal (AI_WORK\* outside ASEN) folders: ONE yes/no question, as a GitHub
//     issue in the private repo (phone notification). "yes" → rules-only with the git identity unchanged; "no" → never again.
//   - Folders that existed when this was set up are a baseline and are never asked about.
// State and the registry live in the private repo. Nothing here reads a project's files beyond "is this a project?".

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, appendFileSync, rmSync, statSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findProject, loadRegistry, registryFile } from "../hooks/lib/registry.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REG_TOOL = path.join(HERE, "asen-project.mjs");
const PRIVATE = path.dirname(path.dirname(registryFile()));
const ASEN = path.dirname(PRIVATE);
const AI_WORK = path.dirname(ASEN);
const STATE = path.join(PRIVATE, "registry", "autoregister-state.json");
const PRIVATE_REPO = "creativeasen/asen-engineering-private";
const HUMAN = "creativeasen";
const LOG_DIR = path.join(os.homedir(), ".asen");
const LOCK = path.join(LOG_DIR, "autoregister.lock");

mkdirSync(LOG_DIR, { recursive: true });
const log = (m) => appendFileSync(path.join(LOG_DIR, "autoregister.log"), `${new Date().toISOString()} ${m}\n`);
const rel = (p) => path.relative(AI_WORK, p).split(path.sep).join("/");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "project";
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", windowsHide: true, stdio: ["pipe", "pipe", "pipe"], ...opts }).trim();
const token = (user) => run("gh", ["auth", "token", "--user", user]);
async function gh(method, url, body, user = "asenbot") {
  const res = await fetch(`https://api.github.com/${url}`, {
    method, headers: { authorization: `Bearer ${token(user)}`, accept: "application/vnd.github+json", "user-agent": "asen-autoregister", ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url}: HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
}

const isProject = (d) => [".git", "package.json", "pyproject.toml", "requirements.txt"].some((m) => existsSync(path.join(d, m)));
const subdirs = (d) => { try { return readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => path.join(d, e.name)); } catch { return []; } };

function candidates() {
  const out = [];
  for (const d of subdirs(ASEN)) {
    const name = path.basename(d);
    if (/^\d+_clients$/i.test(name)) { for (const c of subdirs(d)) if (isProject(c)) out.push({ dir: c, kind: "client" }); continue; }
    if (/^\d+_/.test(name)) continue; // 0_Admin, 1_Leads, 3_Templates: business folders, not projects
    if (isProject(d)) out.push({ dir: d, kind: "asen" });
  }
  for (const d of subdirs(AI_WORK)) if (d !== ASEN && isProject(d)) out.push({ dir: d, kind: "personal" });
  return out;
}

function remotes(dir) {
  try {
    return [...new Set(run("git", ["-C", dir, "remote", "-v"]).split("\n").map((l) => /github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?\s/.exec(l)?.[1]).filter(Boolean))];
  } catch { return []; }
}
function commitPrivate(message) {
  run("git", ["-C", PRIVATE, "add", "-A", "registry"]);
  try { run("git", ["-C", PRIVATE, "diff", "--cached", "--quiet"]); return; } catch { /* has changes */ }
  run("git", ["-C", PRIVATE, "commit", "-q", "-m", message]);
  run("git", ["-C", PRIVATE, "pull", "--rebase", "-q"]);
  run("git", ["-C", PRIVATE, "push", "-q"]);
}
function uniqueId(base) {
  const reg = loadRegistry({ committed: false });
  let id = slug(base); let n = 2;
  while (reg.projects.some((p) => p.id === id)) id = `${slug(base)}-${n++}`;
  return id;
}
function enablePlugin(dir, scope) {
  spawnSync(`claude plugin install asen-engineering@asen --scope ${scope === "project" ? "project" : "local"}`, { cwd: dir, windowsHide: true, shell: true, stdio: "ignore", timeout: 120000 });
  const f = path.join(dir, ".claude", scope === "project" ? "settings.json" : "settings.local.json");
  try {
    mkdirSync(path.dirname(f), { recursive: true });
    const s = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {};
    s.extraKnownMarketplaces = { ...(s.extraKnownMarketplaces || {}), asen: { source: { source: "github", repo: "creativeasen/asen-engineering" }, autoUpdate: true } };
    s.enabledPlugins = { ...(s.enabledPlugins || {}), "asen-engineering@asen": true };
    writeFileSync(f, `${JSON.stringify(s, null, 2)}\n`);
  } catch (e) { log(`plugin settings for ${rel(dir)} failed: ${e.message}`); }
}
function register({ dir, kind }) {
  const reg = loadRegistry({ committed: false });
  const name = path.basename(dir);
  const entry = kind === "asen"
    ? { id: uniqueId(name), name, path: dir.split(path.sep).join("/"), owner: "asen", github_account: "asenbot", repos: remotes(dir), type: "other", automation: "rules-only", commit_identity: "noreply" }
    : { id: uniqueId(name), name, path: dir.split(path.sep).join("/"), owner: kind === "client" ? `client-${slug(name)}` : "personal", github_account: reg.default_gh_account, repos: remotes(dir), type: "other", automation: "rules-only", commit_identity: "keep-current", plugin_scope: "local" };
  run("node", [REG_TOOL, "add", JSON.stringify(entry)]);
  run("node", [REG_TOOL, "validate"]);
  commitPrivate(`registry: auto-register ${entry.id} (${kind}, rules-only)`);
  run("node", [REG_TOOL, "sync"]);
  enablePlugin(dir, kind === "asen" ? "project" : "local");
  if (kind !== "asen") {
    // Keep this name out of the public repo: refresh the public-safety blocklist (needs the repo admin, creativeasen).
    const words = run("node", [REG_TOOL, "blocklist"]);
    spawnSync("gh", ["secret", "set", "PUBLIC_BLOCKLIST", "--repo", "creativeasen/asen-engineering"], { input: words, env: { ...process.env, GH_TOKEN: token(HUMAN) }, windowsHide: true });
  }
  log(`registered ${rel(dir)} as ${entry.id} (${kind}, rules-only)`);
  return entry.id;
}

async function scan() {
  if (existsSync(LOCK) && Date.now() - statSync(LOCK).mtimeMs < 15 * 60e3) return log("scan skipped: another scan is running");
  writeFileSync(LOCK, String(process.pid));
  try {
    try { run("git", ["-C", PRIVATE, "pull", "--ff-only", "-q"]); } catch { /* offline: use local copy */ }
    const reg = loadRegistry({ committed: false });
    const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : null;
    const found = candidates().filter((c) => !findProject(reg, c.dir));

    if (!state) { // first run: everything that exists today is the baseline
      const folders = Object.fromEntries(found.map((c) => [rel(c.dir), { kind: c.kind, decision: "baseline", at: new Date().toISOString() }]));
      writeFileSync(STATE, `${JSON.stringify({ note: "Auto-register state (scripts/asen-autoregister.mjs). baseline = existed at setup, never asked.", baseline_at: new Date().toISOString(), folders }, null, 2)}\n`);
      commitPrivate(`registry: auto-register baseline (${found.length} existing folders, never asked)`);
      return log(`baseline written: ${found.length} folders`);
    }

    let changed = false;
    for (const c of found) {
      const key = rel(c.dir);
      const s = state.folders[key];
      if (!s) {
        if (c.kind === "asen") {
          state.folders[key] = { kind: c.kind, decision: "registered", id: register(c), at: new Date().toISOString() };
        } else {
          const issue = await gh("POST", `repos/${PRIVATE_REPO}/issues`, {
            title: `Register ${key} with ASEN rules? (yes/no)`,
            assignees: [HUMAN],
            body: `@${HUMAN} A new ${c.kind} folder appeared: \`${key}\`.\n\nReply **yes** to give it the ASEN rules and the knowledge digest (automation \`rules-only\`: your git identity and GitHub account stay exactly as they are, nothing is uploaded, no routine touches it).\nReply **no** and you will never be asked about this folder again.\n\n_Asked once by the ASEN auto-register scan._`,
          });
          state.folders[key] = { kind: c.kind, decision: "asked", issue: issue.number, at: new Date().toISOString() };
          log(`asked about ${key} (issue #${issue.number})`);
        }
        changed = true;
      } else if (s.decision === "asked") {
        const comments = await gh("GET", `repos/${PRIVATE_REPO}/issues/${s.issue}/comments?per_page=50`);
        const answer = comments.find((m) => m.user?.login === HUMAN && /^\s*(yes|y|no|n)\b/i.test(m.body || ""));
        const issue = await gh("GET", `repos/${PRIVATE_REPO}/issues/${s.issue}`);
        if (answer || issue.state === "closed") {
          const yes = answer && /^\s*y(es)?\b/i.test(answer.body);
          if (yes) { s.id = register(c); s.decision = "yes"; } else s.decision = "no";
          s.answered_at = new Date().toISOString();
          await gh("POST", `repos/${PRIVATE_REPO}/issues/${s.issue}/comments`, { body: yes ? `Done: registered as \`${s.id}\` (rules-only, identity unchanged).` : "OK: this folder will never be registered or asked about again." }).catch(() => {});
          await gh("PATCH", `repos/${PRIVATE_REPO}/issues/${s.issue}`, { state: "closed" }).catch(() => {});
          changed = true;
        }
      }
    }
    if (changed) { writeFileSync(STATE, `${JSON.stringify(state, null, 2)}\n`); commitPrivate("registry: auto-register state"); }
  } catch (e) {
    log(`scan failed: ${e.message}`);
    process.exitCode = 1;
  } finally {
    rmSync(LOCK, { force: true });
  }
}

function installTask() {
  const cmdFile = path.join(LOG_DIR, "autoregister.cmd");
  // Same hourly task also runs the Project Brain collector (facts only, no Claude; catches up after the PC was off).
  const scripts = path.join(path.dirname(path.dirname(REG_TOOL)), "scripts");
  writeFileSync(cmdFile, `@echo off\r\ncd /d "${PRIVATE}"\r\n"${process.execPath}" "${path.join(scripts, "asen-autoregister.mjs")}" scan\r\n"${process.execPath}" "${path.join(scripts, "asen-brain.mjs")}" collect\r\n`);
  const r = spawnSync("schtasks", ["/Create", "/F", "/SC", "HOURLY", "/TN", "ASEN auto-register", "/TR", `"${cmdFile}"`], { encoding: "utf8", windowsHide: true });
  console.log(r.status === 0 ? `Scheduled task "ASEN auto-register" created (hourly) -> ${cmdFile}` : `schtasks failed: ${r.stderr || r.stdout}`);
}

const cmd = process.argv[2];
if (cmd === "scan") await scan();
else if (cmd === "install-task") installTask();
else { console.log("usage: asen-autoregister.mjs scan | install-task"); process.exitCode = 1; }
