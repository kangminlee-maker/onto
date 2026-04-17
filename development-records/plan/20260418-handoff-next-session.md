---
as_of: 2026-04-18
status: active
functional_area: review-pipeline-recovery + phase-4-govern-foundation
purpose: |
  2026-04-17~18 세션 (연속 16h+) handoff. 오늘 세션의 주축이었던 v0 govern review
  5 회 실패가 review 파이프라인의 구조적 결함을 drill-down 하게 만들었고, 그 결과
  6 개 PR merged + sketch v2 확정 + 부분 review finding 확보. 다음 세션은
  Review Recovery PR-1 부터 착수하여 review 파이프라인 신뢰 회복 후 Phase 4
  govern 설계 Phase 2 로 진입.
source_refs:
  ladder_sketch: "development-records/evolve/20260417-context-separation-ladder-design-sketch.md (v2, PR #94 merged)"
  v0_review_partial: ".onto/review/20260418-c7658f7d/round1/{axiology,evolution,pragmatics}.md"
  prior_handoff: "development-records/plan/20260417-active-remaining-work-handoff.md (superseded)"
  prs_merged_today: "#89 #90 #91 #92 #93 #94"
---

# Session Handoff — 2026-04-18 → Next Session

## 0. 다음 세션의 첫 명령

```
development-records/plan/20260418-handoff-next-session.md 읽고 §3 우선순위대로 착수해줘
```

## 1. 오늘 세션 요약 (2026-04-17~18)

### 1.1 Merged PRs (6건)

| PR | Commit | 요약 |
|---|---|---|
| #89 | a75508b | `fix(evolve)`: draft-packet Section 2 source consistency (Principal #3) |
| #90 | b03d383 | `refactor(evolve)`: diagnostic-codes registry validation + lookup-miss observability (Principal #2) |
| #91 | 0be8084 | `feat(learning)`: provider ladder fallback observability + cost-order deprecation marker |
| #92 | fcf05ab | `docs(evolve)`: context-separation ladder design sketch v1 |
| #93 | 214a962 | `feat(learning)`: model-call observability surfaces SDK error detail |
| #94 | 7008407 | `docs(evolve)`: ladder sketch v2 — independence axiom + 8-결함 catalog + ExecutionPlan 확장 |

### 1.2 핵심 성과 — 설계 axiom 확립

**"Independent judgments over shared execution plan"** (sketch v2 §1.1.1). Review 에는 두 독립성이 존재:
- **Epistemic independence** (lens layer) — 보존 대상, review 의 존재 이유
- **Execution consistency** (infrastructure layer) — 공유 대상, 재설계 scope

이 구분이 흐려지면 infrastructure 의 잘못된 독립이 lens 의 올바른 독립을 훼손합니다. 오늘 세션의 실패 반복이 이 violation 의 증거 (logic lens 만 Codex routing → 다른 lens 와 비교 불가).

### 1.3 V0 govern 기획 review 부분 결과 (F1~F4)

3 lens (axiology 7.3KB / evolution 4.3KB / pragmatics 3.0KB) 완료, logic 은 Codex timeout 으로 halted. 3 lens 가 독립적으로 수렴한 4 findings:

| Finding | 심각도 | 내용 |
|---|---|---|
| **F1** W-C-02 분할 문서적 불명확성 | High | §0/§8 ("기록 인터페이스만") 과 §11 (`onto govern route`, classifier, autonomy level) 이 두 답 동시 가능. Fix: subsection 별 `implemented in v0 \| deferred W-C-02 \| reserved W-C-03` 상태 마커 + canonical 표 |
| **F2** BL-4 gate 계약적 지위 불명확 | High/Misaligned | "materially present" 하지만 explicit criterion 으로 이름 없음. Fix: `gate registry` 표 (`accepted/rejected/deferred`, why, evidence, owner) |
| **F3** §12-§13 scope bloat | Medium | govern bounded minimum 넘어 learn/principle lifecycle 재서술. Fix: `derived summary` vs `normative contract` 표시 + canonical seat 참조만 |
| **F4** Value justification 부족 | (axiology aligned-but-under-argued) | "왜 deferral 이 bounded minimum 인지" normative paragraph 부재. Fix: §8/§11 에 "traceable judgment before enforcement" 한 문단 |

**5 활동 경계** (review/reconstruct/evolve/learn/govern): §1 에서 단일 해석 가능, 치명적 gap 없음. v0 의 방향성 자체는 **aligned**.

전체 raw: `.onto/review/20260418-c7658f7d/round1/{axiology,evolution,pragmatics}.md`. Synthesize 는 halted_partial 로 생성되지 않음.

### 1.4 오늘 세션 claude-dashboard 설정

별개 작업으로 `claude-dashboard` plugin 설치 + custom 설정. `~/.claude-1/claude-dashboard.local.json` 에 `{displayMode: custom, language: en, plan: max, theme: default, lines: [["model","context","cost","rateLimit5h","rateLimit7d","tokenSpeed","performance"]]}`. StatusLine → `1.25.1`.

## 2. Review 파이프라인 8 결함 catalog (다음 세션의 primary work)

Sketch v2 §7 에 매핑 완료. 간결 요약:

| ID | 결함 | 우선순위 |
|---|---|---|
| R1 | tool-native vs inline provider 비대칭 | **Critical (PR-1)** |
| R2 | resolveExecutionProfile vs resolveProvider 2-layer divergence | **Critical (PR-1)** |
| R3 | config schema 불일치 (yml/yaml, subagent_llm vs top-level) | High (PR-2) |
| R4 | retry policy 동질 처리 (transient/permanent 미구분) | High (PR-2) |
| R5 | model-call observability 경로 누락 (callLlmWithTools/callCodexCli) | **Critical (PR-1)** |
| R6 | halted_partial 에서 synthesize 불가 | Medium (PR-3) |
| R7 | lens 별 learn-loader budget 무통제 | Medium (PR-3) |
| R8 | config schema 역할 분리 미문서화 | Medium (PR-3) |

## 3. 다음 세션 진입 순서 (권장)

### 우선순위 1 — Review Recovery PR-1 (Critical)

**Scope**: R1 + R2 + R5. `resolveExecutionPlan` 통합 resolver 신설 + 모든 LLM call path 에 `[model-call]` observability. 이 PR 이 merged 돼야 Phase 4 govern review 가 재현 가능한 상태에서 돌 수 있음.

**파일**:
- 신설: `src/core-runtime/review/execution-plan-resolver.ts`
- 수정: `src/core-runtime/learning/shared/llm-caller.ts` (resolveProvider → plan 참조)
- 수정: `src/core-runtime/cli/review-invoke.ts` (resolveExecutionProfile 삭제)
- 수정: `src/core-runtime/cli/{inline-http,codex}-review-unit-executor.ts` (plan 참조)
- 추가 observability: `callLlmWithTools`, `callCodexCli` 에 `[model-call]` 로그
- Test 재작성

**규모**: L (~300-400 줄, 15-20 test case). 9-lens review 1-2 round.

### 우선순위 2 — Review Recovery PR-2 (High)

**Scope**: R3 + R4.
- `config.yaml` + `config.yml` transitional loader (yaml 우선, yml deprecation warn)
- `config.yml` hard-coded 참조 전수 `config.yaml` 로 migration (code + docs + tests)
- `ExecutionPlan.retry_policy.classify` per-error-type 분기 (timeout/401/400 → immediate halt, 429/529/connection-reset → retry)

**규모**: M (~200-250 줄).

### 우선순위 3 — Review Recovery PR-3 (Medium)

**Scope**: R6 + R7 + R8.
- `synthesize_strategy.quorum` (partial synthesize 허용)
- `lens_dispatch.per_lens_*_budget`
- `processes/configuration.md` 신설/갱신

**규모**: M.

### 그 후 — Phase 4 govern 설계 Phase 2 진입

F1~F4 finding 을 input 으로 scope 확정 후 Draft 탐색. Review Recovery 가 완료된 상태라 **v0 review 를 재현 가능한 파이프라인으로 재검증** 한 뒤 설계 작업 가능.

오늘 세션 합의 (sketch v2 §4):
- §4.1 A (Config-only explicit `external_http_provider`)
- §4.2 No policy (LiteLLM memory 제약 ladder 반영 안 함)
- §4.3 ii (Nested spawn opt-in = Config-only)

## 4. 잔여 / 이연 항목

| 항목 | 상태 | 다음 액션 |
|---|---|---|
| V0 govern review 4 번째 lens (logic) | halted (Codex timeout × 10 attempts) | Review Recovery PR-1 merged 후 재실행 |
| Sketch v2 → 실제 구현 | Sketch 확정 (PR #94) | PR-1 부터 순차 |
| `.yml` → `.yaml` repo-wide migration | 6 파일 code + 5+ docs/tests | Review Recovery PR-2 scope 내 |
| Phase 4 govern 설계 Phase 2 | Scope input 확보 (F1~F4) | Review Recovery 완료 후 |
| Codex subprocess Connection error 원인 | 미진단 (3 회 timeout, 원인 환경적 가능성) | principal 직접 확인 권장 (VPN/region/backend status) |
| `.onto/config.yml` local 실험 config | gitignored, local 에만 존재 | Review Recovery PR-2 의 yaml migration 후 정리 |
| `dist.bak-20260418/` local backup | 존재 | Review Recovery 완료 후 `rm -rf dist.bak-*` |

## 5. Memory 갱신 필요 (다음 세션 첫 작업 후보 또는 이 세션 마지막)

### Stale 정리

- `project_onto_direction.md` — 경로 `development-records/design/` → `development-records/evolve/` 수정 필요
- CLAUDE.md 의 `design/ 구조 (sprint-kit 흡수, 2026-04-10)` 섹션 — rename 전 경로 언급, 갱신 필요
- `feedback_design_*` memory 파일들 (5개) — 내용은 유효하나 이름이 "design" 으로 남아 rename 후 evolve 에 적용되는 규범임을 명시적으로 반영 필요 (rename or 내용 갱신)

### 신규 추가

- 오늘 세션 성과 + 8 결함 catalog + design axiom 을 track memory 로 보존
- Review Recovery track (3 PR plan) 의 진행률 추적용

## 6. Anti-patterns (오늘 세션 learnings)

- **Silent fallback 은 robustness 가 아니라 debugging 불가능성**. Layer 간 결정 전달 안 하면 5 회 실패가 5 개 다른 silent divergence 로 드러남. PR #91/#93/#94 의 공통 주제.
- **같은 에러 반복 = retry 가치 없음**. Codex 120s timeout × 10 attempts = 25 분 낭비. Per-error-type classify 가 필요.
- **Config extension/nesting 은 hard-coded 가 아니라 schema contract 여야**. `yml`/`yaml` 혼용, `subagent_llm.*` vs 최상위 분리가 모두 silent misconfiguration 원인.
- **Lens 독립성은 review 의 존재 이유이므로 건드리지 않는다**. Infrastructure 재설계 scope 와 혼동 금지 (주체자 피드백 "독립적인 관점들이 사라지면 안돼" 재확인).
- **Dist staleness 의 함정**: pre-existing TS 에러 7건으로 `build:ts-core` 실패 → `dist/` 구버전 → 최근 src 변경 미반영. Tsx 로 src 경로 force 하려면 `dist/` rename. 근본 해결은 TS 에러 수정.
- **Main 에 직접 commit 금지** 규칙 오늘 계속 준수 (모든 PR branch 분기 후 작업).

## 7. 이 handoff 의 생애 주기

- **활성**: 다음 세션이 Review Recovery PR-1 착수할 때까지
- **Superseded**: Review Recovery PR-1 merged 시점에 `status: active → superseded`, 후속 handoff 에서 진행률 + 잔여 업데이트
- **Archive**: Review Recovery 3 PR + Phase 4 Phase 2 진입 완료 시
