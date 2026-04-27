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
//
//   v1_inference == false (full v0 fallback)
//     - Invariant 가 phase3_rationale_review == false 와 write_intent_inference_to_raw_yml
//       == false 도 강제 (둘 중 하나라도 true 이면 boot 시 invariant_violation halt).
//     - inferenceMode = "none" 으로 매핑.
//     - Hook α 는 invocation 발생하되 inference_mode == "none" 으로 자체 skip
//       (alpha_skipped) — spawnProposer 호출 안 됨.
//     - Hook γ 는 phase3_rationale_review == false 강제 효과로 *coordinator-level
//       invocation skip* (gamma: kind="skipped_by_switch") — Hook γ 의 자체
//       inference_mode_none / alpha_skipped self-skip path 와 결합되지 않는다
//       (coordinator 가 그 전 단계에서 차단).
//     - Hook δ 미호출 (v1_inference off → coordinator 가 dispatch step skip).
//
//   v1_inference == true + phase3_rationale_review == false (v1 without review)
//     - inferenceMode = requestedInferenceMode ?? "full".
//     - Hook α 정상 실행.
//     - Hook γ 는 coordinator-level invocation skip (skipped_by_switch).
//       spawnReviewer 호출 안 됨.
//     - Hook δ 정상 실행 (v1_inference on).
//
//   write_intent_inference_to_raw_yml == false
//     - Phase 3.5 결과의 raw.yml save 시 element-level intent_inference block
//       omit. coordinator 는 result.writeIntentInferenceToRawYml = false 만
//       propagate — raw.yml writer (out of this commit's scope) 의 책임.
//
// Failure surface (CoordinatorResult discriminated union):
//   invariant_violation — switches 간 dependency 위반 시 halt before any Hook
//   config_malformed    — `.onto/config.yml` root 가 non-object/array 일 때 halt
//                         before any Hook (review C-2 fix — absent vs malformed
//                         distinction). configRaw 자체가 null/undefined 인
//                         경우는 absent path → silent default + onConfigAbsent 신호.
//   failed_alpha / failed_gamma / failed_phase35 — 각 단계의 fail/illegal_invocation
//                         반환 시 그 시점에서 halt (subsequent step 진입 안 함)
//
// Remaining production wiring scope (본 commit 밖, future 별도 commit — review CC-1):
//   1. Production caller — reconstruct.md prompt 가 본 entry 호출 (또는
//                          cli/reconstruct-invoke.ts 신설). 본 commit 까지는
//                          unit test 만 caller.
//   2. onConfigAbsent log sink — caller 가 console.warn 또는 session-log 에
//                          `reconstruct_config_absent_default_v1_applied` emit.
//   3. raw.yml writer 의 writeIntentInferenceToRawYml consumption — Phase 3.5
//                          이후 raw.yml save 단계에서 본 flag 따라 element-level
//                          intent_inference block omit.
//   4. config_malformed caller halt — caller 가 본 result kind 에 대해 적절한
//                          UX (e.g., interactive recovery prompt, halt with
//                          explicit error code) 정의.

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
      kind: "config_malformed";
      /** Human-readable detail of the malformed shape (e.g. "root must be an
       *  object, got array"). Caller's responsibility to surface to the
       *  principal — coordinator does not emit `onConfigAbsent` for this case
       *  because malformed != absent (review C-2 fail-close split). */
      detail: string;
    }
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
  // extractReconstructBlock 는 malformed root (non-object/array) 시 throw —
  // absent (configRaw == null/undefined) 와 fail-close 분리 (review C-2 fix).
  let reconstructBlock: unknown;
  try {
    reconstructBlock = extractReconstructBlock(input.configRaw);
  } catch (e) {
    return {
      kind: "config_malformed",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
  const switches = loadReconstructDogfoodSwitches(reconstructBlock);
  const inv = checkSwitchInvariants(switches);
  if (!inv.ok) {
    return { kind: "invariant_violation", switches, violations: inv.violations };
  }

  // 2. Silent-default audit signal (configuration.md §4.11 (c) r4).
  //    Fired only for *absent* config — malformed config above already returned
  //    config_malformed and never reaches this point.
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
 *
 * Behavior contract (review C-2 fail-close split):
 *   - configRaw === null/undefined  → returns `undefined` (absent path; coordinator
 *     applies silent default v1 + emits onConfigAbsent audit signal)
 *   - configRaw is a non-array object → returns the `reconstruct` field as-is
 *     (which itself may be undefined → still absent path for the sub-block).
 *   - configRaw is an array OR scalar (string/number/boolean) → throws TypeError
 *     (malformed path; coordinator returns kind=config_malformed). Distinct
 *     from absent so audit + caller UX can fail-explicit instead of silently
 *     applying v1 default. Mirrors loadReconstructDogfoodSwitches's TypeError
 *     contract for non-object reconstruct sub-blocks.
 */
function extractReconstructBlock(configRaw: unknown): unknown {
  if (configRaw === null || configRaw === undefined) return undefined;
  if (typeof configRaw !== "object" || Array.isArray(configRaw)) {
    const observed = Array.isArray(configRaw) ? "array" : typeof configRaw;
    throw new TypeError(
      `.onto/config.yml root must be an object, got ${observed}`,
    );
  }
  return (configRaw as Record<string, unknown>).reconstruct;
}
