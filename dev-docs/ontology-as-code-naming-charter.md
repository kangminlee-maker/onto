# Ontology-as-Code Naming Charter

> 상태: Active
> 목적: `onto` 메인 레포를 서비스로 전환하는 동안, 같은 개념 축을 같은 단어로만 표현하도록 canonical naming rule을 고정한다.
> machine-readable SSOT:
> - `authority/core-lexicon.yaml`

---

## 1. Core Position

이 문서의 목적은 "좋은 이름"을 고르는 것이 아니라, 같은 단어가 항상 같은 축의 개념만 가리키게 만드는 것이다.

현재 `onto` 메인 레포는 여전히 프로토타입 구조를 많이 포함한다.
따라서 이 문서는 즉시 모든 파일을 바꾸는 규칙이 아니라, productization 동안 따라야 하는 naming authority다.

핵심 규칙:

1. 하나의 개념에는 하나의 canonical label만 쓴다.
2. 하나의 label은 하나의 conceptual axis에서만 쓴다.
3. 코드와 contract 이름은 영문 canonical을 유지한다.
4. 설명과 대화는 한글 대응어를 함께 쓸 수 있다.
5. 어떤 canonical concept를 설명할 때는 그 canonical term을 문장 안에 직접 호출한다.

---

## 2. Canonical Concept Axes

### 2.1 `entrypoint` (진입점)

사용자 의도를 나타내는 상위 진입 단위다.

허용값:

- `review`
- `build`
- `ask`
- `learn`
- `govern`

규칙:

- `entrypoint`는 user-facing top-level intent다.
- `verb`, `activity`, `mode` 같은 별도 taxonomy를 만들지 않는다.

### 2.2 `scope` (적용 범위)

지식이나 자산이 어디까지 유효한지를 나타낸다.

허용값:

- `user`
- `project`
- `domain`

### 2.3 `structural_role` (구조 역할)

자산이 구조적으로 어떤 역할을 하는지 나타낸다.

허용값:

- `ontology_seed`
- `learning_prior`
- `canonical_knowledge`

### 2.4 `use_role` (사용 역할)

runtime 또는 reasoning에서 어떤 방식으로 쓰이는지 나타낸다.

허용값:

- `scaffold`
- `heuristic`
- `constraint`

### 2.5 `lifecycle_status` (생애주기 상태)

자산의 lifecycle 성숙도다.

허용값:

- `seed`
- `candidate`
- `provisional`
- `promoted`
- `deprecated`
- `retired`

### 2.6 `proposal_shape` (제안 형식)

authoring 단계에서 생성되는 candidate의 형상이다.

예:

- `defect_pattern`
- `lens_observation`
- `certainty_candidate`

---

## 3. Review/Productization Terms

### 3.1 `ReviewRecord` (리뷰 기록)

`review`의 canonical output이다.

즉:

- current prototype review result는 later product path에서 `ReviewRecord`로 수렴해야 한다.
- `ReviewRecord`는 단순 요약이 아니라 later `learn`가 읽을 수 있는 structured lineage다.

### 3.2 `review_target_scope` (검토 대상 범위)

`review`가 실제로 검토하는 대상의 범위 또는 묶음이다.

즉:

- 단일 파일일 수도 있고
- 디렉터리일 수도 있고
- `drafts/{domain}` 같은 다문서 bundle일 수도 있다.

### 3.3 `InvocationInterpretation` (호출 해석)

자연어 요청에서 entrypoint, target 후보, intent를 해석하는 단계다.

이 단계는 semantic interpretation이므로 `LLM` 책임이다.

### 3.4 `LensSelectionPlan` (lens 선택 계획)

`검토 해석 (InvocationInterpretation)`이 산출하는 semantic plan이다.

예:

- `full` vs `light`
- always include lens
- recommended lens set

### 3.5 `LensPromptContract` (lens 프롬프트 계약)

각 `review lens`가 독립 에이전트 맥락에서 실행될 때 따라야 하는 공통 프롬프트 계약이다.

### 3.6 `ContextIsolatedReasoningUnit` (맥락 격리 추론 단위)

메인 콘텍스트와 상태를 공유하지 않고,
계약된 입력/출력 경계 안에서 독립적으로 추론하는 실행 단위다.

예:

- `Agent Teams teammate`
- `subagent`
- `MCP`로 분리된 `LLM`
- `external model worker`

중요한 것은 구현 방식이 아니라
`맥락 비공유 + 계약 입력 + 계약 출력 + 독립 판단`이라는 속성이다.

### 3.7 `SynthesizePromptContract` (종합 프롬프트 계약)

`onto_synthesize`가 lens finding을 읽고 최종 review output을 만드는 단계의 프롬프트 계약이다.

### 3.8 `DomainFinalSelection` (도메인 최종 선택)

domain recommendation 이후,
explicit token parsing과 사용자 확인을 거쳐 확정된 최종 domain 값이다.

### 3.9 `InvocationBinding` (호출 고정)

해석 결과를 workspace/path/ref와 canonical request로 고정하는 단계다.

이 단계는 deterministic binding이므로 runtime 책임이다.

### 3.10 `PromptBackedReferencePath` (프롬프트 기반 기준 경로)

프로토타입이 수행하던 책임을 설계된 contract 위에서 prompt로 다시 실행하는 reference path다.

### 3.11 `ImplementationReplacementStep` (구현 치환 단계)

프롬프트 기반 기준 경로의 한 책임을 서비스 구현으로 치환하는 한 단계다.

### 3.12 `review_session_metadata` (검토 세션 메타데이터)

하나의 review session에 대한 deterministic execution metadata다.

### 3.13 `target_snapshot` (대상 스냅샷)

review 당시 실제로 읽은 target basis를 보존하는 artifact다.

### 3.14 `review_target_materialized_input` (검토 대상 구체화 입력)

`review_target_scope`를 lens 실행에 바로 투입할 수 있게 정리한 입력 artifact다.

### 3.15 `context_candidate_assembly` (맥락 후보 조립물)

review lens가 실제 relevance judgment를 하기 전에 접근 가능한 candidate context set이다.

---

## 4. Immediate Naming Migration Direction

현재 프로토타입 용어 중 우선 정리해야 하는 방향은 아래다.

1. `review/build`를 `entrypoint` family로 읽는다.
2. learning 관련 논의는 `scope`, `structural_role`, `lifecycle_status` 축으로 재정리한다.
3. promotion/feedback/domain update 같은 기존 process 용어는 later `learn/govern` productization 과정에서 재분류한다.
4. `codex mode`, `agent teams`, `subagent fallback` 같은 execution wording은 host/runtime execution profile로 분리해서 다룬다.

---

## 5. Productization Rule

이 naming charter는 당장 프로토타입 파일 전부를 rename하라는 뜻이 아니다.

현재 단계의 규칙은 아래다.

1. 새 문서와 새 contract는 canonical term으로 쓴다.
2. 기존 프로토타입 문서는 legacy wording을 유지할 수 있다.
3. 다만 새 설명 문서에서는 legacy wording을 authority처럼 취급하지 않는다.
4. productization이 진행될수록 legacy wording은 canonical wording으로 점진적으로 치환한다.
