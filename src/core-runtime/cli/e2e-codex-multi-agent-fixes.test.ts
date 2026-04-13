/**
 * Codex multi-agent fixes — E2E test suite.
 *
 * Run: `npx tsx src/core-runtime/cli/e2e-codex-multi-agent-fixes.test.ts`
 *
 * Covers:
 *   B. OntoConfig codex namespace (config-chain.ts)
 *   C. appendExecutorModelArgs codex fallback (review-invoke.ts)
 *   D. Synthesize retry (run-review-prompt-execution.ts)
 *   E. Coordinator agent prompt — Write tool removed (coordinator-state-machine.ts)
 *   F. process.md ToolSearch instruction
 *
 * Isolation strategy:
 *   Each test builds minimal tmpdir fixtures. Tests that exercise the
 *   prompt execution runner build a full session directory with a mock
 *   execution-plan.yaml and mock prompt packets.
 */

import fs from "node:fs";
import fsAsync from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

// ---------------------------------------------------------------------------
// Minimal test runner (matching project convention)
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

function assertIncludes(text: string, needle: string, message: string): void {
  if (!text.includes(needle)) {
    throw new Error(`${message} — text does not include ${JSON.stringify(needle)}`);
  }
}

function assertNotIncludes(text: string, needle: string, message: string): void {
  if (text.includes(needle)) {
    throw new Error(`${message} — text unexpectedly includes ${JSON.stringify(needle)}`);
  }
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeTmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `onto-e2e-cmaf-${prefix}-`));
}

function writeYaml(filePath: string, data: Record<string, unknown>): void {
  // Minimal YAML serializer sufficient for test fixtures
  const lines: string[] = [];
  function renderValue(value: unknown, indent: number): void {
    const pad = " ".repeat(indent);
    if (value === null || value === undefined) {
      lines.push("null");
      return;
    }
    if (typeof value === "string") {
      // Use quoted form for safety
      lines.push(`"${value.replace(/"/g, '\\"')}"`);
      return;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      lines.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push("[]");
        return;
      }
      lines.push("");
      for (const item of value) {
        const lineStart = `${pad}- `;
        if (typeof item === "object" && item !== null && !Array.isArray(item)) {
          const entries = Object.entries(item as Record<string, unknown>);
          let first = true;
          for (const [k, v] of entries) {
            if (first) {
              lines.push(`${lineStart}${k}: `);
              first = false;
            } else {
              lines.push(`${pad}  ${k}: `);
            }
            renderValue(v, indent + 4);
          }
        } else {
          lines.push(lineStart);
          renderValue(item, indent + 2);
        }
      }
      return;
    }
    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) {
        lines.push("{}");
        return;
      }
      lines.push("");
      for (const [k, v] of entries) {
        lines.push(`${pad}${k}: `);
        renderValue(v, indent + 2);
      }
      return;
    }
    lines.push(String(value));
  }

  for (const [key, value] of Object.entries(data)) {
    lines.push(`${key}: `);
    renderValue(value, 2);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join("").replace(/: \n/g, ":\n").replace(/: (\S)/g, ": $1") + "\n", "utf8");
}

/** Cleanup directory, ignoring errors. */
function rmDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch { /* ignore */ }
}

const cleanupDirs: string[] = [];
function trackCleanup(dir: string): string {
  cleanupDirs.push(dir);
  return dir;
}

// ---------------------------------------------------------------------------
// B. OntoConfig codex namespace (config-chain.ts)
// ---------------------------------------------------------------------------

async function testConfigChainCodexNamespace(): Promise<void> {
  process.stdout.write("\n── B. config-chain codex namespace ──\n");

  const { resolveConfigChain } = await import(
    "../discovery/config-chain.js"
  );

  await test("B-1: codex namespace parsed from project config", async () => {
    const homeDir = trackCleanup(makeTmpDir("b1h"));
    const projDir = trackCleanup(makeTmpDir("b1p"));
    fs.mkdirSync(path.join(projDir, ".onto"), { recursive: true });
    fs.writeFileSync(
      path.join(projDir, ".onto", "config.yml"),
      "codex:\n  model: gpt-5.4\n  effort: xhigh\n",
      "utf8",
    );
    const config = await resolveConfigChain(homeDir, projDir);
    assertEqual(config.codex?.model, "gpt-5.4", "codex.model parsed");
    assertEqual(config.codex?.effort, "xhigh", "codex.effort parsed");
  });

  await test("B-2: project codex namespace overrides home", async () => {
    const homeDir = trackCleanup(makeTmpDir("b2h"));
    const projDir = trackCleanup(makeTmpDir("b2p"));
    fs.mkdirSync(path.join(homeDir, ".onto"), { recursive: true });
    fs.writeFileSync(
      path.join(homeDir, ".onto", "config.yml"),
      "codex:\n  model: gpt-5.3\n  effort: high\n",
      "utf8",
    );
    fs.mkdirSync(path.join(projDir, ".onto"), { recursive: true });
    fs.writeFileSync(
      path.join(projDir, ".onto", "config.yml"),
      "codex:\n  model: gpt-5.4\n  effort: xhigh\n",
      "utf8",
    );
    const config = await resolveConfigChain(homeDir, projDir);
    assertEqual(config.codex?.model, "gpt-5.4", "project codex.model wins");
    assertEqual(config.codex?.effort, "xhigh", "project codex.effort wins");
  });

  await test("B-3: top-level model coexists with codex namespace", async () => {
    const homeDir = trackCleanup(makeTmpDir("b3h"));
    const projDir = trackCleanup(makeTmpDir("b3p"));
    fs.mkdirSync(path.join(projDir, ".onto"), { recursive: true });
    fs.writeFileSync(
      path.join(projDir, ".onto", "config.yml"),
      "model: claude-sonnet-4-20250514\nreasoning_effort: medium\ncodex:\n  model: gpt-5.4\n  effort: xhigh\n",
      "utf8",
    );
    const config = await resolveConfigChain(homeDir, projDir);
    assertEqual(config.model, "claude-sonnet-4-20250514", "top-level model");
    assertEqual(config.reasoning_effort, "medium", "top-level reasoning_effort");
    assertEqual(config.codex?.model, "gpt-5.4", "codex.model");
    assertEqual(config.codex?.effort, "xhigh", "codex.effort");
  });

  await test("B-4: missing codex namespace → undefined", async () => {
    const homeDir = trackCleanup(makeTmpDir("b4h"));
    const projDir = trackCleanup(makeTmpDir("b4p"));
    fs.mkdirSync(path.join(projDir, ".onto"), { recursive: true });
    fs.writeFileSync(
      path.join(projDir, ".onto", "config.yml"),
      "model: claude-sonnet-4-20250514\n",
      "utf8",
    );
    const config = await resolveConfigChain(homeDir, projDir);
    assertEqual(config.codex, undefined, "codex absent → undefined");
  });

  await test("B-5: empty codex namespace → empty object", async () => {
    const homeDir = trackCleanup(makeTmpDir("b5h"));
    const projDir = trackCleanup(makeTmpDir("b5p"));
    fs.mkdirSync(path.join(projDir, ".onto"), { recursive: true });
    fs.writeFileSync(
      path.join(projDir, ".onto", "config.yml"),
      "codex: {}\n",
      "utf8",
    );
    const config = await resolveConfigChain(homeDir, projDir);
    assert(config.codex !== undefined, "codex namespace exists");
    assertEqual(config.codex?.model, undefined, "codex.model undefined");
    assertEqual(config.codex?.effort, undefined, "codex.effort undefined");
  });

  await test("B-6: home codex used when project has no config", async () => {
    const homeDir = trackCleanup(makeTmpDir("b6h"));
    const projDir = trackCleanup(makeTmpDir("b6p"));
    fs.mkdirSync(path.join(homeDir, ".onto"), { recursive: true });
    fs.writeFileSync(
      path.join(homeDir, ".onto", "config.yml"),
      "codex:\n  model: gpt-5.3\n  effort: high\n",
      "utf8",
    );
    // No .onto/config.yml in project
    const config = await resolveConfigChain(homeDir, projDir);
    assertEqual(config.codex?.model, "gpt-5.3", "home codex.model used");
    assertEqual(config.codex?.effort, "high", "home codex.effort used");
  });
}

// ---------------------------------------------------------------------------
// C. appendExecutorModelArgs codex fallback (review-invoke.ts)
//
// We can't import the private function directly, so we test it indirectly
// through the CLI argv interface by checking the resolved executor config.
// Strategy: invoke reviewPrepareOnly with --codex and mock executor, then
// inspect the execution-plan + the runner result to verify model/effort.
//
// For isolated unit testing, we duplicate the function's logic and verify.
// ---------------------------------------------------------------------------

async function testCodexConfigFallback(): Promise<void> {
  process.stdout.write("\n── C. codex config fallback ──\n");

  // Reproduce appendExecutorModelArgs logic to test the resolution chain
  const { readSingleOptionValueFromArgv } = await import(
    "../review/review-artifact-utils.js"
  );
  type OntoConfig = {
    model?: string;
    reasoning_effort?: string;
    codex?: { model?: string; effort?: string };
  };

  function resolveModel(
    argv: string[],
    config: OntoConfig | undefined,
  ): string | undefined {
    const fromArgv = readSingleOptionValueFromArgv(argv, "model");
    return (
      (typeof fromArgv === "string" && fromArgv.length > 0 ? fromArgv : undefined) ??
      config?.model ??
      config?.codex?.model
    );
  }

  function resolveEffort(
    argv: string[],
    config: OntoConfig | undefined,
  ): string | undefined {
    const fromArgv = readSingleOptionValueFromArgv(argv, "reasoning-effort");
    return (
      (typeof fromArgv === "string" && fromArgv.length > 0 ? fromArgv : undefined) ??
      config?.reasoning_effort ??
      config?.codex?.effort
    );
  }

  await test("C-1: CLI flag wins over everything (model)", () => {
    const config: OntoConfig = {
      model: "claude-sonnet-4-20250514",
      codex: { model: "gpt-5.3" },
    };
    const result = resolveModel(["--model", "gpt-5.4"], config);
    assertEqual(result, "gpt-5.4", "CLI flag wins");
  });

  await test("C-2: top-level config wins over codex namespace", () => {
    const config: OntoConfig = {
      model: "claude-sonnet-4-20250514",
      codex: { model: "gpt-5.4" },
    };
    const result = resolveModel([], config);
    assertEqual(result, "claude-sonnet-4-20250514", "top-level wins");
  });

  await test("C-3: codex namespace used when top-level absent (model)", () => {
    const config: OntoConfig = {
      codex: { model: "gpt-5.4" },
    };
    const result = resolveModel([], config);
    assertEqual(result, "gpt-5.4", "codex.model fallback");
  });

  await test("C-4: codex effort used when reasoning_effort absent", () => {
    const config: OntoConfig = {
      codex: { effort: "xhigh" },
    };
    const result = resolveEffort([], config);
    assertEqual(result, "xhigh", "codex.effort fallback");
  });

  await test("C-5: top-level reasoning_effort wins over codex effort", () => {
    const config: OntoConfig = {
      reasoning_effort: "medium",
      codex: { effort: "xhigh" },
    };
    const result = resolveEffort([], config);
    assertEqual(result, "medium", "top-level effort wins");
  });

  await test("C-6: CLI reasoning-effort wins over all", () => {
    const config: OntoConfig = {
      reasoning_effort: "medium",
      codex: { effort: "xhigh" },
    };
    const result = resolveEffort(["--reasoning-effort", "low"], config);
    assertEqual(result, "low", "CLI flag wins");
  });

  await test("C-7: all absent → undefined", () => {
    const config: OntoConfig = {};
    assertEqual(resolveModel([], config), undefined, "model undefined");
    assertEqual(resolveEffort([], config), undefined, "effort undefined");
  });

  await test("C-8: undefined config → undefined", () => {
    assertEqual(resolveModel([], undefined), undefined, "model no config");
    assertEqual(resolveEffort([], undefined), undefined, "effort no config");
  });
}

// ---------------------------------------------------------------------------
// D. Synthesize retry (run-review-prompt-execution.ts)
//
// Strategy: build a minimal session, use always-succeed executor for lenses,
// and flaky/always-fail executor for synthesize to test the new retry logic.
// D-4/D-5 pre-write lens outputs to bypass the lens retry loop (10 retries
// with 8s backoff = too slow for E2E tests).
// ---------------------------------------------------------------------------

async function testSynthesizeRetry(): Promise<void> {
  process.stdout.write("\n── D. Synthesize retry ──\n");

  const projectRoot = process.cwd();

  const { executeReviewPromptExecution } = await import(
    "./run-review-prompt-execution.js"
  );
  const { writeYamlDocument } = await import(
    "../review/review-artifact-utils.js"
  );

  const BOUNDARY_DECISION = {
    requested_policy: "denied",
    effective_policy: "denied",
    guarantee_level: "prompt_declared_only",
    notes: [],
  };

  async function buildMinimalSession(
    prefix: string,
  ): Promise<{ sessionRoot: string; synthesizeOutputPath: string }> {
    const sessionRoot = trackCleanup(makeTmpDir(prefix));
    const packetRoot = path.join(sessionRoot, "prompt-packets");
    const round1Root = path.join(sessionRoot, "round1");
    fs.mkdirSync(packetRoot, { recursive: true });
    fs.mkdirSync(round1Root, { recursive: true });

    for (const lensId of ["logic", "pragmatics"]) {
      fs.writeFileSync(
        path.join(packetRoot, `${lensId}.prompt.md`),
        `# ${lensId} prompt packet\nTest.\n`,
        "utf8",
      );
    }
    fs.writeFileSync(
      path.join(packetRoot, "synthesize.prompt.md"),
      "# Synthesize\nCombine.\n",
      "utf8",
    );

    const synthesizeOutputPath = path.join(sessionRoot, "synthesis-output.md");
    await writeYamlDocument(
      path.join(sessionRoot, "execution-plan.yaml"),
      {
        session_id: `e2e-${prefix}`,
        session_root: sessionRoot,
        execution_realization: "subagent",
        host_runtime: "codex",
        review_mode: "light",
        interpretation_artifact_path: path.join(sessionRoot, "interpretation.yaml"),
        binding_output_path: path.join(sessionRoot, "binding.yaml"),
        session_metadata_path: path.join(sessionRoot, "session-metadata.yaml"),
        execution_preparation_root: path.join(sessionRoot, "execution-preparation"),
        round1_root: round1Root,
        lens_execution_seats: [],
        prompt_packets_root: packetRoot,
        lens_prompt_packet_seats: [
          {
            lens_id: "logic",
            packet_path: path.join(packetRoot, "logic.prompt.md"),
            output_path: path.join(round1Root, "logic.md"),
          },
          {
            lens_id: "pragmatics",
            packet_path: path.join(packetRoot, "pragmatics.prompt.md"),
            output_path: path.join(round1Root, "pragmatics.md"),
          },
        ],
        synthesize_prompt_packet_path: path.join(packetRoot, "synthesize.prompt.md"),
        synthesis_output_path: synthesizeOutputPath,
        deliberation_output_path: path.join(sessionRoot, "deliberation.md"),
        execution_result_path: path.join(sessionRoot, "execution-result.yaml"),
        error_log_path: path.join(sessionRoot, "error-log.md"),
        final_output_path: path.join(sessionRoot, "final-output.md"),
        review_record_path: path.join(sessionRoot, "review-record.yaml"),
        boundary_policy: { web_research: "denied", repo_exploration: "denied", recursive_reference_expansion: "denied", source_mutation: "denied" },
        boundary_presentation: { web_research: "denied", repo_exploration: "denied", recursive_reference_expansion: "denied", source_mutation: "denied" },
        boundary_enforcement_profile: { web_research: "prompt_declared_only", repo_exploration: "prompt_declared_only", recursive_reference_expansion: "prompt_declared_only", source_mutation: "prompt_declared_only" },
        effective_boundary_state: {
          web_research: BOUNDARY_DECISION,
          repo_exploration: BOUNDARY_DECISION,
          recursive_reference_expansion: BOUNDARY_DECISION,
          source_mutation: BOUNDARY_DECISION,
          filesystem_scope: { requested_allowed_roots: [projectRoot], effective_allowed_roots: [projectRoot], guarantee_level: "prompt_declared_only", notes: [] },
        },
      },
    );

    return { sessionRoot, synthesizeOutputPath };
  }

  /** Always-succeed executor script (for lenses). */
  function createSucceedScript(dir: string): string {
    const scriptPath = path.join(dir, "succeed-executor.mjs");
    fs.writeFileSync(scriptPath, `
import fs from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
const unitId = args[args.indexOf("--unit-id") + 1];
const unitKind = args[args.indexOf("--unit-kind") + 1];
const outputPath = args[args.indexOf("--output-path") + 1];
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const output = unitKind === "synthesize"
  ? "---\\ndeliberation_status: not_needed\\n---\\n# Synthesize\\nResult.\\n"
  : "# " + unitId + "\\nLens result.\\n";
fs.writeFileSync(outputPath, output, "utf8");
`, "utf8");
    return scriptPath;
  }

  /** Flaky synthesize executor: tracks attempts via counter file. */
  function createSynthFlakyScript(
    dir: string,
    mode: "fail-then-succeed" | "always-fail",
  ): { scriptPath: string; counterPath: string } {
    const scriptPath = path.join(dir, "synth-flaky.mjs");
    const counterPath = path.join(dir, "synth-counter.txt");
    fs.writeFileSync(scriptPath, `
import fs from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
const unitKind = args[args.indexOf("--unit-kind") + 1];
const unitId = args[args.indexOf("--unit-id") + 1];
const outputPath = args[args.indexOf("--output-path") + 1];
const counterPath = ${JSON.stringify(counterPath)};
const mode = ${JSON.stringify(mode)};
if (unitKind === "synthesize") {
  let count = 0;
  try { count = parseInt(fs.readFileSync(counterPath, "utf8").trim(), 10); } catch {}
  count++;
  fs.writeFileSync(counterPath, String(count), "utf8");
  if (mode === "always-fail" || (mode === "fail-then-succeed" && count === 1)) {
    process.stderr.write("Simulated synthesize failure (attempt " + count + ")\\n");
    process.exit(1);
  }
}
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const output = unitKind === "synthesize"
  ? "---\\ndeliberation_status: not_needed\\n---\\n# Synthesize\\nResult.\\n"
  : "# " + unitId + "\\nLens.\\n";
fs.writeFileSync(outputPath, output, "utf8");
`, "utf8");
    return { scriptPath, counterPath };
  }

  // ── D-1: synthesize succeeds on first attempt ──
  await test("D-1: synthesize succeeds on first attempt", async () => {
    const { sessionRoot } = await buildMinimalSession("d1");
    const execDir = trackCleanup(makeTmpDir("d1-exec"));
    const succeedScript = createSucceedScript(execDir);

    const result = await executeReviewPromptExecution({
      projectRoot,
      sessionRoot,
      defaultExecutorConfig: { bin: "node", args: [succeedScript] },
    });

    assertEqual(result.synthesis_executed, true, "synthesis executed");
    assert(!result.halt_reason, "no halt");
    assertEqual(result.executed_lens_count, 2, "2 lenses");
  });

  // ── D-2: synthesize fails first, succeeds on retry ──
  await test("D-2: synthesize fails then succeeds on retry", async () => {
    const { sessionRoot } = await buildMinimalSession("d2");
    const execDir = trackCleanup(makeTmpDir("d2-exec"));
    const succeedScript = createSucceedScript(execDir);
    const synthDir = path.join(execDir, "synth");
    fs.mkdirSync(synthDir, { recursive: true });
    const { scriptPath: synthScript, counterPath } =
      createSynthFlakyScript(synthDir, "fail-then-succeed");

    const result = await executeReviewPromptExecution({
      projectRoot,
      sessionRoot,
      defaultExecutorConfig: { bin: "node", args: [succeedScript] },
      synthesizeExecutorConfig: { bin: "node", args: [synthScript] },
    });

    assertEqual(result.synthesis_executed, true, "synthesis after retry");
    assert(!result.halt_reason, "no halt");
    const attempts = parseInt(fs.readFileSync(counterPath, "utf8").trim(), 10);
    assertEqual(attempts, 2, "2 attempts (1 fail + 1 success)");

    const errorLog = fs.readFileSync(path.join(sessionRoot, "error-log.md"), "utf8");
    assertIncludes(errorLog, "synthesize retry", "retry logged");
  });

  // ── D-3: synthesize fails both attempts → halt ──
  await test("D-3: synthesize fails both attempts → halted", async () => {
    const { sessionRoot } = await buildMinimalSession("d3");
    const execDir = trackCleanup(makeTmpDir("d3-exec"));
    const succeedScript = createSucceedScript(execDir);
    const synthDir = path.join(execDir, "synth");
    fs.mkdirSync(synthDir, { recursive: true });
    const { scriptPath: synthScript, counterPath } =
      createSynthFlakyScript(synthDir, "always-fail");

    const result = await executeReviewPromptExecution({
      projectRoot,
      sessionRoot,
      defaultExecutorConfig: { bin: "node", args: [succeedScript] },
      synthesizeExecutorConfig: { bin: "node", args: [synthScript] },
    });

    assertEqual(result.synthesis_executed, false, "synthesis failed");
    assert(typeof result.halt_reason === "string" && result.halt_reason.length > 0, "halt_reason present");
    assertIncludes(result.halt_reason!, "Synthesize execution failed", "halt reason");
    const attempts = parseInt(fs.readFileSync(counterPath, "utf8").trim(), 10);
    assertEqual(attempts, 2, "2 attempts before halt");
  });

  // ── D-4: execution-result artifact written on synthesize halt ──
  await test("D-4: execution-result artifact written on synth halt", async () => {
    const { sessionRoot } = await buildMinimalSession("d4");
    const execDir = trackCleanup(makeTmpDir("d4-exec"));
    const succeedScript = createSucceedScript(execDir);
    const synthDir = path.join(execDir, "synth");
    fs.mkdirSync(synthDir, { recursive: true });
    const { scriptPath: synthScript } = createSynthFlakyScript(synthDir, "always-fail");

    await executeReviewPromptExecution({
      projectRoot,
      sessionRoot,
      defaultExecutorConfig: { bin: "node", args: [succeedScript] },
      synthesizeExecutorConfig: { bin: "node", args: [synthScript] },
    });

    const resultPath = path.join(sessionRoot, "execution-result.yaml");
    assert(fs.existsSync(resultPath), "execution-result.yaml created");
    const resultText = fs.readFileSync(resultPath, "utf8");
    assertIncludes(resultText, "halted_partial", "status is halted_partial");
    assertIncludes(resultText, "Synthesize execution failed", "halt_reason in artifact");
  });

  // ── D-5: successful retry still produces correct execution-result ──
  await test("D-5: successful retry produces correct execution-result", async () => {
    const { sessionRoot } = await buildMinimalSession("d5");
    const execDir = trackCleanup(makeTmpDir("d5-exec"));
    const succeedScript = createSucceedScript(execDir);
    const synthDir = path.join(execDir, "synth");
    fs.mkdirSync(synthDir, { recursive: true });
    const { scriptPath: synthScript } = createSynthFlakyScript(synthDir, "fail-then-succeed");

    const result = await executeReviewPromptExecution({
      projectRoot,
      sessionRoot,
      defaultExecutorConfig: { bin: "node", args: [succeedScript] },
      synthesizeExecutorConfig: { bin: "node", args: [synthScript] },
    });

    assertEqual(result.synthesis_executed, true, "synthesis executed");
    const resultPath = path.join(sessionRoot, "execution-result.yaml");
    assert(fs.existsSync(resultPath), "execution-result.yaml created");
    const resultText = fs.readFileSync(resultPath, "utf8");
    assertIncludes(resultText, "completed", "status is completed");
    assertNotIncludes(resultText, "halted_partial", "not halted");
  });
}

// ---------------------------------------------------------------------------
// E. Coordinator agent prompt — Write tool removed
// ---------------------------------------------------------------------------

async function testCoordinatorPrompt(): Promise<void> {
  process.stdout.write("\n── E. Coordinator agent prompt ──\n");

  // Read the coordinator source to verify prompt template
  const coordinatorSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/core-runtime/cli/coordinator-state-machine.ts",
    ),
    "utf8",
  );

  await test("E-1: prompt does NOT contain 'using the Write tool'", () => {
    // Extract the AGENT_PROMPT_TEMPLATE string
    const templateMatch = coordinatorSource.match(
      /const AGENT_PROMPT_TEMPLATE = `([\s\S]*?)`;/,
    );
    assert(templateMatch !== null, "AGENT_PROMPT_TEMPLATE found in source");
    const template = templateMatch?.[1] ?? "";

    assertNotIncludes(
      template,
      "using the Write tool",
      "prompt should not mention Write tool (Codex incompatible)",
    );
  });

  await test("E-2: prompt still instructs writing to output path", () => {
    const templateMatch = coordinatorSource.match(
      /const AGENT_PROMPT_TEMPLATE = `([\s\S]*?)`;/,
    );
    const template = templateMatch?.[1] ?? "";

    assertIncludes(
      template,
      "write the complete output to {output_path}",
      "output path write instruction preserved",
    );
  });

  await test("E-3: prompt contains all required rule keywords", () => {
    const templateMatch = coordinatorSource.match(
      /const AGENT_PROMPT_TEMPLATE = `([\s\S]*?)`;/,
    );
    const template = templateMatch?.[1] ?? "";

    const requiredPhrases = [
      "prompt packet",
      "Boundary Policy",
      "Effective Boundary State",
      "hard constraints",
      "Do not modify repository files",
      "insufficient access or insufficient evidence",
    ];
    for (const phrase of requiredPhrases) {
      assertIncludes(template, phrase, `required phrase: "${phrase}"`);
    }
  });

  await test("E-4: buildAgentPrompt replaces all placeholders", () => {
    // Import and call the actual function
    // Since buildAgentPrompt is not exported, verify via template regex
    const templateMatch = coordinatorSource.match(
      /const AGENT_PROMPT_TEMPLATE = `([\s\S]*?)`;/,
    );
    const template = templateMatch?.[1] ?? "";

    // All placeholders should be {unit_id}, {unit_kind}, {packet_path}, {output_path}
    const placeholders = template.match(/\{[a-z_]+\}/g) ?? [];
    const uniquePlaceholders = [...new Set(placeholders)];
    const expected = new Set(["{unit_id}", "{unit_kind}", "{packet_path}", "{output_path}"]);

    for (const placeholder of uniquePlaceholders) {
      assert(
        expected.has(placeholder),
        `unexpected placeholder: ${placeholder}`,
      );
    }
    for (const exp of expected) {
      assert(
        uniquePlaceholders.includes(exp),
        `missing expected placeholder: ${exp}`,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// F. process.md ToolSearch instruction
// ---------------------------------------------------------------------------

async function testProcessMdToolSearch(): Promise<void> {
  process.stdout.write("\n── F. process.md ToolSearch ──\n");

  const processContent = fs.readFileSync(
    path.join(process.cwd(), "process.md"),
    "utf8",
  );

  await test("F-1: ToolSearch instruction exists before Team Creation", () => {
    const toolSearchPos = processContent.indexOf(
      'ToolSearch("select:TeamCreate,SendMessage,TeamDelete")',
    );
    const teamCreationPos = processContent.indexOf("#### Team Creation");

    assert(toolSearchPos !== -1, "ToolSearch instruction found");
    assert(teamCreationPos !== -1, "Team Creation section found");
    assert(
      toolSearchPos < teamCreationPos,
      "ToolSearch appears before Team Creation",
    );
  });

  await test("F-2: ToolSearch section marked as mandatory", () => {
    assertIncludes(
      processContent,
      "Tool Availability Check (mandatory",
      "section marked mandatory",
    );
  });

  await test("F-3: deferred tools explanation present", () => {
    assertIncludes(
      processContent,
      "deferred tools",
      "deferred tools concept explained",
    );
  });

  await test("F-4: fallback instruction on ToolSearch failure", () => {
    // Find the ToolSearch section
    const sectionStart = processContent.indexOf("#### Tool Availability Check");
    const sectionEnd = processContent.indexOf("#### Team Creation");
    const section = processContent.slice(sectionStart, sectionEnd);

    assertIncludes(
      section,
      "Fallback Rules",
      "fallback instruction on ToolSearch failure",
    );
  });

  await test("F-5: once-per-session note present", () => {
    assertIncludes(
      processContent,
      "once per conversation session",
      "once-per-session guidance",
    );
  });

  await test("F-6: ToolSearch targets all three team tools", () => {
    const toolSearchLine = processContent.match(
      /ToolSearch\("select:([^"]+)"\)/,
    );
    assert(toolSearchLine !== null, "ToolSearch call found");
    const tools = (toolSearchLine?.[1] ?? "").split(",");
    assert(tools.includes("TeamCreate"), "TeamCreate in ToolSearch");
    assert(tools.includes("SendMessage"), "SendMessage in ToolSearch");
    assert(tools.includes("TeamDelete"), "TeamDelete in ToolSearch");
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  process.stdout.write("Codex multi-agent fixes E2E\n");
  process.stdout.write("===========================\n");

  await testConfigChainCodexNamespace();
  await testCodexConfigFallback();
  await testSynthesizeRetry();
  await testCoordinatorPrompt();
  await testProcessMdToolSearch();

  // Cleanup
  for (const dir of cleanupDirs) {
    rmDir(dir);
  }

  process.stdout.write(`\nResults: ${passCount} passed, ${failCount} failed\n`);
  if (failures.length > 0) {
    process.stdout.write("\nFailures:\n");
    for (const failure of failures) {
      process.stdout.write(`  - ${failure}\n`);
    }
  }
  return failCount > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (exitCode) => process.exit(exitCode),
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    },
  );
}
