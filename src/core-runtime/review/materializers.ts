import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  ContextCandidateAssembly,
  InvocationBindingArtifact,
  InvocationInterpretationArtifact,
  ReviewExecutionPlan,
  ReviewExecutionRealization,
  ReviewHostRuntime,
  ReviewMode,
  ReviewSessionMetadata,
  ReviewTargetMaterializedInputKind,
  ReviewTargetScopeKind,
  TargetSnapshotManifest,
} from "./artifact-types.js";
import {
  ensureDirectory,
  isoNow,
  normalizeDomainValue,
  renderReviewTargetMaterializedInput,
  renderTargetSnapshot,
  writeYamlDocument,
} from "./review-artifact-utils.js";

export interface WriteInvocationInterpretationArtifactParams {
  sessionRoot: string;
  entrypoint?: "review";
  targetScopeKind: ReviewTargetScopeKind;
  primaryRef: string;
  memberRefs?: string[];
  bundleKind?: string;
  intentSummary: string;
  domainRecommendation?: string;
  domainSelectionRequired: boolean;
  reviewModeRecommendation: ReviewMode;
  alwaysIncludeLensIds?: string[];
  recommendedLensIds?: string[];
  rationale?: string[];
  ambiguityNotes?: string[];
}

export interface BootstrapInvocationBindingArtifactsParams {
  projectRoot: string;
  requestedTarget: string;
  requestedDomainToken?: string;
  pluginRoot?: string;
  sessionId?: string;
  targetScopeKind: ReviewTargetScopeKind;
  bundleKind?: string;
  resolvedTargetRefs: string[];
  domainRecommendation?: string;
  domainFinalValue: string;
  domainSelectionMode: string;
  executionRealization: ReviewExecutionRealization;
  hostRuntime: ReviewHostRuntime;
  reviewMode: ReviewMode;
  resolvedLensIds: string[];
  bindingNotes?: string[];
}

export interface MaterializeReviewExecutionPreparationArtifactsParams {
  sessionRoot: string;
  scopeKind: ReviewTargetScopeKind;
  resolvedTargetRefs: string[];
  materializedKind: ReviewTargetMaterializedInputKind;
  materializedRefs?: string[];
  systemPurposeRefs?: string[];
  domainContextRefs?: string[];
  learningContextRefs?: string[];
  roleDefinitionRefs?: string[];
  executionRuleRefs?: string[];
}

export function generateReviewSessionId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}-${crypto.randomBytes(4).toString("hex")}`;
}

export async function writeInvocationInterpretationArtifact(
  params: WriteInvocationInterpretationArtifactParams,
): Promise<string> {
  await ensureDirectory(params.sessionRoot);

  const interpretationArtifact: InvocationInterpretationArtifact = {
    entrypoint: params.entrypoint ?? "review",
    target_scope_candidate: {
      kind: params.targetScopeKind,
      primary_ref: params.primaryRef,
      ...(params.memberRefs && params.memberRefs.length > 0
        ? { member_refs: params.memberRefs }
        : {}),
      ...(params.bundleKind ? { bundle_kind: params.bundleKind } : {}),
    },
    intent_summary: params.intentSummary,
    domain_recommendation: params.domainRecommendation ?? "",
    domain_selection_required: params.domainSelectionRequired,
    review_mode_recommendation: params.reviewModeRecommendation,
    lens_selection_plan: {
      always_include: params.alwaysIncludeLensIds ?? [],
      recommended_lenses: params.recommendedLensIds ?? [],
      rationale: params.rationale ?? [],
    },
    ambiguity_notes: params.ambiguityNotes ?? [],
  };

  const interpretationArtifactPath = path.join(
    params.sessionRoot,
    "interpretation.yaml",
  );
  await writeYamlDocument(interpretationArtifactPath, interpretationArtifact);
  return interpretationArtifactPath;
}

export async function bootstrapInvocationBindingArtifacts(
  params: BootstrapInvocationBindingArtifactsParams,
): Promise<{
  sessionRoot: string;
  sessionMetadataPath: string;
  bindingOutputPath: string;
}> {
  if (params.resolvedTargetRefs.length === 0) {
    throw new Error("resolvedTargetRefs must not be empty.");
  }
  if (params.resolvedLensIds.length === 0) {
    throw new Error("resolvedLensIds must not be empty.");
  }

  const projectRoot = path.resolve(params.projectRoot);
  const sessionId = params.sessionId ?? generateReviewSessionId();
  const sessionRoot = path.join(projectRoot, ".onto", "review", sessionId);
  const round1Root = path.join(sessionRoot, "round1");
  const executionPreparationRoot = path.join(sessionRoot, "execution-preparation");
  const promptPacketsRoot = path.join(sessionRoot, "prompt-packets");
  const executionPlanPath = path.join(sessionRoot, "execution-plan.yaml");
  const sessionMetadataPath = path.join(sessionRoot, "session-metadata.yaml");
  const bindingOutputPath = path.join(sessionRoot, "binding.yaml");
  const interpretationArtifactPath = path.join(sessionRoot, "interpretation.yaml");
  const targetSnapshotPath = path.join(executionPreparationRoot, "target-snapshot.md");
  const targetSnapshotManifestPath = path.join(
    executionPreparationRoot,
    "target-snapshot-manifest.yaml",
  );
  const materializedInputPath = path.join(executionPreparationRoot, "materialized-input.md");
  const contextCandidateAssemblyPath = path.join(
    executionPreparationRoot,
    "context-candidate-assembly.yaml",
  );
  const synthesisOutputPath = path.join(sessionRoot, "synthesis.md");
  const deliberationOutputPath = path.join(sessionRoot, "deliberation.md");
  const reviewRecordPath = path.join(sessionRoot, "review-record.yaml");
  const finalOutputPath = path.join(sessionRoot, "final-output.md");

  await Promise.all([
    ensureDirectory(sessionRoot),
    ensureDirectory(round1Root),
    ensureDirectory(executionPreparationRoot),
    ensureDirectory(promptPacketsRoot),
  ]);

  const pluginRoot = params.pluginRoot
    ? path.resolve(params.pluginRoot)
    : path.resolve(projectRoot, ".claude-plugin");

  const reviewSessionMetadata: ReviewSessionMetadata = {
    session_id: sessionId,
    entrypoint: "review",
    execution_realization: params.executionRealization,
    host_runtime: params.hostRuntime,
    review_mode: params.reviewMode,
    created_at: isoNow(),
    project_root: projectRoot,
    requested_target: params.requestedTarget,
    requested_domain_token: params.requestedDomainToken ?? "",
    plugin_root: pluginRoot,
  };

  const invocationBindingArtifact: InvocationBindingArtifact = {
    resolved_target_scope: {
      kind: params.targetScopeKind,
      resolved_refs: params.resolvedTargetRefs.map((ref) => path.resolve(ref)),
      ...(params.bundleKind ? { bundle_kind: params.bundleKind } : {}),
    },
    domain_final_selection: {
      recommendation: params.domainRecommendation ?? "",
      final_value: normalizeDomainValue(params.domainFinalValue),
      selection_mode: params.domainSelectionMode,
    },
    resolved_session_domain: normalizeDomainValue(params.domainFinalValue),
    resolved_execution_realization: params.executionRealization,
    resolved_host_runtime: params.hostRuntime,
    resolved_review_mode: params.reviewMode,
    resolved_lens_set: params.resolvedLensIds,
    session_id: sessionId,
    session_root: sessionRoot,
    round1_root: round1Root,
    execution_preparation_root: executionPreparationRoot,
    execution_plan_path: executionPlanPath,
    session_metadata_path: sessionMetadataPath,
    interpretation_artifact_path: interpretationArtifactPath,
    binding_output_path: bindingOutputPath,
    target_snapshot_path: targetSnapshotPath,
    target_snapshot_manifest_path: targetSnapshotManifestPath,
    materialized_input_path: materializedInputPath,
    context_candidate_assembly_path: contextCandidateAssemblyPath,
    synthesis_output_path: synthesisOutputPath,
    review_record_path: reviewRecordPath,
    final_output_path: finalOutputPath,
    binding_notes: params.bindingNotes ?? [],
  };

  const reviewExecutionPlan: ReviewExecutionPlan = {
    session_id: sessionId,
    session_root: sessionRoot,
    execution_realization: params.executionRealization,
    host_runtime: params.hostRuntime,
    review_mode: params.reviewMode,
    interpretation_artifact_path: interpretationArtifactPath,
    binding_output_path: bindingOutputPath,
    session_metadata_path: sessionMetadataPath,
    execution_preparation_root: executionPreparationRoot,
    round1_root: round1Root,
    lens_execution_seats: params.resolvedLensIds.map((lensId) => ({
      lens_id: lensId,
      output_path: path.join(round1Root, `${lensId}.md`),
    })),
    prompt_packets_root: promptPacketsRoot,
    lens_prompt_packet_seats: params.resolvedLensIds.map((lensId) => ({
      lens_id: lensId,
      packet_path: path.join(promptPacketsRoot, `${lensId}.prompt.md`),
      output_path: path.join(round1Root, `${lensId}.md`),
    })),
    synthesize_prompt_packet_path: path.join(promptPacketsRoot, "onto_synthesize.prompt.md"),
    synthesis_output_path: synthesisOutputPath,
    deliberation_output_path: deliberationOutputPath,
    final_output_path: finalOutputPath,
    review_record_path: reviewRecordPath,
  };

  await Promise.all([
    writeYamlDocument(sessionMetadataPath, reviewSessionMetadata),
    writeYamlDocument(bindingOutputPath, invocationBindingArtifact),
    writeYamlDocument(executionPlanPath, reviewExecutionPlan),
  ]);

  return {
    sessionRoot,
    sessionMetadataPath,
    bindingOutputPath,
  };
}

export async function materializeReviewExecutionPreparationArtifacts(
  params: MaterializeReviewExecutionPreparationArtifactsParams,
): Promise<string> {
  if (params.resolvedTargetRefs.length === 0) {
    throw new Error("resolvedTargetRefs must not be empty.");
  }

  const sessionRoot = path.resolve(params.sessionRoot);
  const executionPreparationRoot = path.join(sessionRoot, "execution-preparation");
  const targetSnapshotPath = path.join(executionPreparationRoot, "target-snapshot.md");
  const targetSnapshotManifestPath = path.join(
    executionPreparationRoot,
    "target-snapshot-manifest.yaml",
  );
  const materializedInputPath = path.join(executionPreparationRoot, "materialized-input.md");
  const contextCandidateAssemblyPath = path.join(
    executionPreparationRoot,
    "context-candidate-assembly.yaml",
  );

  await ensureDirectory(executionPreparationRoot);

  const materializedRefs =
    params.materializedRefs && params.materializedRefs.length > 0
      ? params.materializedRefs.map((ref) => path.resolve(ref))
      : params.resolvedTargetRefs.map((ref) => path.resolve(ref));

  const targetSnapshotManifest: TargetSnapshotManifest = {
    review_target_scope_kind: params.scopeKind,
    resolved_target_refs: params.resolvedTargetRefs.map((ref) => path.resolve(ref)),
    captured_at: isoNow(),
    capture_reason: "prompt-backed review execution",
  };

  const contextCandidateAssembly: ContextCandidateAssembly = {
    system_purpose_refs: params.systemPurposeRefs ?? [],
    domain_context_refs: params.domainContextRefs ?? [],
    learning_context_refs: params.learningContextRefs ?? [],
    role_definition_refs: params.roleDefinitionRefs ?? [],
    execution_rule_refs: params.executionRuleRefs ?? [],
  };

  await Promise.all([
    fs.writeFile(
      targetSnapshotPath,
      await renderTargetSnapshot(
        params.resolvedTargetRefs.map((ref) => path.resolve(ref)),
      ),
      "utf8",
    ),
    writeYamlDocument(targetSnapshotManifestPath, targetSnapshotManifest),
    fs.writeFile(
      materializedInputPath,
      await renderReviewTargetMaterializedInput(
        params.materializedKind,
        materializedRefs,
      ),
      "utf8",
    ),
    writeYamlDocument(contextCandidateAssemblyPath, contextCandidateAssembly),
  ]);

  return executionPreparationRoot;
}
