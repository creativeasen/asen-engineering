#!/usr/bin/env node
// ASEN Project Brain collector (hourly with the auto-register task; free: no Claude, no network except git push).
//   node scripts/asen-brain.mjs collect    facts for every brain project → facts.json, OVERVIEW.md, index.json, consent list
//   node scripts/asen-brain.mjs status     print the overview
// Which projects (Rule 0 + scope rule, Aakash 2026-10-02):
//   - registered projects: always (read-only).
//   - unregistered project folders: NEVER read. They get status "ask" in registry/brain-consent.json; the radar mailer sends
//     ONE yes/no email listing them; Aakash's answers come back through the radar repo (mail/decisions/brain.json).
//     yes → read-only facts like a registered project; no → excluded forever.
// Facts only: new commits, changed files, dependency changes, the project's own README/CLAUDE.md/progress/TODO notes, new TODOs.
// Claude writes the readable brain.md only when the facts changed (daily radar run, or a session that opens the project).

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, appendFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { loadRegistry, registryFile } from "../hooks/lib/registry.mjs";
import { brainDir, readBrain } from "../hooks/lib/brain.mjs";
import { projectStack } from "../hooks/lib/knowledge.mjs";

const PRIVATE = path.dirname(path.dirname(registryFile()));
const ASEN = path.dirname(PRIVATE);
const AI_WORK = path.dirname(ASEN);
const RADAR = path.join(ASEN, "asen-radar");
const CONSENT = path.join(PRIVATE, "registry", "brain-consent.json");
const AUTOREG = path.join(PRIVATE, "registry", "autoregister-state.json");
const LOG_DIR = path.join(os.homedir(), ".asen");
const LOCK = path.join(LOG_DIR, "brain.lock");
const DOCS = /^(readme|claude|agents|progress|setup-progress|todo|notes|changelog|roadmap|status)(\.[a-z]+)?\.md$/i;

mkdirSync(LOG_DIR, { recursive: true });
const log = (m) => appendFileSync(path.join(LOG_DIR, "brain.log"), `${new Date().toISOString()} ${m}\n`);
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"], timeout: 30000, maxBuffer: 8 << 20, ...opts }).trim();
const tryRun = (cmd, args, opts) => { try { return run(cmd, args, opts); } catch { return ""; } };
const readJSON = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
const writeJSON = (p, v) => { mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, `${JSON.stringify(v, null, 1)}\n`); };
const rel = (p) => path.relative(AI_WORK, p).split(path.sep).join("/");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "project";
const opaque = (relPath) => createHash("sha256").update(`brain:${relPath}`).digest("hex").slice(0, 12);
const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const nowIso = () => new Date().toISOString();
// Never copy a credential out of a project's notes, commit messages or TODOs.
const redact = (t) => String(t)
  .replace(/\b(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|EAA[A-Za-z0-9]{30,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|xox[abp]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,}|rzp_(?:live|test)_[A-Za-z0-9]{10,})\b/g, "[redacted]")
  .replace(/((?:api[_-]?key|secret|token|password|passwd|auth)["']?\s*[:=]\s*["']?)[^\s"'`]{8,}/gi, "$1[redacted]");

// ---------- which projects ----------
function brainProjects(consent) {
  const reg = loadRegistry({ committed: false });
  const out = reg.projects.filter((p) => p.path && existsSync(p.path)).map((p) => ({ id: p.id, name: p.name || p.id, owner: p.owner, path: p.path, source: "registry", cloud_ok: p.owner === "asen" || p.owner === "personal" }));
  for (const [oid, c] of Object.entries(consent.projects)) {
    if (c.status !== "yes") continue;
    const dir = path.join(AI_WORK, c.rel);
    if (!existsSync(dir) || out.some((p) => path.resolve(p.path) === path.resolve(dir))) continue;
    out.push({ id: c.id || slug(c.name), name: c.name, owner: c.kind === "client" ? `client-${slug(c.name)}` : "personal", path: dir, source: "consent", consent_id: oid, cloud_ok: c.kind !== "client" });
  }
  return out;
}

// Unregistered folders the auto-register scan found (names only, never opened) → "ask"; apply email answers.
function updateConsent(consent) {
  let changed = false;
  const reg = loadRegistry({ committed: false });
  const registered = new Set(reg.projects.map((p) => path.resolve(p.path || "")));
  const folders = readJSON(AUTOREG, { folders: {} }).folders || {};
  for (const [relPath, f] of Object.entries(folders)) {
    if (registered.has(path.resolve(path.join(AI_WORK, relPath)))) continue;
    if (f.decision === "registered" || f.decision === "yes") continue;
    const oid = opaque(relPath);
    if (!consent.projects[oid]) {
      consent.projects[oid] = { name: path.basename(relPath), kind: f.kind === "client" ? "client" : "personal", rel: relPath, status: "ask", since: nowIso() };
      changed = true;
    }
  }
  const decisions = readJSON(path.join(RADAR, "mail", "decisions", "brain.json"), {});
  for (const [oid, d] of Object.entries(decisions)) {
    const c = consent.projects[oid];
    if (!c || c.status === "yes" || c.status === "no") continue; // a decision is final
    c.status = d.answer === "yes" ? "yes" : "no";
    c.decided_at = d.at || nowIso();
    if (c.status === "yes") c.id = slug(c.name);
    log(`consent: ${c.name} → ${c.status}`);
    changed = true;
  }
  return changed;
}

// ---------- facts (read-only) ----------
function listFilesNewer(dir, sinceMs, max = 40) {
  const out = [];
  const walk = (d, depth) => {
    if (depth > 4 || out.length >= max) return;
    let entries = [];
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith(".") || ["node_modules", "dist", "build", "coverage", "__pycache__", "venv", ".venv"].includes(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else { try { if (statSync(p).mtimeMs > sinceMs) out.push(path.relative(dir, p).split(path.sep).join("/")); } catch { /* skip */ } }
      if (out.length >= max) return;
    }
  };
  walk(dir, 0);
  return out;
}

function collectFacts(p, prev) {
  const dir = p.path;
  const isGit = existsSync(path.join(dir, ".git"));
  const f = { id: p.id, name: p.name, owner_type: p.owner === "asen" ? "asen" : p.owner === "personal" ? "personal" : "client", cloud_ok: p.cloud_ok, git: isGit };
  const sinceMs = prev?.collected_ms || Date.now() - 14 * 864e5;

  if (isGit) {
    f.head = tryRun("git", ["-C", dir, "rev-parse", "HEAD"]);
    f.branch = tryRun("git", ["-C", dir, "rev-parse", "--abbrev-ref", "HEAD"]);
    f.last_commit_at = tryRun("git", ["-C", dir, "log", "-1", "--format=%cI"]);
    const range = prev?.head && prev.head !== f.head && tryRun("git", ["-C", dir, "cat-file", "-t", prev.head]) === "commit" ? [`${prev.head}..HEAD`] : ["-n", "10"];
    f.new_commits = prev?.head === f.head ? [] : tryRun("git", ["-C", dir, "log", ...range, "--no-merges", "-n", "30", "--format=%h|%cs|%s"]).split("\n").filter(Boolean).map((l) => { const [h, d, ...s] = l.split("|"); return { hash: h, date: d, subject: redact(s.join("|")).slice(0, 160) }; });
    f.changed_files = prev?.head && prev.head !== f.head ? tryRun("git", ["-C", dir, "diff", "--name-only", prev.head, "HEAD"]).split("\n").filter(Boolean).slice(0, 50) : [];
    const dirty = tryRun("git", ["-C", dir, "status", "--porcelain"]).split("\n").filter(Boolean);
    f.uncommitted = { count: dirty.length, files: dirty.slice(0, 15).map((l) => l.slice(3)) };
    const todo = tryRun("git", ["-C", dir, "grep", "-I", "-h", "-E", "(TODO|FIXME)[:( ]", "--", ".", ":!node_modules", ":!*.min.js", ":!package-lock.json"]).split("\n").filter(Boolean).slice(0, 400).map((l) => redact(l.trim().replace(/\s+/g, " ")).slice(0, 140));
    const prevTodos = new Set(prev?.todo_hashes || []);
    f.todo_hashes = [...new Set(todo.map(hash))];
    f.todos = { count: todo.length, new: prev ? todo.filter((t) => !prevTodos.has(hash(t))).slice(0, 10) : [] };
  } else {
    f.changed_files = listFilesNewer(dir, sinceMs);
    f.new_commits = [];
  }

  // Dependencies (all package manifests up to one level down).
  const st = projectStack(dir);
  f.deps = { ...Object.fromEntries(Object.entries(st.npm)), ...Object.fromEntries(Object.entries(st.py).map(([k, v]) => [`py:${k}`, v])) };
  f.stack_signals = [...st.signals];
  if (prev?.deps) {
    const a = prev.deps; const b = f.deps;
    f.deps_changes = {
      added: Object.keys(b).filter((k) => !(k in a)).slice(0, 20),
      removed: Object.keys(a).filter((k) => !(k in b)).slice(0, 20),
      updated: Object.keys(b).filter((k) => k in a && a[k] !== b[k]).slice(0, 20).map((k) => `${k} ${a[k]} → ${b[k]}`),
    };
  }

  // The project's own notes (top level only): hash always, excerpt only when it changed.
  f.docs = {};
  let names = [];
  try { names = readdirSync(dir).filter((n) => DOCS.test(n)); } catch { /* none */ }
  for (const n of names.slice(0, 8)) {
    let text = "";
    try { text = readFileSync(path.join(dir, n), "utf8"); } catch { continue; }
    const h = hash(text);
    const was = prev?.docs?.[n];
    f.docs[n] = { hash: h, chars: text.length, excerpt: was?.hash === h ? was.excerpt : redact(text.replace(/\r/g, "").slice(0, 1500)) };
  }
  f.docs_changed = Object.keys(f.docs).filter((n) => prev?.docs?.[n]?.hash !== f.docs[n].hash);

  const activity = [f.last_commit_at, ...(f.changed_files.length && !isGit ? [nowIso()] : [])].filter(Boolean).sort().at(-1);
  f.last_activity = activity ? activity.slice(0, 10) : prev?.last_activity || null;

  // "changed" = something a human would care about, not just the clock.
  const sig = hash(JSON.stringify([f.head, f.uncommitted?.count, f.todos?.count, Object.keys(f.deps).sort().map((k) => `${k}@${f.deps[k]}`), Object.values(f.docs).map((d) => d.hash), isGit ? null : f.changed_files.length]));
  f.signature = sig;
  f.changed_at = !prev || prev.signature !== sig ? nowIso() : prev.changed_at;
  return f;
}

// ---------- overview + index ----------
function overview(projects) {
  const rows = [];
  const index = [];
  for (const p of projects) {
    const b = readBrain(PRIVATE, p);
    const f = b.facts || {};
    const ownerType = f.owner_type || (p.owner === "asen" ? "asen" : p.owner === "personal" ? "personal" : "client");
    const status = b.fm.status || (f.last_activity && Date.now() - Date.parse(f.last_activity) < 30 * 864e5 ? "active" : "paused");
    const focus = b.goal || (f.new_commits?.[0]?.subject ? `latest: ${f.new_commits[0].subject}` : "");
    rows.push({ p, ownerType, status, last: f.last_activity || "?", focus, summary: !b.exists ? "missing" : b.stale ? "stale" : "fresh" });
    index.push({
      id: p.id, name: p.name, aliases: [p.name, p.id], owner_type: ownerType, status, last_activity: f.last_activity || null,
      stack: [...new Set([...(f.stack_signals || []), ...Object.keys(f.deps || {}).slice(0, 40)])], cloud_ok: p.cloud_ok,
      goal: b.goal, recent: b.recent || (f.new_commits || []).slice(0, 3).map((c) => c.subject).join(" · "), problems: b.problems, next: b.next,
      brain: path.relative(PRIVATE, path.join(b.dir, "brain.md")).split(path.sep).join("/"),
      facts_changed_at: f.changed_at || null, summary: !b.exists ? "missing" : b.stale ? "stale" : "fresh",
    });
  }
  const order = { active: 0, paused: 1, done: 2 };
  rows.sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3) || String(b.last).localeCompare(String(a.last)));
  const line = (r) => `| ${r.p.name} | ${r.ownerType} | ${r.status} | ${r.last} | ${String(r.ownerType === "client" ? "(see client folder)" : r.focus).replace(/\|/g, "/").slice(0, 120)} | ${r.summary} |`;
  const md = `# Project Brain: all projects at a glance\n\nAuto-generated hourly by \`asen-engineering/scripts/asen-brain.mjs\` (facts only). Summaries: each project's \`brain.md\`. Updated ${nowIso().slice(0, 16).replace("T", " ")} UTC.\n\n| Project | Owner | Status | Last activity | Current focus | Summary |\n| --- | --- | --- | --- | --- | --- |\n${rows.filter((r) => r.status !== "done").map(line).join("\n")}\n\n## Worked (done projects: reusable parts and lessons in each brain.md)\n\n${rows.filter((r) => r.status === "done").map(line).join("\n") || "_none yet_"}\n`;
  return { md, index: { updated: nowIso(), projects: index } };
}

// ---------- git (private repo, as the registry's account for it) ----------
function commitPrivate(message) {
  run("git", ["-C", PRIVATE, "add", "-A", "brain", "asen/projects", "personal", "clients", "registry/brain-consent.json"]);
  try { run("git", ["-C", PRIVATE, "diff", "--cached", "--quiet"]); return false; } catch { /* has changes */ }
  run("git", ["-C", PRIVATE, "commit", "-q", "-m", message]);
  try { run("git", ["-C", PRIVATE, "pull", "--rebase", "-q"]); run("git", ["-C", PRIVATE, "push", "-q"]); } catch (e) { log(`push failed (will retry next hour): ${e.message.split("\n")[0]}`); }
  return true;
}

async function collect() {
  if (existsSync(LOCK) && Date.now() - statSync(LOCK).mtimeMs < 20 * 60e3) return log("collect skipped: another run is busy");
  writeFileSync(LOCK, String(process.pid));
  try {
    tryRun("git", ["-C", PRIVATE, "pull", "--ff-only", "-q"]);
    if (tryRun("git", ["-C", RADAR, "rev-parse", "--abbrev-ref", "HEAD"]) === "main" && !tryRun("git", ["-C", RADAR, "status", "--porcelain", "mail"])) tryRun("git", ["-C", RADAR, "pull", "--ff-only", "-q"]);
    const consent = readJSON(CONSENT, { note: "Project Brain consent (scripts/asen-brain.mjs). ask = never read, question pending; yes = read-only summaries; no = excluded forever.", projects: {} });
    const consentChanged = updateConsent(consent);
    if (consentChanged) writeJSON(CONSENT, consent);

    const projects = brainProjects(consent);
    const state = readJSON(path.join(LOG_DIR, "brain-state.json"), {});
    let changed = 0;
    for (const p of projects) {
      const file = path.join(brainDir(PRIVATE, p), "facts.json");
      const prev = readJSON(file, null);
      if (prev) prev.collected_ms = state[p.id] || Date.parse(prev.changed_at || 0);
      let f;
      try { f = collectFacts(p, prev); } catch (e) { log(`facts failed for ${p.id}: ${e.message}`); continue; }
      state[p.id] = Date.now();
      if (!prev || prev.signature !== f.signature || JSON.stringify(prev.docs) !== JSON.stringify(f.docs)) { writeJSON(file, f); changed++; }
    }
    writeJSON(path.join(LOG_DIR, "brain-state.json"), state);
    const { md, index } = overview(projects);
    const oldIndex = readJSON(path.join(PRIVATE, "brain", "index.json"), null);
    const strip = (x) => JSON.stringify({ ...x, updated: null });
    if (!oldIndex || strip(oldIndex) !== strip(index) || changed || consentChanged) {
      writeJSON(path.join(PRIVATE, "brain", "index.json"), index);
      mkdirSync(path.join(PRIVATE, "brain"), { recursive: true });
      writeFileSync(path.join(PRIVATE, "brain", "OVERVIEW.md"), md);
    }
    const committed = commitPrivate(`brain: facts for ${changed} project(s)${consentChanged ? " + consent" : ""}`);
    log(`collect: ${projects.length} projects, ${changed} changed${consentChanged ? ", consent updated" : ""}${committed ? ", pushed" : ""}`);
    console.log(`brain: ${projects.length} projects, ${changed} with new facts`);
  } finally {
    rmSync(LOCK, { force: true });
  }
}

const cmd = process.argv[2];
if (cmd === "collect") await collect();
else if (cmd === "status") console.log(readFileSync(path.join(PRIVATE, "brain", "OVERVIEW.md"), "utf8"));
else { console.log("usage: asen-brain.mjs collect | status"); process.exitCode = 1; }
