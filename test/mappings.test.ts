import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PICO_V2_HOOKS } from "../src/pico-v2.js";
import { MAPPINGS, DOCS_VERIFIED, mappingFor, mappingForTarget } from "../src/mappings.js";

describe("mappings", () => {
  it("covers every Pico class hook", () => {
    const classes = PICO_V2_HOOKS.filter((h) => h.kind === "class").map((h) => `.${h.name}`);
    for (const c of classes) {
      assert.ok(mappingFor(c), `missing mapping for ${c}`);
    }
  });

  it("covers every Pico attribute hook", () => {
    const attrs = PICO_V2_HOOKS.filter((h) => h.kind === "attribute").map((h) => h.name);
    for (const a of attrs) {
      assert.ok(mappingFor(a), `missing mapping for ${a}`);
    }
  });

  it("has at least 40 mapping entries", () => {
    assert.ok(MAPPINGS.length >= 40, `only ${MAPPINGS.length}`);
  });

  it("tailwind/bulma entries are non-empty string arrays when present", () => {
    for (const m of MAPPINGS) {
      for (const t of [m.tailwind, m.bulma] as const) {
        if (t !== null) {
          assert.ok(Array.isArray(t) && t.length > 0, `${m.pico}: empty class list`);
          for (const c of t) assert.match(c, /^[a-z0-9-:.,]+$/i, `${m.pico}: odd class ${c}`);
        }
      }
    }
  });

  it("records a docs-verification date", () => {
    assert.match(DOCS_VERIFIED, /^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns undefined for unknown hooks", () => {
    assert.equal(mappingFor(".does-not-exist"), undefined);
    assert.equal(mappingForTarget(".does-not-exist", "tailwind"), undefined);
  });

  it("modal JS classes map to manual for every target", () => {
    for (const c of [".modal-is-open", ".modal-is-opening", ".modal-is-closing"]) {
      assert.equal(mappingForTarget(c, "tailwind"), null);
      assert.equal(mappingForTarget(c, "bulma"), null);
      assert.equal(mappingForTarget(c, "openprops"), null);
    }
  });
});
