# Review Synthesize Prompt Contract

> 상태: Active
> 목적: 현재 `onto` 프로토타입의 `종합 단계 (synthesize)`가 따라야 하는 `종합 프롬프트 계약 (SynthesizePromptContract)`을 고정한다.
> 기준 문서:
> - `processes/review/lens-registry.md`
> - `processes/review/lens-prompt-contract.md`
> - `process.md`
> - `processes/review/review.md`
> - `authority/core-lexicon.yaml`

---

## 1. Position

`종합 프롬프트 계약 (SynthesizePromptContract)`은
`synthesize`가 lens finding을 읽고 final review output을 만드는 단계의 공통 실행 계약이다.

이 계약의 source material은 아래다.

- `roles/synthesize.md`
- `process.md`의 `Codex Review Synthesize Prompt Template`
- `processes/review/review.md`의 Step 3/4

---

## 2. Core Role

`synthesize`는 독립 lens가 아니다.
다만 실행 realization은 필요에 따라
**맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)** 일 수 있다.

역할은 아래다.

1. lens finding을 읽는다
2. consensus를 정리한다
3. disagreement를 보존한다
4. overlooked premises를 드러낸다
5. immediate actions와 recommendations를 정리한다
6. final review output을 작성한다

단, purpose/value 관점에서의 추가 검토 관점 제안(`New Perspectives`)은
`axiology`의 책임이다.
`synthesize`는 그것이 명시적으로 제시된 경우에만 보존/배치할 수 있다.

---

## 3. Required Inputs

`종합 프롬프트 계약 (SynthesizePromptContract)`의 최소 입력은 아래다.

1. participating lens list
2. lens result file paths
3. system purpose and principles
4. resolved review mode
5. materialized input ref (deliberation 시 evidence 재읽기 대상)
6. output_language
7. `synthesis_output_path`
8. self-loading context refs
   - synthesize learnings
   - communication learning
   - project-level synthesize learnings
   - learning rules

### 3.1 Input Expectations (Lens Output Fields)

각 lens result file은 `lens-prompt-contract.md` §8 (schema_version: 2)에 따라
최소 아래 필드를 포함해야 한다. synthesize는 이 필드들의 수신을 필수로 기대한다.

- **4-field claim**: `{target, evidence_anchor, claim, lens_id}` — 각 finding별
- **`upstream_evidence_required`**: 해당 시
- **`domain_constraints_used`**: 해당 시 (durable provenance 형식)
- **`domain_context_assumptions`**: 해당 시

4필드의 의미와 co-location rule은 `processes/review/shared-phenomenon-contract.md`가 정의한다.
이 계약은 수신 필수만 선언하며, 필드 의미를 재정의하지 않는다.

---

## 4. Mandatory Execution Rules

`synthesize`는 아래 규칙을 지켜야 한다.

1. 새로운 독립 관점을 추가하지 않는다
2. lens finding을 건너뛰고 ad hoc 결론을 만들지 않는다
3. unresolved disagreement를 묵살하지 않는다
4. lens 간 disagreement가 있으면 §6에 따라 synthesize가 직접 deliberation을 수행한다
5. review의 primary output을 learning candidate로 정의하지 않는다
6. `New Perspectives`를 스스로 invent하지 않는다
7. `Purpose Alignment Verification`은 독립 판단으로 새로 만들지 않고, `axiology` finding을 보존적으로 반영한다

---

## 5. Output Obligation

현재 프로토타입 기준의 synthesize output은 markdown 파일이다.

최소 아래를 포함해야 한다.

또한 output은 YAML frontmatter로 시작해야 하며, 최소 아래 field를 가져야 한다.

```yaml
---
deliberation_status: not_needed | performed
---
```

`deliberation_status` 값 사용 규칙:

- `not_needed`: lens 간 disagreement가 없는 경우.
- `performed`: synthesize가 §6에 따라 in-process deliberation을 수행하고 resolution을 기록한 경우.
- `required_but_unperformed`: synthesize 출력에서는 사용하지 않는다. 이 값은 runner가 synthesize task 자체의 실패를 감지했을 때만 record assembler가 부여하는 failure marker다.

1. consensus
2. conditional consensus
3. disagreement
4. overlooked premises
5. axiology-proposed additional perspectives (if any)
6. purpose alignment verification
7. immediate actions
8. recommendations
9. unique finding tagging
10. deliberation decision
11. final review result
12. shared phenomenon summary — 동일 phenomenon에 대한 다중 lens claim이 있는 경우, claim relation 분류 결과를 명시한다 (corroboration / disagreement / partial overlap / dedup). 분류 규칙은 `processes/review/shared-phenomenon-contract.md` §4를 따른다. 이 계약은 분류 규칙을 재정의하지 않는다

즉 현재 prompt-backed reference path에서는
`synthesis markdown`이 canonical prompt output이다.

later productization에서는 이 output이
`ReviewRecord`의 human-readable layer source가 된다.

aggregate primary artifact는
`processes/review/record-contract.md`에서 정의하는 `ReviewRecord`다.

---

## 6. Deliberation Rule

### 6.1 Deliberation의 두 경로

Review 실행 realization은 deliberation 수행 경로에 따라 두 부류로 나뉜다.

- **Cross-process deliberation**: Agent Teams 계열. teammate 간 SendMessage 채널이 존재하므로 contested point를 relevant lens teammate에게 다시 돌려 cross-process deliberation을 수행한다. 결과는 별도 `deliberation.md`에 기록될 수 있다.
- **In-process deliberation**: cross-process lens-to-lens 메시징 채널이 없는 realization (`subagent` fallback, `subagent + codex`). synthesize가 모든 lens 결과 + materialized input을 이미 scope에 쥐고 있으므로 synthesize 자신이 deliberation actor로 in-process 수행한다.

본 계약 §6.2는 in-process deliberation 경로의 절차를 고정한다. cross-process 경로는 `process.md`의 Agent Teams Step 4가 별도 authority다.

### 6.2 In-process deliberation 수행 절차

synthesize는 in-process deliberation 경로에서 deliberation actor다. 수행 절차는 다음과 같다.

1. lens 결과 전체에서 contested point를 식별한다. contested point 식별 기준은 `processes/review/shared-phenomenon-contract.md` §4의 `disagreement` 관계를 기본으로 한다. orthogonal predicate에 대한 상호 비모순 claim은 contested로 간주하지 않는다
2. 각 contested point에 대해 contested된 lens 출력과 materialized input의 인용 evidence를 재읽는다
3. evidence에 비추어 각 입장의 타당성을 평가하고 resolution을 도출한다
4. resolution을 `Deliberation Decision` 섹션에 contested point별로 기록한다
5. `Disagreement` 섹션은 원 입장을 보존한 채 유지하되, resolution이 있는 항목은 그 사실을 명시한다
6. evidence가 부족하여 resolution을 도출할 수 없는 경우, 그 사유를 `Deliberation Decision`에 기록한다 (그 자체가 수행 결과로 간주된다 — `deliberation_status: performed`)
7. 하나 이상의 lens 출력이 degraded 상태인 경우에도 나머지 입력으로 위 절차를 수행한다. 결여된 입력이 특정 contested point의 resolution에 핵심적이면 6단계(evidence 부족 기록)로 처리한다

### 6.3 frontmatter `deliberation_status`

§5가 `deliberation_status` 값 enum의 SSOT다. 본 §6.3은 그 enum의 사용 규칙(언제 어느 값을 emit하는가)만 다루며 enum을 재정의하지 않는다.

- `not_needed`: lens 간 contested point가 식별되지 않은 경우. 이 케이스에서도 `Deliberation Decision` 섹션은 contract §5 item 10에 따라 필수 섹션이며, 최소 `"no contested points"` 또는 동등한 명시적 서술을 기록한다
- `performed`: §6.2 절차를 수행한 경우 (resolution 도출 또는 명시적 evidence-부족 기록 포함)

synthesize는 자신의 출력에서 `required_but_unperformed`를 emit하지 않는다. 이 값은 synthesize task 자체의 실패를 runner/record assembler가 감지했을 때만 부여되는 failure marker다.

### 6.4 `deliberation.md` artifact 위상

`{session_root}/deliberation.md`는 cross-process deliberation 경로 (Agent Teams Step 4)에서만 산출되는 artifact다. in-process deliberation 경로에서는 별도 파일을 산출하지 않으며, `synthesis.md` frontmatter와 Deliberation Decision 섹션이 유일한 authoritative source다. 따라서:

- in-process 경로 실행 결과: `synthesis.md` frontmatter `deliberation_status` + `Deliberation Decision` 섹션이 primary
- cross-process 경로 실행 결과: `deliberation.md` 존재가 `performed`의 primary signal이 될 수 있음

cross-process 경로에서도 `synthesis.md` frontmatter는 §5에 따라 의무이며 `deliberation_status` 값은 `performed`로 설정한다 — `deliberation.md`는 그 위에 더해지는 supplementary primary signal이지 frontmatter 의무를 면제하는 대체 채널이 아니다.

record assembler는 이 두 채널을 정합하게 해석해야 하며, 상세 규칙은 `processes/review/record-contract.md`가 정한다.

---

## 7. Example Prompt Skeleton

```text
You are synthesize.

[Your Definition]
{Content of roles/synthesize.md}

[Context Self-Loading]
{synthesize learnings / communication / project learnings / learning rules}

[Task Directives]
- Read all lens result files and the materialized input.
- Preserve consensus and original lens positions in Disagreement.
- When lens findings disagree, perform in-process deliberation per §6 and record per-contested-point resolutions in Deliberation Decision.
- Set frontmatter deliberation_status to `not_needed` (no contention) or `performed` (deliberation executed).
- Write the final synthesis output to {synthesis_output_path}.
```

---

## 8. What This Contract Must Not Do

이 계약은 아래를 하면 안 된다.

1. 독립 lens처럼 자기만의 별도 검증 관점을 추가한다
2. `axiology`를 대체한다
3. lens evidence 없이 결론을 덮어쓴다
4. `New Perspectives`를 독자적으로 제안한다

즉 `synthesize`는
새로운 검증자가 아니라 `구조 보존형 종합 단계`다.

가능한 realization 예와 deliberation 경로 (§6.1):

| Realization | Deliberation 경로 |
|---|---|
| Agent Teams teammate | Cross-process (teammate SendMessage 활용) |
| subagent (Claude Code Agent tool) | In-process (synthesize가 수행) |
| `subagent + codex` | In-process (synthesize가 수행) |
| `MCP`로 분리된 `LLM` | In-process (메시징 없는 경우) 또는 Cross-process (메시징 구현 시). 실행 시 결정 |
| external model worker | In-process (메시징 없는 경우) 또는 Cross-process (메시징 구현 시). 실행 시 결정 |

---

## 9. Immediate Follow-up

다음 단계는 아래다.

1. `lens markdown output`과 `synthesis markdown output`을 `ReviewRecord` shape로 매핑한다
2. 이후 prompt-backed path에서 `review-record.yaml` field completeness를 안정화한다
