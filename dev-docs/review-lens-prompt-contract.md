# Review Lens Prompt Contract

> 상태: Active
> 목적: 현재 `onto` 프로토타입의 `review lens`들이 공통으로 따라야 하는 `lens 프롬프트 계약 (LensPromptContract)`을 고정한다.
> 기준 문서:
> - `dev-docs/review-lens-registry.md`
> - `dev-docs/review-interpretation-contract.md`
> - `dev-docs/review-binding-contract.md`
> - `process.md`
> - `processes/review.md`
> - `authority/core-lexicon.yaml`

---

## 1. Position

`lens 프롬프트 계약 (LensPromptContract)`은
각 `review lens`가 **맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)** 로 실행될 때 따라야 하는 공통 실행 계약이다.

이 계약은 현재 프로토타입의 아래 source material을 묶어 추출한 것이다.

- `roles/onto_logic.md`
- `roles/onto_structure.md`
- `roles/onto_dependency.md`
- `roles/onto_semantics.md`
- `roles/onto_pragmatics.md`
- `roles/onto_evolution.md`
- `roles/onto_coverage.md`
- `roles/onto_conciseness.md`
- `roles/onto_axiology.md`
- `process.md`의 `Teammate Initial Prompt Template`
- `process.md`의 `Codex Reviewer Prompt Template`
- `processes/review.md`의 Round 1 task directives

---

## 2. Contract Scope

이 계약은 아래 9개 lens에 공통 적용된다.

- `onto_logic`
- `onto_structure`
- `onto_dependency`
- `onto_semantics`
- `onto_pragmatics`
- `onto_evolution`
- `onto_coverage`
- `onto_conciseness`
- `onto_axiology`

각 lens의 세부 specialization과 boundary는
개별 `roles/{lens-id}.md`가 source material로 제공한다.

---

## 3. Core Execution Rule

각 lens는 아래 조건을 만족해야 한다.

1. 독립적인 에이전트 맥락에서 실행된다
2. Round 1에서는 다른 lens output을 보지 않는다
3. 자기 specialization과 boundary만 따른다
4. target과 system purpose를 읽고 자기 관점의 finding을 만든다
5. domain document와 learnings는 self-loading context로만 사용한다

가능한 realization 예:

- Agent Teams teammate
- subagent
- `MCP`로 분리된 `LLM`
- external model worker

즉 lens는 `독립 판단 단위`이자
메인 콘텍스트의 drift를 그대로 따르지 않는 `의미 적합성 게이트`다.

---

## 4. Required Inputs

`lens 프롬프트 계약 (LensPromptContract)`의 최소 입력은 아래다.

1. `lens_id`
2. `review_target_scope`
3. `review target materialized input`
4. `system purpose and principles`
5. `session_domain`
6. `resolved execution mode`
7. `output_language`
8. `lens_output_path`
9. self-loading context refs
   - global learnings
   - project learnings
   - communication learning
   - corresponding domain document
   - learning rules

### 4.1 `review target materialized input` shape

`review_target_scope`가 여러 kind를 허용하므로,
lens가 실제로 읽는 입력도 최소 아래 shape를 허용해야 한다.

1. `single_text`
   - 단일 파일 또는 단일 문서 본문
2. `directory_listing`
   - 디렉터리 파일 목록 (LLM이 필요한 파일을 자율 탐색)
3. `bundle_member_texts`
   - bundle member별 본문 집합

예시:

```yaml
review_target_materialized_input:
  kind: bundle_member_texts
  members:
    - ref: /Users/kangmin/.onto/drafts/ontology/domain_scope.md
      label: domain_scope
      content: "..."
    - ref: /Users/kangmin/.onto/drafts/ontology/concepts.md
      label: concepts
      content: "..."
```

---

## 5. Domain Document Mapping

| Lens ID | Corresponding domain document |
|---|---|
| `onto_logic` | `logic_rules.md` |
| `onto_structure` | `structure_spec.md` |
| `onto_dependency` | `dependency_rules.md` |
| `onto_semantics` | `concepts.md` |
| `onto_pragmatics` | `competency_qs.md` |
| `onto_evolution` | `extension_cases.md` |
| `onto_coverage` | `domain_scope.md` |
| `onto_conciseness` | `conciseness_rules.md` |
| `onto_axiology` | none. system purpose/principles + selected domain context only |

---

## 6. Mandatory Execution Steps

각 lens는 최소 아래 순서를 따른다.

1. role definition을 읽는다
2. self-loading context를 읽는다
3. `Structural Inspection Checklist`를 먼저 수행한다
4. 자신의 core questions에 따라 review target을 검토한다
5. issue가 있으면
   - 무엇이 문제인지
   - 왜 문제인지
   - 어떻게 고칠지
   를 적는다
6. issue가 없으면
   - 왜 맞는지의 근거
   를 적는다
7. `Newly Learned`
8. `Applied Learnings`

---

## 7. Structural Inspection Checklist

모든 lens는 applicable한 경우 아래 checklist를 먼저 본다.

- ME violation
- CE violation
- definition explicitness
- axis explicitness
- learning type tag validity
- domain cross-reference validity
- ghost sub-area check
- rule-CQ linkage
- inference path validity

단, 적용 불가한 항목은 `N/A`로 둔다.

---

## 8. Output Obligation

현재 프로토타입 기준의 lens output은 markdown 파일이다.

최소 아래를 포함해야 한다.

1. structural inspection 결과
2. lens-specific finding
3. issue별 설명
   - what
   - why
   - how to fix
4. no-issue case라면 rationale
5. `### Newly Learned`
6. `### Applied Learnings`

즉 현재 prompt-backed reference path에서는
`lens finding markdown`이 canonical prompt output이다.

later productization에서는 이 markdown이
structured lens artifact의 source가 된다.

현재 기준의 aggregate primary artifact는
`dev-docs/review-record-contract.md`에서 정의하는 `ReviewRecord`다.

---

## 9. Lens-Specific Responsibility Source

각 lens의 고유 책임은 아래 role files에서 온다.

| Lens ID | Source material |
|---|---|
| `onto_logic` | `roles/onto_logic.md` |
| `onto_structure` | `roles/onto_structure.md` |
| `onto_dependency` | `roles/onto_dependency.md` |
| `onto_semantics` | `roles/onto_semantics.md` |
| `onto_pragmatics` | `roles/onto_pragmatics.md` |
| `onto_evolution` | `roles/onto_evolution.md` |
| `onto_coverage` | `roles/onto_coverage.md` |
| `onto_conciseness` | `roles/onto_conciseness.md` |
| `onto_axiology` | `roles/onto_axiology.md` |

공통 wrapper rule은 role file이 아니라
`process.md`와 `processes/review.md`에서 온다.

---

## 10. Example Prompt Skeleton

```text
You are {role}.

[Your Definition]
{Content of roles/{lens-id}.md}

[Context Self-Loading]
{learnings/domain/communication/rules}

[Task Directives]
- Begin Round 1 review.
- Perform Structural Inspection Checklist first.
- Then verify from your specialized perspective only.
- Do not inspect other lens outputs.
- Save your result to {lens_output_path}.
```

---

## 11. What This Contract Must Not Do

이 계약은 아래를 다루지 않는다.

1. 다른 lens 결과를 종합한다
2. final review output을 작성한다
3. unresolved disagreement를 adjudicate한다
4. review의 primary output을 learning으로 정의한다

이것들은 `종합 프롬프트 계약 (SynthesizePromptContract)`의 책임이다.

---

## 12. Immediate Follow-up

다음 단계는 아래다.

1. lens output markdown을 `ReviewRecord` field와 ref로 매핑한다
2. 이후 prompt-backed path에서 `review-record.yaml` field completeness를 안정화한다
