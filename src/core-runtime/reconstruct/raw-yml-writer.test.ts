// runtime-mirror-of: raw-yml-writer.ts CONTRACT
//
// raw.yml writer behavior (Step 4 §4.3 omit semantic):
//   - writeIntentInferenceToRawYml=true → element 의 intent_inference + ppr 포함
//   - writeIntentInferenceToRawYml=false → 두 field 모두 omit (meta.inference_mode 만이 distinction source)
//   - Atomic write (tmp + rename) — partial file 노출 없음

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import yaml from "yaml";
import { type RawYmlElement, writeRawYml } from "./raw-yml-writer.js";
import type { RawMetaExtensionsV1 } from "./raw-meta-extended-schema.js";
import type { IntentInference } from "./wip-element-types.js";

const FIXED_NOW = "2026-04-27T15:00:00Z";

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "raw-yml-writer-"));
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

function makeMeta(overrides: Partial<RawMetaExtensionsV1> = {}): RawMetaExtensionsV1 {
  return {
    inference_mode: "full",
    degraded_reason: null,
    fallback_reason: null,
    domain_quality_tier: "full",
    manifest_schema_version: "1.0",
    domain_manifest_version: "1.0.0",
    domain_manifest_hash: "deadbeef" + "0".repeat(56),
    manifest_recovery_from_malformed: false,
    rationale_review_degraded: false,
    rationale_reviewer_failures_streak: 0,
    rationale_reviewer_contract_version: "1.0",
    rationale_proposer_contract_version: "1.0",
    pack_missing_areas: [],
    step2c_review_state: "completed",
    step2c_review_retry_count: 0,
    ...overrides,
  };
}

function makeIntentInference(): IntentInference {
  return {
    rationale_state: "principal_accepted",
    inferred_meaning: "Order represents a domain concept.",
    justification: "Linked to canonical domain heading.",
    domain_refs: [
      { manifest_ref: "concepts.md", heading: "## Core Entities", excerpt: "Order excerpt" },
    ],
    confidence: "medium",
    provenance: {
      proposed_at: FIXED_NOW,
      proposed_by: "rationale-proposer",
      proposer_contract_version: "1.0",
      manifest_schema_version: "1.0",
      domain_manifest_version: "1.0.0",
      domain_manifest_hash: "deadbeef" + "0".repeat(56),
      domain_quality_tier: "full",
      session_id: "test-session",
      runtime_version: "v1.0.0-test",
      input_chunks: 1,
      truncated_fields: [],
      effective_injected_files: ["concepts.md"],
      gate_count: 2,
    },
  };
}

function makeElement(withIntent: boolean): RawYmlElement {
  return {
    id: "E1",
    type: "entity",
    name: "Order",
    definition: "An order placed by a customer",
    certainty: "observed",
    ...(withIntent ? { intent_inference: makeIntentInference() } : {}),
  };
}

describe("writeRawYml — happy path (writeIntentInferenceToRawYml=true)", () => {
  it("writes raw.yml with intent_inference included", () => {
    const result = writeRawYml({
      sessionRoot: tmpRoot,
      meta: makeMeta(),
      elements: [makeElement(true)],
      writeIntentInferenceToRawYml: true,
    });

    expect(result.path).toBe(join(tmpRoot, "raw.yml"));
    expect(result.elementCount).toBe(1);
    expect(result.intentInferenceIncluded).toBe(true);

    const text = readFileSync(result.path, "utf-8");
    const parsed = yaml.parse(text);
    expect(parsed.meta.inference_mode).toBe("full");
    expect(parsed.elements).toHaveLength(1);
    expect(parsed.elements[0].id).toBe("E1");
    expect(parsed.elements[0].intent_inference).toBeDefined();
    expect(parsed.elements[0].intent_inference.rationale_state).toBe("principal_accepted");
    expect(parsed.elements[0].intent_inference.inferred_meaning).toBe(
      "Order represents a domain concept.",
    );
  });

  it("includes principal_provided_rationale field when set on element", () => {
    const el = makeElement(true);
    el.principal_provided_rationale = {
      inferred_meaning: "Principal-supplied meaning",
      justification: "Principal-supplied justification",
    };
    const result = writeRawYml({
      sessionRoot: tmpRoot,
      meta: makeMeta(),
      elements: [el],
      writeIntentInferenceToRawYml: true,
    });
    const parsed = yaml.parse(readFileSync(result.path, "utf-8"));
    expect(parsed.elements[0].principal_provided_rationale).toEqual({
      inferred_meaning: "Principal-supplied meaning",
      justification: "Principal-supplied justification",
    });
  });
});

describe("writeRawYml — omit semantic (writeIntentInferenceToRawYml=false)", () => {
  it("omits intent_inference from each element", () => {
    const result = writeRawYml({
      sessionRoot: tmpRoot,
      meta: makeMeta({ inference_mode: "full" }), // v1 mode 의 write 억제 case
      elements: [makeElement(true)],
      writeIntentInferenceToRawYml: false,
    });
    expect(result.intentInferenceIncluded).toBe(false);
    const parsed = yaml.parse(readFileSync(result.path, "utf-8"));
    expect(parsed.elements[0].intent_inference).toBeUndefined();
    // meta still carries inference_mode — single source of v0/v1 distinction
    expect(parsed.meta.inference_mode).toBe("full");
  });

  it("omits principal_provided_rationale field", () => {
    const el = makeElement(true);
    el.principal_provided_rationale = {
      inferred_meaning: "Should be omitted",
      justification: "Should be omitted",
    };
    const result = writeRawYml({
      sessionRoot: tmpRoot,
      meta: makeMeta(),
      elements: [el],
      writeIntentInferenceToRawYml: false,
    });
    const parsed = yaml.parse(readFileSync(result.path, "utf-8"));
    expect(parsed.elements[0].principal_provided_rationale).toBeUndefined();
  });

  it("v0 fallback (inference_mode=none) + omit → distinguishable via meta", () => {
    const result = writeRawYml({
      sessionRoot: tmpRoot,
      meta: makeMeta({
        inference_mode: "none",
        fallback_reason: "user_flag",
        domain_quality_tier: null,
        rationale_reviewer_contract_version: null,
        rationale_proposer_contract_version: null,
        step2c_review_state: null,
        step2c_review_retry_count: null,
      }),
      elements: [makeElement(false)],
      writeIntentInferenceToRawYml: false,
    });
    const parsed = yaml.parse(readFileSync(result.path, "utf-8"));
    expect(parsed.meta.inference_mode).toBe("none");
    expect(parsed.elements[0].intent_inference).toBeUndefined();
  });
});

describe("writeRawYml — atomic write", () => {
  it("renames .tmp to final path (no .tmp leftover on success)", () => {
    writeRawYml({
      sessionRoot: tmpRoot,
      meta: makeMeta(),
      elements: [makeElement(true)],
      writeIntentInferenceToRawYml: true,
    });
    // .tmp must not exist post-rename
    const finalPath = join(tmpRoot, "raw.yml");
    const tmpPath = finalPath + ".tmp";
    expect(() => readFileSync(tmpPath, "utf-8")).toThrow();
  });
});

describe("writeRawYml — empty + multi-element", () => {
  it("handles empty element list", () => {
    const result = writeRawYml({
      sessionRoot: tmpRoot,
      meta: makeMeta(),
      elements: [],
      writeIntentInferenceToRawYml: true,
    });
    expect(result.elementCount).toBe(0);
    const parsed = yaml.parse(readFileSync(result.path, "utf-8"));
    expect(parsed.elements).toEqual([]);
  });

  it("handles multiple elements + custom file name", () => {
    const elements: RawYmlElement[] = [
      makeElement(true),
      { ...makeElement(true), id: "E2", name: "LineItem" },
      { ...makeElement(true), id: "E3", name: "Customer" },
    ];
    const result = writeRawYml({
      sessionRoot: tmpRoot,
      meta: makeMeta(),
      elements,
      writeIntentInferenceToRawYml: true,
      fileName: "raw-custom.yml",
    });
    expect(result.path).toBe(join(tmpRoot, "raw-custom.yml"));
    expect(result.elementCount).toBe(3);
    const parsed = yaml.parse(readFileSync(result.path, "utf-8"));
    expect(parsed.elements).toHaveLength(3);
    expect(parsed.elements.map((e: { id: string }) => e.id)).toEqual(["E1", "E2", "E3"]);
  });
});
