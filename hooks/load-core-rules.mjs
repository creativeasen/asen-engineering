#!/usr/bin/env node
// SessionStart: print core/CLAUDE.md so Claude Code adds it to context (plugins can't ship CLAUDE.md directly).
// Read-only. If the file is missing, print nothing and let the session start normally.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.stdout.write(readFileSync(path.join(root, "core", "CLAUDE.md"), "utf8"));
} catch {
  // Missing rules file must never block a session.
}
