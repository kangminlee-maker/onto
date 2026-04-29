# Review Detection Signals Contract

> 상태: Active (Phase B-1, schema v1)
> 목적: `onto review --emit-detection-signals` 가 stdout 으로 emit 하는 JSON 의 schema 와 의미를 고정한다. interactive runtime selection (design-draft §3~§5) 의 host prose (Claude Code `AskUserQuestion`, Codex CLI `request_user_input`) 가 axis 선택 분기를 결정하기 위해 소비한다.
> 기준 문서:
> - `development-records/evolve/20260425-review-execution-interactive-selection.md` §3.1, §12
> - `src/core-runtime/discovery/host-detection.ts` (predicates 의 SSOT)

---

## 1. Position

Detection signals 는 onto review 실행 직전 **의사결정 입력**이다. 어떤 detection signals 가 있느냐에 따라 host prose 가 다음 중 하나를 선택한다.

1. **first-run interactive flow** (review block 미등재 + interactive 환경) — Q-Teamlead → Q-Subagent → Q-Effort → Q-Persist 연쇄.
2. **subsequent run reminder** (review block 등재 + validity OK + drift 없음) — STDERR 1-줄 reminder 후 그대로 dispatch.
3. **drift 재선택** (review block 등재 + drift 감지) — drift 사유 안내 + 연쇄 재선택.
4. **non-interactive fail-fast** — review block 미등재 + interactive 불가 환경.

### 1.1 Phase B-1 의 책임 경계

본 v1 schema 는 위 4 분기 중 **(1) 과 (4)** 의 분기 결정에만 충분한 입력을 노출한다. 즉 `review_block_present` 가 false 이면 host prose 는 interactive 가능 여부에 따라 (1) 또는 (4) 로 진입한다. **(2) 와 (3) 의 구분 — block validity 검증 및 drift 검증 — 은 본 schema 가 직접 답하지 않는다**:

- **Validity 검증**은 host prose 가 `review-config-validator.ts` 를 별도 단계로 호출해서 수행한다 — `review_block_present` 는 "axis block 이 등재되었는가" 만 답하고, "유효한가" 는 답하지 않음.
- **Drift 검증**은 Phase B-N 에서 추가 — Phase B-1 의 `drift_reason` 은 항상 `null` 이며 그 의미는 "drift 가 검증되지 않았다" 이지 "drift 가 없다" 가 아님 (§3.1 drift_reason 항목 참조).

Phase B-1 host prose 는 (2)/(3) 분기를 본 schema 만으로 결정하려 시도하지 않아야 하며, 등재된 block 에 대해 dispatch 전에 validator + drift checker (후속 Phase) 를 별도 호출하는 책임을 진다.

## 2. 위치 매트릭스

| 영역 | 위치 |
|---|---|
| Runtime emit seat | `src/core-runtime/cli/review-invoke.ts:runReviewInvokeCli` (early-exit 분기) |
| Gather seat | `src/core-runtime/review/detection-signals.ts:gatherDetectionSignals` |
| Format seat | `src/core-runtime/review/detection-signals.ts:formatDetectionSignalsJson` |
| Predicate SSOT | `src/core-runtime/discovery/host-detection.ts` 의 8 detect\* helpers (`detectAnthropicApiKey`, `detectCodexAuthFile`, `detectCodexBinaryAvailable`, `detectHostRuntimeCategory`, `detectLiteLlmEndpoint`, `detectOpenAiApiKey`, `detectTeamsEnv`, plus the category enum). detection-signals.ts 는 local probe 를 두지 않고 모든 fact 를 위 모듈에 위임한다 (PR #251 review C2). |
| Test SSOT | `src/core-runtime/review/detection-signals.test.ts` |

---

## 3. Schema v1 (정본)

```jsonc
{
  "schema_version": "v1",
  "host": "claude-code" | "codex" | "standalone",
  "teams_env": boolean,
  "codex": {
    "binary": boolean,
    "auth": boolean
  },
  "litellm_endpoint": boolean,
  "credentials": {
    "anthropic": boolean,
    "openai": boolean
  },
  "review_block_present": boolean,
  "drift_reason": string | null
}
```

### 3.1 Field 의미

| Field | 정의 | 출처 |
|---|---|---|
| `schema_version` | `"v1"` 리터럴. host prose 는 이 값으로 capability branching. | 본 contract |
| `host` | **관측된 runtime fact**. 환경 신호 (CLAUDECODE / CODEX_THREAD_ID / codex binary / 부재) 로만 결정. `ontoConfig.host_runtime` override 는 본 field 에 영향 주지 않음 — override 는 downstream resolver (execution-profile / review-invoke handoff) 의 영역. (PR #251 review C3). | `detectHostRuntimeCategory({})` ("claude" → "claude-code") |
| `teams_env` | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 정확 매칭. TeamCreate 활성화 가능 여부. | `detectTeamsEnv` |
| `codex.binary` | PATH 위 codex 실행 파일 존재. | `detectCodexBinaryAvailable` 의 PATH 검사 sub-step |
| `codex.auth` | `~/.codex/auth.json` 파일 존재. binary 와 독립 (binary 부재 + auth 존재 = 업그레이드 안내 신호). 본 field 는 file presence 만 의미하며 자격증명의 valid/usable 여부는 검증하지 않음. | `detectCodexAuthFile` |
| `litellm_endpoint` | `LITELLM_BASE_URL` env 존재. | `detectLiteLlmEndpoint` |
| `credentials.anthropic` | `ANTHROPIC_API_KEY` env 존재. | `detectAnthropicApiKey` |
| `credentials.openai` | `OPENAI_API_KEY` env OR `~/.codex/auth.json:OPENAI_API_KEY` 존재. | `detectOpenAiApiKey` |
| `review_block_present` | `ontoConfig.review` 가 non-null object — 즉 "axis block 이 등재되었는가" 만 답한다. 등재된 block 의 well-formedness / validity 는 검증하지 않음. host prose 는 본 field 가 true 일 때 dispatch 직전에 `review-config-validator.ts` 를 별도 단계로 호출해 validity 를 검증한다 (PR #251 review C1). | `typeof === "object" && !== null` |
| `drift_reason` | Phase B-1: 항상 `null`. **null 의 의미는 "drift 가 검증되지 않았다" 이지 "drift 가 없다" 가 아님** — host prose 는 본 field 만으로 drift-vs-no-drift 분기를 결정해서는 안 된다 (PR #251 review CC1). Phase B-N: drift checker 도입 시 `validateReviewConfig` pass + `checkRequirements` fail 사유 string 으로 populate. | reservation |

### 3.2 Field 순서 보증

`formatDetectionSignalsJson` 가 emit order 를 schema 정의 순서 그대로 고정한다. host prose 가 regex 또는 line-based parse 를 쓸 경우에도 안전.

### 3.3 Forward compatibility

- 새 field 추가는 `schema_version` 을 `"v1.1"` 등 minor bump 로 표시 (옵션 E activation 시 `lens_agent_teams_mode`, `a2a_deliberation` 추가 예정).
- 기존 field 의 의미 변경은 major bump (`"v2"`).
- Host prose 는 `schema_version` 을 검사하여 unknown major 에 대해 conservative fail-fast 권장.

---

## 4. CLI surface

```
onto review --emit-detection-signals [--project-root <path>]
```

- 부수효과 없음 (env mutation, file write, network 모두 0).
- `--project-root` 미지정 시 cwd 기준으로 `.onto/config.yml` 을 찾는다.
- stdout 에 schema v1 JSON (pretty-printed, 2-space indent) + 끝에 newline.
- exit code: 0 (정상 emit), 1 (config 파일 parse 오류 등 — `readOntoConfig` 가 warn + 빈 config 로 fall through 하므로 실제로는 0 이 거의 모든 케이스).

---

## 5. 라이프사이클

1. **Phase B-1** (현재) — schema v1. drift_reason 항상 null. lens_agent_teams_mode / a2a_deliberation 미포함.
2. **Phase B-N** (drift detection 후속 PR) — drift_reason 의 실제 string 값 populate. schema_version 유지.
3. **옵션 E activation** (PR #250 follow-up) — `lens_agent_teams_mode`, `a2a_deliberation` field 추가 → `schema_version: "v1.1"`. 본 contract 갱신.
4. **변경 시 절차** — schema 변경 PR 은 본 문서 + `detection-signals.ts` interface + `.test.ts` 의 `expect(keys).toEqual([...])` 3 위치를 동시 갱신.

---

## 6. 비고

- Host prose 가 본 JSON 을 받아 어떤 AskUserQuestion 옵션을 제시할지의 매핑은 `.onto/commands/review.md` (Phase B-2 작업) 의 책임이다. 본 contract 는 "어떤 입력을 노출하는가" 만 고정하고, "어떤 분기를 만드는가" 는 prose 가 결정.
- design-draft §12 의 "open items" 중 detection-signals JSON schema 항목이 본 v1 으로 closed.
