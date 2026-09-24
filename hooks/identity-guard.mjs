#!/usr/bin/env node
// ASEN identity guard (PreToolUse, Bash|PowerShell). Read-only: it never changes files or settings.
// Blocks `git push` and GitHub write commands unless they run as creativeasen against a creativeasen repo.
// Exit 0 = allow, exit 2 = block (reason on stderr). Any other command passes through untouched.

import { execFileSync } from "node:child_process";
import path from "node:path";

const OWNER = "creativeasen";
const NOREPLY_SUFFIX = "+creativeasen@users.noreply.github.com"; // GitHub noreply form: <id>+<login>@...
const REMOTE = process.env.CLAUDE_CODE_REMOTE === "true";

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
  return execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"], timeout: 15000 }).trim();
}

function unquote(s) {
  return s ? s.replace(/^["']|["']$/g, "") : s;
}

function toPosix(p) {
  return p.replace(/\\/g, "/").replace(/^\/([a-zA-Z])\//, (_, d) => `${d.toUpperCase()}:/`);
}

function isAsenFolder(dir) {
  return /\/Documents\/AI_WORK\/ASEN\/asen-[^/]+(\/|$)/i.test(toPosix(dir));
}

function ownerOf(url) {
  const m = /github\.com[/:]([^/]+)\//i.exec(url || "");
  return m ? m[1] : null;
}

async function tokenLogin(token) {
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "asen-identity-guard" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  return (await res.json()).login;
}

// Directory the command targets: `git -C <dir>`, else the last `cd <dir>` before it, else the hook cwd.
function targetDir(command, matchIndex, explicitC, cwd) {
  if (explicitC) return path.resolve(cwd, unquote(explicitC));
  const before = command.slice(0, matchIndex);
  const cds = [...before.matchAll(/(?:^|[;&|\n]\s*)(?:cd|Set-Location|pushd)\s+("[^"]+"|'[^']+'|[^\s;&|]+)/g)];
  if (cds.length) return path.resolve(cwd, unquote(cds[cds.length - 1][1]));
  return cwd;
}

async function checkGitPush(command, m, cwd) {
  if (/\s-c\s/.test(m[0]) || /\bGIT_(CONFIG|ASKPASS|AUTHOR|COMMITTER|SSH)\w*\s*=/i.test(command)) {
    block("git push with one-off config or identity overrides (-c / GIT_* variables) is not allowed.");
  }
  const dir = targetDir(command, m.index, m[1], cwd);
  if (!REMOTE && !isAsenFolder(dir)) block(`push from outside an ASEN asen-* folder (${toPosix(dir)}).`);
  const rest = command.slice(m.index + m[0].length).split(/[;&|\n]/)[0];
  const remoteName = (rest.trim().split(/\s+/).find((a) => a && !a.startsWith("-"))) || "origin";
  let url;
  try { url = run("git", ["remote", "get-url", "--push", remoteName], dir); }
  catch { url = remoteName; } // push straight to a URL
  if ((ownerOf(url) || "").toLowerCase() !== OWNER) block(`push target "${url}" is not a ${OWNER} repo.`);
  if (REMOTE) return; // cloud sessions push through Anthropic's GitHub proxy; owner check is what we can verify there
  let email;
  try { email = run("git", ["config", "user.email"], dir); } catch { email = ""; }
  if (!email.toLowerCase().endsWith(NOREPLY_SUFFIX)) block(`commit email here is "${email}", expected the ${OWNER} GitHub noreply email.`);
  let token = "";
  try {
    const out = execFileSync("git", ["credential", "fill"], {
      cwd: dir, input: "protocol=https\nhost=github.com\n\n", encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"], timeout: 15000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
    });
    token = (/^password=(.*)$/m.exec(out) || [])[1] || "";
  } catch { /* handled below */ }
  const login = token ? await tokenLogin(token).catch(() => null) : null;
  if ((login || "").toLowerCase() !== OWNER) block(`git would authenticate as "${login || "unknown"}", not ${OWNER}.`);
}

async function checkGh(command, m, cwd) {
  const segment = command.slice(m.index).split(/[;&|\n]/)[0];
  const args = segment.trim().split(/\s+/).slice(1).map(unquote);
  const [group, sub] = args;
  if (group === "auth" && /^(login|logout|switch|refresh|setup-git)$/.test(sub || "")) {
    block(`"gh auth ${sub}" changes the global GitHub account. The global default account must not change.`);
  }
  let isWrite = GH_WRITES[group]?.test(sub || "") ?? false;
  if (group === "api") {
    const method = (/(?:-X|--method)[\s=]+(\w+)/i.exec(segment) || [])[1];
    const hasFields = /\s(-f|-F|--field|--raw-field|--input)[\s=]/.test(segment);
    isWrite = method ? method.toUpperCase() !== "GET" : hasFields;
  }
  if (!isWrite) return;

  // Target repo owner: --repo/-R, an api path, `repo create owner/name`, or the folder's origin remote.
  const repoFlag = (/(?:-R|--repo)[\s=]+("[^"]+"|'[^']+'|\S+)/.exec(segment) || [])[1];
  let owner = null;
  if (repoFlag) owner = unquote(repoFlag).replace(/^https?:\/\/github\.com\//i, "").split("/")[0];
  else if (group === "api") {
    const ep = args.slice(1).find((a) => !a.startsWith("-") && /\//.test(a)) || "";
    const em = /^\/?(?:repos|orgs)\/([^/]+)/.exec(ep);
    owner = em ? em[1] : OWNER; // user/..., graphql etc. act on the token's own account
  } else if (group === "repo" && sub === "create") {
    const name = args.slice(2).find((a) => !a.startsWith("-")) || "";
    owner = name.includes("/") ? name.split("/")[0] : OWNER;
  } else if (group === "gist") owner = OWNER;
  else {
    const dir = targetDir(command, m.index, null, cwd);
    try { owner = ownerOf(run("git", ["remote", "get-url", "origin"], dir)); } catch { owner = null; }
  }
  if ((owner || "").toLowerCase() !== OWNER) block(`gh would write to "${owner || "an unknown repo"}", which is not ${OWNER}.`);
  if (REMOTE) return;

  const tokenFromKeyring = /GH_TOKEN\s*=\s*(?:\$\(|\()\s*gh(?:\.exe)?\s+auth\s+token\s+--user\s+creativeasen\s*\)/i;
  if (!tokenFromKeyring.test(command.slice(0, m.index + segment.length))) {
    block(`gh write without the ${OWNER} token. Prefix it with: GH_TOKEN=$(gh auth token --user ${OWNER}) gh ...`);
  }
  let token = "";
  try { token = run("gh", ["auth", "token", "--user", OWNER], cwd); } catch { /* handled below */ }
  const login = token ? await tokenLogin(token).catch(() => null) : null;
  if ((login || "").toLowerCase() !== OWNER) block(`the ${OWNER} token in the keyring resolves to "${login || "nothing"}".`);
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
  const gh = /(?:^|[\s;&|(])gh(?:\.exe)?\s+[a-z]/g;
  for (const m of command.matchAll(gh)) {
    const start = m.index + m[0].indexOf("gh");
    await checkGh(command, { index: start }, cwd);
  }
}

// Set exitCode instead of calling process.exit(): exiting while fetch sockets close crashes Node on Windows.
main().then(() => { process.exitCode = 0; }, (e) => {
  const reason = e instanceof Blocked ? e.message : `guard error (${e.message}); failing closed for GitHub writes.`;
  process.stderr.write(`ASEN identity guard blocked this command: ${reason}
` +
    `Rule 0: GitHub writes from ASEN work must run as ${OWNER} on ${OWNER} repos. See README "Two identities".
`);
  process.exitCode = 2;
});
