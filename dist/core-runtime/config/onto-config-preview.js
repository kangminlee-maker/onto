/**
 * Review UX Redesign P5 — `onto config validate` / `onto config show`
 * preview helper.
 *
 * # What this module is
 *
 * A pure function that takes a validated `OntoReviewConfig` + host signals
 * and returns a deterministic textual preview showing:
 *   (a) which topology shape the config would derive to,
 *   (b) which canonical `TopologyId` that shape would map to under the
 *       current environment, and
 *   (c) any degradation that would occur (per P3 universal fallback).
 *
 * # Why it exists
 *
 * The onboard + config-edit UX promise is "what you configured is what
 * runs". Without a preview step, users only see the runtime outcome after
 * starting a review (via the `[topology]` STDERR trace). This helper
 * surfaces the derivation BEFORE any review call, making config-time and
 * run-time answer the same question with the same inputs.
 *
 * # How it relates
 *
 * - Input: validated `OntoReviewConfig` (from `validateReviewConfig`) +
 *   detected axes (from `detectReviewAxes`).
 * - Output: a typed `Preview` object (topology id, shape, degraded?) plus
 *   a rendered string for CLI display.
 * - Shares derivation/mapping logic with `resolveAxisFirstTopology` so
 *   the preview and the runtime can never drift.
 */
import { shapeToTopologyId } from "../review/shape-to-topology-id.js";
import { deriveTopologyShape, } from "../review/topology-shape-derivation.js";
// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
/**
 * Run derivation + mapping + (if needed) degrade preview. Mirrors the
 * runtime resolver's axis-first path so the output matches what the user
 * would see in `[topology]` STDERR during a real review invocation.
 */
export function previewTopologyDerivation(config, signals) {
    const trace = [];
    const derivation = deriveTopologyShape(config, signals);
    for (const line of derivation.ok ? derivation.derived.trace : derivation.trace) {
        trace.push(`derive: ${line}`);
    }
    if (!derivation.ok) {
        // Runtime would degrade to main_native here. Mirror that.
        return attemptDegrade(trace, "derivation-failed", signals, derivation.reasons[0] ?? "derivation failed");
    }
    const mapping = shapeToTopologyId({
        shape: derivation.derived.shape,
        subagent_provider: derivation.derived.subagent_provider,
        signals: {
            claudeHost: signals.claudeHost,
            codexSessionActive: signals.codexSessionActive,
        },
    });
    for (const line of mapping.trace) {
        trace.push(`map: ${line}`);
    }
    if (!mapping.ok) {
        const providerSuffix = derivation.derived.subagent_provider
            ? `(${derivation.derived.subagent_provider})`
            : "";
        const requested = `${derivation.derived.shape}${providerSuffix}`;
        return attemptDegrade(trace, requested, signals, mapping.reason);
    }
    trace.push(`result: shape=${derivation.derived.shape} topology=${mapping.topology_id}`);
    return {
        ok: true,
        shape: derivation.derived.shape,
        topology_id: mapping.topology_id,
        degraded: false,
        trace,
    };
}
// ---------------------------------------------------------------------------
// Degrade path (mirrors resolver's attemptMainNativeDegrade)
// ---------------------------------------------------------------------------
function attemptDegrade(trace, requested, signals, reason) {
    trace.push(`degrade: requested=${requested} → actual=main_native (reason: ${reason})`);
    const mapping = shapeToTopologyId({
        shape: "main_native",
        subagent_provider: null,
        signals: {
            claudeHost: signals.claudeHost,
            codexSessionActive: signals.codexSessionActive,
        },
    });
    for (const line of mapping.trace) {
        trace.push(`degrade-fallback: ${line}`);
    }
    if (!mapping.ok) {
        trace.push("degrade-fallback: main_native unmappable — review would fall through to legacy priority ladder or no_host");
        return {
            ok: false,
            reason: `main_native fallback also unmappable: ${mapping.reason}. Review would fail with no_host at runtime.`,
            trace,
        };
    }
    trace.push(`result: shape=main_native (degraded) topology=${mapping.topology_id}`);
    return {
        ok: true,
        shape: "main_native",
        topology_id: mapping.topology_id,
        degraded: true,
        trace,
    };
}
// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
/**
 * Render a preview result as a human-readable block for CLI display.
 * Handles both success and failure outputs. Keep the format stable — the
 * onboard prose and `onto config` output use the same template so the
 * user learns one visual vocabulary.
 */
export function renderPreview(result) {
    const lines = [];
    if (result.ok) {
        lines.push("## Topology derivation preview");
        lines.push("");
        lines.push(`  shape:        ${result.shape}${result.degraded ? " (degraded)" : ""}`);
        lines.push(`  topology_id:  ${result.topology_id}`);
        if (result.degraded) {
            lines.push("");
            lines.push("  Note: P3 universal fallback would activate — the requested");
            lines.push("        configuration is not reachable under the current signals.");
        }
    }
    else {
        lines.push("## Topology derivation preview — FAILED");
        lines.push("");
        lines.push(`  reason: ${result.reason}`);
    }
    lines.push("");
    lines.push("  Trace:");
    for (const line of result.trace) {
        lines.push(`    ${line}`);
    }
    return lines.join("\n");
}
