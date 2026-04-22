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
/**
 * Refresh scope.md from the current event stream.
 *
 * If `state` is already available (e.g., from a pipeline result),
 * pass it to avoid a redundant readEvents+reduce cycle.
 * Otherwise the function reads events and derives state itself.
 */
export function refreshScopeMd(paths, state) {
    const s = state ?? reduce(readEvents(paths.events));
    const md = renderScopeMd(s);
    writeFileSync(paths.scopeMd, md, "utf-8");
}
