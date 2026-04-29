# Review Detection Signals Contract

> 상태: Active (Phase B-1, schema v1)
> 목적: `onto review --emit-detection-signals` 가 stdout 으로 emit 하는 JSON 의 schema 와 의미를 고정한다. interactive runtime selection (design-draft §3~§5) 의 host prose (Claude Code `AskUserQuestion`, Codex CLI `request_user_input`) 가 axis 선택 분기를 결정하기 위해 소비한다.
> 기준 문서:
> - `development-records/evolve/20260425-review-execution-interactive-selection.md` §3.1, §12
> - `src/core-runtime/discovery/host-detection.ts` (predicates 의 SSOT)

---

## 1. Position

Detection signals 는 onto review 실행 직전 **의사결정 입력**이다. 어떤 detection signals 가 있느냐에 따라 host prose 가 다음 중 하나를 선택한다.

1. **first-run interactive flow** (review block 부재 + interactive 환경) — Q-Teamlead → Q-Subagent → Q-Effort → Q-Persist 연쇄.
2. **subsequent run reminder** (review block 유효 + drift 없음) — STDERR 1-줄 reminder 후 그대로 dispatch.
3. **drift 재선택** (review block 유효 + drift 감지) — drift 사유 안내 + 연쇄 재선택.
4. **non-interactive fail-fast** — review block 부재 + interactive 불가 환경.

Schema 는 host prose 가 위 4 분기 중 하나를 deterministic 하게 고를 수 있도록 minimal sufficient set 을 노출한다.

## 2. 위치 매트릭스

| 영역 | 위치 |
|---|---|
| Runtime emit seat | `src/core-runtime/cli/review-invoke.ts:runReviewInvokeCli` (early-exit 분기) |
| Gather seat | `src/core-runtime/review/detection-signals.ts:gatherDetectionSignals` |
| Format seat | `src/core-runtime/review/detection-signals.ts:formatDetectionSignalsJson` |
| Predicate SSOT | `src/core-runtime/discovery/host-detection.ts` 의 6 detect\* helpers |
| Test SSOT | `src/core-runtime/review/detection-signals.test.ts` (24 케이스) |

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
| `host` | host prose 가 자기 도구를 매핑할 user-facing label. | `detectHostRuntimeCategory` ("claude" → "claude-code") |
| `teams_env` | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 정확 매칭. TeamCreate 활성화 가능 여부. | direct env probe |
| `codex.binary` | PATH 위 codex 실행 파일 존재. | `detectCodexBinaryAvailable` 의 PATH 검사 sub-step |
| `codex.auth` | `~/.codex/auth.json` 존재. binary 와 독립 (binary 부재 + auth 존재 = 업그레이드 안내 신호). | `fsSync.existsSync(~/.codex/auth.json)` |
| `litellm_endpoint` | `LITELLM_BASE_URL` env 존재. | `detectLiteLlmEndpoint` |
| `credentials.anthropic` | `ANTHROPIC_API_KEY` env 존재. | `detectAnthropicApiKey` |
| `credentials.openai` | `OPENAI_API_KEY` env OR `~/.codex/auth.json:OPENAI_API_KEY` 존재. | `detectOpenAiApiKey` |
| `review_block_present` | `ontoConfig.review` 가 non-null object. axis block "등재" 여부 (validity 와 별개). | `typeof === "object" && !== null` |
| `drift_reason` | Phase B-1: 항상 `null`. Phase B-N: `validateReviewConfig` pass + `checkRequirements` fail 시 사유 string. | reservation |

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
