#!/usr/bin/env node
/**
 * Preflight gate: block release when public content contains Vietnamese
 * diacritics or internal codenames. All public-facing text must be
 * English-only and free of internal names.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SCAN_DIRS = ["src", "test", "scripts", "fixtures", ".github"];
const SCAN_FILES = ["README.md", "LICENSE", "package.json"];

const VIETNAMESE_RE = /[\u00C0-\u0103\u0110\u0111\u0128\u0129\u0168\u0169\u01A0\u01A1\u01AF\u01B0\u1EA0-\u1EF9]/;
const INTERNAL_NAMES = [
  "Trợ lý",
  "tro-ly",
  "TRO-LY",
  "nhà máy",
  "NHA-MAY",
  "làn ",
  "Tổng quản",
];

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules") continue;
      yield* walk(p);
    } else if (e.isFile()) {
      yield p;
    }
  }
}

const files = [];
const SELF = path.basename(new URL(import.meta.url).pathname);
for (const d of SCAN_DIRS) {
  const abs = path.join(ROOT, d);
  if (fs.existsSync(abs)) {
    for (const f of walk(abs)) {
      if (path.basename(f) === SELF) continue; // the denylist itself is not public content
      files.push(f);
    }
  }
}
for (const f of SCAN_FILES) {
  const abs = path.join(ROOT, f);
  if (fs.existsSync(abs)) files.push(abs);
}

let failures = 0;
for (const f of files.sort()) {
  let text;
  try {
    text = fs.readFileSync(f, "utf-8");
  } catch {
    continue;
  }
  const rel = path.relative(ROOT, f);
  text.split("\n").forEach((lineContent, i) => {
    if (VIETNAMESE_RE.test(lineContent)) {
      console.error(`VIETNAMESE TEXT: ${rel}:${i + 1}: ${lineContent.trim().slice(0, 80)}`);
      failures++;
    }
    for (const name of INTERNAL_NAMES) {
      if (lineContent.includes(name)) {
        console.error(`INTERNAL NAME "${name}": ${rel}:${i + 1}`);
        failures++;
      }
    }
  });
}

if (failures > 0) {
  console.error(`\npreflight FAILED: ${failures} violation(s)`);
  process.exit(1);
}
console.log(`preflight OK: ${files.length} files clean`);
