// runtime-mirror-of: step-4-integration §8.2 §8.3 + configuration.md §4.11 (d)
//                    + INTEGRATION.md "Production wiring 책임" + dogfood-switches.ts CONTRACT
//
// Reconstruct deterministic Coordinator (Track B post-PR232 wire commit).
//
// CONTRACT (4 mirror seats post-this-commit, 동일 sentence):
//   `coordinator.ts` 의 `runReconstructCoordinator()` 가 reconstruct v1 cycle
//   의 *deterministic spec entry* — boot 시 `.onto/config.yml` 의
//   `reconstruct:` block read + `loadReconstructDogfoodSwitches()` +
//   `checkSwitchInvariants()` halt + Hook α / γ / δ + Phase 3.5 dispatch with
//   switch gating (v1_inference / phase3_rationale_review /
//   write_intent_inference_to_raw_yml) 의 single-shot full cycle 을 spec
//   shape 로 정의. Caller-side wire (reconstruct.md prompt 가 본 entry 호출
//   하는 production path) 는 *별도 commit scope* — 본 commit 단계에서는
//   coordinator + unit test 가 wire shape 의 contract layer.
//
// Mirror seats (review 가 어느 surface 를 봐도 동일 contract):
//   1. `.onto/config.yml` reconstruct: block 위 CONTRACT comment
//   2. `dogfood-switches.ts` 파일 header CONTRACT block
//   3. `.onto/processes/configuration.md` §4.11 (d)
//   4. `src/core-runtime/reconstruct/INTEGRATION.md` Production wiring section
//
// §14.6 invariant 4점 (govern):
//   1. dogfood off 가능       — switch off → Hook 호출 0회 (invariant 2 와 결합)
//   2. 들어내기 용이          — coordinator 모두 reconstruct/ 안 → 디렉토리 삭제로 v0 복귀
//   3. govern reader 친화     — coordinator 가 inference_mode 를 정확히 set (raw.yml writer 가 consume)
//   4. 본질 sink ≠ dogfood sink — coordinator 는 dogfood sink. wip 본질 sink 영향 없음
//
// Switch gating 의 효과 (Step 4 §8.3 + configuration.md §4.11 partial mode 표):
//   v1_inference         == false → inference_mode = "none" 으로 매핑.
//                                    Hook α 가 자체 skip (alpha_skipped),
//                                    Hook γ 가 자체 skip (gamma_skipped), Hook δ skip
//   phase3_rationale_review == false → Hook γ invoke 자체 skip (skipped_by_switch).
//                                    Hook α 는 정상 실행 (v1_inference == true 전제)
//   write_intent_inference_to_raw_yml == false → Phase 3.5 결과의 raw.yml save 시
//                                    element-level intent_inference omit. coordinator
//                                    는 flag 만 propagate (raw.yml writer 의 책임)

import {
  checkSwitchInvariants,
  loadReconstructDogfoodSwitches,
  type ReconstructDogfoodSwitches,
  type SwitchInvariantViolation,
} from "./dogfood-switches.js";
import {
  type HookAlphaDeps,
  type HookAlphaEntityInput,
  type HookAlphaManifestInput,
  type HookAlphaResult,
  runHookAlpha,
} from "./hook-alpha.js";
import {
  type HookGammaDeps,
  type HookGammaResult,
  runHookGamma,
} from "./hook-gamma.js";
import {
  type HookDeltaResult,
  type PendingElement,
  runHookDelta,
} from "./hook-delta.js";
import {
  type Phase3UserResponses,
  type Phase35RuntimeResult,
  runPhase35,
} from "./phase-3-5-runtime.js";
import type { Phase3SnapshotDocument } from "./phase3-snapshot-write.js";
import type { IntentInference } from "./wip-element-types.js";

// ============================================================================
// Coordinator I/O types
// ============================================================================

export interface CoordinatorInput {
  /** raw `.onto/config.yml` parsed object (or null/undefined when absent) */
  configRaw: unknown;
  /** Hook α stage + caller's requested inference mode (only honored when
   *  v1_inference switch is on; switch=false forces "none"). */
  stage: 1 | 2;
  requestedInferenceMode?: "full" | "degraded";
  // Hook α inputs
  entityList: HookAlphaEntityInput[];
  manifest: HookAlphaManifestInput;
  injectedFiles: string[];
  sessionId: string;
  runtimeVersion: string;
  proposerContractVersion: string;
  // Hook γ inputs (runtime-computed canonical hashes — coordinator forwards as-is)
  wipSnapshotHash: string;
  domainFilesContentHash: string;
  // Phase 3.5 inputs (single-shot cycle: caller already has user responses)
  phase3Responses: Phase3UserResponses;
  phase3Snapshot: Phase3SnapshotDocument;
  phase3JudgedAt: string;
  renderedElementIds: Set<string>;
  throttledOutAddressableIds: Set<string>;
}

export interface CoordinatorDeps {
  spawnProposer: HookAlphaDeps["spawnProposer"];
  spawnReviewer: HookGammaDeps["spawnReviewer"];
  now: HookAlphaDeps["now"];
  systemPurpose: HookAlphaDeps["systemPurpose"];
  /**
   * Optional emit hook for the silent-default audit signal
   * `reconstruct_config_absent_default_v1_applied`. Fired when configRaw is
   * null/undefined OR `reconstruct:` block is absent. Caller logs to
   * console.warn / session-log per configuration.md §4.11 (c) r4 strengthening
   * (post-PR232 backlog A2 — config-absent silent-default emit).
   */
  onConfigAbsent?: () => void;
}

/** Synthetic skip marker — distinct from Hook γ's own `skipped` (which carries
 *  a reason enum bound to inference_mode/state propagation). Coordinator emits
 *  this when the `phase3_rationale_review` switch gates the invocation off. */
export interface GammaSkippedBySwitch {
  kind: "skipped_by_switch";
  reason: "phase3_rationale_review_disabled";
}

export type CoordinatorResult =
  | {
      kind: "invariant_violation";
      switches: ReconstructDogfoodSwitches;
      violations: SwitchInvariantViolation[];
    }
  | {
      kind: "failed_alpha";
      switches: ReconstructDogfoodSwitches;
      alpha: HookAlphaResult;
    }
  | {
      kind: "failed_gamma";
      switches: ReconstructDogfoodSwitches;
      alpha: HookAlphaResult;
      gamma: HookGammaResult;
    }
  | {
      kind: "failed_phase35";
      switches: ReconstructDogfoodSwitches;
      alpha: HookAlphaResult;
      gamma: HookGammaResult | GammaSkippedBySwitch;
      delta: HookDeltaResult | null;
      phase35Failure: Extract<Phase35RuntimeResult, { ok: false }>;
    }
  | {
      kind: "completed";
      switches: ReconstructDogfoodSwitches;
      alpha: HookAlphaResult;
      gamma: HookGammaResult | GammaSkippedBySwitch;
      delta: HookDeltaResult | null;
      phase35: Extract<Phase35RuntimeResult, { ok: true }>;
      /** Mirrors switches.write_intent_inference_to_raw_yml.enabled. raw.yml
       *  writer (downstream) consumes this flag to omit element-level
       *  intent_inference block when false. */
      writeIntentInferenceToRawYml: boolean;
    };

// ============================================================================
// Coordinator entry
// ============================================================================

/**
 * Single-shot full v1 cycle dispatch with deterministic switch gating.
 *
 * Contract:
 *   1. Load + invariant-check switches from configRaw (`.onto/config.yml`
 *      parsed object). Invariant violation → halt with `invariant_violation`.
 *   2. Emit `onConfigAbsent` audit signal when `.onto/config.yml` or its
 *      `reconstruct:` block is missing (silent-default v1 ON applied).
 *   3. Map switches → effective inference_mode:
 *        v1_inference == false → inference_mode = "none" (Hook α/γ self-skip).
 *        v1_inference == true  → inference_mode = requestedInferenceMode ?? "full".
 *   4. Dispatch Hook α with the resolved mode.
 *   5. Dispatch Hook γ if phase3_rationale_review is on; otherwise emit
 *      `skipped_by_switch`. (Hook γ also self-skips when inference_mode == "none"
 *      or alpha state propagates skip — switch gating is the outermost layer.)
 *   6. Dispatch Hook δ when v1_inference is on (rendering does not happen in
 *      v0 mode). Hook δ does not consume a switch directly.
 *   7. Dispatch Phase 3.5 (validate → apply → sweep) over the merged α+γ
 *      inferences.
 *   8. Surface `writeIntentInferenceToRawYml` so the raw.yml writer (out of
 *      this commit's scope) honors the third switch.
 *
 * Caller wire (reconstruct.md prompt invoking this entry from production)
 * remains a *separate commit*. This function is the spec contract for that
 * future wire.
 */
export async function runReconstructCoordinator(
  input: CoordinatorInput,
  deps: CoordinatorDeps,
): Promise<CoordinatorResult> {
  // 1. Boot — load + invariant
  const reconstructBlock = extractReconstructBlock(input.configRaw);
  const switches = loadReconstructDogfoodSwitches(reconstructBlock);
  const inv = checkSwitchInvariants(switches);
  if (!inv.ok) {
    return { kind: "invariant_violation", switches, violations: inv.violations };
  }

  // 2. Silent-default audit signal (configuration.md §4.11 (c) r4)
  if (reconstructBlock === undefined) {
    deps.onConfigAbsent?.();
  }

  // 3. Switch → inference_mode mapping
  const inferenceMode: "full" | "degraded" | "none" =
    switches.v1_inference.enabled
      ? (input.requestedInferenceMode ?? "full")
      : "none";

  // 4. Hook α
  const alpha = await runHookAlpha(
    {
      meta: {
        stage_transition_state: "pre_alpha",
        stage_transition_retry_count: 0,
        inference_mode: inferenceMode,
        stage: input.stage,
      },
      entityList: input.entityList,
      manifest: input.manifest,
      injectedFiles: input.injectedFiles,
      sessionId: input.sessionId,
      runtimeVersion: input.runtimeVersion,
      proposerContractVersion: input.proposerContractVersion,
    },
    {
      spawnProposer: deps.spawnProposer,
      now: deps.now,
      systemPurpose: deps.systemPurpose,
    },
  );

  if (alpha.kind === "failed" || alpha.kind === "illegal_invocation") {
    return { kind: "failed_alpha", switches, alpha };
  }

  const alphaInferences: Map<string, IntentInference> =
    alpha.kind === "completed" ? alpha.elementUpdates : new Map();

  // 5. Hook γ — gated by phase3_rationale_review switch
  let gamma: HookGammaResult | GammaSkippedBySwitch;
  let mergedInferences: Map<string, IntentInference> = alphaInferences;

  if (switches.phase3_rationale_review.enabled) {
    const stageTransitionState =
      alpha.kind === "completed" ? "alpha_completed" : "alpha_skipped";
    gamma = await runHookGamma(
      {
        meta: {
          step2c_review_state: "pre_gamma",
          step2c_review_retry_count: 0,
          inference_mode: inferenceMode,
          stage_transition_state: stageTransitionState,
        },
        elementInferences: alphaInferences,
        manifest: {
          manifest_schema_version: input.manifest.manifest_schema_version,
          domain_manifest_version: input.manifest.domain_manifest_version,
          version_hash: input.manifest.version_hash,
          quality_tier: input.manifest.quality_tier,
          referenced_files: input.manifest.referenced_files,
        },
        injectedFiles: input.injectedFiles,
        wipSnapshotHash: input.wipSnapshotHash,
        domainFilesContentHash: input.domainFilesContentHash,
      },
      { spawnReviewer: deps.spawnReviewer },
    );

    if (gamma.kind === "failed" || gamma.kind === "illegal_invocation") {
      return { kind: "failed_gamma", switches, alpha, gamma };
    }

    if (gamma.kind === "completed") {
      // Merge α + γ updates (γ overwrites α for the same element)
      mergedInferences = new Map(alphaInferences);
      for (const [id, inf] of gamma.elementUpdates) {
        mergedInferences.set(id, inf);
      }
    }
  } else {
    gamma = {
      kind: "skipped_by_switch",
      reason: "phase3_rationale_review_disabled",
    };
  }

  // 6. Hook δ — invoked only when v1_inference is on
  let delta: HookDeltaResult | null = null;
  if (switches.v1_inference.enabled) {
    const pending: PendingElement[] = [...mergedInferences.entries()].map(
      ([id, inf]) => ({
        element_id: id,
        intent_inference: inf,
        added_in_stage: input.stage,
      }),
    );
    delta = runHookDelta(pending, [], false);
  }

  // 7. Phase 3.5 — validate → apply → sweep
  const phase35 = runPhase35({
    responses: input.phase3Responses,
    currentInferences: mergedInferences,
    judgedAt: input.phase3JudgedAt,
    snapshot: input.phase3Snapshot,
    renderedElementIds: input.renderedElementIds,
    throttledOutAddressableIds: input.throttledOutAddressableIds,
  });

  if (!phase35.ok) {
    return {
      kind: "failed_phase35",
      switches,
      alpha,
      gamma,
      delta,
      phase35Failure: phase35,
    };
  }

  return {
    kind: "completed",
    switches,
    alpha,
    gamma,
    delta,
    phase35,
    writeIntentInferenceToRawYml: switches.write_intent_inference_to_raw_yml.enabled,
  };
}

/**
 * Extract `reconstruct:` sub-block from a parsed `.onto/config.yml` object.
 * Returns `undefined` when configRaw is null/undefined OR its `reconstruct`
 * field is absent. Returns the raw value (loader will throw on shape errors).
 */
function extractReconstructBlock(configRaw: unknown): unknown {
  if (configRaw === null || configRaw === undefined) return undefined;
  if (typeof configRaw !== "object" || Array.isArray(configRaw)) return undefined;
  return (configRaw as Record<string, unknown>).reconstruct;
}
