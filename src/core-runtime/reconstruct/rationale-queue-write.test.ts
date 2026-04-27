// runtime-mirror-of: step-4-integration §2.7

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as yamlParse } from "yaml";

import {
  buildRationaleQueueDocument,
  emitRationaleQueue,
  RATIONALE_QUEUE_FILENAME,
  RATIONALE_QUEUE_SCHEMA_VERSION,
  writeRationaleQueueAtomic,
} from "./rationale-queue-write.js";
import type { HookDeltaResult } from "./hook-delta.js";
import type { IntentInference } from "./wip-element-types.js";

function provenance(gateCount = 1): IntentInference["provenance"] {
  return {
    proposed_at: "2026-04-27T12:00:00.000Z",
    proposed_by: "rationale-proposer",
    proposer_contract_version: "1.0",
    manifest_schema_version: "1.0",
    domain_manifest_version: "0.1.0",
    domain_manifest_hash: "h",
    domain_quality_tier: "full",
    session_id: "S",
    runtime_version: "v",
    input_chunks: 1,
    truncated_fields: [],
    effective_injected_files: [],
    gate_count: gateCount,
  };
}

function buildHookDeltaResult(): HookDeltaResult {
  return {
    entries: [
      {
        element_id: "E1",
        render_bucket: "individual",
        priority_score: 11000,
        rationale_state: "empty",
        confidence: null,
        gate_count: 1,
        grouping_kind: "rationale_state",
      },
      {
        element_id: "E2",
        render_bucket: "group_sample",
        priority_score: 10010,
        rationale_state: "domain_pack_incomplete",
        confidence: null,
        gate_count: 1,
        grouping_kind: "pack_missing_area",
      },
    ],
    rendered_count: 2,
    throttled_out_count: 0,
    total_pending_count: 2,
    gate_count_histogram: { "1": 2 },
    rationale_review_degraded: false,
  };
}

describe("buildRationaleQueueDocument (W-A-91)", () => {
  it("produces version 1.1 schema with rendered counts + entries", () => {
    const inferences = new Map<string, IntentInference>();
    inferences.set("E1", {
      rationale_state: "empty",
      provenance: provenance(),
    });
    inferences.set("E2", {
      rationale_state: "domain_pack_incomplete",
      state_reason: "missing concept",
      domain_refs: [
        { manifest_ref: "concepts.md", heading: "## A", excerpt: "x" },
      ],
      provenance: provenance(),
    });

    const doc = buildRationaleQueueDocument({
      session_id: "S",
      written_at: "2026-04-27T12:30:00.000Z",
      hookDeltaResult: buildHookDeltaResult(),
      intentInferences: inferences,
    });

    expect(doc.version).toBe(RATIONALE_QUEUE_SCHEMA_VERSION);
    expect(doc.session_id).toBe("S");
    expect(doc.rendered_count).toBe(2);
    expect(doc.throttled_out_count).toBe(0);
    expect(doc.gate_count_histogram).toEqual({ "1": 2 });
    expect(doc.entries).toHaveLength(2);
    expect(doc.entries[0]!.element_id).toBe("E1");
    expect(doc.entries[1]!.intent_inference_snapshot.state_reason).toBe(
      "missing concept",
    );
  });

  it("snapshots inferred_meaning + justification + domain_refs (or null fallback)", () => {
    const inferences = new Map<string, IntentInference>();
    inferences.set("E1", {
      rationale_state: "proposed",
      inferred_meaning: "m",
      justification: "j",
      domain_refs: [
        { manifest_ref: "concepts.md", heading: "## A", excerpt: "x" },
      ],
      confidence: "high",
      provenance: provenance(),
    });
    const result: HookDeltaResult = {
      entries: [
        {
          element_id: "E1",
          render_bucket: "individual",
          priority_score: 9000,
          rationale_state: "proposed",
          confidence: "high",
          gate_count: 1,
          grouping_kind: null,
        },
      ],
      rendered_count: 1,
      throttled_out_count: 0,
      total_pending_count: 1,
      gate_count_histogram: { "1": 1 },
      rationale_review_degraded: false,
    };
    const doc = buildRationaleQueueDocument({
      session_id: "S",
      written_at: "t",
      hookDeltaResult: result,
      intentInferences: inferences,
    });
    const snap = doc.entries[0]!.intent_inference_snapshot;
    expect(snap.inferred_meaning).toBe("m");
    expect(snap.justification).toBe("j");
    expect(snap.domain_refs).toHaveLength(1);
    expect(snap.state_reason).toBeNull();
  });

  it("falls back to null snapshot when inference missing for element", () => {
    const inferences = new Map<string, IntentInference>();
    const result: HookDeltaResult = {
      entries: [
        {
          element_id: "E_missing",
          render_bucket: "individual",
          priority_score: 0,
          rationale_state: "empty",
          confidence: null,
          gate_count: 1,
          grouping_kind: null,
        },
      ],
      rendered_count: 1,
      throttled_out_count: 0,
      total_pending_count: 1,
      gate_count_histogram: { "1": 1 },
      rationale_review_degraded: false,
    };
    const doc = buildRationaleQueueDocument({
      session_id: "S",
      written_at: "t",
      hookDeltaResult: result,
      intentInferences: inferences,
    });
    expect(doc.entries[0]!.intent_inference_snapshot).toEqual({
      present: false, // review UF-PRAGMATICS-01: distinguish missing from blank
      inferred_meaning: null,
      justification: null,
      domain_refs: [],
      state_reason: null,
    });
  });

  it("present=true for blank inference (rationale_state=empty), distinguishing from missing (review UF-PRAGMATICS-01)", () => {
    const inferences = new Map<string, IntentInference>();
    inferences.set("E1", {
      rationale_state: "empty", // present, but content fields all null
      provenance: provenance(),
    });
    const result: HookDeltaResult = {
      entries: [
        {
          element_id: "E1",
          render_bucket: "individual",
          priority_score: 11000,
          rationale_state: "empty",
          confidence: null,
          gate_count: 1,
          grouping_kind: "rationale_state",
        },
      ],
      rendered_count: 1,
      throttled_out_count: 0,
      total_pending_count: 1,
      gate_count_histogram: { "1": 1 },
      rationale_review_degraded: false,
    };
    const doc = buildRationaleQueueDocument({
      session_id: "S",
      written_at: "t",
      hookDeltaResult: result,
      intentInferences: inferences,
    });
    const snap = doc.entries[0]!.intent_inference_snapshot;
    expect(snap.present).toBe(true); // distinguishes from missing
    expect(snap.inferred_meaning).toBeNull();
  });
});

describe("writeRationaleQueueAtomic / emitRationaleQueue", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "onto-rqueue-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates session_root directory if absent + writes file at canonical path", () => {
    const sessionRoot = path.join(tmpDir, "newsession");
    const inferences = new Map<string, IntentInference>();
    inferences.set("E1", { rationale_state: "empty", provenance: provenance() });
    inferences.set("E2", {
      rationale_state: "domain_pack_incomplete",
      provenance: provenance(),
    });
    const r = emitRationaleQueue(sessionRoot, {
      session_id: "S",
      written_at: "2026-04-27T12:30:00.000Z",
      hookDeltaResult: buildHookDeltaResult(),
      intentInferences: inferences,
    });
    expect(r.path).toBe(path.join(sessionRoot, RATIONALE_QUEUE_FILENAME));
    expect(fs.existsSync(r.path)).toBe(true);
    const parsed = yamlParse(fs.readFileSync(r.path, "utf8"));
    expect(parsed.version).toBe("1.1");
    expect(parsed.entries).toHaveLength(2);
  });

  it("atomic write: no .tmp file remains after success", () => {
    const sessionRoot = path.join(tmpDir, "atomic");
    const inferences = new Map<string, IntentInference>();
    const result: HookDeltaResult = {
      entries: [],
      rendered_count: 0,
      throttled_out_count: 0,
      total_pending_count: 0,
      gate_count_histogram: {},
      rationale_review_degraded: false,
    };
    writeRationaleQueueAtomic(sessionRoot, {
      version: "1.1",
      session_id: "S",
      written_at: "t",
      rendered_count: 0,
      throttled_out_count: 0,
      rationale_review_degraded: false,
      gate_count_histogram: {},
      entries: [],
    });
    void result;
    const files = fs.readdirSync(sessionRoot);
    expect(files).toContain(RATIONALE_QUEUE_FILENAME);
    expect(files.filter((f) => f.includes(".tmp-"))).toEqual([]);
  });
});
