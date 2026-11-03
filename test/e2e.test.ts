/** End-to-end: run the compiled CLI on the sample fixture site. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as path from "node:path";

const DIST_CLI = path.resolve(__dirname, "../src/cli.js");
const FIXTURE = path.resolve(__dirname, "../../fixtures/sample-site");

function run(...args: string[]): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(process.execPath, [DIST_CLI, ...args], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (e: unknown) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return {
      code: err.status ?? 1,
      stdout: String(err.stdout ?? ""),
      stderr: String(err.stderr ?? ""),
    };
  }
}
describe("cli e2e", () => {
  it("audit --json exits 1 on the fixture and emits valid JSON", () => {
    const r = run("audit", FIXTURE, "--json");
    assert.equal(r.code, 1);
    const report = JSON.parse(r.stdout) as { detectionMethod: string; exitCode: number };
    assert.equal(report.detectionMethod, "cdn");
    assert.equal(report.exitCode, 1);
  });

  it("audit markdown prints a readable report", () => {
    const r = run("audit", FIXTURE);
    assert.ok(r.stdout.includes("# picoexit audit"));
    assert.ok(r.stdout.includes("Drift-risk selectors"));
  });

  it("audit --no-strict exits 0 despite drift risk", () => {
    const r = run("audit", FIXTURE, "--no-strict");
    assert.equal(r.code, 0);
  });

  it("plan prints all three paths", () => {
    const r = run("plan", FIXTURE);
    assert.equal(r.code, 0);
    assert.ok(r.stdout.includes("Stay pinned"));
    assert.ok(r.stdout.includes("Migrate to a maintained framework"));
    assert.ok(r.stdout.includes("Follow a community fork"));
  });

  it("migrate --to tailwind --dry-run prints a diff preview", () => {
    const r = run("migrate", FIXTURE, "--to", "tailwind", "--dry-run");
    assert.equal(r.code, 0);
    assert.ok(r.stdout.includes("--- index.html"));
    assert.ok(r.stdout.includes("Manual work"));
    assert.ok(r.stdout.includes("Dry run"));
  });

  it("migrate rejects an unknown target", () => {
    const r = run("migrate", FIXTURE, "--to", "bootstrap");
    assert.equal(r.code, 2);
  });

  it("--version prints 0.1.0", () => {
    const r = run("--version");
    assert.equal(r.code, 0);
    assert.match(r.stdout.trim(), /^0\.1\.0$/);
  });
});
