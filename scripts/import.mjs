#!/usr/bin/env node
// Copies a shared part of this repository's spec into a product's spec, and
// records where it came from in the product's root item (.spec/index.json).
//
// Run it from the product repository's root, with this repository checked out
// beside it at the commit you want:
//
//   node ../spec-repo/scripts/import.mjs sync          copy (or update) the part "sync"
//   node ../spec-repo/scripts/import.mjs --check       check every imported part is unchanged
//
// The part lands at the same path it has here (.spec/sync), so references
// inside it keep working. The copy must not be edited by hand: --check fails
// when its files differ from the commit it was copied from.
import { cpSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { git, readJson, treeId } from "./lib.mjs";

const shared = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const product = process.cwd();
const rootPath = join(product, ".spec", "index.json");
const [arg] = process.argv.slice(2);

if (!arg) {
  console.error("Usage: import.mjs <part> | --check");
  process.exit(2);
}
if (!existsSync(rootPath)) {
  console.error(`No .spec/index.json in ${product}. Run this from the product repository's root.`);
  process.exit(2);
}
const root = readJson(rootPath);

if (arg === "--check") {
  const bad = [];
  for (const entry of root.imports ?? []) {
    const folder = `.spec/${entry.at}`;
    const now = existsSync(join(product, folder)) ? treeId(product, folder) : "missing";
    if (now !== entry.tree) bad.push(`${folder}: is ${now}, but ${entry.from}@${entry.commit.slice(0, 7)} has ${entry.tree}. Change the shared part in ${entry.from}, then import it again.`);
  }
  for (const line of bad) console.error(line);
  console.log(bad.length === 0 ? `${(root.imports ?? []).length} imported part(s) match their source.` : "");
  process.exit(bad.length === 0 ? 0 : 1);
}

const part = arg.replace(/^\.spec\//, "").replace(/\/$/, "");
const source = `.spec/${part}`;
if (part === "" || part.includes("..") || !existsSync(join(shared, source, "index.json"))) {
  console.error(`${source} isn't a shared part in ${shared}.`);
  process.exit(2);
}
if (git(shared, "status", "--porcelain", "--", source) !== "") {
  console.error(`${source} has uncommitted changes in ${shared}. Commit them first, so the copy names a commit that has it.`);
  process.exit(2);
}

const commit = git(shared, "rev-parse", "HEAD");
const tree = git(shared, "rev-parse", `HEAD:${source}`);
const remote = git(shared, "remote", "get-url", "origin");
const from = /github\.com[/:]([^/]+\/[^/.]+?)(?:\.git)?$/.exec(remote)?.[1] ?? remote;

const target = join(product, source);
rmSync(target, { recursive: true, force: true });
cpSync(join(shared, source), target, { recursive: true });
const copied = treeId(product, source);
if (copied !== tree) {
  console.error(`The copy of ${source} came out as ${copied}, not ${tree}. Check line endings and file modes.`);
  process.exit(1);
}

const imports = root.imports ?? [];
const existing = imports.find((entry) => entry.at === part);
const before = existing?.commit;
const entry = { ...existing, at: part, from, commit, tree };
// Keep the keys in a stable order: where it comes from first, then what the product changes.
const ordered = Object.fromEntries(["at", "from", "commit", "tree", "order", "values", "waived"].filter((key) => entry[key] !== undefined).map((key) => [key, entry[key]]));
root.imports = existing ? imports.map((other) => (other === existing ? ordered : other)) : [...imports, ordered];
writeFileSync(rootPath, JSON.stringify(root, null, 2) + "\n");

console.log(before === undefined ? `Imported ${source} from ${from}@${commit.slice(0, 7)}.` : before === commit ? `${source} is already at ${from}@${commit.slice(0, 7)}.` : `Updated ${source} from ${before.slice(0, 7)} to ${commit.slice(0, 7)}.`);
console.log("Review the change as a spec change, then reconcile what in the product is related to it.");
