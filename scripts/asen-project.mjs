#!/usr/bin/env node
// ASEN project registry tool. Usage: node scripts/asen-project.mjs <command> [args]
//
//   lookup [dir]          Show the registered profile for a folder (committed registry). Exit 1 if not registered.
//   account [dir]         Print only the GitHub account for a folder (used by `pgh`). Exit 1 if not registered.
//   validate              Check the working registry file for mistakes.
//   add '<json>'          Add one project to the working registry (defaults filled in). Does not commit.
//   remove <id>           Remove one project from the working registry. Does not commit.
//   sync                  Regenerate the git identity files from the COMMITTED registry.
//   whoami [dir]          Prove which identity git and gh will use in a folder (never prints tokens).
//   blocklist             Print words that must never appear in the public repo (client/personal names).
//
// Only `add`, `remove`, and `sync` write anything, and only to the registry file or to ~/.gitconfig-asen-* files.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  findProject, loadRegistry, noreplyEmail, normPath, registryFile, validateRegistry,
} from "../hooks/lib/registry.mjs";

const HOME = os.homedir().replace(/\\/g, "/");
const PROFILES = `${HOME}/.gitconfig-asen-profiles`;
const OLD_GLOB_SECTION = `includeIf.gitdir/i:${HOME}/Documents/AI_WORK/ASEN/asen-*/`; // Phase 0 rule, replaced by the registry

const [cmd, ...args] = process.argv.slice(2);
const today = () => new Date().toISOString().slice(0, 10);

function git(argv, opts = {}) {
  return execFileSync("git", argv, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], windowsHide: true, ...opts }).trim();
}
function tryGit(argv, opts) {
  try { return git(argv, opts); } catch { return ""; }
}
function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}
function readWorking() {
  const reg = loadRegistry({ committed: false });
  if (!reg) fail(`Registry not found or invalid JSON: ${registryFile()}`);
  return reg;
}
function writeWorking(reg) {
  const errs = validateRegistry(reg);
  if (errs.length) fail(`Registry not saved:\n- ${errs.join("\n- ")}`);
  writeFileSync(registryFile(), `${JSON.stringify(reg, null, 2)}\n`, "utf8");
}
function committedProject(dir) {
  const reg = loadRegistry({ committed: true });
  if (!reg) fail("Committed registry not readable (is the private repo cloned and committed?).");
  return { reg, project: findProject(reg, dir) };
}
function ghPath() {
  try {
    const found = execFileSync(process.platform === "win32" ? "where" : "which", ["gh"], { encoding: "utf8", windowsHide: true })
      .split(/\r?\n/).find(Boolean);
    if (found) return found.trim();
  } catch { /* fall back to bare name */ }
  return "gh";
}
async function tokenLogin(token) {
  if (!token) return null;
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "asen-project" }, signal: AbortSignal.timeout(10000),
    });
    return res.ok ? (await res.json()).login : null;
  } catch { return null; }
}

async function main() {
  switch (cmd) {
    case "lookup": {
      const { project } = committedProject(args[0] || process.cwd());
      if (!project) fail("not registered");
      process.stdout.write(`${JSON.stringify(project, null, 2)}\n`);
      break;
    }
    case "account": {
      const { project } = committedProject(args[0] || process.cwd());
      if (!project) fail("This folder is not in the ASEN registry. Run /add-project first.");
      if (project.automation === "off") fail(`Project "${project.id}" has automation "off".`);
      process.stdout.write(`${project.github_account}\n`);
      break;
    }
    case "validate": {
      const errs = validateRegistry(readWorking());
      if (errs.length) fail(`Registry problems:\n- ${errs.join("\n- ")}`);
      process.stdout.write("Registry is valid.\n");
      break;
    }
    case "add": {
      let entry;
      try { entry = JSON.parse(args[0] || ""); } catch { fail("add needs one JSON object argument"); }
      const reg = readWorking();
      if (reg.projects.some((p) => p.id === entry.id)) fail(`A project with id "${entry.id}" already exists.`);
      entry.path = String(entry.path || "").replace(/\\/g, "/").replace(/\/+$/, "");
      const isAsen = entry.owner === "asen";
      entry.automation ??= "rules-only"; // clients default to rules-only unless Aakash chooses higher
      entry.commit_identity ??= isAsen ? "noreply" : "keep-current";
      entry.plugin_scope ??= isAsen ? "project" : "local";
      entry.repos ??= [];
      entry.approved ??= today();
      reg.projects.push(entry);
      writeWorking(reg);
      process.stdout.write(`Added "${entry.id}" to the working registry. Commit it in the private repo, then run: sync\n`);
      break;
    }
    case "remove": {
      const reg = readWorking();
      const before = reg.projects.length;
      reg.projects = reg.projects.filter((p) => p.id !== args[0]);
      if (reg.projects.length === before) fail(`No project with id "${args[0]}".`);
      writeWorking(reg);
      process.stdout.write(`Removed "${args[0]}" from the working registry. Commit it in the private repo, then run: sync\n`);
      break;
    }
    case "sync": {
      const reg = loadRegistry({ committed: true });
      if (!reg) fail("Committed registry not readable; nothing changed.");
      const errs = validateRegistry(reg);
      if (errs.length) fail(`Committed registry is invalid; nothing changed:\n- ${errs.join("\n- ")}`);
      const gh = ghPath();
      const active = reg.projects.filter((p) => p.automation !== "off");

      // One login file per GitHub account; one noreply identity file per account that needs it.
      const accounts = new Set(active.map((p) => p.github_account));
      for (const a of accounts) {
        const f = `${HOME}/.gitconfig-acct-${a}`;
        rmSync(f, { force: true });
        git(["config", "--file", f, "--add", "credential.https://github.com.helper", ""]);
        git(["config", "--file", f, "--add", "credential.https://github.com.helper",
          `!f() { test "$1" = get || exit 0; echo username=${a}; echo "password=$('${gh}' auth token --user ${a})"; }; f`]);
        git(["config", "--file", f, "credential.https://github.com.username", a]);
      }
      for (const a of new Set(active.filter((p) => p.commit_identity === "noreply").map((p) => p.github_account))) {
        const f = `${HOME}/.gitconfig-id-${a}`;
        rmSync(f, { force: true });
        git(["config", "--file", f, "user.name", a]);
        git(["config", "--file", f, "user.email", noreplyEmail(reg, a)]);
      }

      // The generated list of per-project rules, included once from the global config.
      rmSync(PROFILES, { force: true });
      writeFileSync(PROFILES, "# Generated by asen-engineering/scripts/asen-project.mjs sync. Do not edit by hand.\n", "utf8");
      for (const p of active) {
        const key = `includeIf.gitdir/i:${p.path.replace(/\\/g, "/").replace(/\/+$/, "")}/.path`;
        git(["config", "--file", PROFILES, "--add", key, `${HOME}/.gitconfig-acct-${p.github_account}`]);
        if (p.commit_identity === "noreply") git(["config", "--file", PROFILES, "--add", key, `${HOME}/.gitconfig-id-${p.github_account}`]);
      }
      const includes = tryGit(["config", "--global", "--get-all", "include.path"]).split(/\r?\n/);
      if (!includes.includes(PROFILES)) git(["config", "--global", "--add", "include.path", PROFILES]);

      // One-time migration away from the old "ASEN\asen-* folder" rule.
      if (tryGit(["config", "--global", "--get", `${OLD_GLOB_SECTION}.path`])) {
        git(["config", "--global", "--remove-section", OLD_GLOB_SECTION]);
        rmSync(`${HOME}/.gitconfig-asen`, { force: true });
        process.stdout.write("Removed the old asen-* folder rule.\n");
      }
      process.stdout.write(`Synced git identity for ${active.length} project(s): ${active.map((p) => p.id).join(", ") || "none"}\n`);
      break;
    }
    case "whoami": {
      const dir = path.resolve(args[0] || process.cwd());
      const { reg, project } = committedProject(dir);
      const cfg = (k) => tryGit(["-C", dir, "config", k]);
      const fill = tryGit(["-C", dir, "credential", "fill"], {
        input: "protocol=https\nhost=github.com\n\n", env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
      });
      const pushLogin = await tokenLogin((/^password=(.*)$/m.exec(fill) || [])[1]);
      let ghLogin = null;
      if (project) {
        try {
          ghLogin = await tokenLogin(execFileSync("gh", ["auth", "token", "--user", project.github_account], { encoding: "utf8", windowsHide: true }).trim());
        } catch { /* reported as null */ }
      }
      const expectedEmail = project?.commit_identity === "noreply" ? noreplyEmail(reg, project.github_account) : "(unchanged)";
      const out = {
        folder: dir,
        project: project ? `${project.id} (owner ${project.owner}, automation ${project.automation})` : "NOT REGISTERED",
        expected_account: project?.github_account || null,
        commit_author: `${cfg("user.name")} <${cfg("user.email")}>`,
        expected_commit_email: expectedEmail,
        git_push_logs_in_as: pushLogin,
        gh_token_for_project_account: ghLogin,
      };
      process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
      break;
    }
    case "blocklist": {
      const reg = readWorking();
      const words = new Set();
      for (const p of reg.projects.filter((x) => x.owner !== "asen")) {
        if (p.owner.startsWith("client-")) words.add(p.owner.slice(7));
        words.add(p.id);
        words.add(p.name);
        words.add(path.basename(p.path));
        if (p.github_account !== "creativeasen") words.add(p.github_account);
        for (const r of p.repos) r.split("/").forEach((s) => s !== "creativeasen" && words.add(s));
      }
      const extra = path.join(path.dirname(registryFile()), "blocklist-extra.txt");
      if (existsSync(extra)) readFileSync(extra, "utf8").split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith("#")).forEach((s) => words.add(s));
      process.stdout.write(`${[...words].map((w) => w.toLowerCase()).filter((w) => w.length >= 3).sort().join("\n")}\n`);
      break;
    }
    default:
      fail("Commands: lookup, account, validate, add, remove, sync, whoami, blocklist");
  }
}

main().then(() => { process.exitCode ??= 0; }, (e) => { process.stderr.write(`${e.message}\n`); process.exitCode = 1; });
