// runtime-mirror-of: reconstruct.md §1.1 + spawn-proposer.test.ts pattern

import { describe, expect, it } from "vitest";
import {
  buildExplorerPrompt,
  type ExplorerInputPackage,
  makeFailingMockExplorer,
  makeMockExplorer,
} from "./spawn-explorer.js";
import type { Stage1ExplorerDirective } from "./stage1-directive-types.js";

function baseInputPackage(
  overrides: Partial<ExplorerInputPackage> = {},
): ExplorerInputPackage {
  return {
    profile: "codebase",
    source: "src/auth",
    intent: "model auth flow",
    sessionId: "S1",
    runtimeVersion: "v1.0.0",
    explorerContractVersion: "1.0",
    ...overrides,
  };
}

function baseDirective(): Stage1ExplorerDirective {
  return {
    profile: "codebase",
    entities: [
      {
        id: "E1",
        type: "entity",
        name: "User",
        definition: "principal",
        certainty: "observed",
        source: { locations: ["src/auth/user.ts"] },
        relations_summary: [],
        module_id: "M1",
      },
    ],
    module_inventory: [{ module_id: "M1", module_path: "src/auth" }],
    provenance: {
      explored_at: "2026-04-28T12:00:00.000Z",
      explored_by: "stage1-explorer",
      explorer_contract_version: "1.0",
      session_id: "S1",
      runtime_version: "v1.0.0",
      input_chunks: 1,
      truncated_fields: [],
    },
  };
}

describe("makeMockExplorer", () => {
  it("returns the pre-canned directive verbatim", async () => {
    const directive = baseDirective();
    const spawn = makeMockExplorer(directive);
    const result = await spawn(baseInputPackage());
    expect(result).toBe(directive);
  });

  it("returns the same reference on repeat invocations (deterministic)", async () => {
    const directive = baseDirective();
    const spawn = makeMockExplorer(directive);
    const a = await spawn(baseInputPackage());
    const b = await spawn(baseInputPackage());
    expect(a).toBe(b);
  });
});

describe("makeFailingMockExplorer", () => {
  it("throws CodexSpawnError on invocation", async () => {
    const spawn = makeFailingMockExplorer("simulated spawn fail");
    await expect(spawn(baseInputPackage())).rejects.toThrow("simulated spawn fail");
  });

  it("uses default message when none provided", async () => {
    const spawn = makeFailingMockExplorer();
    await expect(spawn(baseInputPackage())).rejects.toThrow(
      "mock explorer spawn failure",
    );
  });
});

describe("buildExplorerPrompt", () => {
  it("embeds source / intent / profile literally", () => {
    const prompt = buildExplorerPrompt(
      baseInputPackage({
        source: "/abs/path/to/repo",
        intent: "extract domain entities for auth subsystem",
        profile: "codebase",
      }),
    );
    expect(prompt).toContain("Source profile: codebase");
    expect(prompt).toContain("Source path: /abs/path/to/repo");
    expect(prompt).toContain(
      "Intent: extract domain entities for auth subsystem",
    );
  });

  it("references the authoritative protocol contract by path", () => {
    const prompt = buildExplorerPrompt(baseInputPackage());
    expect(prompt).toContain(".onto/processes/reconstruct.md");
    expect(prompt).toContain("stage1-directive-types.ts");
  });

  it("declares Stage 1 fact_type scope (entity only)", () => {
    const prompt = buildExplorerPrompt(baseInputPackage());
    expect(prompt).toContain("Stage 1 Round 0");
    expect(prompt).toContain("entity facts only");
    expect(prompt).toContain("Stage 2");
  });

  it("interpolates session and contract version into provenance instructions", () => {
    const prompt = buildExplorerPrompt(
      baseInputPackage({
        sessionId: "SESSION-XYZ",
        runtimeVersion: "v9.9.9",
        explorerContractVersion: "1.0",
      }),
    );
    expect(prompt).toContain('session_id: "SESSION-XYZ"');
    expect(prompt).toContain('runtime_version: "v9.9.9"');
    expect(prompt).toContain('explorer_contract_version: "1.0"');
  });

  it("instructs the explorer to emit raw YAML without code fences", () => {
    const prompt = buildExplorerPrompt(baseInputPackage());
    expect(prompt).toContain("wrap in code fences");
    expect(prompt).toContain("Do not add commentary");
  });
});
