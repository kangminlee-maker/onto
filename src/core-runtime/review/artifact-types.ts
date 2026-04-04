export type ReviewEntrypoint = "review";
export type ReviewTargetScopeKind = "file" | "directory" | "bundle";
export type ReviewExecutionRealization = "subagent" | "agent-teams";
export type ReviewHostRuntime = "codex" | "claude";
export type ReviewMode = "light" | "full";
export type ReviewRecordStatus =
  | "completed"
  | "completed_with_degradation"
  | "halted_partial";
export type DeliberationStatus =
  | "not_needed"
  | "performed"
  | "required_but_unperformed";
export type ReviewTargetMaterializedInputKind =
  | "single_text"
  | "directory_listing_plus_selected_contents"
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
  review_record_path: string;
  final_output_path: string;
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
  final_output_path: string;
  review_record_path: string;
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
