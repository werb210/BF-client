#!/usr/bin/env node
// BF_CLIENT_v789_SOURCE_GREP_BUDGET
// A "source-grep" test reads a file under client-app/src with readFileSync /
// fs.readFile and asserts on its text ("the file contains X"). Such a test
// passes while the feature is broken and fails when the code is reworded, so
// the count may only go down. This script counts them and fails when the count
// rises above scripts/source-grep-baseline.json.
//
//   node scripts/check-source-grep-tests.mjs          check against the baseline
//   node scripts/check-source-grep-tests.mjs --list   also print each file
//
// Reading deployment config (public/, index.html, native projects, workflows,
// package files) is not counted: that text IS the thing under test.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const srcRoot = path.join(repoRoot, "client-app", "src");
const baselinePath = path.join(here, "source-grep-baseline.json");

const READS_FILE = /\breadFileSync\s*\(|\bfs\.readFile\s*\(|\breadFile\s*\(/;
// A string naming application source: a .ts/.tsx/.js/.jsx/.css file, or a
// path through src/.
const SOURCE_PATH = [
  /["'`][^"'`\n]*\.(?:tsx?|jsx?|css)["'`]/,
  /["'`]src["'`]/,
  /["'`][^"'`\n]*\bsrc\/[^"'`\n]*["'`]/,
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

export function isTestFile(file) {
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(file) || (file.includes(`${path.sep}__tests__${path.sep}`) && /\.[cm]?[jt]sx?$/.test(file));
}

export function isSourceGrepTest(text) {
  if (!READS_FILE.test(text)) return false;
  return SOURCE_PATH.some((re) => re.test(text));
}

export function findSourceGrepTests(root = srcRoot) {
  return walk(root)
    .filter(isTestFile)
    .filter((file) => isSourceGrepTest(readFileSync(file, "utf8")))
    .map((file) => path.relative(repoRoot, file).split(path.sep).join("/"))
    .sort();
}

function main() {
  const files = findSourceGrepTests();
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const max = Number(baseline.max);
  if (process.argv.includes("--list")) for (const f of files) console.log(f);
  console.log(`source-grep tests: ${files.length} (baseline ${max})`);
  if (!Number.isFinite(max)) {
    console.error("scripts/source-grep-baseline.json needs a numeric \"max\".");
    process.exit(1);
  }
  if (files.length > max) {
    console.error(
      `Source-grep tests rose from ${max} to ${files.length}. Test behaviour (render, call, assert on results) ` +
        "instead of reading the source text. Run with --list to see them."
    );
    process.exit(1);
  }
  if (files.length < max) {
    console.log(`Count is below the baseline: lower "max" in scripts/source-grep-baseline.json to ${files.length}.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
