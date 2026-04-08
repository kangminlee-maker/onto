/**
 * Phase 3 Promote — Judgment Auditor (Step 8b).
 *
 * Design authority:
 *   - learn-phase3-design-v4.md DD-13 (P-14 sequencing)
 *   - learn-phase3-design-v6.md DD-17 (obligation ledger lifecycle)
 *   - learn-phase3-design-v9.md DD-17 (carry-forward + expired_unattended ingress)
 *   - learn-phase3-design-v7.md DD-21 (AuditObligation encapsulation — this
 *     module transitions obligations exclusively through AuditObligation.transition())
 *   - processes/promote.md Step 8 (judgment re-verification threshold)
 *
 * Responsibility:
 *   - DD-13 P-14 pre-step: determine eligible agents for judgment audit
 *     (count_threshold OR outstanding obligation).
 *   - For each eligible agent, LLM-evaluate the `[judgment]`-type items in
 *     their global learnings file against the current context.
 *   - Emit AuditOutcome per item (retain | modify | delete | audit_to_conflict_proposal).
 *   - Transition matching AuditObligations through their lifecycle
 *     (pending → in_progress → fulfilled | blocked | no_eligible_agents).
 *   - Return a compact AuditSummary consumable by PromoteReport assembly.
 *
 * Scope boundary:
 *   - Phase A only. No file mutation; audit outcomes are proposals that flow
 *     into PromoteReport for user approval before Phase B applies them.
 *   - ConflictProposal emission for `audit_to_conflict_proposal` outcomes is
 *     handled by the orchestrator (promoter.ts) — this module returns raw
 *     outcomes and leaves proposal assembly to the caller, which holds the
 *     origin/lineage context (DD-19).
 *
 * Failure model:
 *   - LLM unreachable → obligation transitions in_progress → blocked.
 *     Next promote will re-enter pending (audit-state.ts processCarryForward).
 *   - Malformed LLM JSON → blocked (treated the same as unreachable).
 *   - No eligible items for an obligation's affected_agents → in_progress →
 *     no_eligible_agents (terminal).
 */

import { callLlm, hashPrompt } from "../shared/llm-caller.js";
import type { AuditState } from "../shared/audit-state.js";
import type { AuditObligation } from "./audit-obligation.js";
import type {
  AuditEligibility,
  AuditOutcome,
  AuditPolicy,
  AuditSummary,
  ObligationProcessed,
  ParsedLearningItem,
} from "./types.js";

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export const DEFAULT_AUDIT_POLICY: AuditPolicy = {
  judgment_threshold: 10, // promote.md §8
  obligation_max_carry_forward: 3,
};

// ---------------------------------------------------------------------------
// Eligibility determination — DD-13 pre-step
// ---------------------------------------------------------------------------

/**
 * Count `[judgment]`-type items per agent across the given item pool.
 *
 * The caller supplies global_items from CollectionResult. Judgment audit runs
 * only against global items because audit is a re-verification of already-
 * promoted judgments — project-level items are the promote panel's domain.
 */
function countJudgmentsByAgent(
  items: ParsedLearningItem[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.type !== "judgment") continue;
    counts.set(item.agent_id, (counts.get(item.agent_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * DD-13 pre-step: resolve which agents are eligible for audit in this promote
 * session.
 *
 * Two trigger paths:
 *   1. count_threshold — an agent holds >= policy.judgment_threshold judgment
 *      items in its global file (promote.md §8).
 *   2. obligation — an active obligation whose `affected_agents` list names
 *      the agent (DD-17 carry-forward path).
 *
 * When both paths fire for the same agent the obligation path wins so the
 * audit explicitly fulfills the ledger entry.
 */
export function determineAuditEligibility(
  globalItems: ParsedLearningItem[],
  state: AuditState,
  policy: AuditPolicy = DEFAULT_AUDIT_POLICY,
): AuditEligibility[] {
  const counts = countJudgmentsByAgent(globalItems);
  const eligibility: AuditEligibility[] = [];
  const handledAgents = new Set<string>();

  // Obligation-triggered eligibility first (higher priority)
  for (const ob of state.obligations) {
    if (ob.status !== "pending") continue;
    for (const agent of ob.affected_agents) {
      if (handledAgents.has(agent)) continue;
      handledAgents.add(agent);
      eligibility.push({
        agent_id: agent,
        obligation_id: ob.obligation_id,
        reason: `obligation ${ob.obligation_id}: ${ob.reason}`,
        judgment_count: counts.get(agent) ?? 0,
        trigger: "obligation",
      });
    }
  }

  // Count-threshold eligibility (only for agents not already covered)
  for (const [agent, count] of counts) {
    if (handledAgents.has(agent)) continue;
    if (count < policy.judgment_threshold) continue;
    handledAgents.add(agent);
    eligibility.push({
      agent_id: agent,
      obligation_id: null,
      reason:
        `count_threshold: ${count} >= ${policy.judgment_threshold} judgment items`,
      judgment_count: count,
      trigger: "count_threshold",
    });
  }

  return eligibility;
}

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

const AUDIT_SYSTEM_PROMPT = `You are re-verifying previously promoted [judgment]-type learnings for an agent. For each item, decide whether it is still contextually valid.

Output ONE JSON object with an "outcomes" array. For each item output:

{
  "item_index": <0-based integer matching the input order>,
  "decision": "retain" | "modify" | "delete" | "audit_to_conflict_proposal",
  "reason": "<one-sentence justification>",
  "modified_content": "<required only when decision == modify, otherwise null>"
}

Decision rules:
  - "retain" — item remains valid as written; no action needed.
  - "modify" — the core insight still holds but wording needs update; provide modified_content.
  - "delete" — the judgment is no longer valid and should be retired.
  - "audit_to_conflict_proposal" — the item conflicts with another global item;
    a formal conflict proposal will be created for operator review.

Coherence rules:
  - Return exactly one outcome per input item, in order.
  - modified_content MUST be set when decision is "modify", and MUST be null otherwise.

Respond ONLY with valid JSON (no markdown fences):
{"outcomes": [...]}
`;

function buildAuditUserPrompt(
  agentId: string,
  items: ParsedLearningItem[],
): string {
  const itemBlock = items
    .map(
      (item, i) =>
        `${i}. tags=[${item.applicability_tags.join(" ")}] role=${item.role ?? "<no-role>"}\n   content: ${item.content}`,
    )
    .join("\n");
  return `Agent: ${agentId}
Judgment items to re-verify: ${items.length}
${itemBlock}

Respond with {"outcomes":[...]}.`;
}

// ---------------------------------------------------------------------------
// LLM response parsing
// ---------------------------------------------------------------------------

interface RawAuditOutcome {
  item_index?: unknown;
  decision?: unknown;
  reason?: unknown;
  modified_content?: unknown;
}

function parseAuditResponse(text: string): { outcomes: RawAuditOutcome[] } {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }
  const parsed = JSON.parse(cleaned) as { outcomes?: unknown };
  if (!parsed || !Array.isArray(parsed.outcomes)) {
    throw new Error(
      `audit response missing "outcomes" array (got keys: ${Object.keys(parsed ?? {}).join(",")})`,
    );
  }
  return { outcomes: parsed.outcomes as RawAuditOutcome[] };
}

const VALID_DECISIONS: AuditOutcome["decision"][] = [
  "retain",
  "modify",
  "delete",
  "audit_to_conflict_proposal",
];

function normalizeOutcomes(
  raw: RawAuditOutcome[],
  items: ParsedLearningItem[],
  agentId: string,
): { outcomes: AuditOutcome[]; failures: string[] } {
  const outcomes: AuditOutcome[] = [];
  const failures: string[] = [];
  const seen = new Set<number>();

  for (const r of raw) {
    if (typeof r.item_index !== "number") {
      failures.push(`item_index missing/non-numeric`);
      continue;
    }
    const idx = r.item_index;
    if (idx < 0 || idx >= items.length) {
      failures.push(`item_index ${idx} out of range 0..${items.length - 1}`);
      continue;
    }
    if (seen.has(idx)) {
      failures.push(`item_index ${idx} duplicated`);
      continue;
    }
    seen.add(idx);

    const decision = r.decision as AuditOutcome["decision"];
    if (!VALID_DECISIONS.includes(decision)) {
      failures.push(`item ${idx}: invalid decision "${String(r.decision)}"`);
      continue;
    }

    const outcome: AuditOutcome = {
      agent_id: agentId,
      item: items[idx]!,
      decision,
      reason: typeof r.reason === "string" ? r.reason : "",
    };

    if (decision === "modify") {
      if (typeof r.modified_content !== "string" || !r.modified_content) {
        failures.push(
          `item ${idx}: decision is modify but modified_content missing`,
        );
        continue;
      }
      outcome.modified_content = r.modified_content;
    } else if (
      r.modified_content !== undefined &&
      r.modified_content !== null
    ) {
      failures.push(
        `item ${idx}: decision is ${decision} but modified_content supplied`,
      );
      continue;
    }

    outcomes.push(outcome);
  }

  for (let i = 0; i < items.length; i++) {
    if (!seen.has(i)) {
      failures.push(`item ${i}: no outcome returned`);
    }
  }

  return { outcomes, failures };
}

// ---------------------------------------------------------------------------
// Per-agent audit execution
// ---------------------------------------------------------------------------

interface AuditAgentResult {
  kind: "success" | "blocked" | "no_eligible_items";
  outcomes: AuditOutcome[];
  llm_calls: number;
  failure_reason?: string;
}

interface RunAuditConfig {
  agentId: string;
  globalItems: ParsedLearningItem[];
  maxTokens?: number;
  modelId?: string;
}

async function auditAgent(config: RunAuditConfig): Promise<AuditAgentResult> {
  const judgmentItems = config.globalItems.filter(
    (item) => item.agent_id === config.agentId && item.type === "judgment",
  );

  if (judgmentItems.length === 0) {
    return { kind: "no_eligible_items", outcomes: [], llm_calls: 0 };
  }

  // 1 retry on malformed JSON or per-item normalization failure, mirroring
  // panel-reviewer's pattern. The retry feeds the previous failure list back
  // to the model so it can correct course on the second pass. LLM provider
  // failures (network, auth) skip the retry — they're not the model's fault.
  let llmCalls = 0;
  let lastFailureReason: string | null = null;
  const partialOutcomes: AuditOutcome[] = [];

  const tryOnce = async (
    retryFeedback?: string[],
  ): Promise<{
    kind: "success" | "blocked" | "provider_error";
    outcomes: AuditOutcome[];
    failureReason?: string;
  }> => {
    let userPrompt = buildAuditUserPrompt(config.agentId, judgmentItems);
    if (retryFeedback && retryFeedback.length > 0) {
      userPrompt +=
        "\n\nPrevious attempt was rejected. Validator feedback:\n" +
        retryFeedback.map((f) => `  - ${f}`).join("\n") +
        "\nFix these issues and respond again.";
    }

    let llmText: string;
    try {
      const result = await callLlm(AUDIT_SYSTEM_PROMPT, userPrompt, {
        max_tokens: config.maxTokens ?? 4096,
        ...(config.modelId ? { model_id: config.modelId } : {}),
      });
      llmText = result.text;
    } catch (error) {
      return {
        kind: "provider_error",
        outcomes: [],
        failureReason:
          error instanceof Error ? error.message : String(error),
      };
    }

    let parsed: { outcomes: RawAuditOutcome[] };
    try {
      parsed = parseAuditResponse(llmText);
    } catch (error) {
      return {
        kind: "blocked",
        outcomes: [],
        failureReason: `malformed JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }

    const normalized = normalizeOutcomes(
      parsed.outcomes,
      judgmentItems,
      config.agentId,
    );
    if (normalized.failures.length > 0) {
      return {
        kind: "blocked",
        outcomes: normalized.outcomes,
        failureReason: normalized.failures.join("; "),
      };
    }
    return { kind: "success", outcomes: normalized.outcomes };
  };

  const first = await tryOnce();
  llmCalls += 1;
  if (first.kind === "success") {
    return { kind: "success", outcomes: first.outcomes, llm_calls: llmCalls };
  }
  if (first.kind === "provider_error") {
    return {
      kind: "blocked",
      outcomes: [],
      llm_calls: llmCalls,
      ...(first.failureReason !== undefined
        ? { failure_reason: first.failureReason }
        : {}),
    };
  }
  // first.kind === "blocked" — try once more with feedback
  partialOutcomes.push(...first.outcomes);
  lastFailureReason = first.failureReason ?? null;

  const second = await tryOnce(
    first.failureReason !== undefined ? [first.failureReason] : undefined,
  );
  llmCalls += 1;
  if (second.kind === "success") {
    return { kind: "success", outcomes: second.outcomes, llm_calls: llmCalls };
  }
  return {
    kind: "blocked",
    outcomes: second.kind === "blocked" ? second.outcomes : partialOutcomes,
    llm_calls: llmCalls,
    failure_reason:
      second.failureReason ?? lastFailureReason ?? "unknown failure",
  };
}

// ---------------------------------------------------------------------------
// Public entry point — run the full audit pass
// ---------------------------------------------------------------------------

export interface RunJudgmentAuditConfig {
  globalItems: ParsedLearningItem[];
  state: AuditState;
  sessionId: string;
  policy?: AuditPolicy;
  maxTokens?: number;
  modelId?: string;
}

export interface JudgmentAuditResult {
  summary: AuditSummary;
  /**
   * All outcomes merged across agents. The orchestrator filters by decision
   * (modify/delete → report sections; audit_to_conflict_proposal → lineage-
   * aware ConflictProposal creation in DD-19).
   */
  outcomes: AuditOutcome[];
}

/**
 * DD-13 + DD-17 entry point.
 *
 * Lifecycle contract:
 *   1. Determine eligibility from global_items and state.obligations.
 *   2. Mark each eligible obligation in_progress (via transition()).
 *   3. For each eligible agent, call the LLM and collect outcomes.
 *   4. Transition the obligation according to the result:
 *      - success → fulfilled
 *      - blocked (transient) → blocked
 *      - no_eligible_items → no_eligible_agents
 *   5. Emit ObligationProcessed entries so PromoteReport preserves the
 *      canonical pre/post transition record (DD-17 CONCISENESS-02).
 *
 * Mutation note: `state.obligations[*]` are AuditObligation class instances.
 * This function MUTATES their status via the class API — callers are
 * expected to saveAuditState() after Phase A completes so the ledger reflects
 * this pass's transitions.
 */
export async function runJudgmentAudit(
  config: RunJudgmentAuditConfig,
): Promise<JudgmentAuditResult> {
  const policy = config.policy ?? DEFAULT_AUDIT_POLICY;
  const eligibility = determineAuditEligibility(
    config.globalItems,
    config.state,
    policy,
  );

  // Index obligations by id for quick lookup.
  const obligationById = new Map<string, AuditObligation>(
    config.state.obligations.map((o) => [o.obligation_id, o]),
  );
  const obligationsSeen = new Set<string>();
  const obligationsProcessed: ObligationProcessed[] = [];

  // Transition pending → in_progress for each obligation being picked up.
  // We capture the starting status for the ObligationProcessed record.
  const startingStatus = new Map<
    string,
    AuditObligation["status"]
  >();
  for (const e of eligibility) {
    if (!e.obligation_id) continue;
    if (obligationsSeen.has(e.obligation_id)) continue;
    obligationsSeen.add(e.obligation_id);
    const ob = obligationById.get(e.obligation_id);
    if (!ob) continue;
    startingStatus.set(ob.obligation_id, ob.status);
    if (ob.status === "pending") {
      ob.transition(
        "in_progress",
        `P-14 picked up in session ${config.sessionId}`,
        { session_id: config.sessionId },
      );
    }
  }

  const allOutcomes: AuditOutcome[] = [];
  const auditedAgents: string[] = [];
  let llmCalls = 0;

  // Run audits per eligible agent.
  for (const e of eligibility) {
    const agentConfig: RunAuditConfig = {
      agentId: e.agent_id,
      globalItems: config.globalItems,
    };
    if (config.maxTokens !== undefined) {
      agentConfig.maxTokens = config.maxTokens;
    }
    if (config.modelId !== undefined) {
      agentConfig.modelId = config.modelId;
    }
    const result = await auditAgent(agentConfig);
    llmCalls += result.llm_calls;

    if (result.kind === "success") {
      auditedAgents.push(e.agent_id);
      allOutcomes.push(...result.outcomes);

      if (e.obligation_id) {
        const ob = obligationById.get(e.obligation_id);
        if (ob && ob.status === "in_progress") {
          ob.transition("fulfilled", `P-14 completed for ${e.agent_id}`, {
            session_id: config.sessionId,
          });
        }
      }
      continue;
    }

    if (result.kind === "no_eligible_items") {
      if (e.obligation_id) {
        const ob = obligationById.get(e.obligation_id);
        if (ob && ob.status === "in_progress") {
          ob.transition(
            "no_eligible_agents",
            `no judgment items found for ${e.agent_id}`,
            { session_id: config.sessionId },
          );
        }
      }
      continue;
    }

    // result.kind === "blocked"
    if (e.obligation_id) {
      const ob = obligationById.get(e.obligation_id);
      if (ob && ob.status === "in_progress") {
        ob.transition(
          "blocked",
          `P-14 transient failure: ${result.failure_reason ?? "unknown"}`,
          { session_id: config.sessionId },
        );
      }
    }
  }

  // Build ObligationProcessed records from captured start/end status pairs.
  for (const [obligationId, from] of startingStatus) {
    const ob = obligationById.get(obligationId);
    if (!ob) continue;
    obligationsProcessed.push({
      obligation_id: obligationId,
      transition: { from, to: ob.status },
    });
  }

  const outcomesTally = {
    retain: 0,
    modify: 0,
    delete: 0,
    audit_to_conflict_proposal: 0,
  };
  for (const o of allOutcomes) {
    outcomesTally[o.decision] += 1;
  }

  const summary: AuditSummary = {
    policy,
    obligations_processed: obligationsProcessed,
    eligibility,
    execution: {
      audited_agents: auditedAgents,
      audited_items_count: allOutcomes.length,
      llm_calls: llmCalls,
    },
    outcomes: outcomesTally,
  };

  return { summary, outcomes: allOutcomes };
}

// ---------------------------------------------------------------------------
// Prompt hash helper — exported for audit trail tests
// ---------------------------------------------------------------------------

export function hashAuditPrompt(agentId: string, items: ParsedLearningItem[]): string {
  return hashPrompt(AUDIT_SYSTEM_PROMPT + "\n" + buildAuditUserPrompt(agentId, items));
}
