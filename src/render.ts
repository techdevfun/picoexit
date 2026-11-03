/** Markdown + JSON renderers for audit, plan and migrate results. */
import type { AuditReport } from "./audit.js";
import type { PlanReport } from "./plan.js";
import type { MigrateResult } from "./migrate.js";
import { DOCS_VERIFIED } from "./mappings.js";

export function renderAuditMarkdown(a: AuditReport): string {
  const L: string[] = [];
  L.push("# picoexit audit");
  L.push("");
  L.push(`- Project: \`${a.root}\``);
  L.push(`- Pico delivery: **${a.detectionMethod}**${a.detectedVersion ? ` (v${a.detectedVersion})` : ""}`);
  L.push(`- Files scanned: ${a.filesScanned}`);
  L.push(`- Pico selectors used: **${a.distinctHooks} distinct**, ${a.totalHookOccurrences} occurrences`);
  L.push("");
  if (a.driftFlags.length > 0) {
    L.push("## Drift-risk selectors");
    L.push("");
    for (const f of a.driftFlags) {
      L.push(`- **${f.hook}** (${f.risk} risk): ${f.note}`);
      L.push(`  - ${f.locations.join(", ")}`);
    }
    L.push("");
  }
  L.push("## Usage by component");
  L.push("");
  for (const [comp, count] of Object.entries(a.byComponent).sort((x, y) => y[1] - x[1])) {
    L.push(`- ${comp}: ${count}`);
  }
  L.push("");
  L.push("## Selectors");
  L.push("");
  L.push("| Selector | Component | Uses | Drift risk | Locations |");
  L.push("|---|---|---|---|---|");
  for (const h of a.hooksUsed) {
    L.push(`| \`${h.hook}\` | ${h.component} | ${h.count} | ${h.driftRisk} | ${h.locations.join(", ")} |`);
  }
  L.push("");
  L.push(`Exit code: ${a.exitCode} (${a.exitCode === 1 ? "high drift-risk selectors in use" : "no high drift-risk selectors"})`);
  return L.join("\n");
}

export function renderPlanMarkdown(p: PlanReport): string {
  const L: string[] = [];
  L.push("# picoexit exit plan");
  L.push("");
  L.push(p.summary);
  L.push("");
  L.push(`Target docs verified: ${p.docsVerified}.`);
  L.push("");
  L.push("## Codemod coverage of your codebase");
  L.push("");
  L.push("| Target | Mapped hooks | Manual hooks | Coverage |");
  L.push("|---|---|---|---|");
  for (const [target, c] of Object.entries(p.coverageByTarget)) {
    L.push(`| ${target} | ${c.mapped} | ${c.manual} | ${c.coveragePct}% |`);
  }
  L.push("");
  for (const path of p.paths) {
    L.push(`## ${path.title}`);
    L.push("");
    L.push(path.verdict);
    L.push("");
    L.push(`Estimated manual work: ${path.manualHoursLow}–${path.manualHoursHigh}h`);
    L.push("");
    L.push("Checklist:");
    for (const c of path.checklist) L.push(`- [ ] ${c}`);
    L.push("");
    L.push("Risks:");
    for (const r of path.risks) L.push(`- ${r}`);
    L.push("");
  }
  L.push("---");
  L.push("_picoexit measures; you decide. Not affiliated with the Pico CSS project._");
  return L.join("\n");
}

export function renderMigratePreview(r: MigrateResult): string {
  const L: string[] = [];
  L.push(`# picoexit migrate --to ${r.target}${r.dryRun ? " --dry-run" : " --apply"}`);
  L.push("");
  L.push(`Files scanned: ${r.filesScanned}; files changed: ${r.changes.length}`);
  L.push("");
  for (const c of r.changes) {
    L.push(`--- ${c.file}`);
    L.push(`+++ ${c.file}`);
    for (const [lineNo, before, after] of c.hunks) {
      L.push(`@@ line ${lineNo} @@`);
      L.push(`- ${before}`);
      L.push(`+ ${after}`);
    }
    L.push("");
  }
  if (r.compatCss) {
    L.push(`## Generated compat stylesheet (${r.compatCssPath})`);
    L.push("");
    L.push("```css");
    L.push(r.compatCss);
    L.push("```");
    L.push("");
  }
  if (r.manual.length > 0) {
    L.push("## Manual work (not guessed by the codemod)");
    L.push("");
    for (const mIt of r.manual) {
      L.push(`- ${mIt.file}:${mIt.line} — \`${mIt.pico}\`: ${mIt.reason}`);
    }
    L.push("");
  }
  L.push(r.dryRun ? "_Dry run: no files were written. Re-run with --apply to write._" : "_Applied._");
  return L.join("\n");
}
