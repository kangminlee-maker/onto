# Ontology as Code Guideline

> 상태: Active
> 목적: 이 레포가 제품화를 진행하면서 정리한 `Ontology as Code` 원칙을 하나의 guideline으로 고정한다.
> 기준 문서:
> - `authority/core-lexicon.yaml`
> - `authority/productization-charter.md`
> - `authority/development-methodology.md`
> - `authority/llm-runtime-interface-principles.md`
> - `authority/ontology-as-code-naming-charter.md`
> - `authority/ontology-as-code-korean-terminology-guide.md`

---

## 1. Position

이 레포에서 `Ontology as Code`는
단순 naming rule이나 ontology 문서 정리를 뜻하지 않는다.

의미는 아래다.

1. 개념을 먼저 고정한다
2. 그 개념을 contract로 내린다
3. 그 contract를 artifact seat로 내린다
4. 그 artifact를 type, field, variable, filesystem path와 일치시킨다
5. prompt path와 implementation path가 같은 concept truth를 보게 만든다

한 문장으로 말하면:

- `Ontology as Code`는 `LLM` 작업과 runtime 작업을 같은 개념 체계 위에서 재현 가능하게 고정하는 방식이다.

---

## 2. Core Goal

이 guideline의 목표는 아래다.

1. 같은 개념이 문서와 코드에서 같은 뜻으로 작동하게 만든다
2. `LLM`과 runtime의 책임을 ontology 기준으로 분리한다
3. prompt path와 implementation path가 같은 artifact truth를 보게 만든다
4. host/model/provider가 바뀌어도 유지되는 structure를 만든다

즉 중요한 것은 “얼마나 많은 코드를 썼는가”가 아니라,
**개념, 계약, artifact, 구현이 얼마나 일관되게 연결되어 있는가**다.

---

## 3. What It Is Not

`Ontology as Code`는 아래와 같지 않다.

1. 단순 naming convention
2. 문서 정리 습관
3. `LLM`을 없애는 시도
4. 모든 것을 runtime code로 옮기려는 시도
5. ontology 문서와 실제 구현이 느슨하게 연결된 상태

---

## 4. Canonical Mapping Rule

`Ontology as Code`는 아래 사슬이 끊기지 않아야 한다.

```text
concept
-> contract
-> artifact seat
-> type/interface
-> field name
-> variable name
-> filesystem path
```

예:

```text
ReviewRecord
-> review-record contract
-> .onto/review/{session_id}/review-record.yaml
-> interface ReviewRecord
-> review_record_id / record_status / final_output_ref
-> reviewRecord
```

이 연결 중 하나라도 끊어지면
그 구현은 `Ontology as Code` 적합성이 떨어진다.

---

## 5. Same Concept, Same Label

하나의 개념에는 하나의 canonical label만 쓴다.

예:

- `호출 해석 (InvocationInterpretation)`
- `호출 고정 (InvocationBinding)`
- `리뷰 기록 (ReviewRecord)`
- `맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)`

같은 개념을 상황마다 다른 이름으로 부르면 안 된다.

또 하나의 label은 하나의 conceptual axis에서만 써야 한다.

예:

- `execution_realization`은 실행 구조 축
- `host_runtime`은 실행 환경 축

---

## 6. Ownership Rule

### 6.1 `LLM` owns meaning

아래는 `LLM` 소유다.

1. semantic interpretation
2. semantic judgment
3. relevance 판단
4. evidence sufficiency 판단
5. disagreement / uncertainty 보존

### 6.2 runtime owns deterministic contract execution

runtime은 아래일 뿐이다.

- `결정론적 계약 실행기 (deterministic contract executor)`
- `적합성 게이트 (conformance gate)`

runtime이 맡을 수 있는 일은 아래를 모두 만족해야 한다.

1. 입력이 명시적이다
2. 규칙이 사전에 고정되어 있다
3. hidden interpretation이 없다
4. 같은 입력이면 같은 출력이 나온다
5. 형식, 내용, 로직이 모두 결정론적이다

실무 shortcut:

- `script`로 안전하게 자동화할 수 없는 일은 `LLM` 소유다.

### 6.3 Runtime must not reason

runtime은 아래를 하면 안 된다.

1. prompt를 semantic하게 보정
2. relevance를 새로 판단
3. 부족한 reasoning을 추론으로 보완
4. `LLM` output을 해석해서 살리기

runtime의 역할은
의미를 대신 판단하는 것이 아니라,
**계약 미달 output을 통과시키지 않는 것**이다.

---

## 7. Interface Rule

### 7.1 Artifact-first interface

`LLM`/runtime interface는 자유 텍스트 conversation이 아니라
artifact seat 중심으로 설계한다.

즉 handoff는 아래를 포함해야 한다.

1. input artifact refs
2. optional embedded primary content
3. output artifact seat
4. bounded execution directives

### 7.2 Two-layer input model

`LLM` 입력은 두 층으로 나뉜다.

1. `선언형 handoff 입력 (DeclaredHandoffInputs)`
2. `자율 탐색 입력 (SelfDirectedExplorationInputs)`

runtime은 첫 번째 층만 고정한다.
두 번째 층에서 무엇을 더 읽고 탐색할지는 `LLM`이 판단한다.

즉:

- runtime은 `무엇이 반드시 주어져야 하는가`를 고정한다
- `LLM`은 `무엇을 더 찾아야 하는가`를 판단한다

### 7.3 Boundary is first-class

경계는 단순 input file list가 아니다.

최소 아래 seat로 분리해 다룰 수 있어야 한다.

1. `경계 정책 (BoundaryPolicy)`
2. `경계 제시 (BoundaryPresentation)`
3. `경계 강제 프로필 (BoundaryEnforcementProfile)`
4. `실효 경계 상태 (EffectiveBoundaryState)`

규칙:

- declared policy와 실제 enforcement를 혼동하지 않는다
- 여러 제약이 충돌하면 가장 강한 deny가 승리한다
- 경계 때문에 필요한 근거를 확보하지 못하면 타협하지 않고 degraded / fail-close 한다

---

## 8. Execution Rule

### 8.1 Prompt path is a reference realization

`프롬프트 기반 기준 경로 (PromptBackedReferencePath)`는
설계의 대략적인 근사치가 아니라,
설계된 process의 reference realization이어야 한다.

즉 prompt path도 아래를 따라야 한다.

1. 같은 contract
2. 같은 execution order
3. 같은 output shape
4. 같은 artifact truth

### 8.2 Replace one boundary at a time

`구현 치환 단계 (ImplementationReplacementStep)`는
한 번에 한 경계씩 진행한다.

순서:

1. 설계한다
2. prompt-backed reference path로 먼저 살린다
3. 결과를 본다
4. 그 다음 한 책임만 runtime으로 치환한다

### 8.3 Separate Discovery From Implementation

치환 과정에서 프로토타입에 없던 새 개념을 발견하는 것은 자연스럽다.
프로토타입에서는 `LLM`이 암묵적으로 처리하던 것이
코드로 옮겨지면서 명시적 설계가 필요해지기 때문이다.

하지만 발견과 구현의 타이밍은 분리해야 한다.

1. 새 개념을 **발견**하는 것은 자연스럽고 좋다
2. 발견한 개념을 **기록**하는 것은 즉시 해야 한다 (문서, lexicon, contract)
3. 하지만 그 개념을 **구현**하는 것은 현재 치환 대상이 작동한 이후로 미룬다

판별 기준은 한 가지다.

> **"이것 없이 다음 실행이 성공할 수 있는가?"**

- **아니오** → 지금 구현 (blocker)
- **예** → 기록만 하고, 실행 성공 이후에 구현 (enhancement)

이 규칙이 없으면 치환과 진화가 섞이면서
runtime infrastructure는 커지는데 실제 실행은 작동하지 않는 상태가 오래 유지된다.

### 8.4 Always Keep Working

시스템은 매 단계에서 작동 가능한 상태를 유지해야 한다.

즉:

- 이미 치환된 영역
- 아직 prompt로 남아 있는 영역

사이의 interface가 항상 유효해야 한다.

허용되지 않는 것:

1. 중간 단계에서 execution path가 오래 끊기는 상태
2. prompt path와 implementation path가 서로 다른 artifact truth를 만드는 것

---

## 9. Context Isolation Rule

`LLM` 실행 단위는 필요할 때
**맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)** 로 분리해야 한다.

이 개념이 중요한 이유:

1. 메인 콘텍스트를 보존한다
2. 독립적인 semantic judgment를 유지한다
3. 메인 콘텍스트의 drift를 그대로 따라가지 않는다

가능한 realization 예:

- `subagent`
- `Agent Teams teammate`
- `MCP`로 분리된 `LLM`
- `external model worker`

중요한 것은 구현 이름이 아니라 아래 속성이다.

1. 메인 콘텍스트와 상태를 공유하지 않는다
2. 계약된 입력만 받는다
3. 계약된 출력만 낸다
4. 독립적으로 의미 판단을 수행한다

---

## 10. Authority Rule

`Ontology as Code`는 authority chain이 명확해야 한다.

권장 순서:

1. `authority/core-lexicon.yaml`
2. 상위 charter / methodology / interface 원칙 문서
3. 개별 contract 문서
4. TypeScript type/interface
5. runtime writer / reader
6. legacy prototype prose

즉 prose가 code를 이기는 구조가 아니라,
**authority concept -> contract -> implementation** 순서가 유지되어야 한다.

---

## 11. Fail-Close Rule

호출이 되었다는 것과 semantic result가 usable하다는 것은 다르다.

따라서 아래를 분리한다.

1. invocation usability
2. semantic usefulness

semantic quality가 아직 증명되지 않았으면
lineage가 있어도 자동으로 truth로 승격하지 않는다.

즉 기본 posture는 `fail-close`다.

---

## 12. TypeScript Core Rule

이 레포에서 `Ontology as Code`의 core productization layer는 TypeScript로 구현한다.

이 원칙이 뜻하는 바:

1. canonical artifact writer/readers는 TS core에 둔다
2. type/interface는 lexicon과 contract를 직접 반영해야 한다
3. 임시 스크립트는 reference experiment로는 가능하지만 canonical core로 남기지 않는다

즉:

- concept
- type
- artifact writer
- runtime CLI

가 같은 ontology를 공유해야 한다.

---

## 13. Practical Checklist

새 기능을 만들기 전에 아래를 점검한다.

1. 이 기능의 canonical concept는 무엇인가
2. 그 concept는 `core-lexicon`에 있는가
3. 입력/출력 contract가 문서화되었는가
4. artifact seat가 정해졌는가
5. `LLM` 소유와 runtime 소유가 정확히 분리되었는가
6. runtime이 semantic reasoning을 먹고 있지 않은가
7. prompt-backed reference path가 먼저 작동하는가
8. implementation replacement가 같은 artifact truth를 유지하는가
9. degraded / fail-close posture가 정의되어 있는가
10. 이름이 canonical terminology와 일치하는가

---

## 14. Immediate Use

이 guideline은 아래 경우의 상위 기준으로 사용한다.

1. 새 entrypoint를 만들 때
2. 기존 prototype flow를 service path로 옮길 때
3. `LLM`/runtime boundary를 자를 때
4. artifact contract를 설계할 때
5. prompt path를 runtime path로 치환할 때

`review`는 현재 이 guideline을 가장 먼저 실제로 적용하는 영역이다.

