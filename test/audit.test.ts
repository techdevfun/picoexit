import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { scanDir } from "../src/scan.js";
import { buildAudit } from "../src/audit.js";

const FIXTURE = path.resolve(__dirname, "../../fixtures/sample-site");

describe("buildAudit", () => {
  it("reports delivery method and final-version status", () => {
    const a = buildAudit(scanDir(FIXTURE));
    assert.equal(a.detectionMethod, "cdn");
    assert.equal(a.detectedVersion, "2.1.1");
    assert.equal(a.isFinalVersion, true);
  });

  it("counts usage by component", () => {
    const a = buildAudit(scanDir(FIXTURE));
    assert.ok((a.byComponent["layout"] ?? 0) > 0);
    assert.ok((a.byComponent["forms"] ?? 0) > 0);
    const sum = Object.values(a.byComponent).reduce((s, n) => s + n, 0);
    assert.equal(sum, a.totalHookOccurrences);
  });

  it("flags high drift-risk selectors (role=search, dropdown)", () => {
    const a = buildAudit(scanDir(FIXTURE));
    const high = a.driftFlags.filter((f) => f.risk === "high").map((f) => f.hook);
    assert.ok(high.includes("role=search"));
    assert.ok(high.includes(".dropdown"));
    for (const f of a.driftFlags) {
      assert.ok(f.note.length > 0);
      assert.ok(f.locations.length > 0);
    }
  });

  it("exits 1 when high drift-risk selectors are in use", () => {
    const a = buildAudit(scanDir(FIXTURE));
    assert.equal(a.exitCode, 1);
  });

  it("exits 0 for a clean project", () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "picoexit-clean-"));
    fs.writeFileSync(
      path.join(d, "index.html"),
      '<!DOCTYPE html><html><body><main class="container"><p>hi</p></main></body></html>',
    );
    const a = buildAudit(scanDir(d));
    assert.equal(a.exitCode, 0);
    assert.equal(a.driftFlags.filter((f) => f.risk === "high").length, 0);
  });

  it("lists hooks sorted by usage count", () => {
    const a = buildAudit(scanDir(FIXTURE));
    for (let i = 1; i < a.hooksUsed.length; i++) {
      assert.ok(a.hooksUsed[i - 1].count >= a.hooksUsed[i].count);
    }
  });

  it("locations use file:line format", () => {
    const a = buildAudit(scanDir(FIXTURE));
    assert.ok(a.hooksUsed.length > 0);
    for (const h of a.hooksUsed.slice(0, 5)) {
      assert.match(h.locations[0], /:\d+$/);
    }
  });
});
