---
as_of: 2026-04-20
status: active-handoff
functional_area: review-execution-ux-redesign-phase-1
purpose: |
  Review Execution UX Redesign 의 P1 (Config schema + parser + validator +
  legacy translation) 을 /clear 직후 한 줄 명령으로 즉시 착수할 수 있도록
  하는 handoff. 이후 P2~P8 은 TaskList 도구의 dependency 에 따라 순차 진행.
source_refs:
  design_doc: "development-records/evolve/20260420-review-execution-ux-redesign.md"
  origin_memory: "project_onto_review_infra_drift.md"
  task_list: "TaskList 도구 #1~#8 (P1~P8), P1 (#1) unblocked, 나머지 blockedBy 체인"
---

# Review UX Redesign P1 — Handoff (2026-04-20)

## 1. /clear 직후 착수 one-liner

```
review UX redesign P1 착수. handoff: development-records/plan/20260420-review-ux-redesign-p1-handoff.md
```

이 명령을 받으면 Claude 가:
1. 본 handoff §2-§7 로드
2. Design doc §3 (config schema) + §7 (migration path) 상세 확인
3. P1 scope 내 구현 진행
4. Validation gates 전수 통과
5. Codex rescue 에 independent review 위임
6. PR 생성 → user 승인 후 merge → TaskList 에서 P1 completed 로 표시 → 다음 unblocked task (P2) 으로 진행

## 2. P1 Scope 정의

**포함**:
- TypeScript type 정의 — `OntoReviewConfig` interface (axis A/B/C/E/F) + `ExplicitModelSpec`
- Parser — `config.yml` 의 `review:` block 을 typed object 로 파싱 (기존 `readConfigAt` / `resolveConfigChain` 확장)
- Validator — pure 함수. constraint: E=sendmessage-a2a 는 teamlead=main 필요 (D 조건은 runtime 에서만 검증 가능, P1 은 구문 제약만)
- Legacy translation functions — `legacyTopologyIdToAxes(id)` + `legacyFieldToAxes(yaml)` — pure 함수. 호출은 P4 onboard 에서 수행.
- Unit tests

**제외 (P1 scope 밖)**:
- Runtime 이 `review:` block 을 소비하지 않음. P2 에서 dispatch 연결.
- 대화형 migration 흐름 — P4 onboard 소관.
- `onto config` CLI — P5.
- Docs 수정 — P6.

## 3. 구현 파일 예상

| 파일 | 변경 |
|---|---|
| `src/core-runtime/discovery/config-chain.ts` | `OntoReviewConfig` interface 추가, `OntoConfig` 에 `review?: OntoReviewConfig` 필드 추가 |
| `src/core-runtime/review/review-config-validator.ts` (신규) | pure validator 함수 집합 |
| `src/core-runtime/review/review-config-legacy-translate.ts` (신규) | legacy topology id / legacy field → axis 변환 함수 |
| `src/core-runtime/discovery/config-chain.test.ts` | `review:` block parsing 테스트 |
| `src/core-runtime/review/review-config-validator.test.ts` (신규) | validator 테스트 |
| `src/core-runtime/review/review-config-legacy-translate.test.ts` (신규) | translation 테스트 |
| `authority/core-lexicon.yaml` | v0.23.0 → v0.24.0 changelog |

## 4. Type 정의 (design doc §3.3 기준)

```ts
export interface OntoReviewConfig {
  teamlead?: {
    model: "main" | ExplicitModelSpec;
  };
  subagent?: {
    provider: "main-native" | "codex" | "anthropic" | "openai" | "litellm";
    model_id?: string;
    effort?: string;
  };
  max_concurrent_lenses?: number;
  lens_deliberation?: "synthesizer-only" | "sendmessage-a2a";
}

export type ExplicitModelSpec = {
  provider: "codex" | "anthropic" | "openai" | "litellm";
  model_id: string;
  effort?: string;
};
```

## 5. Legacy 매핑 테이블 (design doc §7.2 그대로)

| Legacy topology id | 유도된 axis |
|---|---|
| cc-main-agent-subagent | teamlead=main, subagent=main-native |
| cc-main-codex-subprocess | teamlead=main, subagent.provider=codex |
| cc-teams-agent-subagent | teamlead=main, subagent=main-native (D auto-true 필요) |
| cc-teams-codex-subprocess | teamlead=main, subagent.provider=codex |
| cc-teams-litellm-sessions | teamlead=main, subagent.provider=litellm |
| cc-teams-lens-agent-deliberation | teamlead=main, subagent=main-native, E=sendmessage-a2a |
| codex-main-subprocess | teamlead=main, subagent=main-native (host=codex 자동 해석) |
| codex-nested-subprocess | teamlead={provider=codex,...}, subagent.provider=codex |
| generic-* | 변환하지 않음 (미구현·비유효) — translation 함수가 null 반환 |

## 6. Validation Gates

P1 merge 전 전수 통과:
- [ ] `npx tsc -p tsconfig.json --noEmit` clean
- [ ] 신규 테스트 (parser / validator / translation) 전체 PASS
- [ ] `npx vitest run` 전체 regress 0
- [ ] `npm run lint:output-language-boundary` clean (425 files)
- [ ] `onto --version` + `onto info` 정상 (backward compat 확인)
- [ ] 기존 `execution_topology_priority` config 로 invoke 한 review 가 여전히 작동 (runtime 영향 0 원칙 확인)
- [ ] Lexicon v0.24.0 changelog 추가

## 7. Independent Review 프로토콜

P1 review 는 반드시 **Codex rescue** 경로로 (onto:review 는 redesign 의 대상이므로 self-review 금지):

```
Agent(subagent_type: "codex:codex-rescue", prompt: "PR #N review brief ...")
```

Review 중점:
- Type 정의가 design doc §3.3 과 정합
- Validator constraint 완결성 (예: E=a2a + teamlead 가 main 이 아닌 경우)
- Legacy translation 이 §7.2 매핑표 전수 반영
- Backward compat 유지 (runtime 에 review block 소비 코드 없음을 확인)
- TypeScript strict 관점의 discriminated union 정확성

## 8. PR 템플릿

```
feat(review-config): Review UX Redesign P1 — config schema + parser + legacy translate

## Summary
Review Execution UX Redesign (design doc: development-records/evolve/20260420-review-execution-ux-redesign.md) 의 **P1** — user-facing 6 axis (A/B/C/E/F) 를 OntoConfig 에 first-class field 로 등재 + parser + validator + legacy translation pure functions. Runtime 동작 변경 0 (P2 에서 dispatch 연결).

## 변경
- `src/core-runtime/discovery/config-chain.ts` — OntoReviewConfig interface + `review?` field
- `src/core-runtime/review/review-config-validator.ts` — pure validator
- `src/core-runtime/review/review-config-legacy-translate.ts` — legacy 매핑
- 3 신규 테스트 파일
- `authority/core-lexicon.yaml` v0.23.0 → v0.24.0 changelog

## Validation
- [x] typecheck / lint / full test / onto CLI 정상
- [x] backward compat 확인 (기존 config 동작 유지)

## Context
- Design doc: development-records/evolve/20260420-review-execution-ux-redesign.md
- Handoff: development-records/plan/20260420-review-ux-redesign-p1-handoff.md
- TaskList: #1 (P1) → #2 P2 unblocked
```

## 9. Merge 후 다음 단계

1. TaskUpdate `#1` status=completed → TaskList 에서 `#2` (P2) unblocked 자동 표시
2. P2 (Topology derivation) 착수 — 별도 handoff 문서 작성 후 진행. 또는 design doc §4 직접 참조로 진행 가능.
3. P2 merge 후 P3 · P4 · P8 병렬 가능 (공유 파일 충돌 여부 확인 필요 — P4 는 onboard CLI, P3 는 review-invoke 내부 이므로 독립)

## 10. Open Question (P1 구현 중 결정)

- **D1 — Effort TypeScript typing**: provider 별 domain 차이를 어떻게 strict type 으로 표현? 선택지: (a) plain `string` + runtime 검증만, (b) discriminated union `type CodexEffort = "minimal"|"low"|...; type AnthropicEffort = { thinking_budget: number }` 등, (c) brand type + helper. P1 에서는 (a) + runtime 검증 이 실용적 — 추후 (b) 로 refactor 시 breaking 아님. 이 판단을 P1 PR 에서 명시.

- **ExplicitModelSpec 에 `main-native` 포함 여부**: `subagent.provider = "main-native"` 일 때 `model_id` 와 `effort` 는 어떻게? 선택지: (a) 아예 허용 안 함 (별도 union branch), (b) 허용하되 runtime 이 무시. P1 에서 (a) 가 설계 의도 — discriminated union 으로 model_id/effort 는 foreign provider branch 에서만 require.

## 11. 연관

- Design doc: development-records/evolve/20260420-review-execution-ux-redesign.md
- 원 drift memory: .claude-1/projects/-Users-kangmin-cowork-onto-4/memory/project_onto_review_infra_drift.md
- TaskList: #1~#8 등록 완료, #1 unblocked
