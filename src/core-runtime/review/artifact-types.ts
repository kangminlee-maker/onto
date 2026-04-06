export type ReviewEntrypoint = "review";
export type ReviewTargetScopeKind = "file" | "directory" | "bundle";
export type ReviewExecutionRealization = "subagent" | "agent-teams";
export type ReviewHostRuntime = "codex" | "claude";
export type ReviewMode = "light" | "full";
export type BoundaryAccessPolicy = "allowed" | "denied";
export type BoundaryGuaranteeLevel =
  | "prompt_declared_only"
  | "host_enforced"
  | "mcp_scoped"
  | "environment_enforced";
export type ReviewRecordStatus =
  | "completed"
  | "completed_with_degradation"
  | "halted_partial";
export type DeliberationStatus =
  | "not_needed"
  | "performed"
  | "required_but_unperformed";
export type ReviewExecutionStatus =
  | "completed"
  | "completed_with_degradation"
  | "halted_partial";
export type ReviewUnitKind = "lens" | "synthesize";
export type ReviewUnitExecutionStatus = "completed" | "failed" | "skipped";
export type ReviewTargetMaterializedInputKind =
  | "single_text"
  | "directory_listing"
  | "bundle_member_texts";

export interface ReviewTargetScopeCandidate {
  kind: ReviewTargetScopeKind;
  primary_ref: string;
  member_refs?: string[];
  bundle_kind?: string;
}

export interface LensSelectionPlan {
  always_include: string[];
  recommended_lenses: string[];
  rationale: string[];
}

export interface InvocationInterpretationArtifact {
  entrypoint: ReviewEntrypoint;
  target_scope_candidate: ReviewTargetScopeCandidate;
  intent_summary: string;
  domain_recommendation: string;
  domain_selection_required: boolean;
  review_mode_recommendation: ReviewMode;
  lens_selection_plan: LensSelectionPlan;
  ambiguity_notes: string[];
}

export interface DomainFinalSelection {
  recommendation: string;
  final_value: string;
  selection_mode: string;
}

export interface ResolvedTargetScope {
  kind: ReviewTargetScopeKind;
  resolved_refs: string[];
  bundle_kind?: string;
}

export interface BoundaryPolicy {
  web_research_policy: BoundaryAccessPolicy;
  repo_exploration_policy: BoundaryAccessPolicy;
  recursive_reference_expansion_policy: BoundaryAccessPolicy;
  filesystem_scope: {
    allowed_roots: string[];
  };
  write_policy: {
    source_mutation_policy: BoundaryAccessPolicy;
    allowed_output_refs: string[];
  };
  provenance_policy: {
    extra_exploration_citation_required: boolean;
    web_source_citation_required: boolean;
  };
}

export interface BoundaryPresentation {
  role_definition_presentation: "embedded_and_ref";
  primary_target_presentation: "embedded_and_ref";
  required_context_presentation: "ref_only";
  output_seat_presentation: "declared";
  control_policy_presentation: "declared";
}

export interface BoundaryEnforcementProfile {
  prompt_boundary_enforcement: BoundaryGuaranteeLevel;
  filesystem_boundary_enforcement: BoundaryGuaranteeLevel;
  network_boundary_enforcement: BoundaryGuaranteeLevel;
  write_boundary_enforcement: BoundaryGuaranteeLevel;
}

export interface EffectiveBoundaryDecision {
  requested_policy: BoundaryAccessPolicy;
  effective_policy: BoundaryAccessPolicy;
  guarantee_level: BoundaryGuaranteeLevel;
  notes: string[];
}

export interface EffectiveFilesystemScope {
  requested_allowed_roots: string[];
  effective_allowed_roots: string[];
  guarantee_level: BoundaryGuaranteeLevel;
  notes: string[];
}

export interface EffectiveBoundaryState {
  web_research: EffectiveBoundaryDecision;
  repo_exploration: EffectiveBoundaryDecision;
  recursive_reference_expansion: EffectiveBoundaryDecision;
  source_mutation: EffectiveBoundaryDecision;
  filesystem_scope: EffectiveFilesystemScope;
}

export interface InvocationBindingArtifact {
  resolved_target_scope: ResolvedTargetScope;
  domain_final_selection: DomainFinalSelection;
  resolved_session_domain: string;
  resolved_execution_realization: ReviewExecutionRealization;
  resolved_host_runtime: ReviewHostRuntime;
  resolved_review_mode: ReviewMode;
  resolved_lens_set: string[];
  session_id: string;
  session_root: string;
  round1_root: string;
  execution_preparation_root: string;
  execution_plan_path: string;
  session_metadata_path: string;
  interpretation_artifact_path: string;
  binding_output_path: string;
  target_snapshot_path: string;
  target_snapshot_manifest_path: string;
  materialized_input_path: string;
  context_candidate_assembly_path: string;
  synthesis_output_path: string;
  execution_result_path: string;
  error_log_path: string;
  review_record_path: string;
  final_output_path: string;
  boundary_policy: BoundaryPolicy;
  boundary_presentation: BoundaryPresentation;
  boundary_enforcement_profile: BoundaryEnforcementProfile;
  effective_boundary_state: EffectiveBoundaryState;
  binding_notes: string[];
}

export interface ReviewLensExecutionSeat {
  lens_id: string;
  output_path: string;
}

export interface ReviewLensPromptPacketSeat {
  lens_id: string;
  packet_path: string;
  output_path: string;
}

export interface ReviewExecutionPlan {
  session_id: string;
  session_root: string;
  execution_realization: ReviewExecutionRealization;
  host_runtime: ReviewHostRuntime;
  review_mode: ReviewMode;
  interpretation_artifact_path: string;
  binding_output_path: string;
  session_metadata_path: string;
  execution_preparation_root: string;
  round1_root: string;
  lens_execution_seats: ReviewLensExecutionSeat[];
  prompt_packets_root: string;
  lens_prompt_packet_seats: ReviewLensPromptPacketSeat[];
  synthesize_prompt_packet_path: string;
  synthesis_output_path: string;
  deliberation_output_path: string;
  execution_result_path: string;
  error_log_path: string;
  final_output_path: string;
  review_record_path: string;
  max_concurrent_lenses?: number;
  minimum_participating_lenses?: number;
  boundary_policy: BoundaryPolicy;
  boundary_presentation: BoundaryPresentation;
  boundary_enforcement_profile: BoundaryEnforcementProfile;
  effective_boundary_state: EffectiveBoundaryState;
}

export interface ReviewSessionMetadata {
  session_id: string;
  entrypoint: ReviewEntrypoint;
  execution_realization: ReviewExecutionRealization;
  host_runtime: ReviewHostRuntime;
  review_mode: ReviewMode;
  created_at: string;
  project_root: string;
  requested_target: string;
  requested_domain_token: string;
  plugin_root: string;
}

export interface TargetSnapshotManifest {
  review_target_scope_kind: ReviewTargetScopeKind;
  resolved_target_refs: string[];
  captured_at: string;
  capture_reason: string;
}

export interface ContextCandidateAssembly {
  system_purpose_refs: string[];
  domain_context_refs: string[];
  learning_context_refs: string[];
  role_definition_refs: string[];
  execution_rule_refs: string[];
}

export interface ReviewUnitExecutionResult {
  unit_id: string;
  unit_kind: ReviewUnitKind;
  packet_path: string;
  output_path: string;
  status: ReviewUnitExecutionStatus;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  failure_message?: string | null;
}

export interface ReviewExecutionResultArtifact {
  session_id: string;
  session_root: string;
  execution_realization: ReviewExecutionRealization;
  host_runtime: ReviewHostRuntime;
  review_mode: ReviewMode;
  execution_status: ReviewExecutionStatus;
  execution_started_at: string;
  execution_completed_at: string;
  total_duration_ms: number;
  planned_lens_ids: string[];
  participating_lens_ids: string[];
  degraded_lens_ids: string[];
  excluded_lens_ids: string[];
  executed_lens_count: number;
  synthesis_executed: boolean;
  deliberation_status?: DeliberationStatus | null | undefined;
  halt_reason?: string | null;
  error_log_path: string;
  lens_execution_results: ReviewUnitExecutionResult[];
  synthesize_execution_result?: ReviewUnitExecutionResult | null;
}

export interface DirectoryListingOptions {
  excluded_names: string[];
  max_depth: number;
  max_entries: number;
}

export interface ReviewRecord {
  review_record_id: string;
  session_id: string;
  entrypoint: ReviewEntrypoint;
  record_status: ReviewRecordStatus;
  created_at: string;
  updated_at: string;
  request_text: string;
  review_target_scope_ref: string;
  interpretation_ref: string;
  binding_ref: string;
  domain_final_selection_ref: string;
  resolved_review_mode?: string;
  resolved_execution_realization?: string;
  resolved_host_runtime?: string;
  resolved_lens_ids: string[];
  execution_result_ref?: string | null;
  session_metadata_ref?: string | null;
  target_snapshot_ref?: string | null;
  materialized_input_ref?: string | null;
  context_candidate_assembly_ref?: string | null;
  lens_result_refs: Record<string, string>;
  participating_lens_ids: string[];
  excluded_lens_ids: string[];
  degraded_lens_ids: string[];
  degradation_notes_ref?: string | null;
  synthesis_result_ref?: string | null;
  deliberation_status: DeliberationStatus;
  deliberation_result_ref?: string | null;
  final_output_ref?: string | null;
}

// ─────────────────────────────────────────────
// Coordinator State Machine types
// ─────────────────────────────────────────────

export type CoordinatorStateName =
  | "preparing"
  | "awaiting_lens_dispatch"
  | "validating_lenses"
  | "awaiting_synthesize_dispatch"
  | "awaiting_deliberation"
  | "completing"
  | "completed"
  | "halted_partial"
  | "failed";

export interface CoordinatorStateTransition {
  from: CoordinatorStateName | "(init)";
  to: CoordinatorStateName;
  at: string;
}

export interface CoordinatorStateFile {
  schema_version: string;
  current_state: CoordinatorStateName;
  session_root: string;
  /** Source: PrepareOnlyResult.request_text */
  request_text: string;
  started_at: string;
  halt_reason: string | null;
  error_message: string | null;
  transitions: CoordinatorStateTransition[];
}

export interface CoordinatorAgentInstruction {
  lens_id: string;
  description: string;
  prompt: string;
  output_path: string;
  packet_path?: string;
}

export interface CoordinatorStartResult {
  state: "awaiting_lens_dispatch";
  session_root: string;
  request_text: string;
  agents: CoordinatorAgentInstruction[];
}

export interface CoordinatorNextResult {
  state: CoordinatorStateName;
  session_root: string;
  agent?: CoordinatorAgentInstruction | undefined;
  final_output_path?: string | undefined;
  review_record_path?: string | undefined;
  record_status?: string | undefined;
  halt_reason?: string | undefined;
  error_message?: string | undefined;
  participating_lens_ids?: string[] | undefined;
  degraded_lens_ids?: string[] | undefined;
}

export const ALLOWED_TRANSITIONS: Record<
  CoordinatorStateName | "(init)",
  CoordinatorStateName[]
> = {
  "(init)": ["preparing"],
  preparing: ["awaiting_lens_dispatch", "failed"],
  awaiting_lens_dispatch: ["validating_lenses"],
  validating_lenses: ["awaiting_synthesize_dispatch", "halted_partial", "failed"],
  awaiting_synthesize_dispatch: ["completing", "awaiting_deliberation"],
  awaiting_deliberation: ["completing"],
  completing: ["completed", "failed"],
  completed: [],
  halted_partial: [],
  failed: [],
};

/**
 * Output of `review:invoke --prepare-only`.
 *
 * Runs all pre-processing and session preparation, then returns without
 * executing lenses or completing the session. The Nested Spawn Coordinator
 * uses this to get `session_root` and then dispatches lenses via Agent tool.
 *
 * `request_text` is the **only** value not derivable from session artifacts
 * (not present in execution-plan.yaml). It must be preserved and passed to
 * `review:complete-session --request-text` later.
 */
export interface PrepareOnlyResult {
  prepare_only: true;
  session_root: string;
  request_text: string;
  execution_realization: ReviewExecutionRealization;
  host_runtime: ReviewHostRuntime;
  review_mode: ReviewMode;
}
