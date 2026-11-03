import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { scanDir, scanText } from "../src/scan.js";

const FIXTURE = path.resolve(__dirname, "../../fixtures/sample-site");

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "picoexit-scan-"));
}

describe("scanDir", () => {
  it("detects CDN delivery and version from the fixture", () => {
    const r = scanDir(FIXTURE);
    assert.equal(r.detection.method, "cdn");
    assert.equal(r.detection.version, "2.1.1");
    assert.ok(r.filesScanned >= 1);
  });

  it("finds class hooks with file and line", () => {
    const r = scanDir(FIXTURE);
    const grid = r.hits.filter((h) => h.hook === ".grid");
    assert.ok(grid.length >= 1);
    assert.match(grid[0].file, /index\.html$/);
    assert.ok(grid[0].line > 0);
  });

  it("finds element hooks styled by Pico (article, nav, dialog)", () => {
    const r = scanDir(FIXTURE);
    const hooks = new Set(r.hits.map((h) => h.hook));
    assert.ok(hooks.has("article"));
    assert.ok(hooks.has("nav"));
    assert.ok(hooks.has("dialog"));
  });

  it("finds attribute hooks (data-theme, role=search, data-tooltip)", () => {
    const r = scanDir(FIXTURE);
    const hooks = new Set(r.hits.map((h) => h.hook));
    assert.ok(hooks.has("data-theme"));
    assert.ok(hooks.has("role=search"));
    assert.ok(hooks.has("data-tooltip"));
  });

  it("detects npm delivery via package.json", () => {
    const d = tmpDir();
    fs.writeFileSync(
      path.join(d, "package.json"),
      JSON.stringify({ dependencies: { "@picocss/pico": "^2.0.6" } }),
    );
    fs.writeFileSync(path.join(d, "index.html"), "<html></html>");
    const r = scanDir(d);
    assert.equal(r.detection.method, "npm");
    assert.equal(r.detection.version, "2.0.6");
  });

  it("detects vendored delivery and version from the banner", () => {
    const d = tmpDir();
    fs.writeFileSync(
      path.join(d, "pico.min.css"),
      "/*! Pico CSS v2.1.1 */ :root{--x:1} .grid{display:grid}",
    );
    const r = scanDir(d);
    assert.equal(r.detection.method, "vendored");
    assert.equal(r.detection.version, "2.1.1");
    assert.ok(r.hits.some((h) => h.hook === ".grid"));
  });

  it("returns none when Pico is absent", () => {
    const d = tmpDir();
    fs.writeFileSync(path.join(d, "index.html"), "<html><body><p>hi</p></body></html>");
    const r = scanDir(d);
    assert.equal(r.detection.method, "none");
  });

  it("skips node_modules", () => {
    const d = tmpDir();
    fs.mkdirSync(path.join(d, "node_modules", "x"), { recursive: true });
    fs.writeFileSync(
      path.join(d, "node_modules", "x", "a.html"),
      '<div class="grid"></div>',
    );
    fs.writeFileSync(path.join(d, "index.html"), "<html></html>");
    const r = scanDir(d);
    assert.equal(r.filesScanned, 1);
    assert.equal(r.hits.length, 0);
  });
});

describe("scanText", () => {
  before(() => undefined);
  it("dedupes repeated hooks on one line", () => {
    const hits = scanText('<div class="grid grid"></div>', "a.html", ".html");
    assert.equal(hits.filter((h) => h.hook === ".grid").length, 1);
  });

  it("matches className attributes in JSX", () => {
    const hits = scanText('const x = <div className="container">', "a.tsx", ".tsx");
    assert.ok(hits.some((h) => h.hook === ".container"));
  });
});
