#!/usr/bin/env node
// ASEN identity guard (PreToolUse, Bash|PowerShell). Read-only: it never changes files or settings.
// Before `git push` or a GitHub write command, it looks up the project for the target folder in the private
// registry (committed copy) and blocks unless the push/write uses exactly that project's GitHub account and
// targets one of that project's repos. Exit 0 = allow, exit 2 = block (reason on stderr).

import { execFileSync } from "node:child_process";
import path from "node:path";
import { findProject, loadRegistry, noreplyEmail, ownerRepoFromUrl, repoAllowed } from "./lib/registry.mjs";

const REMOTE = process.env.CLAUDE_CODE_REMOTE === "true";
const CLOUD_OWNER = "creativeasen"; // cloud routines only ever run on ASEN repos
// Unattended jobs (scheduled audits) set ASEN_AUTOMATION=1; they are held to the project's automation level.
const UNATTENDED = process.env.ASEN_AUTOMATION === "1";

const GH_WRITES = {
  pr: /^(create|merge|edit|close|reopen|comment|review|ready|lock|unlock|update-branch)$/,
  issue: /^(create|edit|close|reopen|comment|delete|transfer|lock|unlock|pin|unpin|develop)$/,
  repo: /^(create|edit|delete|fork|rename|archive|unarchive|sync|deploy-key)$/,
  release: /^(create|edit|delete|upload|delete-asset)$/,
  label: /^(create|edit|delete|clone)$/,
  secret: /^(set|delete|remove)$/,
  variable: /^(set|delete|remove)$/,
  workflow: /^(run|enable|disable)$/,
  run: /^(rerun|cancel|delete)$/,
  gist: /^(create|edit|delete|rename)$/,
  cache: /^(delete)$/,
  ruleset: /^(create|edit|delete)$/,
};

class Blocked extends Error {}
function block(reason) {
  throw new Blocked(reason);
}

function run(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"], timeout: 15000, windowsHide: true }).trim();
}
function unquote(s) {
  return s ? s.replace(/^["']|["']$/g, "") : s;
}

async function tokenLogin(token) {
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "asen-identity-guard" },
    signal: AbortSignal.timeout(10000),
  });
  return res.ok ? (await res.json()).login : null;
}

// Directory the command targets: `git -C <dir>`, else the last `cd <dir>` before it, else the hook cwd.
function targetDir(command, matchIndex, explicitC, cwd) {
  if (explicitC) return path.resolve(cwd, unquote(explicitC));
  const before = command.slice(0, matchIndex);
  const cds = [...before.matchAll(/(?:^|[;&|\n]\s*)(?:cd|Set-Location|pushd)\s+("[^"]+"|'[^']+'|[^\s;&|]+)/g)];
  if (cds.length) return path.resolve(cwd, unquote(cds[cds.length - 1][1]));
  return cwd;
}

let registry; // loaded once, lazily
function projectFor(dir) {
  registry ??= loadRegistry({ committed: true });
  if (!registry) block("the ASEN project registry can't be read (private repo missing or not committed); failing closed.");
  const project = findProject(registry, dir);
  if (!project) block(`"${dir.replace(/\\/g, "/")}" is not a registered project. Run /add-project first (with Aakash's approval).`);
  if (project.automation === "off") block(`project "${project.id}" has automation "off".`);
  return project;
}

async function checkGitPush(command, m, cwd) {
  if (/\s-c\s/.test(m[0]) || /\bGIT_(CONFIG|ASKPASS|AUTHOR|COMMITTER|SSH)\w*\s*=/i.test(command)) {
    block("git push with one-off config or identity overrides (-c / GIT_* variables) is not allowed.");
  }
  const dir = targetDir(command, m.index, m[1], cwd);
  const rest = command.slice(m.index + m[0].length).split(/[;&|\n]/)[0];
  const remoteName = rest.trim().split(/\s+/).find((a) => a && !a.startsWith("-")) || "origin";
  let url;
  try { url = run("git", ["remote", "get-url", "--push", remoteName], dir); } catch { url = remoteName; }
  const target = ownerRepoFromUrl(url);

  if (REMOTE) {
    if ((target || "").split("/")[0].toLowerCase() !== CLOUD_OWNER) block(`cloud push target "${url}" is not a ${CLOUD_OWNER} repo.`);
    return;
  }
  const project = projectFor(dir);
  if (UNATTENDED && project.automation !== "prs") block(`unattended push not allowed: project "${project.id}" automation is "${project.automation}".`);
  if (!target || !repoAllowed(project, target)) block(`push target "${url}" is not one of project "${project.id}"'s repos (${project.repos.join(", ")}).`);

  if (project.commit_identity === "noreply") {
    let email = "";
    try { email = run("git", ["config", "user.email"], dir); } catch { /* empty */ }
    const expected = noreplyEmail(registry, project.github_account);
    if (email.toLowerCase() !== String(expected).toLowerCase()) block(`commit email here is "${email}", expected ${project.github_account}'s GitHub noreply email.`);
  }
  let token = "";
  try {
    const out = execFileSync("git", ["credential", "fill"], {
      cwd: dir, input: "protocol=https\nhost=github.com\n\n", encoding: "utf8", stdio: ["pipe", "pipe", "ignore"],
      timeout: 15000, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
    });
    token = (/^password=(.*)$/m.exec(out) || [])[1] || "";
  } catch { /* handled below */ }
  const login = token ? await tokenLogin(token).catch(() => null) : null;
  if ((login || "").toLowerCase() !== project.github_account.toLowerCase()) {
    block(`git would log in as "${login || "unknown"}", but project "${project.id}" must use ${project.github_account}.`);
  }
}

async function checkGh(command, start, viaPgh, cwd) {
  const segment = command.slice(start).split(/[;&|\n]/)[0];
  const args = segment.trim().split(/\s+/).slice(1).map(unquote);
  const [group, sub] = args;
  if (group === "auth" && /^(login|logout|switch|refresh|setup-git)$/.test(sub || "")) {
    block(`"gh auth ${sub}" changes the global GitHub account. The global default must never change.`);
  }
  let isWrite = GH_WRITES[group]?.test(sub || "") ?? false;
  if (group === "api") {
    const method = (/(?:-X|--method)[\s=]+(\w+)/i.exec(segment) || [])[1];
    const hasFields = /\s(-f|-F|--field|--raw-field|--input)[\s=]/.test(segment);
    isWrite = method ? method.toUpperCase() !== "GET" : hasFields;
  }
  if (!isWrite) return;

  const dir = targetDir(command, start, null, cwd);
  // Target repo: --repo/-R, an api path, `repo create owner/name`, or the folder's origin remote.
  const repoFlag = (/(?:-R|--repo)[\s=]+("[^"]+"|'[^']+'|\S+)/.exec(segment) || [])[1];
  let target = null;
  let ownerOnly = null;
  if (repoFlag) target = unquote(repoFlag).replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "");
  else if (group === "api") {
    const ep = args.slice(1).find((a) => !a.startsWith("-") && a.includes("/")) || "";
    const em = /^\/?repos\/([^/]+)\/([^/?]+)/.exec(ep);
    if (em) target = `${em[1]}/${em[2]}`;
    else ownerOnly = true; // user/..., graphql: acts only on the token's own account
  } else if (group === "repo" && sub === "create") {
    const name = args.slice(2).find((a) => !a.startsWith("-")) || "";
    target = name.includes("/") ? name : null;
    if (!target) ownerOnly = true;
  } else if (group === "gist") ownerOnly = true;
  else {
    try { target = ownerRepoFromUrl(run("git", ["remote", "get-url", "origin"], dir)); } catch { target = null; }
  }

  if (REMOTE) {
    if (target && target.split("/")[0].toLowerCase() !== CLOUD_OWNER) block(`gh would write to "${target}", which is not a ${CLOUD_OWNER} repo.`);
    return;
  }
  const project = projectFor(dir);
  if (UNATTENDED) {
    const allowed = project.automation === "prs" ? /^(pr|issue|label)$/ : project.automation === "issues" ? /^(issue)$/ : null;
    if (!allowed || !allowed.test(group)) block(`unattended "gh ${group} ${sub}" not allowed: project "${project.id}" automation is "${project.automation}".`);
  }
  if (target && !repoAllowed(project, target)) block(`gh would write to "${target}", which is not one of project "${project.id}"'s repos.`);
  if (!target && !ownerOnly) block("can't tell which repo this gh command writes to; add --repo owner/name.");
  if (ownerOnly && group === "repo") {
    block(`creating a repo needs the full name (owner/name) listed in project "${project.id}"'s repos first.`);
  }

  if (!viaPgh) {
    const acct = project.github_account.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tokenFromKeyring = new RegExp(`GH_TOKEN\\s*=\\s*(?:\\$\\(|\\()\\s*gh(?:\\.exe)?\\s+auth\\s+token\\s+--user\\s+${acct}\\s*\\)`, "i");
    if (!tokenFromKeyring.test(command.slice(0, start + segment.length))) {
      block(`gh write without ${project.github_account}'s token. Use: pgh ${group} ${sub} ... (or GH_TOKEN=$(gh auth token --user ${project.github_account}) gh ...)`);
    }
  }
  let token = "";
  try { token = run("gh", ["auth", "token", "--user", project.github_account], cwd); } catch { /* handled below */ }
  const login = token ? await tokenLogin(token).catch(() => null) : null;
  if ((login || "").toLowerCase() !== project.github_account.toLowerCase()) {
    block(`the keyring token for ${project.github_account} resolves to "${login || "nothing"}".`);
  }
}

async function main() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try { input = JSON.parse(raw); } catch { return; }
  const command = input?.tool_input?.command;
  if (typeof command !== "string") return;
  const cwd = input.cwd || process.cwd();

  const gitPush = /\bgit(?:\.exe)?(?:\s+-C\s+("[^"]+"|'[^']+'|\S+)|\s+-c\s+\S+|\s+--[\w-]+(?:=\S+)?)*\s+push\b/g;
  for (const m of command.matchAll(gitPush)) await checkGitPush(command, m, cwd);
  for (const m of command.matchAll(/(?:^|[\s;&|(])(p?gh)(?:\.exe)?\s+[a-z]/g)) {
    const start = m.index + m[0].indexOf(m[1]);
    await checkGh(command, start, m[1] === "pgh", cwd);
  }
}

// Set exitCode instead of calling process.exit(): exiting while fetch sockets close crashes Node on Windows.
main().then(() => { process.exitCode = 0; }, (e) => {
  const reason = e instanceof Blocked ? e.message : `guard error (${e.message}); failing closed for GitHub writes.`;
  process.stderr.write(`ASEN identity guard blocked this command: ${reason}\n` +
    "Rule 0: each project uses only its registered GitHub account and repos. See README \"Project Profiles\".\n");
  process.exitCode = 2;
});
