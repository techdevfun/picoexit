/**
 * Exit plan: three costed paths (stay pinned / migrate / community fork)
 * derived from a real audit, plus checklists and a manual-effort estimate.
 * picoexit never decides for you — it measures, then you choose.
 */
import { DOCS_VERIFIED, TARGETS, mappingFor, type Target } from "./mappings.js";
import type { AuditReport } from "./audit.js";

export interface PlanPath {
  id: "stay" | "migrate" | "fork";
  title: string;
  verdict: string;
  checklist: string[];
  /** estimated remaining manual work, in hours */
  manualHoursLow: number;
  manualHoursHigh: number;
  risks: string[];
}

export interface PlanReport {
  generatedFor: string;
  docsVerified: string;
  summary: string;
  coverageByTarget: Record<Target, { mapped: number; manual: number; coveragePct: number }>;
  paths: PlanPath[];
}

const KNOWN_FORKS = [
  {
    name: "anyblades/blades",
    url: "https://github.com/anyblades/blades",
    note: "Community continuation in the same spirit as Pico; early stage.",
  },
  {
    name: "leftium/nimble.css",
    url: "https://leftium.github.io/nimble.css/demo/pico.html",
    note: "Independent minimal-CSS project with a Pico demo; not a fork, similar philosophy.",
  },
];
export const FORKS_VERIFIED = "2026-11-03";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function buildPlan(audit: AuditReport): PlanReport {
  const usedHooks = audit.hooksUsed.map((h) => h.hook);
  const highFlags = audit.driftFlags.filter((f) => f.risk === "high");
  const mediumFlags = audit.driftFlags.filter((f) => f.risk === "medium");

  // coverage per target: share of distinct used hooks with a verified mapping
  const coverageByTarget = {} as PlanReport["coverageByTarget"];
  for (const target of TARGETS) {
    let mapped = 0;
    let manual = 0;
    for (const hook of usedHooks) {
      const m = mappingFor(hook);
      if (!m) {
        manual += 1;
        continue;
      }
      const entry = target === "openprops" ? m.openprops : m[target];
      if (entry === null || (Array.isArray(entry) && entry.length === 0)) manual += 1;
      else mapped += 1;
    }
    const total = mapped + manual;
    coverageByTarget[target] = {
      mapped,
      manual,
      coveragePct: total === 0 ? 100 : round1((mapped / total) * 100),
    };
  }

  // Manual-effort heuristic: each manual hook ~15-30 min to rebuild by hand,
  // drift-risk hooks add review time, base overhead 2h for testing.
  const worstManual = Math.max(
    coverageByTarget.tailwind.manual,
    coverageByTarget.bulma.manual,
    coverageByTarget.openprops.manual,
  );
  const migrateLow = round1(2 + worstManual * 0.25 + highFlags.length * 0.5);
  const migrateHigh = round1(2 + worstManual * 0.5 + highFlags.length * 1 + mediumFlags.length * 0.25);

  const versionNote = audit.detectedVersion
    ? `You are on Pico v${audit.detectedVersion}${audit.isFinalVersion ? " (the final release)" : " — newer than the final release? double-check"}`
    : "No pinned Pico version detected";
  const deliveryNote =
    audit.detectionMethod === "vendored"
      ? "vendored copy (good: you control the file)"
      : audit.detectionMethod === "cdn"
        ? "CDN link (works today; jsDelivr stays up, but you depend on a third party)"
        : audit.detectionMethod === "npm"
          ? "npm package (pinned version recommended)"
          : "no Pico delivery detected (audit may have found only incidental selectors)";

  const stay: PlanPath = {
    id: "stay",
    title: "Stay pinned on Pico v2.1.1",
    verdict:
      audit.totalHookOccurrences === 0
        ? "Trivially safe: no Pico usage found, nothing to do."
        : highFlags.length === 0
          ? `Viable short-to-medium term: ${versionNote}; ${deliveryNote}. No high drift-risk selectors in use.`
          : `Risky: ${highFlags.length} high drift-risk selector(s) in use (${highFlags.map((f) => f.hook).join(", ")}). Pinning does not fix :has()-dependent or JS-coupled behavior if browsers change it.`,
    checklist: [
      "Pin exactly @picocss/pico@2.1.1 (never `latest`)",
      "Vendor pico.min.css into your repo; serve it yourself",
      "Remove CDN links or add Subresource Integrity (SRI) hashes",
      "Lock the version in package.json (exact, no ^ range)",
      `Re-run \`picoexit audit\` in CI; fail the build on new high-risk selectors (exit code ${audit.exitCode} today)`,
      "Calendar reminder: re-evaluate in 12 months (browser drift is the real clock)",
    ],
    manualHoursLow: audit.totalHookOccurrences === 0 ? 0 : 1,
    manualHoursHigh: audit.totalHookOccurrences === 0 ? 0 : 3,
    risks: [
      "No security or browser-compat fixes will ever ship for Pico again",
      highFlags.length > 0
        ? `High-risk selectors in use: ${highFlags.map((f) => f.hook).join(", ")}`
        : "Low selector risk today, but the risk only grows with browser releases",
    ],
  };

  const bestTarget = (Object.entries(coverageByTarget) as Array<[Target, { coveragePct: number }]>)
    .sort((a, b) => b[1].coveragePct - a[1].coveragePct)[0][0];

  const migrate: PlanPath = {
    id: "migrate",
    title: "Migrate to a maintained framework",
    verdict: `Best codemod coverage for your codebase: ${bestTarget} (${coverageByTarget[bestTarget].coveragePct}% of used hooks mapped). picoexit rewrites the mapped part; the rest is explicit manual work, never guessed.`,
    checklist: [
      `Run \`picoexit migrate --to ${bestTarget} --dry-run\` and review the diff`,
      "Apply to a branch: `picoexit migrate --to <target> --apply`",
      "Work through the 'manual work' list the codemod prints",
      "Rebuild Pico's JS-coupled patterns by hand: modal (<dialog> + body classes), dropdown, tooltips, switches",
      "Replace data-theme with the target's dark-mode strategy",
      "Visual regression pass page by page; delete Pico afterwards",
    ],
    manualHoursLow: migrateLow,
    manualHoursHigh: migrateHigh,
    risks: [
      "Codemod output is a starting point, not a finished migration — budget the manual list honestly",
      "Element-styled components (article, dialog, details) need per-page review",
      "Pico theme variables (--pico-*) referenced in your own CSS must be replaced",
    ],
  };

  const fork: PlanPath = {
    id: "fork",
    title: "Follow a community fork",
    verdict:
      "Keeps your markup working with minimal changes, but trades Pico's risk for fork risk: forks are young, and none has clearly won yet.",
    checklist: [
      ...KNOWN_FORKS.map((f) => `Evaluate ${f.name} (${f.url}) — ${f.note}`),
      "Check fork activity: commits in the last 90 days, issue response time, release cadence",
      "Diff the fork's selectors against the Pico hooks this audit found",
      `Re-run \`picoexit audit\` after switching; confirm drift flags are addressed, not just renamed`,
      "Have a fallback: keep the migrate path warm",
    ],
    manualHoursLow: 2,
    manualHoursHigh: 8,
    risks: [
      "No fork is endorsed by the Pico maintainer; the ecosystem may still consolidate or stall",
      "A fork inherits Pico's architecture, including its :has()-dependent patterns",
      `Fork list verified ${FORKS_VERIFIED}; re-verify before depending on any of them`,
    ],
  };

  const summary =
    audit.totalHookOccurrences === 0
      ? "No Pico CSS usage detected in this project."
      : `This project uses ${audit.distinctHooks} distinct Pico selectors ` +
        `(${audit.totalHookOccurrences} occurrences across ${audit.filesScanned} scanned files), ` +
        `delivered via ${audit.detectionMethod}` +
        (audit.detectedVersion ? ` (v${audit.detectedVersion})` : "") +
        `. ${highFlags.length} high and ${mediumFlags.length} medium drift-risk selectors found.`;

  return {
    generatedFor: audit.root,
    docsVerified: DOCS_VERIFIED,
    summary,
    coverageByTarget,
    paths: [stay, migrate, fork],
  };
}
