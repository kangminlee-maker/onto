# Review Nested Spawn Coordinator Contract

> 상태: Active
> 목적: Claude Code 세션에서 Agent tool을 사용한 lens dispatch coordinator의 실행 계약을 정의한다.
> authority: `dev-docs/review-productized-live-path.md`의 하위 실행 계약
> 기준 문서:
> - `dev-docs/review-productized-live-path.md`
> - `dev-docs/review-prompt-execution-runner-contract.md`
> - `dev-docs/review-execution-preparation-artifacts.md`
> - `src/core-runtime/review/artifact-types.ts`

---

## 1. Position

이 문서는 `commands/review.md`가 가리키는 실행 계약 중 하나다.

- `commands/review.md`는 사용자 옵션과 경로 선택만 담는 thin entrypoint다
- 이 문서는 Nested Spawn Coordinator 경로의 실행 절차를 정의한다
- 실행 중 사용하는 값은 이 문서의 prose가 아니라 `execution-plan.yaml`과 `binding.yaml`이 authority다

---

## 2. Coordinator 7-Phase Flow

### Phase 1: Preparation

1. Bash tool로 실행:
   ```
   onto review {$ARGUMENTS} --prepare-only
   ```
   또는 onto 레포 내부에서: `npm run review:invoke -- {$ARGUMENTS} --prepare-only`.
   이 명령은 모든 전처리(positional 파싱, target stat, 도메인 해석, lens set 결정)와
   세션 준비(artifact, prompt packet 생성)를 수행한 뒤, 실행/완료 없이 반환한다.
2. JSON stdout(`PrepareOnlyResult`)에서 파싱:
   - `session_root` — 세션 디렉토리 경로
   - `request_text` — 원본 요청 텍스트. Phase 6의 `review:complete-session --request-text`에 필수. 반드시 보존한다. 복구 경로: `{session_root}/interpretation.yaml`의 `intent_summary` 필드에 동일 값이 저장되어 있으므로, coordinator crash 시 이 파일에서 복구 가능.
   - `execution_realization`, `host_runtime`, `review_mode` — 참고용 (execution-plan.yaml에서도 도출 가능)
3. `{session_root}/execution-plan.yaml` 읽기. 이하 모든 값은 이 artifact에서 도출:
   - `session_id`
   - `execution_realization`
   - `host_runtime`
   - `review_mode`
   - `lens_prompt_packet_seats[]` — 각각 `lens_id`, `packet_path`, `output_path`
   - `synthesize_prompt_packet_path`
   - `synthesis_output_path`
   - `prompt_packets_root`
   - `error_log_path`
   - `execution_result_path`
   - `effective_boundary_state`
   - `deliberation_output_path` (존재 시)
4. `planned_lens_ids`를 `lens_prompt_packet_seats[]`에서 도출.
5. `max_concurrent_lenses`를 결정:
   - `execution-plan.yaml`에 `max_concurrent_lenses`가 있으면 사용
   - 없으면 `lens_prompt_packet_seats`의 길이 (전부 동시)
6. error-log.md 초기 항목 작성 (Write tool). 포맷은 §4 참조:
   - `runner boundary state` — `effective_boundary_state` 필드 전사
   - `runner parallel dispatch policy` — `max_concurrent_lenses` 기록

### Phase 2: Lens Dispatch

`lens_prompt_packet_seats[]`의 각 seat에 대해 Agent tool spawn. **단일 메시지**에서 `max_concurrent_lenses` 개수만큼 동시 dispatch.

각 Agent 프롬프트는 §3의 템플릿 사용. 변수:
- `{lens_id}` — seat의 `lens_id`
- `{packet_path}` — seat의 `packet_path`
- `{output_path}` — seat의 `output_path`
- `{unit_kind}` — `lens`

모든 Agent 반환 후, 각 lens에 대해 error-log.md에 dispatch-started / dispatch-completed (또는 failure) 항목 기록.

### Phase 3: Halt Check

1. 각 lens의 `output_path` 파일 존재 + 비어있지 않은지 확인 (Read tool).
2. `participating_lens_ids` (성공)와 `degraded_lens_ids` (실패) 추적.
3. 실패한 lens가 있으면 error-log.md에 실패 기록 (§4 포맷).
4. 성공한 lens 수가 `execution-plan.yaml`의 `minimum_participating_lenses`보다 적으면 (기본값: 2):
   - `halt_reason` 설정
   - Phase 5로 건너뜀 (`execution_status: halted_partial`)

### Phase 4: Synthesize

1. `synthesize_prompt_packet_path`에서 원본 synthesize packet 읽기.
2. enrichment 섹션 구성 (project root 기준 상대 경로):
   ```
   ## Runtime Participating Lens Outputs
   - {lens_id}: {relative_output_path}
   ...
   ```
   실패한 lens가 있으면:
   ```
   ## Degraded Lens Failures
   - {lens_id}: {error_message}
   ```
3. enriched packet을 `{prompt_packets_root}/onto_synthesize.runtime.prompt.md`에 Write.
4. §3 템플릿으로 단일 Agent spawn (`unit_kind: synthesize`, `unit_id: onto_synthesize`).

### Phase 5: Execution Result

`execution_result_path`에 Write tool로 `execution-result.yaml` 작성.

스키마: `ReviewExecutionResultArtifact` (`artifact-types.ts`).

모든 필드는 artifact에서 도출:
- `session_id`, `session_root`, `execution_realization`, `host_runtime`, `review_mode` — `execution-plan.yaml`에서
- `execution_status` — §5의 도출 규칙
- `execution_started_at`, `execution_completed_at`, `total_duration_ms` — coordinator가 추적한 근사 타임스탬프
- `planned_lens_ids` — Phase 1에서 도출
- `participating_lens_ids`, `degraded_lens_ids`, `excluded_lens_ids` — Phase 3에서 도출
- `executed_lens_count` — `participating_lens_ids`의 길이
- `synthesis_executed` — Phase 4 성공 여부
- `deliberation_status` — `synthesis_output_path`의 frontmatter에서 읽거나, `deliberation_output_path` 존재 시 `performed`, 그 외 `null`
- `halt_reason` — Phase 3에서 설정된 값 또는 `null`
- `error_log_path` — `execution-plan.yaml`에서
- `lens_execution_results[]` — 각 lens의 `ReviewUnitExecutionResult`
- `synthesize_execution_result` — synthesize의 `ReviewUnitExecutionResult` 또는 `null`

### Phase 6: Completion

Bash tool로 실행:
```
onto review --complete-session --project-root {project_root} --session-root {session_root} --request-text "{original user request text}"
```
또는 onto 레포 내부에서: `npm run review:complete-session -- --project-root {project_root} --session-root {session_root} --request-text "{text}"`

### Phase 7: Presentation and Verification

1. `{session_root}/final-output.md` 읽어서 사용자에게 표시.
2. `{session_root}/review-record.yaml` 존재 확인.
3. `review-record.yaml`의 `record_status` 확인:
   - `completed` 또는 `completed_with_degradation` → 정상
   - `halted_partial` → 사용자에게 부분 완료 안내
   - 파일 미존재 → `review:complete-session` 실패를 사용자에게 안내

---

## 3. Agent Prompt Template

lens와 synthesize 모두 동일 템플릿 사용. 출처: `agent-teams-review-unit-executor.ts:55-84`.

```
You are a single bounded review unit executing as an Agent Teams-style ContextIsolatedReasoningUnit.

Unit id: {lens_id}
Unit kind: {unit_kind}
Authoritative prompt packet path: {packet_path}
Canonical output path: {output_path}

Rules:
- Read the prompt packet file at {packet_path}. Treat it as the authoritative contract.
- Treat the Boundary Policy and Effective Boundary State in the packet as hard constraints.
- Read the files referenced by the prompt packet when needed.
- Stay within the smallest sufficient file set implied by the packet.
- Do not recursively follow reference chains beyond the files explicitly listed in the packet unless the packet requires it.
- Do not use web research when the packet says web research is denied.
- Do not read outside the allowed filesystem scope described in the packet.
- Produce only the final markdown content for the canonical output path.
- Do not wrap the answer in code fences.
- Do not add commentary before or after the markdown.
- Do not modify repository files yourself.
- Do not change the required output structure from the packet.
- Preserve disagreement and uncertainty explicitly when present.
- If you cannot complete the task within the declared boundary, preserve that limitation explicitly as insufficient access or insufficient evidence within boundary instead of broadening the search.

Read the prompt packet, execute the review, then write the complete output to {output_path} using the Write tool.
```

---

## 4. Error-Log Format

TS runner의 `appendMarkdownLogEntry` 포맷과 동일:

```markdown
## {ISO timestamp} | {title}
{body}
```

항목 종류:

- `runner boundary state` — `effective_boundary_state` 필드 전사
- `runner parallel dispatch policy` — `max_concurrent_lenses: {값}`
- `runner dispatch started: {unit_id}` — `unit_id`, `unit_kind`, `packet_path`, `output_path`
- `runner dispatch completed: {unit_id}` — `unit_id`, `unit_kind`, `output_path`
- `{unit_kind} failure: {unit_id}` — `unit_id`, `unit_kind`, `packet_path`, `output_path`, `message`, `effective_boundary_state` (선택)
- `runner halted before synthesize` — halt reason + `effective_boundary_state`

---

## 5. Execution Status Derivation

`run-review-prompt-execution.ts:261-272`의 `deriveExecutionStatus`와 동일:

1. `synthesis_executed`가 `false` → `halted_partial`
2. `degraded_lens_ids`가 비어있지 않음 → `completed_with_degradation`
3. 그 외 → `completed`

---

## 6. Deliberation Slot

현재 coordinator는 deliberation을 실행하지 않는다. 그러나 deliberation은 canonical review concept의 일부이므로:

- `execution-result.yaml`의 `deliberation_status`는 `synthesis_output_path`의 frontmatter에서 도출하거나 `null`
- `deliberation_output_path`가 `execution-plan.yaml`에 존재하면 향후 deliberation Agent dispatch가 이 slot을 채운다
- coordinator는 이 slot을 hard-coded `null`로 고정하지 않는다

---

## 7. Partial / Light Lens-Set Path

coordinator는 `execution-plan.yaml`의 `lens_prompt_packet_seats[]` 길이에 따라 작동한다.

- `review_mode: light` → seats가 4개 (예: logic, pragmatics, evolution, axiology)
- `review_mode: full` → seats가 9개

coordinator는 lens 수를 가정하지 않는다. `lens_prompt_packet_seats[]`에 있는 만큼 dispatch한다.

---

## 8. Boundary Model

coordinator는 `execution-plan.yaml`의 `effective_boundary_state`를 읽고, 이를 prompt packet과 error-log에 전사한다.

boundary의 full quartet (`dev-docs/review-execution-preparation-artifacts.md` 참조):

| 계층 | 역할 | coordinator 책임 |
|---|---|---|
| `BoundaryPolicy` | 사용자/시스템이 선언한 경계 정책 | start-session이 binding에 고정. coordinator는 읽기만 |
| `BoundaryPresentation` | prompt packet에 표현된 경계 | start-session이 packet에 포함. coordinator는 변경하지 않음 |
| `BoundaryEnforcementProfile` | 경계 강제 강도 (prompt_declared_only 등) | start-session이 고정. coordinator는 error-log에 전사 |
| `EffectiveBoundaryState` | 최종 유효 경계 상태 | coordinator가 Phase 1에서 읽고, error-log 초기 항목과 실패 기록에 포함 |

coordinator는 boundary를 **설정하지 않는다**. `start-session`이 만든 boundary를 **전달하고 기록**하는 역할만 한다.

---

## 9. Extension Points

향후 확장 시 이 contract에 추가되어야 할 선언적 slot:

| Slot | 현재 상태 | 확장 시 |
|---|---|---|
| deliberation (§6) | declared, 미실행 | Phase 4와 Phase 5 사이에 deliberation Agent dispatch 삽입 |
| multi-round review | 미선언 | Phase 2-4를 round 단위로 반복하는 loop 구조 |
| cross-lens message passing | 미선언 | deliberation의 SendMessage 기반 lens간 직접 교환 |
| custom lens injection | 미선언 | `execution-plan.yaml`에 사용자 정의 lens seat 추가 |
| streaming progress | 미선언 | Phase 2에서 Agent 완료 시 즉시 사용자에게 진행 상황 표시 |

이 slot들은 현재 구현에 영향을 주지 않지만, 향후 구현 시 이 contract를 수정해야 할 위치를 명시한다.

---

## 10. Artifact Dependencies

| Phase | 읽는 artifact | 쓰는 artifact |
|---|---|---|
| 1 | — | error-log.md (초기 항목) |
| 2 | prompt-packets/*.prompt.md | round1/*.md, error-log.md |
| 3 | round1/*.md | error-log.md |
| 4 | onto_synthesize.prompt.md, round1/*.md | onto_synthesize.runtime.prompt.md, synthesis.md |
| 5 | execution-plan.yaml, Phase 2-4 결과 | execution-result.yaml |
| 6 | binding.yaml, session-metadata.yaml, execution-result.yaml, synthesis.md | final-output.md, review-record.yaml |
| 7 | final-output.md, review-record.yaml | — |
