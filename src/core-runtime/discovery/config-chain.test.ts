import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { resolveConfigChain } from "./config-chain.js";

// ---------------------------------------------------------------------------
// config-chain — P9.5 graceful-ignore regression guard (2026-04-21).
//
// P9.5 retired `legacy-field-deprecation.ts`. Legacy provider-profile
// fields (host_runtime, execution_realization, execution_mode,
// executor_realization, api_provider) in YAML no longer throw
// `LegacyFieldRemovedError` at config load. The OntoConfig type omits
// them, so typed code cannot read them; Record-cast paths can still
// see the values, but no production consumer does so — the fields are
// effectively inert.
//
// These tests lock in the graceful-ignore contract so a future refactor
// that reintroduces a throw surfaces as a test failure, and so the
// "config loads + downstream path still works" invariant is explicit.
// ---------------------------------------------------------------------------

const cleanupDirs: string[] = [];

function makeTmpDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `onto-p95-${prefix}-`));
  cleanupDirs.push(dir);
  return dir;
}

function writeConfig(dir: string, yaml: string): void {
  fs.mkdirSync(path.join(dir, ".onto"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".onto", "config.yml"), yaml, "utf8");
}

afterEach(() => {
  while (cleanupDirs.length > 0) {
    const dir = cleanupDirs.pop();
    if (dir) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
});

describe("resolveConfigChain — P9.5 legacy field graceful ignore", () => {
  it("legacy-only project config → loads without throw; OntoConfig type omits legacy keys", async () => {
    // Pre-P9.5: `host_runtime: codex` + no `review:` block threw
    // LegacyFieldRemovedError. Post-P9.5: loads successfully.
    const homeDir = makeTmpDir("legacy-h");
    const projDir = makeTmpDir("legacy-p");
    writeConfig(projDir, "host_runtime: codex\napi_provider: codex\n");

    // Must not throw. The promise resolving is the primary invariant.
    const config = await resolveConfigChain(homeDir, projDir);
    expect(config).toBeDefined();

    // The OntoConfig type omits the legacy fields — typed access via
    // `config.host_runtime` would be a TypeScript error. No runtime
    // consumer reads these values; they remain in the underlying
    // Record only for Record-cast backward compatibility.
    expect((config as { review?: unknown }).review).toBeUndefined();
    expect(config.codex).toBeUndefined();
  });

  it("legacy fields + review block → config loads, review block survives and is authoritative", async () => {
    const homeDir = makeTmpDir("mixed-h");
    const projDir = makeTmpDir("mixed-p");
    writeConfig(
      projDir,
      [
        "host_runtime: anthropic", // legacy ghost field — not consumed
        "review:",
        "  subagent:",
        "    provider: codex",
        "    model_id: gpt-5.4",
        "codex:",
        "  model: gpt-5.4",
      ].join("\n"),
    );

    const config = await resolveConfigChain(homeDir, projDir);
    // Review block (orthogonal) + codex namespace (profile) are the
    // authoritative sources post-P9.5.
    expect(config.review?.subagent?.provider).toBe("codex");
    expect(config.codex?.model).toBe("gpt-5.4");
  });

  it("legacy-only home + absent project → home profile adopted via atomic adoption", async () => {
    // Home has legacy-only YAML + a codex namespace. Pre-P9.5 the
    // legacy throw would fire before adoption ran. Post-P9.5 adoption
    // sees `hasAnyProfileField(home) === true` (via `codex`) and picks
    // up the home profile; legacy fields are inert.
    const homeDir = makeTmpDir("home-legacy-h");
    const projDir = makeTmpDir("home-legacy-p");
    writeConfig(
      homeDir,
      ["host_runtime: codex", "codex:", "  model: gpt-5.4"].join("\n"),
    );
    // No project config.

    const config = await resolveConfigChain(homeDir, projDir);
    expect(config.codex?.model).toBe("gpt-5.4");
  });

  it("completely empty configs → loads without throw (resolver owns no_host fail-fast downstream)", async () => {
    // Pre-P9.4 `buildBothIncompleteError` threw; pre-P9.5
    // `LegacyFieldRemovedError` threw when legacy present. Post-P9.5
    // config load never throws for these cases — the topology resolver
    // is the sole fail-fast point via `no_host`.
    const homeDir = makeTmpDir("empty-h");
    const projDir = makeTmpDir("empty-p");

    const config = await resolveConfigChain(homeDir, projDir);
    expect(config).toBeDefined();
    expect(config.codex).toBeUndefined();
    expect(config.review).toBeUndefined();
  });
});
