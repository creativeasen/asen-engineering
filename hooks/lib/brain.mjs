// ASEN Project Brain: one shared, always-updated memory of every project (zero dependencies).
// Lives in the private repo, inside each owner's folder:
//   asen/projects/<id>/{brain.md,facts.json,plans/}   personal/<id>/{...}   clients/<client>/<id>/{...}
//   brain/OVERVIEW.md + brain/index.json (all projects at a glance)   registry/brain-consent.json (yes/no per project)
// facts.json = written hourly by scripts/asen-brain.mjs (facts only, no Claude).
// brain.md   = the readable summary Claude writes, only when the facts changed (daily radar run, or a session in that project).
// The brain only READS projects; it never changes their code, settings or deploys.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const read = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };

export function brainDir(privateDir, project) {
  const owner = String(project.owner || project.owner_type || "asen");
  if (owner === "asen") return path.join(privateDir, "asen", "projects", project.id);
  if (owner === "personal") return path.join(privateDir, "personal", project.id);
  const client = owner.replace(/^client-/, "");
  return path.join(privateDir, "clients", client, project.id);
}

// Minimal front matter + "## Section" parser for brain.md.
export function parseBrain(md) {
  const fm = {};
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md || "");
  if (m) for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  const sections = {};
  const body = m ? md.slice(m[0].length) : md || "";
  let cur = null;
  for (const line of body.split(/\r?\n/)) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) { cur = h[1].toLowerCase(); sections[cur] = []; continue; }
    if (cur && line.trim()) sections[cur].push(line.trim());
  }
  return { fm, sections };
}
const first = (sections, names, n = 3) => {
  for (const name of names) {
    const s = sections[name];
    if (s?.length) return s.slice(0, n).map((l) => l.replace(/^[-*]\s*/, "")).join(" · ");
  }
  return "";
};

export function readBrain(privateDir, project) {
  const dir = brainDir(privateDir, project);
  const md = read(path.join(dir, "brain.md"));
  let facts = null;
  try { facts = JSON.parse(read(path.join(dir, "facts.json")) || "null"); } catch { /* none yet */ }
  const { fm, sections } = parseBrain(md);
  const summaryAt = fm.facts_at || fm.updated || "";
  return {
    dir, exists: !!md, fm, sections, facts,
    goal: fm.goal || first(sections, ["current goal"], 2),
    recent: first(sections, ["recent work"], 3),
    problems: first(sections, ["open problems and blockers", "open problems"], 3),
    next: first(sections, ["next steps"], 3),
    opportunities: (sections.opportunities || []).slice(-3).map((l) => l.replace(/^[-*]\s*/, "")),
    stale: !!facts?.changed_at && (!summaryAt || facts.changed_at > summaryAt),
  };
}

// The Project Brain part of the session digest (~600-900 chars).
export function brainDigest(privateDir, project) {
  if (!project || !existsSync(privateDir)) return "";
  const b = readBrain(privateDir, project);
  const rel = (p) => path.relative(privateDir, p).split(path.sep).join("/");
  const lines = [`**Project Brain (${project.id}):**`];
  if (!b.exists) {
    lines.push(`- No summary yet. Facts: \`${rel(path.join(b.dir, "facts.json"))}\`.`);
  } else {
    if (b.goal) lines.push(`- Goal: ${b.goal}`);
    if (b.recent) lines.push(`- Recent: ${b.recent}`);
    if (b.problems) lines.push(`- Open problems: ${b.problems}`);
    if (b.next) lines.push(`- Next: ${b.next}`);
    if (b.opportunities.length) lines.push(`- Radar ideas for this project: ${b.opportunities.join(" | ")}`);
  }
  if (!b.exists || b.stale) {
    lines.push(`- The summary is ${b.exists ? "older than the latest facts" : "missing"}. When there is a quiet moment in this session, update \`${rel(path.join(b.dir, "brain.md"))}\` in the private repo from \`facts.json\` + what you see here (template: \`brain/TEMPLATE.md\`; set \`facts_at\` to the facts' \`changed_at\`), then commit and push there. Read-only toward this project.`);
  }
  let text = lines.join("\n");
  if (text.length > 1100) text = `${text.slice(0, 1080)}…`;
  return text;
}
