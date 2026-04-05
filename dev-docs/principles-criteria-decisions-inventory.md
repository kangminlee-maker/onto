# Principles Criteria Decisions Inventory

> 상태: Active
> 목적: `onto-llm-independent/dev-docs`와 `onto/dev-docs`에서 선언된 최신 개발 원칙, 판정 기준, 결정 사항을 추출해 inventory로 남기고, 상위 charter 누락 여부를 점검한다.
> 기준 문서:
> - `dev-docs/productization-charter.md`
> - `/Users/kangmin/cowork/onto-llm-independent/dev-docs/model-independent-llm-harness-doctrine.md`
> - `/Users/kangmin/cowork/onto-llm-independent/dev-docs/llm-runtime-boundary-criteria.md`
> - `/Users/kangmin/cowork/onto-llm-independent/dev-docs/prompt-first-implementation-loop.md`
> - `/Users/kangmin/cowork/onto-llm-independent/dev-docs/runtime-language-decision.md`
> - `/Users/kangmin/cowork/onto-llm-independent/dev-docs/reference-harness-governance.md`
> - `/Users/kangmin/cowork/onto-llm-independent/dev-docs/review-semantic-acceptance-suite.md`
> - `/Users/kangmin/cowork/onto-llm-independent/dev-docs/review-semantic-unlock-policy.md`
> - `dev-docs/development-methodology.md`
> - `dev-docs/review-productized-live-path.md`
> - `dev-docs/llm-runtime-interface-principles.md`

---

## 1. Position

이 inventory는 세 층을 분리한다.

1. `원칙 (principles)`
2. `판정 기준 (criteria)`
3. `결정 사항 (decisions)`

원칙은 방향과 금지선을 정한다.
기준은 무엇을 어떻게 판정할지 정한다.
결정 사항은 현재 시점에 이미 채택된 경로를 정한다.

---

## 2. Principles

### 2.1 최상위 원칙

1. `LLM-independent`는 `LLM-free`가 아니라 `model-independent`다.
2. `onto`의 본질은 `model-independent LLM harness/workbench`다.
3. ontology-as-code는 `LLM`을 대체하지 않고, `LLM` 작업의 구조와 계약을 고정한다.
4. prompt-backed path와 implementation path는 같은 artifact truth를 유지해야 한다.
5. 시스템은 매 단계에서 실제로 작동 가능한 상태를 유지해야 한다.

### 2.2 책임 분리 원칙

1. semantic interpretation와 judgment는 `LLM` 소유다.
2. deterministic binding, validation, persistence는 runtime 소유다.
3. mixed stage는 반드시 `InvocationInterpretation`과 `InvocationBinding`으로 분리해야 한다.
4. runtime은 `reasoner`가 아니며, 넓은 의미의 `orchestrator`도 아니다.
5. runtime은 오직 **결정론적 계약 실행기 (deterministic contract executor)** 여야 한다.
6. `script`로 안전하게 자동화할 수 없는 일은 `LLM` 소유다.
7. runtime은 동시에 **적합성 게이트 (conformance gate)** 여야 한다.
8. runtime은 semantic 판단을 대신하지 않고, contract 미달 output을 `fail-close` 해야 한다.

### 2.3 review 구조 원칙

1. `review`의 canonical 구조는 `9개 lens + synthesize`다.
2. `onto_axiology`는 독립 lens다.
3. `onto_synthesize`는 종합 단계이며 새 관점을 invent하면 안 된다.
4. `New Perspectives`는 `onto_axiology` 소유다.
5. `맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)`는 선택적 최적화가 아니라 canonical requirement다.
6. `subagent`, `Agent Teams teammate`, `MCP` 분리 `LLM`, external worker는 realization example이다.

### 2.4 artifact 원칙

1. `review`의 primary output은 `리뷰 기록 (ReviewRecord)`다.
2. `round1/*.md`, `synthesis.md`, `final-output.md`는 human-readable source/output layer다.
3. later `learn/govern`는 `ReviewRecord`를 읽어야 한다.
4. `review`가 candidate/provisional/promotion을 직접 먹는 구조로 되돌아가면 안 된다.

### 2.5 품질 / 안전 원칙

1. invocation usability와 semantic usefulness는 분리해서 검증해야 한다.
2. prompt path는 설계된 process의 reference realization이어야 한다.
3. semantic quality와 unlock이 증명되기 전까지 기본 posture는 `fail-close`다.
4. lineage completeness만으로는 unlock되지 않는다.
5. silent fallback은 금지다.

### 2.6 core / authority 원칙

1. core productization layer는 TypeScript로 구현한다.
2. concept, type, variable, artifact field, filesystem seat가 같은 ontology 체계를 따라야 한다.
3. hardened runtime authority는 prose-only 문서를 직접 authoritative input으로 소비하면 안 된다.
4. reference path는 bounded comparison path이지 authoritative core가 아니다.

### 2.7 interface 원칙

1. `LLM`/runtime interface는 artifact-first여야 한다.
2. interface는 `선언형 handoff 입력`과 `자율 탐색 입력`을 구분해야 한다.
3. runtime은 첫 번째 층만 제공하고, 두 번째 층의 대상 선택을 대신하면 안 된다.
4. interface bundle은 `smallest sufficient bundle`이어야 한다.
5. primary target content는 embed 가능하지만 supporting context는 원칙적으로 ref로 넘긴다.
6. packet은 giant duplicated payload가 아니라 lightweight handoff여야 한다.
7. packet에 명시되지 않은 reference chain을 hidden하게 재귀 확장하면 안 된다.
8. boundary는 input list뿐 아니라 presentation mode와 control policy까지 선언해야 한다.
9. runtime은 interface의 meaning이 아니라 seat와 gate만 고정한다.
10. boundary는 필요 시 `BoundaryPolicy`, `BoundaryPresentation`, `BoundaryEnforcementProfile`, `EffectiveBoundaryState`로 분리해야 한다.
11. 여러 제약이 충돌할 때는 가장 강한 deny가 승리해야 한다.
12. boundary 때문에 문제를 풀 수 없으면 degraded/fail-close 상태로 끝나야 한다.

---

## 3. Criteria

### 3.1 `LLM` / runtime ownership criteria

판정 질문:

1. semantic ambiguity가 있는가
2. open-world judgment가 필요한가
3. context relevance ranking이 필요한가
4. evidence sufficiency judgment가 필요한가
5. explicit input을 closed-world로 검증/결속/기록하는 일인가
6. hidden interpretation 없이 end-to-end `script` 자동화가 가능한가
7. 같은 입력이면 항상 같은 출력이 나오는가
8. semantic 재해석 없이 predeclared contract conformance를 검사할 수 있는가

판정 규칙:

- semantic ambiguity => `LLM`
- open-world judgment => `LLM`
- relevance ranking => `LLM`
- evidence sufficiency judgment => `LLM`
- hidden interpretation 없는 closed-world validation => runtime
- same-input/same-output binding / persistence => runtime
- semantic 재해석 없이 contract conformance 검사 가능 => runtime

### 3.2 core runtime language criteria

runtime 언어 평가 기준:

1. core contract 표현력
2. ontology-as-code 적합성
3. optional worker 연계성
4. 성능 모델 적합성
5. 구현 비용
6. 변경 용이성
7. boundary 적합성

### 3.3 cutover / parity criteria

authoritative core cutover 최소 기준:

1. artifact parity
2. route parity
3. fail-closed parity
4. freshness parity
5. comparison path가 authoritative가 아님이 보장됨

### 3.4 semantic unlock criteria

unlock 최소 기준:

1. execution lineage 신뢰 가능성
2. production semantic quality bar

즉 lineage completeness만으로 unlock되지 않는다.

### 3.5 embed vs ref criteria

판정 질문:

1. 이 정보가 이번 reasoning의 primary object인가
2. file lookup보다 즉시 가시성이 더 중요한가
3. supporting context인가
4. 이미 authoritative file seat가 있는가
5. giant repeated payload를 만들 위험이 있는가

판정 규칙:

- primary reasoning object이면서 짧고 핵심적인 것은 embed 가능
- supporting context와 reusable artifact는 ref
- 이미 file seat가 있는 큰 문서는 ref 우선
- repeated giant payload를 만들면 ref로 내린다

### 3.6 declared boundary criteria

판정 질문:

1. 어떤 요소가 declared handoff input인가
2. 어떤 요소가 self-directed exploration input인가
3. 이 요소는 embed가 맞는가 ref가 맞는가
4. exploration allowance를 어디까지 선언해야 하는가
5. write boundary를 어떻게 제한해야 하는가
6. provenance obligation이 필요한가
7. missing output 시 어떤 fail-close 상태로 끝내야 하는가

판정 규칙:

- role, primary target, required context, output seat는 declared handoff input
- 추가 파일 선택과 웹 리서치는 self-directed exploration input
- primary reasoning object는 embed 가능, supporting context는 ref
- write는 output seat로 제한
- self-directed exploration이 있으면 provenance obligation을 선언
- contract 미달 output은 semantic repair 없이 fail-close

추가 판정 규칙:

- 정책 선언과 실제 강제를 구분해야 하면 `BoundaryPolicy`와 `BoundaryEnforcementProfile`을 분리한다
- 실제 적용 상태가 중요하면 `EffectiveBoundaryState`를 별도 seat로 둔다
- 여러 층의 제약이 충돌하면 strongest deny wins
- 경계 제약 때문에 evidence 확보가 불가능하면 degraded 또는 fail-close로 끝낸다

---

## 4. Decisions

### 4.1 현재 채택된 구조 결정

1. `review-first`를 현재 제품화 1순위로 둔다.
2. `9개 lens + synthesize`를 `review`의 canonical 구조로 채택한다.
3. `맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)`를 canonical 실행 성질로 보존한다.
4. `ReviewRecord`를 `review`의 primary artifact로 채택한다.

### 4.2 현재 채택된 기술 결정

1. TS core first
2. optional worker는 언어중립 boundary
3. current MVP path는 TS-only로도 완결 가능해야 함
4. reference path는 bounded comparison role만 가짐
5. execution profile은 `execution_realization`과 `host_runtime` 두 축으로 분리한다
6. host-runtime 기본 realization은
   - `codex` → `subagent`
   - `claude` → `agent-teams`
   이지만, 사용자 설정이 항상 우선한다
7. 현재 wired profile은
   - `subagent + codex`
   - `subagent + claude`
   - `agent-teams + claude`
   이다

### 4.3 현재 채택된 운영 결정

1. `review`는 final unlock 전까지 fail-close 유지
2. semantic usefulness는 invocation usability와 별도 검증
3. prompt-backed path가 먼저 살아야 하고, 그 뒤에만 implementation replacement를 진행
4. interface tuning에서는 “더 많은 deterministicization”보다 “더 잘 작동하는 bounded LLM handoff”를 우선한다

---

## 5. Charter Coverage Check

현재 [`productization-charter.md`](/Users/kangmin/cowork/onto/dev-docs/productization-charter.md)는 아래를 포함해야 한다.

1. 최상위 원칙
2. 책임 분리 원칙
3. review 구조 원칙
4. artifact 원칙
5. 품질 / 안전 원칙
6. core / authority 원칙
7. ownership criteria
8. runtime language criteria
9. cutover / parity criteria
10. semantic unlock criteria
11. 현재 채택된 결정

이번 inventory 기준으로, 위 항목들은 상위 charter에 반영되어 있다.
