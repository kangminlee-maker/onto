/**
 * Adapter Registry — single dispatch table for design adapters.
 *
 * Each adapter handles a specific family of scope types. The registry
 * enables runtime selection of the correct adapter based on scope_kind,
 * resolving C2 (methodology adapter has no runtime dispatch).
 *
 * Adapters registered:
 * - code-product: experience/interface scopes for building software
 * - methodology: process scopes for designing processes and governance
 */
import { methodologyAdapter } from "./methodology/adapter.js";
// ─── Registry Data ───
const codeProductEntry = {
    id: "code-product",
    name: "Code-Product Adapter",
    scope_kinds: ["experience", "interface"],
    perspectives: ["experience", "policy", "code"],
    surface_types: ["mockup", "api-contract"],
};
const methodologyEntry = {
    id: methodologyAdapter.name,
    name: "Methodology Adapter",
    scope_kinds: methodologyAdapter.scope_types,
    perspectives: methodologyAdapter.perspectives,
    surface_types: ["markdown"],
};
const REGISTRY = [
    codeProductEntry,
    methodologyEntry,
];
// ─── Public API ───
/**
 * Look up the adapter that handles a given scope kind.
 *
 * @param scopeKind - e.g. "experience", "interface", "process"
 * @returns The matching adapter entry, or undefined if none matches.
 */
export function getAdapter(scopeKind) {
    return REGISTRY.find((entry) => entry.scope_kinds.includes(scopeKind));
}
/**
 * List all registered adapters for discovery / introspection.
 */
export function listAdapters() {
    return REGISTRY;
}
