#!/usr/bin/env node
// Checks this repository's spec: every item fits the spec schema, no id is used
// twice, every reference resolves, versions carry their history, and every
// shared part has an identity (a permanent id, its folder named after its
// title, every id in its namespace) and stands on its own, since a product may
// copy it without the others.
//
//   npm run check
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { walk } from "./lib.mjs";

const SCHEMA_URL = "https://raw.githubusercontent.com/madsbuch/better-github/main/schema/spec.schema.json";
const SPEC = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), ".spec");
const problems = [];

// The schema the spec follows. SPEC_SCHEMA can name a local copy.
const schema = process.env.SPEC_SCHEMA ? JSON.parse(readFileSync(process.env.SPEC_SCHEMA, "utf8")) : await (await fetch(SCHEMA_URL)).json();
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

/** An item's id: its path in .spec without .json; a folder's index.json is the folder. */
const itemId = (path) => {
  const id = path.replace(/\.json$/, "");
  return id === "index" ? "" : id.replace(/\/index$/, "");
};
/** The shared part an item belongs to: its top-level folder. */
const partOf = (id) => id.split("/")[0];

const items = new Map();
for (const path of walk(SPEC)) {
  if (!path.endsWith(".json")) continue;
  let item;
  try {
    item = JSON.parse(readFileSync(join(SPEC, path), "utf8"));
  } catch (error) {
    problems.push(`${path}: not JSON (${error.message})`);
    continue;
  }
  if (!validate(item)) problems.push(...validate.errors.map((e) => `${path}: ${e.instancePath || "/"} ${e.message}`));
  if (!path.includes("/") && path !== "index.json") problems.push(`${path}: a shared part is a folder with an index.json, not a file at the top.`);
  items.set(itemId(path), item);
}
for (const id of items.keys()) {
  if (id !== "" && !items.has(partOf(id))) problems.push(`${partOf(id)}/: a shared part needs an index.json.`);
}

// Every shared part has a permanent id of its own, and its folder is named after its title.
const slug = (title) => title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sharedIds = new Map();
for (const [id, item] of items) {
  if (id === "" || id.includes("/")) {
    if (item.shared !== undefined) problems.push(`${id || "(root)"}: only a shared part's own index.json has shared.`);
    continue;
  }
  if (item.shared === undefined) {
    problems.push(`${id}: a shared part's index.json has shared, with its permanent id.`);
    continue;
  }
  if (sharedIds.has(item.shared.id)) problems.push(`${id}: the permanent id ${item.shared.id} is ${sharedIds.get(item.shared.id)}'s too.`);
  sharedIds.set(item.shared.id, id);
  if (slug(item.title) !== id) problems.push(`${id}: the folder is named after the title, "${item.title}": ${slug(item.title)}.`);
  if (item.shared.logo !== undefined && !existsSync(join(SPEC, item.shared.logo))) problems.push(`${id}: the logo ${item.shared.logo} isn't there.`);
}
const namespaceOf = (itemId) => items.get(partOf(itemId))?.shared?.id;

// Where every story, requirement and value is.
const owner = new Map();
for (const [id, item] of items) {
  for (const entry of [...(item.stories ?? []), ...(item.requirements ?? []), ...(item.values ?? [])]) {
    if (owner.has(entry.id)) problems.push(`${entry.id} is used twice: in "${owner.get(entry.id)}" and "${id}".`);
    else owner.set(entry.id, id);
    const namespace = namespaceOf(id);
    if (id !== "" && namespace !== undefined && !entry.id.startsWith(`${namespace}.`)) problems.push(`${id} ${entry.id}: ids in this part start with "${namespace}.".`);
  }
}
const requirementIds = new Set([...items.values()].flatMap((item) => (item.requirements ?? []).map((r) => r.id)));

/** The item a reference leads to, or null. `#ID`, `#ID@2`, `item` or `item#ID`. */
function target(ref) {
  const [item, entry] = ref.includes("#") ? ref.split("#", 2) : [ref, undefined];
  if (entry === undefined) return items.has(item) ? item : null;
  const id = entry.replace(/@\d+$/, "");
  const at = owner.get(id);
  if (at === undefined || (item !== "" && item !== at)) return null;
  return at;
}

for (const [id, item] of items) {
  const where = id || "(root)";
  const refs = [
    ...(item.related ?? []).map((ref) => [where, ref]),
    ...(item.deprecation?.replacedBy ?? []).map((ref) => [where, ref]),
  ];
  for (const entry of [...(item.stories ?? []), ...(item.requirements ?? []), ...(item.values ?? [])]) {
    for (const ref of [...(entry.related ?? []), ...(entry.deprecation?.replacedBy ?? [])]) refs.push([`${where} ${entry.id}`, ref]);
  }
  for (const story of item.stories ?? []) {
    for (const ref of story.requirements ?? []) {
      refs.push([`${where} ${story.id}`, ref]);
      if (!requirementIds.has(ref.replace(/^#/, "").replace(/@\d+$/, ""))) problems.push(`${where} ${story.id}: names ${ref}, which isn't a requirement.`);
    }
  }
  for (const [from, ref] of refs) {
    const to = target(ref);
    if (to === null) problems.push(`${from}: "${ref}" isn't in the spec.`);
    else if (id !== "" && partOf(to) !== partOf(id)) problems.push(`${from}: "${ref}" is in the shared part "${partOf(to)}". A shared part only refers to itself; a product that copies it may not have the other.`);
  }
  for (const r of item.requirements ?? []) {
    const versions = (r.history ?? []).map((h) => h.version).join(",");
    const expected = Array.from({ length: (r.version ?? 1) - 1 }, (_, i) => i + 1).join(",");
    if (versions !== expected) problems.push(`${where} ${r.id}: at version ${r.version ?? 1}, its history should hold versions [${expected}], not [${versions}].`);
  }
  for (const figure of item.figures ?? []) if (!existsSync(join(SPEC, figure.src))) problems.push(`${where}: figure ${figure.src} isn't there.`);
}

for (const problem of problems) console.error(problem);
const count = (key) => [...items.values()].reduce((n, item) => n + (item[key]?.length ?? 0), 0);
console.log(`${items.size} items, ${count("requirements")} requirements, ${count("stories")} stories, ${count("values")} values: ${problems.length === 0 ? "no problems" : `${problems.length} problem(s)`}.`);
process.exit(problems.length === 0 ? 0 : 1);
