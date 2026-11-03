/**
 * Pico CSS v2.x selector inventory.
 *
 * Derived by parsing the actual `@picocss/pico@2.1.1` stylesheet
 * (css/pico.min.css, downloaded 2026-11-03 from jsDelivr). Pico styles
 * semantic HTML directly, so most "selectors" are element selectors that
 * need no class; only a handful of classes exist.
 *
 * Drift risk grades how likely the selector's styling is to change as
 * browsers evolve, now that Pico receives no updates:
 * - high:   styling depends on :has() or frozen JS-driven behavior
 *           (no maintainer to fix a browser change)
 * - medium: native element with behavior Pico manages via JS/classes,
 *           or color-scheme interplay with the OS
 * - low:    stable, widely-supported CSS
 */

export type DriftRisk = "low" | "medium" | "high";
export type HookKind = "class" | "element" | "attribute";

export interface PicoHook {
  /** selector name without prefix: 'grid', 'article', 'data-theme' */
  name: string;
  kind: HookKind;
  component: string;
  description: string;
  driftRisk: DriftRisk;
  driftNote?: string;
}

export const PICO_FINAL_VERSION = "2.1.1";
export const PICO_ARCHIVED_DATE = "2026-10-04";

export const PICO_V2_HOOKS: PicoHook[] = [
  // ---- layout classes (real, from pico.min.css) ----
  { name: "container", kind: "class", component: "layout", description: "Fixed-width centered container (max-width 1130px at xxl)", driftRisk: "low" },
  { name: "container-fluid", kind: "class", component: "layout", description: "Full-width container with inline padding", driftRisk: "low" },
  { name: "grid", kind: "class", component: "layout", description: "Responsive auto-fit grid for direct children", driftRisk: "low" },
  { name: "overflow-auto", kind: "class", component: "layout", description: "Overflow utility for scrollable regions", driftRisk: "low" },

  // ---- button variant classes (real) ----
  { name: "contrast", kind: "class", component: "buttons", description: "High-contrast button variant (dark in light mode)", driftRisk: "low" },
  { name: "secondary", kind: "class", component: "buttons", description: "Muted secondary button variant", driftRisk: "low" },
  { name: "outline", kind: "class", component: "buttons", description: "Outline modifier for buttons", driftRisk: "low" },

  // ---- component classes (real) ----
  { name: "dropdown", kind: "class", component: "components", description: "CSS-only dropdown built on <details>", driftRisk: "high", driftNote: "Positioning and hover styles use :has() (li:has(label):hover); no maintainer to adapt if browsers change details/summary behavior." },
  { name: "close", kind: "class", component: "components", description: "Close affordance used inside modals", driftRisk: "medium", driftNote: "Tied to Pico's modal JS pattern (body.modal-is-* classes)." },
  { name: "striped", kind: "class", component: "components", description: "Zebra striping for tables", driftRisk: "low" },
  { name: "modal-is-open", kind: "class", component: "components", description: "Body class toggled by Pico modal JS while a dialog is open", driftRisk: "high", driftNote: "Depends on Pico's frozen JS modal behavior; browser dialog defaults may drift with no upstream fix." },
  { name: "modal-is-opening", kind: "class", component: "components", description: "Body class during modal open animation", driftRisk: "high", driftNote: "Depends on Pico's frozen JS modal behavior." },
  { name: "modal-is-closing", kind: "class", component: "components", description: "Body class during modal close animation", driftRisk: "high", driftNote: "Depends on Pico's frozen JS modal behavior." },

  // ---- layout elements ----
  { name: "header", kind: "element", component: "layout", description: "Page/section header, styled by Pico", driftRisk: "low" },
  { name: "footer", kind: "element", component: "layout", description: "Page/section footer, styled by Pico", driftRisk: "low" },
  { name: "main", kind: "element", component: "layout", description: "Main landmark, styled by Pico", driftRisk: "low" },
  { name: "section", kind: "element", component: "layout", description: "Section block, styled by Pico", driftRisk: "low" },
  { name: "aside", kind: "element", component: "layout", description: "Aside landmark, styled by Pico", driftRisk: "low" },
  { name: "article", kind: "element", component: "components", description: "Card-like content block (Pico's 'card')", driftRisk: "low" },

  // ---- navigation ----
  { name: "nav", kind: "element", component: "navigation", description: "Navigation bar, styled by Pico", driftRisk: "low" },

  // ---- typography elements ----
  { name: "h1", kind: "element", component: "typography", description: "Heading, styled by Pico", driftRisk: "low" },
  { name: "h2", kind: "element", component: "typography", description: "Heading, styled by Pico", driftRisk: "low" },
  { name: "h3", kind: "element", component: "typography", description: "Heading, styled by Pico", driftRisk: "low" },
  { name: "h4", kind: "element", component: "typography", description: "Heading, styled by Pico", driftRisk: "low" },
  { name: "h5", kind: "element", component: "typography", description: "Heading, styled by Pico", driftRisk: "low" },
  { name: "h6", kind: "element", component: "typography", description: "Heading, styled by Pico", driftRisk: "low" },
  { name: "p", kind: "element", component: "typography", description: "Paragraph, styled by Pico", driftRisk: "low" },
  { name: "a", kind: "element", component: "typography", description: "Link, styled by Pico", driftRisk: "low" },
  { name: "blockquote", kind: "element", component: "typography", description: "Block quote, styled by Pico", driftRisk: "low" },
  { name: "code", kind: "element", component: "typography", description: "Inline code, styled by Pico", driftRisk: "low" },
  { name: "pre", kind: "element", component: "typography", description: "Code block, styled by Pico", driftRisk: "low" },
  { name: "kbd", kind: "element", component: "typography", description: "Keyboard input, styled by Pico", driftRisk: "low" },
  { name: "mark", kind: "element", component: "typography", description: "Highlighted text, styled by Pico", driftRisk: "low" },
  { name: "hr", kind: "element", component: "typography", description: "Thematic break, styled by Pico", driftRisk: "low" },

  // ---- buttons ----
  { name: "button", kind: "element", component: "buttons", description: "Button element, styled by Pico (primary accent by default)", driftRisk: "low" },

  // ---- forms ----
  { name: "form", kind: "element", component: "forms", description: "Form, styled by Pico", driftRisk: "low" },
  { name: "fieldset", kind: "element", component: "forms", description: "Fieldset, styled by Pico", driftRisk: "low" },
  { name: "legend", kind: "element", component: "forms", description: "Fieldset legend, styled by Pico", driftRisk: "low" },
  { name: "label", kind: "element", component: "forms", description: "Label; checkbox/radio layout inside labels uses :has()", driftRisk: "medium", driftNote: "Pico uses label:has([type=checkbox],[type=radio]) for control layout; older browsers without :has() lose that layout." },
  { name: "input", kind: "element", component: "forms", description: "Text-like inputs, styled by Pico", driftRisk: "low" },
  { name: "select", kind: "element", component: "forms", description: "Select dropdown, styled by Pico", driftRisk: "low" },
  { name: "textarea", kind: "element", component: "forms", description: "Textarea, styled by Pico", driftRisk: "low" },

  // ---- data components ----
  { name: "table", kind: "element", component: "components", description: "Table, styled by Pico", driftRisk: "low" },
  { name: "thead", kind: "element", component: "components", description: "Table head, styled by Pico", driftRisk: "low" },
  { name: "th", kind: "element", component: "components", description: "Table header cell, styled by Pico", driftRisk: "low" },
  { name: "td", kind: "element", component: "components", description: "Table data cell, styled by Pico", driftRisk: "low" },
  { name: "dialog", kind: "element", component: "components", description: "Modal dialog; Pico manages open/close via JS classes", driftRisk: "medium", driftNote: "Pico's modal pattern couples <dialog> with body.modal-is-* classes and its own JS; the native dialog API is stable but the integration is frozen." },
  { name: "details", kind: "element", component: "components", description: "Accordion (details/summary), styled by Pico", driftRisk: "low" },
  { name: "summary", kind: "element", component: "components", description: "Accordion summary, styled by Pico", driftRisk: "low" },
  { name: "progress", kind: "element", component: "components", description: "Progress bar, styled by Pico", driftRisk: "low" },
  { name: "figure", kind: "element", component: "components", description: "Figure, styled by Pico", driftRisk: "low" },
  { name: "img", kind: "element", component: "components", description: "Image, styled by Pico", driftRisk: "low" },
  { name: "ul", kind: "element", component: "components", description: "Unordered list, styled by Pico", driftRisk: "low" },
  { name: "ol", kind: "element", component: "components", description: "Ordered list, styled by Pico", driftRisk: "low" },
  { name: "dl", kind: "element", component: "components", description: "Description list, styled by Pico", driftRisk: "low" },

  // ---- attribute hooks ----
  { name: "data-theme", kind: "attribute", component: "theming", description: "Per-element theme override (light/dark/auto)", driftRisk: "medium", driftNote: "Interacts with prefers-color-scheme (one media query in Pico); OS/browser color-scheme behavior may drift." },
  { name: "data-tooltip", kind: "attribute", component: "components", description: "CSS-only tooltip text", driftRisk: "low" },
  { name: "role=switch", kind: "attribute", component: "forms", description: "Checkbox rendered as a toggle switch", driftRisk: "low" },
  { name: "role=button", kind: "attribute", component: "buttons", description: "Link styled as a button", driftRisk: "low" },
  { name: "role=group", kind: "attribute", component: "forms", description: "Input group (input + button joined)", driftRisk: "high", driftNote: "Pico styles [role=group] focus behavior with :has() selectors (8 occurrences); core behavior, not just decoration." },
  { name: "role=search", kind: "attribute", component: "forms", description: "Search form pattern (input + submit joined)", driftRisk: "high", driftNote: "Pico styles [role=search] focus behavior with :has() selectors; core behavior, not just decoration." },
  { name: "aria-invalid", kind: "attribute", component: "forms", description: "Invalid form field state", driftRisk: "low" },
  { name: "aria-current", kind: "attribute", component: "navigation", description: "Current nav item marker", driftRisk: "low" },
];

export const HOOK_LOOKUP: Map<string, PicoHook> = new Map(
  PICO_V2_HOOKS.map((h) => [h.kind === "class" ? `.${h.name}` : h.name, h]),
);
