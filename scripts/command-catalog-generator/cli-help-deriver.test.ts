/**
 * Tests — cli-help-deriver.test.ts (P1-2c).
 *
 * Stage 1 (unit + determinism):
 *   - deriveCliHelpSegment is deterministic.
 *   - The body declares `const ONTO_HELP_TEXT` and is wrapped in TS markers.
 *   - Slash-only PublicEntry (no CliRealization) are excluded from the help
 *     subcommand list.
 *   - spliceCliHelpSegment replaces an existing segment in place.
 *   - spliceCliHelpSegment fails closed when the file has no segment and
 *     snapshotMode=false.
 *
 * Stage 2 (diff-0):
 *   - Default mode: byte-compare cli.ts against deriveAllCliHelp(dryRun=false)
 *     output (computed in-memory; not written to disk).
 *   - UPDATE_SNAPSHOT=1 mode: actually write cli.ts via deriveAllCliHelp.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COMMAND_CATALOG } from "../../src/core-runtime/cli/command-catalog.js";
import {
  CLI_HELP_EMISSION_PATH,
  buildSubcommandLines,
  deriveAllCliHelp,
  deriveCliHelpSegment,
  spliceCliHelpSegment,
} from "./cli-help-deriver.js";
import { extractTypeScriptSegment } from "./marker.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const CLI_TS_ABS = path.resolve(REPO_ROOT, CLI_HELP_EMISSION_PATH);

const SHOULD_UPDATE = process.env.UPDATE_SNAPSHOT === "1";

describe("Stage 1 — cli-help-deriver unit + determinism", () => {
  it("deriveCliHelpSegment is deterministic", () => {
    const a = deriveCliHelpSegment(COMMAND_CATALOG);
    const b = deriveCliHelpSegment(COMMAND_CATALOG);
    expect(a).toBe(b);
  });

  it("output round-trips through extractTypeScriptSegment", () => {
    const out = deriveCliHelpSegment(COMMAND_CATALOG);
    const marker = extractTypeScriptSegment(out);
    expect(marker).not.toBeNull();
    expect(marker?.body).toContain("const ONTO_HELP_TEXT");
    expect(marker?.body).toContain('].join("\\n")');
  });

  it("slash-only PublicEntry are excluded from subcommand block", () => {
    const lines = buildSubcommandLines(COMMAND_CATALOG);
    // `feedback` is slash-only (no CliRealization) — must NOT appear.
    expect(lines.some((l) => l.includes("  feedback "))).toBe(false);
    // `info` is cli-backed — must appear.
    expect(lines.some((l) => l.match(/^\s+info\s/))).toBe(true);
  });

  it("deprecated entries carry a [DEPRECATED] marker", () => {
    const lines = buildSubcommandLines(COMMAND_CATALOG);
    const deprecated = lines.filter((l) => l.includes("[DEPRECATED"));
    // build / reclassify-insights / migrate-session-roots are all marked
    // deprecated_since: "0.2.0" in the catalog.
    expect(deprecated.length).toBeGreaterThanOrEqual(3);
  });

  it("spliceCliHelpSegment replaces an existing segment in place", () => {
    const original = [
      "import { foo } from 'bar';",
      "",
      "// >>> GENERATED FROM CATALOG — do not edit; edit X instead. derive-hash=deadbeef",
      "const ONTO_HELP_TEXT = ['old'].join('\\n');",
      "// <<< END GENERATED",
      "",
      "export function main() {}",
      "",
    ].join("\n");
    const segment = deriveCliHelpSegment(COMMAND_CATALOG);
    const updated = spliceCliHelpSegment(original, segment, false);
    // Old segment body removed, new derive-hash present.
    expect(updated).not.toContain("derive-hash=deadbeef");
    expect(updated).toContain("derive-hash=");
    // Surrounding code preserved.
    expect(updated).toContain("import { foo } from 'bar';");
    expect(updated).toContain("export function main() {}");
  });

  it("spliceCliHelpSegment fails closed when file has no segment + snapshotMode=false", () => {
    const original = `import { foo } from "bar";\n\nexport function main() {}\n`;
    const segment = deriveCliHelpSegment(COMMAND_CATALOG);
    expect(() => spliceCliHelpSegment(original, segment, false)).toThrow(
      /UPDATE_SNAPSHOT=1/,
    );
  });

  it("spliceCliHelpSegment injects after last import when snapshotMode=true", () => {
    const original = [
      `import { foo } from "bar";`,
      `import { baz } from "qux";`,
      "",
      "export function main() {}",
      "",
    ].join("\n");
    const segment = deriveCliHelpSegment(COMMAND_CATALOG);
    const updated = spliceCliHelpSegment(original, segment, true);
    expect(updated).toContain(`import { baz } from "qux";`);
    expect(updated).toContain("const ONTO_HELP_TEXT");
    // The segment must appear after both imports.
    const importIdx = updated.lastIndexOf(`import { baz }`);
    const segmentIdx = updated.indexOf("const ONTO_HELP_TEXT");
    expect(segmentIdx).toBeGreaterThan(importIdx);
    // The exported function still follows the segment.
    const mainIdx = updated.indexOf("export function main()");
    expect(mainIdx).toBeGreaterThan(segmentIdx);
  });

  it("snapshotMode=true without UPDATE_SNAPSHOT=1 throws", () => {
    if (process.env.UPDATE_SNAPSHOT === "1") return;
    expect(() =>
      deriveAllCliHelp(COMMAND_CATALOG, {
        snapshotMode: true,
        projectRoot: REPO_ROOT,
      }),
    ).toThrow(/UPDATE_SNAPSHOT=1/);
  });
});

describe("Stage 2 — derive pipeline", () => {
  if (SHOULD_UPDATE) {
    it("UPDATE_SNAPSHOT=1 — writes cli.ts segment with snapshotMode=true (bootstrap)", () => {
      const result = deriveAllCliHelp(COMMAND_CATALOG, {
        snapshotMode: true,
        projectRoot: REPO_ROOT,
      });
      expect(existsSync(CLI_TS_ABS)).toBe(true);
      // `written` may be true (segment changed) or false (already up to date).
      expect(typeof result.written).toBe("boolean");
    });
  } else {
    it("default mode — cli.ts ONTO_HELP_TEXT segment matches catalog derive", () => {
      if (!existsSync(CLI_TS_ABS)) {
        throw new Error(
          `cli.ts not found at ${CLI_HELP_EMISSION_PATH}. Bootstrap required.`,
        );
      }
      const current = readFileSync(CLI_TS_ABS, "utf8");
      const expectedSegment = deriveCliHelpSegment(COMMAND_CATALOG);
      const existingMarker = extractTypeScriptSegment(current);
      if (existingMarker === null) {
        throw new Error(
          `cli.ts has no TS segment marker yet. Run UPDATE_SNAPSHOT=1 ` +
            `npx vitest run scripts/command-catalog-generator/cli-help-deriver.test.ts.`,
        );
      }
      // Splice the expected segment into the current cli.ts and assert
      // identity — i.e., re-running the splice would be a no-op.
      const updated = spliceCliHelpSegment(current, expectedSegment, false);
      if (updated !== current) {
        throw new Error(
          `Diff-0 violation in ${CLI_HELP_EMISSION_PATH} segment: bytes differ. ` +
            `Run: UPDATE_SNAPSHOT=1 npx vitest run scripts/command-catalog-generator/cli-help-deriver.test.ts`,
        );
      }
    });
  }
});
