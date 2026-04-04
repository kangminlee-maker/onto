# Ontology-as-Code Korean Terminology Guide

> 상태: Active
> 목적: canonical 영문 용어를 유지하면서, 설계 문서와 대화에서 일관되게 쓸 한국어 대응어를 고정한다.
> 기준 문서:
> - `authority/core-lexicon.yaml`
> - `dev-docs/ontology-as-code-naming-charter.md`

---

## 1. 원칙

1. canonical term은 영문을 SSOT로 유지한다.
2. 한국어 대응어는 설명, 리뷰, 설계 문서, 대화에서 사용한다.
3. 코드, 타입, field 이름은 canonical 영문을 유지한다.
4. 설명에서는 `한글 대응어 (영문 canonical)` 형태를 기본으로 쓴다.

---

## 2. Core Terms

| Canonical term | 한국어 대응어 |
|---|---|
| `entrypoint` | 진입점 |
| `InvocationInterpretation` | 호출 해석 |
| `InvocationBinding` | 호출 고정 |
| `scope` | 적용 범위 |
| `structural_role` | 구조 역할 |
| `use_role` | 사용 역할 |
| `lifecycle_status` | 생애주기 상태 |
| `proposal_shape` | 제안 형식 |
| `ReviewRecord` | 리뷰 기록 |
| `review_target_scope` | 검토 대상 범위 |
| `review_lens` | 리뷰 lens |
| `ContextIsolatedReasoningUnit` | 맥락 격리 추론 단위 |
| `LensPromptContract` | lens 프롬프트 계약 |
| `SynthesizePromptContract` | 종합 프롬프트 계약 |
| `LensSelectionPlan` | lens 선택 계획 |
| `DomainFinalSelection` | 도메인 최종 선택 |
| `review_session_metadata` | 검토 세션 메타데이터 |
| `target_snapshot` | 대상 스냅샷 |
| `review_target_materialized_input` | 검토 대상 구체화 입력 |
| `context_candidate_assembly` | 맥락 후보 조립물 |
| `synthesize` | 종합 단계 |
| `PromptBackedReferencePath` | 프롬프트 기반 기준 경로 |
| `ImplementationReplacementStep` | 구현 치환 단계 |

---

## 3. Entrypoint Family

| Entrypoint | 한국어 대응어 |
|---|---|
| `review` | 검토 |
| `build` | 구축 |
| `ask` | 질의 |
| `learn` | 학습 |
| `govern` | 운영 결정 |

---

## 4. 사용 예시

- `리뷰 기록 (ReviewRecord)`을 먼저 만들고,
- 이후 `학습 (learn)`이 그 기록을 읽어 candidate를 만들고,
- `운영 결정 (govern)`이 승격 여부를 판단한다.
- `맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)`의 realization은
  `subagent`, `Agent Teams teammate`, `MCP`로 분리된 `LLM`, `external model worker`처럼 매우 다양할 수 있다.
