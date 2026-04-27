// runtime-mirror-of: step-4-integration §4 + §4.3 + configuration.md §4.11 (b)
//
// Raw ontology writer (post-Phase 3.5) — serializes the coordinator's
// completed cycle into `{session_root}/raw.yml` with atomic write semantics
// and conditional element-level intent_inference block omission.
//
// Behavior contract (Step 4 §4.3 omit semantic + §4.11 (b)):
//   - When `writeIntentInferenceToRawYml === true`, every element's
//     intent_inference block is serialized in full (matching wip schema).
//   - When `writeIntentInferenceToRawYml === false`, the intent_inference
//     field is *omitted* from each element. govern reader's distinction
//     between v0 fallback and v1 mode write-suppression is via
//     `meta.inference_mode` field (single source — see configuration.md
//     §4.11 (b) `omit_reason` rationale: distinct field is not added to
//     keep raw-meta minimal).
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

export interface RawYmlElement extends WipElementForHookAlpha {
  /** Optional element-level seat from Step 4 §3.6.1. The writer omits this
   *  field when `writeIntentInferenceToRawYml === false` (along with
   *  intent_inference). */
  principal_provided_rationale?: {
    inferred_meaning: string;
    justification: string;
  };
}

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

  if (writeIntentInference) {
    if (element.intent_inference !== undefined) {
      out.intent_inference = serializeIntentInference(element.intent_inference);
    }
    if (element.principal_provided_rationale !== undefined) {
      out.principal_provided_rationale = element.principal_provided_rationale;
    }
  }
  // When writeIntentInference === false, intent_inference + principal_provided_rationale
  // are omitted entirely. govern reader uses `meta.inference_mode` to
  // distinguish v0 fallback from v1 write-suppression (configuration.md
  // §4.11 (b)).

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
