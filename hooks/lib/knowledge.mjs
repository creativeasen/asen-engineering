// ASEN knowledge for Claude Code sessions (zero dependencies).
// Sources: the local clones of asen-engineering (knowledge/*.md), asen-radar (stack/_digest.json) and the private repo.
// Used by the SessionStart digest, the package cross-check hook, and scripts/asen-knowledge.mjs.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { execFile, spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { registryFile } from "./registry.mjs";

export const ASEN_DIR = path.dirname(path.dirname(path.dirname(registryFile())));
export const CLONES = {
  engineering: path.join(ASEN_DIR, "asen-engineering"),
  radar: path.join(ASEN_DIR, "asen-radar"),
  private: path.join(ASEN_DIR, "asen-engineering-private"),
};
const STATE_DIR = path.join(os.homedir(), ".asen");

const read = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

// ---------- throttling (stamp files in ~/.asen) ----------
export function due(name, minutes) {
  mkdirSync(STATE_DIR, { recursive: true });
  const f = path.join(STATE_DIR, `${name}.stamp`);
  try { if (Date.now() - statSync(f).mtimeMs < minutes * 60e3) return false; } catch { /* first time */ }
  writeFileSync(f, new Date().toISOString());
  return true;
}

// ---------- auto-sync: fast-forward the three knowledge clones (bounded, silent) ----------
function git(dir, args, timeout) {
  return new Promise((resolve) => {
    execFile("git", ["-C", dir, ...args], { timeout, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" } },
      (err, stdout) => resolve(err ? null : String(stdout).trim()));
  });
}
export async function syncClones({ timeout = 8000 } = {}) {
  const results = await Promise.all(Object.entries(CLONES).map(async ([name, dir]) => {
    if (!existsSync(path.join(dir, ".git"))) return `${name}: missing`;
    if ((await git(dir, ["rev-parse", "--abbrev-ref", "HEAD"], 3000)) !== "main") return `${name}: not on main (skipped)`;
    return (await git(dir, ["pull", "--ff-only", "-q"], timeout)) === null ? `${name}: pull failed (kept local copy)` : `${name}: ok`;
  }));
  return results;
}

// Fire-and-forget background jobs (plugin update, auto-register). Never blocks the session.
export function detached(command) {
  try {
    const child = spawn(command, { shell: true, detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
  } catch { /* never block */ }
}

// ---------- markdown tables ----------
export function tables(md) {
  const out = [];
  let head = null;
  for (const line of md.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) { head = null; continue; }
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    if (cells.every((c) => /^:?-{3,}:?$/.test(c))) continue;
    if (!head) { head = cells.map((c) => c.toLowerCase()); continue; }
    out.push(Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""])));
  }
  return out;
}
const plain = (s) => String(s || "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "").trim();
const ticks = (s) => [...String(s || "").matchAll(/`([^`]+)`/g)].map((m) => m[1].toLowerCase());

// ---------- knowledge ----------
export function loadKnowledge() {
  const k = path.join(CLONES.engineering, "knowledge");
  let radar = null;
  try { radar = JSON.parse(read(path.join(CLONES.radar, "stack", "_digest.json"))); } catch { /* not synced yet */ }
  return {
    stack: tables(read(path.join(k, "stack.md"))).filter((r) => r.item),
    watch: tables(read(path.join(k, "security-watchlist.md"))).filter((r) => r.date),
    models: tables(read(path.join(k, "models.md"))).filter((r) => r["api id"]),
    radar,
  };
}

// ---------- what this project uses ----------
const MANIFESTS = ["package.json", "requirements.txt", "pyproject.toml"];
export function projectStack(dir) {
  const npm = {}; const py = {}; const signals = new Set();
  const dirs = [dir];
  try {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      if (d.isDirectory() && !d.name.startsWith(".") && d.name !== "node_modules" && MANIFESTS.some((m) => existsSync(path.join(dir, d.name, m)))) dirs.push(path.join(dir, d.name));
    }
  } catch { /* unreadable */ }
  for (const d of dirs.slice(0, 8)) {
    try {
      const p = JSON.parse(read(path.join(d, "package.json")) || "{}");
      for (const [n, v] of Object.entries({ ...p.dependencies, ...p.devDependencies })) npm[n.toLowerCase()] = String(v);
      if (p.engines?.node) signals.add(`node ${p.engines.node}`);
    } catch { /* not JSON */ }
    for (const l of read(path.join(d, "requirements.txt")).split(/\r?\n/)) {
      const m = /^([A-Za-z0-9_.-]+)\s*([=<>~!].*)?$/.exec(l.trim()); if (m) py[m[1].toLowerCase()] = m[2] || "";
    }
    for (const m of read(path.join(d, "pyproject.toml")).matchAll(/^\s*"?([A-Za-z0-9_.-]+)\s*(?:[=<>~!][^",]*)?"?\s*,?\s*$/gm)) if (m[1] && !/^(name|version|python)$/i.test(m[1])) py[m[1].toLowerCase()] ??= "";
    if (existsSync(path.join(d, "vercel.json")) || existsSync(path.join(d, ".vercel"))) signals.add("vercel");
    if (existsSync(path.join(d, "railway.json")) || existsSync(path.join(d, "nixpacks.toml"))) signals.add("railway");
    if (existsSync(path.join(d, "supabase"))) signals.add("supabase");
    if (existsSync(path.join(d, "shopify.app.toml"))) signals.add("shopify");
  }
  return { npm, py, signals };
}

// Words that tie knowledge rows to this project.
function projectTerms(ps, radar, type) {
  const names = new Set([...Object.keys(ps.npm), ...Object.keys(ps.py), ...ps.signals]);
  const terms = new Set(["claude", "anthropic", "node"]);
  for (const n of names) { terms.add(n); for (const part of n.replace(/^@/, "").split(/[/-]/)) if (part.length > 3) terms.add(part); }
  for (const t of radar?.tools || []) {
    const hit = (t.npm && names.has(t.npm.toLowerCase())) || [t.id, t.name, ...t.aliases].some((a) => names.has(String(a).toLowerCase()) || ps.signals.has(String(a).toLowerCase()));
    if (hit) { terms.add(t.id); for (const a of [t.name, ...t.aliases]) terms.add(String(a).toLowerCase()); }
  }
  const byType = { "ecommerce-shopify": ["shopify"], "automation-n8n": ["n8n"], "saas-webapp": ["supabase", "vercel"], website: ["vercel"], "mobile-app": ["expo", "react native"], "python-bots": ["python"] };
  for (const w of byType[type] || []) terms.add(w);
  return terms;
}
const mentions = (text, terms) => { const t = ` ${String(text).toLowerCase()} `; return [...terms].some((w) => w.length > 2 && new RegExp(`[^a-z0-9]${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^a-z0-9]`).test(t)); };

// Knowledge row for a package name (matches `pkg` in backticks or the item name).
export function stackRow(stack, name) {
  const n = name.toLowerCase();
  // The source URL names the package too: registry.npmjs.org/<pkg>/latest or pypi.org/project/<pkg>/
  const fromSource = (r) => decodeURIComponent((/registry\.npmjs\.org\/(.+?)\/latest/.exec(r.source) || /pypi\.org\/project\/([^/]+)/.exec(r.source) || [])[1] || "").toLowerCase();
  return stack.find((r) => fromSource(r) === n || ticks(`${r.item} ${r.use} ${r.notes}`).includes(n) || r.item.toLowerCase() === n || r.item.toLowerCase().replace(/\.js$/, "") === n.replace(/\.js$/, ""));
}
// [major, minor] of the first version in a string ("^5.4.0", "19.3.0 (2026-09-12)", "0.131.0").
const ver = (v) => { const m = /(\d+)(?:\.(\d+))?/.exec(String(v || "")); return m ? [Number(m[1]), Number(m[2] || 0)] : null; };
// Behind a breaking release? For 0.x packages a minor bump is breaking (semver).
const behind = (used, latest) => Boolean(used && latest && (used[0] < latest[0] || (used[0] === 0 && latest[0] === 0 && used[1] < latest[1])));

// Issues for a set of packages: outdated majors, watchlist/advisory hits, radar status.
// install = true for a package being added now (just pick the current version); false for existing dependencies.
export function packageFindings(k, pkgs, { install = false } = {}) {
  const out = [];
  for (const [name, spec] of Object.entries(pkgs)) {
    const row = stackRow(k.stack, name);
    if (row) {
      const latest = plain(row["latest seen"]).slice(0, 40);
      if (behind(spec ? ver(spec) : null, ver(row["latest seen"]))) {
        out.push(install
          ? `${name}@${spec} is an old release; the current one is ${latest} (ASEN uses ${plain(row.use)}). Install the current version unless this project deliberately pins the old major.`
          : `${name} ${spec} is behind the latest breaking release (${latest}): a major upgrade is HIGH risk, so propose it, don't force it.`);
      }
      if (/deprecat|end-of-life|eol|retire/i.test(row.notes)) out.push(`${name}: ${plain(row.notes).slice(0, 140)}`);
    }
    for (const w of k.watch) if (mentions(`${w.item} ${w["action for asen projects"]}`, new Set([name, ...name.replace(/^@/, "").split(/[/-]/).filter((p) => p.length > 3)]))) out.push(`${w.severity?.toUpperCase() || "NOTE"} (${w.date}): ${plain(w.item)}. ${plain(w["action for asen projects"]).slice(0, 140)}`);
    const tool = k.radar?.tools?.find((t) => (t.npm || "").toLowerCase() === name);
    if (tool && tool.status !== "Keep") out.push(`${tool.name}: radar status ${tool.status}${tool.best_challenger ? ` (challenger ${tool.best_challenger.name}, Replace Score ${tool.best_challenger.score})` : ""}.`);
  }
  return [...new Set(out)];
}

// ---------- the session digest (small: about 2-3k characters) ----------
export function buildDigest(dir, project, { scriptPath } = {}) {
  const k = loadKnowledge();
  const ps = projectStack(dir);
  const terms = projectTerms(ps, k.radar, project?.type);
  const lines = [];
  const now = today();
  const soon = (d) => { const t = Date.parse(String(d).slice(0, 10)); return Number.isNaN(t) ? true : (t - Date.parse(now)) / 864e5 <= 60 && (t - Date.parse(now)) / 864e5 >= -14; };

  const deps = Object.keys(ps.npm).length + Object.keys(ps.py).length;
  lines.push(`## ASEN knowledge digest (auto, ${now}; radar ${k.radar?.latest_brief || "not synced"})`);
  lines.push(deps ? `Stack detected: ${deps} packages${ps.signals.size ? `, ${[...ps.signals].join(", ")}` : ""}.` : "No package manifest found in this folder.");

  const findings = packageFindings(k, Object.fromEntries([...Object.entries(ps.npm), ...Object.entries(ps.py)]));
  if (findings.length) { lines.push("**Check in this project:**"); for (const f of findings.slice(0, 8)) lines.push(`- ${f}`); }

  const watched = k.watch.filter((w) => soon(w.date) && mentions(`${w.item} ${w["action for asen projects"]}`, terms));
  const watchedDates = new Set(watched.map((w) => String(w.date).slice(0, 10)));
  const deadlines = [
    ...watched.map((w) => `${w.date}: ${plain(w.item)} (${w.severity})`),
    // radar calendar adds items the watchlist doesn't have yet (same-day items are usually duplicates)
    ...(k.radar?.calendar || []).filter((e) => soon(e.date) && e.type !== "event" && !watchedDates.has(e.date) && (e.affects.some((x) => terms.has(x)) || mentions(e.what, terms))).map((e) => `${e.date}: ${e.what}`),
  ];
  if (deadlines.length) { lines.push("**Deadlines / advisories for this stack (next 60 days):**"); for (const d of [...new Set(deadlines)].slice(0, 6)) lines.push(`- ${d}`); }

  const tools = (k.radar?.tools || []).filter((t) => terms.has(t.id));
  if (tools.length) lines.push(`**Stack status (radar):** ${tools.map((t) => `${t.name} ${t.status}${t.best_challenger && t.status !== "Keep" ? ` (vs ${t.best_challenger.name} ${t.best_challenger.score})` : ""}`).join("; ")}.`);

  const cats = ["coding-model", "ai-coding-tool", ...(terms.has("n8n") ? ["automation-tool"] : []), ...(project?.type === "website" ? ["website-builder"] : [])];
  const best = cats.map((c) => { const top = k.radar?.leaderboards?.[c]?.top?.[0]; return top ? `${c}: ${top.name}` : null; }).filter(Boolean);
  if (best.length) lines.push(`**Best right now:** ${best.join("; ")} (radar leaderboards; company claims are marked there).`);

  const model = k.models.find((m) => /default/i.test(m["best for"])) || k.models[0];
  if (model) lines.push(`**Claude model default:** ${plain(model.model)} (\`${plain(model["api id"]).replace(/`/g, "")}\`). Check \`knowledge/models.md\` before choosing another.`);

  if (k.radar?.alerts?.length) lines.push(`**Radar alerts (14 days):** ${k.radar.alerts.map((a) => `${a.date} ${a.title}`).join("; ").slice(0, 300)}`);

  lines.push("**Cross-check rule:** before planning a feature, choosing a library/tool/model/API, adding a package, or writing integration code, check this digest" +
    (scriptPath ? ` and run \`node "${scriptPath}" check <package-or-tool>...\`` : "") +
    ". Apply the better, current, non-deprecated option when it is LOW/MEDIUM risk; propose (don't force) major upgrades. Then tell Aakash in ONE line: what you changed and why, with the source.");
  let text = lines.join("\n");
  if (text.length > 3500) text = `${text.slice(0, 3450)}\n…(digest trimmed)`;
  return text;
}
