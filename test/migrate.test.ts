import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { migrateDir } from "../src/migrate.js";

function tmpSite(files: Record<string, string>): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "picoexit-mig-"));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(d, name), content);
  }
  return d;
}

describe("migrateDir", () => {
  it("dry-run does not write files", () => {
    const d = tmpSite({ "index.html": '<main class="container"><p>x</p></main>' });
    const r = migrateDir(d, "tailwind", { apply: false });
    assert.equal(r.dryRun, true);
    assert.equal(fs.readFileSync(path.join(d, "index.html"), "utf-8"), '<main class="container"><p>x</p></main>');
    assert.ok(r.changes.length > 0);
  });

  it("dry-run preview contains diff hunks", () => {
    const d = tmpSite({ "index.html": '<main class="container"><p>x</p></main>' });
    const r = migrateDir(d, "tailwind", { apply: false });
    const hunks = r.changes.flatMap((c) => c.hunks);
    assert.ok(hunks.length > 0);
    assert.ok(hunks[0][1].includes("container"));
    assert.ok(hunks[0][2].includes("mx-auto"));
  });

  it("--apply rewrites .container to tailwind utilities", () => {
    const d = tmpSite({ "index.html": '<main class="container"><p>x</p></main>' });
    migrateDir(d, "tailwind", { apply: true });
    const out = fs.readFileSync(path.join(d, "index.html"), "utf-8");
    assert.ok(out.includes("mx-auto"), out);
    assert.ok(!out.includes('"container"'), out);
  });

  it("grid counts children for tailwind (3 children -> md:grid-cols-3)", () => {
    const d = tmpSite({
      "index.html": '<div class="grid"><article>a</article><article>b</article><article>c</article></div>',
    });
    const r = migrateDir(d, "tailwind", { apply: true });
    const out = fs.readFileSync(path.join(d, "index.html"), "utf-8");
    assert.ok(out.includes("md:grid-cols-3"), out);
    assert.ok(!r.manual.some((m) => m.pico === ".grid"));
  });

  it("bulma maps .contrast to is-dark", () => {
    const d = tmpSite({ "index.html": '<button class="contrast">Buy</button>' });
    migrateDir(d, "bulma", { apply: true });
    const out = fs.readFileSync(path.join(d, "index.html"), "utf-8");
    assert.ok(out.includes("is-dark"), out);
    assert.ok(out.includes("button"), out); // element mapping applied too
  });

  it("adds tailwind classes to bare <article> elements", () => {
    const d = tmpSite({ "index.html": "<article><p>x</p></article>" });
    migrateDir(d, "tailwind", { apply: true });
    const out = fs.readFileSync(path.join(d, "index.html"), "utf-8");
    assert.ok(out.includes("rounded-lg"), out);
  });

  it("lists unmapped attributes as manual work", () => {
    const d = tmpSite({ "index.html": '<a href="#" data-tooltip="hi">x</a>' });
    const r = migrateDir(d, "tailwind", { apply: false });
    assert.ok(r.manual.some((m) => m.pico === "data-tooltip"));
  });

  it("lists role=switch as manual work", () => {
    const d = tmpSite({ "index.html": '<input type="checkbox" role="switch" />' });
    const r = migrateDir(d, "tailwind", { apply: false });
    assert.ok(r.manual.some((m) => m.pico === "role=switch"));
  });

  it("openprops target generates a compat stylesheet", () => {
    const d = tmpSite({ "index.html": '<main class="container"><p>x</p></main>' });
    const r = migrateDir(d, "openprops", { apply: false });
    assert.ok(r.compatCss);
    assert.ok(r.compatCss.includes(".container"));
    assert.ok(r.compatCss.includes("var(--size-"));
    assert.equal(r.compatCssPath, "picoexit-openprops-compat.css");
    // dry-run must not write it
    assert.ok(!fs.existsSync(path.join(d, "picoexit-openprops-compat.css")));
  });

  it("openprops --apply writes the compat stylesheet", () => {
    const d = tmpSite({ "index.html": '<main class="container"><p>x</p></main>' });
    migrateDir(d, "openprops", { apply: true });
    assert.ok(fs.existsSync(path.join(d, "picoexit-openprops-compat.css")));
  });

  it("skips dynamic className template literals and reports them", () => {
    const d = tmpSite({ "a.tsx": "const c = <div className={`grid ${x}`} />;" });
    const r = migrateDir(d, "tailwind", { apply: true });
    assert.ok(r.manual.some((m) => m.reason.includes("dynamic className")));
    const out = fs.readFileSync(path.join(d, "a.tsx"), "utf-8");
    assert.ok(out.includes("${x}"));
  });
});
