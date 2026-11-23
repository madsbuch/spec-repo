// Shared by import.mjs and check.mjs. Plain Node, no dependencies.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

export const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

/** Every file under `dir`, as paths relative to it. */
export function walk(dir, base = dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path, base) : [relative(base, path)];
  });
}

/**
 * The git tree id of `folder` (relative to `repo`) as it is on disk, committed
 * or not. Two folders with the same files have the same id, in any repository.
 */
export function treeId(repo, folder) {
  const scratch = mkdtempSync(join(tmpdir(), "spec-tree-"));
  const env = { ...process.env, GIT_INDEX_FILE: join(scratch, "index") };
  try {
    execFileSync("git", ["add", "--all", "--force", "--", folder], { cwd: repo, env });
    return execFileSync("git", ["write-tree", `--prefix=${folder.replace(/\/?$/, "/")}`], { cwd: repo, env, encoding: "utf8" }).trim();
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

export const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
