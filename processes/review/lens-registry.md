# Review Lens Registry

> 상태: Active
> 목적: 현재 `onto` 메인 레포의 `검토 (review)`에서 사용하는 canonical review 구조를 고정한다.
> 기준 문서:
> - `authority/core-lexicon.yaml`

---

## 1. Canonical Review Structure

`검토 (review)`의 canonical 구조는 아래다.

- `9개 review lens`
- `1개 종합 단계 (synthesize)`

즉:

- `8개의 기존 검증 관점`
- `가치/목적 정합 lens (onto_axiology)`
- `종합 단계 (onto_synthesize)`

로 구성된다.

---

## 2. Review Lenses

| Lens ID | 한글 설명 | 책임 |
|---|---|---|
| `onto_logic` | 논리 lens | 모순, 타입 충돌, 제약 충돌 |
| `onto_structure` | 구조 lens | 고립 요소, 끊긴 경로, 누락 관계 |
| `onto_dependency` | 의존성 lens | 순환, 역방향, 다이아몬드 의존 |
| `onto_semantics` | 의미 lens | 이름-의미 불일치, 동의어/동음이의 |
| `onto_pragmatics` | 실용성 lens | 질의 가능성, competency question 적합성 |
| `onto_evolution` | 진화 lens | 신규 데이터/도메인 추가 시 파손 위험 |
| `onto_coverage` | 커버리지 lens | 누락 하위영역, 개념 편향, 표준 대비 갭 |
| `onto_conciseness` | 간결성 lens | 중복 정의, 과잉 구체화, 불필요한 구분 |
| `onto_axiology` | 가치/목적 정합 lens | 목적 이탈, 가치 충돌, mission misalignment |

---

## 3. Synthesize Stage

| Stage ID | 한글 설명 | 책임 |
|---|---|---|
| `onto_synthesize` | 종합 단계 | lens 결과를 읽고 consensus, disagreement, overlooked premises, final review output을 구성 |

중요한 구분:

- `onto_axiology`는 **독립 lens**다.
- `onto_synthesize`는 **종합 단계**다.

즉 `onto_axiology`는 다른 lens들과 동등한 한 관점이고,
`onto_synthesize`는 그 관점들을 모아 최종 결과를 작성한다.

---

## 4. Boundary Rule

### 4.1 `onto_axiology`

- 목적/가치 정합을 보는 독립 lens
- 자체 finding을 만든다
- 다른 lens 전체를 요약하지 않는다

### 4.2 `onto_synthesize`

- lens set 전체를 읽어 final review output을 만든다
- 새로운 독립 관점 행세를 하면 안 된다
- unresolved disagreement를 묵살하지 않고 보존해야 한다

---

## 5. Execution Separation Rule

`review lens`는 개념적으로도 실행상으로도 서로 독립이어야 한다.

여기서 canonical 개념은
**맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)** 다.

즉 프롬프트 기준 경로에서는 아래가 허용된다.

- Agent Teams teammate
- subagent
- `MCP`로 분리된 `LLM`
- 독립 background agent
- external model worker

하지만 어떤 host realization을 쓰더라도 변하지 않는 canonical rule은 아래다.

1. 각 lens는 자기 전용 맥락에서 실행된다
2. Round 1에서는 다른 lens의 결과를 보지 않는다
3. `onto_synthesize`는 lens finding이 나온 뒤에만 실행된다
4. 메인 `LLM` 콘텍스트는 lens별 세부 reasoning을 직접 모두 담지 않는다

즉 host-specific detail은 달라도,
`lens별 맥락 분리`, `메인 콘텍스트 보존`, `독립 의미 검증` 자체는 canonical requirement다.

### 5.1 Why Independent Execution Matters

독립 실행 단위가 필요한 이유는 아래다.

1. 각 lens의 specialization이 다른 lens 판단에 오염되지 않게 한다
2. 메인 콘텍스트가 orchestration, binding, synthesis 판단을 유지할 수 있게 한다
3. later runtimeization에서도 `lens execution unit`을 그대로 치환하기 쉽게 한다

즉 `subagent`, teammate, `MCP` 분리 `LLM`, background agent, external worker는
host-specific naming이나 realization일 수 있어도,
그들이 보존하는 구조적 역할은 canonical하다.

---

## 6. Prompt Contract Source

현재 `review`의 prompt-backed reference path에서
각 lens와 synthesize 단계의 source material은 아래다.

- 공통 lens wrapper: `process.md`, `processes/review/review.md`
- 개별 lens specialization: `roles/{lens-id}.md`
- synthesize specialization: `roles/onto_synthesize.md`

관련 계약 문서:

- `processes/review/lens-prompt-contract.md`
- `processes/review/synthesize-prompt-contract.md`

---

## 7. Legacy Note

현재 `philosopher`라는 이름은 일부 non-review prototype flow, 특히 build prototype에 남아 있다.

하지만 `review`의 canonical 구조는 이제 아래다.

- `philosopher` 중심 아님
- `onto_axiology` + `onto_synthesize`

즉 review productization에서 `philosopher`는 canonical role이 아니다.
