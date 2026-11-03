/**
 * Project scanner: walks a directory, detects how Pico CSS is delivered,
 * and finds every Pico hook (class / element / attribute) actually used.
 * Pure Node stdlib. No network calls.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { PICO_V2_HOOKS, type HookKind, type PicoHook } from "./pico-v2.js";

export const SCAN_EXTENSIONS = new Set([
  ".html", ".css", ".js", ".ts", ".jsx", ".tsx",
]);

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "coverage", "vendor",
]);

export interface FileHit {
  file: string;
  line: number;
  hook: string; // display form: '.grid' | 'article' | 'data-theme'
  kind: HookKind;
  snippet: string;
}

export interface PicoDetection {
  method: "cdn" | "npm" | "vendored" | "none";
  version?: string;
  detail: string;
}

export interface ScanResult {
  root: string;
  detection: PicoDetection;
  hits: FileHit[];
  filesScanned: number;
}

const CDN_RE =
  /(?:cdn\.jsdelivr\.net\/npm\/@picocss\/pico@([^"'\s/]+)|unpkg\.com\/@picocss\/pico@([^"'\s/]+)|@picocss\/pico@([^"'\s/]+)\/css)/;
const VENDORED_NAME_RE = /(^|[/\\])pico[^/\\]*\.css$/i;
const VENDOR_BANNER_RE = /Pico CSS[^v]*v(\d+\.\d+\.\d+)/i;

const CLASS_HOOKS = PICO_V2_HOOKS.filter((h) => h.kind === "class");
const ELEMENT_HOOKS = PICO_V2_HOOKS.filter((h) => h.kind === "element");
const ATTRIBUTE_HOOKS = PICO_V2_HOOKS.filter((h) => h.kind === "attribute");

function hookDisplay(h: PicoHook): string {
  return h.kind === "class" ? `.${h.name}` : h.name;
}

function snippetOf(line: string): string {
  const t = line.trim();
  return t.length > 120 ? t.slice(0, 117) + "..." : t;
}

/** Scan one file's text for Pico hooks. relPath is shown in reports. */
export function scanText(
  text: string,
  relPath: string,
  ext: string,
): FileHit[] {
  const hits: FileHit[] = [];
  const lines = text.split("\n");

  // Collect class tokens from class="..." / className="..." attributes.
  const classAttrRe = /(?:class|className)\s*=\s*["'`]([^"'`]+)["'`]/g;
  // For CSS files also match bare selectors like `.grid {` or `button.grid,`.
  const cssClassRe = /(^|[\s,>+~{])([.][a-zA-Z][\w-]*)/g;

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    const seen = new Set<string>();

    const push = (hook: PicoHook) => {
      const disp = hookDisplay(hook);
      if (seen.has(disp)) return;
      seen.add(disp);
      hits.push({
        file: relPath,
        line: lineNo,
        hook: disp,
        kind: hook.kind,
        snippet: snippetOf(line),
      });
    };

    // 1. class attributes
    let m: RegExpExecArray | null;
    classAttrRe.lastIndex = 0;
    while ((m = classAttrRe.exec(line)) !== null) {
      for (const token of m[1].split(/\s+/)) {
        const hook = CLASS_HOOKS.find((h) => h.name === token);
        if (hook) push(hook);
      }
    }

    // 2. bare class selectors inside CSS files
    if (ext === ".css") {
      cssClassRe.lastIndex = 0;
      while ((m = cssClassRe.exec(line)) !== null) {
        const name = m[2].slice(1);
        const hook = CLASS_HOOKS.find((h) => h.name === name);
        if (hook) push(hook);
      }
    }

    // 3. element selectors: opening tags <article ...>, and CSS `article {`
    for (const hook of ELEMENT_HOOKS) {
      const tagRe = new RegExp(`<${hook.name}(?=[\\s>/])`, "i");
      const cssRe = new RegExp(
        `(^|[\\s,>+~{])${hook.name}(?=[\\s,>+~:{.#\\[])`,
        "i",
      );
      if (tagRe.test(line) || (ext === ".css" && cssRe.test(line))) {
        push(hook);
      }
    }

    // 4. attribute hooks
    for (const hook of ATTRIBUTE_HOOKS) {
      if (hook.name === "data-theme" || hook.name === "data-tooltip") {
        if (line.includes(`${hook.name}=`)) push(hook);
      } else if (hook.name.startsWith("role=")) {
        const role = hook.name.slice("role=".length);
        if (new RegExp(`role\\s*=\\s*["']${role}["']`).test(line)) push(hook);
      } else if (hook.name.startsWith("aria-")) {
        if (line.includes(`${hook.name}=`)) push(hook);
      }
    }
  });

  return hits;
}

function walk(dir: string, files: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
    } else if (entry.isFile()) {
      if (SCAN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(path.join(dir, entry.name));
      }
    }
  }
}

function detectPico(root: string, files: string[]): PicoDetection {
  // 1. CDN link in any HTML/JS/TS file
  for (const f of files) {
    let text: string;
    try {
      text = fs.readFileSync(f, "utf-8");
    } catch {
      continue;
    }
    const m = CDN_RE.exec(text);
    if (m) {
      const version = m[1] ?? m[2] ?? m[3];
      return {
        method: "cdn",
        version: version === "latest" ? undefined : version,
        detail: `CDN link in ${path.relative(root, f)}`,
      };
    }
  }
  // 2. package.json dependency
  const pkgPath = path.join(root, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const ver =
        pkg.dependencies?.["@picocss/pico"] ??
        pkg.devDependencies?.["@picocss/pico"];
      if (ver) {
        return {
          method: "npm",
          version: ver.replace(/^[\^~>=< ]+/, "").split(" ")[0],
          detail: "@picocss/pico in package.json",
        };
      }
    } catch {
      // ignore malformed package.json
    }
  }
  // 3. vendored file
  for (const f of files) {
    if (VENDORED_NAME_RE.test(f)) {
      let version: string | undefined;
      try {
        const head = fs.readFileSync(f, "utf-8").slice(0, 2000);
        const vm = VENDOR_BANNER_RE.exec(head);
        if (vm) version = vm[1];
      } catch {
        // ignore
      }
      return {
        method: "vendored",
        version,
        detail: `vendored file ${path.relative(root, f)}`,
      };
    }
  }
  return { method: "none", detail: "no Pico delivery detected" };
}

export function scanDir(root: string): ScanResult {
  const abs = path.resolve(root);
  const files: string[] = [];
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    walk(abs, files);
  }
  files.sort();
  const detection = detectPico(abs, files);
  const hits: FileHit[] = [];
  for (const f of files) {
    let text: string;
    try {
      text = fs.readFileSync(f, "utf-8");
    } catch {
      continue;
    }
    hits.push(
      ...scanText(text, path.relative(abs, f), path.extname(f).toLowerCase()),
    );
  }
  return { root: abs, detection, hits, filesScanned: files.length };
}
