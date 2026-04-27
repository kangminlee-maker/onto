// runtime-mirror-of: step-4-integration §3.5.1 rule 3

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as yamlParse } from "yaml";

import {
  buildPhase3SnapshotDocument,
  detectStaleElements,
  emitPhase3Snapshot,
  PHASE3_SNAPSHOT_FILENAME,
} from "./phase3-snapshot-write.js";
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

describe("buildPhase3SnapshotDocument (W-A-92)", () => {
  it("captures rationale_state + gate_count + confidence per element", () => {
    const inferences = new Map<string, IntentInference | undefined>();
    inferences.set("E1", {
      rationale_state: "proposed",
      confidence: "high",
      provenance: provenance(1),
    });
    inferences.set("E2", {
      rationale_state: "reviewed",
      confidence: "medium",
      provenance: provenance(2),
    });
    const doc = buildPhase3SnapshotDocument({
      session_id: "S",
      written_at: "2026-04-27T12:30:00.000Z",
      intentInferences: inferences,
    });
    expect(doc.session_id).toBe("S");
    expect(doc.elements).toHaveLength(2);
    expect(doc.elements.map((e) => e.element_id).sort()).toEqual(["E1", "E2"]);
    const e1 = doc.elements.find((e) => e.element_id === "E1")!;
    expect(e1.rationale_state).toBe("proposed");
    expect(e1.gate_count).toBe(1);
    expect(e1.confidence).toBe("high");
  });

  it("orders elements by id lexicographically (deterministic)", () => {
    const inferences = new Map<string, IntentInference | undefined>();
    inferences.set("Z", { rationale_state: "gap", provenance: provenance() });
    inferences.set("A", { rationale_state: "gap", provenance: provenance() });
    inferences.set("M", { rationale_state: "gap", provenance: provenance() });
    const doc = buildPhase3SnapshotDocument({
      session_id: "S",
      written_at: "t",
      intentInferences: inferences,
    });
    expect(doc.elements.map((e) => e.element_id)).toEqual(["A", "M", "Z"]);
  });

  it("falls back to empty/1/null for undefined inference (Stage 2 not-yet-populated)", () => {
    const inferences = new Map<string, IntentInference | undefined>();
    inferences.set("E1", undefined);
    const doc = buildPhase3SnapshotDocument({
      session_id: "S",
      written_at: "t",
      intentInferences: inferences,
    });
    expect(doc.elements[0]).toEqual({
      element_id: "E1",
      rationale_state: "empty",
      gate_count: 1,
      confidence: null,
    });
  });
});

describe("emitPhase3Snapshot — atomic write", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "onto-snap-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates session_root + writes file at canonical path", () => {
    const sessionRoot = path.join(tmpDir, "newsession");
    const inferences = new Map<string, IntentInference | undefined>();
    inferences.set("E1", { rationale_state: "gap", provenance: provenance() });
    const r = emitPhase3Snapshot(sessionRoot, {
      session_id: "S",
      written_at: "t",
      intentInferences: inferences,
    });
    expect(r.path).toBe(path.join(sessionRoot, PHASE3_SNAPSHOT_FILENAME));
    expect(fs.existsSync(r.path)).toBe(true);
    const parsed = yamlParse(fs.readFileSync(r.path, "utf8"));
    expect(parsed.session_id).toBe("S");
    expect(parsed.elements).toHaveLength(1);
  });

  it("no .tmp- residue after atomic write", () => {
    const sessionRoot = path.join(tmpDir, "atomic");
    emitPhase3Snapshot(sessionRoot, {
      session_id: "S",
      written_at: "t",
      intentInferences: new Map(),
    });
    const files = fs.readdirSync(sessionRoot);
    expect(files).toContain(PHASE3_SNAPSHOT_FILENAME);
    expect(files.filter((f) => f.includes(".tmp-"))).toEqual([]);
  });
});

describe("detectStaleElements (W-A-93 helper)", () => {
  it("returns [] when no element drifted", () => {
    const inferences = new Map<string, IntentInference | undefined>();
    inferences.set("E1", { rationale_state: "gap", provenance: provenance() });
    const doc = buildPhase3SnapshotDocument({
      session_id: "S",
      written_at: "t",
      intentInferences: inferences,
    });
    expect(detectStaleElements(doc, inferences)).toEqual([]);
  });

  it("detects rationale_state drift", () => {
    const at_render = new Map<string, IntentInference | undefined>();
    at_render.set("E1", { rationale_state: "gap", provenance: provenance() });
    const doc = buildPhase3SnapshotDocument({
      session_id: "S",
      written_at: "t",
      intentInferences: at_render,
    });

    const at_reply = new Map<string, IntentInference | undefined>();
    at_reply.set("E1", {
      rationale_state: "principal_modified", // drifted
      provenance: provenance(),
    });
    expect(detectStaleElements(doc, at_reply)).toEqual(["E1"]);
  });

  it("detects gate_count drift", () => {
    const at_render = new Map<string, IntentInference | undefined>();
    at_render.set("E1", { rationale_state: "proposed", provenance: provenance(1) });
    const doc = buildPhase3SnapshotDocument({
      session_id: "S",
      written_at: "t",
      intentInferences: at_render,
    });

    const at_reply = new Map<string, IntentInference | undefined>();
    at_reply.set("E1", { rationale_state: "proposed", provenance: provenance(2) });
    expect(detectStaleElements(doc, at_reply)).toEqual(["E1"]);
  });

  it("detects confidence drift", () => {
    const at_render = new Map<string, IntentInference | undefined>();
    at_render.set("E1", {
      rationale_state: "proposed",
      confidence: "high",
      provenance: provenance(),
    });
    const doc = buildPhase3SnapshotDocument({
      session_id: "S",
      written_at: "t",
      intentInferences: at_render,
    });

    const at_reply = new Map<string, IntentInference | undefined>();
    at_reply.set("E1", {
      rationale_state: "proposed",
      confidence: "medium",
      provenance: provenance(),
    });
    expect(detectStaleElements(doc, at_reply)).toEqual(["E1"]);
  });
});
