// runtime-mirror-of: step-3-rationale-reviewer §6.2 + §3.2~§3.6 + §3.7.2
//
// Hook γ — Rationale Reviewer runtime (W-A-89).
//
// Single-shot invocation (Step 2 §6.2 mirror): caller (Runtime Coordinator)
// orchestrates retry / degraded_continue / abort flow. Hook γ's responsibility
// per call is precondition gating → spawn → validate → apply → state
// transition. Principal-mediated decisions live in caller via
// applyStep2cTransitionEvent.
//
// Persistence boundary: in-memory result; caller persists wip.yml + the
// returned step2c state transition.
//
// Key differences from Hook α:
//   - selective partial output (variable-length updates, even 0)
//   - 5 operations (Hook α has 4 outcomes)
//   - directive-absent elements: runtime does NOT modify them
//   - element-level provenance schema is richer (§3.7.2): gate_count 1 vs 2

import {
  applyStep2cTransitionEvent,
  RESUMABLE_HOOK_GAMMA_STATES,
  type Step2cReviewState,
} from "./step2c-review-state.js";
import {
  validateReviewerDirective,
  type ReviewerRejectCode,
  type ReviewerDowngradeWarning,
  type ReviewerValidatorInput,
} from "./reviewer-directive-validator.js";
import type {
  ReviewerDirective,
  ReviewerUpdate,
} from "./reviewer-directive-types.js";
import type {
  IntentInference,
  IntentInferenceProvenance,
} from "./wip-element-types.js";
import type { StageTransitionState } from "./stage-transition-state.js";

export interface HookGammaInput {
  meta: {
    step2c_review_state: Step2cReviewState;
    step2c_review_retry_count: number;
    inference_mode: "full" | "degraded" | "none";
    stage_transition_state: StageTransitionState;
  };
  /** wip.yml elements id → 기존 intent_inference */
  elementInferences: Map<string, IntentInference | undefined>;
  manifest: {
    manifest_schema_version: string;
    domain_manifest_version: string;
    version_hash: string;
    quality_tier: "full" | "partial" | "minimal";
    referenced_files: { path: string; required: boolean }[];
  };
  /** 실제 prompt 에 주입된 path subset */
  injectedFiles: string[];
  /** runtime-computed canonical wip_snapshot_hash */
  wipSnapshotHash: string;
  /** runtime-computed canonical domain_files_content_hash */
  domainFilesContentHash: string;
}

export interface HookGammaDeps {
  /** spawn Reviewer agent (LLM call in production, mock in tests) */
  spawnReviewer(input: ReviewerInputPackage): Promise<ReviewerDirective>;
}

export interface ReviewerInputPackage {
  // Note: actual prompt construction is the caller's responsibility; this
  // package is what Hook γ hands off. All fields mirror Step 3 §2.1.
  elementInferences: Map<string, IntentInference | undefined>;
  manifest: HookGammaInput["manifest"];
  injectedFiles: string[];
  wipSnapshotHash: string;
  domainFilesContentHash: string;
}

export type HookGammaResult =
  | {
      kind: "skipped";
      nextState: "gamma_skipped";
      reason: "inference_mode_none" | "alpha_skipped" | "alpha_failed_continued_v0";
    }
  | {
      kind: "completed";
      nextState: "gamma_completed";
      /** Map of element_id → updated intent_inference. Directive-absent
       *  elements are NOT in the map (caller leaves them unchanged). */
      elementUpdates: Map<string, IntentInference>;
      warnings: ReviewerDowngradeWarning[];
    }
  | {
      kind: "failed";
      nextState: "gamma_failed_retry_pending";
      reject: { code: ReviewerRejectCode | "spawn_failure"; detail: string };
    }
  | {
      kind: "illegal_invocation";
      reason: string;
    };

/**
 * Step 3 §6.2 step 2c-precondition: skip 결정.
 *   - inference_mode == "none" → skip
 *   - stage_transition_state ∈ {alpha_skipped, alpha_failed_continued_v0} → skip
 */
export function shouldSkipHookGamma(
  input: HookGammaInput,
): null | "inference_mode_none" | "alpha_skipped" | "alpha_failed_continued_v0" {
  if (input.meta.inference_mode === "none") return "inference_mode_none";
  if (input.meta.stage_transition_state === "alpha_skipped") return "alpha_skipped";
  if (input.meta.stage_transition_state === "alpha_failed_continued_v0") {
    return "alpha_failed_continued_v0";
  }
  return null;
}

export async function runHookGamma(
  input: HookGammaInput,
  deps: HookGammaDeps,
): Promise<HookGammaResult> {
  if (!RESUMABLE_HOOK_GAMMA_STATES.has(input.meta.step2c_review_state)) {
    return {
      kind: "illegal_invocation",
      reason: `state ${input.meta.step2c_review_state} not in resumable set`,
    };
  }

  // skip precondition
  const skipReason = shouldSkipHookGamma(input);
  if (skipReason !== null) {
    if (input.meta.step2c_review_state === "pre_gamma") {
      const t = applyStep2cTransitionEvent("pre_gamma", "precondition_skip");
      void t; // legality check already performed
      return {
        kind: "skipped",
        nextState: "gamma_skipped",
        reason: skipReason,
      };
    }
    return {
      kind: "illegal_invocation",
      reason: `precondition_skip valid only from pre_gamma, not ${input.meta.step2c_review_state}`,
    };
  }

  // spawn Reviewer
  let directive: ReviewerDirective;
  try {
    directive = await deps.spawnReviewer({
      elementInferences: input.elementInferences,
      manifest: input.manifest,
      injectedFiles: input.injectedFiles,
      wipSnapshotHash: input.wipSnapshotHash,
      domainFilesContentHash: input.domainFilesContentHash,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return {
      kind: "failed",
      nextState: "gamma_failed_retry_pending",
      reject: { code: "spawn_failure", detail },
    };
  }

  // validate directive
  const optionalFiles = new Set(
    input.manifest.referenced_files
      .filter((f) => !f.required)
      .map((f) => f.path),
  );
  const validatorInput: ReviewerValidatorInput = {
    elementInferences: input.elementInferences,
    manifestReferencedFiles: input.manifest.referenced_files.map((f) => f.path),
    injectedFiles: input.injectedFiles,
    optionalFiles,
    expectedManifestSchemaVersion: input.manifest.manifest_schema_version,
    expectedDomainManifestHash: input.manifest.version_hash,
    expectedWipSnapshotHash: input.wipSnapshotHash,
    expectedDomainFilesContentHash: input.domainFilesContentHash,
  };
  const validation = validateReviewerDirective(directive, validatorInput);
  if (!validation.ok) {
    return {
      kind: "failed",
      nextState: "gamma_failed_retry_pending",
      reject: { code: validation.code, detail: validation.detail },
    };
  }

  // atomic apply per operation
  const elementUpdates = new Map<string, IntentInference>();
  for (const update of validation.directive.updates) {
    const prior = input.elementInferences.get(update.target_element_id);
    const next = applyOperation(update, prior, validation.directive);
    elementUpdates.set(update.target_element_id, next);
  }

  return {
    kind: "completed",
    nextState: "gamma_completed",
    elementUpdates,
    warnings: validation.warnings,
  };
}

/**
 * Per-operation apply rule (§3.2~§3.6 + §3.1.1 common provenance-3 + §3.7.2
 * gate_count rule).
 *
 * - confirm: provenance-3 only (no field change)
 * - revise: replace 4 fields + rationale_state="reviewed" + state_reason=null
 * - mark_domain_scope_miss: rationale_state="domain_scope_miss" + state_reason
 *   + null-clear inferred/justification/confidence + domain_refs replace if
 *   field present (empty array OK), preserve if absent
 * - mark_domain_pack_incomplete: rationale_state="domain_pack_incomplete" +
 *   state_reason + domain_refs replace + null-clear
 * - populate_stage2_rationale: full populate + rationale_state="reviewed" +
 *   provenance.proposed_by="rationale-reviewer" + gate_count=1
 *
 * gate_count rule (§3.7.2):
 *   - confirm/revise/mark_*: prior gate_count (1) → 2
 *   - populate_stage2_rationale: 1 (single-gate)
 */
function applyOperation(
  update: ReviewerUpdate,
  prior: IntentInference | undefined,
  directive: ReviewerDirective,
): IntentInference {
  const provenance3 = {
    reviewed_at: directive.provenance.reviewed_at,
    reviewed_by: "rationale-reviewer" as const,
    reviewer_contract_version: directive.provenance.reviewer_contract_version,
  };

  if (update.operation === "confirm") {
    if (!prior) throw new Error("invariant: confirm requires prior inference");
    return {
      ...prior,
      provenance: {
        ...prior.provenance,
        ...provenance3,
        gate_count: incrementGateCount(prior.provenance.gate_count),
      },
    };
  }

  if (update.operation === "revise") {
    if (!prior) throw new Error("invariant: revise requires prior inference");
    return {
      rationale_state: "reviewed",
      inferred_meaning: update.new_inferred_meaning,
      justification: update.new_justification,
      domain_refs: update.new_domain_refs,
      confidence: update.new_confidence,
      provenance: {
        ...prior.provenance,
        ...provenance3,
        gate_count: incrementGateCount(prior.provenance.gate_count),
      },
    };
  }

  if (update.operation === "mark_domain_scope_miss") {
    if (!prior) throw new Error("invariant: mark_domain_scope_miss requires prior");
    const next: IntentInference = {
      rationale_state: "domain_scope_miss",
      state_reason: update.state_reason,
      provenance: {
        ...prior.provenance,
        ...provenance3,
        gate_count: incrementGateCount(prior.provenance.gate_count),
      },
    };
    // domain_refs: present (incl. empty array) → replace; absent → preserve
    if (update.new_domain_refs !== undefined) {
      next.domain_refs = update.new_domain_refs;
    } else if (prior.domain_refs !== undefined) {
      next.domain_refs = prior.domain_refs;
    }
    return next;
  }

  if (update.operation === "mark_domain_pack_incomplete") {
    if (!prior)
      throw new Error("invariant: mark_domain_pack_incomplete requires prior");
    return {
      rationale_state: "domain_pack_incomplete",
      state_reason: update.state_reason,
      domain_refs: update.new_domain_refs,
      provenance: {
        ...prior.provenance,
        ...provenance3,
        gate_count: incrementGateCount(prior.provenance.gate_count),
      },
    };
  }

  // populate_stage2_rationale: brand-new inference for an empty element.
  // proposed_by becomes "rationale-reviewer" (§3.6 r2 C-5 option A).
  // We need a session-level provenance derived from the directive — caller
  // passes the parts that aren't on the directive (session_id / runtime_version
  // / etc.) via input.elementInferences (priorless populate path) — but since
  // prior is empty/undefined, we must build provenance from the directive.
  const newProvenance: IntentInferenceProvenance = {
    proposed_at: directive.provenance.reviewed_at, // 동일 timestamp
    proposed_by: "rationale-reviewer" as IntentInferenceProvenance["proposed_by"],
    proposer_contract_version: directive.provenance.reviewer_contract_version,
    manifest_schema_version: directive.provenance.manifest_schema_version,
    domain_manifest_version: directive.provenance.domain_manifest_version,
    domain_manifest_hash: directive.provenance.domain_manifest_hash,
    domain_quality_tier: directive.provenance.domain_quality_tier,
    session_id: directive.provenance.session_id,
    runtime_version: directive.provenance.runtime_version ?? "",
    input_chunks: directive.provenance.input_chunks,
    truncated_fields: directive.provenance.truncated_fields,
    effective_injected_files: directive.provenance.effective_injected_files,
    gate_count: 1, // populate_stage2_rationale → single-gate
    ...provenance3,
  };
  return {
    rationale_state: "reviewed",
    inferred_meaning: update.new_inferred_meaning,
    justification: update.new_justification,
    domain_refs: update.new_domain_refs,
    confidence: update.new_confidence,
    provenance: newProvenance,
  };
}

/**
 * gate_count increment (§3.7.2):
 *   - prior 1 (single-gate, Hook α 만 거침) → 2 (two-gate, Hook γ explicit)
 *   - prior 2 (이미 increment 됨) → 2 유지 (Hook γ 재진입 시 결과 idempotent)
 *   - legacy (undefined) → 2 (Hook γ explicit)
 */
function incrementGateCount(prior: number | undefined): number {
  if (prior === undefined || prior < 1) return 2;
  if (prior >= 2) return prior;
  return 2;
}
