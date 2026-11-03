/**
 * Pico v2.x -> target mapping table.
 *
 * Each entry maps one Pico hook to an equivalent in the target framework.
 * null means "no direct equivalent — listed as manual work instead".
 * These are starting-point approximations for a codemod, not pixel-perfect
 * translations: always review against your own design tokens.
 *
 * Docs verified 2026-11-03:
 * - Tailwind CSS v4 (tailwindcss.com/docs)
 * - Bulma v1 (bulma.io/documentation)
 * - Open Props v1.7 (open-props.style)
 */
export type Target = "tailwind" | "bulma" | "openprops";

export const TARGETS: Target[] = ["tailwind", "bulma", "openprops"];

export const DOCS_VERIFIED = "2026-11-03";

export interface Mapping {
  pico: string;
  tailwind: string[] | null;
  bulma: string[] | null;
  /** CSS declarations for the plain-CSS + Open Props target (null = manual) */
  openprops: string | null;
  note: string;
}

export const MAPPINGS: Mapping[] = [
  // ---- layout ----
  { pico: ".container", tailwind: ["mx-auto", "w-full", "max-w-7xl", "px-4"], bulma: ["container"], openprops: "max-width: var(--size-xxl); margin-inline: auto; padding-inline: var(--size-4);", note: "Pico container caps at 1130px (xxl); max-w-7xl (80rem) is close. Tune to your tokens." },
  { pico: ".container-fluid", tailwind: ["w-full", "px-4"], bulma: ["container", "is-fluid"], openprops: "width: 100%; padding-inline: var(--size-4);", note: "" },
  { pico: ".grid", tailwind: null, bulma: ["columns"], openprops: "display: grid; gap: var(--size-4);", note: "Grid is structural: tailwind needs explicit md:grid-cols-N (codemod counts children); Bulma needs .column on each child." },
  { pico: ".overflow-auto", tailwind: ["overflow-auto"], bulma: null, openprops: "overflow: auto;", note: "Bulma v1 has no overflow utility; add a custom class." },
  { pico: "header", tailwind: null, bulma: null, openprops: null, note: "Semantic element; add layout utilities as needed." },
  { pico: "footer", tailwind: null, bulma: null, openprops: null, note: "Semantic element; add layout utilities as needed." },
  { pico: "main", tailwind: null, bulma: null, openprops: null, note: "Semantic element; add layout utilities as needed." },
  { pico: "section", tailwind: null, bulma: null, openprops: null, note: "Semantic element; add spacing utilities as needed." },
  { pico: "aside", tailwind: null, bulma: null, openprops: null, note: "Semantic element; add layout utilities as needed." },
  { pico: "article", tailwind: ["rounded-lg", "border", "border-zinc-200", "bg-white", "p-6", "shadow-sm"], bulma: ["box"], openprops: "background: var(--surface-1); border: var(--border-size-1) solid var(--surface-2); border-radius: var(--radius-3); padding: var(--size-5); box-shadow: var(--shadow-2);", note: "Pico's 'card'. Adjust surface/shadow to your theme." },

  // ---- navigation ----
  { pico: "nav", tailwind: ["flex", "items-center", "justify-between", "gap-4"], bulma: ["navbar"], openprops: "display: flex; align-items: center; justify-content: space-between; gap: var(--size-3);", note: "Bulma navbar needs its full navbar-* structure; see Bulma navbar docs." },
  { pico: "aria-current", tailwind: null, bulma: null, openprops: null, note: "Keep the attribute; style the active link with your own active class." },

  // ---- typography ----
  { pico: "h1", tailwind: ["text-4xl", "font-bold"], bulma: ["title", "is-1"], openprops: "font-size: var(--font-size-6); font-weight: var(--font-weight-7);", note: "Type scale is opinionated; align with your scale." },
  { pico: "h2", tailwind: ["text-3xl", "font-bold"], bulma: ["title", "is-2"], openprops: "font-size: var(--font-size-5); font-weight: var(--font-weight-7);", note: "" },
  { pico: "h3", tailwind: ["text-2xl", "font-semibold"], bulma: ["title", "is-3"], openprops: "font-size: var(--font-size-4); font-weight: var(--font-weight-6);", note: "" },
  { pico: "h4", tailwind: ["text-xl", "font-semibold"], bulma: ["title", "is-4"], openprops: "font-size: var(--font-size-3); font-weight: var(--font-weight-6);", note: "" },
  { pico: "h5", tailwind: ["text-lg", "font-semibold"], bulma: ["title", "is-5"], openprops: "font-size: var(--font-size-2); font-weight: var(--font-weight-6);", note: "" },
  { pico: "h6", tailwind: ["text-base", "font-semibold"], bulma: ["title", "is-6"], openprops: "font-size: var(--font-size-1); font-weight: var(--font-weight-6);", note: "" },
  { pico: "p", tailwind: null, bulma: null, openprops: null, note: "Tailwind preflight resets paragraphs; add spacing/typography utilities (or the typography plugin) as needed." },
  { pico: "a", tailwind: null, bulma: null, openprops: null, note: "Link color lives in your theme; no automatic mapping." },
  { pico: "blockquote", tailwind: ["border-l-4", "border-zinc-300", "pl-4", "italic"], bulma: null, openprops: "border-inline-start: var(--border-size-3) solid var(--surface-3); padding-inline-start: var(--size-3); font-style: italic;", note: "" },
  { pico: "code", tailwind: ["rounded", "bg-zinc-100", "px-1", "font-mono", "text-sm"], bulma: null, openprops: "background: var(--surface-2); border-radius: var(--radius-2); padding: var(--size-1); font-family: var(--font-mono);", note: "" },
  { pico: "pre", tailwind: ["rounded-lg", "bg-zinc-100", "p-4", "overflow-auto", "font-mono", "text-sm"], bulma: null, openprops: "background: var(--surface-2); border-radius: var(--radius-3); padding: var(--size-4); overflow: auto; font-family: var(--font-mono);", note: "" },
  { pico: "kbd", tailwind: ["rounded", "border", "border-zinc-300", "bg-zinc-100", "px-1.5", "font-mono", "text-xs"], bulma: null, openprops: "border: var(--border-size-1) solid var(--surface-3); border-radius: var(--radius-2); padding-inline: var(--size-1); font-family: var(--font-mono);", note: "" },
  { pico: "mark", tailwind: ["bg-yellow-200", "px-1"], bulma: null, openprops: "background: var(--yellow-2); padding-inline: var(--size-1);", note: "" },
  { pico: "hr", tailwind: ["border-zinc-200", "my-6"], bulma: null, openprops: "border-color: var(--surface-3); margin-block: var(--size-5);", note: "" },

  // ---- buttons ----
  { pico: "button", tailwind: ["rounded-md", "bg-blue-600", "px-4", "py-2", "font-medium", "text-white", "hover:bg-blue-700"], bulma: ["button"], openprops: "background: var(--blue-7); color: white; border-radius: var(--radius-2); padding: var(--size-2) var(--size-4); font-weight: var(--font-weight-6);", note: "Pico's default accent is its blue; match these to YOUR brand color." },
  { pico: ".contrast", tailwind: ["bg-zinc-900", "text-white", "hover:bg-zinc-800"], bulma: ["is-dark"], openprops: "background: var(--gray-9); color: var(--gray-0);", note: "Pair with your button base classes." },
  { pico: ".secondary", tailwind: ["bg-zinc-200", "text-zinc-900", "hover:bg-zinc-300"], bulma: ["is-light"], openprops: "background: var(--gray-2); color: var(--gray-8);", note: "Pair with your button base classes." },
  { pico: ".outline", tailwind: ["bg-transparent", "border-2", "border-current"], bulma: ["is-outlined"], openprops: "background: transparent; border: var(--border-size-2) solid currentColor;", note: "Modifier: keep alongside the button's color classes." },
  { pico: "role=button", tailwind: ["inline-block", "rounded-md", "bg-blue-600", "px-4", "py-2", "font-medium", "text-white"], bulma: ["button"], openprops: "display: inline-block;", note: "Anchor acting as a button; same palette note as <button>." },

  // ---- forms ----
  { pico: "form", tailwind: null, bulma: null, openprops: null, note: "Semantic element; add layout utilities as needed." },
  { pico: "fieldset", tailwind: ["border", "border-zinc-200", "rounded-lg", "p-4"], bulma: null, openprops: "border: var(--border-size-1) solid var(--surface-3); border-radius: var(--radius-3); padding: var(--size-4);", note: "" },
  { pico: "legend", tailwind: ["px-2", "font-medium"], bulma: null, openprops: "padding-inline: var(--size-2); font-weight: var(--font-weight-6);", note: "" },
  { pico: "label", tailwind: ["block", "text-sm", "font-medium", "mb-1"], bulma: ["label"], openprops: "display: block; font-size: var(--font-size-0); font-weight: var(--font-weight-6); margin-block-end: var(--size-1);", note: "Checkbox/radio-in-label layout (Pico's :has() trick) needs manual rebuild." },
  { pico: "input", tailwind: ["w-full", "rounded-md", "border", "border-zinc-300", "px-3", "py-2"], bulma: ["input"], openprops: "width: 100%; border: var(--border-size-1) solid var(--surface-3); border-radius: var(--radius-2); padding: var(--size-2) var(--size-3);", note: "Excludes checkbox/radio/file/range: those need per-type rebuild." },
  { pico: "select", tailwind: ["w-full", "rounded-md", "border", "border-zinc-300", "px-3", "py-2", "bg-white"], bulma: ["input"], openprops: "width: 100%; border: var(--border-size-1) solid var(--surface-3); border-radius: var(--radius-2);", note: "Bulma wants a .select wrapper for full styling; add it manually." },
  { pico: "textarea", tailwind: ["w-full", "rounded-md", "border", "border-zinc-300", "px-3", "py-2"], bulma: ["textarea"], openprops: "width: 100%; border: var(--border-size-1) solid var(--surface-3); border-radius: var(--radius-2); padding: var(--size-2) var(--size-3);", note: "" },
  { pico: "role=switch", tailwind: null, bulma: null, openprops: null, note: "Toggle switch is a component in every target; rebuild with the target's switch pattern (e.g. Tailwind peer-checked, Bulma extension)." },
  { pico: "role=group", tailwind: null, bulma: null, openprops: null, note: "Joined input+button group; each target has its own pattern (Tailwind flex join, Bulma .field.has-addons). Manual." },
  { pico: "role=search", tailwind: null, bulma: null, openprops: null, note: "Same as role=group: rebuild with the target's input-group pattern." },
  { pico: "aria-invalid", tailwind: ["border-red-500"], bulma: ["is-danger"], openprops: "border-color: var(--red-6);", note: "Attribute kept; codemod adds the error class alongside it." },

  // ---- components ----
  { pico: "table", tailwind: ["w-full", "text-sm", "text-left"], bulma: ["table"], openprops: "width: 100%; font-size: var(--font-size-1);", note: "" },
  { pico: "thead", tailwind: null, bulma: null, openprops: null, note: "Style via your table CSS; no class needed." },
  { pico: "th", tailwind: ["font-semibold", "text-left", "px-3", "py-2", "border-b"], bulma: null, openprops: "font-weight: var(--font-weight-6); text-align: left;", note: "" },
  { pico: "td", tailwind: ["px-3", "py-2", "border-b", "border-zinc-100"], bulma: null, openprops: "border-block-end: var(--border-size-1) solid var(--surface-2);", note: "" },
  { pico: ".striped", tailwind: null, bulma: ["is-striped"], openprops: "tbody tr:nth-child(even) { background: var(--surface-2); }", note: "Tailwind needs a CSS rule or odd: variants per row; listed as manual CSS for tailwind." },
  { pico: "dialog", tailwind: null, bulma: null, openprops: null, note: "Pico's modal couples <dialog> with body.modal-is-* classes and its JS; replace with the target's modal/dialog controller. Manual." },
  { pico: ".close", tailwind: null, bulma: ["delete"], openprops: null, note: "Modal close affordance; Bulma .delete fits, others need a small custom button." },
  { pico: ".modal-is-open", tailwind: null, bulma: null, openprops: null, note: "Pico modal JS body class; remove with the modal rewrite." },
  { pico: ".modal-is-opening", tailwind: null, bulma: null, openprops: null, note: "Pico modal JS body class; remove with the modal rewrite." },
  { pico: ".modal-is-closing", tailwind: null, bulma: null, openprops: null, note: "Pico modal JS body class; remove with the modal rewrite." },
  { pico: "details", tailwind: ["border", "border-zinc-200", "rounded-lg", "px-4", "py-2"], bulma: null, openprops: "border: var(--border-size-1) solid var(--surface-3); border-radius: var(--radius-3);", note: "Accordion shell; style <summary> marker per target." },
  { pico: "summary", tailwind: ["cursor-pointer", "font-medium"], bulma: null, openprops: "cursor: pointer; font-weight: var(--font-weight-6);", note: "" },
  { pico: ".dropdown", tailwind: null, bulma: ["dropdown"], openprops: null, note: "CSS-only <details> dropdown; Bulma dropdown needs its JS trigger structure. Manual rebuild." },
  { pico: "progress", tailwind: ["w-full", "accent-blue-600"], bulma: ["progress"], openprops: "width: 100%; accent-color: var(--blue-6);", note: "" },
  { pico: "figure", tailwind: null, bulma: null, openprops: null, note: "Semantic element; no class needed." },
  { pico: "img", tailwind: ["max-w-full", "h-auto", "rounded"], bulma: null, openprops: "max-width: 100%; height: auto;", note: "" },
  { pico: "ul", tailwind: null, bulma: null, openprops: null, note: "Tailwind preflight removes list styles; re-add list-disc/list-inside where wanted." },
  { pico: "ol", tailwind: null, bulma: null, openprops: null, note: "Same as ul." },
  { pico: "dl", tailwind: null, bulma: null, openprops: null, note: "Semantic element; style per your design." },
  { pico: "data-tooltip", tailwind: null, bulma: null, openprops: null, note: "CSS-only tooltip; every target needs a tooltip component or custom CSS. Manual." },

  // ---- theming ----
  { pico: "data-theme", tailwind: null, bulma: null, openprops: null, note: "Theme override; replace with the target's dark-mode strategy (Tailwind class-based dark mode, Bulma color scheme, or your own tokens). Manual." },
];

export function mappingFor(pico: string): Mapping | undefined {
  return MAPPINGS.find((m) => m.pico === pico);
}

export function mappingForTarget(pico: string, target: Target): string[] | string | null | undefined {
  const m = mappingFor(pico);
  if (!m) return undefined; // unknown hook: not in mapping table
  if (target === "openprops") return m.openprops;
  return m[target];
}
