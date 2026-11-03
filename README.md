# picoexit

**Pico CSS was archived by its maintainer on 2026-10-04 — v2.1.1 is the final release, forever.**
picoexit audits your project's real Pico footprint (which selectors, which components, which version),
flags the selectors most likely to rot as browsers move on, and gives you a concrete exit plan:
stay pinned, migrate, or follow a community fork. For migrations it ships a codemod that rewrites
the most common Pico classes to Tailwind v4, Bulma v1, or plain CSS + Open Props — always as a
diff preview first, never touching your files without `--apply`.

![picoexit demo](demo/picoexit-demo.gif)

## Install

npm is not published yet — install from source (Node.js 20+):

```bash
git clone https://github.com/techdevfun/picoexit.git
cd picoexit
npm install        # dev dependencies only (build/test); zero runtime dependencies
npm run build
node dist/src/cli.js audit ./my-site   # scan a project
node dist/src/cli.js plan ./my-site    # get the 3-path exit plan
```

Zero runtime dependencies. 100% local — your code never leaves your machine.

## Quick example

```bash
$ picoexit audit ./my-site

# picoexit audit
- Pico delivery: **cdn** (v2.1.1)
- Pico selectors used: **45 distinct**, 85 occurrences

## Drift-risk selectors
- **role=search** (high risk): Pico styles [role=search] focus behavior
  with :has() selectors; core behavior, not just decoration.
  - index.html:29
...

Exit code: 1 (high drift-risk selectors in use)
```

`audit` exits non-zero when high drift-risk selectors are in use, so you can gate CI on it.
Add `--json` for machine-readable output, `--no-strict` to always exit 0.

```bash
$ picoexit migrate ./my-site --to tailwind --dry-run

--- index.html
+++ index.html
@@ line 39 @@
- <div class="grid">
+ <div class="grid gap-4 md:grid-cols-3">

## Manual work (not guessed by the codemod)
- index.html:19 — `.dropdown`: CSS-only <details> dropdown; Bulma dropdown
  needs its JS trigger structure. Manual rebuild.
```

Re-run with `--apply` to write the changes. Anything without a verified mapping is listed
as manual work — never guessed.

## Commands

| Command | What it does |
|---|---|
| `picoexit audit <dir> [--json] [--no-strict]` | Scan `.html/.css/.js/.ts/.jsx/.tsx` for Pico usage: delivery method (CDN / npm / vendored), version, every selector used with `file:line`, counts per component, drift-risk flags |
| `picoexit plan <dir> [--json]` | 3-path exit plan (stay pinned / migrate / community fork) with checklists, codemod coverage per target, and manual-effort estimates |
| `picoexit migrate <dir> --to tailwind\|bulma\|openprops [--dry-run] [--apply]` | Codemod Pico classes to the target; dry-run prints a diff preview (default) |

## Mapping table

60 Pico v2.x hooks mapped to three targets. Target docs verified **2026-11-03**
(Tailwind CSS v4, Bulma v1, Open Props). Highlights:

| Pico | Tailwind v4 | Bulma v1 | Plain CSS + Open Props |
|---|---|---|---|
| `.container` | `mx-auto w-full max-w-7xl px-4` | `container` | `max-width: var(--size-xxl); margin-inline: auto; ...` |
| `.grid` | `grid gap-4 md:grid-cols-N` (N counted from your markup) | `columns` + `column` on children | `display: grid; gap: var(--size-4);` |
| `article` | `rounded-lg border ... shadow-sm` | `box` | surface / radius / shadow tokens |
| `.contrast` / `.secondary` / `.outline` | `bg-zinc-900 ...` / `bg-zinc-200 ...` / `bg-transparent border-2` | `is-dark` / `is-light` / `is-outlined` | gray tokens |
| `.striped` (table) | manual CSS | `is-striped` | `tbody tr:nth-child(even)` rule |
| `dialog` / modal classes | manual (replace with target's dialog controller) | manual | manual |
| `data-theme` / `data-tooltip` | manual (target's dark-mode / tooltip pattern) | manual | manual |

Mappings are starting-point approximations — review against your design tokens.
The full table lives in [`src/mappings.ts`](src/mappings.ts).

## Why this exists

Pico's maintainer archived the project because AI can now generate lightweight semantic
HTML directly. npm and jsDelivr stay up, so nothing breaks today — but every Pico site
now carries the same unanswered question: *how much of my site actually depends on Pico,
and what rots first?* Generic codemod platforms (codemod.com, jscodeshift) have no
Pico-specific transforms, and framework upgrade tools only migrate *within* their own
framework. picoexit is the only tool that measures *your* Pico footprint first, then
prices the way out.

## Out of scope (v0.1.0)

- picoexit never tells you which path to take — it measures, you decide.
- No migration of Pico theme/Sass customizations (standard classes/components only).
- No realtime tracking of community forks (known forks listed with verification date).
- Pico v1.x: audit works, codemod targets v2.x.

## Roadmap

- Publish to the npm registry (pending owner token — install from source until then)
- GitHub Action wrapper (`picoexit audit` as a CI gate)
- More codemod targets (UnoCSS, plain cascade layers)
- Fork-tracking: re-check known community forks and report activity
- Vite/Astro plugin for in-build auditing

## Disclaimer

picoexit is a community-built migration helper for Pico CSS users. It is **not
affiliated with, endorsed by, or connected to the Pico CSS project or its
maintainer**. "Pico CSS" is used here under nominative fair use to describe
compatibility. Per the Pico license terms, the Pico CSS name and logo are not
covered by the MIT license — this project uses its own name and branding.

## License

MIT — see [LICENSE](LICENSE).
