#!/usr/bin/env node
/**
 * Reports how often the same English value is defined under different keys.
 *
 * Usage: node scripts/i18n-report.mjs [--all]
 *
 * The locale file is flattened to `a.b.c` paths and grouped by value, so a
 * duplicate group is one English string defined in several places. Plural
 * forms (`_one`/`_other`) and interpolations are compared verbatim: two
 * identical sentences with the same placeholder are a duplicate, while the
 * same words with a different placeholder are not.
 *
 * Keep this file identical in both SPAs; they are installed independently.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LOCALE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "i18n",
  "locales",
  "en.json",
);

const showAll = process.argv.includes("--all");
const DEFAULT_GROUPS = 40;

/** @param {Record<string, unknown>} node @param {string} prefix @param {Map<string, string>} out */
function flatten(node, prefix, out) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, path, out);
    } else {
      out.set(path, String(value));
    }
  }
}

const messages = new Map();
flatten(JSON.parse(readFileSync(LOCALE_PATH, "utf8")), "", messages);

const byValue = new Map();
for (const [key, value] of messages) {
  const group = byValue.get(value) ?? [];
  group.push(key);
  byValue.set(value, group);
}
const duplicateGroups = [...byValue.entries()]
  .filter(([, keys]) => keys.length > 1)
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

const duplicateKeys = duplicateGroups.reduce(
  (total, [, keys]) => total + keys.length,
  0,
);

const byNamespace = new Map();
for (const key of messages.keys()) {
  const namespace = key.split(".")[0];
  byNamespace.set(namespace, (byNamespace.get(namespace) ?? 0) + 1);
}

const relative = LOCALE_PATH.split(/[\\/]/).slice(-3).join("/");
console.log(`${relative}`);
console.log(
  `  ${messages.size} keys, ${duplicateKeys} of them in ${duplicateGroups.length} duplicate-value groups`,
);
console.log("");
console.log("Keys per namespace");
for (const [namespace, count] of [...byNamespace.entries()].sort(
  (a, b) => b[1] - a[1],
)) {
  console.log(`  ${String(count).padStart(4)}  ${namespace}`);
}

if (duplicateGroups.length > 0) {
  console.log("");
  console.log(
    `Duplicate values${showAll ? "" : ` (top ${DEFAULT_GROUPS})`}:`,
  );
  const shown = showAll ? duplicateGroups : duplicateGroups.slice(0, DEFAULT_GROUPS);
  for (const [value, keys] of shown) {
    const label = JSON.stringify(value.length > 64 ? `${value.slice(0, 61)}...` : value);
    console.log(`  ${String(keys.length).padStart(2)}x ${label}`);
    for (const key of keys) console.log(`        ${key}`);
  }
  if (shown.length < duplicateGroups.length) {
    console.log(`  ... ${duplicateGroups.length - shown.length} more (--all)`);
  }
}
