// runtime-mirror-of: step-2-rationale-proposer §6.2 + §3.7 + §6.3.1
//
// Hook α — Rationale Proposer runtime (W-A-88).
//
// Single-shot invocation: caller (Runtime Coordinator) orchestrates retry
// flow. Hook α's responsibility per call is precondition gating → spawn →
// validate → apply → state transition. Principal-mediated decisions
// (retry / v0_switch / abort) live in the caller; this module exposes
// `applyStageTransitionEvent` for the caller to record those.
//
// Persistence boundary: Hook α produces an in-memory `HookAlphaResult` —
// atomic fsync of wip.yml is the caller's responsibility (paired with the
// next state's `setMetaStage` value).

import {
  applyStageTransitionEvent,
  RESUMABLE_HOOK_ALPHA_STATES,
  type StageTransitionState,
} from "./stage-transition-state.js";
import type {
  DirectiveRejectCode,
  DowngradeWarning,
  ValidatorInput,
} from "./proposer-directive-validator.js";
import { validateProposerDirective } from "./proposer-directive-validator.js";
import type {
  ProposerDirective,
  ProposerProposal,
} from "./proposer-directive-types.js";
import { aggregatePackMissingAreas } from "./pack-missing-areas-aggregator.js";
import type {
  IntentInference,
  IntentInferenceProvenance,
  PackMissingArea,
  RationaleState,
} from "./wip-element-types.js";

export interface HookAlphaEntityInput {
  id: string;
  type: string;
  name: string;
  definition: string;
  certainty:
    | "observed"
    | "rationale-absent"
    | "inferred"
    | "ambiguous"
    | "not-in-source";
  source: { locations: string[] };
  relations_summary: { related_id: string; relation_type: string }[];
}

export interface HookAlphaManifestInput {
  manifest_schema_version: string;
  domain_name: string;
  domain_manifest_version: string;
  version_hash: string;
  quality_tier: "full" | "partial" | "minimal";
  referenced_files: {
    path: string;
    required: boolean;
    purpose?: string;
    min_headings?: number | null;
  }[];
}

export interface HookAlphaMetaInput {
  stage_transition_state: StageTransitionState;
  stage_transition_retry_count: number;
  inference_mode: "full" | "degraded" | "none";
  stage: 1 | 2;
}

export interface HookAlphaInput {
  meta: HookAlphaMetaInput;
  entityList: HookAlphaEntityInput[];
  manifest: HookAlphaManifestInput;
  injectedFiles: string[]; // 실 prompt 에 주입된 path subset
  sessionId: string;
  runtimeVersion: string;
  proposerContractVersion: string;
}

export interface ProposerInputPackage {
  systemPurpose: string; // caller 가 컨텍스트에서 채움
  entityList: HookAlphaEntityInput[];
  manifest: HookAlphaManifestInput;
  injectedFiles: string[];
  sessionId: string;
  runtimeVersion: string;
  proposerContractVersion: string;
}

export interface HookAlphaDeps {
  /**
   * spawn Proposer agent (LLM call in production, mock in tests).
   * Throws if the agent invocation itself fails — Hook α treats throws as
   * directive_failure (alpha_failed_retry_pending).
   */
  spawnProposer(input: ProposerInputPackage): Promise<ProposerDirective>;
  /** ISO 8601 UTC timestamp generator (for proposed_at) */
  now(): Date;
  /** input.systemPurpose source (caller 의 context_brief) */
  systemPurpose: string;
}

export type HookAlphaResult =
  | {
      kind: "skipped";
      nextState: "alpha_skipped";
      setMetaStage: 2;
    }
  | {
      kind: "completed";
      nextState: "alpha_completed";
      setMetaStage: 2;
      elementUpdates: Map<string, IntentInference>;
      packMissingAreas: PackMissingArea[];
      warnings: DowngradeWarning[];
    }
  | {
      kind: "failed";
      nextState: "alpha_failed_retry_pending";
      setMetaStage: null;
      reject: { code: DirectiveRejectCode | "spawn_failure"; detail: string };
    }
  | {
      kind: "illegal_invocation";
      reason: string;
    };

/**
 * v1 entry precondition (§6.2 step 5a):
 *   inference_mode == "none" OR entity_list.length == 0 → alpha_skipped
 */
export function shouldSkipHookAlpha(input: HookAlphaInput): boolean {
  return (
    input.meta.inference_mode === "none" || input.entityList.length === 0
  );
}

/**
 * Single-shot Hook α invocation. Caller persists wip.yml after applying the
 * returned result + the corresponding state transition event.
 *
 * Resumable from states: pre_alpha / alpha_in_progress / alpha_failed_retry_pending.
 * Non-resumable invocations return { kind: "illegal_invocation" }.
 */
export async function runHookAlpha(
  input: HookAlphaInput,
  deps: HookAlphaDeps,
): Promise<HookAlphaResult> {
  if (!RESUMABLE_HOOK_ALPHA_STATES.has(input.meta.stage_transition_state)) {
    return {
      kind: "illegal_invocation",
      reason: `state ${input.meta.stage_transition_state} not in resumable set`,
    };
  }

  // step 5a — precondition skip
  if (shouldSkipHookAlpha(input)) {
    // verify the transition is legal from the current persisted state
    if (input.meta.stage_transition_state === "pre_alpha") {
      const t = applyStageTransitionEvent("pre_alpha", "precondition_skip");
      return {
        kind: "skipped",
        nextState: t.next as "alpha_skipped",
        setMetaStage: 2,
      };
    }
    return {
      kind: "illegal_invocation",
      reason: `precondition_skip valid only from pre_alpha, not ${input.meta.stage_transition_state}`,
    };
  }

  // step 5b — spawn Proposer
  let directive: ProposerDirective;
  try {
    directive = await deps.spawnProposer({
      systemPurpose: deps.systemPurpose,
      entityList: input.entityList,
      manifest: input.manifest,
      injectedFiles: input.injectedFiles,
      sessionId: input.sessionId,
      runtimeVersion: input.runtimeVersion,
      proposerContractVersion: input.proposerContractVersion,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return {
      kind: "failed",
      nextState: "alpha_failed_retry_pending",
      setMetaStage: null,
      reject: { code: "spawn_failure", detail },
    };
  }

  // step 5c — validate directive
  const optionalFiles = new Set(
    input.manifest.referenced_files
      .filter((f) => !f.required)
      .map((f) => f.path),
  );
  const validatorInput: ValidatorInput = {
    entityIds: input.entityList.map((e) => e.id),
    manifestReferencedFiles: input.manifest.referenced_files.map((f) => f.path),
    injectedFiles: input.injectedFiles,
    optionalFiles,
    expectedManifestSchemaVersion: input.manifest.manifest_schema_version,
    expectedDomainManifestHash: input.manifest.version_hash,
  };
  const validation = validateProposerDirective(directive, validatorInput);
  if (!validation.ok) {
    return {
      kind: "failed",
      nextState: "alpha_failed_retry_pending",
      setMetaStage: null,
      reject: { code: validation.code, detail: validation.detail },
    };
  }

  // step 5d — atomic apply (compose intent_inference per element)
  const elementUpdates = new Map<string, IntentInference>();
  for (const proposal of validation.directive.proposals) {
    const inference = composeIntentInference(
      proposal,
      validation.directive.provenance,
      input,
    );
    elementUpdates.set(proposal.target_element_id, inference);
  }

  // §6.3.1 post-aggregate
  const packMissingAreas = aggregatePackMissingAreas(
    validation.directive.proposals,
  );

  return {
    kind: "completed",
    nextState: "alpha_completed",
    setMetaStage: 2,
    elementUpdates,
    packMissingAreas,
    warnings: validation.warnings,
  };
}

/**
 * Compose IntentInference for a single proposal.
 * §6.3 element field rules + §3.4.1 rationale_state mapping + §3.5.1 single
 * state_reason persistence sink + §3.7.2 (Step 2 r3-amendment) gate_count = 1.
 */
function composeIntentInference(
  proposal: ProposerProposal,
  sessionProvenance: ProposerDirective["provenance"],
  input: HookAlphaInput,
): IntentInference {
  const rationale_state: RationaleState =
    proposal.outcome === "proposed"
      ? "proposed"
      : proposal.outcome === "gap"
        ? "gap"
        : proposal.outcome === "domain_pack_incomplete"
          ? "domain_pack_incomplete"
          : "domain_scope_miss";

  const provenance: IntentInferenceProvenance = {
    proposed_at: sessionProvenance.proposed_at,
    proposed_by: "rationale-proposer",
    proposer_contract_version: sessionProvenance.proposer_contract_version,
    manifest_schema_version: sessionProvenance.manifest_schema_version,
    domain_manifest_version: sessionProvenance.domain_manifest_version,
    domain_manifest_hash: sessionProvenance.domain_manifest_hash,
    domain_quality_tier: sessionProvenance.domain_quality_tier,
    session_id: sessionProvenance.session_id,
    runtime_version: sessionProvenance.runtime_version,
    input_chunks: sessionProvenance.input_chunks,
    truncated_fields: sessionProvenance.truncated_fields,
    effective_injected_files: sessionProvenance.effective_injected_files,
    gate_count: 1, // r3-amendment: Hook α populate 시 1
  };
  if (proposal.__truncation_hint) {
    provenance.__truncation_hint = proposal.__truncation_hint;
  }

  const inference: IntentInference = {
    rationale_state,
    provenance,
  };

  if (proposal.outcome === "proposed") {
    inference.inferred_meaning = proposal.inferred_meaning;
    inference.justification = proposal.justification;
    inference.domain_refs = proposal.domain_refs;
    inference.confidence = proposal.confidence; // post-validation value
  } else {
    // gap / domain_scope_miss / domain_pack_incomplete: state_reason 단일 sink
    inference.state_reason = proposal.state_reason;
    if (proposal.outcome === "domain_scope_miss" && proposal.domain_refs) {
      inference.domain_refs = proposal.domain_refs;
    }
    if (proposal.outcome === "domain_pack_incomplete") {
      inference.domain_refs = proposal.domain_refs; // r5: required ≥ 1
    }
  }

  // input.runtimeVersion 등 input 의 일부 fields 가 sessionProvenance 와 일치해야
  // 하지만 본 모듈에서는 sessionProvenance 를 신뢰 (validator §3.7 rule 7 가
  // 이미 manifest_schema_version + domain_manifest_hash 일치 검증)
  void input; // explicitly mark as consumed by validator step

  return inference;
}
