/**
 * /start command orchestration — 3-path branching.
 *
 * Connects config -> scanners -> kernel event pipeline -> renderers.
 * This is the first user-facing entry point of Sprint Kit.
 *
 * 3-path branching:
 *   Path A — New scope: create directory + brief template (no grounding)
 *   Path B — Brief filled: validate brief -> 3-way source merge -> grounding
 *   Path C — Resume: read event log -> return current state + next action
 *
 * Backward compatibility:
 *   When scopeId + title are provided directly (old interface), Path B logic
 *   executes immediately (existing tests keep passing).
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createScope,
  generateScopeId,
  normalizeProjectName,
  resolveScopePaths,
  type ScopePaths,
  type BriefSourceEntry,
} from "../../scope-runtime/scope-manager.js";
import { appendScopeEvent, type PipelineResult } from "../../scope-runtime/event-pipeline.js";
import { readEvents } from "../../scope-runtime/event-store.js";
import { reduce } from "../../scope-runtime/reducer.js";
import { renderScopeMd } from "../renderers/scope-md.js";
import { wrapGateError } from "./error-messages.js";
import {
  parseStartInput,
  loadProjectConfig,
  resolveSources,
  writeSourcesYaml,
} from "../config/project-config.js";
import { scanLocal } from "../../readers/scan-local.js";
import { scanVault } from "../../readers/scan-vault.js";
import { scanTarball, resolveGitHubToken } from "../../readers/scan-tarball.js";
import { sourceKey, toGroundingSource, isScanError, isScanSkipped, type SourceEntry, type ScanResult, type ScanError, type ScanSkipped } from "../../readers/types.js";
import { buildBrownfield } from "../../readers/brownfield-builder.js";
import { parseBrief } from "../adapters/code-product/parsers/brief-parser.js";
import { TERMINAL_STATES } from "../../scope-runtime/types.js";
import { buildOntologyIndex } from "../../readers/ontology-index.js";
import { queryOntology } from "../../readers/ontology-query.js";
import { resolveCodeLocations } from "../../readers/ontology-resolve.js";
import { collectRelevantChunks } from "../../readers/code-chunk-collector.js";

// ─── Input ───

export interface StartInput {
  /** Project name for scope ID generation (new interface) */
  projectName?: string;
  /** Raw user input: description + optional flags */
  rawInput: string;
  /** Project root where .sprint-kit.yaml lives */
  projectRoot: string;
  /** Directory where scopes are stored */
  scopesDir: string;
  /** Scope ID — optional now; auto-generated if not provided */
  scopeId?: string;
  /** Title — optional; extracted from brief or rawInput */
  title?: string;
  /** Entry mode: "experience" | "interface" | "process" */
  entryMode?: "experience" | "interface" | "process";
  /** Authority source paths (process mode only) */
  authoritySources?: Array<{ path: string; rank: number; description: string }>;
  /** Progress callback for scan feedback */
  onProgress?: (message: string) => void;
}

// ─── Output ───

export interface StartResult {
  success: true;
  action?: "executed";
  paths: ScopePaths;
  scanResults: ScanResult[];
  scanErrors: ScanError[];
  scanSkipped: ScanSkipped[];
  sourceHashes: Record<string, string>;
  totalFiles: number;
  /** Brief validation result — present when brief was incomplete (exploration conversation mode) */
  briefValidation?: {
    isComplete: boolean;
    missingFields: string[];
  };
}

export interface StartInitResult {
  success: true;
  action: "initialized";
  paths: ScopePaths;
  scopeId: string;
  briefPath: string;
}

export interface StartResumeResult {
  success: true;
  action: "resume_info";
  paths: ScopePaths;
  scopeId: string;
  currentState: string;
  nextAction: string;
}

export interface StartFailure {
  success: false;
  reason: string;
  step: string;
}

export interface StartProcessResult {
  success: true;
  action: "process_scope_created";
  paths: ScopePaths;
  scopeId: string;
  authoritySources: Array<{ path: string; rank: number; description: string }>;
  authorityConsistency: {
    passed: boolean;
    total: number;
    high: number;
    medium: number;
    low: number;
    violations: Array<{ id: string; type: string; severity: string; summary: string }>;
  };
}

export type StartOutput = StartResult | StartInitResult | StartResumeResult | StartProcessResult | StartFailure;

// ─── Scope lookup ───

/**
 * Search for an existing scope directory matching the projectName pattern.
 *
 * Looks for directories matching `{normalized}-{YYYYMMDD}-{NNN}` and returns
 * the most recent one (lexicographically last). Returns null if none found.
 */
export function findExistingScope(scopesDir: string, projectName: string): string | null {
  const normalized = normalizeProjectName(projectName);
  if (!existsSync(scopesDir)) return null;

  const entries = readdirSync(scopesDir, { withFileTypes: true });
  const pattern = new RegExp(`^${normalized}-\\d{8}-\\d{3}$`);

  const matches = entries
    .filter(e => e.isDirectory() && pattern.test(e.name))
    .map(e => e.name)
    .sort()
    .reverse();

  if (matches.length === 0) return null;

  return matches[0]!;
}

// ─── Main ───

export async function executeStart(input: StartInput): Promise<StartOutput> {
  const progress = input.onProgress ?? (() => {});

  // Process mode: methodology adapter path
  if (input.entryMode === "process") {
    return handleProcessStart(input, progress);
  }

  // Backward compatibility: when scopeId + title are provided directly,
  // go straight to Path B execution logic (old interface).
  if (input.scopeId && input.title) {
    return executePathBDirect(input as StartInput & { scopeId: string; title: string }, progress);
  }

  // New 3-path branching: determine scopeId
  const projectName = input.projectName ?? "scope";

  // Before generating new ID, check for existing scope
  const existingScopeId = findExistingScope(input.scopesDir, projectName);

  if (existingScopeId) {
    const paths = resolveScopePaths(input.scopesDir, existingScopeId);
    const existingEvents = readEvents(paths.events);

    if (existingEvents.length > 0) {
      // PATH C: Resume
      return handleResume(paths, existingScopeId, existingEvents, progress);
    }

    // PATH B: Folder exists, no events — check brief
    return handleBriefExecution(input, existingScopeId, paths, progress);
  }

  // No existing scope found → PATH A: New
  const scopeId = input.scopeId ?? generateScopeId(input.scopesDir, projectName);
  return handleNewScope(input, projectName, scopeId, resolveScopePaths(input.scopesDir, scopeId), progress);
}

// ─── Path A: New scope ───

async function handleNewScope(
  input: StartInput,
  projectName: string,
  scopeId: string,
  _paths: ScopePaths,
  progress: (msg: string) => void,
): Promise<StartInitResult> {
  progress("새 scope를 생성합니다...");

  // Load .sprint-kit.yaml default_sources
  const config = loadProjectConfig(input.projectRoot);

  // Convert to BriefSourceEntry format for brief template
  const defaultSources: BriefSourceEntry[] = config.default_sources.map(
    (s) => toBriefSourceEntry(s),
  );

  // Create scope directory + brief template
  const paths = createScope(input.scopesDir, scopeId, {
    projectName,
    defaultSources,
  });

  progress(`brief.md가 생성되었습니다: ${paths.brief}`);

  return {
    success: true,
    action: "initialized",
    paths,
    scopeId: paths.scopeId,
    briefPath: paths.brief,
  };
}

// ─── Path B: Brief filled -> grounding ───

async function handleBriefExecution(
  input: StartInput,
  scopeId: string,
  paths: ScopePaths,
  progress: (msg: string) => void,
): Promise<StartResult | StartFailure> {
  // B-2: Read and validate brief.md
  if (!existsSync(paths.brief)) {
    return {
      success: false,
      reason: `brief.md 파일이 존재하지 않습니다: ${paths.brief}`,
      step: "brief_validation",
    };
  }

  const briefContent = readFileSync(paths.brief, "utf-8");
  const parsedBrief = parseBrief(briefContent);

  // B-2: Brief validation — incomplete brief is allowed (exploration conversation mode)
  const briefValidation = !parsedBrief.validation.isComplete
    ? { isComplete: false, missingFields: parsedBrief.validation.missingFields }
    : undefined;

  // B-3: Extract info from brief (use projectName as fallback for empty title)
  const title = parsedBrief.title || projectNameFromScopeId(scopeId);
  const description = parsedBrief.description;

  // B-4: 3-way source collection
  const parsed = parseStartInput(input.rawInput);
  const config = loadProjectConfig(input.projectRoot);
  const configSources = config.default_sources;
  const briefSources = parsedBrief.additionalSources;
  const cliSources = parsed.sources;
  const sources = resolveSources(configSources, [...briefSources, ...cliSources]);

  if (sources.length === 0) {
    return {
      success: false,
      reason: "스캔할 소스가 없습니다. .sprint-kit.yaml에 default_sources를 추가하거나, brief.md에 추가 소스를 기입하거나, /start 명령에 --add-dir, --github 등 플래그를 사용하세요.",
      step: "resolve_sources",
    };
  }

  // B-5: Record scope.created
  const createResult = appendScopeEvent(paths, {
    type: "scope.created",
    actor: "user",
    payload: {
      title,
      description,
      entry_mode: input.entryMode ?? "experience",
    },
  });

  if (!createResult.success) {
    return { success: false, reason: wrapGateError(createResult.reason), step: "scope.created" };
  }

  // B-6: Continue with grounding
  return executeGrounding(paths, scopeId, sources, progress, input.projectRoot, briefValidation);
}

// ─── Path B direct: backward compatibility (old interface) ───

async function executePathBDirect(
  input: StartInput & { scopeId: string; title: string },
  progress: (msg: string) => void,
): Promise<StartResult | StartFailure> {
  // Step 1: Parse input
  const parsed = parseStartInput(input.rawInput);

  // Step 2: Load config + merge sources
  const config = loadProjectConfig(input.projectRoot);
  const sources = resolveSources(config.default_sources, parsed.sources);

  if (sources.length === 0) {
    return {
      success: false,
      reason: "스캔할 소스가 없습니다. .sprint-kit.yaml에 default_sources를 추가하거나, /start 명령에 --add-dir, --github 등 플래그를 사용하세요.",
      step: "resolve_sources",
    };
  }

  // Step 3: Create scope
  const paths = createScope(input.scopesDir, input.scopeId);

  // Step 4: Record scope.created
  const createResult = appendScopeEvent(paths, {
    type: "scope.created",
    actor: "user",
    payload: {
      title: input.title,
      description: parsed.description,
      entry_mode: input.entryMode ?? "experience",
    },
  });

  if (!createResult.success) {
    return { success: false, reason: wrapGateError(createResult.reason), step: "scope.created" };
  }

  // Step 5: Write sources.yaml + grounding
  return executeGrounding(paths, input.scopeId, sources, progress, input.projectRoot);
}

// ─── Path C: Resume ───

async function handleResume(
  paths: ScopePaths,
  scopeId: string,
  existingEvents: import("../../scope-runtime/types.js").Event[],
  progress: (msg: string) => void,
): Promise<StartResumeResult> {
  const state = reduce(existingEvents);
  const currentState = state.current_state;

  let nextAction: string;

  if (TERMINAL_STATES.has(currentState)) {
    nextAction = "이 scope는 종료되었습니다. 새 scope를 만드시려면 다른 이름으로 /start를 실행해 주세요.";
  } else if (currentState === "draft") {
    // Check if grounding has not completed
    const hasGroundingCompleted = existingEvents.some(
      (e) => e.type === "grounding.completed",
    );
    if (!hasGroundingCompleted) {
      nextAction = "brief 검증 후 소스 재스캔 진행";
    } else {
      nextAction = "grounding이 진행 중입니다. 계속 진행합니다.";
    }
  } else if (currentState === "grounded") {
    nextAction = "Align Packet이 아직 생성되지 않았습니다. 계속 진행합니다.";
  } else if (currentState === "exploring") {
    const ep = state.exploration_progress;
    if (ep) {
      nextAction = `Exploration Phase ${ep.current_phase}/6 (${ep.current_phase_name}) 진행 중입니다. ${ep.total_rounds}회 완료. exploration-log.md를 확인 후 이어서 진행해 주세요.`;
    } else {
      nextAction = "Exploration이 시작되었습니다. 계속 진행합니다.";
    }
  } else if (currentState === "align_proposed") {
    nextAction = "Align Packet이 대기 중입니다. /align으로 결정해 주세요.";
  } else {
    // align_locked and beyond — provide state-specific guidance (PO-friendly language)
    const undecidedCount = state.constraint_pool.constraints.filter(
      c => c.status === "undecided" || c.status === "clarify_pending",
    ).length;
    const constraintInfo = undecidedCount > 0
      ? ` 미결정 제약 ${undecidedCount}건이 있습니다.`
      : "";

    switch (currentState) {
      case "align_locked":
        nextAction = `범위가 확정되었습니다.${constraintInfo} /draft로 Surface(화면 설계)를 생성해 주세요.`;
        break;
      case "surface_iterating":
        nextAction = `Surface 피드백 반영 중입니다.${constraintInfo} 수정이 필요하면 피드백을, 이 모습이 맞으면 '확정합니다'라고 말씀해 주세요.`;
        break;
      case "surface_confirmed":
        nextAction = `Surface가 확정되었습니다.${constraintInfo} /draft로 제약 탐색과 Draft Packet 생성을 진행해 주세요.`;
        break;
      case "constraints_resolved":
        nextAction = "모든 제약이 결정되었습니다. /draft로 target 잠금과 compile을 진행해 주세요.";
        break;
      case "target_locked":
        nextAction = "target이 잠겼습니다. /draft로 compile을 진행해 주세요.";
        break;
      case "compiled":
        nextAction = "compile이 완료되었습니다. Build Spec을 참고하여 apply를 진행해 주세요.";
        break;
      case "applied":
        nextAction = "apply가 완료되었습니다. validation을 진행해 주세요.";
        break;
      case "validated":
        nextAction = "validation이 완료되었습니다. 결과를 확인하시고 종료하려면 '완료'라고 말씀해 주세요.";
        break;
      default:
        nextAction = `/draft로 진행해 주세요.${constraintInfo}`;
        break;
    }
  }

  progress(`기존 scope를 재개합니다 (${currentState})`);

  return {
    success: true,
    action: "resume_info",
    paths,
    scopeId,
    currentState,
    nextAction,
  };
}

// ─── Shared grounding logic ───

async function executeGrounding(
  paths: ScopePaths,
  scopeId: string,
  sources: SourceEntry[],
  progress: (msg: string) => void,
  projectRoot: string,
  briefValidation?: StartResult["briefValidation"],
): Promise<StartResult | StartFailure> {
  // Write sources.yaml
  writeSourcesYaml(paths.sourcesYaml, sources);

  // Scan sources
  progress(`소스 스캔을 시작합니다 (${sources.length}개 소스)`);

  const etagCache = readEtagCache(projectRoot);
  const scanResults: ScanResult[] = [];
  const scanErrors: ScanError[] = [];
  const scanSkipped: ScanSkipped[] = [];

  const scanPromises = sources.map((src) => scanSource(src, etagCache));
  const settled = await Promise.allSettled(scanPromises);

  for (let i = 0; i < settled.length; i++) {
    const src = sources[i]!;
    const label = src.description ?? sourceKey(src);
    const outcome = settled[i]!;

    if (outcome.status === "rejected") {
      scanErrors.push({
        source: src,
        error_type: "io",
        message: String(outcome.reason),
      });
      progress(`${label} 스캔 실패: ${outcome.reason}`);
    } else {
      const result = outcome.value;
      if (isScanError(result)) {
        scanErrors.push(result);
        progress(`${label} 스캔 실패: ${result.message}`);
      } else if (isScanSkipped(result)) {
        scanSkipped.push(result);
        progress(`${label} 변경 없음 (캐시 사용)`);
      } else {
        scanResults.push(result);
        // Update etag cache for tarball sources
        if (result.response_etag && result.source.type === "github-tarball") {
          const key = sourceKey(result.source);
          const hash = result.content_hashes[key];
          if (hash) {
            etagCache[key] = { etag: result.response_etag, hash, fetched_at: new Date().toISOString() };
          }
        }
        progress(`${label} 스캔 완료`);
      }
    }
  }

  // Persist updated etag cache
  writeEtagCache(projectRoot, etagCache);

  // Check if all scans failed (skipped sources count as success)
  if (scanResults.length === 0 && scanSkipped.length === 0 && scanErrors.length > 0) {
    const errorSummary = scanErrors.map(e => `${sourceKey(e.source)}: ${e.message}`).join("; ");
    return {
      success: false,
      reason: `모든 소스 스캔이 실패했습니다: ${errorSummary}`,
      step: "scan_sources",
    };
  }

  // Record grounding.started
  const groundingSources = sources.map(toGroundingSource);
  const groundingStarted = appendScopeEvent(paths, {
    type: "grounding.started",
    actor: "system",
    payload: { sources: groundingSources },
  });

  if (!groundingStarted.success) {
    return { success: false, reason: wrapGateError(groundingStarted.reason), step: "grounding.started" };
  }

  // Build source_hashes + perspective_summary + record grounding.completed
  const sourceHashes: Record<string, string> = {};
  let totalFiles = 0;
  const perspectiveSummary = { experience: 0, code: 0, policy: 0 };

  for (const result of scanResults) {
    const key = sourceKey(result.source);
    // Use sourceKey-based lookup (matches stale-check.ts computeCurrentHash)
    // content_hashes is keyed by sourceKey, so direct lookup is deterministic.
    const hash = result.content_hashes[key];
    if (hash) {
      sourceHashes[key] = hash;
    }
    totalFiles += result.files.length;

    // Count patterns by perspective-relevant categories
    perspectiveSummary.code += result.dependency_graph.length
      + result.api_patterns.length
      + result.schema_patterns.length
      + result.config_patterns.length;
    perspectiveSummary.experience += result.files.filter(f => f.category === "doc" || f.language === "html" || f.language === "css").length;
    perspectiveSummary.policy += result.doc_structure.length;
  }

  // Add skipped source hashes (ETag cache hit → previous hash reuse)
  for (const skipped of scanSkipped) {
    const key = sourceKey(skipped.source);
    sourceHashes[key] = skipped.cached_hash;
  }

  // Compute snapshot_revision from previous grounding events
  const currentEvents = readEvents(paths.events);
  const previousGroundings = currentEvents.filter(e => e.type === "grounding.completed").length;
  const snapshotRevision = previousGroundings + 1;

  const failedSources = scanErrors.map(e => ({
    source_key: sourceKey(e.source),
    error_type: e.error_type,
    message: e.message,
  }));

  const groundingCompleted = appendScopeEvent(paths, {
    type: "grounding.completed",
    actor: "system",
    payload: {
      snapshot_revision: snapshotRevision,
      source_hashes: sourceHashes,
      perspective_summary: perspectiveSummary,
      ...(failedSources.length > 0 ? { failed_sources: failedSources } : {}),
    },
  });

  if (!groundingCompleted.success) {
    return { success: false, reason: wrapGateError(groundingCompleted.reason), step: "grounding.completed" };
  }

  // Write reality-snapshot.json
  const realitySnapshot = {
    scope_id: scopeId,
    snapshot_revision: snapshotRevision,
    source_hashes: sourceHashes,
    perspective_summary: perspectiveSummary,
    scanned_at: new Date().toISOString(),
  };
  writeFileSync(paths.realitySnapshot, JSON.stringify(realitySnapshot, null, 2) + "\n", "utf-8");

  // Write scope.md
  const finalState = reduce(readEvents(paths.events));
  writeFileSync(paths.scopeMd, renderScopeMd(finalState), "utf-8");

  progress(`소스 스캔 완료 (파일 ${totalFiles}개)`);

  // ── Ontology-Guided Code Selection (optional) ──
  // 온톨로지 소스가 스캔되었으면, 6관점 코드 청크를 사전 생성한다.
  // 이 단계는 grounding의 선택적 보강이며, 실패해도 grounding은 성공한다.
  // add-dir: 로컬 파일 직접 읽기. tarball: GitHub API로 YAML 파일 fetch.
  try {
    const ontologySource = scanResults.find(
      (r) => r.source.type === "add-dir" && (r.source as { path: string }).path?.includes("ontology"),
    ) ?? scanResults.find(
      (r) => r.source.type === "github-tarball" && (r.source as { url: string }).url?.includes("ontology"),
    );

    // YAML 파일 읽기 — add-dir은 로컬, tarball은 GitHub API
    const yamlNames = ["code-mapping.yaml", "behavior.yaml", "model.yaml"];
    let yamlContents: string[] = ["", "", ""];

    if (ontologySource?.source.type === "add-dir") {
      const ontoDir = (ontologySource.source as { path: string }).path;
      yamlContents = yamlNames.map((name) => {
        const candidates = ontologySource.files.filter((f) => f.path.endsWith(name));
        if (candidates.length === 0) return "";
        try { return readFileSync(join(ontoDir, candidates[0]!.path), "utf-8"); } catch { return ""; }
      });
    } else if (ontologySource?.source.type === "github-tarball") {
      const url = (ontologySource.source as { url: string }).url;
      const repoMatch = url.match(/github\.com\/([^/]+\/[^/]+)/);
      if (repoMatch) {
        const repo = repoMatch[1]!.replace(/\.git$/, "");
        const token = resolveGitHubToken();
        const headers: Record<string, string> = { Accept: "application/vnd.github.raw", "User-Agent": "sprint-kit" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        yamlContents = await Promise.all(yamlNames.map(async (name) => {
          try {
            const resp = await fetch(`https://api.github.com/repos/${repo}/contents/${name}`, { headers });
            return resp.ok ? await resp.text() : "";
          } catch { return ""; }
        }));
      }
    }

    const [glossaryYaml, actionsYaml, transitionsYaml] = yamlContents;
    if (ontologySource && (glossaryYaml || actionsYaml || transitionsYaml)) {
      const index = buildOntologyIndex(glossaryYaml!, actionsYaml!, transitionsYaml!);
      const mergedFiles = scanResults.flatMap((r) => r.files);
      const mergedDeps = scanResults.flatMap((r) => r.dependency_graph);
      const mergedApis = scanResults.flatMap((r) => r.api_patterns);
      const mergedSchemas = scanResults.flatMap((r) => r.schema_patterns);
      const mergedConfigs = scanResults.flatMap((r) => r.config_patterns);

      const keywords = [...index.glossary.values()].flatMap((g) => [
        g.canonical, g.meaning, ...g.legacy_aliases,
      ]).filter(Boolean);

      const queryResult = queryOntology(index, keywords);
      if (queryResult.matched_entities.length > 0) {
        const resolved = resolveCodeLocations(queryResult.code_locations, mergedFiles);
        const chunks = collectRelevantChunks(resolved, queryResult, {
          source: ontologySource.source,
          scanned_at: ontologySource.scanned_at,
          files: mergedFiles,
          content_hashes: {},
          dependency_graph: mergedDeps,
          api_patterns: mergedApis,
          schema_patterns: mergedSchemas,
          config_patterns: mergedConfigs,
          doc_structure: [],
        }, keywords);

        const chunksPath = join(paths.build, "relevant-chunks.json");
        writeFileSync(chunksPath, JSON.stringify(chunks, null, 2) + "\n", "utf-8");
        progress(`온톨로지 6관점 코드 선별 완료 (${chunks.total_chunks}건, ${queryResult.matched_entities.length}개 엔티티 매칭)`);
      } else {
        progress("온톨로지 매칭 0건 — 에이전트 직접 탐색으로 진행");
      }
    }
  } catch {
    // 온톨로지 코드 선별 실패는 무시 — graceful degradation
  }

  return {
    success: true,
    paths,
    scanResults,
    scanErrors,
    scanSkipped,
    sourceHashes,
    totalFiles,
    ...(briefValidation ? { briefValidation } : {}),
  };
}

// ─── ETag Cache ───

interface EtagCacheEntry {
  etag: string;
  hash: string;
  fetched_at: string;
}

type EtagCacheData = Record<string, EtagCacheEntry>;

function readEtagCache(projectRoot: string): EtagCacheData {
  const cachePath = join(projectRoot, ".sprint-kit", "cache", "etag-cache.json");
  try {
    return JSON.parse(readFileSync(cachePath, "utf-8"));
  } catch {
    return {};
  }
}

function writeEtagCache(projectRoot: string, cache: EtagCacheData): void {
  try {
    const cacheDir = join(projectRoot, ".sprint-kit", "cache");
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(join(cacheDir, "etag-cache.json"), JSON.stringify(cache, null, 2) + "\n", "utf-8");
  } catch {
    // Best effort — cache write failure must not block grounding
  }
}

// ─── Helpers ───

/**
 * Extract project name from scopeId (e.g. "free-trial-20260316-001" → "free-trial").
 */
function projectNameFromScopeId(scopeId: string): string {
  return scopeId.replace(/-\d{8}-\d{3}$/, "");
}

/**
 * Convert a SourceEntry to BriefSourceEntry format for the brief template.
 */
function toBriefSourceEntry(entry: SourceEntry): BriefSourceEntry {
  switch (entry.type) {
    case "add-dir":
      return { type: "add-dir", identifier: entry.path, description: entry.description };
    case "github-tarball":
      return { type: "github-tarball", identifier: entry.url, description: entry.description };
    case "figma-mcp":
      return { type: "figma-mcp", identifier: entry.file_key, description: entry.description };
    case "obsidian-vault":
      return { type: "obsidian-vault", identifier: entry.path, description: entry.description };
    case "mcp":
      return { type: "mcp", identifier: entry.provider, description: entry.description };
    default: {
      const _exhaustive: never = entry;
      throw new Error(`Unknown source type: ${(entry as any).type}`);
    }
  }
}

// ─── Source dispatch ───

async function scanSource(source: SourceEntry, etagCache?: EtagCacheData): Promise<ScanResult | ScanError | ScanSkipped> {
  switch (source.type) {
    case "add-dir":
      return scanLocal(source);
    case "github-tarball": {
      const key = sourceKey(source);
      const cached = etagCache?.[key];
      return scanTarball(source, cached?.etag, cached?.hash);
    }
    case "obsidian-vault":
      return scanVault(source);
    case "figma-mcp":
    case "mcp":
      // MCP sources are agent-driven (MCP calls). Return empty ScanResult.
      return {
        source,
        scanned_at: new Date().toISOString(),
        files: [],
        content_hashes: {},
        dependency_graph: [],
        api_patterns: [],
        schema_patterns: [],
        config_patterns: [],
        doc_structure: [],
      };
    default: {
      const _exhaustive: never = source;
      return { source: source as SourceEntry, error_type: "parse" as const, message: `Unknown source type` };
    }
  }
}

// ─── Process mode: methodology adapter path ───

import { createHash } from "node:crypto";

async function handleProcessStart(
  input: StartInput,
  progress: (msg: string) => void,
): Promise<StartProcessResult | StartFailure> {
  const { checkAuthorityConsistency } = await import(
    "../adapters/methodology/perspectives/authority-consistency.js"
  );
  const { validateProcessScopeConfig } = await import(
    "../adapters/methodology/scope-types/process.js"
  );

  // Step 1: Discover and validate authority sources BEFORE creating scope
  progress("authority sources를 탐색합니다...");

  const authoritySources = input.authoritySources ?? discoverAuthoritySources(input.projectRoot);

  if (authoritySources.length === 0) {
    return {
      success: false,
      reason: "authority source가 없습니다. --authority-source 플래그로 지정하거나, 프로젝트에 CLAUDE.md authority 위계가 있어야 합니다.",
      step: "authority_discovery",
    };
  }

  // Step 2: Validate process scope config BEFORE creating scope
  const config = {
    authority_sources: authoritySources,
    target_document: input.rawInput || "untitled",
    perspectives: ["authority-consistency"],
  };

  const validation = validateProcessScopeConfig(config);
  if (!validation.valid) {
    return {
      success: false,
      reason: `process scope 설정 오류: ${validation.errors.join("; ")}`,
      step: "scope_validation",
    };
  }

  // Step 3: Load authority documents — fail closed on missing files
  progress("authority documents를 로드합니다...");

  const { sections, loadErrors } = loadAuthoritySections(authoritySources, input.projectRoot);

  if (loadErrors.length > 0) {
    return {
      success: false,
      reason: `authority 파일 로드 실패: ${loadErrors.join("; ")}. authority 파일이 모두 존재해야 합니다.`,
      step: "authority_load",
    };
  }

  if (sections.length === 0) {
    return {
      success: false,
      reason: "authority 문서를 하나도 로드하지 못했습니다.",
      step: "authority_load",
    };
  }

  // Step 4: Load target document for consistency check (the document being designed/checked)
  let targetSections: Array<{ id: string; title: string; content: string }> = [];
  const targetDocPath = resolveTargetDocument(input.rawInput, input.projectRoot);
  if (targetDocPath) {
    try {
      const targetContent = readFileSync(targetDocPath, "utf-8");
      targetSections = parseDocumentSections(targetDocPath, targetContent);
      progress(`target document 로드: ${targetDocPath} (${targetSections.length}개 섹션)`);
    } catch {
      // Target document may not exist yet (new design) — proceed without it
      progress("target document가 아직 존재하지 않습니다. authority 간 정합성만 검증합니다.");
    }
  }

  // Step 5: NOW create scope (all prerequisites validated)
  progress("process scope를 생성합니다...");

  const projectName = input.projectName ?? "process";
  const scopeId = input.scopeId ?? generateScopeId(input.scopesDir, projectName);
  const paths = createScope(input.scopesDir, scopeId);

  // Record scope.created — use "experience" as entry_mode for state machine compatibility
  // The actual scope kind is recorded in the description for downstream consumers
  const createResult = appendScopeEvent(paths, {
    type: "scope.created",
    actor: "user",
    payload: {
      title: input.rawInput || "Process Design",
      description: `[scope_kind:process] authority_sources:${authoritySources.length}`,
      entry_mode: "experience",
    },
  });

  if (!createResult.success) {
    return { success: false, reason: wrapGateError(createResult.reason), step: "scope.created" };
  }

  // Record grounding with authority sources
  const groundingStarted = appendScopeEvent(paths, {
    type: "grounding.started",
    actor: "system",
    payload: {
      sources: authoritySources.map(s => ({
        type: "add-dir" as const,
        path: join(input.projectRoot, s.path),
        description: `[rank ${s.rank}] ${s.description}`,
      })),
    },
  });

  if (!groundingStarted.success) {
    return { success: false, reason: wrapGateError(groundingStarted.reason), step: "grounding.started" };
  }

  // Step 6: Run authority-consistency check
  progress("authority-consistency 검증을 실행합니다...");

  // Use target sections if available, otherwise check authority documents against each other
  const checkSections = targetSections.length > 0 ? targetSections : sections;
  const authorityRefs = authoritySources.map(s => ({
    source: s.path,
    rank: s.rank,
    relevant_rules: extractRulesFromContent(s.path, input.projectRoot),
  }));

  const consistencyResult = checkAuthorityConsistency({
    sections: checkSections,
    authority_refs: authorityRefs,
  });

  // Record grounding.completed with real content hashes
  const sourceHashes: Record<string, string> = {};
  for (const s of sections) {
    sourceHashes[s.id] = createHash("sha256").update(s.content).digest("hex").slice(0, 16);
  }

  const groundingCompleted = appendScopeEvent(paths, {
    type: "grounding.completed",
    actor: "system",
    payload: {
      snapshot_revision: 1,
      source_hashes: sourceHashes,
      perspective_summary: {
        experience: 0,
        code: 0,
        policy: authoritySources.length,
      },
    },
  });

  if (!groundingCompleted.success) {
    return { success: false, reason: wrapGateError(groundingCompleted.reason), step: "grounding.completed" };
  }

  // Write scope.md
  const finalState = reduce(readEvents(paths.events));
  writeFileSync(paths.scopeMd, renderScopeMd(finalState), "utf-8");

  // Write sources.yaml for stale-check compatibility
  const sourcesYamlContent = authoritySources.map(s =>
    `- path: ${join(input.projectRoot, s.path)}\n  rank: ${s.rank}\n  description: "${s.description}"`
  ).join("\n");
  writeFileSync(join(paths.build, "authority-sources.yaml"), sourcesYamlContent + "\n", "utf-8");

  progress(`process scope 생성 완료 (authority sources ${authoritySources.length}개, violations ${consistencyResult.summary.total}건)`);

  return {
    success: true,
    action: "process_scope_created",
    paths,
    scopeId,
    authoritySources,
    authorityConsistency: {
      passed: consistencyResult.passed,
      total: consistencyResult.summary.total,
      high: consistencyResult.summary.high,
      medium: consistencyResult.summary.medium,
      low: consistencyResult.summary.low,
      violations: consistencyResult.violations.map(v => ({
        id: v.id,
        type: v.type,
        severity: v.severity,
        summary: v.summary,
      })),
    },
  };
}

// ─── Process mode helpers ───

/**
 * Auto-discover authority sources from the project's CLAUDE.md hierarchy.
 *
 * Reads CLAUDE.md to find the authority table, falling back to known
 * onto canonical paths. All paths are relative to projectRoot.
 */
function discoverAuthoritySources(projectRoot: string): Array<{ path: string; rank: number; description: string }> {
  const sources: Array<{ path: string; rank: number; description: string }> = [];

  // Try to parse CLAUDE.md authority table first
  const claudeMdPath = join(projectRoot, "CLAUDE.md");
  if (existsSync(claudeMdPath)) {
    try {
      const claudeContent = readFileSync(claudeMdPath, "utf-8");
      const parsed = parseAuthorityTable(claudeContent, projectRoot);
      if (parsed.length > 0) return parsed;
    } catch {
      // Fall through to hardcoded fallback
    }
  }

  // Fallback: known onto canonical paths
  const candidates = [
    { rel: ".onto/authority/core-lexicon.yaml", rank: 1, desc: "개념 SSOT" },
    { rel: ".onto/principles/ontology-as-code-guideline.md", rank: 2, desc: "개발 원칙: OaC" },
    { rel: ".onto/principles/llm-native-development-guideline.md", rank: 2, desc: "개발 원칙: LLM-Native" },
    { rel: ".onto/principles/non-specialist-communication-guideline.md", rank: 2, desc: "개발 원칙: 비전문가 소통" },
    { rel: ".onto/principles/product-locality-principle.md", rank: 2, desc: "개발 원칙: product 우선" },
    { rel: ".onto/principles/productization-charter.md", rank: 3, desc: "제품 방향" },
    { rel: ".onto/principles/llm-runtime-interface-principles.md", rank: 4, desc: "인터페이스 명세" },
    { rel: ".onto/principles/ontology-as-code-naming-charter.md", rank: 4, desc: "이름 규칙" },
    { rel: "process.md", rank: 7, desc: "운영 인프라" },
    { rel: "learning-rules.md", rank: 7, desc: "운영 인프라: 학습 규칙" },
  ];

  for (const c of candidates) {
    if (existsSync(join(projectRoot, c.rel))) {
      sources.push({ path: c.rel, rank: c.rank, description: c.desc });
    }
  }

  return sources;
}

/**
 * Parse authority hierarchy table from CLAUDE.md.
 * Looks for the "Authority 위계" table pattern.
 */
function parseAuthorityTable(content: string, projectRoot: string): Array<{ path: string; rank: number; description: string }> {
  const sources: Array<{ path: string; rank: number; description: string }> = [];
  const lines = content.split("\n");

  let inTable = false;
  for (const line of lines) {
    if (line.includes("Authority 위계") || line.includes("순위") && line.includes("역할") && line.includes("위치")) {
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith("|")) {
      const cells = line.split("|").map(c => c.trim()).filter(c => c.length > 0);
      if (cells.length >= 3) {
        const rank = parseInt(cells[0]!, 10);
        if (!isNaN(rank) && rank >= 1) {
          const desc = cells[1]!;
          const pathStr = cells[2]!;
          // Skip directory paths, glob patterns, and comma-separated lists
          if (pathStr.endsWith("/") || pathStr.includes("*") || pathStr.includes(",")) continue;
          const fullPath = join(projectRoot, pathStr);
          if (existsSync(fullPath) && !statSync(fullPath).isDirectory()) {
            sources.push({ path: pathStr, rank, description: desc });
          }
        }
      }
    } else if (inTable && !line.startsWith("|") && line.trim().length > 0 && !line.startsWith("#")) {
      break; // End of table
    }
  }

  return sources;
}

/**
 * Load authority documents as sections. Fail closed — returns errors for unreadable files.
 * All paths resolved relative to projectRoot.
 */
function loadAuthoritySections(
  sources: Array<{ path: string; rank: number; description: string }>,
  projectRoot: string,
): { sections: Array<{ id: string; title: string; content: string }>; loadErrors: string[] } {
  const sections: Array<{ id: string; title: string; content: string }> = [];
  const loadErrors: string[] = [];

  for (const s of sources) {
    const fullPath = join(projectRoot, s.path);
    try {
      const content = readFileSync(fullPath, "utf-8");
      sections.push({
        id: s.path,
        title: `[rank ${s.rank}] ${s.description}`,
        content,
      });
    } catch {
      loadErrors.push(`${s.path} (rank ${s.rank})`);
    }
  }

  return { sections, loadErrors };
}

/**
 * Resolve target document path from user input.
 * If rawInput contains a file path (ends with .md, .yaml, etc.), use it.
 * Otherwise return null (new design — target doesn't exist yet).
 */
function resolveTargetDocument(rawInput: string, projectRoot: string): string | null {
  const words = rawInput.split(/\s+/);
  for (const w of words) {
    if (/\.(md|yaml|yml|json|ts)$/.test(w)) {
      const candidate = join(projectRoot, w);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * Parse a document into sections by ## headings.
 */
function parseDocumentSections(
  docPath: string,
  content: string,
): Array<{ id: string; title: string; content: string }> {
  const sections: Array<{ id: string; title: string; content: string }> = [];
  let currentId = `${docPath}:header`;
  let currentTitle = "Header";
  let currentLines: string[] = [];

  for (const line of content.split("\n")) {
    const h2Match = line.match(/^## (.+)/);
    if (h2Match) {
      if (currentLines.length > 0) {
        sections.push({ id: currentId, title: currentTitle, content: currentLines.join("\n") });
      }
      currentId = `${docPath}:${h2Match[1]}`;
      currentTitle = h2Match[1]!;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.length > 0) {
    sections.push({ id: currentId, title: currentTitle, content: currentLines.join("\n") });
  }

  return sections;
}

/**
 * Extract rule-like statements from an authority document.
 */
function extractRulesFromContent(relativePath: string, projectRoot: string): string[] {
  try {
    const content = readFileSync(join(projectRoot, relativePath), "utf-8");
    const rules: string[] = [];

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (/\b(must|shall|required|mandatory|금지|필수|위반|허용|불가|항상|절대)\b/i.test(trimmed) &&
          trimmed.length > 10 && trimmed.length < 300) {
        rules.push(trimmed);
      }
    }

    return rules.slice(0, 20);
  } catch {
    return [];
  }
}
