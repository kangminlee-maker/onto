// runtime-mirror-of: step-4-integration §4 + §4.3 + configuration.md §4.11 (b)
//
// Raw ontology writer (post-Phase 3.5) — serializes the coordinator's
// completed cycle into `{session_root}/raw.yml` with atomic write semantics
// and conditional element-level intent_inference block omission.
//
// Behavior contract (Step 4 §4.3 omit semantic + §4.11 (b)):
//   - When `writeIntentInferenceToRawYml === true`, every element's
//     intent_inference block is serialized in full (matching wip schema),
//     *including* nested `principal_provided_rationale` when populated by
//     Phase 3.5 (Step 4 §3.6.1 element-level seat).
//   - When `writeIntentInferenceToRawYml === false`, the intent_inference
//     field is *omitted* from each element. The nested
//     `principal_provided_rationale` is omitted *as part of* the
//     intent_inference block (it is a sub-field, not a sibling) — single
//     omission gate, no separate flag. PR #236 already canonicalized
//     IntentInference.principal_provided_rationale as the single seat,
//     so this writer never emits a duplicate top-level field.
//
// Reader contract (govern reader / dashboard):
//   - "no inference" (v0 fallback) vs "suppressed inference" (v1 mode +
//     write_intent_inference_to_raw_yml=false) is *not* distinguishable
//     from the element shape alone. The single source of truth is
//     `meta.inference_mode`:
//       * inference_mode=none + intent_inference absent → v0 fallback
//       * inference_mode∈{full,degraded} + intent_inference absent →
//         v1 mode write-suppressed (wip carries the data, raw drops it)
//   - configuration.md §4.11 (b) declares this as the *intentional*
//     contract — readers MUST consult meta.inference_mode; element-shape
//     inference alone is insufficient by design (PR #241 review C-1
//     finding acknowledged: meta is the single source).
//
// Atomicity: writes to `{path}.tmp` first then renames — POSIX rename is
// atomic, so readers never observe a partial file. Mirrors the manifest +
// raw-meta atomic write pattern (W-A-94 / W-A-97 / W-A-100).

import { renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "yaml";
import type { RawMetaExtensionsV1 } from "./raw-meta-extended-schema.js";
import type {
  IntentInference,
  WipElementForHookAlpha,
} from "./wip-element-types.js";

/**
 * Raw element shape — identical to `WipElementForHookAlpha` since
 * `principal_provided_rationale` is canonicalized as a *nested field* of
 * `IntentInference` (see wip-element-types.ts). The writer never emits a
 * top-level `principal_provided_rationale` to avoid the dual-authority
 * drift flagged by PR #241 review C-1.
 */
export type RawYmlElement = WipElementForHookAlpha;

export interface RawYmlDocument {
  meta: RawMetaExtensionsV1;
  elements: RawYmlElement[];
}

export interface RawYmlWriterInput {
  /** Where to write — typically `{sessions_dir}/{session_id}` */
  sessionRoot: string;
  /** raw.yml meta block — caller composes from coordinator + manifest. */
  meta: RawMetaExtensionsV1;
  /** Element list — caller composes from coordinator's element updates +
   *  the original Stage 1 entity list (id/type/name/definition/certainty
   *  fields come from entities; intent_inference comes from the cycle). */
  elements: RawYmlElement[];
  /** Mirrors `CoordinatorResult.completed.writeIntentInferenceToRawYml`.
   *  When false, every element's intent_inference (and
   *  principal_provided_rationale) is omitted from the serialized output. */
  writeIntentInferenceToRawYml: boolean;
  /** Override file name (default: "raw.yml"). */
  fileName?: string;
}

export interface RawYmlWriterResult {
  /** Absolute path to the written file. */
  path: string;
  /** Number of elements serialized. */
  elementCount: number;
  /** Whether intent_inference blocks were included (mirrors input flag). */
  intentInferenceIncluded: boolean;
}

/**
 * Write `raw.yml` atomically. Returns the resolved path + serialization
 * stats. Throws on filesystem failure (caller wraps in cycle-level error
 * handling).
 */
export function writeRawYml(input: RawYmlWriterInput): RawYmlWriterResult {
  const fileName = input.fileName ?? "raw.yml";
  const finalPath = join(input.sessionRoot, fileName);
  const tmpPath = finalPath + ".tmp";

  // Build the document object first — separates serialization concerns from
  // the omit gate. The omit happens in `serializeElement` per-element.
  const doc: Record<string, unknown> = {
    meta: input.meta,
    elements: input.elements.map((el) =>
      serializeElement(el, input.writeIntentInferenceToRawYml),
    ),
  };

  const yamlText = yaml.stringify(doc, {
    // canonical-style serialization for deterministic byte output (govern
    // reader friendliness — same input → same bytes → same hash).
    sortMapEntries: false,
    lineWidth: 0, // disable line-wrap so long fields stay readable
  });

  writeFileSync(tmpPath, yamlText, "utf-8");
  renameSync(tmpPath, finalPath);

  return {
    path: finalPath,
    elementCount: input.elements.length,
    intentInferenceIncluded: input.writeIntentInferenceToRawYml,
  };
}

/**
 * Serialize a single element with conditional intent_inference omission.
 * Returns a plain object suitable for `yaml.stringify`.
 *
 * Single omission gate: when `writeIntentInference === false`, the entire
 * `intent_inference` block is dropped — including its nested
 * `principal_provided_rationale` sub-field. There is no separate top-level
 * `principal_provided_rationale` to consider (canonical seat is nested per
 * PR #236; see RawYmlElement type doc).
 *
 * govern reader contract: meta.inference_mode is the single source for the
 * "v0 fallback" vs "v1 write-suppressed" distinction (configuration.md
 * §4.11 (b)). Element-shape alone is insufficient by design.
 */
function serializeElement(
  element: RawYmlElement,
  writeIntentInference: boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: element.id,
    type: element.type,
    name: element.name,
    definition: element.definition,
    certainty: element.certainty,
  };

  if (writeIntentInference && element.intent_inference !== undefined) {
    out.intent_inference = serializeIntentInference(element.intent_inference);
  }

  return out;
}

/**
 * Serialize IntentInference — currently a 1:1 passthrough since the type
 * is already YAML-friendly. Extracted as a helper so future shape evolution
 * (e.g. provenance projection, audit-only field stripping) lands here
 * without touching the omit gate.
 */
function serializeIntentInference(
  inference: IntentInference,
): Record<string, unknown> {
  // yaml.stringify handles undefined-pruning natively, but explicit object
  // construction makes the persisted shape obvious to reviewers.
  const out: Record<string, unknown> = {
    rationale_state: inference.rationale_state,
    provenance: inference.provenance,
  };
  if (inference.state_reason !== undefined) out.state_reason = inference.state_reason;
  if (inference.inferred_meaning !== undefined) out.inferred_meaning = inference.inferred_meaning;
  if (inference.justification !== undefined) out.justification = inference.justification;
  if (inference.domain_refs !== undefined) out.domain_refs = inference.domain_refs;
  if (inference.confidence !== undefined) out.confidence = inference.confidence;
  if (inference.principal_provided_rationale !== undefined) {
    out.principal_provided_rationale = inference.principal_provided_rationale;
  }
  return out;
}
