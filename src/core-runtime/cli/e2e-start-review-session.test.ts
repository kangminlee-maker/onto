/**
 * start-review-session — focused E2E test suite.
 *
 * Run: `npx tsx src/core-runtime/cli/e2e-start-review-session.test.ts`
 *
 * Scope:
 *   Direct tests for resolveReviewSessionExtractMode — the helper that
 *   picks an extract mode from (env var > config.yml > default). The
 *   helper is exercised in isolation so the rest of startReviewSession
 *   (prepare + materialize + metadata I/O) does not need fixture setup.
 *
 * Isolation strategy:
 *   Each test builds a fake `ontoHome` tmpdir containing just enough to
 *   satisfy resolveOntoHome's validity check (package.json + roles/ +
 *   authority/), then a separate `projectRoot` tmpdir with the config
 *   file under test. The `--onto-home` argv flag forces the resolver
 *   to use the fake ontoHome instead of walking up from the test's
 *   script directory (which would find the real repo and pick up the
 *   repo's live config.yml).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { resolveReviewSessionExtractMode } from "./start-review-session.js";

// ---------------------------------------------------------------------------
// Minimal test runner
// ---------------------------------------------------------------------------

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

async function test(
  name: string,
  fn: () => void | Promise<void>,
): Promise<void> {
  try {
    await fn();
    process.stdout.write(`  PASS  ${name}\n`);
    passCount += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stdout.write(`  FAIL  ${name}\n        ${message}\n`);
    failures.push(`${name}: ${message}`);
    failCount += 1;
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message} — expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeTmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `onto-e2e-srs-${prefix}-`));
}

/**
 * Build a tmpdir that passes `isOntoRoot` validation: needs
 * package.json with name "onto-core" AND roles/ AND authority/.
 * Optionally writes a `learning_extract_mode` value into .onto/config.yml
 * so home-level config can be exercised.
 */
function makeFakeOntoHome(
  prefix: string,
  homeConfigExtractMode?: string,
): string {
  const dir = makeTmpDir(prefix);
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "onto-core", version: "0.0.0-test" }),
    "utf8",
  );
  fs.mkdirSync(path.join(dir, "roles"), { recursive: true });
  fs.mkdirSync(path.join(dir, "authority"), { recursive: true });
  if (homeConfigExtractMode !== undefined) {
    fs.mkdirSync(path.join(dir, ".onto"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".onto", "config.yml"),
      `learning_extract_mode: ${homeConfigExtractMode}\n`,
      "utf8",
    );
  }
  return dir;
}

/**
 * Build a projectRoot tmpdir. When `configExtractMode` is provided,
 * writes .onto/config.yml with that value. When `configExtractMode`
 * is the sentinel `"<MISSING_FIELD>"`, writes a config with other
 * fields but NO `learning_extract_mode` key. When `configExtractMode`
 * is undefined, writes NO config.yml at all.
 */
function makeProjectRoot(
  prefix: string,
  configExtractMode?: string,
): string {
  const dir = makeTmpDir(prefix);
  if (configExtractMode === "<MISSING_FIELD>") {
    fs.mkdirSync(path.join(dir, ".onto"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".onto", "config.yml"),
      "output_language: en\n", // some other field, no learning_extract_mode
      "utf8",
    );
  } else if (configExtractMode !== undefined) {
    fs.mkdirSync(path.join(dir, ".onto"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".onto", "config.yml"),
      `learning_extract_mode: ${configExtractMode}\n`,
      "utf8",
    );
  }
  return dir;
}

/**
 * Save and restore the ONTO_LEARNING_EXTRACT_MODE env var so tests
 * don't pollute each other or the host process.
 */
function withEnvExtractMode<T>(
  value: string | undefined,
  fn: () => T | Promise<T>,
): Promise<T> {
  const prev = process.env.ONTO_LEARNING_EXTRACT_MODE;
  if (value === undefined) delete process.env.ONTO_LEARNING_EXTRACT_MODE;
  else process.env.ONTO_LEARNING_EXTRACT_MODE = value;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (prev === undefined) delete process.env.ONTO_LEARNING_EXTRACT_MODE;
      else process.env.ONTO_LEARNING_EXTRACT_MODE = prev;
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  process.stdout.write("start-review-session E2E\n");
  process.stdout.write("=========================\n");

  // E-SRS-1 — env var set → env var wins even if config has a different value.
  //           Primary proof that ONTO_LEARNING_EXTRACT_MODE has highest
  //           precedence.
  await test("E-SRS-1 env var wins over project config", async () => {
    const ontoHome = makeFakeOntoHome("e-srs-1-home");
    const projectRoot = makeProjectRoot("e-srs-1-proj", "active");
    const argv = ["--onto-home", ontoHome];
    await withEnvExtractMode("shadow", async () => {
      const mode = await resolveReviewSessionExtractMode(argv, projectRoot);
      assertEqual(mode, "shadow", "env shadow beats config active");
    });
  });

  // E-SRS-2 — env var unset, project config has learning_extract_mode: shadow
  //           → resolver picks the config value.
  await test("E-SRS-2 project config value used when env var is unset", async () => {
    const ontoHome = makeFakeOntoHome("e-srs-2-home");
    const projectRoot = makeProjectRoot("e-srs-2-proj", "shadow");
    const argv = ["--onto-home", ontoHome];
    await withEnvExtractMode(undefined, async () => {
      const mode = await resolveReviewSessionExtractMode(argv, projectRoot);
      assertEqual(mode, "shadow", "config shadow used");
    });
  });

  // E-SRS-3 — env var set to the empty string → treated the same as unset.
  //           The check `envExtractMode.length === 0` is what makes an
  //           empty env var fall through to config.
  await test("E-SRS-3 empty env var falls through to project config", async () => {
    const ontoHome = makeFakeOntoHome("e-srs-3-home");
    const projectRoot = makeProjectRoot("e-srs-3-proj", "active");
    const argv = ["--onto-home", ontoHome];
    await withEnvExtractMode("", async () => {
      const mode = await resolveReviewSessionExtractMode(argv, projectRoot);
      assertEqual(mode, "active", "empty env var yields to config active");
    });
  });

  // E-SRS-4 — env var unset + project config has NO learning_extract_mode
  //           field → falls through to validateExtractMode's default "disabled".
  await test("E-SRS-4 missing config field defaults to disabled", async () => {
    const ontoHome = makeFakeOntoHome("e-srs-4-home");
    const projectRoot = makeProjectRoot("e-srs-4-proj", "<MISSING_FIELD>");
    const argv = ["--onto-home", ontoHome];
    await withEnvExtractMode(undefined, async () => {
      const mode = await resolveReviewSessionExtractMode(argv, projectRoot);
      assertEqual(mode, "disabled", "no field → default disabled");
    });
  });

  // E-SRS-5 — env var unset + project has NO .onto/config.yml file at all
  //           → readConfigAt returns {}, resolver falls through to default.
  await test("E-SRS-5 no project config file defaults to disabled", async () => {
    const ontoHome = makeFakeOntoHome("e-srs-5-home");
    const projectRoot = makeProjectRoot("e-srs-5-proj"); // no config.yml
    const argv = ["--onto-home", ontoHome];
    await withEnvExtractMode(undefined, async () => {
      const mode = await resolveReviewSessionExtractMode(argv, projectRoot);
      assertEqual(mode, "disabled", "no config file → default disabled");
    });
  });

  // E-SRS-6 — project config has an INVALID learning_extract_mode value →
  //           resolver throws via validateExtractMode. Fail-fast, no silent
  //           fallback to default.
  await test("E-SRS-6 invalid config value fails fast", async () => {
    const ontoHome = makeFakeOntoHome("e-srs-6-home");
    const projectRoot = makeProjectRoot("e-srs-6-proj", "not-a-real-mode");
    const argv = ["--onto-home", ontoHome];
    let caught: unknown = null;
    await withEnvExtractMode(undefined, async () => {
      try {
        await resolveReviewSessionExtractMode(argv, projectRoot);
      } catch (e) {
        caught = e;
      }
    });
    assert(caught instanceof Error, "invalid config throws");
    assert(
      (caught as Error).message.includes("not-a-real-mode"),
      "error names the bad value",
    );
    assert(
      (caught as Error).message.toLowerCase().includes("invalid"),
      "error explains invalid",
    );
  });

  // E-SRS-7 — env var set to an INVALID value → resolver throws. Regression:
  //           this was the existing behavior before the config field was
  //           added, verify it still holds when config is ALSO present.
  await test("E-SRS-7 invalid env var fails fast (overrides config)", async () => {
    const ontoHome = makeFakeOntoHome("e-srs-7-home");
    const projectRoot = makeProjectRoot("e-srs-7-proj", "shadow"); // valid config
    const argv = ["--onto-home", ontoHome];
    let caught: unknown = null;
    await withEnvExtractMode("totally-bogus", async () => {
      try {
        await resolveReviewSessionExtractMode(argv, projectRoot);
      } catch (e) {
        caught = e;
      }
    });
    assert(caught instanceof Error, "invalid env var throws");
    assert(
      (caught as Error).message.includes("totally-bogus"),
      "error names the env var bad value, not the config value",
    );
  });

  // E-SRS-8 — home-level config has shadow + project config has active →
  //           project wins (resolveConfigChain merge order). Exercises the
  //           4-tier merge so this test also pins the chain semantics for
  //           the new field.
  await test("E-SRS-8 project config overrides home config for extract mode", async () => {
    const ontoHome = makeFakeOntoHome("e-srs-8-home", "shadow");
    const projectRoot = makeProjectRoot("e-srs-8-proj", "active");
    const argv = ["--onto-home", ontoHome];
    await withEnvExtractMode(undefined, async () => {
      const mode = await resolveReviewSessionExtractMode(argv, projectRoot);
      assertEqual(mode, "active", "project active overrides home shadow");
    });
  });

  // E-SRS-9 — home-level config has shadow + project config missing field →
  //           home value is used (merge surfaces homeConfig's value when
  //           projectConfig has no field to override with).
  await test("E-SRS-9 home config value used when project has no field", async () => {
    const ontoHome = makeFakeOntoHome("e-srs-9-home", "shadow");
    const projectRoot = makeProjectRoot("e-srs-9-proj", "<MISSING_FIELD>");
    const argv = ["--onto-home", ontoHome];
    await withEnvExtractMode(undefined, async () => {
      const mode = await resolveReviewSessionExtractMode(argv, projectRoot);
      assertEqual(mode, "shadow", "home shadow surfaces when project has no field");
    });
  });

  // ---------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------
  process.stdout.write("\n");
  process.stdout.write(`Results: ${passCount} passed, ${failCount} failed\n`);
  if (failCount > 0) {
    process.stdout.write("\nFailures:\n");
    for (const f of failures) process.stdout.write(`  - ${f}\n`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((error: unknown) => {
  process.stderr.write(
    `Test runner crashed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
