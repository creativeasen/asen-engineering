#!/usr/bin/env node
// CI: pull request gate for asen-engineering. Always run from the BASE branch code, never the PR's code.
//
//   node scripts/ci/pr-gate.mjs risk-gate <pr-number>   Decide the risk tier, fix labels, post the "risk-gate"
//                                                        commit status, then try to auto-merge.
//   node scripts/ci/pr-gate.mjs automerge <head-sha>     After CI finishes: try to auto-merge the PR for that commit.
//   node scripts/ci/pr-gate.mjs tier <file>...           Print the path-based tier for files (local testing).
//
// Tiers follow policy/risk-tiers.md. The effective tier is the higher of the path tier and the tier:* label.
// The "risk-gate" status is success only when the PR may merge: LOW/MEDIUM need the `ai-verified` label; HIGH needs
// the human account (creativeasen) to approve the latest commit with a real GitHub review. GitHub's ruleset also
// requires a Code Owner review for high-risk paths, so this script is not the only lock.

const API = process.env.GITHUB_API_URL || "https://api.github.com";
const REPO = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.GITHUB_TOKEN;
const HUMAN = (process.env.ASEN_HUMAN || "creativeasen").toLowerCase();
const BOT = (process.env.ASEN_BOT || "asenbot").toLowerCase();
const REQUIRED_CHECK_RUNS = ["repo-ci", "public-safety"];
const TIER = { low: 1, medium: 2, high: 3 };
const TIER_NAME = { 1: "low", 2: "medium", 3: "high" };

export function pathTier(file) {
  const f = file.replace(/\\/g, "/");
  if (f.startsWith("templates/")) return TIER.medium;
  if (/^(policy|hooks|scripts|bin|\.claude-plugin|\.claude|\.github)\//.test(f)) return TIER.high;
  if (["core/CLAUDE.md", "agents/knowledge-verifier.md", "knowledge/sources.md"].includes(f)) return TIER.high;
  if (/\.(js|mjs|cjs|ts|py|sh|ps1)$/i.test(f)) return TIER.high;
  if (/^(skills|commands|agents|routines)\//.test(f) || f === "knowledge/models.md") return TIER.medium;
  if (/^knowledge\/(stack|security-watchlist|lessons)\.md$/.test(f) || /^(README|CHANGELOG)\.md$/.test(f) || f.startsWith("digests/")) {
    return TIER.low;
  }
  return TIER.high; // anything unexpected (config files, new folders) is HIGH
}

async function gh(method, path, body, { allow = [] } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "asen-pr-gate",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && !allow.includes(res.status)) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : { status: res.status, data: await res.json().catch(() => null) };
}
async function all(path) {
  const out = [];
  for (let page = 1; page < 50; page++) {
    const { data } = await gh("GET", `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    const items = Array.isArray(data) ? data : data.check_runs || [];
    out.push(...items);
    if (items.length < 100) break;
  }
  return out;
}

async function evaluate(number) {
  const pr = (await gh("GET", `/repos/${REPO}/pulls/${number}`)).data;
  const files = await all(`/repos/${REPO}/pulls/${number}/files`);
  const pTier = Math.max(TIER.low, ...files.flatMap((f) => [f.filename, f.previous_filename].filter(Boolean).map(pathTier)));
  const labels = pr.labels.map((l) => l.name);
  const lTier = Math.max(0, ...labels.filter((l) => l.startsWith("tier:")).map((l) => TIER[l.slice(5)] || 0));
  const author = pr.user.login.toLowerCase();
  const external = ![HUMAN, BOT].includes(author) || pr.head.repo?.full_name !== REPO;
  const tier = Math.max(pTier, lTier);

  const reviews = await all(`/repos/${REPO}/pulls/${number}/reviews`);
  const humanReviews = reviews.filter((r) => r.user?.login?.toLowerCase() === HUMAN && ["APPROVED", "CHANGES_REQUESTED", "DISMISSED"].includes(r.state));
  const lastHuman = humanReviews[humanReviews.length - 1];
  const humanApproved = lastHuman?.state === "APPROVED" && lastHuman.commit_id === pr.head.sha;

  let state = "success";
  let description;
  if (external) { state = "failure"; description = "External contributor: never auto-merged."; }
  else if (!lTier) { state = "failure"; description = "Needs a tier:low, tier:medium, or tier:high label."; }
  else if (tier === TIER.high && !humanApproved) { state = "failure"; description = `HIGH risk: waiting for ${HUMAN} to approve the latest commit.`; }
  else if (tier <= TIER.medium && !labels.includes("ai-verified")) { state = "failure"; description = "Waiting for the PR Verifier (ai-verified label)."; }
  else description = `Tier ${TIER_NAME[tier]}${tier === TIER.high ? ", approved by " + HUMAN : ""}.`;

  return { pr, files, labels, pTier, lTier, tier, external, humanApproved, state, description };
}

async function syncLabels(ev) {
  const { pr, labels } = ev;
  const add = [];
  const remove = [];
  if (ev.external && !labels.includes("external")) add.push("external");
  if (ev.lTier && ev.lTier < ev.pTier) { // correct an under-labelled PR upward, never downward
    add.push(`tier:${TIER_NAME[ev.pTier]}`);
    remove.push(...labels.filter((l) => l.startsWith("tier:") && TIER[l.slice(5)] < ev.pTier));
  }
  if (ev.tier === TIER.high && !ev.humanApproved && !labels.includes("needs-aakash")) add.push("needs-aakash");
  if (ev.humanApproved && labels.includes("needs-aakash")) remove.push("needs-aakash");
  if (add.length) await gh("POST", `/repos/${REPO}/issues/${pr.number}/labels`, { labels: add });
  for (const l of remove) await gh("DELETE", `/repos/${REPO}/issues/${pr.number}/labels/${encodeURIComponent(l)}`, null, { allow: [404] });
  if (add.length || remove.length) console.log(`labels: +[${add}] -[${remove}]`);
}

async function postStatus(sha, state, description) {
  await gh("POST", `/repos/${REPO}/statuses/${sha}`, { state, context: "risk-gate", description: description.slice(0, 140) });
}

async function checksGreen(sha) {
  const runs = await all(`/repos/${REPO}/commits/${sha}/check-runs`);
  for (const name of REQUIRED_CHECK_RUNS) {
    const latest = runs.filter((r) => r.name === name).sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0];
    if (!latest || latest.status !== "completed" || latest.conclusion !== "success") return `${name} is ${latest ? latest.conclusion || latest.status : "missing"}`;
  }
  const { data } = await gh("GET", `/repos/${REPO}/commits/${sha}/status`);
  const gate = data.statuses.find((s) => s.context === "risk-gate");
  if (gate?.state !== "success") return `risk-gate is ${gate?.state || "missing"}`;
  return null;
}

async function tryMerge(number) {
  const ev = await evaluate(number);
  const { pr } = ev;
  if (pr.state !== "open" || pr.draft) return console.log(`#${number}: not open or draft; not merging.`);
  if (ev.state !== "success") return console.log(`#${number}: gate not passed (${ev.description}); not merging.`);
  const pending = await checksGreen(pr.head.sha);
  if (pending) return console.log(`#${number}: waiting (${pending}).`);
  const res = await gh("PUT", `/repos/${REPO}/pulls/${number}/merge`, { merge_method: "squash", sha: pr.head.sha }, { allow: [405, 409, 422] });
  if (res.status !== 200) return console.log(`#${number}: GitHub refused the merge (${res.status}): ${res.data?.message}`);
  const tag = `merge-${number}`;
  await gh("POST", `/repos/${REPO}/git/refs`, { ref: `refs/tags/${tag}`, sha: res.data.sha }, { allow: [422] });
  console.log(`#${number}: merged (${TIER_NAME[ev.tier]}) as ${res.data.sha.slice(0, 7)} and tagged ${tag}.`);
}

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "tier") {
    for (const f of args) console.log(`${TIER_NAME[pathTier(f)].padEnd(6)} ${f}`);
    return;
  }
  if (!REPO || !TOKEN) throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required");
  if (mode === "risk-gate") {
    const ev = await evaluate(Number(args[0]));
    await syncLabels(ev);
    await postStatus(ev.pr.head.sha, ev.state, ev.description);
    console.log(`#${ev.pr.number}: risk-gate ${ev.state}: ${ev.description}`);
    if (ev.state === "success") await tryMerge(ev.pr.number);
  } else if (mode === "automerge") {
    const { data } = await gh("GET", `/repos/${REPO}/commits/${args[0]}/pulls`);
    for (const pr of (data || []).filter((p) => p.state === "open" && p.head.sha === args[0])) await tryMerge(pr.number);
  } else {
    throw new Error("usage: pr-gate.mjs risk-gate <pr> | automerge <sha> | tier <file>...");
  }
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; });
