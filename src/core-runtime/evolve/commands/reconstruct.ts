/**
 * reconstruct — CLI handler for the reconstruct activity (3-step bounded path).
 *
 * W-A-74 (DL-020 resolution): review 의 3-step bounded path 수준으로 reconstruct 비대칭 해소.
 *
 * Bounded surface:
 *   start    — session 초기화 + gathering_context 상태 기록
 *   explore  — 탐색 loop bounded invocation (현 단계는 placeholder — 실제 Explorer/lens
 *              loop 는 build runtime 확장과 함께 채운다)
 *   complete — ontology 초안 산출 + converted 상태 기록
 *
 * 본 handler 는 build runtime (.onto/processes/reconstruct.md) 의 public CLI face 다.
 * Bounded state 는 `{session_root}/reconstruct-state.json` 단일 파일로 관리한다 —
 * 이는 build runtime 의 완전한 state machine (RECONSTRUCT_TRANSITIONS) 과 구별되는
 * **CLI 관찰 가능 minimum surface**.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import yaml from "yaml";
import {
  type CoordinatorDeps,
  type CoordinatorInput,
  type CoordinatorResult,
  runReconstructCoordinator,
} from "../../reconstruct/coordinator.js";
import type {
  HookAlphaEntityInput,
  HookAlphaManifestInput,
} from "../../reconstruct/hook-alpha.js";
import type { Phase3UserResponses } from "../../reconstruct/phase-3-5-runtime.js";
import { buildPhase3SnapshotDocument } from "../../reconstruct/phase3-snapshot-write.js";

// ─── Types ───

export type ReconstructBoundedState =
  | "gathering_context"
  | "exploring"
  | "converted";

/**
 * Audit / lifecycle event recorded on the session. Persisted to
 * `reconstruct-state.json` so post-hoc inspection (govern reader, dashboards,
 * support) can reconstruct what happened without rerunning the cycle.
 *
 * Event kinds (extend as new audit signals land):
 *   - config_absent_default_v1_applied — coordinator emitted onConfigAbsent
 *     because `.onto/config.yml` lacked a `reconstruct:` block (silent default
 *     v1 mode applied). Mirrors PR #232 backlog A2.
 *   - config_malformed — `.onto/config.yml` root was non-object/array; explore
 *     halted before any Hook (review C-2 fail-close split).
 *   - coordinator_invariant_violation — switches violated dependency
 *     invariants (e.g. phase3_rationale_review on while v1_inference off).
 *   - coordinator_failed_alpha / failed_gamma / failed_phase35 — corresponding
 *     CoordinatorResult variants.
 *   - coordinator_completed — full v1 cycle completed; element_updates_count
 *     captured for audit.
 */
export interface ReconstructSessionEvent {
  type:
    | "config_absent_default_v1_applied"
    | "config_malformed"
    | "coordinator_invariant_violation"
    | "coordinator_failed_alpha"
    | "coordinator_failed_gamma"
    | "coordinator_failed_phase35"
    | "coordinator_completed";
  emitted_at: string; // ISO 8601 UTC
  detail?: string;
}

export interface ReconstructSessionState {
  session_id: string;
  source: string;
  intent: string;
  current_state: ReconstructBoundedState;
  created_at: string;
  last_updated_at: string;
  started_at: string;
  /** explore step 호출 횟수 — build runtime 의 round 개념 단순화 */
  explore_invocations: number;
  /** complete 시 산출될 ontology 초안 경로 (placeholder) */
  ontology_draft_path: string | null;
  /**
   * §1.4 reconstruct 완료 기준 3축 중 "Principal 검증 경로" 기록 seat.
   * complete 시에만 채워지며, 실제 검증 결과는 별도 artifact 에 저장한다.
   */
  principal_review_status: "pending" | "requested" | "passed" | "rejected";
  /**
   * Audit / lifecycle events. Append-only — never rewritten by callers.
   * Optional in the type so legacy state files (pre-caller-wire) load without
   * needing migration; missing reads as `[]`.
   */
  events?: ReconstructSessionEvent[];
}

export interface ReconstructStartOptions {
  source: string;
  intent: string;
  sessionsDir: string;
  sessionId?: string;
  now?: () => string;
}

export interface ReconstructStartResult {
  success: boolean;
  session_id: string;
  session_root: string;
  state: ReconstructSessionState;
}

export interface ReconstructStepOptions {
  sessionsDir: string;
  sessionId: string;
  now?: () => string;
}

/**
 * Optional coordinator wire input for `executeReconstructExplore`. When
 * present, explore invokes `runReconstructCoordinator` with the supplied
 * inputs + spawn dependencies; when absent, explore falls back to the v0
 * placeholder behavior (state transition + invocations++ only) for backward
 * compatibility with legacy callers.
 *
 * Caller wire scope (post-PR236, this commit): handleReconstructCli builds
 * this options block from `.onto/config.yml` + stub Stage 1 fixtures
 * (entities + manifest). Real Stage 1 entities scanner is a follow-up commit
 * (Option B series — captured in caller wire handoff doc).
 */
export interface ReconstructExploreCoordinatorOptions {
  /** parsed `.onto/config.yml` (or null when absent — coordinator emits
   *  onConfigAbsent + applies silent default v1) */
  configRaw: unknown;
  /** Stage 1 entity list — Hook α input. Empty array → α self-skips. */
  entityList: HookAlphaEntityInput[];
  /** manifest — Hook α/γ input */
  manifest: HookAlphaManifestInput;
  injectedFiles: string[];
  proposerContractVersion: string;
  /** runtime-computed canonical hashes for Hook γ */
  wipSnapshotHash: string;
  domainFilesContentHash: string;
  /** Phase 3.5 user response — caller's responsibility (UI / interactive
   *  prompt). v0 mode: caller may omit individual decisions; coordinator's
   *  switch gating handles propagation. */
  phase3Responses: Phase3UserResponses;
  phase3JudgedAt: string;
  renderedElementIds: Set<string>;
  throttledOutAddressableIds: Set<string>;
  /** caller-provided spawn deps (codex / mock / inline-http variants chosen
   *  by handleReconstructCli based on host config) */
  deps: CoordinatorDeps;
  runtimeVersion: string;
  /** propagated to Hook α meta — usually 1 for Stage 1 cycles */
  stage?: 1 | 2;
  requestedInferenceMode?: "full" | "degraded";
}

export interface ReconstructStepOptionsWithCoordinator
  extends ReconstructStepOptions {
  coordinator?: ReconstructExploreCoordinatorOptions;
}

export interface ReconstructStepResult {
  success: boolean;
  session_id: string;
  state: ReconstructSessionState;
  next_action: string;
  /** Present when explore ran a full v1 coordinator cycle. The discriminated
   *  union from `runReconstructCoordinator` is forwarded as-is so callers
   *  (e.g. raw.yml writer in a follow-up commit) can branch on `kind`. */
  coordinator_result?: CoordinatorResult;
}

// ─── Internal helpers ───

function nowIso(): string {
  return new Date().toISOString();
}

function sessionRoot(sessionsDir: string, sessionId: string): string {
  return resolve(sessionsDir, sessionId);
}

function stateFile(root: string): string {
  return join(root, "reconstruct-state.json");
}

function writeState(root: string, state: ReconstructSessionState): void {
  writeFileSync(stateFile(root), JSON.stringify(state, null, 2) + "\n", "utf-8");
}

function readState(root: string): ReconstructSessionState {
  const raw = readFileSync(stateFile(root), "utf-8");
  return JSON.parse(raw) as ReconstructSessionState;
}

function makeSessionId(now: () => string): string {
  const iso = now();
  const date = iso.slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(16).slice(2, 10);
  return `${date}-${rand}`;
}

// ─── Core API ───

/**
 * Step 1 — start: session 초기화 + gathering_context 상태 진입.
 */
export function executeReconstructStart(
  options: ReconstructStartOptions,
): ReconstructStartResult {
  const now = options.now ?? nowIso;
  const nowStr = now();

  if (options.source.trim() === "") {
    throw new Error("[reconstruct] source is required.");
  }
  if (options.intent.trim() === "") {
    throw new Error("[reconstruct] intent is required.");
  }

  const sessionId = options.sessionId ?? makeSessionId(now);
  const root = sessionRoot(options.sessionsDir, sessionId);

  if (existsSync(root)) {
    throw new Error(`[reconstruct] session already exists: ${sessionId}`);
  }

  mkdirSync(root, { recursive: true });

  const state: ReconstructSessionState = {
    session_id: sessionId,
    source: options.source,
    intent: options.intent,
    current_state: "gathering_context",
    created_at: nowStr,
    last_updated_at: nowStr,
    started_at: nowStr,
    explore_invocations: 0,
    ontology_draft_path: null,
    principal_review_status: "pending",
  };

  writeState(root, state);

  return { success: true, session_id: sessionId, session_root: root, state };
}

/**
 * Step 2 — explore: build runtime 의 탐색 loop 1회 호출.
 *
 * Two modes (selected by presence of `options.coordinator`):
 *
 *   A. **Coordinator wire mode** (caller supplies `coordinator` block) —
 *      runs `runReconstructCoordinator` with the supplied entities + manifest
 *      + spawn deps + Phase 3.5 input. Result is forwarded on
 *      `coordinator_result`. Audit signals (config_absent / config_malformed /
 *      invariant_violation / failed_*  / completed) are appended to
 *      `state.events`. State transitions to `exploring` regardless of cycle
 *      outcome (the cycle's failure does not collapse the session — only halts
 *      the current invocation; caller can re-invoke).
 *
 *   B. **Placeholder mode** (no `coordinator` option, legacy behavior) — state
 *      transitions to `exploring` and `explore_invocations` increments.
 *      Retained for backward compatibility with pre-caller-wire callers
 *      (existing unit tests, scripts that exercise the bounded surface only).
 *
 * Caller wire scope (post-PR236, this commit): `handleReconstructCli` builds
 * `coordinator` from `.onto/config.yml` + stub Stage 1 entities/manifest. Real
 * Stage 1 entities scanner + raw.yml writer integration are follow-up commits
 * (Option B series — caller wire handoff doc captures them).
 */
export async function executeReconstructExplore(
  options: ReconstructStepOptionsWithCoordinator,
): Promise<ReconstructStepResult> {
  const root = sessionRoot(options.sessionsDir, options.sessionId);
  if (!existsSync(stateFile(root))) {
    throw new Error(`[reconstruct] session not found: ${options.sessionId}`);
  }

  const state = readState(root);
  if (state.current_state === "converted") {
    throw new Error(
      `[reconstruct] session already converted. explore is not allowed after completion.`,
    );
  }

  const nowFn = options.now ?? nowIso;
  const now = nowFn();

  // ── Mode A: coordinator wire ────────────────────────────────────────────
  if (options.coordinator) {
    const coord = options.coordinator;
    const newEvents: ReconstructSessionEvent[] = [];

    // onConfigAbsent sink — appends to events (review C-1 + post-PR232 backlog A2)
    const configAbsentDeps: CoordinatorDeps = {
      ...coord.deps,
      onConfigAbsent: () => {
        // Caller may have provided their own onConfigAbsent (e.g. console.warn).
        // We still append the audit event so post-hoc inspection sees it.
        coord.deps.onConfigAbsent?.();
        newEvents.push({
          type: "config_absent_default_v1_applied",
          emitted_at: nowFn(),
          detail: "coordinator applied silent default v1 (configRaw absent)",
        });
      },
    };

    const cycleInput: CoordinatorInput = {
      configRaw: coord.configRaw,
      stage: coord.stage ?? 1,
      ...(coord.requestedInferenceMode !== undefined
        ? { requestedInferenceMode: coord.requestedInferenceMode }
        : {}),
      entityList: coord.entityList,
      manifest: coord.manifest,
      injectedFiles: coord.injectedFiles,
      sessionId: options.sessionId,
      runtimeVersion: coord.runtimeVersion,
      proposerContractVersion: coord.proposerContractVersion,
      wipSnapshotHash: coord.wipSnapshotHash,
      domainFilesContentHash: coord.domainFilesContentHash,
      phase3Responses: coord.phase3Responses,
      phase3Snapshot: buildPhase3SnapshotDocument({
        session_id: options.sessionId,
        written_at: now,
        intentInferences: new Map(),
      }),
      phase3JudgedAt: coord.phase3JudgedAt,
      renderedElementIds: coord.renderedElementIds,
      throttledOutAddressableIds: coord.throttledOutAddressableIds,
    };

    const result = await runReconstructCoordinator(cycleInput, configAbsentDeps);

    // Append result event
    switch (result.kind) {
      case "config_malformed":
        newEvents.push({
          type: "config_malformed",
          emitted_at: nowFn(),
          detail: result.detail,
        });
        break;
      case "invariant_violation":
        newEvents.push({
          type: "coordinator_invariant_violation",
          emitted_at: nowFn(),
          detail: result.violations.join(", "),
        });
        break;
      case "failed_alpha":
        newEvents.push({
          type: "coordinator_failed_alpha",
          emitted_at: nowFn(),
          detail: `alpha kind=${result.alpha.kind}`,
        });
        break;
      case "failed_gamma":
        newEvents.push({
          type: "coordinator_failed_gamma",
          emitted_at: nowFn(),
          detail: `gamma kind=${result.gamma.kind}`,
        });
        break;
      case "failed_phase35":
        newEvents.push({
          type: "coordinator_failed_phase35",
          emitted_at: nowFn(),
          detail: `${result.phase35Failure.validationFailure.code}: ${result.phase35Failure.validationFailure.detail}`,
        });
        break;
      case "completed":
        newEvents.push({
          type: "coordinator_completed",
          emitted_at: nowFn(),
          detail: `element_updates_count=${result.phase35.elementUpdates.size}, write_intent_inference_to_raw_yml=${result.writeIntentInferenceToRawYml}`,
        });
        break;
    }

    const next: ReconstructSessionState = {
      ...state,
      current_state: "exploring",
      last_updated_at: now,
      explore_invocations: state.explore_invocations + 1,
      events: [...(state.events ?? []), ...newEvents],
    };

    writeState(root, next);

    return {
      success: result.kind === "completed",
      session_id: options.sessionId,
      state: next,
      next_action:
        result.kind === "completed"
          ? "Cycle completed. Call `onto reconstruct explore` again to continue or `onto reconstruct complete` to finalize."
          : `Cycle halted (${result.kind}). Inspect state.events for detail; fix root cause and re-invoke.`,
      coordinator_result: result,
    };
  }

  // ── Mode B: placeholder (legacy backward compat) ─────────────────────────
  const next: ReconstructSessionState = {
    ...state,
    current_state: "exploring",
    last_updated_at: now,
    explore_invocations: state.explore_invocations + 1,
  };

  writeState(root, next);

  return {
    success: true,
    session_id: options.sessionId,
    state: next,
    next_action:
      "Call `onto reconstruct explore` again to continue or `onto reconstruct complete` to finalize.",
  };
}

/**
 * Step 3 — complete: ontology 초안 산출 + converted 전이 + Principal 검증 요청.
 *
 * 현 단계는 bounded: state 를 converted 로 바꾸고 ontology_draft_path 를 placeholder 로 기록.
 * Principal 검증 경로는 §1.4 reconstruct 완료 기준 축 — 향후 학습 경로와 연결.
 */
export function executeReconstructComplete(
  options: ReconstructStepOptions,
): ReconstructStepResult {
  const root = sessionRoot(options.sessionsDir, options.sessionId);
  if (!existsSync(stateFile(root))) {
    throw new Error(`[reconstruct] session not found: ${options.sessionId}`);
  }

  const state = readState(root);
  if (state.current_state === "gathering_context") {
    throw new Error(
      `[reconstruct] complete requires at least one explore invocation (current: gathering_context).`,
    );
  }
  if (state.current_state === "converted") {
    throw new Error(`[reconstruct] session already converted: ${options.sessionId}`);
  }

  // PR #241 review C-3 fix (lifecycle gate): when the session has run any
  // coordinator cycle (events array is populated), the *most recent*
  // coordinator event must be `coordinator_completed` — otherwise the cycle
  // halted (config_malformed / invariant_violation / failed_alpha / failed_gamma
  // / failed_phase35) and the session has not produced a finalizable state.
  // Sessions that ran in placeholder mode (no coordinator events) bypass
  // this gate for backward compat.
  const coordinatorEvents = (state.events ?? []).filter((e) =>
    e.type.startsWith("coordinator_") || e.type === "config_malformed",
  );
  if (coordinatorEvents.length > 0) {
    const last = coordinatorEvents[coordinatorEvents.length - 1]!;
    if (last.type !== "coordinator_completed") {
      throw new Error(
        `[reconstruct] complete requires the most recent coordinator cycle to be successful — last event was "${last.type}"${last.detail ? ` (${last.detail})` : ""}. Re-run \`onto reconstruct explore\` until a coordinator_completed cycle is recorded, then retry complete.`,
      );
    }
  }

  const now = (options.now ?? nowIso)();
  const draftPath = join(root, "ontology-draft.md");

  // Minimal placeholder artifact — 실제 ontology 는 build runtime 이 채운다.
  writeFileSync(
    draftPath,
    [
      `# Ontology draft — ${options.sessionId}`,
      "",
      `- source: ${state.source}`,
      `- intent: ${state.intent}`,
      `- explore invocations: ${state.explore_invocations}`,
      "",
      "> Placeholder draft. build runtime (.onto/processes/reconstruct.md) 이 채울 영역.",
      "> §1.4 reconstruct 완료 기준 충족 판단은 Principal 검증 경로에서 이뤄진다.",
      "",
    ].join("\n"),
    "utf-8",
  );

  const next: ReconstructSessionState = {
    ...state,
    current_state: "converted",
    last_updated_at: now,
    ontology_draft_path: draftPath,
    principal_review_status: "requested",
  };

  writeState(root, next);

  return {
    success: true,
    session_id: options.sessionId,
    state: next,
    next_action:
      "Present ontology-draft.md to Principal for verification. Update principal_review_status accordingly.",
  };
}

// ─── confirm (W-B-07: principal confirmation seat) ───

export type PrincipalVerdict = "passed" | "rejected";

export interface ReconstructConfirmOptions {
  sessionsDir: string;
  sessionId: string;
  verdict: PrincipalVerdict;
  now?: () => string;
}

export interface ReconstructConfirmResult {
  success: boolean;
  session_id: string;
  state: ReconstructSessionState;
}

export function executeReconstructConfirm(
  options: ReconstructConfirmOptions,
): ReconstructConfirmResult {
  const now = (options.now ?? (() => new Date().toISOString()))();
  const root = resolve(options.sessionsDir, options.sessionId);
  const state = readState(root);

  if (state.current_state !== "converted") {
    throw new Error(
      `Cannot confirm: session is in "${state.current_state}" state, expected "converted".`,
    );
  }
  if (state.principal_review_status !== "requested") {
    throw new Error(
      `Cannot confirm: principal_review_status is "${state.principal_review_status}", expected "requested".`,
    );
  }

  const next: ReconstructSessionState = {
    ...state,
    last_updated_at: now,
    principal_review_status: options.verdict,
  };

  writeState(root, next);

  return {
    success: true,
    session_id: options.sessionId,
    state: next,
  };
}

// ─── CLI entry ───

function readOption(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1] : undefined;
}

function nonFlagArgs(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      // skip the flag and (if present) its value
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) i++;
      continue;
    }
    out.push(a);
  }
  return out;
}

function defaultSessionsDir(projectRoot: string): string {
  return join(projectRoot, ".onto", "reconstruct");
}

// ─── Coordinator wire helpers (post-PR236 caller wire commit) ───

/**
 * Build the `ReconstructExploreCoordinatorOptions` block from CLI inputs +
 * `.onto/config.yml`. Constitutes the bridge between handleReconstructCli's
 * argument-only entry and the coordinator's typed input contract.
 *
 * Scope (this commit):
 *   - `.onto/config.yml` is read (or absent → coordinator applies silent default)
 *   - spawn deps come from spawn-proposer / spawn-reviewer factories (codex
 *     production path or `--mock` deterministic stub)
 *   - entities + manifest are *stub fixtures* — single placeholder entity
 *     pinned to the session source. Real Stage 1 entities scanner is a
 *     follow-up commit (Option B series, captured in caller wire handoff).
 *   - Phase 3 inputs are empty (coordinator's switch-gating handles the
 *     v0/v1 propagation; UI-driven user response is a future concern).
 */
function buildExploreCoordinatorOptions(args: {
  projectRoot: string;
  sessionsDir: string;
  sessionId: string;
  useMock: boolean;
}): ReconstructExploreCoordinatorOptions {
  const root = sessionRoot(args.sessionsDir, args.sessionId);
  const session = readState(root);

  // 1. Load `.onto/config.yml` (absent → null → coordinator silent default v1)
  const configPath = join(args.projectRoot, ".onto", "config.yml");
  let configRaw: unknown = null;
  if (existsSync(configPath)) {
    const text = readFileSync(configPath, "utf-8");
    try {
      configRaw = yaml.parse(text);
    } catch (e) {
      throw new Error(
        `[onto] Failed to parse .onto/config.yml: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // 2. Build spawn deps — codex (production) or mock (--mock flag)
  const deps: CoordinatorDeps = args.useMock
    ? buildMockSpawnDeps()
    : buildCodexSpawnDeps({ projectRoot: args.projectRoot, configRaw });

  // 3. Stub Stage 1 entities (1 placeholder — real scanner is follow-up)
  const stubEntity: HookAlphaEntityInput = {
    id: "STUB-001",
    type: "entity",
    name: "Placeholder",
    definition: `Stub entity for session ${args.sessionId} (real Stage 1 scanner is a follow-up commit).`,
    certainty: "ambiguous",
    source: { locations: [session.source] },
    relations_summary: [],
  };

  const stubManifest: HookAlphaManifestInput = {
    manifest_schema_version: "1.0",
    domain_name: "stub-domain",
    domain_manifest_version: "1.0.0",
    version_hash: "stub" + "0".repeat(60),
    quality_tier: "minimal",
    referenced_files: [],
  };

  // 4. Phase 3 inputs — empty (caller / UI builds real responses in future).
  //
  // UF-EVOLUTION-1 (caller responsibility on v0 fallback): When the resolved
  // switches set inference_mode = "none" (full v0 fallback), the cycle's
  // Hook α self-skips so currentInferences is empty by Phase 3.5. The caller
  // (this helper) is the *single sink* responsible for not building any
  // rationale_decisions / batch_actions in that case — the coordinator does
  // NOT auto-prune phase3Responses against the switches because the caller
  // owns the UI-driven user input contract. Empty responses (as below) are
  // the only safe default; future UI-driven callers must preserve the
  // invariant `inference_mode === "none" → no decisions / no batch_actions`.
  // See PR #236 review session 20260427-0fcb42d1 UF-EVOLUTION-1.
  const emptyPhase3Responses: Phase3UserResponses = {
    received_at: new Date().toISOString(),
    global_reply: "confirmed",
    rationale_decisions: [],
    batch_actions: [],
  };

  return {
    configRaw,
    entityList: [stubEntity],
    manifest: stubManifest,
    injectedFiles: [],
    proposerContractVersion: "1.0",
    wipSnapshotHash: "stub-wip-snapshot-hash",
    domainFilesContentHash: "stub-domain-files-content-hash",
    phase3Responses: emptyPhase3Responses,
    phase3JudgedAt: new Date().toISOString(),
    renderedElementIds: new Set(),
    throttledOutAddressableIds: new Set(),
    deps,
    runtimeVersion: "v1.0.0-caller-wire",
    stage: 1,
  };
}

/**
 * Mock spawn deps — deterministic stub for `--mock` flag and unit tests.
 * Never invokes any LLM. The mock proposer emits a single proposal with
 * outcome=`gap` (pre-canned shape; real LLM 호출 부재이므로 inferred meaning
 * 산출 불가 → gap 이 가장 honest fixture). Reviewer returns confirm.
 */
function buildMockSpawnDeps(): CoordinatorDeps {
  return {
    spawnProposer: async (input) => ({
      proposals: input.entityList.map((e) => ({
        target_element_id: e.id,
        outcome: "gap" as const,
        state_reason:
          "mock spawn — no LLM invoked (--mock flag or test fixture)",
      })),
      provenance: {
        proposed_at: new Date().toISOString(),
        proposed_by: "rationale-proposer" as const,
        proposer_contract_version: input.proposerContractVersion,
        manifest_schema_version: input.manifest.manifest_schema_version,
        domain_manifest_version: input.manifest.domain_manifest_version,
        domain_manifest_hash: input.manifest.version_hash,
        domain_quality_tier: input.manifest.quality_tier,
        session_id: input.sessionId,
        runtime_version: input.runtimeVersion,
        input_chunks: 1,
        truncated_fields: [],
        effective_injected_files: input.injectedFiles,
      },
    }),
    spawnReviewer: async () => ({
      updates: [],
      provenance: {
        reviewed_at: new Date().toISOString(),
        reviewed_by: "rationale-reviewer" as const,
        reviewer_contract_version: "1.0",
        manifest_schema_version: "1.0",
        domain_manifest_version: "1.0.0",
        domain_manifest_hash: "stub" + "0".repeat(60),
        domain_quality_tier: "minimal" as const,
        session_id: "mock",
        runtime_version: null,
        wip_snapshot_hash: "stub-wip-snapshot-hash",
        domain_files_content_hash: "stub-domain-files-content-hash",
        hash_algorithm: "yaml@2.8.2 + sha256",
        input_chunks: 1,
        truncated_fields: [],
        effective_injected_files: [],
      },
    }),
    now: () => new Date(),
    systemPurpose: "mock-spawn",
    onConfigAbsent: () => {
      console.warn(
        "[onto] reconstruct: `.onto/config.yml` absent or `reconstruct:` block missing — silent default v1 mode applied.",
      );
    },
  };
}

/**
 * Codex spawn deps — production path. Uses `makeCodexProposer` /
 * `makeCodexReviewer` (spawn-proposer.ts / spawn-reviewer.ts) with config
 * read from `.onto/config.yml`'s `codex.model` / `codex.effort` (or
 * defaults). The validator input builders are bound here so the spawn
 * factories can validate against pre-computed entity ids / manifest refs.
 *
 * Out of scope (follow-up commits):
 *   - host_runtime != "codex" branches (anthropic / openai / litellm /
 *     standalone) — currently codex-only path
 *   - retry / degraded_continue orchestration (caller-side)
 */
function buildCodexSpawnDeps(args: {
  projectRoot: string;
  configRaw: unknown;
}): CoordinatorDeps {
  // Lazy-load to avoid pulling spawn modules into the placeholder-only path.
  // Keeps `executeReconstructExplore` placeholder mode dependency-free.
  // Module is small (no side effects on import) — safe to import top-level
  // when `--no-coordinator` is not used.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { makeCodexProposer } = require("../../reconstruct/spawn-proposer.js") as typeof import("../../reconstruct/spawn-proposer.js");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { makeCodexReviewer } = require("../../reconstruct/spawn-reviewer.js") as typeof import("../../reconstruct/spawn-reviewer.js");

  const codexConfig = extractCodexConfig(args.configRaw);

  const spawnProposer = makeCodexProposer({
    projectRoot: args.projectRoot,
    sandboxMode: "read-only",
    ...(codexConfig.model !== undefined ? { model: codexConfig.model } : {}),
    ...(codexConfig.effort !== undefined
      ? { reasoningEffort: codexConfig.effort }
      : {}),
    buildValidatorInput: (input) => ({
      entityIds: input.entityList.map((e) => e.id),
      manifestReferencedFiles: input.manifest.referenced_files.map((f) => f.path),
      injectedFiles: input.injectedFiles,
      optionalFiles: new Set(
        input.manifest.referenced_files
          .filter((f) => !f.required)
          .map((f) => f.path),
      ),
      expectedManifestSchemaVersion: input.manifest.manifest_schema_version,
      expectedDomainManifestHash: input.manifest.version_hash,
    }),
  });

  const spawnReviewer = makeCodexReviewer({
    projectRoot: args.projectRoot,
    sandboxMode: "read-only",
    ...(codexConfig.model !== undefined ? { model: codexConfig.model } : {}),
    ...(codexConfig.effort !== undefined
      ? { reasoningEffort: codexConfig.effort }
      : {}),
    reviewerContractVersion: "1.0",
    buildValidatorInput: (input) => ({
      elementInferences: input.elementInferences,
      manifestReferencedFiles: input.manifest.referenced_files.map((f) => f.path),
      injectedFiles: input.injectedFiles,
      optionalFiles: new Set(
        input.manifest.referenced_files
          .filter((f) => !f.required)
          .map((f) => f.path),
      ),
      expectedManifestSchemaVersion: input.manifest.manifest_schema_version,
      expectedDomainManifestHash: input.manifest.version_hash,
      expectedWipSnapshotHash: input.wipSnapshotHash,
      expectedDomainFilesContentHash: input.domainFilesContentHash,
    }),
  });

  return {
    spawnProposer,
    spawnReviewer,
    now: () => new Date(),
    systemPurpose: "onto reconstruct (codex spawn)",
    onConfigAbsent: () => {
      console.warn(
        "[onto] reconstruct: `.onto/config.yml` absent or `reconstruct:` block missing — silent default v1 mode applied.",
      );
    },
  };
}

interface CodexHostConfig {
  model?: string;
  effort?: string;
}

function extractCodexConfig(configRaw: unknown): CodexHostConfig {
  if (configRaw === null || typeof configRaw !== "object" || Array.isArray(configRaw)) {
    return {};
  }
  const obj = configRaw as Record<string, unknown>;
  const codex = obj.codex;
  if (codex === undefined || codex === null || typeof codex !== "object" || Array.isArray(codex)) {
    return {};
  }
  const codexObj = codex as Record<string, unknown>;
  return {
    ...(typeof codexObj.model === "string" ? { model: codexObj.model } : {}),
    ...(typeof codexObj.effort === "string" ? { effort: codexObj.effort } : {}),
  };
}

export async function handleReconstructCli(
  _ontoHome: string,
  argv: string[],
): Promise<number> {
  const subcommand = argv[0];
  const subArgv = argv.slice(1);

  const projectRoot = readOption(subArgv, "project-root") ?? process.cwd();
  const sessionsDir =
    readOption(subArgv, "sessions-dir") ?? defaultSessionsDir(projectRoot);

  if (!existsSync(sessionsDir)) {
    mkdirSync(sessionsDir, { recursive: true });
  }

  switch (subcommand) {
    case "start": {
      const rest = nonFlagArgs(subArgv);
      const source = rest[0];
      const intent = rest.slice(1).join(" ").trim();
      if (!source || !intent) {
        console.error(
          "[onto] reconstruct start requires <source> and <intent>.",
        );
        console.error(
          'Example: onto reconstruct start ./src "recover domain ontology"',
        );
        return 1;
      }
      const sessionIdOpt = readOption(subArgv, "session-id");
      try {
        const result = executeReconstructStart({
          source,
          intent,
          sessionsDir,
          ...(sessionIdOpt !== undefined ? { sessionId: sessionIdOpt } : {}),
        });
        console.log(
          JSON.stringify(
            {
              status: "started",
              session_id: result.session_id,
              session_root: result.session_root,
              current_state: result.state.current_state,
              next_action:
                "Call `onto reconstruct explore --session-id <id>` to begin exploration.",
            },
            null,
            2,
          ),
        );
        return 0;
      } catch (error) {
        console.error(
          `[onto] reconstruct start error: ${error instanceof Error ? error.message : String(error)}`,
        );
        return 1;
      }
    }

    case "explore": {
      const sessionId = readOption(subArgv, "session-id");
      if (!sessionId) {
        console.error("[onto] reconstruct explore requires --session-id.");
        return 1;
      }

      // Build coordinator wire input (post-PR236 — caller wire commit).
      // CLI flags (extend as needed):
      //   --no-coordinator    fall back to v0 placeholder mode (legacy)
      //   --mock              use mock spawn (no LLM cost; for dev / dry-run)
      // Default: codex spawn (production path).
      const noCoordinator = subArgv.includes("--no-coordinator");
      const useMock = subArgv.includes("--mock");

      let coordinatorOptions:
        | ReconstructExploreCoordinatorOptions
        | undefined;
      if (!noCoordinator) {
        try {
          coordinatorOptions = buildExploreCoordinatorOptions({
            projectRoot,
            sessionsDir,
            sessionId,
            useMock,
          });
        } catch (error) {
          console.error(
            `[onto] reconstruct explore wire build error: ${error instanceof Error ? error.message : String(error)}`,
          );
          return 1;
        }
      }

      try {
        const result = await executeReconstructExplore({
          sessionsDir,
          sessionId,
          ...(coordinatorOptions ? { coordinator: coordinatorOptions } : {}),
        });

        // config_malformed: review C-2 fail-explicit UX (Option (a))
        if (result.coordinator_result?.kind === "config_malformed") {
          console.error(
            `[onto] Malformed config: ${result.coordinator_result.detail}.`,
          );
          console.error(
            "       Edit `.onto/config.yml` to fix the root structure (must be a YAML mapping), then retry.",
          );
          return 1;
        }
        console.log(JSON.stringify({ status: "explored", ...result }, null, 2));
        return result.success ? 0 : 1;
      } catch (error) {
        console.error(
          `[onto] reconstruct explore error: ${error instanceof Error ? error.message : String(error)}`,
        );
        return 1;
      }
    }

    case "complete": {
      const sessionId = readOption(subArgv, "session-id");
      if (!sessionId) {
        console.error("[onto] reconstruct complete requires --session-id.");
        return 1;
      }
      try {
        const result = executeReconstructComplete({ sessionsDir, sessionId });
        console.log(JSON.stringify({ status: "completed", ...result }, null, 2));
        return 0;
      } catch (error) {
        console.error(
          `[onto] reconstruct complete error: ${error instanceof Error ? error.message : String(error)}`,
        );
        return 1;
      }
    }

    case "confirm": {
      const sessionId = readOption(subArgv, "session-id");
      const verdict = readOption(subArgv, "verdict");
      if (!sessionId || !verdict) {
        console.error(
          "[onto] reconstruct confirm requires --session-id and --verdict (passed|rejected).",
        );
        return 1;
      }
      if (verdict !== "passed" && verdict !== "rejected") {
        console.error(
          `[onto] Invalid verdict: "${verdict}". Must be "passed" or "rejected".`,
        );
        return 1;
      }
      try {
        const result = executeReconstructConfirm({
          sessionsDir,
          sessionId,
          verdict,
        });
        console.log(
          JSON.stringify(
            {
              status: "confirmed",
              verdict: result.state.principal_review_status,
              session_id: result.session_id,
            },
            null,
            2,
          ),
        );
        return 0;
      } catch (error) {
        console.error(
          `[onto] reconstruct confirm error: ${error instanceof Error ? error.message : String(error)}`,
        );
        return 1;
      }
    }

    case "--help":
    case "-h":
    case undefined:
      console.log(
        [
          "Usage: onto reconstruct <subcommand> [options]",
          "",
          "Subcommands:",
          "  start <source> <intent>     Initialize a reconstruct session",
          "  explore --session-id <id>    Run one exploration invocation (bounded)",
          "  complete --session-id <id>   Finalize ontology draft + request Principal review",
          "  confirm --session-id <id> --verdict passed|rejected",
          "                               Record Principal verification result",
          "",
          "Options:",
          "  --project-root <path>        Project root (default: cwd)",
          "  --sessions-dir <path>         Sessions directory (default: <project-root>/.onto/reconstruct)",
          "  --session-id <id>            Custom session id (start only)",
          "",
          "Bounded path (review 3-step 대응):",
          "  start → explore (1+ times) → complete → confirm",
          "",
          "State is persisted at {session_root}/reconstruct-state.json.",
          "The process contract is .onto/processes/reconstruct.md (activity=reconstruct, process_name=build).",
        ].join("\n"),
      );
      return 0;

    default:
      console.error(
        `[onto] Unknown reconstruct subcommand: ${subcommand}`,
      );
      console.error("Run 'onto reconstruct --help' for usage.");
      return 1;
  }
}
