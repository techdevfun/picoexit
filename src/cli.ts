#!/usr/bin/env node
/**
 * picoexit — audit your Pico CSS footprint and plan your exit.
 * A community migration helper for Pico CSS users. Not affiliated with picocss.
 */
import { scanDir } from "./scan.js";
import { buildAudit } from "./audit.js";
import { buildPlan } from "./plan.js";
import { migrateDir } from "./migrate.js";
import {
  renderAuditMarkdown,
  renderPlanMarkdown,
  renderMigratePreview,
} from "./render.js";
import { TARGETS, type Target } from "./mappings.js";
import { VERSION } from "./version.js";

const HELP = `picoexit ${VERSION} — audit your Pico CSS footprint and plan your exit.

Usage:
  picoexit audit <dir> [--json] [--no-strict]
      Scan HTML/CSS/JS/TS sources for Pico usage. Exits 1 when high
      drift-risk selectors are in use (unless --no-strict).

  picoexit plan <dir> [--json]
      Print a 3-path exit plan (stay pinned / migrate / community fork)
      with checklists and manual-effort estimates.

  picoexit migrate <dir> --to tailwind|bulma|openprops [--dry-run] [--apply]
      Rewrite Pico classes to the target framework. Dry-run prints a diff
      preview and is the default; --apply writes files. Anything without a
      verified mapping is listed as manual work, never guessed.

  picoexit --help | --version

Pico CSS was archived by its maintainer on 2026-10-04 (v2.1.1 is final).
picoexit is a community tool and is not affiliated with the Pico CSS project.
`;

function fail(msg: string): never {
  console.error(`picoexit: ${msg}`);
  console.error("Run `picoexit --help` for usage.");
  process.exit(2);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }
  if (argv.includes("--version") || argv.includes("-V")) {
    console.log(VERSION);
    process.exit(0);
  }

  const [cmd, ...rest] = argv;
  const asJson = rest.includes("--json");

  if (cmd === "audit") {
    const dir = rest.find((a) => !a.startsWith("-"));
    if (!dir) fail("audit needs a directory: picoexit audit <dir>");
    const report = buildAudit(scanDir(dir as string));
    console.log(asJson ? JSON.stringify(report, null, 2) : renderAuditMarkdown(report));
    process.exit(rest.includes("--no-strict") ? 0 : report.exitCode);
  }

  if (cmd === "plan") {
    const dir = rest.find((a) => !a.startsWith("-"));
    if (!dir) fail("plan needs a directory: picoexit plan <dir>");
    const plan = buildPlan(buildAudit(scanDir(dir as string)));
    console.log(asJson ? JSON.stringify(plan, null, 2) : renderPlanMarkdown(plan));
    process.exit(0);
  }

  if (cmd === "migrate") {
    const dir = rest.find((a) => !a.startsWith("-"));
    const toIdx = rest.indexOf("--to");
    const to = toIdx >= 0 ? rest[toIdx + 1] : undefined;
    if (!dir) fail("migrate needs a directory: picoexit migrate <dir> --to <target>");
    if (!to || !(TARGETS as string[]).includes(to)) {
      fail("--to must be one of: tailwind, bulma, openprops");
    }
    const apply = rest.includes("--apply");
    const result = migrateDir(dir as string, to as Target, { apply });
    if (asJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(renderMigratePreview(result));
    }
    process.exit(0);
  }

  fail(`unknown command: ${cmd}`);
}

main();
