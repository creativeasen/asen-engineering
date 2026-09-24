#!/usr/bin/env node
// CI: every fact row in knowledge/ tables must cite an allowlisted official source URL and a "Verified" date.
// Checks stack.md, models.md, and security-watchlist.md. lessons.md and sources.md are not fact tables.

import { readFileSync } from "node:fs";

const FILES = ["knowledge/stack.md", "knowledge/models.md", "knowledge/security-watchlist.md"];

// Allowed domains = every domain named in knowledge/sources.md.
const sources = readFileSync("knowledge/sources.md", "utf8");
const allowed = new Set([...sources.matchAll(/\b((?:[a-z0-9-]+\.)+[a-z]{2,})(?=[\s/,|`)]|$)/gi)].map((m) => m[1].toLowerCase()));

const problems = [];
for (const file of FILES) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  let header = null;
  lines.forEach((line, i) => {
    if (!line.trim().startsWith("|")) { header = null; return; }
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.every((c) => /^:?-{3,}:?$/.test(c))) return; // separator row
    if (!header) { header = cells.map((c) => c.toLowerCase()); return; }
    const where = `${file}:${i + 1}`;
    const vIdx = header.indexOf("verified");
    const sIdx = header.indexOf("source");
    if (vIdx === -1 || sIdx === -1) { problems.push(`${where}: table needs "Source" and "Verified" columns`); return; }
    const date = cells[vIdx] || "";
    const url = (/(https:\/\/[^\s|)`]+)/.exec(cells[sIdx] || "") || [])[1];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) problems.push(`${where}: "Verified" must be a YYYY-MM-DD date`);
    else if (new Date(date) > new Date(Date.now() + 86400000)) problems.push(`${where}: "Verified" date is in the future`);
    if (!url) { problems.push(`${where}: "Source" must be an https URL`); return; }
    const host = new URL(url).hostname.toLowerCase();
    if (![...allowed].some((d) => host === d || host.endsWith(`.${d}`))) problems.push(`${where}: ${host} is not in knowledge/sources.md`);
  });
}

if (problems.length) {
  console.error(`Knowledge check failed (${problems.length}):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("Knowledge check passed: every fact row has an allowlisted source URL and a Verified date.");
