#!/usr/bin/env node

import path from "node:path";
import { pathToFileURL } from "node:url";
import { completeReviewSession } from "./complete-review-session.js";
import {
  executeReviewPromptExecution,
  type ReviewUnitExecutorConfig,
} from "./run-review-prompt-execution.js";
import { startReviewSession } from "./start-review-session.js";
import { generateReviewSessionId } from "../review/materializers.js";
import {
  fileExists,
  hasOptionFlag,
  readMultiOptionValuesFromArgv,
  readYamlDocument,
  readSingleOptionValueFromArgv,
} from "../review/review-artifact-utils.js";

type ExecutorRealization = "subagent" | "agent-teams" | "codex" | "mock";
type ExecutionRealization = "subagent" | "agent-teams";
type HostRuntime = "codex" | "claude";
interface OntoConfig {
  execution_realization?: string;
  host_runtime?: string;
  execution_mode?: string;
}

function requireString(
  value: string | undefined,
  optionName: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option --${optionName}`);
  }
  return value;
}

function packageManagerBin(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function resolveExecutorScript(realization: ExecutorRealization): string {
  if (realization === "subagent") {
    return "review:subagent-unit-executor";
  }
  if (realization === "agent-teams") {
    return "review:agent-teams-unit-executor";
  }
  if (realization === "codex") {
    return "review:codex-unit-executor";
  }
  return "review:mock-unit-executor";
}

function buildExecutorConfigFromRealization(
  realization: ExecutorRealization,
  hostRuntime?: HostRuntime,
): ReviewUnitExecutorConfig {
  const args = ["run", resolveExecutorScript(realization), "--"];
  if (realization === "subagent" && hostRuntime) {
    args.push("--host-runtime", hostRuntime);
  }
  if (realization === "agent-teams" && hostRuntime) {
    args.push("--host-runtime", hostRuntime);
  }
  return {
    bin: packageManagerBin(),
    args,
  };
}

function stripOptionsFromArgv(
  argv: string[],
  optionNames: string[],
  flagNames: string[] = [],
): string[] {
  const optionTokens = new Set(optionNames.map((optionName) => `--${optionName}`));
  const flagTokens = new Set(flagNames.map((flagName) => `--${flagName}`));
  const stripped: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (typeof token !== "string") {
      continue;
    }
    if (flagTokens.has(token)) {
      continue;
    }
    if (!optionTokens.has(token)) {
      stripped.push(token);
      continue;
    }

    const nextToken = argv[index + 1];
    if (typeof nextToken === "string" && !nextToken.startsWith("--")) {
      index += 1;
    }
  }

  return stripped;
}

function ensureSessionIdArg(argv: string[]): string[] {
  const sessionId = readSingleOptionValueFromArgv(argv, "session-id");
  if (typeof sessionId === "string" && sessionId.length > 0) {
    return argv;
  }
  return [...argv, "--session-id", generateReviewSessionId()];
}

function resolveExecutorConfig(
  argv: string[],
  executionRealization: ExecutionRealization,
  hostRuntime: HostRuntime,
  optionPrefix: "" | "synthesize-",
): ReviewUnitExecutorConfig {
  const optionPrefixLabel = optionPrefix.length > 0 ? optionPrefix : "";
  const explicitBin = readSingleOptionValueFromArgv(
    argv,
    `${optionPrefixLabel}executor-bin`,
  );
  const explicitArgs = readMultiOptionValuesFromArgv(
    argv,
    `${optionPrefixLabel}executor-arg`,
  );
  if (typeof explicitBin === "string" && explicitBin.length > 0) {
    return {
      bin: explicitBin,
      args: explicitArgs,
    };
  }

  const explicitRealization = readSingleOptionValueFromArgv(
    argv,
    `${optionPrefixLabel}executor-realization`,
  );
  if (
    explicitRealization === "subagent" ||
    explicitRealization === "agent-teams" ||
    explicitRealization === "codex" ||
    explicitRealization === "mock"
  ) {
    return buildExecutorConfigFromRealization(explicitRealization, hostRuntime);
  }

  if (executionRealization === "subagent" && hostRuntime === "codex") {
    return buildExecutorConfigFromRealization("subagent", "codex");
  }

  if (executionRealization === "subagent" && hostRuntime === "claude") {
    return buildExecutorConfigFromRealization("subagent", "claude");
  }

  if (executionRealization === "agent-teams" && hostRuntime === "claude") {
    return buildExecutorConfigFromRealization("agent-teams", "claude");
  }

  throw new Error(
    optionPrefix === "synthesize-"
      ? "No synthesize executor realization is available for the requested execution profile. Pass --synthesize-executor-realization, --synthesize-executor-bin, or choose a supported profile."
      : "No executor realization is available for the requested execution profile. Pass --executor-realization, --executor-bin, or choose a supported profile.",
  );
}

async function readOntoConfig(projectRoot: string): Promise<OntoConfig> {
  const configPath = path.join(projectRoot, ".onto", "config.yml");
  if (!(await fileExists(configPath))) {
    return {};
  }
  return readYamlDocument<OntoConfig>(configPath);
}

function normalizeExecutionRealizationValue(
  value: string | undefined,
): ExecutionRealization | undefined {
  if (value === undefined || value.length === 0) {
    return undefined;
  }
  if (value === "subagent" || value === "agent-teams") {
    return value;
  }
  if (value === "codex") {
    return "subagent";
  }
  throw new Error(`Invalid execution realization: ${value}`);
}

function normalizeHostRuntimeValue(
  value: string | undefined,
): HostRuntime | undefined {
  if (value === undefined || value.length === 0) {
    return undefined;
  }
  if (value === "codex" || value === "claude") {
    return value;
  }
  throw new Error(`Invalid host runtime: ${value}`);
}

function detectHostRuntimeFromEnvironment(): HostRuntime | undefined {
  if (process.env.CODEX_THREAD_ID || process.env.CODEX_CI) {
    return "codex";
  }
  if (
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS ||
    process.env.CLAUDE_PROJECT_DIR ||
    process.env.CLAUDECODE
  ) {
    return "claude";
  }
  return undefined;
}

function defaultExecutionRealizationForHostRuntime(
  hostRuntime: HostRuntime,
): ExecutionRealization {
  return hostRuntime === "codex" ? "subagent" : "agent-teams";
}

function resolveHostRuntimeAlias(argv: string[]): HostRuntime | undefined {
  if (hasOptionFlag(argv, "codex")) {
    return "codex";
  }
  if (hasOptionFlag(argv, "claude")) {
    return "claude";
  }
  return undefined;
}

function resolveExecutionRealization(
  argv: string[],
  ontoConfig: OntoConfig,
  hostRuntime: HostRuntime,
): ExecutionRealization {
  const explicitValue =
    readSingleOptionValueFromArgv(argv, "execution-realization") ??
    readSingleOptionValueFromArgv(argv, "execution-mode");
  const explicitNormalized = normalizeExecutionRealizationValue(explicitValue);
  if (explicitNormalized) {
    return explicitNormalized;
  }

  const configNormalized = normalizeExecutionRealizationValue(
    ontoConfig.execution_realization ?? ontoConfig.execution_mode,
  );
  return configNormalized ?? defaultExecutionRealizationForHostRuntime(hostRuntime);
}

function resolveHostRuntimeFromArgv(
  argv: string[],
  ontoConfig: OntoConfig,
): HostRuntime {
  const explicitNormalized = normalizeHostRuntimeValue(
    readSingleOptionValueFromArgv(argv, "host-runtime"),
  );
  if (explicitNormalized) {
    return explicitNormalized;
  }
  const aliasRuntime = resolveHostRuntimeAlias(argv);
  if (aliasRuntime) {
    return aliasRuntime;
  }
  const configNormalized = normalizeHostRuntimeValue(ontoConfig.host_runtime);
  if (configNormalized) {
    return configNormalized;
  }
  return detectHostRuntimeFromEnvironment() ?? "codex";
}

function appendCanonicalExecutionProfileArgs(
  argv: string[],
  executionRealization: ExecutionRealization,
  hostRuntime: HostRuntime,
): string[] {
  return [
    ...argv,
    "--execution-realization",
    executionRealization,
    "--host-runtime",
    hostRuntime,
  ];
}

export async function runReviewInvokeCli(argv: string[]): Promise<number> {
  const projectRoot = path.resolve(
    readSingleOptionValueFromArgv(argv, "project-root") ?? ".",
  );
  const ontoConfig = await readOntoConfig(projectRoot);
  const requestText =
    readSingleOptionValueFromArgv(argv, "request-text") ??
    readSingleOptionValueFromArgv(argv, "intent-summary");
  const hostRuntime = resolveHostRuntimeFromArgv(argv, ontoConfig);
  const executionRealization = resolveExecutionRealization(
    argv,
    ontoConfig,
    hostRuntime,
  );

  const invokeOnlyOptionNames = [
    "request-text",
    "execution-realization",
    "execution-mode",
    "host-runtime",
    "executor-realization",
    "executor-bin",
    "executor-arg",
    "synthesize-executor-realization",
    "synthesize-executor-bin",
    "synthesize-executor-arg",
  ];
  const invokeOnlyFlagNames = ["codex", "claude"];

  const startArgv = appendCanonicalExecutionProfileArgs(
    ensureSessionIdArg(
      stripOptionsFromArgv(argv, invokeOnlyOptionNames, invokeOnlyFlagNames),
    ),
    executionRealization,
    hostRuntime,
  );
  const startResult = await startReviewSession(startArgv);

  const resolvedProjectRoot = path.resolve(
    readSingleOptionValueFromArgv(startArgv, "project-root") ?? ".",
  );
  const sessionRoot = path.resolve(startResult.session_root);
  const resolvedRequestText = requireString(requestText, "request-text");
  const defaultExecutorConfig = resolveExecutorConfig(
    argv,
    executionRealization,
    hostRuntime,
    "",
  );
  const synthesizeExecutorConfig = resolveExecutorConfig(
    argv,
    executionRealization,
    hostRuntime,
    "synthesize-",
  );

  await executeReviewPromptExecution({
    projectRoot: resolvedProjectRoot,
    sessionRoot,
    defaultExecutorConfig,
    ...(synthesizeExecutorConfig.bin === defaultExecutorConfig.bin &&
    JSON.stringify(synthesizeExecutorConfig.args) ===
      JSON.stringify(defaultExecutorConfig.args)
      ? {}
      : { synthesizeExecutorConfig }),
  });

  await completeReviewSession([
    "--project-root",
    resolvedProjectRoot,
    "--session-root",
    sessionRoot,
    "--request-text",
    resolvedRequestText,
  ]);

  console.log(
    JSON.stringify(
      {
        session_root: sessionRoot,
        bounded_invoke_steps: [
          "review:start-session",
          "review:run-prompt-execution",
          "review:complete-session",
        ],
        executor_realization:
          defaultExecutorConfig.bin === packageManagerBin()
            ? defaultExecutorConfig.args[1] === "review:subagent-unit-executor"
              ? "subagent"
              : defaultExecutorConfig.args[1] === "review:codex-unit-executor"
              ? "codex"
              : defaultExecutorConfig.args[1] === "review:mock-unit-executor"
                ? "mock"
                : "custom"
            : "custom",
      },
      null,
      2,
    ),
  );
  return 0;
}

async function main(): Promise<number> {
  return runReviewInvokeCli(process.argv.slice(2));
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
