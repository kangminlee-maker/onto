# Development Methodology

> 상태: Active
> 목적: `onto` 메인 레포를 프로토타입에서 서비스로 전환할 때 따를 공통 개발 방법을 고정한다.
> 기준 문서:
> - `authority/ontology-as-code-naming-charter.md`
> - `authority/ontology-as-code-korean-terminology-guide.md`
> - `authority/llm-runtime-interface-principles.md`
> - `authority/core-lexicon.yaml`

---

## 1. Core Position

현재 `onto` 메인 레포는 `LLM 프롬프트 + 규칙` 기반의 프로토타입이다.

이 레포의 productization은 아래를 뜻한다.

- 기존 프로토타입이 수행하던 책임을
- 더 명확한 contract와 artifact 위에 다시 올리고
- 그 뒤에 한 경계씩 제품형 구현으로 치환해 나가는 것

즉:

- `프로토타입 -> 서비스`
- `prompt-heavy behavior -> mixed or hardened product behavior`
- `host/model-specific behavior -> model-independent structure`

로 이동하는 과정이다.

---

## 2. Fundamental Rule

### 2.1 `LLM-independent`는 `model-independent`

이 시스템은 `LLM 없이 동작하는 시스템`이 아니다.

정확한 뜻은:

- 특정 모델에 종속되지 않는다.
- 특정 host에 종속되지 않는다.
- 특정 provider나 prompt surface에 종속되지 않는다.

### 2.2 혼합형 제품을 허용한다

최종 제품은 반드시 모든 영역이 결정론적 runtime code일 필요가 없다.

가능한 결과:

1. 대부분이 결정론적 계약 실행 code로 치환된 제품
2. `LLM`과 runtime이 함께 작동하는 mixed 제품

따라서 중요한 것은 “무조건 runtime으로 옮기는 것”이 아니라,
어떤 영역을 `LLM`이 맡고 어떤 영역을 runtime이 맡는지 명확히 분류하는 것이다.

### 2.3 의미 판단은 `LLM`, 결정론적 계약 실행은 runtime

기본 분류 원칙:

- semantic interpretation, judgment, relevance 판단, sufficiency 판단은 `LLM`
- explicit input을 미리 정해진 규칙으로 검증/결속/기록하는 일만 runtime

즉:

- `호출 해석 (InvocationInterpretation)`은 `LLM`
- `호출 고정 (InvocationBinding)`은 runtime

이다.

여기서 runtime은 넓은 의미의 `orchestrator`가 아니라
**결정론적 계약 실행기 (deterministic contract executor)** 로 이해해야 한다.

동시에 runtime은 **적합성 게이트 (conformance gate)** 여야 한다.

runtime이 맡을 수 있는 일은 아래를 모두 만족해야 한다.

1. 입력이 명시적이다
2. 규칙이 사전에 고정되어 있다
3. hidden interpretation이 없다
4. 같은 입력이면 같은 출력이 나온다
5. 형식, 내용, 로직이 모두 결정론적이다

실무적으로는 아래 shortcut으로 판단해도 된다.

- `script`로 안전하게 자동화할 수 없는 일은 `LLM` 소유다

추가로 runtime의 중요한 역할은 아래다.

- `LLM` output을 semantic하게 대신 판단하지 않는다
- 대신 output이 predeclared contract를 충족하는지 결정론적으로 검사한다
- 기준 미달 output을 해석해서 살리지 않고 `fail-close` 한다

즉 runtime은 `LLM`을 semantic하게 결정론적으로 만드는 것이 아니라,
**허용된 계약 범위를 벗어난 drift를 통과시키지 않는 층**이다.

### 2.4 core 구현은 TypeScript로 고정한다

이 레포에서 `ontology as code`를 구현하는 core productization layer는
TypeScript로 작성한다.

이 원칙이 뜻하는 바:

- filesystem artifact seat와 TypeScript type이 연결되어야 한다
- 변수명과 함수명은 canonical ontology concept를 반영해야 한다
- deterministic core replacement는 ad-hoc scripting language가 아니라 TS core 위에 쌓여야 한다

즉 아래는 함께 맞아야 한다.

- `authority/core-lexicon.yaml`
- contract 문서
- TypeScript type/interface
- artifact field name
- runtime variable name

Python 등 다른 언어의 임시 스크립트는 reference experiment로는 가능하지만,
canonical core replacement로 남기면 안 된다.

---

## 3. Productization Loop

이 레포의 구현은 아래 순서를 따른다.

`설계 -> 프롬프트 기반 기준 경로 (PromptBackedReferencePath) -> acceptance observation -> 구현 치환 단계 (ImplementationReplacementStep)`

즉:

1. contract를 먼저 설계한다.
2. 그 설계대로 실제 prompt path를 만든다.
3. 결과를 보고 useful-result와 quality를 확인한다.
4. 그 뒤에 한 boundary씩 구현으로 치환한다.

---

## 4. Always-Keep-Working Rule

이 방법론은 매 단계에서 시스템이 실제로 작동 가능한 형태를 유지해야 한다.

즉:

- 이미 치환된 영역
- 아직 프롬프트로 남아 있는 영역

사이의 interface가 항상 유효해야 한다.

허용되지 않는 것:

- 중간 단계에서 연결이 끊어지는 상태를 오래 두는 것
- prompt path와 implementation path가 서로 다른 artifact truth를 만드는 것

### 4.1 맥락 격리 추론 단위 보존

특히 `검토 (review)`에서는
legacy source path가 사용하던 `subagent`/독립 teammate 모드 자체보다,
그들이 구현하던 **맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)** 를
핵심 실행 원칙으로 보존해야 한다.

이유는 아래 두 가지다.

1. `lens`별 독립성을 보장한다
2. 메인 `LLM` 콘텍스트를 보존해 orchestration과 synthesis에 집중하게 한다
3. 메인 콘텍스트가 drift하더라도 독립된 의미 검증 결과를 유지하게 한다

예시 realization:

- `Agent Teams teammate`
- `subagent`
- `MCP`로 분리된 `LLM`
- `external model worker`

즉 특정 구현 이름이 중요한 것이 아니라,
`review lens` 구조를 실제로 성립시키는 **맥락 격리 추론 단위**가 필요하다는 점이 중요하다.

host마다 realization은 달라도 아래는 유지해야 한다.

- 각 lens는 독립 실행 단위로 돈다
- 메인 콘텍스트는 lens별 세부 reasoning으로 포화되지 않는다
- 종합 단계는 독립 lens 결과를 후행 입력으로 읽는다

### 4.2 interface는 먼저 `LLM`이 잘 작동하도록 설계한다

productization 중간 단계에서는
runtime deterministicization을 늘리는 것보다
`LLM`/runtime interface를 더 잘 자르는 것이 우선일 수 있다.

따라서 interface를 손볼 때의 우선순위는 아래다.

1. `LLM`이 실제로 더 잘 작동하도록 bundle을 줄인다
2. primary target과 output seat를 더 선명하게 한다
3. supporting context는 ref로 내린다
4. seat와 artifact truth는 유지한다
5. 그 다음에만 hardened runtime gate를 더한다

즉 구현 순서는:

- 먼저 `작동하는 review`
- 그 다음 `더 엄격한 runtime`

이다.

이때 `LLM` 입력은 두 층으로 나눠 생각한다.

1. runtime이 제공하는 `선언형 handoff 입력 (DeclaredHandoffInputs)`
2. `LLM`이 문제 해결 중 스스로 획득하는 `자율 탐색 입력 (SelfDirectedExplorationInputs)`

runtime은 첫 번째 층의 artifact seat, presentation mode, control policy만 결정론적으로 고정한다.
두 번째 층에서 어떤 파일이나 웹 근거를 더 찾아야 하는지는 `LLM`이 판단해야 한다.

또한 이 declared boundary는 장기적으로 아래 네 seat로 승격될 수 있어야 한다.

1. `BoundaryPolicy`
2. `BoundaryPresentation`
3. `BoundaryEnforcementProfile`
4. `EffectiveBoundaryState`

현재 단계에서는 prompt-declared boundary로 시작할 수 있지만,
같은 정책이 나중에 MCP-scoped 또는 environment-enforced boundary로
강화될 수 있도록 설계해야 한다.

---

## 5. First Migration Priority

이 레포의 첫 migration priority는 코드 치환이 아니다.

먼저 아래를 이식한다.

1. ontology-as-code 개념 구조
2. canonical terminology
3. prototype-to-service 개발 방법론
4. productization worklist

즉 현재 단계의 첫 작업은:

- runtime rewrite가 아니라
- ontology authority와 development methodology를 메인 레포에 올리는 것이다.
