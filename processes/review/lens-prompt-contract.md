# Review Lens Prompt Contract

> 상태: Active
> 목적: 현재 `onto` 프로토타입의 `review lens`들이 공통으로 따라야 하는 `lens 프롬프트 계약 (LensPromptContract)`을 고정한다.
> 기준 문서:
> - `processes/review/lens-registry.md`
> - `processes/review/interpretation-contract.md`
> - `processes/review/binding-contract.md`
> - `process.md`
> - `processes/review/review.md`
> - `authority/core-lexicon.yaml`

---

## 1. Position

`lens 프롬프트 계약 (LensPromptContract)`은
각 `review lens`가 **맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)** 로 실행될 때 따라야 하는 공통 실행 계약이다.

이 계약은 현재 프로토타입의 아래 source material을 묶어 추출한 것이다.

- `roles/logic.md`
- `roles/structure.md`
- `roles/dependency.md`
- `roles/semantics.md`
- `roles/pragmatics.md`
- `roles/evolution.md`
- `roles/coverage.md`
- `roles/conciseness.md`
- `roles/axiology.md`
- `process.md`의 `Teammate Initial Prompt Template`
- `process.md`의 `Codex Reviewer Prompt Template`
- `processes/review/review.md`의 Round 1 task directives

---

## 2. Contract Scope

이 계약은 아래 9개 lens에 공통 적용된다.

- `logic`
- `structure`
- `dependency`
- `semantics`
- `pragmatics`
- `evolution`
- `coverage`
- `conciseness`
- `axiology`

각 lens의 세부 perspective, observation focus, assertion type은
개별 `roles/{lens-id}.md`가 source material로 제공한다.

---

## 3. Core Execution Rule

각 lens는 아래 조건을 만족해야 한다.

1. 독립적인 에이전트 맥락에서 실행된다
2. Round 1에서는 다른 lens output을 보지 않는다
3. 자기 perspective와 observation focus만 따른다
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
| `logic` | `logic_rules.md` |
| `structure` | `structure_spec.md` |
| `dependency` | `dependency_rules.md` |
| `semantics` | `concepts.md` |
| `pragmatics` | `competency_qs.md` |
| `evolution` | `extension_cases.md` |
| `coverage` | `domain_scope.md` |
| `conciseness` | `conciseness_rules.md` |
| `axiology` | none. system purpose/principles + selected domain context only |

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

### 8.1 Output Schema (schema_version: 2)

최소 아래를 포함해야 한다.

1. structural inspection 결과
2. lens-specific finding
3. issue별 설명 — 각 finding은 아래 필수 필드를 포함한다:
   - `target`: 검토 대상 식별자
   - `evidence_anchor`: evidence locus의 직렬화 (파일경로:라인, §번호 등)
   - `claim`: what + severity + direction
   - `lens_id`: 자동 부여
   - `upstream_evidence_required`: 이 finding의 action이 다른 lens의 사전 판단에 조건부인지 여부 (`true`/`false`)
   - what (상세 설명)
   - why (문제 이유)
   - how to fix (수정 방향)
4. no-issue case라면 rationale
5. `### Newly Learned`
6. `### Applied Learnings`
7. `### Domain Constraints Used` — 검증에 사용한 domain rule의 durable provenance 기록 (domain-document-backed lenses만 해당, axiology 제외). 각 항목은 `{source_doc, source_version_or_snapshot_id, anchor}` 형식이다
8. `### Domain Context Assumptions` — 검증에 사용한 비형식적 domain usage-context 가정 기록 (해당 시)

### 8.2 Enforced Fields

| 필드 | 설명 | 해당 lens |
|---|---|---|
| `upstream_evidence_required` | 각 finding에 부여되는 conditionality flag. action이 다른 lens의 사전 판단에 조건부인지 여부 (`true`/`false`) | conciseness (필수), 기타 (해당 시) |
| `domain_constraints_used` | 사용한 domain rule의 durable provenance 목록 | domain-document-backed lenses (axiology 제외) |
| `domain_context_assumptions` | 사용한 비형식적 domain usage-context 가정 목록 | 모든 lens (해당 시) |

### 8.3 4-Field Claim Requirement

모든 lens finding은 `{target, evidence_anchor, claim, lens_id}` 4필드를 필수로 포함해야 한다.
4필드의 의미와 co-location rule은 `processes/review/shared-phenomenon-contract.md`가 정의한다.
이 계약은 직렬화 형식만 소유한다.

### 8.4 Artifact Position

즉 현재 prompt-backed reference path에서는
`lens finding markdown`이 canonical prompt output이다.

later productization에서는 이 markdown이
structured lens artifact의 source가 된다.

현재 기준의 aggregate primary artifact는
`processes/review/record-contract.md`에서 정의하는 `ReviewRecord`다.

---

## 9. Lens-Specific Perspective Source

각 lens의 고유 perspective는 아래 role files에서 온다.

| Lens ID | Source material |
|---|---|
| `logic` | `roles/logic.md` |
| `structure` | `roles/structure.md` |
| `dependency` | `roles/dependency.md` |
| `semantics` | `roles/semantics.md` |
| `pragmatics` | `roles/pragmatics.md` |
| `evolution` | `roles/evolution.md` |
| `coverage` | `roles/coverage.md` |
| `conciseness` | `roles/conciseness.md` |
| `axiology` | `roles/axiology.md` |

공통 wrapper rule은 role file이 아니라
`process.md`와 `processes/review/review.md`에서 온다.

---

## 9.1 Decision Preconditions

일부 lens의 finding은 다른 lens의 사전 판단에 조건부이다.
이 의존성은 `roles/*.md`가 아니라 이 계약이 단독 소유한다.

| Finding lens | Precondition | Upstream lens | 조건 미충족 시 |
|---|---|---|---|
| `conciseness` (삭제/병합 claim) | logical equivalence 확인 | `logic` | finding은 `conditional` 상태. 최종 action으로 승격 불가 |
| `conciseness` (삭제/병합 claim) | semantic synonymy 확인 | `semantics` | finding은 `conditional` 상태. 최종 action으로 승격 불가 |

- upstream evidence가 없으면 해당 finding의 `upstream_evidence_required`는 `true`이며, action은 조건부로 출력된다
- 이 표의 확장은 이 계약에서만 수행한다. `roles/*.md`에는 복제하지 않는다

---

## 9.2 Boundary Discipline

모든 lens는 아래 공통 경계 규율을 따른다.

1. 자기 perspective의 observation focus 내에서만 finding을 제기한다
2. 다른 lens의 perspective에 해당하는 finding도 자기 관점에서 독립적으로 제기할 수 있다 (overlap-permitted lens claims). overlap 정책과 claim relation 분류는 `processes/review/shared-phenomenon-contract.md`가 정의한다
3. 검증에 사용한 domain rule이나 usage-context 가정은 §8.1의 enforced field에 기록한다
4. 경계 밖 탐색이 필요하다고 판단되면, finding에 "boundary 밖 탐색이 필요함"을 명시하되 실제 탐색은 수행하지 않는다

---

## 9.3 Domain-None Fallback Rule

`session_domain`이 `none`일 때:

1. domain document가 있는 lens(`logic`, `structure`, `dependency`, `semantics`, `pragmatics`, `evolution`, `coverage`, `conciseness`)는 domain document 없이 실행한다
2. domain-specific rule에 의존하는 판단은 해당 finding에 `no domain document available within boundary`로 명시한다
3. 해당 finding의 `domain_constraints_used`는 빈 배열이다
4. lens를 제외하지는 않는다. domain 없이도 관점 자체는 유효하다

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
