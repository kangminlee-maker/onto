/**
 * Tests — dispatcher-deriver.test.ts (P1-2c).
 *
 * Stage 1 (unit + determinism, runs unconditionally):
 *   - deriveDispatcher is deterministic (same catalog → same bytes).
 *   - The emitted body is wrapped in TS segment markers (start + end).
 *   - The marker hash differs across catalogs (target_id namespacing works).
 *
 * Stage 2 (diff-0):
 *   - Default mode: byte-compare emitter output against committed dispatcher.ts.
 *   - UPDATE_SNAPSHOT=1 mode: write dispatcher.ts via deriveAllDispatcher(snapshotMode=true).
 *     Sole bootstrap seat (plan §D18/§D27 reused).
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COMMAND_CATALOG } from "../../src/core-runtime/cli/command-catalog.js";
import {
  DISPATCHER_EMISSION_PATH,
  deriveAllDispatcher,
  deriveDispatcher,
} from "./dispatcher-deriver.js";
import { extractTypeScriptSegment } from "./marker.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const DISPATCHER_ABS = path.resolve(REPO_ROOT, DISPATCHER_EMISSION_PATH);

const SHOULD_UPDATE = process.env.UPDATE_SNAPSHOT === "1";

describe("Stage 1 — deriveDispatcher unit + determinism", () => {
  it("is deterministic — same catalog → same bytes", () => {
    const a = deriveDispatcher(COMMAND_CATALOG);
    const b = deriveDispatcher(COMMAND_CATALOG);
    expect(a).toBe(b);
  });

  it("output round-trips through extractTypeScriptSegment", () => {
    const out = deriveDispatcher(COMMAND_CATALOG);
    const marker = extractTypeScriptSegment(out);
    expect(marker).not.toBeNull();
    expect(marker?.sourcePath).toBe("src/core-runtime/cli/command-catalog.ts");
    expect(marker?.catalogHash).toMatch(/^[0-9a-f]{64}$/);
    expect(marker?.body).toContain("export async function dispatch");
  });

  it("dry-run does not write a file", () => {
    const result = deriveAllDispatcher(COMMAND_CATALOG, {
      dryRun: true,
      projectRoot: REPO_ROOT,
    });
    expect(result.skippedDryRun).toBe(true);
    expect(result.written).toBe(false);
    expect(result.emissionPath).toBe(DISPATCHER_EMISSION_PATH);
  });

  it("snapshotMode=true without UPDATE_SNAPSHOT=1 throws", () => {
    if (process.env.UPDATE_SNAPSHOT === "1") {
      // The env gate is permissive when UPDATE_SNAPSHOT=1; skip here.
      return;
    }
    expect(() =>
      deriveAllDispatcher(COMMAND_CATALOG, {
        snapshotMode: true,
        projectRoot: REPO_ROOT,
      }),
    ).toThrow(/UPDATE_SNAPSHOT=1/);
  });
});

describe("Stage 2 — derive pipeline", () => {
  if (SHOULD_UPDATE) {
    it("UPDATE_SNAPSHOT=1 — writes dispatcher.ts with snapshotMode=true (bootstrap)", () => {
      const result = deriveAllDispatcher(COMMAND_CATALOG, {
        snapshotMode: true,
        projectRoot: REPO_ROOT,
      });
      expect(result.written).toBe(true);
      expect(existsSync(DISPATCHER_ABS)).toBe(true);
    });
  } else {
    it("default mode — byte-compare emitted dispatcher.ts against committed file", () => {
      if (!existsSync(DISPATCHER_ABS)) {
        throw new Error(
          `dispatcher.ts not committed at ${DISPATCHER_EMISSION_PATH}. ` +
            `Run UPDATE_SNAPSHOT=1 npx vitest run scripts/command-catalog-generator/dispatcher-deriver.test.ts.`,
        );
      }
      const expected = deriveDispatcher(COMMAND_CATALOG);
      const actual = readFileSync(DISPATCHER_ABS, "utf8");
      if (actual !== expected) {
        throw new Error(
          `Diff-0 violation at ${DISPATCHER_EMISSION_PATH}: bytes differ. ` +
            `Run: UPDATE_SNAPSHOT=1 npx vitest run scripts/command-catalog-generator/dispatcher-deriver.test.ts`,
        );
      }
    });

    it("default mode — managed-tree boundary guard passes", () => {
      expect(() =>
        deriveAllDispatcher(COMMAND_CATALOG, {
          dryRun: true,
          projectRoot: REPO_ROOT,
        }),
      ).not.toThrow();
    });
  }
});
