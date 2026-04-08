/**
 * Phase 3 Promote — Type definitions.
 *
 * Design authority:
 *   - learn-phase3-design-v9.md (final)
 *   - learn-phase3-design-v8.md (DD-1~DD-22 base)
 *   - learn-phase3-design-v7.md (DD-20/21/22 introduction)
 *   - learn-phase3-design-v6.md (DD-1~DD-19 body)
 *
 * This module is the canonical type seat for promote pipeline. Modules under
 * src/core-runtime/learning/promote/ import their interfaces from here.
 *
 * Layering:
 *   - Phase A (source-read-only): collection → audit → panel review → report
 *   - Phase B (mutation): decisions → checkpoint → apply → state persist
 *
 * Naming convention:
 *   - kind: discriminator on union types (e.g., "promote" | "reclassify-insights")
 *   - schema_version: persisted artifact version (DD-20)
 *   - attempt_id: ULID, unique per Phase B attempt (DD-22)
 *   - generation: monotonic within an attempt (DD-22)
 */

import type {
  AuditObligationStatus,
  AuditTriggerKind,
  StatusTransition,
} from "../shared/audit-obligation-kernel.js";

// ---------------------------------------------------------------------------
// Parsed learning items (collector input)
// ---------------------------------------------------------------------------

export type LearningType = "fact" | "judgment";
export type LearningPurposeRole =
  | "guardrail"
  | "foundation"
  | "convention"
  | "insight"
  | null;
export type LearningImpact = "high" | "normal";
export type LearningScope = "project" | "global";

/**
 * A parsed entry from a learnings/{agent}.md file.
 *
 * Source format (canonical):
 *   - [{type}] [{methodology|domain/X}]+ [{role}]? {content} (source: ...) [impact:high|normal]
 *
 * `learning_id` is the trailing comment marker written by Phase 2 extractor:
 *   <!-- learning_id: abc123 taxonomy_version: phase2-v1 -->
 *
 * Items written before Phase 2 extractor was active have learning_id = null.
 */
export interface ParsedLearningItem {
  agent_id: string;
  scope: LearningScope;
  source_path: string;
  raw_line: string;
  line_number: number;

  type: LearningType;
  applicability_tags: string[]; // e.g., ["methodology", "domain/SE"]
  role: LearningPurposeRole;
  content: string;
  source_project: string | null;
  source_domain: string | null;
  source_date: string | null;
  impact: LearningImpact;

  learning_id: string | null;
  event_markers: string[]; // applied-then-found-invalid markers
  retention_confirmed_at: string | null;
}

// ---------------------------------------------------------------------------
// Collector — DD-18
// ---------------------------------------------------------------------------

export type CollectorMode = "promote" | "reclassify-insights";

/**
 * BaselineHash — DD-10 (freshness check).
 *
 * Captured at collection start. Phase B verifies the same files have not been
 * mutated by another process between Phase A and Phase B.
 *
 * source_scope distinguishes the two collection modes:
 *   - "promote": project + global learnings
 *   - "reclassify-insights": global learnings only
 */
export interface BaselineHash {
  schema_version: "1";
  source_scope: CollectorMode;
  captured_at: string;
  files: BaselineHashFile[];
}

export interface BaselineHashFile {
  path: string;
  scope: LearningScope;
  agent_id: string;
  size_bytes: number;
  content_sha256: string;
  line_count: number;
}

/**
 * CollectionResult — DD-18 canonical seats.
 *
 * project_items, global_items, and candidate_items are intentionally separate
 * fields. candidate_items is computed from project_items/global_items by mode
 * (see DD-18 §SST table). Consumers MUST NOT recompute candidate_items.
 */
export interface CollectionResult {
  schema_version: "1";
  mode: CollectorMode;
  collected_at: string;

  project_items: ParsedLearningItem[];
  global_items: ParsedLearningItem[];
  candidate_items: ParsedLearningItem[];

  baseline_hash: BaselineHash;

  parse_errors: ParseError[];
}

export interface ParseError {
  source_path: string;
  line_number: number;
  raw_line: string;
  error: string;
}

// ---------------------------------------------------------------------------
// Pre-analysis (Step 2 of promote.md)
// ---------------------------------------------------------------------------

export type PreAnalysisClassification = "duplicate" | "contradiction" | "new";

export interface PreAnalysisResult {
  classification: PreAnalysisClassification;
  candidate: ParsedLearningItem;
  matched_global: ParsedLearningItem | null;
  reason: string;
}

// ---------------------------------------------------------------------------
// Panel reviewer — DD-2, DD-7
// ---------------------------------------------------------------------------

export type PanelMemberRole = "originator" | "philosopher" | "auto_selected";

export interface PanelMember {
  agent_id: string;
  role: PanelMemberRole;
  reachable: boolean;
  unreachable_reason?: string;
}

export type PanelVerdictKind = "promote" | "defer" | "reject";

/**
 * Per-criterion judgment from one panel member for one candidate.
 *
 * criteria 1~5 are validated as a fixed-length array (DD-7). Missing criteria
 * fail the array validator at the panel-reviewer.ts boundary, not at consume
 * time, so degraded states surface early.
 *
 * criterion 6 (cross-agent dedup) runs as a separate sequential pass — see
 * promote.md §3 step 6 — and does not appear in this per-member structure.
 */
export interface PanelCriterionJudgment {
  criterion: 1 | 2 | 3 | 4 | 5;
  judgment: "yes" | "no" | "uncertain";
  reasoning: string;
}

export interface PanelMemberReview {
  member: PanelMember;
  verdict: PanelVerdictKind;
  criteria: PanelCriterionJudgment[]; // length must equal 5
  axis_tag_recommendation:
    | "retain"
    | "add_methodology"
    | "remove_methodology"
    | "modify"
    | "no_recommendation";
  axis_tag_note: string;
  contradiction_resolution?: "replace" | "defer" | "n/a";
  reason: string;
  llm_model_id: string;
  llm_prompt_hash: string;
}

export type PanelConsensus =
  | "promote_3_3"
  | "promote_2_3"
  | "defer_majority"
  | "reject_majority"
  | "split"
  | "panel_minimum_unmet";

export interface PanelVerdict {
  candidate_id: string;
  candidate: ParsedLearningItem;
  panel_members: PanelMember[];
  member_reviews: PanelMemberReview[];
  consensus: PanelConsensus;
  minority_opinion?: string;
  is_contradiction: boolean;
  matched_existing_line: string | null;
}

// ---------------------------------------------------------------------------
// Cross-agent dedup — promote.md criterion 6
// ---------------------------------------------------------------------------

export interface CrossAgentDedupCluster {
  cluster_id: string;
  primary_owner_agent: string;
  primary_owner_reason: string;
  consolidated_principle: string;
  representative_cases: string[];
  member_items: ParsedLearningItem[];
  consolidated_line: string;
  user_approval_required: true;
}

// ---------------------------------------------------------------------------
// Audit (P-14, judgment-auditor) — DD-13, DD-17
// ---------------------------------------------------------------------------

export interface AuditObligationInit {
  obligation_id: string;
  trigger_kind: AuditTriggerKind;
  detected_at: string;
  detected_after_session: string;
  affected_agents: readonly string[];
  reason: string;
  max_carry_forward: number;
  status?: AuditObligationStatus;
  status_history?: StatusTransition[];
  carry_forward_count?: number;
}

export interface AuditObligationJSON {
  obligation_id: string;
  trigger_kind: AuditTriggerKind;
  detected_at: string;
  detected_after_session: string;
  affected_agents: string[];
  reason: string;
  max_carry_forward: number;
  status: AuditObligationStatus;
  status_history: StatusTransition[];
  carry_forward_count: number;
}

export interface AuditEligibility {
  agent_id: string;
  obligation_id: string | null; // null when triggered by count threshold rather than obligation
  reason: string;
  judgment_count: number;
  trigger: "count_threshold" | "obligation";
}

export interface AuditOutcome {
  agent_id: string;
  item: ParsedLearningItem;
  decision: "retain" | "modify" | "delete" | "audit_to_conflict_proposal";
  reason: string;
  modified_content?: string;
}

export interface AuditPolicy {
  judgment_threshold: number; // 10
  obligation_max_carry_forward: number;
}

// ---------------------------------------------------------------------------
// Domain doc proposer — DD-19
// ---------------------------------------------------------------------------

export type DomainDocTarget =
  | "concepts.md"
  | "competency_qs.md"
  | "domain_scope.md";

/**
 * DomainDocCandidate — Phase A output.
 *
 * slot_id is derived from (approved_promotion_id, target_doc, domain) so the
 * same slot keeps the same id across regeneration. instance_id is a fresh ULID
 * per generation so a re-run produces a new instance even when slot is stable.
 *
 * v8 review (UF-SEM-01) split candidate_id into slot_id + instance_id because
 * the original "candidate_id" was conflating "which slot" with "which instance"
 * and lineage verification was breaking on regeneration.
 */
export interface DomainDocCandidate {
  slot_id: string;
  instance_id: string;
  approved_promotion_id: string;
  target_doc: DomainDocTarget;
  domain: string;
  agent_id: string;
  candidate_summary: string;
}

export interface DomainDocProposal {
  slot_id: string;
  instance_id: string;
  reflection_form: string;
  content: string;
  llm_model_id: string;
  llm_prompt_hash: string;
}

export interface LineageVerificationResult {
  valid: boolean;
  orphaned_proposals: DomainDocProposal[];
  slot_mismatches: { proposal: DomainDocProposal; expected_slot_id: string }[];
}

// ---------------------------------------------------------------------------
// Health snapshot — promote.md §9
// ---------------------------------------------------------------------------

export interface HealthSnapshot {
  total_global_learnings: number;
  axis_distribution: {
    methodology_only_pct: number;
    domain_only_pct: number;
    dual_pct: number;
  };
  purpose_distribution: {
    guardrail: number;
    foundation: number;
    convention: number;
    insight: number;
  };
  judgment_ratio_pct: number;
  cross_agent_dedup_clusters_remaining: number;
  axis_tag_re_evaluation_changes_this_session: number;
  event_marker_review_candidates: number;
  creation_gate_failures: number;
  applied_learnings_aggregate: { yes: number; no: number };
  separation_trigger_agents: string[];
}

// ---------------------------------------------------------------------------
// Retirement — DD-6
// ---------------------------------------------------------------------------

export interface RetirementCandidate {
  item: ParsedLearningItem;
  marker_count: number;
  markers: string[];
  retention_confirmed_at: string | null;
  reason: string;
}

// ---------------------------------------------------------------------------
// Conflict proposal carry-over from Phase 2
// ---------------------------------------------------------------------------

export interface ConflictProposalView {
  source_session_id: string;
  lens_id: string;
  new_item_line: string;
  matched_existing_line: string;
  decision:
    | "conflict_propose_replace"
    | "conflict_propose_keep"
    | "conflict_propose_coexist";
  conflict_kind: "contradiction" | "supersession" | "disambiguation";
  reason: string;
}

// ---------------------------------------------------------------------------
// Promote Report — Phase A output
// ---------------------------------------------------------------------------

export interface PromoteReport {
  schema_version: "1";
  session_id: string;
  generated_at: string;
  mode: CollectorMode;

  collection: CollectionResult;
  pre_analysis: PreAnalysisResult[];
  panel_verdicts: PanelVerdict[];
  cross_agent_dedup_clusters: CrossAgentDedupCluster[];
  audit_summary: AuditSummary;
  retirement_candidates: RetirementCandidate[];
  conflict_proposals: ConflictProposalView[];
  domain_doc_candidates: DomainDocCandidate[];
  health_snapshot: HealthSnapshot;

  degraded_states: DegradedStateEntry[];
  warnings: string[];
}

/**
 * AuditSummary — DD-17 (CONCISENESS-02 simplified).
 *
 * `obligations_processed.transition` is the canonical record. Counts and the
 * expired_unattended list are derived helpers (countCarriedForward, etc.).
 * v6 review removed the redundant fields that were previously stored here.
 *
 * `failed_agents` (B-4 production finding): when an agent was eligible but
 * the audit blocked (LLM error, malformed response), record the agent_id +
 * reason here so the operator can see WHY it was skipped instead of having
 * to re-run to discover. Empty when all eligible agents succeeded.
 */
export interface AuditSummary {
  policy: AuditPolicy;
  obligations_processed: ObligationProcessed[];
  eligibility: AuditEligibility[];
  execution: {
    audited_agents: string[];
    audited_items_count: number;
    llm_calls: number;
  };
  outcomes: {
    retain: number;
    modify: number;
    delete: number;
    audit_to_conflict_proposal: number;
  };
  failed_agents: AuditFailedAgent[];
}

export interface AuditFailedAgent {
  agent_id: string;
  reason: string;
  /** Items the agent had — useful for the operator to see scale before retry. */
  judgment_count: number;
}

export interface ObligationProcessed {
  obligation_id: string;
  transition: { from: AuditObligationStatus; to: AuditObligationStatus };
}

// ---------------------------------------------------------------------------
// Degraded state — DD-11
// ---------------------------------------------------------------------------

export type DegradedStateKind =
  | "panel_contract_invalid"
  | "member_unreachable"
  | "panel_minimum_unmet"
  | "criterion_6_blocked"
  | "criterion_6_waived"
  | "stale_baseline";

export interface DegradedStateEntry {
  kind: DegradedStateKind;
  detail: string;
  affected_candidates?: string[];
  affected_agents?: string[];
  occurred_at: string;
}

// ---------------------------------------------------------------------------
// Decisions input (Phase B input)
// ---------------------------------------------------------------------------

export interface PromoteDecisions {
  schema_version: "1";
  session_id: string;
  prepared_at: string;

  promotions: PromotionDecision[];
  contradiction_replacements: ContradictionReplacementDecision[];
  cross_agent_dedup_approvals: CrossAgentDedupDecision[];
  axis_tag_changes: AxisTagChangeDecision[];
  retirements: RetirementDecision[];
  domain_doc_updates: DomainDocUpdateDecision[];
  audit_outcomes: AuditOutcomeDecision[];
  audit_obligations_waived: AuditObligationWaiveDecision[];

  recovery_resolution?: RecoveryResolutionDecision;
}

export interface PromotionDecision {
  candidate_agent_id: string;
  candidate_line: string;
  approve: boolean;
}

export interface ContradictionReplacementDecision {
  agent_id: string;
  existing_line: string;
  new_line: string;
  approve: boolean;
}

export interface CrossAgentDedupDecision {
  cluster_id: string;
  approve: boolean;
}

export interface AxisTagChangeDecision {
  agent_id: string;
  original_line: string;
  new_line: string;
  approve: boolean;
}

export interface RetirementDecision {
  agent_id: string;
  line_excerpt: string;
  approve_retire: boolean; // false = retention_confirmed
}

export interface DomainDocUpdateDecision {
  slot_id: string;
  instance_id: string;
  approve: boolean;
}

export interface AuditOutcomeDecision {
  agent_id: string;
  line_excerpt: string;
  decision: "retain" | "modify" | "delete";
  modified_content?: string;
}

export interface AuditObligationWaiveDecision {
  obligation_id: string;
  reason: string;
}

export interface RecoveryResolutionDecision {
  selected_attempt_id: string;
  operator_note?: string;
}

// ---------------------------------------------------------------------------
// Apply state — DD-15 (Phase B execution state)
// ---------------------------------------------------------------------------

export type ApplyExecutionStateStatus =
  | "in_progress"
  | "completed"
  | "failed_resumable"
  | "apply_verification_failed"
  | "state_persistence_failed";

/**
 * ApplyExecutionState — Phase B persisted state.
 *
 * DD-22: attempt_id is a ULID assigned at Phase B start. generation is monotonic
 * within an attempt and increments on every persistState() call. last_updated_at
 * is recorded alongside generation; together they form RecoveryFreshness.
 *
 * status taxonomy is intentionally split between resumable and non-resumable
 * failures (DD-15). state_persistence_failed never reaches this artifact (it
 * goes to emergency-log instead) but the discriminator stays in the type so
 * recovery code can pattern-match exhaustively.
 */
export interface ApplyExecutionState {
  schema_version: "1";
  session_id: string;

  attempt_id: string;
  attempt_started_at: string;
  generation: number;
  last_updated_at: string;

  status: ApplyExecutionStateStatus;

  applied_decisions: AppliedDecision[];
  failed_decisions: FailedDecision[];
  pending_decisions: PendingDecisionRef[];

  verification_failures?: VerificationFailure[];
  recoverability_checkpoint_path: string | null;
}

export interface AppliedDecision {
  decision_kind:
    | "promotion"
    | "contradiction_replacement"
    | "cross_agent_dedup"
    | "axis_tag_change"
    | "retirement"
    | "domain_doc_update"
    | "audit_outcome"
    | "obligation_waive";
  decision_id: string;
  applied_at: string;
  target_path: string;
  result_summary: string;
}

export interface FailedDecision {
  decision_kind: AppliedDecision["decision_kind"];
  decision_id: string;
  attempted_at: string;
  error_message: string;
  resumable: boolean;
}

export interface PendingDecisionRef {
  decision_kind: AppliedDecision["decision_kind"];
  decision_id: string;
}

export interface VerificationFailure {
  decision_id: string;
  expected: string;
  actual: string;
  detail: string;
}

// ---------------------------------------------------------------------------
// Recoverability checkpoint — DD-16
// ---------------------------------------------------------------------------

export type ProtectionReason =
  | "active_session"
  | "failed_unrecoverable"
  | "state_persistence_failed"
  | "user_pinned";

export interface BackupEntry {
  source_kind:
    | "global_learnings"
    | "project_learnings"
    | "audit_state"
    | "domain_docs";
  source_path: string;
  backup_path: string;
  bytes: number;
  file_count: number;
  restore_command: string;
}

/**
 * RecoverabilityCheckpoint — DD-16 (persisted artifact).
 *
 * v8 review (UF-SEM-02) separated this from CheckpointPreparationResult so
 * "no_target" is a transient preparation outcome and not a persisted variant.
 *
 * v6 review (RESTORE-MANIFEST-01) added manifest_path as the canonical seat
 * for restore instructions. Builders MUST read manifest content from this
 * path; deriving paths from backups[].backup_path string manipulation is
 * explicitly forbidden (split authority).
 */
export interface RecoverabilityCheckpoint {
  schema_version: "1";
  session_id: string;
  created_at: string;

  manifest_path: string;
  backups: BackupEntry[];
  total_bytes: number;

  protected: boolean;
  protection_reason: ProtectionReason | null;

  attempt_id: string;
  generation: number;
}

export interface RestoreManifest {
  schema_version: "1";
  session_id: string;
  attempt_id: string;
  generation: number;
  created_at: string;
  backups: BackupEntry[];
  restore_order: BackupEntry["source_kind"][];
  verification_after_restore: { command: string; expected: string }[];
}

export interface BackupRetentionPolicy {
  backup_storage_max_bytes: number;
  keep_last_n: number;
  keep_for_days: number;
}

export interface BackupMetadata {
  schema_version: "1";
  session_id: string;
  created_at: string;
  total_bytes: number;
  protected: boolean;
  protection_reason: ProtectionReason | null;
  protection_set_at: string | null;
}

export interface PruneLogEntry {
  schema_version: "1";
  session_id: string;
  pruned_at: string;
  reason:
    | "keep_last_n_exceeded"
    | "keep_for_days_exceeded"
    | "storage_max_bytes_exceeded"
    | "manual";
  bytes_freed: number;
}

// ---------------------------------------------------------------------------
// Emergency log — DD-15
// ---------------------------------------------------------------------------

export interface EmergencyLogEntry {
  schema_version: "1";
  entry_id: string;
  session_id: string;
  written_at: string;

  attempt_id: string;
  generation: number;

  fatal_error_kind:
    | "state_persistence_failed"
    | "emergency_log_double_failure";
  fatal_error_message: string;

  last_known_state_snapshot: ApplyExecutionStateSnapshot | null;
  recoverability_checkpoint: RecoverabilityCheckpoint | null;
  partial_decisions_attempted: AppliedDecision[];
  session_root: string;
}

export interface ApplyExecutionStateSnapshot {
  status: ApplyExecutionStateStatus;
  applied_count: number;
  failed_count: number;
  pending_count: number;
}

// ---------------------------------------------------------------------------
// Layout version — DD-8
// ---------------------------------------------------------------------------

export interface LayoutVersion {
  schema_version: "1";
  layout_version: "v3";
  written_at: string;
}

// ---------------------------------------------------------------------------
// Recovery resolution — DD-23 (NEW in v9)
// ---------------------------------------------------------------------------

export interface AttemptInfo {
  attempt_id: string;
  source_kind: "apply_state" | "emergency_log" | "checkpoint_manifest";
  generation: number;
  source_recorded_at: string;
  artifact_path: string;
}

/**
 * RecoveryResolution — DD-23 canonical operator-decision seat.
 *
 * When manual_escalation surfaces (multiple attempt_ids detected during
 * recovery), the operator must record their selection here before --resume
 * can proceed. resolveRecoveryTruth() reads this artifact first and respects
 * the recorded decision over auto-resolution.
 *
 * NQ-21 (v9 §14.3): append-only resolution_history. Top-level fields
 * (selected_attempt_id, etc.) reflect the LATEST decision so consumers can
 * read the canonical seat in one access. resolution_history records every
 * prior decision so the audit trail survives across re-resolutions — the
 * operator may change their mind after seeing apply results, and we want
 * those reversals visible in the ledger.
 */
export interface RecoveryResolutionEntry {
  resolved_at: string;
  resolved_by: "operator" | "auto_resolve";
  resolution_method: "cli_command" | "decisions_file" | "auto";
  selected_attempt_id: string;
  selected_attempt_reason: string;
  all_attempts_at_resolution_time: AttemptInfo[];
  operator_note?: string;
}

export interface RecoveryResolution {
  schema_version: "1";
  session_id: string;

  // Latest decision — denormalized for fast read access. Always equal to
  // resolution_history[length - 1] field-by-field; the constructor invariant
  // is enforced by saveRecoveryResolution() which assembles the artifact.
  resolved_at: string;
  resolved_by: "operator" | "auto_resolve";
  resolution_method: "cli_command" | "decisions_file" | "auto";
  selected_attempt_id: string;
  selected_attempt_reason: string;
  all_attempts_at_resolution_time: AttemptInfo[];
  operator_note?: string;

  // NQ-21: append-only history of all decisions for this session.
  // Always non-empty when the artifact exists. The latest entry equals the
  // top-level fields above. Older entries are preserved verbatim and never
  // mutated after they are appended.
  resolution_history: RecoveryResolutionEntry[];
}

// ---------------------------------------------------------------------------
// Audit state (persisted ledger) — DD-17
// ---------------------------------------------------------------------------

/**
 * AuditState wire format. The runtime uses AuditObligation class instances
 * (DD-21 encapsulation), but on disk we store plain JSON via toJSON()/fromJSON().
 *
 * AuditStateSpec.parse() reconstructs class instances; AuditStateSpec.serialize()
 * uses .toJSON(). The class boundary is bridged at the spec level, not exposed
 * in this type so consumers cannot accidentally bypass the invariants.
 */
export interface AuditStateJSON {
  schema_version: "1";
  obligations: AuditObligationJSON[];
}
