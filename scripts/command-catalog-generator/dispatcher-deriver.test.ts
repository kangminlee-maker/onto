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
import {
  COMMAND_CATALOG,
  type CommandCatalog,
} from "../../src/core-runtime/cli/command-catalog.js";
import {
  DISPATCHER_EMISSION_PATH,
  computePhaseMap,
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
    it("UPDATE_SNAPSHOT=1 — materializes dispatcher.ts with snapshotMode=true (bootstrap, idempotent)", () => {
      // `written` is true on first bootstrap, false on subsequent reruns when
      // the bytes are already aligned (skip-when-unchanged in deriveAllDispatcher).
      // The seat must be repeatable, so we do not assert on `written`.
      const result = deriveAllDispatcher(COMMAND_CATALOG, {
        snapshotMode: true,
        projectRoot: REPO_ROOT,
      });
      expect(typeof result.written).toBe("boolean");
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

// ---------------------------------------------------------------------------
// P2-C (RFC-1 §4.3): computePhaseMap multi-CLI iteration + collision throw
// ---------------------------------------------------------------------------

describe("computePhaseMap — multi-CLI iteration (P2-C)", () => {
  function makeCatalog(entries: CommandCatalog["entries"]): CommandCatalog {
    return { version: 1, entries };
  }

  it("real catalog: every cli realization invocation present with entry phase", () => {
    const map = computePhaseMap(COMMAND_CATALOG);
    // Spot check: info (preboot), review (post_boot)
    expect(map["info"]).toBe("preboot");
    expect(map["review"]).toBe("post_boot");
    // 모든 PublicEntry 의 cli realization 이 등록됐는지 — count 검증.
    let cliInvocationCount = 0;
    for (const entry of COMMAND_CATALOG.entries) {
      if (entry.kind !== "public") continue;
      for (const r of entry.realizations) {
        if (r.kind === "cli") cliInvocationCount++;
      }
    }
    expect(Object.keys(map).length).toBe(cliInvocationCount);
  });

  it("multi-CLI entry: 모든 cli invocation 이 동일 phase 로 등록", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "compound",
        phase: "post_boot",
        doc_template_id: "compound",
        description: "x",
        realizations: [
          {
            kind: "cli",
            invocation: "compound",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
          {
            kind: "cli",
            invocation: "compound-alt",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    const map = computePhaseMap(catalog);
    expect(map["compound"]).toBe("post_boot");
    expect(map["compound-alt"]).toBe("post_boot");
    // P2-A 이전 (find for first cli): map["compound-alt"] 는 undefined →
    // dispatcher 가 default post_boot 로 silent fallback. P2-C 이후 explicit 등록.
  });

  it("phase collision throws — defense-in-depth (NORMALIZED 가 invocation 충돌은 우선 catch)", () => {
    // 같은 invocation 이 두 entry 에서 다른 phase 로 등록되는 경우.
    // NORMALIZED 가 invocation collision 으로 throw 가 우선이지만, computePhaseMap
    // 자체도 deriver-time defense-in-depth 로 throw 하는지 검증.
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "alpha",
        phase: "preboot",
        doc_template_id: "alpha",
        description: "x",
        realizations: [
          {
            kind: "cli",
            invocation: "shared",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
      {
        kind: "public",
        identity: "beta",
        phase: "post_boot",
        doc_template_id: "beta",
        description: "y",
        realizations: [
          {
            kind: "cli",
            invocation: "shared",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    expect(() => computePhaseMap(catalog)).toThrow(
      /Phase collision.*shared.*preboot.*post_boot/s,
    );
  });

  it("same entry, same phase, multiple cli — no throw (entry-level phase invariant)", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "harmonized",
        phase: "preboot",
        doc_template_id: "harmonized",
        description: "x",
        realizations: [
          {
            kind: "cli",
            invocation: "harmonized",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
          {
            kind: "cli",
            invocation: "harmonized-alt",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    expect(() => computePhaseMap(catalog)).not.toThrow();
    const map = computePhaseMap(catalog);
    expect(map["harmonized"]).toBe("preboot");
    expect(map["harmonized-alt"]).toBe("preboot");
  });
});
