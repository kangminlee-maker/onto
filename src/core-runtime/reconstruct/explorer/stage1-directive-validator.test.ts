// runtime-mirror-of: reconstruct.md §1.1 + §1.2 (entity / module_inventory rules)

import { describe, expect, it } from "vitest";
import type {
  Stage1ExplorerDirective,
} from "./stage1-directive-types.js";
import {
  type Stage1ValidatorInput,
  validateStage1Directive,
} from "./stage1-directive-validator.js";

function baseInput(
  overrides: Partial<Stage1ValidatorInput> = {},
): Stage1ValidatorInput {
  return {
    acceptedProfile: "codebase",
    expectedSessionId: "S1",
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
        definition: "system principal",
        certainty: "observed",
        source: { locations: ["src/auth/user.ts"] },
        relations_summary: [],
        module_id: "M1",
      },
    ],
    module_inventory: [
      { module_id: "M1", module_path: "src/auth", description: "auth module" },
    ],
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

describe("validateStage1Directive", () => {
  describe("happy path", () => {
    it("accepts a minimal well-formed directive", () => {
      const result = validateStage1Directive(baseDirective(), baseInput());
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.directive.entities).toHaveLength(1);
      }
    });

    it("accepts multiple entities sharing one module", () => {
      const result = validateStage1Directive(
        baseDirective({
          entities: [
            {
              id: "E1",
              type: "entity",
              name: "User",
              definition: "principal",
              certainty: "observed",
              source: { locations: ["src/a.ts"] },
              relations_summary: [],
              module_id: "M1",
            },
            {
              id: "E2",
              type: "entity",
              name: "Session",
              definition: "auth session",
              certainty: "inferred",
              source: { locations: ["src/b.ts"] },
              relations_summary: [
                { related_id: "E1", relation_type: "owned_by" },
              ],
              module_id: "M1",
            },
          ],
        }),
        baseInput(),
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("profile gate", () => {
    it("rejects non-codebase profile (currently a one-element union)", () => {
      // Cast through unknown — TS would reject the literal directly because
      // SourceProfileKind is a one-element union. Test exists to lock the
      // runtime check in place for when the union widens.
      const directive = baseDirective({
        profile: "spreadsheet" as unknown as Stage1ExplorerDirective["profile"],
      });
      const result = validateStage1Directive(directive, baseInput());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("invalid_profile");
    });
  });

  describe("entities", () => {
    it("rejects empty entities", () => {
      const result = validateStage1Directive(
        baseDirective({ entities: [] }),
        baseInput(),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("empty_entities");
    });

    it("rejects duplicate entity id", () => {
      const result = validateStage1Directive(
        baseDirective({
          entities: [
            {
              id: "E1",
              type: "entity",
              name: "A",
              definition: "x",
              certainty: "observed",
              source: { locations: ["a.ts"] },
              relations_summary: [],
              module_id: "M1",
            },
            {
              id: "E1",
              type: "entity",
              name: "B",
              definition: "y",
              certainty: "observed",
              source: { locations: ["b.ts"] },
              relations_summary: [],
              module_id: "M1",
            },
          ],
        }),
        baseInput(),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("duplicate_entity_id");
    });

    it("rejects invalid certainty", () => {
      const directive = baseDirective();
      directive.entities[0]!.certainty =
        "made-up" as unknown as Stage1ExplorerDirective["entities"][0]["certainty"];
      const result = validateStage1Directive(directive, baseInput());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("invalid_certainty");
    });

    it("rejects empty source.locations", () => {
      const directive = baseDirective();
      directive.entities[0]!.source = { locations: [] };
      const result = validateStage1Directive(directive, baseInput());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("empty_source_locations");
    });
  });

  describe("module_inventory", () => {
    it("rejects empty module_inventory", () => {
      const result = validateStage1Directive(
        baseDirective({ module_inventory: [] }),
        baseInput(),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("empty_module_inventory");
    });

    it("rejects duplicate module_id", () => {
      const result = validateStage1Directive(
        baseDirective({
          module_inventory: [
            { module_id: "M1", module_path: "a" },
            { module_id: "M1", module_path: "b" },
          ],
        }),
        baseInput(),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("duplicate_module_id");
    });

    it("rejects orphan module_id reference", () => {
      const directive = baseDirective();
      directive.entities[0]!.module_id = "M-NOT-IN-INVENTORY";
      const result = validateStage1Directive(directive, baseInput());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("orphan_module_ref");
    });
  });

  describe("provenance", () => {
    it("rejects unsupported explorer_contract_version", () => {
      const directive = baseDirective();
      directive.provenance.explorer_contract_version = "9.9";
      const result = validateStage1Directive(directive, baseInput());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("provenance_mismatch");
    });

    it("rejects session_id mismatch", () => {
      const result = validateStage1Directive(
        baseDirective(),
        baseInput({ expectedSessionId: "S-OTHER" }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("provenance_mismatch");
    });

    it("rejects wrong explored_by actor", () => {
      const directive = baseDirective();
      directive.provenance.explored_by =
        "rationale-proposer" as unknown as Stage1ExplorerDirective["provenance"]["explored_by"];
      const result = validateStage1Directive(directive, baseInput());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("provenance_mismatch");
    });
  });
});
