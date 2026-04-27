// runtime-mirror-of: step-2-rationale-proposer §6.3.1
//
// pack_missing_areas non-semantic aggregator.
//
// scope (r4 narrowed):
//   - outcome == domain_pack_incomplete only
//   - gap / domain_scope_miss / proposed elements 는 aggregate 대상 아님
//
// grouping (r3 boundary constraint):
//   - 정확 문자열 매칭만 (manifest_ref + heading)
//   - semantic similarity 금지 (paraphrase / 의미 근접 grouping 은 v1.1 backlog)
//
// post-processing pass: Hook α directive apply 직후 runtime 이 호출.
// pack_missing_areas 는 v1 의 sole writer 가 Hook α (Step 2 §6.3.1 r3-amendment).

import type {
  ProposalDomainPackIncomplete,
  ProposerProposal,
} from "./proposer-directive-types.js";
import type { PackMissingArea } from "./wip-element-types.js";

function isDomainPackIncomplete(
  p: ProposerProposal,
): p is ProposalDomainPackIncomplete {
  return p.outcome === "domain_pack_incomplete";
}

/**
 * Aggregate domain_pack_incomplete proposals by (manifest_ref, heading) into
 * stable, ordered groups.
 *
 * Output ordering (deterministic):
 *   1. by manifest_ref lexicographic
 *   2. by heading lexicographic within same manifest_ref
 *
 * element_ids within each group: sorted lexicographically (stability).
 *
 * Returns [] when no domain_pack_incomplete proposals exist (Step 2 §6.3.1
 * "empty array [] 는 허용 — domain_pack_incomplete 0 개면 field 생략 가능").
 */
export function aggregatePackMissingAreas(
  proposals: ProposerProposal[],
): PackMissingArea[] {
  type Key = string; // `${manifest_ref}\0${heading}`
  const buckets = new Map<Key, PackMissingArea>();

  for (const p of proposals) {
    if (!isDomainPackIncomplete(p)) continue;
    // §3.5 r5: domain_refs ≥ 1 required — validator already enforced
    for (const ref of p.domain_refs) {
      const key: Key = `${ref.manifest_ref}\0${ref.heading}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          grouping_key: {
            manifest_ref: ref.manifest_ref,
            heading: ref.heading,
          },
          element_ids: [],
        };
        buckets.set(key, bucket);
      }
      if (!bucket.element_ids.includes(p.target_element_id)) {
        bucket.element_ids.push(p.target_element_id);
      }
    }
  }

  for (const bucket of buckets.values()) {
    bucket.element_ids.sort();
  }

  return [...buckets.values()].sort((a, b) => {
    if (a.grouping_key.manifest_ref !== b.grouping_key.manifest_ref) {
      return a.grouping_key.manifest_ref < b.grouping_key.manifest_ref ? -1 : 1;
    }
    if (a.grouping_key.heading !== b.grouping_key.heading) {
      return a.grouping_key.heading < b.grouping_key.heading ? -1 : 1;
    }
    return 0;
  });
}
