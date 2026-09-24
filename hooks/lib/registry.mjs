// Shared, read-only access to the private project registry.
// The registry lives in the private repo (registry/projects.json). Safety checks read the COMMITTED copy
// (`git show HEAD:...`), so an uncommitted edit can never widen what a session is allowed to do.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const OWNER_TYPES = /^(asen|personal|client-[a-z0-9][a-z0-9-]{0,40})$/;
export const AUTOMATION_LEVELS = ["off", "rules-only", "audit-readonly", "issues", "prs"];
export const COMMIT_IDENTITIES = ["noreply", "keep-current"];

export function registryFile() {
  return process.env.ASEN_REGISTRY ||
    path.join(os.homedir(), "Documents", "AI_WORK", "ASEN", "asen-engineering-private", "registry", "projects.json");
}

// Normalized, case-insensitive, forward-slash path without a trailing slash (Windows paths are case-insensitive).
export function normPath(p) {
  let s = String(p || "").replace(/\\/g, "/");
  s = s.replace(/^\/([a-zA-Z])\//, (_, d) => `${d}:/`); // Git Bash /c/... -> c:/...
  return s.replace(/\/+$/, "").toLowerCase();
}

// { committed: true } reads HEAD of the private repo (used by safety checks); false reads the working file.
export function loadRegistry({ committed = true } = {}) {
  const file = registryFile();
  let text;
  if (committed) {
    const repo = path.dirname(path.dirname(file));
    const rel = path.relative(repo, file).replace(/\\/g, "/");
    try {
      text = execFileSync("git", ["-C", repo, "show", `HEAD:${rel}`], {
        encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 10000, windowsHide: true,
      });
    } catch {
      return null;
    }
  } else {
    if (!existsSync(file)) return null;
    text = readFileSync(file, "utf8");
  }
  try {
    const reg = JSON.parse(text);
    return Array.isArray(reg.projects) ? reg : null;
  } catch {
    return null;
  }
}

// The registered project whose folder contains `dir` (longest matching path wins).
export function findProject(reg, dir) {
  if (!reg) return null;
  const d = normPath(dir);
  let best = null;
  for (const p of reg.projects) {
    const root = normPath(p.path);
    if ((d === root || d.startsWith(`${root}/`)) && (!best || root.length > normPath(best.path).length)) best = p;
  }
  return best;
}

export function repoAllowed(project, ownerRepo) {
  const want = String(ownerRepo || "").replace(/\.git$/i, "").toLowerCase();
  return (project.repos || []).some((r) => r.toLowerCase() === want);
}

// "owner/repo" from an https or ssh GitHub URL, or null.
export function ownerRepoFromUrl(url) {
  const m = /github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i.exec(String(url || "").trim());
  return m ? `${m[1]}/${m[2]}` : null;
}

export function noreplyEmail(reg, account) {
  const id = reg?.accounts?.[account]?.id;
  return id ? `${id}+${account}@users.noreply.github.com` : null;
}

// Returns a list of problems; empty means the registry is valid.
export function validateRegistry(reg) {
  const errs = [];
  if (!reg || !Array.isArray(reg.projects)) return ["registry must be an object with a projects array"];
  const ids = new Set();
  const paths = new Set();
  for (const [i, p] of reg.projects.entries()) {
    const at = `projects[${i}] (${p.id || "no id"})`;
    if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(p.id || "")) errs.push(`${at}: id must be lowercase letters, digits, hyphens`);
    if (ids.has(p.id)) errs.push(`${at}: duplicate id`);
    ids.add(p.id);
    if (!p.name) errs.push(`${at}: name is required`);
    if (!p.path || !path.isAbsolute(p.path)) errs.push(`${at}: path must be an absolute folder path`);
    if (paths.has(normPath(p.path))) errs.push(`${at}: another project already uses this folder`);
    paths.add(normPath(p.path));
    if (!OWNER_TYPES.test(p.owner || "")) errs.push(`${at}: owner must be asen, personal, or client-<name>`);
    if (!p.github_account) errs.push(`${at}: github_account is required`);
    if (!Array.isArray(p.repos) || p.repos.some((r) => !/^[\w.-]+\/[\w.-]+$/.test(r))) errs.push(`${at}: repos must be a list of owner/repo`);
    if (!AUTOMATION_LEVELS.includes(p.automation)) errs.push(`${at}: automation must be one of ${AUTOMATION_LEVELS.join(", ")}`);
    if (!COMMIT_IDENTITIES.includes(p.commit_identity)) errs.push(`${at}: commit_identity must be noreply or keep-current`);
    if (p.commit_identity === "noreply" && !reg.accounts?.[p.github_account]?.id) errs.push(`${at}: accounts.${p.github_account}.id is needed for noreply`);
    if (!["project", "local"].includes(p.plugin_scope)) errs.push(`${at}: plugin_scope must be project or local`);
    if (p.owner !== "asen" && p.plugin_scope !== "local") errs.push(`${at}: client and personal projects must use plugin_scope local`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.approved || "")) errs.push(`${at}: approved must be the approval date YYYY-MM-DD`);
  }
  return errs;
}
