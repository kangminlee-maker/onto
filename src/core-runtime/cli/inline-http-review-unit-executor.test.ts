import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runInlineHttpReviewUnitExecutorCli } from "./inline-http-review-unit-executor.js";

let scratchDir: string;
let projectRoot: string;
let sessionRoot: string;
let ontoHome: string;
let savedHome: string | undefined;
let savedMock: string | undefined;
let consoleLogSpy: { restore: () => void; getOutput: () => string[] };

function captureConsoleLog(): typeof consoleLogSpy {
  const original = console.log;
  const captured: string[] = [];
  console.log = (...args: unknown[]) => {
    captured.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  };
  return {
    restore: () => {
      console.log = original;
    },
    getOutput: () => captured,
  };
}

beforeEach(() => {
  scratchDir = mkdtempSync(path.join(tmpdir(), "inline-http-exec-test-"));
  projectRoot = path.join(scratchDir, "project");
  sessionRoot = path.join(scratchDir, "session");
  ontoHome = path.join(scratchDir, ".onto");
  mkdirSync(projectRoot, { recursive: true });
  mkdirSync(sessionRoot, { recursive: true });
  mkdirSync(ontoHome, { recursive: true });

  savedHome = process.env.HOME;
  process.env.HOME = scratchDir;
  savedMock = process.env.ONTO_LLM_MOCK;
  process.env.ONTO_LLM_MOCK = "1";

  consoleLogSpy = captureConsoleLog();
});

afterEach(() => {
  consoleLogSpy.restore();
  if (savedHome === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = savedHome;
  }
  if (savedMock === undefined) {
    delete process.env.ONTO_LLM_MOCK;
  } else {
    process.env.ONTO_LLM_MOCK = savedMock;
  }
  rmSync(scratchDir, { recursive: true, force: true });
});

function writePacket(filename: string, content: string): string {
  const packetPath = path.join(sessionRoot, filename);
  writeFileSync(packetPath, content, "utf8");
  return packetPath;
}

const PANEL_REVIEW_PACKET = `# Panel Review Prompt Packet

You are a review lens. Inspect the target and produce findings.

## Materialized Input
\`\`\`
function add(a: number, b: number): number {
  return a + b;
}
\`\`\`

## Boundary Policy
- Filesystem: read-only
- Network: denied

## Required Output Sections
- Structural Inspection
- Findings
- Newly Learned
- Applied Learnings
- Domain Constraints Used
- Domain Context Assumptions
`;

describe("runInlineHttpReviewUnitExecutorCli — basic execution", () => {
  it("reads packet, calls mock LLM, writes output, prints JSON result", async () => {
    const packetPath = writePacket("lens-logic.packet.md", PANEL_REVIEW_PACKET);
    const outputPath = path.join(sessionRoot, "round1", "logic.md");

    const exitCode = await runInlineHttpReviewUnitExecutorCli([
      "--project-root", projectRoot,
      "--session-root", sessionRoot,
      "--onto-home", ontoHome,
      "--unit-id", "logic",
      "--unit-kind", "lens",
      "--packet-path", packetPath,
      "--output-path", outputPath,
    ]);

    expect(exitCode).toBe(0);

    const outputText = readFileSync(outputPath, "utf8");
    expect(outputText.length).toBeGreaterThan(0);

    const logs = consoleLogSpy.getOutput();
    expect(logs.length).toBeGreaterThan(0);
    const result = JSON.parse(logs.join(""));
    expect(result.unit_id).toBe("logic");
    expect(result.unit_kind).toBe("lens");
    expect(result.realization).toBe("ts_inline_http");
    expect(result.output_path).toBe(outputPath);
  });

  it("creates output directory if missing", async () => {
    const packetPath = writePacket("lens.packet.md", PANEL_REVIEW_PACKET);
    const outputPath = path.join(sessionRoot, "deeply", "nested", "round1", "logic.md");

    const exitCode = await runInlineHttpReviewUnitExecutorCli([
      "--project-root", projectRoot,
      "--session-root", sessionRoot,
      "--onto-home", ontoHome,
      "--unit-id", "logic",
      "--unit-kind", "lens",
      "--packet-path", packetPath,
      "--output-path", outputPath,
    ]);

    expect(exitCode).toBe(0);
    const outputText = readFileSync(outputPath, "utf8");
    expect(outputText.length).toBeGreaterThan(0);
  });

  it("respects --provider flag (anthropic explicit override)", async () => {
    const packetPath = writePacket("lens.packet.md", PANEL_REVIEW_PACKET);
    const outputPath = path.join(sessionRoot, "logic.md");

    // --tool-mode inline: these tests exercise provider override via the mock
    // provider, which doesn't exercise the tool-calling loop. Under the Phase
    // 3-2 default (--tool-mode auto) the executor would try native first and
    // require a resolved model id; inline keeps the test focused on host_runtime
    // propagation.
    const exitCode = await runInlineHttpReviewUnitExecutorCli([
      "--project-root", projectRoot,
      "--session-root", sessionRoot,
      "--onto-home", ontoHome,
      "--unit-id", "logic",
      "--unit-kind", "lens",
      "--packet-path", packetPath,
      "--output-path", outputPath,
      "--provider", "anthropic",
      "--tool-mode", "inline",
    ]);

    expect(exitCode).toBe(0);
    const result = JSON.parse(consoleLogSpy.getOutput().join(""));
    expect(result.host_runtime).toBe("anthropic");
  });

  it("respects --provider flag (litellm explicit override)", async () => {
    const packetPath = writePacket("lens.packet.md", PANEL_REVIEW_PACKET);
    const outputPath = path.join(sessionRoot, "logic.md");

    const exitCode = await runInlineHttpReviewUnitExecutorCli([
      "--project-root", projectRoot,
      "--session-root", sessionRoot,
      "--onto-home", ontoHome,
      "--unit-id", "logic",
      "--unit-kind", "lens",
      "--packet-path", packetPath,
      "--output-path", outputPath,
      "--provider", "litellm",
      "--tool-mode", "inline",
    ]);

    // Note: with mock, host_runtime reports per --provider flag, not actual mock target
    expect(exitCode).toBe(0);
    const result = JSON.parse(consoleLogSpy.getOutput().join(""));
    expect(result.host_runtime).toBe("litellm");
  });
});

describe("runInlineHttpReviewUnitExecutorCli — error cases", () => {
  it("rejects missing required flag --unit-id", async () => {
    const packetPath = writePacket("lens.packet.md", PANEL_REVIEW_PACKET);

    await expect(
      runInlineHttpReviewUnitExecutorCli([
        "--project-root", projectRoot,
        "--session-root", sessionRoot,
        "--unit-kind", "lens",
        "--packet-path", packetPath,
        "--output-path", path.join(sessionRoot, "out.md"),
      ]),
    ).rejects.toThrow(/--unit-id/);
  });

  it("rejects missing --packet-path", async () => {
    await expect(
      runInlineHttpReviewUnitExecutorCli([
        "--project-root", projectRoot,
        "--session-root", sessionRoot,
        "--unit-id", "logic",
        "--unit-kind", "lens",
        "--output-path", path.join(sessionRoot, "out.md"),
      ]),
    ).rejects.toThrow(/--packet-path/);
  });
});

describe("runInlineHttpReviewUnitExecutorCli — synthesize code-fence strip (Phase 3-4 A2)", () => {
  const SYNTHESIZE_PACKET = `# Synthesize Prompt Packet

You are the synthesize actor. Consolidate lens outputs.

## Participating Lens Outputs
(none for mock test)

## Boundary Policy
- Filesystem: read-only
- Network: denied

## Required Output Sections
- Consensus
- Conditional Consensus
- Disagreement
- Deliberation Decision
- Unique Finding Tagging
- Axiology Integration
- Newly Learned
- Degraded Lens Failures
`;

  it("baseline: synthesize output has no wrapping code fence", async () => {
    const packetPath = writePacket("synthesize.packet.md", SYNTHESIZE_PACKET);
    const outputPath = path.join(sessionRoot, "synthesize.md");

    const exitCode = await runInlineHttpReviewUnitExecutorCli([
      "--project-root", projectRoot,
      "--session-root", sessionRoot,
      "--onto-home", ontoHome,
      "--unit-id", "synthesize",
      "--unit-kind", "synthesize",
      "--packet-path", packetPath,
      "--output-path", outputPath,
      "--tool-mode", "inline",
    ]);

    expect(exitCode).toBe(0);
    const output = readFileSync(outputPath, "utf8");
    expect(output.startsWith("---\ndeliberation_status:")).toBe(true);
    expect(output.includes("```yaml")).toBe(false);
    expect(output.trimEnd().endsWith("```")).toBe(false);
  });

  it("strips ```yaml wrapping fence when the mock returns a wrapped synthesize response", async () => {
    const savedWrapHook = process.env.ONTO_LLM_MOCK_SYNTHESIZE_WRAP_FENCE;
    process.env.ONTO_LLM_MOCK_SYNTHESIZE_WRAP_FENCE = "1";
    try {
      const packetPath = writePacket("synthesize.packet.md", SYNTHESIZE_PACKET);
      const outputPath = path.join(sessionRoot, "synthesize.md");

      const exitCode = await runInlineHttpReviewUnitExecutorCli([
        "--project-root", projectRoot,
        "--session-root", sessionRoot,
        "--onto-home", ontoHome,
        "--unit-id", "synthesize",
        "--unit-kind", "synthesize",
        "--packet-path", packetPath,
        "--output-path", outputPath,
        "--tool-mode", "inline",
      ]);

      expect(exitCode).toBe(0);
      const output = readFileSync(outputPath, "utf8");
      // Even though the mock wrapped the body in ```yaml ... ```, the executor
      // must have stripped the outer fence before writing the canonical file.
      expect(output.startsWith("---\ndeliberation_status:")).toBe(true);
      expect(output.includes("```yaml")).toBe(false);
      expect(output.trimEnd().endsWith("```")).toBe(false);
      // The required section headings must still be present — strip must not
      // have damaged the markdown body.
      expect(output).toContain("## Consensus");
      expect(output).toContain("## Degraded Lens Failures");
    } finally {
      if (savedWrapHook === undefined) {
        delete process.env.ONTO_LLM_MOCK_SYNTHESIZE_WRAP_FENCE;
      } else {
        process.env.ONTO_LLM_MOCK_SYNTHESIZE_WRAP_FENCE = savedWrapHook;
      }
    }
  });
});

describe("runInlineHttpReviewUnitExecutorCli — embed flag", () => {
  it("--embed-domain-docs expands domain doc references in packet", async () => {
    const domainsDir = path.join(ontoHome, "domains", "test-domain");
    mkdirSync(domainsDir, { recursive: true });
    writeFileSync(
      path.join(domainsDir, "logic_rules.md"),
      "## Inline Test Logic\nRule: test rule\n",
      "utf8",
    );

    const packetWithRef = `${PANEL_REVIEW_PACKET}

## Domain Documents
- Primary: ~/.onto/domains/test-domain/logic_rules.md
`;
    const packetPath = writePacket("lens.packet.md", packetWithRef);
    const outputPath = path.join(sessionRoot, "logic.md");

    const exitCode = await runInlineHttpReviewUnitExecutorCli([
      "--project-root", projectRoot,
      "--session-root", sessionRoot,
      "--onto-home", ontoHome,
      "--unit-id", "logic",
      "--unit-kind", "lens",
      "--packet-path", packetPath,
      "--output-path", outputPath,
      "--embed-domain-docs",
    ]);

    expect(exitCode).toBe(0);
    // Mock provider doesn't echo prompt, but successful exit + output written
    // confirms the embedding pipeline ran without error.
    const output = readFileSync(outputPath, "utf8");
    expect(output.length).toBeGreaterThan(0);
  });
});
