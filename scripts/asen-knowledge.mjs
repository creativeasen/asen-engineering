#!/usr/bin/env node
// ASEN knowledge lookup for Claude Code (zero dependencies). Usage:
//   node scripts/asen-knowledge.mjs check <package|tool>...   what ASEN knows: latest version, advisories, radar status, best right now
//   node scripts/asen-knowledge.mjs digest [folder]          the session digest for a project folder
// Reads the local clones of asen-engineering and asen-radar (kept fresh by the SessionStart sync).

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadKnowledge, packageFindings, stackRow, buildDigest } from "../hooks/lib/knowledge.mjs";
import { findProject, loadRegistry } from "../hooks/lib/registry.mjs";

const [cmd, ...args] = process.argv.slice(2);
const plain = (s) => String(s || "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)").replace(/\*\*/g, "");

if (cmd === "digest") {
  const dir = path.resolve(args[0] || process.cwd());
  const project = findProject(loadRegistry({ committed: true }), dir);
  process.stdout.write(`${buildDigest(dir, project, { scriptPath: fileURLToPath(import.meta.url) })}\n`);
} else if (cmd === "check" && args.length) {
  const k = loadKnowledge();
  for (const raw of args) {
    const at = raw.lastIndexOf("@");
    const [name, spec] = at > 0 ? [raw.slice(0, at), raw.slice(at + 1)] : [raw, ""];
    const n = name.toLowerCase();
    console.log(`## ${name}${spec ? ` (requested ${spec})` : ""}`);
    const row = stackRow(k.stack, n);
    if (row) console.log(`- ASEN standard: use ${plain(row.use)}; latest seen ${plain(row["latest seen"])}. ${plain(row.notes)} [${row.source}, verified ${row.verified}]`);
    for (const f of packageFindings(k, { [n]: spec || (row ? "" : "") })) console.log(`- ${f}`);
    const tool = k.radar?.tools?.find((t) => [t.id, t.npm, t.name, ...t.aliases].filter(Boolean).some((a) => String(a).toLowerCase() === n));
    if (tool) console.log(`- Radar: ${tool.name} is "${tool.status}"${tool.best_challenger ? `; best challenger ${tool.best_challenger.name} (Replace Score ${tool.best_challenger.score}, ${tool.best_challenger.status})` : "; no challenger yet"}.`);
    const boards = Object.entries(k.radar?.leaderboards || {}).filter(([, b]) => b.top.some((t) => t.name.toLowerCase().includes(n)));
    for (const [cat, b] of boards) console.log(`- Leaderboard ${cat}: ${b.top.map((t) => `#${t.rank} ${t.name}`).join(", ")} (updated ${b.updated}).`);
    const model = k.models.find((m) => plain(m["api id"]).replace(/`/g, "").toLowerCase() === n || plain(m.model).toLowerCase() === n);
    if (model) console.log(`- Model: ${plain(model.model)} = ${plain(model["best for"])}; retirement not before ${model["retirement not before"]}.`);
    if (!row && !tool && !boards.length && !model) console.log("- Not in ASEN knowledge. Before using it: confirm it exists on the official registry, is maintained and widely used (core rule).");
  }
  console.log(`\nKnowledge as of: engineering knowledge/ + radar ${k.radar?.latest_brief || "(radar not synced)"}.`);
} else {
  console.log("usage: asen-knowledge.mjs check <package|tool>... | digest [folder]");
  process.exitCode = 1;
}
