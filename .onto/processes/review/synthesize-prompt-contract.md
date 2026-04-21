# Review Synthesize Prompt Contract

> 상태: Active
> 목적: 현재 `onto` 프로토타입의 `종합 단계 (synthesize)`가 따라야 하는 `종합 프롬프트 계약 (SynthesizePromptContract)`을 고정한다.
> 기준 문서:
> - `.onto/processes/review/lens-registry.md`
> - `.onto/processes/review/lens-prompt-contract.md`
> - `process.md`
> - `.onto/processes/review/review.md`
> - `authority/core-lexicon.yaml`

---

## 1. Position

`종합 프롬프트 계약 (SynthesizePromptContract)`은
`synthesize`가 lens finding을 읽고 final review output을 만드는 단계의 공통 실행 계약이다.

이 계약의 source material은 아래다.

- `.onto/roles/synthesize.md`
- `process.md`의 `Codex Review Synthesize Prompt Template`
- `.onto/processes/review/review.md`의 Step 3/4

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

## 2.1 Language Policy

Synthesize output 은 `.onto/principles/output-language-boundary.md` 의 two-axis 정책을 따른다.

- **Synthesis markdown body (consensus · disagreement · deliberation decision · per-item provenance · frontmatter)** 는 **English 고정**. 본 body 는 `ReviewRecord` 의 source 이며 subsequent session · learning extraction · audit 의 입력이 된다. 번역이 섞이면 cross-session 비교와 promote 파이프라인이 깨진다.
- **Principal 직접 소비 섹션 (final review result 요약 등)**: `synthesis.md` 가 principal 에게 노출되는 최종 리포트이기도 하지만, 현재 프로토타입에서는 body 전체가 그대로 출력된다. "user-visible final summary" 를 별도 구조로 분리하여 Runtime Coordinator 의 render seat (`src/core-runtime/translate/render-for-user.ts`) 를 통해 번역하는 것은 후속 PR 의 scope 다 (`.onto/principles/output-language-boundary.md` §3.3).
- 따라서 본 계약은 synthesize 프롬프트 템플릿에 `output_language` 를 **주입하지 않는다**.

Synthesize 내부 추론 언어 (deliberation reasoning, adjudication basis) 도 English 로 유지한다. 본 reasoning 은 `Deliberation Decision` 섹션에 기록되어 향후 세션에서도 참조된다.

---

## 3. Required Inputs

`종합 프롬프트 계약 (SynthesizePromptContract)`의 최소 입력은 아래다.

1. participating lens list
2. lens result file paths
3. system purpose and principles
4. resolved review mode
5. materialized input ref (deliberation 시 evidence 재읽기 대상)
6. `synthesis_output_path`
7. self-loading context refs
   - synthesize learnings
   - communication learning
   - project-level synthesize learnings
   - learning rules

`output_language` 는 의도적으로 본 목록에서 제외되었다 — §2.1 Language Policy 참조.

### 3.1 Input Expectations (Lens Output Fields)

각 lens result file은 `lens-prompt-contract.md` §8 (schema_version: 2)에 따라
최소 아래 필드를 포함해야 한다. synthesize는 이 필드들의 수신을 필수로 기대한다.

- **4-field claim**: `{target, evidence_anchor, claim, lens_id}` — 각 finding별
- **`upstream_evidence_required`**: 해당 시
- **`domain_constraints_used`**: 해당 시 (durable provenance 형식)
- **`domain_context_assumptions`**: 해당 시

4필드의 의미와 co-location rule은 `.onto/processes/review/shared-phenomenon-contract.md`가 정의한다.
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
participation:
  expected_lenses: [<lens_id>, ...]         # binding 이 active 로 선언한 lens id 목록
  received_lenses: [<lens_id>, ...]         # output 을 성공적으로 산출한 lens id
  missing_or_failed_lenses:                 # expected 에 있으나 received 에 없는 lens
    - { lens_id: <id>, reason: missing | failed | abstained }
  run_status: full | degraded | insufficient
---
```

### 5.1 `deliberation_status` 값 규칙

- `not_needed`: lens 간 disagreement가 없는 경우.
- `performed`: synthesize가 §6에 따라 in-process deliberation을 수행하고 resolution을 기록한 경우.
- `required_but_unperformed`: synthesize 출력에서는 사용하지 않는다. 이 값은 runner가 synthesize task 자체의 실패를 감지했을 때만 record assembler가 부여하는 failure marker다.

### 5.2 Participation completeness (IA-2)

- `expected_lenses` / `received_lenses` / `missing_or_failed_lenses` / `run_status` 는 `.onto/roles/synthesize.md` §Participation completeness 가 요구하는 측정 결과의 직렬화다
- `run_status` 매핑: `full` = expected == received. `degraded` = received 가 expected 의 non-empty 부분집합. `insufficient` = received 가 비어있거나 `axiology` 단독
- `run_status=insufficient` 이면 consensus / disagreement 섹션은 "data insufficient" marker 로 남기고 합의 claim 을 produce 하지 않는다
- 이 frontmatter 는 degraded run 을 full consensus 로 오독하는 것을 방지하는 audit 근거다

### 5.2.1 Internal Body vs Principal Summary (Output Structural Split)

> **Status**: contract established, implementation deferred. 구현 trigger 조건 + scope 는 `.onto/processes/review/lens-prompt-contract.md §8.5` 와 동일 — 본 절은 lens 쪽 contract 의 synthesize 대응을 선언한다.

#### 5.2.1.1 두 층의 경계

| 층 | 섹션 범위 | 소비자 | 언어 정책 |
|---|---|---|---|
| **Internal Body** | §5.3 의 section list (1-12 번) 전체 | ReviewRecord assembler, learning extraction, audit | English 고정 |
| **Principal Summary** (선택적 신설 섹션) | `## Principal Summary` — §5.3 의 items 중 Principal 직접 소비 가치가 있는 subset 의 prose 요약 | Principal | `output_language` 에 따라 translation target |

#### 5.2.1.2 Synthesize 특유 rationale

Synthesize 는 Principal 이 **primary 소비자**이지만, 구조 (frontmatter + section list + per-item provenance) 는 ReviewRecord / learning extraction 을 위해 고정되어 있다 (§5.3 canonical taxonomy, §5.5 provenance). 두 소비자를 동시에 서빙하려면:

- Internal Body 는 §5.3 canonical taxonomy + §5.5 per-item provenance 유지 (machine-readable)
- Principal Summary 는 Internal Body 의 key findings 을 prose 로 재진술 (human-readable)

본 split 없이 synthesize output 전체를 번역하면 ReviewRecord / learning extraction 이 번역된 텍스트 기반이 되어 cross-session 비교 불가.

#### 5.2.1.3 Contract invariant (구현 시)

- Internal Body section list (§5.3) 는 변경되지 않음
- Principal Summary 는 Internal Body 에 없는 claim 도입 금지 (재진술만)
- renderPointId: `review_synthesize_principal_summary` (본 섹션 활성 시 `authority/external-render-points.yaml` 신설)
- `output_language: en` 일 때 Principal Summary 생략 가능
- lexicon term 취급: `authoring_rules.translation_policy` 규칙 (preserved/translated/bilingual) 적용

#### 5.2.1.4 ReviewRecord 영향

record-contract §4.5 Synthesis Layer 는 Internal Body 만 source. Principal Summary 는 runtime-derived (재생성 가능). 따라서 ReviewRecord schema 추가 필드 불필요.

### 5.3 Section list (canonical taxonomy)

아래는 이 contract 가 정하는 **단독 canonical section 명칭** 이다. 동의어 / legacy alias 는 §5.4 alias map 을 따르며 이 list 로 정규화한다.

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
12. shared phenomenon summary — 동일 phenomenon에 대한 다중 lens claim이 있는 경우, claim relation 분류 결과를 명시한다 (corroboration / disagreement / partial overlap / dedup). 분류 규칙은 `.onto/processes/review/shared-phenomenon-contract.md` §4를 따른다. 이 계약은 분류 규칙을 재정의하지 않는다

### 5.4 Alias map (IA-3)

canonical label 과 자주 drift 되는 legacy alias 쌍. synthesis output 은 canonical label 만 사용한다.

| Canonical | Legacy alias (금지) |
|---|---|
| `disagreement` | `contradiction`, `conflict` (lens 간 의견 차이 의미일 때) |
| `conditional consensus` | `conditional agreement`, `conditional agreement (with stipulation)` |
| `immediate actions` | `recommended actions (urgent)`, `required actions` |
| `recommendations` | `recommended actions (non-urgent)`, `suggestions` |
| `axiology-proposed additional perspectives` | `axiology-proposed new perspectives`, `new perspectives` (role header 제외) |

legacy alias 발견 시 synthesis output 은 canonical 로 정규화한다. prompt packet materializer 는 §5.3 label 만 emit 한다.

### 5.5 Per-item provenance (IA-4)

sections 1–12 의 각 item 은 아래 provenance 필드를 갖는다. 명시 형식은 markdown 내 bullet 로 기술한다 (직렬 예시 §5.5.1).

- **supporting_lenses** — 이 item 의 claim 을 지지한 lens id 목록
- **contesting_lenses** — 이 item 에 대해 반대 claim 을 제기한 lens id 목록. 없으면 빈 배열
- **adjudication_basis** — 이견이 해소된 경우 `.onto/roles/synthesize.md` §Adjudication boundary 의 3 경로 중 어느 것 (`cited_lens_output` / `declared_rule_resolved_artifact` / `deliberation_artifact`) + 해당 근거 anchor (파일 경로 / lens output 위치). 미해소 시 `unresolved`
- **evidence_gaps** — 해소에 부족한 증거 영역 (있는 경우, 1~2 문장)

#### 5.5.1 직렬 예시

```markdown
- **consensus-1**: 모든 lens 가 X 접근이 목적 정렬에 부합한다고 판단한다.
  - supporting_lenses: [logic, structure, semantics, dependency, pragmatics, evolution, coverage, conciseness, axiology]
  - contesting_lenses: []
  - adjudication_basis: cited_lens_output (round1/logic.md §3, round1/structure.md §2, ...)
  - evidence_gaps: null
```

### 5.6 Immediate actions priority rule (IA-1)

§5.3 item 7 `immediate actions` 에 부여되는 priority 는 아래 중 하나의 declared source 에 근거해야 한다.

- cited lens output 이 "immediate" 또는 "blocking" 으로 표기한 finding
- declared rule-resolved artifact (예: `shared-phenomenon-contract` 가 blocking 으로 분류) 
- deliberation artifact 가 priority 를 명시

위 source 중 어느 것도 없는 action 은 `recommendations` (§5.3 item 8) 로 분류하거나 priority 없이 `immediate actions` 에 unprioritized marker 와 함께 유지한다. synthesize 가 "합리적 판단" 으로 priority 를 부여하는 것은 §Adjudication boundary 금지 경로다.

**Runtime packet과의 정합성**: 위 12개 항목 중 4 (overlooked premises), 11 (final review result), 12 (shared phenomenon summary)는 현 runtime packet (`materialize-review-prompt-packets.ts`)이 별도 heading으로 강제하지 않는다. 4와 12는 9개 분류 섹션 (Consensus / Conditional Consensus / Disagreement / Unique Finding Tagging)이 적용하는 Tagging Completeness Rule에 흡수되며, 11은 synthesis output 자체와 등가다. 이 3개 항목을 별도 heading으로 부활시킬지 또는 이 contract에서 제거할지는 packet 갱신 PR이 단일 결정 seat이며, 본 contract는 그 결정 시점까지 12개 enumeration을 conceptual reference로 보존한다.

즉 현재 prompt-backed reference path에서는
`synthesis markdown`이 canonical prompt output이다.

later productization에서는 이 output이
`ReviewRecord`의 human-readable layer source가 된다.

aggregate primary artifact는
`.onto/processes/review/record-contract.md`에서 정의하는 `ReviewRecord`다.

---

## 6. Deliberation Rule

### 6.1 Deliberation의 두 경로

Review 실행 realization은 deliberation 수행 경로에 따라 두 부류로 나뉜다.

- **Cross-process deliberation**: Agent Teams 계열. teammate 간 SendMessage 채널이 존재하므로 contested point를 relevant lens teammate에게 다시 돌려 cross-process deliberation을 수행한다. 결과는 별도 `deliberation.md`에 기록될 수 있다.
- **In-process deliberation**: cross-process lens-to-lens 메시징 채널이 없는 realization (`subagent` fallback, `subagent + codex`). synthesize가 모든 lens 결과 + materialized input을 이미 scope에 쥐고 있으므로 synthesize 자신이 deliberation actor로 in-process 수행한다.

본 계약 §6.2는 in-process deliberation 경로의 절차를 고정한다. cross-process 경로는 `process.md`의 Agent Teams Step 4가 별도 authority다.

### 6.2 In-process deliberation 수행 절차

synthesize는 in-process deliberation 경로에서 deliberation actor다. 수행 절차는 다음과 같다.

1. lens 결과 전체에서 contested point를 식별한다. contested point 식별 기준은 `.onto/processes/review/shared-phenomenon-contract.md` §4의 `disagreement` 관계를 기본으로 한다. orthogonal predicate에 대한 상호 비모순 claim은 contested로 간주하지 않는다
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

record assembler는 이 두 채널을 정합하게 해석해야 하며, 상세 규칙은 `.onto/processes/review/record-contract.md`가 정한다.

---

## 7. Example Prompt Skeleton

```text
You are synthesize.

[Your Definition]
{Content of .onto/roles/synthesize.md}

[Context Self-Loading]
{synthesize learnings / communication / project learnings / learning rules}

[Language Policy]
Respond in English. Reasoning, tool arguments, YAML / markdown emits, and
hand-offs to other agents stay English-only regardless of `output_language`.
Principal-facing translation happens at the Runtime Coordinator's render seat
(.onto/principles/output-language-boundary.md).

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

<!-- derived-from: .onto/processes/review/binding-contract.md, resolved_execution_realization × resolved_host_runtime -->

| Realization | Deliberation 경로 |
|---|---|
| Agent Teams teammate | Cross-process (teammate SendMessage 활용) |
| subagent (Claude Code Agent tool) | In-process (synthesize가 수행) |
| `subagent + codex` | In-process (synthesize가 수행) |
| `MCP`로 분리된 `LLM` | 해당 realization adapter 배선 시점에 결정 (아래 결정 규칙) |
| external model worker | 해당 realization adapter 배선 시점에 결정 (아래 결정 규칙) |

**Realization adapter 배선 시 deliberation 경로 결정 규칙** (위 표의 마지막 두 행에 적용):

- **결정 주체**: 해당 realization을 review pipeline에 연결하는 adapter 구현자 (PR author).
- **판정 시점**: adapter PR의 binding/dispatch 코드를 작성하는 시점 — runtime 실행 중에는 결정하지 않는다.
- **판정 signal**: realization이 lens 단위 간 inter-agent messaging primitive를 제공하면 Cross-process, 그렇지 않으면 In-process. "messaging primitive"는 lens A가 lens B에 시점-동기화된 응답 요청을 보내고 그 응답을 받을 수 있는 채널을 의미한다 (예: Agent Teams의 SendMessage). 단순 파일/큐 기반 비동기 통신은 messaging primitive로 간주하지 않는다.
- **결정 기록 위치**: adapter PR이 본 §8 표의 해당 행을 확정 값 (Cross-process 또는 In-process)으로 갱신한다.

---

## 9. Immediate Follow-up

다음 단계는 아래다.

1. `lens markdown output`과 `synthesis markdown output`을 `ReviewRecord` shape로 매핑한다
2. 이후 prompt-backed path에서 `review-record.yaml` field completeness를 안정화한다
