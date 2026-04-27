// runtime-mirror-of: step-4-integration §3.5.1 rule 3
//
// phase3-snapshot.yml artifact writer (W-A-92).
//
// Purpose: lightweight snapshot of wip.yml at Phase 3 rendering time, used by
// Phase 3.5 step 1.5 for stale-check (UF-structure-02 해소 — race detection
// against external mutation between Phase 3 prompt + Principal reply).
//
// Path: {project}/.onto/builds/{session}/phase3-snapshot.yml
// Write timing: Phase 3 rendering 직전 (concurrent with rationale-queue.yaml).
// Atomic write (temp + rename).
//
// Schema (§3.5.1 rule 3 lightweight):
//   per element: rationale_state + gate_count + confidence only.
//
// W-A-93 (Phase 3.5 runtime) compares this snapshot vs Phase 3 reply 시점의
// wip.yml — mismatch = phase_3_5_input_invalid halt.

import * as fs from "node:fs";
import { join } from "node:path";
import { stringify as yamlStringify } from "yaml";

import type {
  Confidence,
  IntentInference,
  RationaleState,
} from "./wip-element-types.js";

export const PHASE3_SNAPSHOT_FILENAME = "phase3-snapshot.yml" as const;
export const PHASE3_SNAPSHOT_SCHEMA_VERSION = "1.0" as const;

export interface Phase3SnapshotEntry {
  element_id: string;
  rationale_state: RationaleState;
  gate_count: number;
  confidence: Confidence | null;
}

export interface Phase3SnapshotDocument {
  /** schema version (review UF-EVOLUTION-02). Bump on schema changes so
   *  W-A-93 stale-check consumer can branch on incompatible versions. */
  version: typeof PHASE3_SNAPSHOT_SCHEMA_VERSION;
  session_id: string;
  written_at: string; // ISO 8601 UTC
  elements: Phase3SnapshotEntry[];
}

export interface Phase3SnapshotBuildInput {
  session_id: string;
  written_at: string;
  /** wip.yml 의 elements[] id → intent_inference (terminal-pending 또는 그 이상) */
  intentInferences: Map<string, IntentInference | undefined>;
}

/**
 * Build a deterministic phase3-snapshot.yml document.
 * Element ordering: lexicographic by element_id (stable, matches W-A-93's
 * stale-check semantics — order should not affect the comparison itself but
 * deterministic ordering simplifies diff reading + audit).
 */
export function buildPhase3SnapshotDocument(
  input: Phase3SnapshotBuildInput,
): Phase3SnapshotDocument {
  const ids = [...input.intentInferences.keys()].sort();
  const elements: Phase3SnapshotEntry[] = ids.map((id) => {
    const inf = input.intentInferences.get(id);
    return {
      element_id: id,
      rationale_state: inf?.rationale_state ?? "empty",
      gate_count: inf?.provenance.gate_count ?? 1,
      confidence: inf?.confidence ?? null,
    };
  });
  return {
    version: PHASE3_SNAPSHOT_SCHEMA_VERSION,
    session_id: input.session_id,
    written_at: input.written_at,
    elements,
  };
}

/**
 * Atomic write of phase3-snapshot.yml to .onto/builds/{session_root}/.
 */
export function writePhase3SnapshotAtomic(
  sessionRoot: string,
  document: Phase3SnapshotDocument,
): { path: string } {
  if (!fs.existsSync(sessionRoot)) {
    fs.mkdirSync(sessionRoot, { recursive: true });
  }
  const target = join(sessionRoot, PHASE3_SNAPSHOT_FILENAME);
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, yamlStringify(document));
  fs.renameSync(tmp, target);
  return { path: target };
}

/**
 * Convenience: build + atomic write.
 */
export function emitPhase3Snapshot(
  sessionRoot: string,
  input: Phase3SnapshotBuildInput,
): { path: string; document: Phase3SnapshotDocument } {
  const document = buildPhase3SnapshotDocument(input);
  const { path } = writePhase3SnapshotAtomic(sessionRoot, document);
  return { path, document };
}

/**
 * Stale-check helper for W-A-93 (Phase 3.5 step 1.5).
 * Returns ids whose snapshot triple ≠ current wip.yml triple — these are
 * stale references in rationale_decisions[].
 */
export function detectStaleElements(
  snapshot: Phase3SnapshotDocument,
  currentInferences: Map<string, IntentInference | undefined>,
): string[] {
  const stale: string[] = [];
  for (const entry of snapshot.elements) {
    const current = currentInferences.get(entry.element_id);
    const currentState = current?.rationale_state ?? "empty";
    const currentGate = current?.provenance.gate_count ?? 1;
    const currentConfidence = current?.confidence ?? null;
    if (
      currentState !== entry.rationale_state ||
      currentGate !== entry.gate_count ||
      currentConfidence !== entry.confidence
    ) {
      stale.push(entry.element_id);
    }
  }
  return stale;
}
