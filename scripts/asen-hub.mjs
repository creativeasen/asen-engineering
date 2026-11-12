#!/usr/bin/env node
// ASEN Project Hub: ONE list of every project (code or not: websites, apps, logos, posters, pitches, outreach, content),
// past, current and future. Lives in the private repo as brain/hub.json (cards) + brain/plans/<id>.md (starting plans)
// + brain/library.md (what finished projects taught). Zero dependencies, no network, no Claude.
//
//   node scripts/asen-hub.mjs sync  --private <dir>                     merge the hub into brain/index.json + OVERVIEW.md,
//                                                                       create a brain.md for own (asen/personal) hub projects
//   node scripts/asen-hub.mjs work  --private <dir> --radar <dir> [--github <repos.json>] [--today YYYY-MM-DD]
//                                                                       what the Project Hub routine must do (JSON); total 0 = nothing
//   node scripts/asen-hub.mjs check --private <dir>                     validate brain/hub.json
//   node scripts/asen-hub.mjs selftest                                  offline tests
//
// brain/index.json is what every routine already reads (Radar Daily "use it in my projects", Weekly "projects pulse",
// research answers, session digests). Merging the hub into it makes every project, including future ones, part of all of them.
// Client cards hold only name, kind, status, a one-line goal, stack and next step: no contacts, prices or files.
// The PC collector (asen-brain.mjs) calls mergeIndex() too, so its hourly rewrite keeps the hub rows.

import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const OWNER = ["asen", "personal", "client"];
export const KIND = ["web", "app", "ecommerce", "design", "marketing", "outreach", "automation", "content", "tool", "other"];
export const STATUS = ["idea", "active", "paused", "done"];
export const STALE_DAYS = 14;
const HUB = "brain/hub.json";
const INBOX = "brain/hub-inbox.json";
const RADAR_INBOX = "stack/project-inbox.md";

const readJSON = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
const writeJSON = (p, v) => { mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, `${JSON.stringify(v, null, 1)}\n`); };
const daysBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / 864e5;
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

export function loadHub(privateDir) {
  const h = readJSON(path.join(privateDir, HUB), null);
  return h && Array.isArray(h.projects) ? h : { updated: null, github_seen: [], projects: [] };
}

export function validate(hub) {
  const errors = [];
  const ids = new Set();
  for (const c of hub.projects || []) {
    const where = `card ${c.id || "?"}`;
    if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(c.id || "")) errors.push(`${where}: id must be a slug`);
    if (ids.has(c.id)) errors.push(`${where}: duplicate id`);
    ids.add(c.id);
    if (!c.name) errors.push(`${where}: name missing`);
    if (!OWNER.includes(c.owner_type)) errors.push(`${where}: owner_type must be ${OWNER.join("|")}`);
    if (!STATUS.includes(c.status)) errors.push(`${where}: status must be ${STATUS.join("|")}`);
    if (c.kind && !KIND.includes(c.kind)) errors.push(`${where}: kind must be ${KIND.join("|")}`);
    if (c.last_activity && !/^\d{4}-\d{2}-\d{2}$/.test(c.last_activity)) errors.push(`${where}: last_activity must be YYYY-MM-DD`);
    // Client cards stay minimal: no phone numbers, emails or money in the shared brain.
    if (c.owner_type === "client" && /(\+?\d[\d\s-]{9,}\d)|@[a-z0-9-]+\.[a-z]|₹|\brs\.?\s?\d|\binr\b/i.test(JSON.stringify(c))) errors.push(`${where}: client card contains a phone number, email or price`);
  }
  return errors;
}

// Own (asen/personal) hub projects get a normal brain folder so the daily run can add opportunities to it.
export function brainPath(card) {
  if (card.owner_type === "asen") return `asen/projects/${card.id}/brain.md`;
  if (card.owner_type === "personal") return `personal/${card.id}/brain.md`;
  return null; // clients: no cloud brain file (client details stay in the client folder)
}

function hubRow(c) {
  return {
    id: c.id, name: c.name, aliases: [...new Set([c.name, c.id, ...(c.aliases || [])])], owner_type: c.owner_type, status: c.status,
    last_activity: c.last_activity || null, stack: c.stack || [], cloud_ok: c.owner_type !== "client",
    goal: c.goal || "", recent: c.notes || "", problems: c.problems || "", next: c.next || "",
    brain: brainPath(c), facts_changed_at: null, summary: "hub", hub: true, kind: c.kind || "other", plan: c.plan || null,
  };
}

// Collector rows keep their facts; a hub card with the same id or alias adds/overrides status, goal, next, kind and plan.
export function mergeIndex(index, hub) {
  const cards = hub.projects || [];
  const match = (row) => cards.find((c) => c.id === row.id || [c.name, ...(c.aliases || [])].some((a) => norm(a) && (row.aliases || [row.name, row.id]).some((b) => norm(b) === norm(a))));
  const used = new Set();
  const rows = (index?.projects || []).filter((r) => !r.hub).map((r) => {
    const c = match(r);
    if (!c) return r;
    used.add(c.id);
    return { ...r, status: c.status || r.status, goal: c.goal || r.goal, next: c.next || r.next, problems: c.problems || r.problems,
      kind: c.kind || r.kind, plan: c.plan || r.plan || null, last_activity: [r.last_activity, c.last_activity].filter(Boolean).sort().at(-1) || null, hub_card: c.id };
  });
  for (const c of cards) if (!used.has(c.id)) rows.push(hubRow(c));
  return { updated: new Date().toISOString(), projects: rows };
}

export function overviewSection(hub) {
  const cards = [...(hub.projects || [])];
  const order = { active: 0, idea: 1, paused: 2, done: 3 };
  cards.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || String(b.last_activity).localeCompare(String(a.last_activity)));
  const cell = (s) => String(s || "").replace(/\|/g, "/").slice(0, 110);
  const rows = cards.map((c) => `| ${cell(c.name)} | ${c.owner_type} | ${c.kind || "other"} | ${c.status} | ${c.last_activity || "?"} | ${cell(c.goal)} | ${cell(c.next)} |`).join("\n");
  return `<!-- hub:start -->\n## Project Hub (every project, code or not)\n\nFrom \`brain/hub.json\`. Plans: \`brain/plans/\`. Lessons: \`brain/library.md\`.\n\n| Project | Owner | Kind | Status | Last activity | Goal | Next |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows || "| _none yet_ | | | | | | |"}\n<!-- hub:end -->\n`;
}

export function withOverview(md, hub) {
  const base = String(md || "# Project Brain: all projects at a glance\n").replace(/\n?<!-- hub:start -->[\s\S]*?<!-- hub:end -->\n?/, "\n").trimEnd();
  return `${base}\n\n${overviewSection(hub)}`;
}

function brainStub(c, today) {
  return `---\nid: ${c.id}\nname: ${c.name}\nowner_type: ${c.owner_type}\nstatus: ${c.status === "idea" ? "active" : c.status}\ngoal: ${c.goal || "unknown"}\nstack: [${(c.stack || []).join(", ")}]\nupdated: ${today}\nfacts_at: \n---\n# ${c.name}\n\n## What it is\n${c.notes || c.goal || "unknown"}\n\n## Stack and key tools\n${(c.stack || []).map((s) => `- ${s}`).join("\n") || "- unknown"}\n\n## Current goal\n${c.goal || "unknown"}\n\n## Recent work\n- ${c.last_activity || today} added to the Project Hub (${c.source || "hub"})\n\n## Open problems and blockers\n${c.problems ? `- ${c.problems}` : "- none known"}\n\n## Next steps\n${c.next ? `- ${c.next}` : "- unknown"}\n\n## Decisions\n\n## Lessons learned\n\n## Reusable parts\n\n## Opportunities\n`;
}

export function sync(privateDir, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const hub = loadHub(privateDir);
  const errors = validate(hub);
  if (errors.length) throw new Error(`brain/hub.json is invalid:\n- ${errors.join("\n- ")}`);
  let created = 0;
  for (const c of hub.projects) {
    const rel = brainPath(c);
    if (!rel) continue;
    const file = path.join(privateDir, rel);
    if (!existsSync(file)) { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, brainStub(c, today)); created++; }
  }
  const index = mergeIndex(readJSON(path.join(privateDir, "brain/index.json"), { projects: [] }), hub);
  writeJSON(path.join(privateDir, "brain/index.json"), index);
  const ov = path.join(privateDir, "brain/OVERVIEW.md");
  writeFileSync(ov, withOverview(existsSync(ov) ? readFileSync(ov, "utf8") : "", hub));
  return { projects: index.projects.length, hub: hub.projects.length, created };
}

export function radarInbox(radarDir) {
  const file = path.join(radarDir, RADAR_INBOX);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split(/\r?\n/).map((l, i) => ({ l, line: i + 1 })).filter(({ l }) => /^- \[ \] /.test(l))
    .map(({ l, line }) => { const [date, text, ref] = l.slice(6).split(" · ").map((s) => s.trim()); return { source: "email", line, date, text, ref: ref || null }; });
}

export function work(privateDir, radarDir, { github = [], today = new Date().toISOString().slice(0, 10) } = {}) {
  const hub = loadHub(privateDir);
  const index = readJSON(path.join(privateDir, "brain/index.json"), { projects: [] });
  const known = new Set([...hub.projects.flatMap((c) => [c.id, c.name, ...(c.aliases || []), ...(c.links || [])]), ...index.projects.flatMap((r) => [r.id, ...(r.aliases || [])])].map(norm));
  const seen = new Set(hub.github_seen || []);
  const inbox = [
    ...radarInbox(radarDir),
    ...(readJSON(path.join(privateDir, INBOX), { items: [] }).items || []).map((it, i) => ({ ...it, index: i })).filter((it) => !it.done).map((it) => ({ source: it.source || "pc", index: it.index, date: it.at?.slice(0, 10), text: it.text, ref: it.ref || null })),
  ];
  const newRepos = github.filter((r) => !r.fork && !r.archived && !seen.has(r.full_name))
    .map((r) => ({ full_name: r.full_name, name: r.name, description: r.description || "", pushed_at: r.pushed_at, url: r.html_url, known: known.has(norm(r.name)) || known.has(norm(r.html_url)) }));
  const cards = hub.projects;
  const needsPlan = cards.filter((c) => c.needs_plan && !c.plan && ["idea", "active"].includes(c.status)).map((c) => c.id);
  const stale = cards.filter((c) => c.status === "active" && c.last_activity && daysBetween(c.last_activity, today) >= STALE_DAYS && (!c.nudged_at || daysBetween(c.nudged_at, today) >= STALE_DAYS)).map((c) => c.id);
  const library = cards.filter((c) => c.status === "done" && !c.library_at).map((c) => c.id);
  const total = inbox.length + newRepos.length + needsPlan.length + stale.length + library.length;
  return { today, total, inbox, new_github_repos: newRepos, needs_plan: needsPlan, stale, library };
}

// ---------- self-test ----------
function selftest() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "hub-"));
  const radar = mkdtempSync(path.join(os.tmpdir(), "hub-radar-"));
  let bad = 0;
  const ok = (cond, msg) => { if (!cond) { bad++; console.error(`hub selftest FAILED: ${msg}`); } };
  try {
    writeJSON(path.join(dir, "brain/index.json"), { projects: [
      { id: "wa-ai-agent", name: "wa-ai-agent", aliases: ["wa-ai-agent"], owner_type: "asen", status: "active", last_activity: "2026-10-20", summary: "fresh", goal: "unknown" },
      { id: "shopsite", name: "shopsite", aliases: ["shopsite"], owner_type: "client", status: "active", cloud_ok: false, summary: "missing" },
    ] });
    writeFileSync(path.join(dir, "brain/OVERVIEW.md"), "# Project Brain: all projects at a glance\n\n| a |\n");
    const hub = { updated: null, github_seen: ["me/old"], projects: [
      { id: "wa-ai-agent", name: "WhatsApp AI agent", owner_type: "asen", kind: "automation", status: "active", goal: "custom chatbots per niche", next: "pilot on ASEN", last_activity: "2026-11-01" },
      { id: "logo-x", name: "Logo X", owner_type: "client", kind: "design", status: "active", goal: "logo refresh", last_activity: "2026-10-01" },
      { id: "dash-y", name: "Dashboard Y", owner_type: "client", kind: "web", status: "idea", needs_plan: true, plan: null, last_activity: "2026-11-10" },
      { id: "reels", name: "Reels page", owner_type: "personal", kind: "content", status: "done", last_activity: "2026-09-01" },
    ] };
    writeJSON(path.join(dir, HUB), hub);
    ok(validate(hub).length === 0, `valid hub rejected: ${validate(hub)}`);
    ok(validate({ projects: [{ id: "cc", name: "C", owner_type: "client", status: "active", goal: "call +91 98765 43210" }] }).length === 1, "client phone number not caught");
    ok(validate({ projects: [{ id: "cc", name: "C", owner_type: "client", status: "active", goal: "₹45,000 deal" }] }).length === 1, "client price not caught");
    ok(validate({ projects: [{ id: "Bad Id", name: "x", owner_type: "x", status: "x" }] }).length === 3, "bad card not caught");

    const r = sync(dir, { today: "2026-11-12" });
    const idx = readJSON(path.join(dir, "brain/index.json"));
    const wa = idx.projects.find((p) => p.id === "wa-ai-agent");
    ok(idx.projects.length === 5, `index should have 5 rows, has ${idx.projects.length}`);
    ok(wa.goal === "custom chatbots per niche" && wa.summary === "fresh" && !wa.hub && wa.last_activity === "2026-11-01", "collector row not overridden correctly");
    ok(idx.projects.find((p) => p.id === "logo-x")?.cloud_ok === false, "client hub row must be cloud_ok false");
    ok(idx.projects.find((p) => p.id === "logo-x")?.brain === null, "client hub row must have no cloud brain file");
    ok(existsSync(path.join(dir, "personal/reels/brain.md")) && !existsSync(path.join(dir, "clients")), "own brain stub missing or client folder touched");
    ok(r.created === 2, `expected 2 brain stubs (asen + personal), got ${r.created}`);
    sync(dir, { today: "2026-11-12" });
    ok(readJSON(path.join(dir, "brain/index.json")).projects.length === 5, "sync is not idempotent");
    const ov = readFileSync(path.join(dir, "brain/OVERVIEW.md"), "utf8");
    ok(ov.startsWith("# Project Brain") && (ov.match(/hub:start/g) || []).length === 1 && ov.includes("Logo X"), "overview section wrong");

    mkdirSync(path.join(radar, "stack"), { recursive: true });
    writeFileSync(path.join(radar, RADAR_INBOX), "# Project inbox\n\n- [x] 2026-11-01 · old · R-1\n- [ ] 2026-11-12 · new project: fire safety dashboard for a client · R-20261112-ab12\n");
    writeJSON(path.join(dir, INBOX), { items: [{ at: "2026-11-12T01:00:00Z", source: "pc", text: "new folder ASEN/2_Clients/acme", done: false }, { at: "x", text: "done one", done: true }] });
    const w = work(dir, radar, { today: "2026-11-12", github: [{ full_name: "me/old", name: "old" }, { full_name: "me/new-site", name: "new-site", html_url: "https://github.com/me/new-site" }, { full_name: "me/fork", name: "fork", fork: true }] });
    ok(w.inbox.length === 2 && w.inbox[0].ref === "R-20261112-ab12" && w.inbox[0].line === 4, `inbox wrong: ${JSON.stringify(w.inbox)}`);
    ok(w.new_github_repos.length === 1 && w.new_github_repos[0].full_name === "me/new-site", "github discovery wrong");
    ok(JSON.stringify(w.needs_plan) === '["dash-y"]', `needs_plan wrong: ${w.needs_plan}`);
    ok(JSON.stringify(w.stale) === '["logo-x"]', `stale wrong: ${w.stale}`);
    ok(JSON.stringify(w.library) === '["reels"]', `library wrong: ${w.library}`);
    ok(w.total === 6, `total should be 6, is ${w.total}`);
    const quiet = work(dir, mkdtempSync(path.join(os.tmpdir(), "hub-empty-")), { today: "2026-10-05" });
    ok(quiet.stale.length === 0, "a project active 4 days ago is not stale");
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(radar, { recursive: true, force: true });
  }
  if (bad) process.exitCode = 1; else console.log("hub selftest ok: validate, merge, idempotent sync, overview, inbox, github, plans, stale, library");
}

// ---------- CLI ----------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, ...rest] = process.argv.slice(2);
  const opt = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
  const priv = opt("--private");
  try {
    if (cmd === "selftest") selftest();
    else if (!priv) throw new Error("usage: asen-hub.mjs sync|work|check --private <dir> [--radar <dir>] [--github <repos.json>] [--today YYYY-MM-DD] | selftest");
    else if (cmd === "check") { const e = validate(loadHub(priv)); if (e.length) { console.error(e.join("\n")); process.exitCode = 1; } else console.log(`hub ok: ${loadHub(priv).projects.length} projects`); }
    else if (cmd === "sync") console.log(JSON.stringify(sync(priv, { today: opt("--today") || undefined })));
    else if (cmd === "work") {
      const github = opt("--github") ? [readJSON(opt("--github"), [])].flat(2) : [];
      console.log(JSON.stringify(work(priv, opt("--radar") || ".", { github, today: opt("--today") || undefined }), null, 1));
    } else throw new Error(`unknown command ${cmd}`);
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
