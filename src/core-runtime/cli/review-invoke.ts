#!/usr/bin/env node

import { execSync } from "node:child_process";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { completeReviewSession } from "./complete-review-session.js";
import {
  executeReviewPromptExecution,
  type ReviewUnitExecutorConfig,
} from "./run-review-prompt-execution.js";
import type { PrepareOnlyResult } from "../review/artifact-types.js";
import { startReviewSession } from "./start-review-session.js";
import { generateReviewSessionId } from "../review/materializers.js";
import {
  fileExists,
  hasOptionFlag,
  normalizeDomainValue,
  readMultiOptionValuesFromArgv,
  readYamlDocument,
  readSingleOptionValueFromArgv,
} from "../review/review-artifact-utils.js";
import { printOntoReleaseChannelNotice } from "../release-channel/release-channel.js";
import { resolveOntoHome } from "../discovery/onto-home.js";
import { resolveConfigChain, type OntoConfig } from "../discovery/config-chain.js";

type ExecutorRealization = "subagent" | "agent-teams" | "codex" | "api" | "mock";
type ExecutionRealization = "subagent" | "agent-teams";
type HostRuntime = "codex" | "claude";
type ReviewTargetScopeKind = "file" | "directory" | "bundle";
type ReviewMode = "light" | "full";
type BoundaryDecisionAction = "approve_external_boundary" | "rerun_target" | "cancel";

// PrepareOnlyResult is imported from artifact-types.ts (canonical type authority)
// OntoConfig is imported from discovery/config-chain.ts (single source of truth)

interface HostFacingPositionals {
  target?: string;
  requestedDomainToken?: string;
  intentText?: string;
}

interface ResolvedReviewInvokeInputs {
  requestedTarget: string;
  targetPath: string;
  resolvedTargetRefs: string[];
  targetScopeKind: ReviewTargetScopeKind;
  materializedKind:
    | "single_text"
    | "directory_listing"
    | "bundle_member_texts";
  requestText: string;
  requestedDomainToken: string;
  domainRecommendation: string;
  domainFinalValue: string;
  domainSelectionMode: string;
  domainSelectionRequired: boolean;
  bundleKind?: string;
  reviewMode: ReviewMode;
  reviewModeRecommendation: ReviewMode;
  resolvedLensIds: string[];
  alwaysIncludeLensIds: string[];
  recommendedLensIds: string[];
  rationale: string[];
  filesystemAllowedRoots: string[];
}

interface ReviewInvokeRouteSummary {
  combined_entrypoint: "review:invoke";
  bounded_invoke_steps: string[];
  execution_realization: ExecutionRealization;
  host_runtime: HostRuntime;
  review_mode: ReviewMode;
  max_concurrent_lenses: number;
  concurrency_strategy: "bounded_parallel";
  synthesize_waits_for_all_lenses: true;
}

const FULL_REVIEW_LENS_IDS = [
  "onto_logic",
  "onto_structure",
  "onto_dependency",
  "onto_semantics",
  "onto_pragmatics",
  "onto_evolution",
  "onto_coverage",
  "onto_conciseness",
  "onto_axiology",
] as const;

const LIGHT_REVIEW_LENS_IDS = [
  "onto_logic",
  "onto_pragmatics",
  "onto_evolution",
  "onto_axiology",
] as const;

const KNOWN_PASSTHROUGH_OPTION_NAMES = [
  "project-root",
  "onto-home",
  "plugin-root",
  "session-id",
  "requested-target",
  "requested-domain-token",
  "entrypoint",
  "target-scope-kind",
  "primary-ref",
  "member-ref",
  "bundle-kind",
  "intent-summary",
  "domain-recommendation",
  "domain-selection-required",
  "review-mode-recommendation",
  "always-include-lens-id",
  "recommended-lens-id",
  "rationale",
  "ambiguity-note",
  "resolved-target-ref",
  "domain-final-value",
  "domain-selection-mode",
  "execution-realization",
  "execution-mode",
  "host-runtime",
  "review-mode",
  "lens-id",
  "binding-note",
  "web-research-policy",
  "repo-exploration-policy",
  "recursive-reference-expansion-policy",
  "filesystem-allowed-root",
  "materialized-kind",
  "materialized-ref",
  "system-purpose-ref",
  "domain-context-ref",
  "learning-context-ref",
  "role-definition-ref",
  "execution-rule-ref",
  "excluded-name",
  "max-listing-depth",
  "max-listing-entries",
  "max-embed-lines",
] as const;

const KNOWN_PASSTHROUGH_FLAG_NAMES = ["codex", "claude"] as const;

const KNOWN_INVOKE_ONLY_OPTION_NAMES = [
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
  "max-concurrent-lenses",
  "filesystem-boundary-decision",
  "diff-range",
] as const;

const KNOWN_INVOKE_ONLY_FLAG_NAMES = ["codex", "claude", "prepare-only"] as const;

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

// Single source for executor script names. Used by both npm-run and direct-path resolution.
const EXECUTOR_SCRIPT_FILENAMES: Record<ExecutorRealization, string> = {
  subagent: "subagent-review-unit-executor",
  "agent-teams": "agent-teams-review-unit-executor",
  codex: "codex-review-unit-executor",
  api: "api-review-unit-executor",
  mock: "mock-review-unit-executor",
};

const EXECUTOR_NPM_SCRIPTS: Record<ExecutorRealization, string> = {
  subagent: "review:subagent-unit-executor",
  "agent-teams": "review:agent-teams-unit-executor",
  codex: "review:codex-unit-executor",
  api: "review:api-unit-executor",
  mock: "review:mock-unit-executor",
};

function resolveExecutorScript(realization: ExecutorRealization): string {
  return EXECUTOR_NPM_SCRIPTS[realization] ?? "review:mock-unit-executor";
}

function resolveDirectExecutorPath(
  realization: ExecutorRealization,
  ontoHome: string,
): { bin: string; scriptPath: string } | null {
  const filename = EXECUTOR_SCRIPT_FILENAMES[realization];
  if (!filename) return null;

  // Prefer compiled dist/ if available
  const distPath = path.join(
    ontoHome, "dist", "core-runtime", "cli", `${filename}.js`,
  );
  if (fsSync.existsSync(distPath)) {
    return { bin: "node", scriptPath: distPath };
  }

  // Dev mode: use tsx with source
  const srcPath = path.join(
    ontoHome, "src", "core-runtime", "cli", `${filename}.ts`,
  );
  const tsxBin = path.join(ontoHome, "node_modules", ".bin", "tsx");
  if (fsSync.existsSync(srcPath) && fsSync.existsSync(tsxBin)) {
    return { bin: tsxBin, scriptPath: srcPath };
  }

  return null;
}

function buildExecutorConfigFromRealization(
  realization: ExecutorRealization,
  hostRuntime?: HostRuntime,
  ontoHome?: string,
): ReviewUnitExecutorConfig {
  // When ontoHome is available, use direct script paths (global CLI path)
  if (typeof ontoHome === "string" && ontoHome.length > 0) {
    const direct = resolveDirectExecutorPath(realization, ontoHome);
    if (direct) {
      const args = [direct.scriptPath, "--"];
      if ((realization === "subagent" || realization === "agent-teams") && hostRuntime) {
        args.push("--host-runtime", hostRuntime);
      }
      return { bin: direct.bin, args };
    }
  }

  // Legacy npm run fallback (when invoked via npm run from onto repo)
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

function splitArgvIntoOptionsAndPositionals(
  argv: string[],
  optionNames: string[],
  flagNames: string[] = [],
): {
  optionTokens: string[];
  positionals: string[];
} {
  const optionTokens = new Set(optionNames.map((optionName) => `--${optionName}`));
  const flagTokens = new Set(flagNames.map((flagName) => `--${flagName}`));
  const preservedOptions: string[] = [];
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (typeof token !== "string") {
      continue;
    }
    if (token === "--") {
      continue;
    }
    if (flagTokens.has(token)) {
      preservedOptions.push(token);
      continue;
    }
    if (optionTokens.has(token)) {
      preservedOptions.push(token);
      const nextToken = argv[index + 1];
      if (typeof nextToken === "string" && !nextToken.startsWith("--")) {
        preservedOptions.push(nextToken);
        index += 1;
      }
      continue;
    }
    positionals.push(token);
  }

  return {
    optionTokens: preservedOptions,
    positionals,
  };
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
  ontoConfig?: OntoConfig,
  ontoHome?: string,
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
    explicitRealization === "api" ||
    explicitRealization === "mock"
  ) {
    return buildExecutorConfigFromRealization(explicitRealization, hostRuntime, ontoHome);
  }

  const configRealization = ontoConfig?.executor_realization;
  if (
    configRealization === "subagent" ||
    configRealization === "agent-teams" ||
    configRealization === "codex" ||
    configRealization === "api" ||
    configRealization === "mock"
  ) {
    return buildExecutorConfigFromRealization(configRealization as ExecutorRealization, hostRuntime, ontoHome);
  }

  if (executionRealization === "subagent" && hostRuntime === "codex") {
    return buildExecutorConfigFromRealization("subagent", "codex", ontoHome);
  }

  if (executionRealization === "subagent" && hostRuntime === "claude") {
    return buildExecutorConfigFromRealization("subagent", "claude", ontoHome);
  }

  if (executionRealization === "agent-teams" && hostRuntime === "claude") {
    return buildExecutorConfigFromRealization("agent-teams", "claude", ontoHome);
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
  const raw = await readYamlDocument<Record<string, unknown>>(configPath);
  if (raw === null || typeof raw !== "object") {
    console.warn(`[onto] Warning: ${configPath} is not a valid YAML object. Using defaults.`);
    return {};
  }
  return raw as OntoConfig;
}

function parseHostFacingPositionals(positionals: string[]): HostFacingPositionals {
  if (positionals.length === 0) {
    return {};
  }

  const [target, second, ...rest] = positionals;
  if (typeof target !== "string" || target.length === 0) {
    return {};
  }

  if (typeof second === "string" && second.startsWith("@")) {
    return {
      target,
      requestedDomainToken: second,
      intentText: rest.join(" ").trim(),
    };
  }

  return {
    target,
    intentText: [second, ...rest].filter((value) => typeof value === "string").join(" ").trim(),
  };
}

function isPathInsideRoot(candidatePath: string, rootPath: string): boolean {
  let resolvedCandidate: string;
  let resolvedRoot: string;
  try {
    resolvedCandidate = fsSync.realpathSync(candidatePath);
    resolvedRoot = fsSync.realpathSync(rootPath);
  } catch {
    resolvedCandidate = path.resolve(candidatePath);
    resolvedRoot = path.resolve(rootPath);
  }
  const relative = path.relative(resolvedRoot, resolvedCandidate);
  if (relative === "") {
    return true;
  }
  if (relative.startsWith("..")) {
    return false;
  }
  return !path.isAbsolute(relative);
}

function normalizeFilesystemAllowedRoot(
  root: string,
  defaultProjectRoot: string,
): string {
  if (path.isAbsolute(root)) {
    return path.resolve(root);
  }
  return path.resolve(defaultProjectRoot, root);
}

function normalizeFilesystemAllowedRoots(
  filesystemAllowedRoots: string[],
  defaultProjectRoot: string,
): string[] {
  const resolved = filesystemAllowedRoots.length > 0
    ? filesystemAllowedRoots.map((root) => normalizeFilesystemAllowedRoot(
      root,
      defaultProjectRoot,
    ))
    : [path.resolve(defaultProjectRoot)];
  const deduped: string[] = [];
  for (const root of resolved) {
    if (!deduped.includes(root)) {
      deduped.push(root);
    }
  }
  return deduped;
}

function isInsideAnyDeclaredFilesystemRoot(
  targetPath: string,
  allowedRoots: string[],
): boolean {
  return allowedRoots.some((allowedRoot) => isPathInsideRoot(targetPath, allowedRoot));
}

function deriveFilesystemBoundaryFromTarget(
  targetPath: string,
  targetScopeKind: ReviewTargetScopeKind,
): string {
  return targetScopeKind === "file"
    ? path.dirname(targetPath)
    : targetPath;
}

async function promptForFilesystemBoundaryDecision(
  requestedTarget: string,
  absoluteTargetPath: string,
  projectRoot: string,
): Promise<{
  action: BoundaryDecisionAction;
}> {
  const promptText = [
    "Requested review target is outside project root.",
    `project-root: ${projectRoot}`,
    `requested target: ${requestedTarget}`,
    `resolved absolute target: ${absoluteTargetPath}`,
    "This target is outside the default filesystem boundary and needs an explicit decision.",
    "1) Continue with this exact target and approve an explicit filesystem boundary.",
    "2) Cancel and rerun using a project-relative target path.",
    "3) Cancel and stop execution.",
    "Enter 1, 2, or 3:",
  ].join("\n");

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    while (true) {
      const answer = (await readline.question(`${promptText}\n> `)).trim();
      if (answer === "1" || /^(approve|yes|y)$/i.test(answer)) {
        return {
          action: "approve_external_boundary",
        };
      }
      if (answer === "2") {
        return { action: "rerun_target" };
      }
      if (answer === "3" || /^(cancel|no|n)$/i.test(answer)) {
        return { action: "cancel" };
      }
      console.error(`Invalid boundary decision: ${answer}. Enter 1, 2, or 3.`);
    }
  } finally {
    readline.close();
  }
}

function parseFilesystemBoundaryDecision(
  argv: string[],
): BoundaryDecisionAction | undefined {
  const rawDecision = readSingleOptionValueFromArgv(
    argv,
    "filesystem-boundary-decision",
  );
  const decision = typeof rawDecision === "string" ? rawDecision.toLowerCase() : "";
  if (decision === "approve" || decision === "approve_external_boundary") {
    return "approve_external_boundary";
  }
  if (decision === "rerun" || decision === "rerun_target") {
    return "rerun_target";
  }
  if (decision === "cancel") {
    return "cancel";
  }
  if (decision.length > 0) {
    throw new Error(
      `Invalid --filesystem-boundary-decision value: ${rawDecision}. Use approve, rerun, or cancel.`,
    );
  }
  return undefined;
}

function normalizeDomainToken(domainValue: string): string | null {
  const trimmed = domainValue.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (["-", "@-", "none"].includes(trimmed)) {
    return "@-";
  }
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function collectConfiguredDomainTokens(ontoConfig: OntoConfig): string[] {
  const collected: string[] = [];
  const pushToken = (domainValue: string | undefined): void => {
    if (typeof domainValue !== "string") {
      return;
    }
    const normalized = normalizeDomainToken(domainValue);
    if (!normalized || collected.includes(normalized)) {
      return;
    }
    collected.push(normalized);
  };
  const pushTokenList = (domainValues: string[] | string | undefined): void => {
    if (Array.isArray(domainValues)) {
      for (const domainValue of domainValues) {
        pushToken(domainValue);
      }
      return;
    }
    if (typeof domainValues === "string") {
      const splitValues = domainValues.includes(",")
        ? domainValues.split(",")
        : [domainValues];
      for (const domainValue of splitValues) {
        pushToken(domainValue);
      }
    }
  };

  pushToken(ontoConfig.domain);
  pushTokenList(ontoConfig.secondary_domains);
  pushTokenList(ontoConfig.domains);
  return collected;
}

async function promptForDomainSelection(
  configuredDomainTokens: string[],
): Promise<string> {
  const optionTokens = configuredDomainTokens.includes("@-")
    ? [...configuredDomainTokens]
    : [...configuredDomainTokens, "@-"];
  const optionLines = optionTokens.map(
    (domainToken, index) => `${index + 1}. ${domainToken}`,
  );
  const promptText = [
    "Multiple configured domains are available for this review.",
    "Select a domain token for this session:",
    ...optionLines,
    "Enter a number or domain token:",
  ].join("\n");

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    while (true) {
      const answer = (await readline.question(`${promptText}\n> `)).trim();
      if (answer.length === 0) {
        continue;
      }
      const numericIndex = Number.parseInt(answer, 10);
      if (Number.isFinite(numericIndex)) {
        const selectedToken = optionTokens[numericIndex - 1];
        if (selectedToken) {
          return selectedToken;
        }
      }
      const normalizedAnswer = normalizeDomainToken(answer);
      if (normalizedAnswer && optionTokens.includes(normalizedAnswer)) {
        return normalizedAnswer;
      }
      console.error(
        `Invalid domain selection: ${answer}. Choose one of ${optionTokens.join(", ")}`,
      );
    }
  } finally {
    readline.close();
  }
}

async function resolveDomainSelection(
  requestedDomainToken: string,
  ontoConfig: OntoConfig,
): Promise<{
  domainRecommendation: string;
  domainFinalValue: string;
  domainSelectionMode: string;
  domainSelectionRequired: boolean;
}> {
  if (requestedDomainToken.length > 0) {
    return {
      domainRecommendation: requestedDomainToken,
      domainFinalValue: normalizeDomainValue(requestedDomainToken),
      domainSelectionMode: "explicit_token",
      domainSelectionRequired: false,
    };
  }

  const configuredDomainTokens = collectConfiguredDomainTokens(ontoConfig);
  if (configuredDomainTokens.length === 0) {
    return {
      domainRecommendation: "@-",
      domainFinalValue: "none",
      domainSelectionMode: "no_domain_default",
      domainSelectionRequired: false,
    };
  }

  if (configuredDomainTokens.length === 1) {
    const selectedToken = configuredDomainTokens[0]!;
    return {
      domainRecommendation: selectedToken,
      domainFinalValue: normalizeDomainValue(selectedToken),
      domainSelectionMode: "project_default",
      domainSelectionRequired: false,
    };
  }

  const domainRecommendation = configuredDomainTokens[0]!;
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      [
        "Multiple configured domains are available, but interactive domain selection is unavailable in this non-interactive environment.",
        `Configured domains: ${configuredDomainTokens.join(", ")}`,
        "Pass an explicit domain token such as `@ontology` or `@-`.",
      ].join("\n"),
    );
  }

  const selectedToken = await promptForDomainSelection(configuredDomainTokens);
  return {
    domainRecommendation,
    domainFinalValue: normalizeDomainValue(selectedToken),
    domainSelectionMode: "interactive_selection",
    domainSelectionRequired: true,
  };
}

function resolveReviewMode(argv: string[]): ReviewMode {
  const explicitValue = readSingleOptionValueFromArgv(argv, "review-mode");
  if (explicitValue === "light" || explicitValue === "full") {
    return explicitValue;
  }
  return "full";
}

function resolveLensDefaultsForReviewMode(reviewMode: ReviewMode): {
  resolvedLensIds: string[];
  alwaysIncludeLensIds: string[];
  recommendedLensIds: string[];
  rationale: string[];
} {
  if (reviewMode === "light") {
    return {
      resolvedLensIds: [...LIGHT_REVIEW_LENS_IDS],
      alwaysIncludeLensIds: ["onto_axiology"],
      recommendedLensIds: ["onto_logic", "onto_pragmatics", "onto_evolution"],
      rationale: [
        "host-facing positional invoke currently defaults light review to logic, pragmatics, evolution, and axiology.",
      ],
    };
  }

  return {
    resolvedLensIds: [...FULL_REVIEW_LENS_IDS],
    alwaysIncludeLensIds: ["onto_axiology"],
    recommendedLensIds: [...FULL_REVIEW_LENS_IDS],
    rationale: [
      "host-facing positional invoke currently defaults to full 9-lens review until interactive interpretation is productized.",
    ],
  };
}

async function resolveTargetInput(
  projectRoot: string,
  requestedTarget: string,
  explicitFilesystemAllowedRoots: string[],
  argv: string[],
): Promise<{
  absoluteTargetPath: string;
  targetScopeKind: ReviewTargetScopeKind;
  materializedKind: "single_text" | "directory_listing";
  filesystemAllowedRoots: string[];
}> {
  const absoluteTargetPath = path.resolve(projectRoot, requestedTarget);
  const declaredFilesystemAllowedRoots = normalizeFilesystemAllowedRoots(
    explicitFilesystemAllowedRoots,
    projectRoot,
  );
  const targetStats = await fs.stat(absoluteTargetPath);
  const targetScopeKind = targetStats.isDirectory() ? "directory" : "file";
  const materializedKind = targetStats.isDirectory()
    ? "directory_listing"
    : "single_text";
  const derivedBoundaryRoot = deriveFilesystemBoundaryFromTarget(
    absoluteTargetPath,
    targetScopeKind,
  );

  if (
    !isInsideAnyDeclaredFilesystemRoot(
      absoluteTargetPath,
      declaredFilesystemAllowedRoots,
    )
  ) {
    const nonInteractiveDecision = parseFilesystemBoundaryDecision(argv);
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      if (nonInteractiveDecision === "approve_external_boundary") {
        if (!declaredFilesystemAllowedRoots.includes(derivedBoundaryRoot)) {
          declaredFilesystemAllowedRoots.push(derivedBoundaryRoot);
        }
        return {
          absoluteTargetPath,
          targetScopeKind,
          materializedKind,
          filesystemAllowedRoots: declaredFilesystemAllowedRoots,
        };
      }
      if (nonInteractiveDecision === "rerun_target") {
        throw new Error(
          [
            "Please rerun review using a repo-relative target",
            `within ${projectRoot}, for example: ${path.relative(projectRoot, absoluteTargetPath)}`,
            "or pass --filesystem-boundary-decision=rerun_target with corrected target.",
          ].join("\n"),
        );
      }
      if (nonInteractiveDecision === "cancel") {
        throw new Error(
          [
            "Review canceled by user decision.",
            "Re-run with an alternative target or explicit boundary decision.",
          ].join("\n"),
        );
      }
      console.error(
        [
          "[onto] Auto-approving external filesystem boundary:",
          `  project-root: ${projectRoot}`,
          `  resolved target: ${absoluteTargetPath}`,
          `  approved root: ${derivedBoundaryRoot}`,
          "  (pass --filesystem-boundary-decision cancel to prevent this)",
        ].join("\n"),
      );
      if (!declaredFilesystemAllowedRoots.includes(derivedBoundaryRoot)) {
        declaredFilesystemAllowedRoots.push(derivedBoundaryRoot);
      }
      return {
        absoluteTargetPath,
        targetScopeKind,
        materializedKind,
        filesystemAllowedRoots: declaredFilesystemAllowedRoots,
      };
    }
    const boundaryDecision = await promptForFilesystemBoundaryDecision(
      requestedTarget,
      absoluteTargetPath,
      projectRoot,
    );
    if (boundaryDecision.action === "rerun_target") {
      throw new Error(
        [
          "Please rerun review using a repo-relative target",
          `within ${projectRoot}, for example: ${path.relative(projectRoot, absoluteTargetPath)}`,
        ].join("\n"),
      );
    }
    if (boundaryDecision.action === "cancel") {
      throw new Error(
        [
          "Review canceled by user decision.",
          "If you want to review this target, choose option 1 in an interactive run.",
        ].join("\n"),
      );
    }
    if (!declaredFilesystemAllowedRoots.includes(derivedBoundaryRoot)) {
      declaredFilesystemAllowedRoots.push(derivedBoundaryRoot);
    }
  }

  if (targetStats.isDirectory()) {
    return {
      absoluteTargetPath,
      targetScopeKind,
      materializedKind,
      filesystemAllowedRoots: declaredFilesystemAllowedRoots,
    };
  }
  return {
    absoluteTargetPath,
    targetScopeKind,
    materializedKind,
    filesystemAllowedRoots: declaredFilesystemAllowedRoots,
  };
}

async function resolveReviewInvokeInputs(
  argv: string[],
  ontoConfig: OntoConfig,
  projectRoot: string,
): Promise<ResolvedReviewInvokeInputs> {
  const parsedPositionals = parseHostFacingPositionals(
    splitArgvIntoOptionsAndPositionals(
      argv,
      [...KNOWN_INVOKE_ONLY_OPTION_NAMES, ...KNOWN_PASSTHROUGH_OPTION_NAMES],
      [...KNOWN_INVOKE_ONLY_FLAG_NAMES, ...KNOWN_PASSTHROUGH_FLAG_NAMES],
    ).positionals,
  );

  const explicitRequestedTarget = readSingleOptionValueFromArgv(argv, "requested-target");
  const explicitTargetScopeKind = readSingleOptionValueFromArgv(argv, "target-scope-kind");
  const explicitPrimaryRef = readSingleOptionValueFromArgv(argv, "primary-ref");
  const explicitMemberRefs = readMultiOptionValuesFromArgv(argv, "member-ref");
  const explicitBundleKind = readSingleOptionValueFromArgv(argv, "bundle-kind");
  const explicitFilesystemAllowedRoots = readMultiOptionValuesFromArgv(
    argv,
    "filesystem-allowed-root",
  );
  const requestedTarget = explicitRequestedTarget ?? parsedPositionals.target;
  const bundleRequested =
    explicitTargetScopeKind === "bundle" || explicitMemberRefs.length > 0;
  if (
    !bundleRequested &&
    (typeof requestedTarget !== "string" || requestedTarget.length === 0)
  ) {
    throw new Error(
      "Missing review target. Use `npm run review:invoke -- <target> \"<intent>\"` or pass --requested-target.",
    );
  }

  const MAX_REQUEST_TEXT_LENGTH = 2000;
  let requestText =
    readSingleOptionValueFromArgv(argv, "request-text") ??
    readSingleOptionValueFromArgv(argv, "intent-summary") ??
    parsedPositionals.intentText;
  if (typeof requestText !== "string" || requestText.length === 0) {
    throw new Error(
      "Missing review intent. Use `npm run review:invoke -- <target> \"<intent>\"` or pass --request-text.",
    );
  }
  if (requestText.length > MAX_REQUEST_TEXT_LENGTH) {
    console.warn(
      `[onto] Request text truncated from ${requestText.length} to ${MAX_REQUEST_TEXT_LENGTH} characters.`,
    );
    requestText = requestText.slice(0, MAX_REQUEST_TEXT_LENGTH);
  }

  const requestedDomainToken =
    readSingleOptionValueFromArgv(argv, "requested-domain-token") ??
    parsedPositionals.requestedDomainToken ??
    "";
  const resolvedDomainSelection = await resolveDomainSelection(
    requestedDomainToken,
    ontoConfig,
  );

  const reviewMode = resolveReviewMode(argv);
  const explicitLensIds = readMultiOptionValuesFromArgv(argv, "lens-id");
  const lensDefaults = resolveLensDefaultsForReviewMode(reviewMode);
  const resolvedLensIds = explicitLensIds.length > 0
    ? explicitLensIds
    : lensDefaults.resolvedLensIds;
  const diffRange = readSingleOptionValueFromArgv(argv, "diff-range");

  let absoluteTargetPath = "";
  let targetScopeKind: ReviewTargetScopeKind;
  let materializedKind: "single_text" | "directory_listing" | "bundle_member_texts";
  let resolvedTargetRefs: string[];
  let filesystemAllowedRoots: string[] = normalizeFilesystemAllowedRoots(
    explicitFilesystemAllowedRoots,
    projectRoot,
  );
  let bundleKind: string | undefined;

  if (typeof diffRange === "string" && diffRange.length > 0) {
    if (!/^[a-zA-Z0-9_.\/\-~^@{}:]+(?:\.\.[a-zA-Z0-9_.\/\-~^@{}:]+)?$/.test(diffRange)) {
      throw new Error(
        `Invalid --diff-range value: ${diffRange}. Expected a git ref range like "abc123..def456" or "HEAD~3".`,
      );
    }
    const diffTargetDir = typeof requestedTarget === "string" && requestedTarget.length > 0
      ? path.resolve(projectRoot, requestedTarget)
      : projectRoot;
    let diffOutput: string;
    try {
      diffOutput = execSync(`git diff ${diffRange}`, {
        cwd: diffTargetDir,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (gitError: unknown) {
      const gitMessage = gitError instanceof Error ? gitError.message : String(gitError);
      if (gitMessage.includes("Not a git repository") || gitMessage.includes("not a git repository")) {
        throw new Error(
          `--diff-range requires a git repository. ${diffTargetDir} is not a git repository.`,
        );
      }
      if (gitMessage.includes("unknown revision")) {
        throw new Error(
          `Invalid git revision in --diff-range "${diffRange}". Commit not found in ${diffTargetDir}.`,
        );
      }
      throw new Error(
        `git diff failed in ${diffTargetDir}: ${gitMessage.split("\n")[0]}`,
      );
    }
    if (diffOutput.trim().length === 0) {
      throw new Error(`git diff ${diffRange} produced empty output in ${diffTargetDir}`);
    }
    const sessionId = readSingleOptionValueFromArgv(argv, "session-id") ?? generateReviewSessionId();
    const diffFilePath = path.join(projectRoot, ".onto", "review", sessionId, "diff-target.patch");
    await fs.mkdir(path.dirname(diffFilePath), { recursive: true });
    await fs.writeFile(diffFilePath, diffOutput, "utf8");
    absoluteTargetPath = diffFilePath;
    targetScopeKind = "file";
    materializedKind = "single_text";
    resolvedTargetRefs = [diffFilePath];
    if (!filesystemAllowedRoots.includes(path.resolve(diffTargetDir))) {
      filesystemAllowedRoots.push(path.resolve(diffTargetDir));
    }
  } else if (bundleRequested) {
    targetScopeKind = "bundle";
    materializedKind = "bundle_member_texts";
    bundleKind = explicitBundleKind && explicitBundleKind.length > 0
      ? explicitBundleKind
      : "host_facing_bundle";
    const primaryRefRaw = explicitPrimaryRef ?? requestedTarget ?? explicitMemberRefs[0];
    if (typeof primaryRefRaw !== "string" || primaryRefRaw.length === 0) {
      throw new Error(
        "Bundle review target requires --primary-ref or at least one --member-ref.",
      );
    }
    absoluteTargetPath = path.resolve(projectRoot, primaryRefRaw);
    const orderedRefs = [
      absoluteTargetPath,
      ...explicitMemberRefs.map((memberRef) => path.resolve(projectRoot, memberRef)),
    ];
    resolvedTargetRefs = orderedRefs.filter(
      (resolvedRef, index) => orderedRefs.indexOf(resolvedRef) === index,
    );
  } else {
  const resolvedTargetInput = await resolveTargetInput(
      projectRoot,
      requestedTarget as string,
      explicitFilesystemAllowedRoots,
      argv,
    );
    absoluteTargetPath = resolvedTargetInput.absoluteTargetPath;
    targetScopeKind = resolvedTargetInput.targetScopeKind;
    materializedKind = resolvedTargetInput.materializedKind;
    resolvedTargetRefs = [absoluteTargetPath];
    filesystemAllowedRoots = resolvedTargetInput.filesystemAllowedRoots;
  }

  if (resolvedLensIds.length === 0) {
    throw new Error(
      "No lens IDs resolved. Specify at least one --lens-id or use --review-mode full|light.",
    );
  }

  return {
    requestedTarget: requestedTarget ?? explicitPrimaryRef ?? absoluteTargetPath,
    targetPath: absoluteTargetPath,
    resolvedTargetRefs,
    targetScopeKind,
    materializedKind,
    requestText,
    requestedDomainToken,
    domainRecommendation: resolvedDomainSelection.domainRecommendation,
    domainFinalValue: resolvedDomainSelection.domainFinalValue,
    domainSelectionMode: resolvedDomainSelection.domainSelectionMode,
    domainSelectionRequired: resolvedDomainSelection.domainSelectionRequired,
    ...(bundleKind ? { bundleKind } : {}),
    reviewMode,
    reviewModeRecommendation: reviewMode,
    resolvedLensIds,
    alwaysIncludeLensIds:
      explicitLensIds.length > 0 ? resolvedLensIds : lensDefaults.alwaysIncludeLensIds,
    recommendedLensIds:
      explicitLensIds.length > 0 ? resolvedLensIds : lensDefaults.recommendedLensIds,
    rationale:
      explicitLensIds.length > 0
        ? ["host-facing invoke preserved the explicitly requested lens set."]
        : lensDefaults.rationale,
    filesystemAllowedRoots,
  };
}

function appendReviewInvokeDerivedArgs(
  argv: string[],
  resolvedInputs: ResolvedReviewInvokeInputs,
): string[] {
  const appended = [...argv];

  const appendSingleIfAbsent = (optionName: string, value: string): void => {
    if (readSingleOptionValueFromArgv(appended, optionName) !== undefined) {
      return;
    }
    appended.push(`--${optionName}`, value);
  };

  const appendMultiIfAbsent = (optionName: string, values: string[]): void => {
    if (readMultiOptionValuesFromArgv(appended, optionName).length > 0) {
      return;
    }
    for (const value of values) {
      appended.push(`--${optionName}`, value);
    }
  };

  appendSingleIfAbsent("requested-target", resolvedInputs.requestedTarget);
  appendSingleIfAbsent("target-scope-kind", resolvedInputs.targetScopeKind);
  appendSingleIfAbsent("primary-ref", resolvedInputs.targetPath);
  appendSingleIfAbsent("intent-summary", resolvedInputs.requestText);
  appendSingleIfAbsent("domain-recommendation", resolvedInputs.domainRecommendation);
  appendSingleIfAbsent(
    "domain-selection-required",
    resolvedInputs.domainSelectionRequired ? "true" : "false",
  );
  appendSingleIfAbsent("review-mode-recommendation", resolvedInputs.reviewModeRecommendation);
  appendSingleIfAbsent("domain-final-value", resolvedInputs.domainFinalValue);
  appendSingleIfAbsent("domain-selection-mode", resolvedInputs.domainSelectionMode);
  appendSingleIfAbsent("review-mode", resolvedInputs.reviewMode);
  appendSingleIfAbsent("materialized-kind", resolvedInputs.materializedKind);
  appendMultiIfAbsent("always-include-lens-id", resolvedInputs.alwaysIncludeLensIds);
  appendMultiIfAbsent("recommended-lens-id", resolvedInputs.recommendedLensIds);
  appendMultiIfAbsent("rationale", resolvedInputs.rationale);
  appendMultiIfAbsent("resolved-target-ref", resolvedInputs.resolvedTargetRefs);
  appendMultiIfAbsent(
    "filesystem-allowed-root",
    resolvedInputs.filesystemAllowedRoots,
  );
  appendMultiIfAbsent("lens-id", resolvedInputs.resolvedLensIds);
  appendMultiIfAbsent("materialized-ref", resolvedInputs.resolvedTargetRefs);
  if (resolvedInputs.targetScopeKind === "bundle") {
    appendMultiIfAbsent("member-ref", resolvedInputs.resolvedTargetRefs.slice(1));
    if (
      typeof resolvedInputs.bundleKind === "string" &&
      resolvedInputs.bundleKind.length > 0 &&
      readSingleOptionValueFromArgv(appended, "bundle-kind") === undefined
    ) {
      appended.push("--bundle-kind", resolvedInputs.bundleKind);
    }
  }

  if (
    resolvedInputs.requestedDomainToken.length > 0 &&
    readSingleOptionValueFromArgv(appended, "requested-domain-token") === undefined
  ) {
    appended.push("--requested-domain-token", resolvedInputs.requestedDomainToken);
  }

  return appended;
}

async function readOptionalReviewSummary(
  sessionRoot: string,
): Promise<{
  reviewRecord:
    | {
        record_status?: string;
        deliberation_status?: string;
        participating_lens_ids?: string[];
        degraded_lens_ids?: string[];
        final_output_ref?: string | null;
        execution_result_ref?: string | null;
      }
    | null;
  binding:
    | {
        review_record_path?: string;
        final_output_path?: string;
        execution_result_path?: string;
      }
    | null;
}> {
  const bindingPath = path.join(sessionRoot, "binding.yaml");
  const reviewRecordPath = path.join(sessionRoot, "review-record.yaml");

  const binding = (await fileExists(bindingPath))
    ? await readYamlDocument<{
        review_record_path?: string;
        final_output_path?: string;
        execution_result_path?: string;
      }>(bindingPath)
    : null;
  const reviewRecord = (await fileExists(reviewRecordPath))
    ? await readYamlDocument<{
        record_status?: string;
        deliberation_status?: string;
        participating_lens_ids?: string[];
        degraded_lens_ids?: string[];
        final_output_ref?: string | null;
        execution_result_ref?: string | null;
      }>(reviewRecordPath)
    : null;

  return {
    reviewRecord,
    binding,
  };
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

function defaultMaxConcurrentLensesForExecutionRealization(
  executionRealization: ExecutionRealization,
): number {
  return executionRealization === "subagent" ? 3 : 9;
}

function resolveMaxConcurrentLenses(
  argv: string[],
  ontoConfig: OntoConfig,
  executionRealization: ExecutionRealization,
): number {
  const explicitValue = readSingleOptionValueFromArgv(argv, "max-concurrent-lenses");
  if (typeof explicitValue === "string" && explicitValue.length > 0) {
    const parsed = Number.parseInt(explicitValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new Error(`Invalid max concurrent lenses: ${explicitValue}`);
    }
    return parsed;
  }

  const configValue = ontoConfig.max_concurrent_lenses;
  if (
    (typeof configValue === "string" && configValue.length > 0) ||
    typeof configValue === "number"
  ) {
    const parsed = Number.parseInt(String(configValue), 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new Error(`Invalid .onto/config.yml max_concurrent_lenses: ${configValue}`);
    }
    return parsed;
  }

  return defaultMaxConcurrentLensesForExecutionRealization(executionRealization);
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

function appendDirectoryListingConfigArgs(
  targetArgv: string[],
  originalArgv: string[],
  ontoConfig: OntoConfig,
): string[] {
  const result = [...targetArgv];

  if (
    readMultiOptionValuesFromArgv(result, "excluded-name").length === 0 &&
    Array.isArray(ontoConfig.excluded_names) &&
    ontoConfig.excluded_names.length > 0
  ) {
    for (const name of ontoConfig.excluded_names) {
      result.push("--excluded-name", name);
    }
  }

  if (
    readSingleOptionValueFromArgv(result, "max-listing-depth") === undefined &&
    ontoConfig.max_listing_depth !== undefined
  ) {
    result.push("--max-listing-depth", String(ontoConfig.max_listing_depth));
  }

  if (
    readSingleOptionValueFromArgv(result, "max-listing-entries") === undefined &&
    ontoConfig.max_listing_entries !== undefined
  ) {
    result.push("--max-listing-entries", String(ontoConfig.max_listing_entries));
  }

  if (
    readSingleOptionValueFromArgv(result, "max-embed-lines") === undefined &&
    ontoConfig.max_embed_lines !== undefined
  ) {
    result.push("--max-embed-lines", String(ontoConfig.max_embed_lines));
  }

  return result;
}

export async function runReviewInvokeCli(argv: string[]): Promise<number> {
  const prepareOnly = hasOptionFlag(argv, "prepare-only");
  const ontoHomeFlag = readSingleOptionValueFromArgv(argv, "onto-home");
  let ontoHome: string | undefined;
  try {
    ontoHome = resolveOntoHome(ontoHomeFlag);
  } catch {
    // When invoked via npm run (legacy path), onto home resolution from
    // import.meta.url or CWD will succeed. If it fails, we proceed without
    // ontoHome — executor resolution falls back to npm run scripts.
    ontoHome = undefined;
  }
  const projectRoot = path.resolve(
    readSingleOptionValueFromArgv(argv, "project-root") ?? ".",
  );
  const ontoConfig = ontoHome
    ? await resolveConfigChain(ontoHome, projectRoot)
    : await readOntoConfig(projectRoot);
  const resolvedInvokeInputs = await resolveReviewInvokeInputs(
    argv,
    ontoConfig,
    projectRoot,
  );
  const hostRuntime = resolveHostRuntimeFromArgv(argv, ontoConfig);
  const executionRealization = resolveExecutionRealization(
    argv,
    ontoConfig,
    hostRuntime,
  );
  const maxConcurrentLenses = resolveMaxConcurrentLenses(
    argv,
    ontoConfig,
    executionRealization,
  );

  const { optionTokens: argvWithoutPositionals } = splitArgvIntoOptionsAndPositionals(
    argv,
    [...KNOWN_INVOKE_ONLY_OPTION_NAMES, ...KNOWN_PASSTHROUGH_OPTION_NAMES],
    [...KNOWN_INVOKE_ONLY_FLAG_NAMES, ...KNOWN_PASSTHROUGH_FLAG_NAMES],
  );

  const normalizedStartArgv = appendReviewInvokeDerivedArgs(
    ensureSessionIdArg(
      stripOptionsFromArgv(
        argvWithoutPositionals,
        [...KNOWN_INVOKE_ONLY_OPTION_NAMES],
        [...KNOWN_INVOKE_ONLY_FLAG_NAMES],
      ),
    ),
    resolvedInvokeInputs,
  );
  const startArgvWithProfile = appendCanonicalExecutionProfileArgs(
    normalizedStartArgv,
    executionRealization,
    hostRuntime,
  );
  const startArgv = appendDirectoryListingConfigArgs(
    startArgvWithProfile,
    argv,
    ontoConfig,
  );
  const resolvedExecutorRealization =
    readSingleOptionValueFromArgv(argv, "executor-realization") ??
    ontoConfig.executor_realization;
  // Skip API key validation when --prepare-only: no executor runs in that mode.
  // Precondition: startReviewSession() does not call any external API.
  if (!prepareOnly && resolvedExecutorRealization === "api") {
    const apiProvider = readSingleOptionValueFromArgv(argv, "api-provider") ??
      ontoConfig.api_provider ?? "anthropic";
    if (apiProvider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY environment variable is required for --executor-realization api with anthropic provider.",
      );
    }
    if (apiProvider === "openai" && !process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY environment variable is required for --executor-realization api with openai provider.",
      );
    }
  }

  const startResult = await startReviewSession(startArgv);

  if (prepareOnly) {
    const sessionRoot = path.resolve(startResult.session_root);
    const result: PrepareOnlyResult = {
      prepare_only: true,
      session_root: sessionRoot,
      request_text: resolvedInvokeInputs.requestText,
      execution_realization: executionRealization,
      host_runtime: hostRuntime,
      review_mode: resolvedInvokeInputs.reviewMode,
    };
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  const resolvedProjectRoot = path.resolve(
    readSingleOptionValueFromArgv(startArgv, "project-root") ?? ".",
  );
  const sessionRoot = path.resolve(startResult.session_root);
  const resolvedRequestText = resolvedInvokeInputs.requestText;
  const defaultExecutorConfig = resolveExecutorConfig(
    argv,
    executionRealization,
    hostRuntime,
    "",
    ontoConfig,
    ontoHome,
  );
  const synthesizeExecutorConfig = resolveExecutorConfig(
    argv,
    executionRealization,
    hostRuntime,
    "synthesize-",
    ontoConfig,
    ontoHome,
  );

  const promptExecutionResult = await executeReviewPromptExecution({
    projectRoot: resolvedProjectRoot,
    sessionRoot,
    defaultExecutorConfig,
    maxConcurrentLenses,
    ...(synthesizeExecutorConfig.bin === defaultExecutorConfig.bin &&
    JSON.stringify(synthesizeExecutorConfig.args) ===
      JSON.stringify(defaultExecutorConfig.args)
      ? {}
      : { synthesizeExecutorConfig }),
  });

  const completeSessionResult = await completeReviewSession([
    "--project-root",
    resolvedProjectRoot,
    "--session-root",
    sessionRoot,
    "--request-text",
    resolvedRequestText,
  ]);
  const reviewSummary = await readOptionalReviewSummary(sessionRoot);
  const boundedInvokeSteps = [
    "review:start-session",
    "review:run-prompt-execution",
    "review:complete-session",
  ] as const;
  const routeSummary: ReviewInvokeRouteSummary = {
    combined_entrypoint: "review:invoke",
    bounded_invoke_steps: [...boundedInvokeSteps],
    execution_realization: executionRealization,
    host_runtime: hostRuntime,
    review_mode: resolvedInvokeInputs.reviewMode,
    max_concurrent_lenses: maxConcurrentLenses,
    concurrency_strategy: "bounded_parallel",
    synthesize_waits_for_all_lenses: true,
  };
  const finalOutputPath =
    reviewSummary.binding?.final_output_path ?? path.join(sessionRoot, "final-output.md");
  const reviewRecordPath =
    reviewSummary.binding?.review_record_path ?? path.join(sessionRoot, "review-record.yaml");
  const executionResultPath =
    reviewSummary.binding?.execution_result_path ?? path.join(sessionRoot, "execution-result.yaml");

  console.log(
    JSON.stringify(
      {
        entrypoint_plan: {
          entrypoint: "review",
          target: resolvedInvokeInputs.requestedTarget,
          target_scope_kind: resolvedInvokeInputs.targetScopeKind,
          resolved_target_refs: resolvedInvokeInputs.resolvedTargetRefs,
          request_text: resolvedRequestText,
          requested_domain_token:
            resolvedInvokeInputs.requestedDomainToken.length > 0
              ? resolvedInvokeInputs.requestedDomainToken
              : null,
          domain_selection_required: resolvedInvokeInputs.domainSelectionRequired,
          domain_selection_mode: resolvedInvokeInputs.domainSelectionMode,
          domain_final_value: resolvedInvokeInputs.domainFinalValue,
          review_mode: resolvedInvokeInputs.reviewMode,
        },
        route_summary: routeSummary,
        review_result: {
          session_root: sessionRoot,
          final_output_path: finalOutputPath,
          review_record_path: reviewRecordPath,
          execution_result_path: executionResultPath,
          record_status: reviewSummary.reviewRecord?.record_status ?? null,
          deliberation_status:
            reviewSummary.reviewRecord?.deliberation_status ?? null,
          participating_lens_ids:
            reviewSummary.reviewRecord?.participating_lens_ids ??
            promptExecutionResult.participating_lens_ids,
          degraded_lens_ids:
            reviewSummary.reviewRecord?.degraded_lens_ids ??
            promptExecutionResult.degraded_lens_ids,
        },
        session_root: sessionRoot,
        bounded_invoke_steps: [...boundedInvokeSteps],
        prompt_execution_result: promptExecutionResult,
        complete_session_result: completeSessionResult,
        max_concurrent_lenses: maxConcurrentLenses,
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
  await printOntoReleaseChannelNotice();
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
