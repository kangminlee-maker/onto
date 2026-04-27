// runtime-mirror-of: step-4-integration §2.7
//
// rationale-queue.yaml artifact writer (W-A-91).
//
// Path: {project}/.onto/builds/{session}/rationale-queue.yaml
// Schema version: "1.1" (r3 — gate_count_histogram map generalization)
//
// Write timing: Phase 3 rendering 직전 (Hook δ output 직후).
// Atomic write (temp + rename) for crash safety.
//
// Caller (Runtime Coordinator) supplies session_root path; this module owns
// the schema serialization + atomic write mechanic.

import * as fs from "node:fs";
import { join } from "node:path";
import { stringify as yamlStringify } from "yaml";

import type {
  GroupingKind,
  HookDeltaResult,
  RenderEntry,
} from "./hook-delta.js";
import type { IntentInference } from "./wip-element-types.js";

export const RATIONALE_QUEUE_SCHEMA_VERSION = "1.1" as const;
export const RATIONALE_QUEUE_FILENAME = "rationale-queue.yaml" as const;

/**
 * Element-level snapshot of intent_inference content (subset persisted in
 * rationale-queue.yaml entries[].intent_inference_snapshot per §2.7).
 *
 * `present` (review UF-PRAGMATICS-01) distinguishes:
 *   - false: the wip element has no intent_inference at all (Stage 2 explorer
 *     just added the entity, Hook α did not run yet, or it was skipped)
 *   - true: intent_inference exists but its content fields may individually
 *     be null (e.g. rationale_state=empty, or rationale_state=domain_scope_miss
 *     with cleared inferred_meaning/justification)
 */
export interface IntentInferenceSnapshot {
  present: boolean;
  inferred_meaning: string | null;
  justification: string | null;
  domain_refs: { manifest_ref: string; heading: string; excerpt: string }[];
  state_reason: string | null;
}

export interface RationaleQueueEntry {
  element_id: string;
  render_bucket: "individual" | "group_sample" | "group_truncated" | "throttled_out";
  priority_score: number;
  rationale_state: string;
  confidence: "low" | "medium" | "high" | null;
  gate_count: number;
  /** Hook δ 의 §3.4.1 grouping decision (review UF-PRAGMATICS-02). null
   *  for ungroupable entries (e.g. priority-top individual without group key). */
  grouping_kind: GroupingKind | null;
  /** Resolved grouping key value when grouping_kind != null. omitted otherwise. */
  grouping_key_value?: NonNullable<RenderEntry["grouping_key_value"]>;
  intent_inference_snapshot: IntentInferenceSnapshot;
}

export interface RationaleQueueDocument {
  version: typeof RATIONALE_QUEUE_SCHEMA_VERSION;
  session_id: string;
  written_at: string; // ISO 8601 UTC
  rendered_count: number;
  throttled_out_count: number;
  rationale_review_degraded: boolean;
  gate_count_histogram: Record<string, number>;
  entries: RationaleQueueEntry[];
}

export interface RationaleQueueBuildInput {
  session_id: string;
  written_at: string;
  hookDeltaResult: HookDeltaResult;
  /**
   * Per-element intent_inference snapshot — caller passes the wip.yml's
   * elements[].intent_inference Map. Hook δ entries reference these for
   * the persisted intent_inference_snapshot subset.
   */
  intentInferences: Map<string, IntentInference>;
}

/**
 * Build a complete rationale-queue.yaml document from Hook δ output.
 * Pure function — no I/O.
 */
export function buildRationaleQueueDocument(
  input: RationaleQueueBuildInput,
): RationaleQueueDocument {
  const entries: RationaleQueueEntry[] = input.hookDeltaResult.entries.map(
    (e) => {
      const entry: RationaleQueueEntry = {
        element_id: e.element_id,
        render_bucket: e.render_bucket,
        priority_score: e.priority_score,
        rationale_state: e.rationale_state,
        confidence: e.confidence,
        gate_count: e.gate_count,
        grouping_kind: e.grouping_kind,
        intent_inference_snapshot: snapshotInference(
          input.intentInferences.get(e.element_id),
        ),
      };
      // Hook δ §3.4.1 grouping_key_value preserved when present (UF-PRAGMATICS-02)
      if (e.grouping_key_value !== undefined) {
        entry.grouping_key_value = e.grouping_key_value;
      }
      return entry;
    },
  );

  return {
    version: RATIONALE_QUEUE_SCHEMA_VERSION,
    session_id: input.session_id,
    written_at: input.written_at,
    rendered_count: input.hookDeltaResult.rendered_count,
    throttled_out_count: input.hookDeltaResult.throttled_out_count,
    rationale_review_degraded: input.hookDeltaResult.rationale_review_degraded,
    gate_count_histogram: input.hookDeltaResult.gate_count_histogram,
    entries,
  };
}

function snapshotInference(
  inf: IntentInference | undefined,
): IntentInferenceSnapshot {
  if (!inf) {
    return {
      present: false,
      inferred_meaning: null,
      justification: null,
      domain_refs: [],
      state_reason: null,
    };
  }
  return {
    present: true,
    inferred_meaning: inf.inferred_meaning ?? null,
    justification: inf.justification ?? null,
    domain_refs: inf.domain_refs ?? [],
    state_reason: inf.state_reason ?? null,
  };
}

/**
 * Atomic write of rationale-queue.yaml to .onto/builds/{session_root}/.
 * temp + rename pattern for crash safety.
 */
export function writeRationaleQueueAtomic(
  sessionRoot: string,
  document: RationaleQueueDocument,
): { path: string } {
  if (!fs.existsSync(sessionRoot)) {
    fs.mkdirSync(sessionRoot, { recursive: true });
  }
  const target = join(sessionRoot, RATIONALE_QUEUE_FILENAME);
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, yamlStringify(document));
  fs.renameSync(tmp, target);
  return { path: target };
}

/**
 * Convenience: build + atomic write in one call.
 */
export function emitRationaleQueue(
  sessionRoot: string,
  input: RationaleQueueBuildInput,
): { path: string; document: RationaleQueueDocument } {
  const document = buildRationaleQueueDocument(input);
  const { path } = writeRationaleQueueAtomic(sessionRoot, document);
  return { path, document };
}
