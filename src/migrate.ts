/**
 * Codemod: rewrite Pico v2.x class usage to a target framework.
 * Always dry-run first (diff preview); files are only written with --apply.
 * Anything without a verified mapping is reported as manual work — never guessed.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { HOOK_LOOKUP } from "./pico-v2.js";
import { mappingFor, type Target } from "./mappings.js";

const MIGRATE_EXTENSIONS = new Set([".html", ".jsx", ".tsx"]);
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "coverage", "vendor",
]);

export interface ManualItem {
  file: string;
  line: number;
  pico: string;
  reason: string;
}

export interface FileChange {
  file: string;
  /** [lineNo, before, after] for changed lines */
  hunks: Array<[number, string, string]>;
  replacements: number;
}

export interface MigrateResult {
  target: Target;
  dryRun: boolean;
  changes: FileChange[];
  manual: ManualItem[];
  filesScanned: number;
  /** openprops target: generated compat CSS (preview or written file) */
  compatCss?: string;
  compatCssPath?: string;
}

function walk(dir: string, files: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
    } else if (entry.isFile()) {
      if (MIGRATE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(path.join(dir, entry.name));
      }
    }
  }
}

const CLASS_ATTR_RE = /(class|className)\s*=\s*(["'`])([^"'`]*?)\2/g;

function isPicoClass(token: string): boolean {
  const meta = HOOK_LOOKUP.get(`.${token}`);
  return meta?.kind === "class";
}

/** Count direct child elements of the tag that opens at openTagStart. HTML only. */
function countDirectChildren(html: string, openTagStart: number): number {
  const openMatch = /^<([a-zA-Z][\w-]*)/.exec(html.slice(openTagStart));
  if (!openMatch || openTagStart < 0) return 0;
  const tag = openMatch[1].toLowerCase();
  const openEnd = html.indexOf(">", openTagStart);
  if (openEnd === -1) return 0;
  const VOID = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
  ]);
  const tagRe = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w-]*)([^>]*?)>/g;
  tagRe.lastIndex = openEnd + 1;
  let depth = 1;
  let children = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    if (m[0].startsWith("<!--")) continue;
    const name = (m[1] ?? "").toLowerCase();
    const isClose = m[0].startsWith("</");
    const selfClose = m[0].endsWith("/>") || VOID.has(name);
    if (isClose) {
      if (name === tag) {
        depth -= 1;
        if (depth === 0) break;
      } else if (depth > 1) {
        depth -= 1; // tolerate: closing an inner element
      }
    } else if (!selfClose) {
      if (depth === 1) children += 1;
      depth += 1;
    }
  }
  return children;
}

/** Add a `column` class to every direct child opening tag of the .grid element. Bulma only. */
function addBulmaColumns(
  lines: string[],
  gridOpenStart: number,
  fullText: string,
  origLineStarts: number[],
): void {
  const openMatch = /^<([a-zA-Z][\w-]*)/.exec(fullText.slice(gridOpenStart));
  if (!openMatch || gridOpenStart < 0) return;
  const tag = openMatch[1].toLowerCase();
  const openEnd = fullText.indexOf(">", gridOpenStart);
  if (openEnd === -1) return;
  const VOID = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
  ]);
  const tagRe = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w-]*)([^>]*?)>/g;
  tagRe.lastIndex = openEnd + 1;
  let depth = 1;
  const childOpens: Array<{ abs: number; name: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(fullText)) !== null) {
    if (m[0].startsWith("<!--")) continue;
    const name = (m[1] ?? "").toLowerCase();
    const isClose = m[0].startsWith("</");
    const selfClose = m[0].endsWith("/>") || VOID.has(name);
    if (isClose) {
      if (name === tag) {
        depth -= 1;
        if (depth === 0) break;
      } else if (depth > 1) {
        depth -= 1;
      }
    } else if (!selfClose) {
      if (depth === 1) childOpens.push({ abs: m.index, name });
      depth += 1;
    }
  }
  // Map absolute offsets (in `original` coordinates) back to line indexes.
  // Lines may already be longer (element pass ran first), so children are
  // located by tag name + document order within their line, not by column.
  const lineStarts = origLineStarts;
  const lineIndexOf = (abs: number): number => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= abs) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  const byLine = new Map<number, string[]>();
  for (const c of childOpens) {
    const li = lineIndexOf(c.abs);
    if (!byLine.has(li)) byLine.set(li, []);
    byLine.get(li)!.push(c.name);
  }
  for (const [li, names] of byLine) {
    let line = lines[li];
    const seen = new Map<string, number>();
    for (const name of names) {
      const want = seen.get(name) ?? 0;
      const re = new RegExp(`<${name}(?=[\\s>/])[^>]*?>`, "g");
      let count = 0;
      let found: RegExpExecArray | null = null;
      let mm: RegExpExecArray | null;
      while ((mm = re.exec(line)) !== null) {
        if (/\bcolumn\b/.test(mm[0])) continue;
        if (count === want) {
          found = mm;
          break;
        }
        count++;
      }
      if (!found) continue;
      seen.set(name, want + 1);
      const t = found[0];
      const replacement = /\bclass\s*=/.test(t)
        ? t.replace(
            /(class\s*=\s*["'`])([^"'`]*)(["'`])/,
            (_x: string, p1: string, cls: string, p3: string) =>
              `${p1}${cls} column${p3}`,
          )
        : /\/>$/.test(t)
          ? t.replace(/\/>$/, ' class="column"/>')
          : t.replace(/>$/, ' class="column">');
      line = line.slice(0, found.index) + replacement + line.slice(found.index + t.length);
    }
    if (line !== lines[li]) lines[li] = line;
  }
}

export function migrateDir(
  root: string,
  target: Target,
  opts: { apply: boolean },
): MigrateResult {
  const abs = path.resolve(root);
  const files: string[] = [];
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) walk(abs, files);
  files.sort();

  const changes: FileChange[] = [];
  const manual: ManualItem[] = [];
  const manualSeen = new Set<string>();
  const compatRules = new Map<string, string>(); // pico -> css decls

  const addManual = (file: string, line: number, pico: string, reason: string) => {
    const key = `${file}::${pico}`;
    if (manualSeen.has(key)) return;
    manualSeen.add(key);
    manual.push({ file, line, pico, reason });
  };

  for (const f of files) {
    const rel = path.relative(abs, f);
    const ext = path.extname(f).toLowerCase();
    const original = fs.readFileSync(f, "utf-8");
    const lines = original.split("\n");
    // Stable offsets into `original` — `lines` mutates during the codemod.
    const origLineStarts: number[] = [];
    {
      let off = 0;
      for (const ln of original.split("\n")) {
        origLineStarts.push(off);
        off += ln.length + 1;
      }
    }
    let replacements = 0;
    const changedLines = new Set<number>();

    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      let out = line;
      let m: RegExpExecArray | null;
      CLASS_ATTR_RE.lastIndex = 0;

      const markChanged = (): void => {
        replacements += 1;
        changedLines.add(idx);
      };

      // --- element hooks FIRST: add target classes to bare semantic elements ---
      // (tailwind/bulma only; openprops is covered by the compat stylesheet)
      // Runs before the class pass so variant classes (contrast/secondary)
      // compose with structural button classes instead of conflicting.
      if (target !== "openprops") {
        for (const [pico, map] of elementMappingsFor(target)) {
          const tagRe = new RegExp(`<${pico}(?=[\\s>/])[^>]*?>`, "g");
          out = out.replace(tagRe, (tag: string) => {
            let cls = map;
            if (pico === "button" && /\bclass\s*=/.test(tag)) {
              const cm = /\bclass\s*=\s*["'`]([^"'`]*)["'`]/.exec(tag);
              const existing = cm ? cm[1].split(/\s+/) : [];
              if (existing.some((t) => t === "contrast" || t === "secondary" || t === "outline")) {
                // variant supplies the color; keep structural classes only
                cls = map.filter(
                  (c) => !["bg-blue-600", "text-white", "hover:bg-blue-700"].includes(c),
                );
              }
            }
            if (pico === "input" && /type\s*=\s*["'](submit|button|reset)["']/.test(tag)) {
              // Pico styles submit/button/reset inputs as buttons
              const btnMap = mappingFor("button");
              const btnMapped = btnMap
                ? target === "tailwind"
                  ? btnMap.tailwind
                  : btnMap.bulma
                : null;
              if (btnMapped) cls = btnMapped;
            }
            return withAddedClasses(tag, cls, markChanged);
          });
        }
        // role=button anchors: apply the role=button mapping
        const rbMap = mappingFor("role=button");
        const rbMapped = rbMap
          ? target === "tailwind"
            ? rbMap.tailwind
            : rbMap.bulma
          : null;
        if (rbMapped) {
          out = out.replace(
            /<a(?=[\s>/])[^>]*?\brole\s*=\s*["']button["'][^>]*?>/g,
            (tag: string) => withAddedClasses(tag, rbMapped, markChanged),
          );
        }
      }

      // --- class / className attributes ---
      // NOTE: matched against `out` (post element pass); right-to-left
      // application keeps indices valid while `out` mutates.
      CLASS_ATTR_RE.lastIndex = 0;
      const attrMatches: Array<{ full: string; attr: string; quote: string; value: string; index: number }> = [];
      while ((m = CLASS_ATTR_RE.exec(out)) !== null) {
        attrMatches.push({ full: m[0], attr: m[1], quote: m[2], value: m[3], index: m.index });
      }
      // dynamic className={...} (JSX expression container) — cannot rewrite safely
      if (attrMatches.length === 0 && /(class|className)\s*=\s*\{/.test(line)) {
        addManual(rel, lineNo, "className={...}", "dynamic className (JSX expression) — review by hand");
      }
      // process right-to-left so indices stay valid
      for (let i = attrMatches.length - 1; i >= 0; i--) {
        const am = attrMatches[i];
        if (am.value.includes("${")) {
          addManual(rel, lineNo, am.value.trim(), "dynamic className (template literal) — review by hand");
          continue;
        }
        const tokens = am.value.split(/\s+/).filter(Boolean);
        const next: string[] = [];
        let changed = false;
        for (const token of tokens) {
          if (!isPicoClass(token)) {
            next.push(token);
            continue;
          }
          const map = mappingFor(`.${token}`);
          if (!map) {
            addManual(rel, lineNo, `.${token}`, "Pico class with no verified mapping");
            next.push(token);
            continue;
          }
          if (target === "openprops") {
            if (map.openprops) {
              compatRules.set(`.${token}`, map.openprops);
              next.push(token); // keep class; compat CSS covers it
            } else {
              addManual(rel, lineNo, `.${token}`, map.note || "no Open Props equivalent");
              next.push(token);
            }
            continue;
          }
          const mapped = target === "tailwind" ? map.tailwind : map.bulma;
          if (token === "grid" && target === "tailwind" && ext === ".html") {
            // structural: count real children instead of guessing
            const attrAbs = origLineStarts[idx] + am.index;
            const gridOpenStart = original.lastIndexOf("<", attrAbs);
            const kids = countDirectChildren(original, gridOpenStart);
            const cols = kids >= 2 && kids <= 12 ? kids : 2;
            next.push("grid", "gap-4", `md:grid-cols-${cols}`);
            if (kids < 2 || kids > 12) {
              addManual(rel, lineNo, ".grid", `could not count a sane number of grid children (${kids}); verify md:grid-cols-N`);
            }
          } else if (token === "grid" && target === "bulma" && ext === ".html") {
            next.push("columns");
            const attrAbs = origLineStarts[idx] + am.index;
            const gridOpenStart = original.lastIndexOf("<", attrAbs);
            addBulmaColumns(lines, gridOpenStart, original, origLineStarts);
          } else if (mapped === null) {
            addManual(rel, lineNo, `.${token}`, map.note || `no ${target} equivalent`);
            next.push(token);
            continue;
          } else {
            next.push(...mapped);
          }
          changed = true;
          replacements += 1;
        }
        if (changed) {
          const replacement = `${am.attr}=${am.quote}${next.join(" ")}${am.quote}`;
          out = out.slice(0, am.index) + replacement + out.slice(am.index + am.full.length);
          changedLines.add(idx);
        }
      }

      // --- attribute hooks with class additions (aria-invalid) ---
      if (target !== "openprops" && line.includes("aria-invalid=")) {
        const map = mappingFor("aria-invalid");
        const mapped = map ? (target === "tailwind" ? map.tailwind : map.bulma) : null;
        if (mapped) {
          const before = out;
          out = out.replace(
            /(<[a-zA-Z][\w-]*[^>]*?\bclass\s*=\s*["'`])([^"'`]*)(["'`])/,
            (_mm, p1: string, cls: string, p3: string) => {
              const add = mapped.filter((c) => !cls.split(/\s+/).includes(c));
              return add.length ? `${p1}${cls} ${add.join(" ")}${p3}` : _mm;
            },
          );
          if (out !== before) {
            replacements += 1;
            changedLines.add(idx);
          }
        }
      }

      // --- attribute hooks that are always manual ---
      for (const attr of ["data-theme", "data-tooltip"]) {
        if (line.includes(`${attr}=`)) {
          const map = mappingFor(attr);
          addManual(rel, lineNo, attr, map?.note ?? "no automatic mapping");
        }
      }
      if (/role\s*=\s*["']switch["']/.test(line)) {
        const map = mappingFor("role=switch");
        addManual(rel, lineNo, "role=switch", map?.note ?? "no automatic mapping");
      }
      for (const role of ["group", "search"]) {
        if (new RegExp(`role\\s*=\\s*["']${role}["']`).test(line)) {
          const map = mappingFor(`role=${role}`);
          addManual(rel, lineNo, `role=${role}`, map?.note ?? "no automatic mapping");
        }
      }

      lines[idx] = out;
    });

    const hunks: Array<[number, string, string]> = [];
    const afterLines = original.split("\n");
    // recompute: we mutated `lines`; compare with original split
    const origLines = original.split("\n");
    for (const i of changedLines) {
      if (origLines[i] !== lines[i]) {
        hunks.push([i + 1, origLines[i].trim(), lines[i].trim()]);
      }
    }
    void afterLines;

    if (hunks.length > 0) {
      changes.push({ file: rel, hunks, replacements });
      if (opts.apply) {
        fs.writeFileSync(f, lines.join("\n"), "utf-8");
      }
    }
  }

  const result: MigrateResult = {
    target,
    dryRun: !opts.apply,
    changes,
    manual: manual.sort((a, b) =>
      a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file),
    ),
    filesScanned: files.length,
  };

  if (target === "openprops" && compatRules.size > 0) {
    const css = [
      "/* picoexit compat layer — Pico v2.x classes mapped to Open Props tokens.",
      " * Generated by `picoexit migrate --to openprops`. Review before shipping. */",
      "",
      ...[...compatRules.entries()].map(
        ([sel, decls]) => `${sel} {\n  ${decls.replace(/; /g, ";\n  ")}${decls.endsWith(";") ? "" : ";"}\n}`,
      ),
      "",
    ].join("\n");
    result.compatCss = css;
    result.compatCssPath = "picoexit-openprops-compat.css";
    if (opts.apply) {
      fs.writeFileSync(path.join(abs, "picoexit-openprops-compat.css"), css, "utf-8");
    }
  }

  return result;
}

/** Append classes to one opening tag (merging into an existing class attribute). */
function withAddedClasses(
  tag: string,
  classes: string[],
  onChange: () => void,
): string {
  if (classes.length === 0) return tag;
  if (/\bclass\s*=/.test(tag)) {
    return tag.replace(
      /(\bclass\s*=\s*["'`])([^"'`]*)(["'`])/,
      (_mm: string, p1: string, cls: string, p3: string) => {
        const add = classes.filter((c) => !cls.split(/\s+/).includes(c));
        if (add.length === 0) return _mm;
        onChange();
        return `${p1}${cls} ${add.join(" ")}${p3}`;
      },
    );
  }
  onChange();
  return /\/>$/.test(tag)
    ? tag.replace(/\/>$/, ` class="${classes.join(" ")}"/>`)
    : tag.replace(/>$/, ` class="${classes.join(" ")}">`);
}

/** Element hooks that have a real class mapping for the target. */
function elementMappingsFor(target: Target): Array<[string, string[]]> {
  const out: Array<[string, string[]]> = [];
  for (const [key, meta] of HOOK_LOOKUP) {
    if (meta.kind !== "element") continue;
    const map = mappingFor(key);
    if (!map) continue;
    const mapped = target === "tailwind" ? map.tailwind : map.bulma;
    if (mapped && mapped.length > 0) out.push([key, mapped]);
  }
  return out;
}
