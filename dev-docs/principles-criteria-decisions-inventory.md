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
