/**
 * Tests — preboot-dispatch-deriver.test.ts (P1-3).
 *
 * Stage 1 (unit + determinism):
 *   - derivePrebootDispatch is deterministic.
 *   - Output round-trips through TS segment marker extraction.
 *   - Body lists the catalog's preboot CliRealization invocations.
 *   - snapshotMode env gate enforced.
 *
 * Stage 2 (diff-0):
 *   - Default mode: byte-compare emitted preboot-dispatch.ts against committed.
 *   - UPDATE_SNAPSHOT=1: bootstrap (idempotent — `written` may be false on
 *     reruns when bytes already align).
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COMMAND_CATALOG } from "../../src/core-runtime/cli/command-catalog.js";
import {
  PREBOOT_DISPATCH_EMISSION_PATH,
  collectPrebootCliInvocations,
  deriveAllPrebootDispatch,
  derivePrebootDispatch,
  renderPrebootDispatchBody,
} from "./preboot-dispatch-deriver.js";
import { extractTypeScriptSegment } from "./marker.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const PREBOOT_DISPATCH_ABS = path.resolve(REPO_ROOT, PREBOOT_DISPATCH_EMISSION_PATH);

const SHOULD_UPDATE = process.env.UPDATE_SNAPSHOT === "1";

describe("Stage 1 — preboot-dispatch-deriver unit + determinism", () => {
  it("collectPrebootCliInvocations returns sorted unique cli-backed preboot invocations", () => {
    const list = collectPrebootCliInvocations(COMMAND_CATALOG);
    // Catalog has info/config/install as cli-backed preboot entries.
    expect(list).toContain("info");
    expect(list).toContain("config");
    expect(list).toContain("install");
    // Sorted ascending.
    const sorted = [...list].sort();
    expect(list).toEqual(sorted);
    // No duplicates.
    expect(new Set(list).size).toBe(list.length);
  });

  it("derivePrebootDispatch is deterministic", () => {
    const a = derivePrebootDispatch(COMMAND_CATALOG);
    const b = derivePrebootDispatch(COMMAND_CATALOG);
    expect(a).toBe(b);
  });

  it("emitted body declares dispatchPreboot + dynamic-imports ONTO_HELP_TEXT (no static cli.ts dep)", () => {
    const body = renderPrebootDispatchBody(COMMAND_CATALOG, "deadbeef".repeat(8));
    expect(body).toContain("export async function dispatchPreboot");
    // Dynamic import — preboot must not pull cli.ts into the static module
    // graph (P1-3 review UF-DEPENDENCY-PREBOOT-REVERSE-IMPORT).
    expect(body).toContain('await import("../../cli.js")');
    // No top-level static import of ONTO_HELP_TEXT.
    expect(body).not.toMatch(/^import\s+\{\s*ONTO_HELP_TEXT\s*\}/m);
    expect(body).toContain("readOntoVersion");
  });

  it("emitted body wires assertPrebootDispatchDeriveHash entry guard", () => {
    const body = renderPrebootDispatchBody(COMMAND_CATALOG, "feedface".repeat(8));
    expect(body).toContain("function assertPrebootDispatchDeriveHash");
    expect(body).toContain("checkDeriveHash");
    expect(body).toContain("ONTO_ALLOW_STALE_DISPATCHER");
    // The hash placeholder must be substituted into the body (string equality
    // here would be brittle; just verify the const declaration site exists
    // and contains a hex-shaped string).
    expect(body).toMatch(/const EXPECTED_DERIVE_HASH = "[0-9a-f]{64}";/);
  });

  it("output round-trips through extractTypeScriptSegment", () => {
    const out = derivePrebootDispatch(COMMAND_CATALOG);
    const marker = extractTypeScriptSegment(out);
    expect(marker).not.toBeNull();
    expect(marker?.sourcePath).toBe("src/core-runtime/cli/command-catalog.ts");
    expect(marker?.catalogHash).toMatch(/^[0-9a-f]{64}$/);
    expect(marker?.body).toContain("dispatchPreboot");
  });

  it("dry-run does not write a file", () => {
    const result = deriveAllPrebootDispatch(COMMAND_CATALOG, {
      dryRun: true,
      projectRoot: REPO_ROOT,
    });
    expect(result.skippedDryRun).toBe(true);
    expect(result.written).toBe(false);
  });

  it("snapshotMode=true without UPDATE_SNAPSHOT=1 throws", () => {
    if (process.env.UPDATE_SNAPSHOT === "1") return;
    expect(() =>
      deriveAllPrebootDispatch(COMMAND_CATALOG, {
        snapshotMode: true,
        projectRoot: REPO_ROOT,
      }),
    ).toThrow(/UPDATE_SNAPSHOT=1/);
  });
});

describe("Stage 2 — derive pipeline", () => {
  if (SHOULD_UPDATE) {
    it("UPDATE_SNAPSHOT=1 — materializes preboot-dispatch.ts (bootstrap, idempotent)", () => {
      const result = deriveAllPrebootDispatch(COMMAND_CATALOG, {
        snapshotMode: true,
        projectRoot: REPO_ROOT,
      });
      expect(typeof result.written).toBe("boolean");
      expect(existsSync(PREBOOT_DISPATCH_ABS)).toBe(true);
    });
  } else {
    it("default mode — byte-compare emitted preboot-dispatch.ts against committed file", () => {
      if (!existsSync(PREBOOT_DISPATCH_ABS)) {
        throw new Error(
          `preboot-dispatch.ts not committed at ${PREBOOT_DISPATCH_EMISSION_PATH}. ` +
            `Run UPDATE_SNAPSHOT=1 npx vitest run scripts/command-catalog-generator/preboot-dispatch-deriver.test.ts.`,
        );
      }
      const expected = derivePrebootDispatch(COMMAND_CATALOG);
      const actual = readFileSync(PREBOOT_DISPATCH_ABS, "utf8");
      if (actual !== expected) {
        throw new Error(
          `Diff-0 violation at ${PREBOOT_DISPATCH_EMISSION_PATH}: bytes differ. ` +
            `Run: UPDATE_SNAPSHOT=1 npx vitest run scripts/command-catalog-generator/preboot-dispatch-deriver.test.ts`,
        );
      }
    });

    it("default mode — managed-tree boundary guard passes", () => {
      expect(() =>
        deriveAllPrebootDispatch(COMMAND_CATALOG, {
          dryRun: true,
          projectRoot: REPO_ROOT,
        }),
      ).not.toThrow();
    });
  }
});
