import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { scanDir } from "../src/scan.js";
import { buildAudit } from "../src/audit.js";
import { buildPlan, FORKS_VERIFIED } from "../src/plan.js";

const FIXTURE = path.resolve(__dirname, "../../fixtures/sample-site");

describe("buildPlan", () => {
  it("produces exactly the three paths in order", () => {
    const p = buildPlan(buildAudit(scanDir(FIXTURE)));
    assert.deepEqual(p.paths.map((x) => x.id), ["stay", "migrate", "fork"]);
  });

  it("migrate path names the best-coverage target", () => {
    const p = buildPlan(buildAudit(scanDir(FIXTURE)));
    const migrate = p.paths[1];
    assert.match(migrate.verdict, /tailwind|bulma|openprops/);
    for (const [t, c] of Object.entries(p.coverageByTarget)) {
      assert.ok(c.coveragePct >= 0 && c.coveragePct <= 100, t);
    }
  });

  it("fork path lists known forks with verification date", () => {
    const p = buildPlan(buildAudit(scanDir(FIXTURE)));
    const fork = p.paths[2];
    const text = fork.checklist.join("\n") + fork.risks.join("\n");
    assert.ok(text.includes("anyblades/blades"));
    assert.match(FORKS_VERIFIED, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(text.includes(FORKS_VERIFIED));
  });

  it("manual-hour estimates are sane (low <= high, non-negative)", () => {
    const p = buildPlan(buildAudit(scanDir(FIXTURE)));
    for (const path of p.paths) {
      assert.ok(path.manualHoursLow >= 0);
      assert.ok(path.manualHoursHigh >= path.manualHoursLow);
    }
  });

  it("empty project gets a trivially-safe stay verdict", () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "picoexit-empty-"));
    fs.writeFileSync(path.join(d, "index.html"), "<html><body><div><span>no pico here</span></div></body></html>");
    const p = buildPlan(buildAudit(scanDir(d)));
    assert.match(p.paths[0].verdict, /Trivially safe/);
    assert.match(p.summary, /No Pico CSS usage/);
  });

  it("stay path warns when high drift-risk selectors are in use", () => {
    const p = buildPlan(buildAudit(scanDir(FIXTURE)));
    assert.match(p.paths[0].verdict, /Risky/);
    assert.ok(p.paths[0].risks.some((r) => r.includes("role=search")));
  });
});
