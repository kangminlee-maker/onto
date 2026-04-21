/**
 * govern drift engine (W-C-02, §1.3 수준 0→1 도달 조건).
 *
 * 역할: 변경 제안(ChangeProposal) 을 받아 drift 정책 3 분기로 분류하고,
 * 필요한 경우 W-C-01 govern queue 에 event 를 append 한다.
 *
 * 3 분기 (§1.3):
 *   - self_apply       : drift 양의 피드백 없는 local contained 변경. 자체 실행 + 보고
 *   - queue            : drift 증폭 가능성 있는 변경. 큐 적재 + Principal 승인 대기
 *   - principal_direct : govern 자체 변경, 핵심 가치 변경. 자체 실행 불가, 반드시 Principal 직접
 *
 * v0 bounded minimum surface: classifier + router 만 제공.
 *   - 실제 drift probe (diff 분석, authority 규칙 충돌 검출) 는 W-C-02 v1 이후.
 *   - 3 분기 판정은 target_files prefix + change_kind 만으로 결정 (deterministic).
 */

import { appendQueueEvent, generateGovernId, resolveQueuePath } from "./queue.js";
import { startsWithDirPrefix } from "../discovery/path-normalization.js";
import type { GovernSubmitEvent } from "./types.js";

export type DriftRoute = "self_apply" | "queue" | "principal_direct";
export type ChangeKind = "docs_only" | "code" | "config" | "mixed";

export interface ChangeProposal {
  summary: string;
  target_files: string[];
  change_kind: ChangeKind;
  rationale?: string;
}

export interface DriftDecision {
  route: DriftRoute;
  reason: string;
  matched_rule: "governance_core" | "local_docs_single" | "drift_default";
}

export interface RouteOutcome {
  decision: DriftDecision;
  queue_event_id?: string;
  queue_path?: string;
}

/**
 * Governance core directory prefixes — both canonical (.onto/) and legacy
 * (top-level) forms accepted during the Phase 5+ migration window.
 * `.onto/authority/` is included pre-emptively for Phase 6.
 *
 * Segment boundaries are enforced via `startsWithDirPrefix` so a prefix
 * of `authority/` does not match a stray `authorityX/` path.
 */
const GOVERNANCE_CORE_DIR_PREFIXES: readonly string[] = [
  ".onto/authority/", // Phase 6 canonical
  "authority/", // Phase 6 legacy (still in use)
  ".onto/principles/", // Phase 5 canonical
  "design-principles/", // Phase 5 legacy
];

/** Exact file paths treated as governance core (not directory prefixes). */
const GOVERNANCE_CORE_FILES: readonly string[] = [
  ".onto/processes/govern.md",
  "processes/govern.md", // legacy fallback, matches live resolver dual-path
];

function isGovernanceCoreTarget(filePath: string): boolean {
  if (GOVERNANCE_CORE_FILES.includes(filePath)) return true;
  return GOVERNANCE_CORE_DIR_PREFIXES.some((prefix) =>
    startsWithDirPrefix(filePath, prefix),
  );
}

/**
 * §1.3 3 분기 deterministic 분류.
 *
 * 규칙 우선순위:
 *   1. principal_direct: target 이 governance core 에 속하면 드리프트 여부와 무관하게 Principal 직접
 *   2. self_apply: change_kind=docs_only AND target 단일 AND 규칙 1 미적용
 *   3. queue: 그 외 전부 (drift 증폭 가능성 default)
 */
export function classifyProposal(proposal: ChangeProposal): DriftDecision {
  const hasGovernanceCore = proposal.target_files.some(isGovernanceCoreTarget);
  if (hasGovernanceCore) {
    return {
      route: "principal_direct",
      matched_rule: "governance_core",
      reason:
        "target 에 governance core (authority/ 또는 .onto/authority/, design-principles/ 또는 .onto/principles/, processes/govern.md 또는 .onto/processes/govern.md) 가 포함됨. §1.3 Principal 직접 분기.",
    };
  }

  if (proposal.change_kind === "docs_only" && proposal.target_files.length === 1) {
    return {
      route: "self_apply",
      matched_rule: "local_docs_single",
      reason:
        "change_kind=docs_only + target 단일 파일. §1.3 drift 양의 피드백 없는 local contained 변경.",
    };
  }

  return {
    route: "queue",
    matched_rule: "drift_default",
    reason:
      "docs-only 단일 파일도 아니고 governance core 도 아님. §1.3 drift 증폭 가능성 default — 큐 적재.",
  };
}

/**
 * 분류 결과에 따라 route 실행.
 *
 * - self_apply: no-op (caller 가 보고 로그만 기록)
 * - queue: govern queue 에 origin=system, tag=drift 이벤트 append
 * - principal_direct: queue 에 origin=system, tag=drift + payload marker (`route=principal_direct`) append
 *
 * principal_direct 를 별도 tag 로 분리하지 않는 이유: W-C-01 tag enum 을 v0 에서
 * 확장하지 않는다 (schema stability). 대신 payload marker 로 구분 + list 시 filter 가능.
 */
export function routeProposal(
  proposal: ChangeProposal,
  projectRoot: string,
  now: Date = new Date(),
): RouteOutcome {
  const decision = classifyProposal(proposal);
  if (decision.route === "self_apply") {
    return { decision };
  }

  const queuePath = resolveQueuePath(projectRoot);
  const id = generateGovernId(now);
  const payload: Record<string, unknown> = {
    proposal,
    route: decision.route,
    matched_rule: decision.matched_rule,
    reason: decision.reason,
  };

  const event: GovernSubmitEvent = {
    type: "submit",
    id,
    origin: "system",
    tag: "drift",
    target: proposal.target_files[0] ?? "(unspecified)",
    payload,
    submitted_at: now.toISOString(),
    submitted_by: "drift-engine",
  };

  appendQueueEvent(queuePath, event);
  return { decision, queue_event_id: id, queue_path: queuePath };
}
