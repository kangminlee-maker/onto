// runtime-mirror-of: reconstruct.md §1.1

import { describe, expect, it } from "vitest";
import {
  makeFailingMockExplorer,
  makeMockExplorer,
} from "./spawn-explorer.js";
import type { Stage1ExplorerDirective } from "./stage1-directive-types.js";
import {
  runStage1RoundZero,
  Stage1ScannerError,
  type Stage1RoundZeroInput,
} from "./stage1-scanner.js";

function baseInput(
  overrides: Partial<Stage1RoundZeroInput> = {},
): Stage1RoundZeroInput {
  return {
    profile: "codebase",
    source: "src/auth",
    intent: "model auth flow",
    sessionId: "S1",
    runtimeVersion: "v1.0.0",
    ...overrides,
  };
}

function baseDirective(
  overrides: Partial<Stage1ExplorerDirective> = {},
): Stage1ExplorerDirective {
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
      {
        id: "E2",
        type: "entity",
        name: "Session",
        definition: "auth session",
        certainty: "inferred",
        source: { locations: ["src/auth/session.ts"] },
        relations_summary: [{ related_id: "E1", relation_type: "owned_by" }],
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
    ...overrides,
  };
}

describe("runStage1RoundZero", () => {
  it("returns wire-compat HookAlphaEntityInput[] with module_id stripped", async () => {
    const directive = baseDirective();
    const result = await runStage1RoundZero(baseInput(), {
      spawnExplorer: makeMockExplorer(directive),
    });
    expect(result.entities).toHaveLength(2);
    // module_id stripped (directive-only field)
    expect((result.entities[0] as { module_id?: string }).module_id).toBeUndefined();
    // wire-compat fields preserved
    expect(result.entities[0]).toMatchObject({
      id: "E1",
      type: "entity",
      name: "User",
      definition: "principal",
      certainty: "observed",
      source: { locations: ["src/auth/user.ts"] },
      relations_summary: [],
    });
  });

  it("preserves the full directive (with module_id + module_inventory) on result", async () => {
    const directive = baseDirective();
    const result = await runStage1RoundZero(baseInput(), {
      spawnExplorer: makeMockExplorer(directive),
    });
    expect(result.directive.entities[0]?.module_id).toBe("M1");
    expect(result.directive.module_inventory).toHaveLength(1);
    expect(result.directive.provenance.explored_by).toBe("stage1-explorer");
  });

  it("rejects non-codebase profile at the runtime gate", async () => {
    const directive = baseDirective();
    await expect(
      runStage1RoundZero(
        {
          ...baseInput(),
          profile: "spreadsheet" as unknown as Stage1RoundZeroInput["profile"],
        },
        { spawnExplorer: makeMockExplorer(directive) },
      ),
    ).rejects.toMatchObject({
      name: "Stage1ScannerError",
      stage: "validation",
      code: "invalid_profile",
    });
  });

  it("wraps spawn failures as stage='spawn'", async () => {
    try {
      await runStage1RoundZero(baseInput(), {
        spawnExplorer: makeFailingMockExplorer("transport down"),
      });
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(Stage1ScannerError);
      expect((e as Stage1ScannerError).stage).toBe("spawn");
      expect((e as Stage1ScannerError).message).toContain("transport down");
    }
  });

  it("wraps validation failures as stage='validation' with reject code", async () => {
    const badDirective = baseDirective({ entities: [] });
    try {
      await runStage1RoundZero(baseInput(), {
        spawnExplorer: makeMockExplorer(badDirective),
      });
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(Stage1ScannerError);
      expect((e as Stage1ScannerError).stage).toBe("validation");
      expect((e as Stage1ScannerError).code).toBe("empty_entities");
    }
  });

  it("propagates session_id mismatch as provenance_mismatch", async () => {
    const directive = baseDirective();
    directive.provenance.session_id = "S-OTHER";
    try {
      await runStage1RoundZero(baseInput(), {
        spawnExplorer: makeMockExplorer(directive),
      });
      throw new Error("expected throw");
    } catch (e) {
      expect((e as Stage1ScannerError).code).toBe("provenance_mismatch");
    }
  });

  it("defaults explorerContractVersion to '1.0' when omitted", async () => {
    let receivedVersion: string | undefined;
    const directive = baseDirective();
    await runStage1RoundZero(baseInput(), {
      spawnExplorer: async (pkg) => {
        receivedVersion = pkg.explorerContractVersion;
        return directive;
      },
    });
    expect(receivedVersion).toBe("1.0");
  });

  it("forwards an explicit explorerContractVersion when provided", async () => {
    let receivedVersion: string | undefined;
    const directive = baseDirective();
    await runStage1RoundZero(
      { ...baseInput(), explorerContractVersion: "1.0" },
      {
        spawnExplorer: async (pkg) => {
          receivedVersion = pkg.explorerContractVersion;
          return directive;
        },
      },
    );
    expect(receivedVersion).toBe("1.0");
  });
});
