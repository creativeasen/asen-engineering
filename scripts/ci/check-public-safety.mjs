#!/usr/bin/env node
// CI: the public repo must contain no email addresses and no blocklisted words (client names, personal
// project names, private repo names). The blocklist comes from the PUBLIC_BLOCKLIST secret, never from the repo.
// Matches are reported by file:line and term NUMBER only, because CI logs of a public repo are public.
// Usage: node scripts/ci/check-public-safety.mjs [base-sha]   (with base-sha, also checks the PR's commit emails)

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ALLOWED_EMAIL = /@(users\.noreply\.github\.com|example\.(com|org)|anthropic\.com)$|^git@github\.com$/i;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const SKIP = /\.(png|jpe?g|gif|ico|pdf|zip|gz|woff2?)$/i;

const blocklist = (process.env.PUBLIC_BLOCKLIST || "").split(/\r?\n/).map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 3);
const problems = [];

if (!blocklist.length) problems.push("PUBLIC_BLOCKLIST secret is missing or empty; failing closed.");

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter((f) => f && !SKIP.test(f));
for (const f of files) {
  let text;
  try { text = readFileSync(f, "utf8"); } catch { continue; }
  text.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(EMAIL)) {
      if (!ALLOWED_EMAIL.test(m[0])) problems.push(`${f}:${i + 1}: email address found`);
    }
    const low = line.toLowerCase();
    blocklist.forEach((w, n) => { if (low.includes(w)) problems.push(`${f}:${i + 1}: blocklisted term #${n + 1} found`); });
  });
  const lowPath = f.toLowerCase();
  blocklist.forEach((w, n) => { if (lowPath.includes(w)) problems.push(`${f}: blocklisted term #${n + 1} in file path`); });
}

// Commit author/committer emails and messages in the PR must be clean too.
const base = process.argv[2];
if (base) {
  const log = execFileSync("git", ["log", "--format=%ae%n%ce%n%B%n--END--", `${base}..HEAD`], { encoding: "utf8" });
  for (const m of log.matchAll(EMAIL)) if (!ALLOWED_EMAIL.test(m[0])) problems.push("a commit in this PR uses or mentions a non-noreply email");
  const low = log.toLowerCase();
  blocklist.forEach((w, n) => { if (low.includes(w)) problems.push(`a commit message in this PR contains blocklisted term #${n + 1}`); });
}

if (problems.length) {
  console.error(`Public-repo safety check failed (${problems.length}):\n- ${[...new Set(problems)].join("\n- ")}`);
  process.exit(1);
}
console.log(`Public-repo safety check passed (${files.length} files, ${blocklist.length} blocklisted terms, no emails).`);
