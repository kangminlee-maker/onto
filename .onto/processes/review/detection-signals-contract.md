# Review Detection Signals Contract

> 상태: Active (Phase B-1, schema v1 — L1 raw detection only)
> 목적: `onto review --emit-detection-signals` 가 stdout 으로 emit 하는 JSON 의 schema 와 의미를 고정한다. interactive runtime selection (design-draft §3~§5) 의 host prose (Claude Code `AskUserQuestion`, Codex CLI `request_user_input`) 가 분기 결정의 입력으로 소비한다.
> 기준 문서:
> - `development-records/evolve/20260425-review-execution-interactive-selection.md` §3.1, §12
> - `src/core-runtime/discovery/host-detection.ts` (predicates 의 SSOT)

---

## 1. Position

Detection signals 는 onto review 실행 직전 **의사결정 입력**이다. 어떤 detection signals 가 있느냐 + host prose 가 별도 단계로 호출하는 validator/checker 의 결과를 합성해 다음 4 분기 중 하나를 선택한다.

1. **first-run interactive flow** (review block 미선언 + interactive 환경) — Q-Teamlead → Q-Subagent → Q-Effort → Q-Persist 연쇄.
2. **subsequent run reminder** (review block 선언 + validity OK + drift 없음) — STDERR 1-줄 reminder 후 그대로 dispatch.
3. **drift 재선택** (review block 선언 + drift 감지) — drift 사유 안내 + 연쇄 재선택.
4. **non-interactive fail-fast** (review block 미선언 + interactive 불가, 또는 `config_parse_error` non-null).

### 1.1 Phase B-1 의 책임 경계

위 4 분기 list 는 schema 가 답하는 영역이 아니라 **호스트 prose 합성의 referential context** 이다. 분기 결정 자체는 host prose 가 본 schema 의 L1 fact + 별도 단계의 합성으로 수행한다 (§3.0). 본 schema 는 분기 결정 logic 을 직접 담지 않는다.

분기 결정에 필요한 합성 단계는 다음 셋:

- **Validity 검증** — `review-config-validator.ts` 를 host prose 가 별도 단계로 호출. `review_block_declared=true` 일 때 dispatch 직전 validity 를 검증해 (2)/(3) 분기를 결정.
- **Drift 검증** — Phase B-N 에서 추가될 drift checker. v1 에는 drift 관련 field 가 없음 (이전 round 의 `drift_reason` placeholder 는 v1.x 로 deferred — §3.0).
- **Parse failure 처리** — `config_parse_error` 가 non-null 이면 host prose 는 (4) fail-fast 로 진입하고 사용자에게 config 수정 안내. `review_block_declared=false` 만으로 (1) first-run 분기로 가지 않아야 한다. parseable 하지만 root 가 object 가 아닌 YAML (scalar / null) 도 `config_parse_error` non-null 로 emit 되어 (4) 분기에 포함된다 (PR #251 round 4 CC1).

본 schema 는 Phase B-1 의 책임 boundary 안에서만 fact 를 노출하며, Phase B-N (drift) 과 Phase B-2 (host prose) 가 합성을 담당한다.

---

## 2. 위치 매트릭스

| 영역 | 위치 |
|---|---|
| Runtime emit seat | `src/core-runtime/cli/review-invoke.ts:runReviewInvokeCli` (early-exit 분기) |
| Gather seat | `src/core-runtime/review/detection-signals.ts:gatherDetectionSignals` |
| Format seat | `src/core-runtime/review/detection-signals.ts:formatDetectionSignalsJson` |
| Parse-health reader | `src/core-runtime/review/detection-signals.ts:readConfigWithParseHealth` |
| Predicate SSOT — host/env probes | `src/core-runtime/discovery/host-detection.ts` 의 host 와 env 영역 detect\* helpers: `detectAnthropicApiKey`, `detectCodexAuthFile`, `detectCodexAuthOpenAiKey`, `detectCodexBinary` PATH-only, `detectCodexBinaryAvailable` 결합 (legacy callers), `detectHostRuntimeCategory`, `detectLiteLlmEndpoint`, `detectOpenAiApiKey` 결합 (legacy callers), `detectOpenAiEnvKey`, `detectTeamsEnv`. host runtime category enum 포함. |
| Local SSOT — config / parse-health probes | `src/core-runtime/review/detection-signals.ts` 자체. `readConfigWithParseHealth` (`.onto/config.yml` parse health) + `detectReviewBlockDeclared` (`ontoConfig.review` 객체 검사). 이 두 fact 는 review session boundary 에 종속되어 host-detection 과 ownership 이 분리된다 (PR #251 round 4 C1). |
| Test SSOT | `src/core-runtime/review/detection-signals.test.ts` |

---

## 3. Schema v1

### 3.0 책임 layer — L1 raw detection only

v1 의 모든 field 는 **단일 관찰 가능한 환경 fact** (file 존재? env value? config field 선언?) 만 답한다. 이는 의도된 design 분리이며 의미는 다음과 같다:

| 영역 | L1 (본 schema) | L2 (host prose 가 합성) |
|---|---|---|
| 답하는 질문 | "환경에 무엇이 있는가?" | "그래서 다음에 뭘 해야 하는가?" |
| 합성 logic | 없음. 단일 검사 1:1. | 정책 + validator + checker 합성. |
| Field 이름 | 명사형 — `*_present`, `*_set`, `*_on_path`, `*_declared` | 동사·조건형 — `should_*`, `next_*`, `requires_*` (본 schema 에는 없음) |
| Schema versioning | field 추가/제거 = minor bump. field 의미는 v 안에서 stable. | 정책 변경 = major bump 자주. |

본 schema 가 L1 only 인 이유: PR #251 round 1~3 review 가 보여준 것처럼, L1 과 L2 를 한 schema 에 섞으면 매 lens 가 다른 layer 의 invariant 를 요구해 critical 이 발산한다. L1 만 lock-in 하면:
- semantics lens: 이름이 fact 의 정확한 표현
- pragmatics lens: host prose 가 합성 단계에서 분기 결정 가능 (validator + checker 호출 책임이 명확)
- evolution lens: field 의미가 v1 안에서 stable (drift 추가 = v1.1, validator 호출 통합 = v2)
- dependency lens: raw fact 가 derived 결과로 오염되지 않음

L2 의 합성 logic 은 **`.onto/commands/review.md` prose (Phase B-2) 의 책임**이다. 본 schema 는 그 합성의 입력 fact inventory 일 뿐이다.

### 3.1 Schema (정본) — 11 leaf fields

```jsonc
{
  "schema_version": "v1",
  "host_detected": "claude-code" | "codex" | "standalone",
  "claude_code_teams_env_set": boolean,
  "codex": {
    "binary_on_path": boolean,
    "auth_file_present": boolean
  },
  "litellm_base_url_set": boolean,
  "credentials": {
    "env_has_anthropic_api_key": boolean,
    "env_has_openai_api_key": boolean,
    "codex_auth_has_openai_api_key": boolean
  },
  "review_block_declared": boolean,
  "config_parse_error": string | null
}
```

### 3.2 Field 의미

| Field | 정의 | 출처 |
|---|---|---|
| `schema_version` | `"v1"` 리터럴. host prose 는 이 값으로 capability branching. | 본 contract |
| `host_detected` | **관측된 runtime fact**. 환경 신호 (CLAUDECODE / CODEX_THREAD_ID / codex binary) 로만 결정. `ontoConfig.host_runtime` override 는 본 field 에 영향 주지 않음 (override 는 downstream resolver 영역). | `detectHostRuntimeCategory({})` ("claude" → "claude-code") |
| `claude_code_teams_env_set` | `process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` 가 정확한 문자열 `"1"`. 다른 값 (`"0"`, `"true"`, unset) 은 false. TeamCreate 활성화 가능 여부 (Claude Code harness 의 exact-match gate). | `detectTeamsEnv` |
| `codex.binary_on_path` | `process.env.PATH` 의 어떤 디렉토리에 `codex` 라는 이름의 file 존재 — **file presence ONLY**. 실행 권한 / 실행 가능 여부는 검사하지 않으며, 본 field 는 host prose 가 "Codex 실행 가능" 으로 추론하기 위한 strong 신호가 아님 (PR #251 round 4 C3). 이름의 "binary" 는 코덱스 실행파일 관행을 가리키는 label 일 뿐 executable 검증을 의미하지 않는다. | `detectCodexBinary` (`existsSync` 만) |
| `codex.auth_file_present` | `~/.codex/auth.json` 파일 존재. binary 와 독립. 본 field 는 file presence 만 의미하며 자격증명의 valid/usable 여부는 검증하지 않음. | `detectCodexAuthFile` |
| `litellm_base_url_set` | `process.env.LITELLM_BASE_URL` 이 set (any non-empty value). | `detectLiteLlmEndpoint` |
| `credentials.env_has_anthropic_api_key` | `process.env.ANTHROPIC_API_KEY` 가 set (any non-empty value). | `detectAnthropicApiKey` |
| `credentials.env_has_openai_api_key` | `process.env.OPENAI_API_KEY` 가 set (any non-empty value). env source 만 답하며 auth.json 영향 없음 (PR #251 round 4 C2). | `detectOpenAiEnvKey` |
| `credentials.codex_auth_has_openai_api_key` | `~/.codex/auth.json` 의 `OPENAI_API_KEY` field 가 non-empty string. auth.json source 만 답하며 env 영향 없음. host prose 가 "any source 에서 reachable" 의미가 필요하면 본 field 와 `env_has_openai_api_key` 를 자체 union 합성. | `detectCodexAuthOpenAiKey` |
| `review_block_declared` | `ontoConfig.review` 가 non-null object — "axis block 이 선언되었는가" 만 답. 등재된 block 의 well-formedness / validity 는 검증하지 않음. host prose 는 본 field 가 true 일 때 dispatch 직전 `review-config-validator.ts` 를 별도 단계로 호출. | `typeof === "object" && !== null` |
| `config_parse_error` | `.onto/config.yml` 의 health 를 표현하는 fact. **non-null 케이스 두 가지**: (a) YAML parser 가 throw — 메시지가 `Failed to parse YAML: ...`, (b) parse 성공했지만 root 가 object 가 아님 (scalar / null) — 메시지가 `Config root is not a YAML object: ...` (PR #251 round 4 CC1). null 케이스 두 가지: file 부재 (이때 `review_block_declared=false`), root 가 object 로 정상 parse. host prose 는 본 field 가 non-null 이면 (4) fail-fast 분기로 진입한다 — `review_block_declared=false` 만으로 (1) first-run 으로 가서는 안 됨. | `readConfigWithParseHealth` |

### 3.3 Field 순서 보증

`formatDetectionSignalsJson` 가 emit order 를 schema 정의 순서 그대로 고정한다. host prose 가 regex 또는 line-based parse 를 쓸 경우에도 안전.

### 3.4 Versioning policy (Forward compatibility)

**Minor bump (`v1.1`, `v1.2`, ...)** — 새 L1 raw fact field 추가:
- 옵션 E activation 시 `lens_agent_teams_mode`, `a2a_deliberation` 추가
- Phase B-N drift checker 시 `drift_reason: string | null` (또는 `drift_status: "not_checked" | "no_drift" | <reason>`) 추가
- 본 v1 에서 이미 처리된 분리 (이력 참조 — minor bump 영역 아님): credentials.openai 의 env / auth.json 두 source 분리는 PR #251 round 4 에서 v1 schema 안에 직접 반영됨

**Major bump (`v2`)** — 의미 layer 자체 변경:
- L2 derived field 도입 (예: `should_first_run_interactive`, `should_fail_fast`)
- 기존 field 의 의미 본질 변경 (예: `host_detected` 가 config override 반영하도록 변경)

**불가 변경 (v1 안에서)** — 기존 field 의 의미가 v 안에서 진화하는 패턴 (예: 이전의 `drift_reason: null` 이 "not checked" → "no drift" 의미 변경) 은 versioning policy 위반. v1 에는 미래에 의미 변경할 placeholder 를 두지 않는다.

Host prose 는 `schema_version` 을 검사하여 unknown major 에 대해 conservative fail-fast 권장.

---

## 4. CLI surface

```
onto review --emit-detection-signals [--project-root <path>]
```

- 부수효과 없음 (env mutation, file write, network 모두 0).
- `--project-root` 미지정 시 cwd 기준으로 `.onto/config.yml` 을 찾는다.
- stdout 에 schema v1 JSON (pretty-printed, 2-space indent) + 끝에 newline.
- exit code: 0 (정상 emit). YAML parse 실패는 `config_parse_error` field 로 emit 되고 exit code 는 0 — host prose 가 그 field 보고 fail-fast 결정.

---

## 5. 라이프사이클

1. **Phase B-1 v1** (현재) — L1 raw detection only. 11 leaf field (§3.1). drift 분기 (§1.1 의 (3)) 와 L2 합성 (§3.0) 모두 본 schema 의 책임 영역 밖 — drift 는 Phase B-N, L2 는 Phase B-2 host prose.
2. **Phase B-2** — `.onto/commands/review.md` prose 가 본 schema + validator + checker 합성으로 4 분기 결정.
3. **Phase B-N v1.1** — drift checker 도입 시 drift 관련 L1 fact field 추가 (minor bump).
4. **옵션 E activation v1.1+** — `lens_agent_teams_mode`, `a2a_deliberation` field 추가 (minor bump).
5. **변경 시 절차** — schema 변경 PR 은 다음 5 위치를 동시 갱신:
   - 본 contract (§3.1 schema + §3.2 field 의미 + §3.4 versioning)
   - `detection-signals.ts` 의 `DetectionSignalsV1` interface
   - `detection-signals.ts` 의 `formatDetectionSignalsJson` ordered emit
   - `detection-signals.test.ts` 의 `expect(keys).toEqual([...])` + field 별 case
   - dist 빌드 산출물 (build:ts-core)

---

## 6. 비고

- Host prose 가 본 JSON 을 받아 어떤 AskUserQuestion 옵션을 제시할지의 매핑은 `.onto/commands/review.md` (Phase B-2 작업) 의 책임이다. 본 contract 는 "어떤 입력을 노출하는가" 만 고정하고, "어떤 분기를 만드는가" 는 prose + validator + checker 가 결정.
- design-draft §12 의 "open items" 중 detection-signals JSON schema 항목이 본 v1 으로 closed.
- PR #251 review round 1~3 의 9/9 consensus + conditional consensus 영역은 §3.0 의 L1 only 분리로 본질 해소. round 별 변경 흔적:
  - round 1 (`654dfe0`): SSOT alignment + host config-influence 제거 + review_block validity 분리 + drift_reason 의미 명시
  - round 2 (`dcc12ee`): codex.binary PATH-only 분리 + parse fallback 명시 + 4-cell matrix
  - round 3 (`95e7e41`): L1 only 완주 — 8 field rename + drift_reason 제거 + config_parse_error 추가 + §3.0 책임 layer 신규
  - round 4 (이번 commit): credentials 3 field source-prefix 분리 (env_has_anthropic / env_has_openai / codex_auth_has_openai) + non-object YAML root 도 parseError 로 emit + §2 SSOT 분류 (host/env probes vs config/parse-health probes) + §3.2 codex.binary_on_path 의미 narrow (file presence only) + §1.1 4 분기 prose 가 L2 referential 임 명시 + leaf field count 정정 (10 → 11)
