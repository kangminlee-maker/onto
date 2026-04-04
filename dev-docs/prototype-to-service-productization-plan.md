# Prototype-to-Service Productization Plan

> 상태: Active
> 목적: 현재 `onto` 메인 레포를 기존 프로토타입 구조에서 서비스 구조로 전환하기 위한 첫 migration baseline을 고정한다.
> 기준 문서:
> - `dev-docs/development-methodology.md`
> - `dev-docs/ontology-as-code-naming-charter.md`
> - `authority/core-lexicon.yaml`

---

## 1. Current Position

현재 `onto` 메인 레포는 아래 특징을 가진다.

- Claude Code plugin 중심 구조
- `commands/`, `processes/`, `roles/` 중심의 prompt-driven execution
- `review`와 `build`가 프로토타입 수준에서 동작
- domain documents와 learning 구조가 이미 축적되어 있음

즉 이 레포는 “버릴 것”이 아니라, productization의 reference prototype이다.

---

## 2. Productization Goal

이 레포를 바로 deterministic runtime으로 바꾸는 것이 목표가 아니다.

첫 목표는 아래다.

`프로토타입이 가진 핵심 behavior를 보존한 채, ontology-as-code authority와 model-independent product structure를 먼저 올린다.`

---

## 3. First Batch Scope

첫 배치에서 반영할 것은 아래다.

1. `authority/core-lexicon.yaml`
2. `dev-docs/ontology-as-code-naming-charter.md`
3. `dev-docs/ontology-as-code-korean-terminology-guide.md`
4. `dev-docs/development-methodology.md`
5. 이 worklist 문서

즉 첫 배치는:

- 개념 구조
- 용어 authority
- 개발 방법론

을 메인 레포에 반영하는 일이다.

---

## 4. What Does Not Happen Yet

첫 배치에서 아직 하지 않는 것:

1. `commands/`, `processes/`, `roles/` 전면 rewrite
2. host adapter/runtime implementation port
3. `review` runtimeized rewrite
4. `learn/govern` implementation

이건 첫 배치의 목적이 아니다.

---

## 5. Migration Rule

이후 migration은 아래 순서를 따른다.

1. authority and naming
2. prototype-to-product boundary map
3. prompt-backed reference execution path
4. implementation replacement step

즉:

- 먼저 개념을 바로잡고
- 그 다음 경계를 나누고
- 그 다음 실행 경로를 옮긴다.

---

## 6. Immediate Next Step

첫 배치가 끝난 뒤 다음 작업은 아래다.

1. 현재 `onto` 프로토타입의 구성요소를
   - `LLM-owned`
   - `runtime-owned`
   - `mixed`
   로 분류
2. `review`를 가장 먼저 productization 대상으로 삼아
   prototype flow를 product flow로 매핑

즉 다음 라운드의 핵심은:

- `온톨로지 구조 반영`
다음의
- `경계 분류`
다.

현재 이 단계의 baseline 문서는 아래다.

- `dev-docs/prototype-runtime-llm-boundary-audit.md`
- `dev-docs/review-prototype-to-product-mapping.md`
- `dev-docs/review-lens-registry.md`
- `dev-docs/review-interpretation-contract.md`
- `dev-docs/review-binding-contract.md`
- `dev-docs/review-lens-prompt-contract.md`
- `dev-docs/review-synthesize-prompt-contract.md`
