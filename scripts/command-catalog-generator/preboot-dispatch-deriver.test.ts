/**
 * Tests — preboot-dispatch-deriver.test.ts (P2-A — RFC-1 §4.1.2 thin shim).
 *
 * Stage 1 (unit + determinism):
 *   - derivePrebootDispatch is deterministic.
 *   - Output round-trips through TS segment marker extraction.
 *   - buildMetaDispatchTable + buildPublicDispatchTable produce sorted catalog-derived tables.
 *   - Emitted body is a thin shim — static imports `dispatchPrebootCore` +
 *     emits static dispatch table literals + forwards to core.
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
  buildMetaDispatchTable,
  buildPublicDispatchTable,
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
  it("buildMetaDispatchTable indexes MetaEntry cli_dispatch by name (sorted)", () => {
    const table = buildMetaDispatchTable(COMMAND_CATALOG);
    expect(Object.keys(table)).toContain("help");
    expect(Object.keys(table)).toContain("version");
    // Sorted ascending key order (used for deterministic emit).
    const keys = Object.keys(table);
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
    // P2-A — help/version 의 cli_dispatch 가 meta-handlers.ts 를 가리킴.
    expect(table["help"]).toEqual({
      handler_module: "src/core-runtime/cli/meta-handlers.ts",
      handler_export: "onHelp",
    });
    expect(table["version"]).toEqual({
      handler_module: "src/core-runtime/cli/meta-handlers.ts",
      handler_export: "onVersion",
    });
  });

  it("buildPublicDispatchTable indexes preboot PublicEntry cli realizations (canonical only, no aliases)", () => {
    const table = buildPublicDispatchTable(COMMAND_CATALOG);
    // Catalog has info/config/install as cli-backed preboot entries.
    expect(Object.keys(table)).toContain("info");
    expect(Object.keys(table)).toContain("config");
    expect(Object.keys(table)).toContain("install");
    // Sorted ascending.
    const keys = Object.keys(table);
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
    // P2-A — preboot publics still delegate to cli.ts main (no handler_export
    // override). post_boot per-entry handler diversification = future seam.
    expect(table["info"]?.handler_module).toBe("src/cli.ts");
    expect(table["info"]?.handler_export).toBeUndefined();
  });

  it("derivePrebootDispatch is deterministic", () => {
    const a = derivePrebootDispatch(COMMAND_CATALOG);
    const b = derivePrebootDispatch(COMMAND_CATALOG);
    expect(a).toBe(b);
  });

  it("emitted body is a thin shim — static-imports dispatchPrebootCore + emits static tables + forwards", () => {
    const body = renderPrebootDispatchBody(COMMAND_CATALOG, "deadbeef".repeat(8));
    // Thin shim: dispatchPreboot exported with PrebootRouting signature.
    expect(body).toContain("export async function dispatchPreboot");
    expect(body).toContain("routing: PrebootRouting");
    // Static import of dispatchPrebootCore (preboot must not pull cli.ts into
    // the static module graph — P1-3 review UF-DEPENDENCY-PREBOOT-REVERSE-IMPORT.
    // dispatch-preboot-core.ts itself uses dynamic import for the actual handler).
    expect(body).toContain('from "./dispatch-preboot-core.js"');
    expect(body).toContain("dispatchPrebootCore");
    // Static dispatch tables baked in (catalog-derived).
    expect(body).toContain("META_DISPATCH_TABLE");
    expect(body).toContain("PUBLIC_DISPATCH_TABLE");
    // Forwards to core with both tables.
    expect(body).toMatch(/return dispatchPrebootCore\(routing,\s*argv,\s*META_DISPATCH_TABLE,\s*PUBLIC_DISPATCH_TABLE\)/);
    // No hardcoded MetaEntry inline branches (RFC-1 §4.1.2 — Contract A/B/C
    // 본체는 dispatch-preboot-core.ts 의 dispatchPrebootCore 안).
    expect(body).not.toContain('invocation === "--help"');
    expect(body).not.toContain('invocation === "--version"');
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
