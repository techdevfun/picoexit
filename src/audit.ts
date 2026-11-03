/**
 * Audit: turn raw scan hits into a structured report — what Pico version
 * is in use, which hooks and components are used, and which carry
 * drift risk now that Pico is unmaintained.
 */
import { HOOK_LOOKUP, PICO_FINAL_VERSION } from "./pico-v2.js";
import type { ScanResult } from "./scan.js";

export interface HookUsage {
  hook: string;
  kind: string;
  component: string;
  count: number;
  driftRisk: string;
  locations: string[]; // "file:line"
}

export interface DriftFlag {
  hook: string;
  risk: string;
  note: string;
  locations: string[];
}

export interface AuditReport {
  root: string;
  detectionMethod: string;
  detectedVersion?: string;
  isFinalVersion: boolean;
  filesScanned: number;
  totalHookOccurrences: number;
  distinctHooks: number;
  hooksUsed: HookUsage[];
  byComponent: Record<string, number>;
  driftFlags: DriftFlag[];
  /** exit code the CLI should use: 1 when high drift-risk hooks are in use */
  exitCode: number;
}

export function buildAudit(scan: ScanResult): AuditReport {
  const byHook = new Map<string, { count: number; locations: string[] }>();
  for (const hit of scan.hits) {
    const e = byHook.get(hit.hook) ?? { count: 0, locations: [] };
    e.count += 1;
    const loc = `${hit.file}:${hit.line}`;
    if (!e.locations.includes(loc)) e.locations.push(loc);
    byHook.set(hit.hook, e);
  }

  const hooksUsed: HookUsage[] = [];
  const byComponent: Record<string, number> = {};
  const driftFlags: DriftFlag[] = [];

  for (const [hookName, usage] of byHook) {
    const meta = HOOK_LOOKUP.get(hookName);
    const component = meta?.component ?? "unknown";
    const risk = meta?.driftRisk ?? "low";
    hooksUsed.push({
      hook: hookName,
      kind: meta?.kind ?? "unknown",
      component,
      count: usage.count,
      driftRisk: risk,
      locations: usage.locations,
    });
    byComponent[component] = (byComponent[component] ?? 0) + usage.count;
    if (meta?.driftRisk === "high" || meta?.driftRisk === "medium") {
      driftFlags.push({
        hook: hookName,
        risk,
        note: meta.driftNote ?? meta.description,
        locations: usage.locations,
      });
    }
  }

  hooksUsed.sort((a, b) => b.count - a.count || a.hook.localeCompare(b.hook));
  driftFlags.sort((a, b) =>
    a.risk === b.risk ? a.hook.localeCompare(b.hook) : a.risk === "high" ? -1 : 1,
  );

  const hasHigh = driftFlags.some((f) => f.risk === "high");
  const detectedVersion = scan.detection.version;
  const isFinalVersion =
    detectedVersion !== undefined &&
    detectedVersion.replace(/^v/, "") === PICO_FINAL_VERSION;

  return {
    root: scan.root,
    detectionMethod: scan.detection.method,
    detectedVersion,
    isFinalVersion,
    filesScanned: scan.filesScanned,
    totalHookOccurrences: scan.hits.length,
    distinctHooks: byHook.size,
    hooksUsed,
    byComponent,
    driftFlags,
    exitCode: hasHigh ? 1 : 0,
  };
}
