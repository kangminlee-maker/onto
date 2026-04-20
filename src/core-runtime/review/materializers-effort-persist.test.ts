/**
 * Effort persist (Option A) — bootstrap 시점에 OntoConfig 로부터 resolved_llm_plan
 * 을 session-metadata.yaml 에 durable 기록하는 동작 검증.
 *
 * Source authority: development-records/plan (없음 — memory
 * project_framework_v1_session_20260420.md backlog [4]).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { parse as parseYaml } from "yaml";
import type { ReviewSessionMetadata } from "./artifact-types.js";
import { bootstrapInvocationBindingArtifacts } from "./materializers.js";

async function readYaml<T>(p: string): Promise<T> {
  const text = await fs.readFile(p, "utf8");
  return parseYaml(text) as T;
}

async function makeTmpProject(): Promise<string> {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "onto-effort-persist-"));
  return base;
}

async function writeConfig(
  projectRoot: string,
  yaml: string,
): Promise<void> {
  const dir = path.join(projectRoot, ".onto");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "config.yml"), yaml, "utf8");
}

function commonParams(projectRoot: string) {
  return {
    projectRoot,
    requestedTarget: "src/foo.ts",
    targetScopeKind: "file" as const,
    resolvedTargetRefs: [path.join(projectRoot, "src/foo.ts")],
    domainFinalValue: "software-engineering",
    domainSelectionMode: "auto",
    executionRealization: "subagent" as const,
    hostRuntime: "codex" as const,
    reviewMode: "core-axis" as const,
    resolvedLensIds: ["structure"],
  };
}

describe("bootstrapInvocationBindingArtifacts — resolved_llm_plan persistence", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await makeTmpProject();
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("persists resolved_llm_plan from OntoConfig top-level model + codex.effort", async () => {
    await writeConfig(
      tmp,
      "model: gpt-5.4\ncodex:\n  effort: high\n",
    );

    const { sessionMetadataPath } =
      await bootstrapInvocationBindingArtifacts(commonParams(tmp));

    const md = await readYaml<ReviewSessionMetadata>(sessionMetadataPath);
    expect(md.resolved_llm_plan).toBeDefined();
    expect(md.resolved_llm_plan?.model).toBe("gpt-5.4");
    expect(md.resolved_llm_plan?.reasoning_effort).toBe("high");
  });

  it("persists provider when external_http_provider is set", async () => {
    await writeConfig(
      tmp,
      "external_http_provider: anthropic\nanthropic:\n  model: claude-sonnet-4-6\n",
    );

    const { sessionMetadataPath } =
      await bootstrapInvocationBindingArtifacts(commonParams(tmp));

    const md = await readYaml<ReviewSessionMetadata>(sessionMetadataPath);
    expect(md.resolved_llm_plan?.provider).toBe("anthropic");
    expect(md.resolved_llm_plan?.model).toBe("claude-sonnet-4-6");
  });

  it("omits resolved_llm_plan field when config.yml is missing", async () => {
    const { sessionMetadataPath } =
      await bootstrapInvocationBindingArtifacts(commonParams(tmp));

    const md = await readYaml<ReviewSessionMetadata>(sessionMetadataPath);
    expect(md.resolved_llm_plan).toBeUndefined();
  });

  it("omits resolved_llm_plan field when config.yml has no LLM fields", async () => {
    await writeConfig(tmp, "execution_topology_priority:\n  - cc-main-agent-subagent\n");

    const { sessionMetadataPath } =
      await bootstrapInvocationBindingArtifacts(commonParams(tmp));

    const md = await readYaml<ReviewSessionMetadata>(sessionMetadataPath);
    expect(md.resolved_llm_plan).toBeUndefined();
  });
});
