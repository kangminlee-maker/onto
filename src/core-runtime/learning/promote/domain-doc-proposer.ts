/**
 * Phase 3 Promote — Domain document candidate identifier (Step 9e).
 *
 * Design authority:
 *   - learn-phase3-design-v7.md DD-19 (slot_id from
 *     (approved_promotion_id, target_doc, domain), instance_id ULID per
 *     generation, fan-out explicitly allowed)
 *   - learn-phase3-design-v6.md DD-19 (initial separation)
 *   - processes/promote.md Step 7 (agent → target document routing)
 *
 * Responsibility (Phase A only):
 *   - Walk panel verdicts that reached promote consensus, filter to those
 *     whose originating agent is one of the doc-generating lenses
 *     (semantics / pragmatics / coverage), enumerate the domain tags on
 *     each, and emit one DomainDocCandidate per (approved_promotion_id,
 *     target_doc, domain) tuple.
 *   - slot_id is derived from that tuple so re-generation produces stable
 *     slot ids; instance_id is a fresh ULID per call so retries always
 *     produce new instances.
 *
 * Scope boundary:
 *   - This is the Phase A identifier. It does NOT call the LLM. The LLM
 *     content generation (DomainDocProposal with reflection_form + content)
 *     happens in Phase B promote-executor.ts. Splitting along this seam is
 *     DD-19's CONS-SYN-02 fix: Phase A holds candidates, Phase B holds
 *     proposals. They are separate canonical seats.
 */

import crypto from "node:crypto";

import { generateUlid } from "./apply-state.js";
import type {
  DomainDocCandidate,
  DomainDocTarget,
  PanelVerdict,
  ParsedLearningItem,
} from "./types.js";

// ---------------------------------------------------------------------------
// Agent → target document routing (promote.md §7)
// ---------------------------------------------------------------------------

/**
 * Canonical agent → target document map. The "agent" axis here means the
 * originating lens for the learning (item.agent_id), not the panel member
 * that judged it.
 *
 * Only the 3 accumulable / scope-defining doc types are auto-extracted:
 *   - concepts.md (semantics): terminology
 *   - competency_qs.md (pragmatics): query patterns
 *   - domain_scope.md (coverage): scope/sub-areas
 *
 * The other 4 doc types (logic/structure/dependency/extension) are
 * rule-defining and explicitly excluded from auto-extraction (promote.md §7
 * baseline contamination warning).
 */
const AGENT_TO_TARGET: Readonly<Record<string, DomainDocTarget>> = {
  semantics: "concepts.md",
  pragmatics: "competency_qs.md",
  coverage: "domain_scope.md",
};

function targetDocFor(agentId: string): DomainDocTarget | null {
  return AGENT_TO_TARGET[agentId] ?? null;
}

// ---------------------------------------------------------------------------
// Domain extraction
// ---------------------------------------------------------------------------

const DOMAIN_TAG_PREFIX = "domain/";

/**
 * Pull the bare domain ids out of an item's applicability tags.
 *
 * `[domain/software-engineering]` → `software-engineering`. Methodology-only
 * items return an empty array; the caller treats that as "no domain target"
 * and skips them.
 */
function extractDomains(item: ParsedLearningItem): string[] {
  const domains: string[] = [];
  for (const tag of item.applicability_tags) {
    if (tag.startsWith(DOMAIN_TAG_PREFIX)) {
      domains.push(tag.slice(DOMAIN_TAG_PREFIX.length));
    }
  }
  return domains;
}

// ---------------------------------------------------------------------------
// slot_id derivation
// ---------------------------------------------------------------------------

/**
 * Derive a stable slot_id from the (approved_promotion_id, target_doc, domain)
 * tuple.
 *
 * Determinism is the contract: re-running the proposer for the same
 * promotion approval produces the same slot_id, so Phase B can reconcile
 * a regenerated proposal against an earlier instance for the same slot.
 *
 * Hash choice: 12-char prefix of sha256 — same length as Phase 2 learning_id
 * for consistency across the artifact tree.
 */
export function deriveSlotId(
  approvedPromotionId: string,
  targetDoc: DomainDocTarget,
  domain: string,
): string {
  return crypto
    .createHash("sha256")
    .update(`${approvedPromotionId}|${targetDoc}|${domain}`)
    .digest("hex")
    .slice(0, 12);
}

// ---------------------------------------------------------------------------
// Candidate summary
// ---------------------------------------------------------------------------

/**
 * Build a short human-readable summary of a candidate so the operator can
 * make a decision in the report without re-reading the full learning line.
 *
 * Currently uses the first 120 characters of `content`. Phase B's LLM call
 * generates the full reflection_form + content; this is just a hint.
 */
function buildSummary(item: ParsedLearningItem): string {
  const trimmed = item.content.trim();
  if (trimmed.length <= 120) return trimmed;
  return trimmed.slice(0, 117) + "...";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface IdentifyDomainDocConfig {
  /**
   * Override ULID generation for deterministic tests. When omitted each
   * candidate gets a fresh ULID.
   */
  instanceIdGenerator?: () => string;
}

/**
 * Identify domain document update candidates from panel verdicts.
 *
 * Selection rules:
 *   1. Consensus must be promote_3_3 or promote_2_3 (defer/reject/split
 *      candidates do not propose doc updates).
 *   2. The candidate's agent_id must map to a target document via
 *      AGENT_TO_TARGET.
 *   3. The candidate must carry at least one [domain/X] applicability tag.
 *
 * Fan-out: each (approved_promotion_id, target_doc, domain) tuple emits one
 * DomainDocCandidate. A learning tagged `[domain/A] [domain/B]` produces two
 * candidates with the same target_doc and approved_promotion_id but
 * different domain + slot_id.
 *
 * Output ordering is deterministic: by (approved_promotion_id, target_doc,
 * domain) so the report is stable across runs.
 */
export function identifyDomainDocCandidates(
  verdicts: PanelVerdict[],
  config: IdentifyDomainDocConfig = {},
): DomainDocCandidate[] {
  const generator = config.instanceIdGenerator ?? generateUlid;
  const candidates: DomainDocCandidate[] = [];

  for (const verdict of verdicts) {
    if (
      verdict.consensus !== "promote_3_3" &&
      verdict.consensus !== "promote_2_3"
    ) {
      continue;
    }

    const target = targetDocFor(verdict.candidate.agent_id);
    if (target === null) continue;

    const domains = extractDomains(verdict.candidate);
    if (domains.length === 0) continue;

    for (const domain of domains) {
      candidates.push({
        slot_id: deriveSlotId(verdict.candidate_id, target, domain),
        instance_id: generator(),
        approved_promotion_id: verdict.candidate_id,
        target_doc: target,
        domain,
        agent_id: verdict.candidate.agent_id,
        candidate_summary: buildSummary(verdict.candidate),
      });
    }
  }

  candidates.sort((a, b) => {
    if (a.approved_promotion_id !== b.approved_promotion_id) {
      return a.approved_promotion_id.localeCompare(b.approved_promotion_id);
    }
    if (a.target_doc !== b.target_doc) {
      return a.target_doc.localeCompare(b.target_doc);
    }
    return a.domain.localeCompare(b.domain);
  });

  return candidates;
}
