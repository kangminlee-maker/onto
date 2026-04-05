# AGENTS

> 상태: Active
> 목적: 이 레포에서 작업하는 사람과 에이전트가 `onto` 제품화의 목표, 개발 방식, 핵심 authority 문서를 빠르게 찾고 같은 기준으로 움직이게 한다.

---

## 1. Position

이 레포는 단순한 신규 구현 레포가 아니다.

- 기존 `onto` 프로토타입을 보존한다
- 그 위에 `ontology as code` 기준의 개념, 계약, artifact를 다시 세운다
- 먼저 `프롬프트 기반 기준 경로 (PromptBackedReferencePath)`를 설계대로 작동시킨다
- 이후 한 경계씩 `구현 치환 단계 (ImplementationReplacementStep)`로 제품형 구현으로 바꾼다

즉 이 레포는:

- reference prototype
- prompt-backed reference execution source
- productization target

를 동시에 가진다.

---

## 2. Reading Order

새 작업을 시작할 때는 아래 순서로 읽는다.

1. [productization-charter.md](/Users/kangmin/cowork/onto/dev-docs/productization-charter.md)
2. [development-methodology.md](/Users/kangmin/cowork/onto/dev-docs/development-methodology.md)
3. [ontology-as-code-guideline.md](/Users/kangmin/cowork/onto/dev-docs/ontology-as-code-guideline.md)
4. [llm-runtime-interface-principles.md](/Users/kangmin/cowork/onto/dev-docs/llm-runtime-interface-principles.md)
5. [principles-criteria-decisions-inventory.md](/Users/kangmin/cowork/onto/dev-docs/principles-criteria-decisions-inventory.md)
6. [core-lexicon.yaml](/Users/kangmin/cowork/onto/authority/core-lexicon.yaml)
7. [ontology-as-code-naming-charter.md](/Users/kangmin/cowork/onto/dev-docs/ontology-as-code-naming-charter.md)
8. [ontology-as-code-korean-terminology-guide.md](/Users/kangmin/cowork/onto/dev-docs/ontology-as-code-korean-terminology-guide.md)

`review`를 건드릴 때는 위 6개 다음으로 아래를 읽는다.

1. [review-productized-live-path.md](/Users/kangmin/cowork/onto/dev-docs/review-productized-live-path.md)
2. [review-nested-spawn-coordinator-contract.md](/Users/kangmin/cowork/onto/dev-docs/review-nested-spawn-coordinator-contract.md)
3. [review-lens-registry.md](/Users/kangmin/cowork/onto/dev-docs/review-lens-registry.md)
4. [review-interpretation-contract.md](/Users/kangmin/cowork/onto/dev-docs/review-interpretation-contract.md)
5. [review-binding-contract.md](/Users/kangmin/cowork/onto/dev-docs/review-binding-contract.md)
6. [review-lens-prompt-contract.md](/Users/kangmin/cowork/onto/dev-docs/review-lens-prompt-contract.md)
7. [review-synthesize-prompt-contract.md](/Users/kangmin/cowork/onto/dev-docs/review-synthesize-prompt-contract.md)
8. [review-execution-preparation-artifacts.md](/Users/kangmin/cowork/onto/dev-docs/review-execution-preparation-artifacts.md)
9. [review-prompt-execution-runner-contract.md](/Users/kangmin/cowork/onto/dev-docs/review-prompt-execution-runner-contract.md)
10. [review-record-contract.md](/Users/kangmin/cowork/onto/dev-docs/review-record-contract.md)
11. [review-record-field-mapping.md](/Users/kangmin/cowork/onto/dev-docs/review-record-field-mapping.md)

---

## 3. Highest Philosophy

이 레포의 최상위 목표와 철학은 아래 문서가 가진다.

- [productization-charter.md](/Users/kangmin/cowork/onto/dev-docs/productization-charter.md)
- [development-methodology.md](/Users/kangmin/cowork/onto/dev-docs/development-methodology.md)
- [ontology-as-code-guideline.md](/Users/kangmin/cowork/onto/dev-docs/ontology-as-code-guideline.md)
- [llm-runtime-interface-principles.md](/Users/kangmin/cowork/onto/dev-docs/llm-runtime-interface-principles.md)
- [principles-criteria-decisions-inventory.md](/Users/kangmin/cowork/onto/dev-docs/principles-criteria-decisions-inventory.md)

핵심 요약:

1. `LLM-independent`는 `LLM-free`가 아니라 `model-independent`다.
2. `onto`는 `LLM`을 대체하는 시스템이 아니라, `LLM` 작업의 구조와 계약을 고정하는 제품 라인이다.
3. 개발 순서는 `설계 -> 프롬프트 기반 기준 경로 -> acceptance observation -> 구현 치환 단계`다.
4. 시스템은 매 단계에서 실제로 작동 가능한 상태를 유지해야 한다.
5. prompt path와 implementation path는 같은 artifact truth를 유지해야 한다.
6. `LLM`/runtime interface는 artifact-first minimal handoff여야 한다.
7. `LLM` 입력은 runtime이 주는 `선언형 handoff 입력`과 `LLM`이 스스로 확보하는 `자율 탐색 입력`으로 나뉜다.
8. boundary는 input list뿐 아니라 presentation mode와 control policy까지 포함한다.
9. 필요하면 boundary를 `경계 정책`, `경계 제시`, `경계 강제 프로필`, `실효 경계 상태`로 분리한다.
10. 여러 제약이 충돌할 때는 가장 강한 deny가 승리한다.

---

## 4. Core Ownership Rule

가장 중요한 경계 규칙은 아래다.

- `LLM`은 의미 판단을 맡는다
- runtime은 결정론적 계약 실행만 맡는다

더 정확히는:

- runtime은 `결정론적 계약 실행기 (deterministic contract executor)`다
- 동시에 `적합성 게이트 (conformance gate)`다

즉 runtime은:

1. 입력이 명시적일 때만
2. 규칙이 사전에 고정되어 있을 때만
3. hidden interpretation이 없을 때만
4. 같은 입력이면 같은 출력이 나올 때만
5. 형식, 내용, 로직이 모두 결정론적일 때만

일을 맡을 수 있다.

실무 규칙으로는 이렇게 판단한다.

- `script`로 안전하게 자동화할 수 없는 일은 `LLM` 소유다.

runtime의 또 다른 핵심 역할:

- `LLM`의 의미 판단을 대신하지 않는다
- contract 미달 output을 해석해서 살리지 않는다
- 기준 미달 output을 `fail-close` 한다
- 입력, 출력, artifact, gate를 결정론적으로 고정해서 drift를 통과시키지 않는다

이 기준은 [productization-charter.md](/Users/kangmin/cowork/onto/dev-docs/productization-charter.md) 와 [development-methodology.md](/Users/kangmin/cowork/onto/dev-docs/development-methodology.md) 에서 authoritative하다.

---

## 5. Canonical Ontology Terms

개념 SSOT는 [core-lexicon.yaml](/Users/kangmin/cowork/onto/authority/core-lexicon.yaml) 이다.

특히 자주 쓰는 개념은 아래다.

- `호출 해석 (InvocationInterpretation)`
- `호출 고정 (InvocationBinding)`
- `검토 대상 범위 (review_target_scope)`
- `도메인 최종 선택 (DomainFinalSelection)`
- `lens 선택 계획 (LensSelectionPlan)`
- `리뷰 기록 (ReviewRecord)`
- `프롬프트 기반 기준 경로 (PromptBackedReferencePath)`
- `구현 치환 단계 (ImplementationReplacementStep)`
- `맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)`

한글 대응어 기준은 [ontology-as-code-korean-terminology-guide.md](/Users/kangmin/cowork/onto/dev-docs/ontology-as-code-korean-terminology-guide.md) 를 따른다.

이름 규칙은 [ontology-as-code-naming-charter.md](/Users/kangmin/cowork/onto/dev-docs/ontology-as-code-naming-charter.md) 를 따른다.

---

## 6. Review Canonical Direction

현재 1순위 제품화 대상은 `검토 (review)`다.

기준 문서:

- [review-productized-live-path.md](/Users/kangmin/cowork/onto/dev-docs/review-productized-live-path.md)
- [review-lens-registry.md](/Users/kangmin/cowork/onto/dev-docs/review-lens-registry.md)

canonical review 구조:

1. `호출 해석 (InvocationInterpretation)`
2. 사용자 확인 / 선택 확정
3. `호출 고정 (InvocationBinding)`
4. execution preparation artifacts
5. `9개 lens`
6. `종합 단계 (synthesize)`
7. `리뷰 기록 (ReviewRecord)`
8. human-readable final output

중요한 점:

1. `review`의 canonical 구조는 `9개 lens + 종합 단계 (synthesize)`다.
2. `New Perspectives`는 `가치/목적 정합 lens (onto_axiology)` 소유다.
3. `onto_synthesize`는 새 관점을 invent하면 안 된다.
4. `ReviewRecord`가 primary artifact다.
5. `round1/*.md`, `synthesis.md`, `final-output.md`는 human-readable source/output layer다.

---

## 7. Context-Isolated Reasoning Units

`review lens`는 canonical하게 **맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)** 로 실행되어야 한다.

이 개념이 중요한 이유:

1. lens 독립성을 보장한다
2. 메인 콘텍스트를 보존한다
3. 메인 콘텍스트의 의미 drift를 무비판적으로 따라가지 않는 독립 의미 검증을 유지한다

가능한 realization 예:

- `Agent Teams teammate`
- `subagent`
- `MCP`로 분리된 `LLM`
- `external model worker`

현재 wired execution profile:

- `subagent + codex`
- `subagent + claude`
- `agent-teams + claude`

현재 미지원 profile:

- `agent-teams + codex`

중요한 것은 구현 이름이 아니라 아래 성질이다.

1. 메인 콘텍스트와 상태를 공유하지 않는다
2. 계약된 입력만 받는다
3. 계약된 출력만 낸다
4. 독립적으로 판단한다

기준 문서:

- [review-lens-registry.md](/Users/kangmin/cowork/onto/dev-docs/review-lens-registry.md)
- [review-lens-prompt-contract.md](/Users/kangmin/cowork/onto/dev-docs/review-lens-prompt-contract.md)
- [review-synthesize-prompt-contract.md](/Users/kangmin/cowork/onto/dev-docs/review-synthesize-prompt-contract.md)

---

## 8. Artifact Truth

현재 `review`의 artifact truth는 아래다.

- `interpretation.yaml`
- `binding.yaml`
- `session-metadata.yaml`
- `execution-plan.yaml`
- `execution-preparation/*`
- `final-output.md`
- `review-record.yaml`

이 중 primary artifact는 `review-record.yaml`이다.

관련 문서:

- [review-execution-preparation-artifacts.md](/Users/kangmin/cowork/onto/dev-docs/review-execution-preparation-artifacts.md)
- [review-record-contract.md](/Users/kangmin/cowork/onto/dev-docs/review-record-contract.md)
- [review-record-field-mapping.md](/Users/kangmin/cowork/onto/dev-docs/review-record-field-mapping.md)

---

## 9. TypeScript Core

`ontology as code`의 core 제품화 계층은 TypeScript로 간다.

현재 TS core entrypoint:

- [artifact-types.ts](/Users/kangmin/cowork/onto/src/core-runtime/review/artifact-types.ts)
- [review-artifact-utils.ts](/Users/kangmin/cowork/onto/src/core-runtime/review/review-artifact-utils.ts)
- [write-review-interpretation.ts](/Users/kangmin/cowork/onto/src/core-runtime/cli/write-review-interpretation.ts)
- [bootstrap-review-binding.ts](/Users/kangmin/cowork/onto/src/core-runtime/cli/bootstrap-review-binding.ts)
- [materialize-review-execution-preparation.ts](/Users/kangmin/cowork/onto/src/core-runtime/cli/materialize-review-execution-preparation.ts)
- [prepare-review-session.ts](/Users/kangmin/cowork/onto/src/core-runtime/cli/prepare-review-session.ts)
- [materialize-review-prompt-packets.ts](/Users/kangmin/cowork/onto/src/core-runtime/cli/materialize-review-prompt-packets.ts)
- [start-review-session.ts](/Users/kangmin/cowork/onto/src/core-runtime/cli/start-review-session.ts)
- [run-review-prompt-execution.ts](/Users/kangmin/cowork/onto/src/core-runtime/cli/run-review-prompt-execution.ts)
- [mock-review-unit-executor.ts](/Users/kangmin/cowork/onto/src/core-runtime/cli/mock-review-unit-executor.ts)
- [subagent-review-unit-executor.ts](/Users/kangmin/cowork/onto/src/core-runtime/cli/subagent-review-unit-executor.ts)
- [agent-teams-review-unit-executor.ts](/Users/kangmin/cowork/onto/src/core-runtime/cli/agent-teams-review-unit-executor.ts)
- [codex-review-unit-executor.ts](/Users/kangmin/cowork/onto/src/core-runtime/cli/codex-review-unit-executor.ts)
- [render-review-final-output.ts](/Users/kangmin/cowork/onto/src/core-runtime/cli/render-review-final-output.ts)
- [assemble-review-record.ts](/Users/kangmin/cowork/onto/src/core-runtime/cli/assemble-review-record.ts)
- [complete-review-session.ts](/Users/kangmin/cowork/onto/src/core-runtime/cli/complete-review-session.ts)

실무적으로는 아래 entrypoint를 먼저 본다.

- preferred: `npm run review:invoke -- ...`
- internal bounded path:
  - `npm run review:start-session -- ...`
  - `npm run review:run-prompt-execution -- ...`
  - `npm run review:complete-session -- ...`

관련 설정:

- [package.json](/Users/kangmin/cowork/onto/package.json)
- [tsconfig.json](/Users/kangmin/cowork/onto/tsconfig.json)

---

## 10. Authority Priority

문서가 충돌하면 아래 우선순위를 따른다.

1. [core-lexicon.yaml](/Users/kangmin/cowork/onto/authority/core-lexicon.yaml)
2. [productization-charter.md](/Users/kangmin/cowork/onto/dev-docs/productization-charter.md)
3. [development-methodology.md](/Users/kangmin/cowork/onto/dev-docs/development-methodology.md)
4. [review-productized-live-path.md](/Users/kangmin/cowork/onto/dev-docs/review-productized-live-path.md)
5. 개별 contract 문서
6. TS core type / artifact writer
7. legacy process / command / role 문서

즉 아래는 source material일 수는 있어도 최상위 authority가 아니다.

- [process.md](/Users/kangmin/cowork/onto/process.md)
- [processes/review.md](/Users/kangmin/cowork/onto/processes/review.md)
- `roles/*.md`

---

## 11. Current Priority

현재 우선순위는 아래다.

1. `검토 (review)`의 `제품화된 실시간 경로 (productized live path)`를 canonical execution truth로 정착
2. `9개 lens + 종합 단계 (synthesize)` 구조를 실제 실행 truth로 정착
3. `맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)`를 유지
4. `리뷰 기록 (ReviewRecord)`를 actual primary artifact로 도입
5. 그 뒤에 한 경계씩 runtime 구현으로 치환

새 작업은 항상 아래 질문으로 시작한다.

1. 어떤 ontology concept를 바꾸는가
2. canonical seat가 어디인가
3. `LLM` 소유인가, runtime 소유인가
4. 먼저 prompt-backed path에서 작동시킬 수 있는가
5. 이후 어떤 bounded TS runtime step으로 치환할 것인가
