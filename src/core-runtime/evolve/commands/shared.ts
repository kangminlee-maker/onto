/**
 * Shared command utilities.
 *
 * Consolidates patterns duplicated across command modules
 * (UF-CONCISENESS-SCOPE-MD-DUPLICATION).
 */

import { writeFileSync } from "node:fs";
import { readEvents } from "../../scope-runtime/event-store.js";
import { reduce } from "../../scope-runtime/reducer.js";
import { renderScopeMd } from "../renderers/scope-md.js";
import type { ScopePaths } from "../../scope-runtime/scope-manager.js";
import type { ScopeState } from "../../scope-runtime/types.js";

/**
 * Refresh scope.md from the current event stream.
 *
 * If `state` is already available (e.g., from a pipeline result),
 * pass it to avoid a redundant readEvents+reduce cycle.
 * Otherwise the function reads events and derives state itself.
 */
export function refreshScopeMd(paths: ScopePaths, state?: ScopeState): void {
  const s = state ?? reduce(readEvents(paths.events));
  const md = renderScopeMd(s);
  writeFileSync(paths.scopeMd, md, "utf-8");
}

/**
 * Slugify a scope title for use in process-mode artifacts:
 * - design-doc-draft.md frontmatter `functional_area`
 * - apply destination filename `{YYYYMMDD}-{slug}.md`
 *
 * Both consumers must produce the same slug so the design doc's metadata
 * and the committed filename stay aligned.
 */
export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "design-draft";
}
