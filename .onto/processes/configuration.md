# Configuration — onto project config.yml

**Authority**: rank 5 (기능별 계약). Canonical surface for `.onto/config.yml` 의 전체 key set.
**Type source**: `src/core-runtime/discovery/config-chain.ts` 의 `OntoConfig` interface (rank 6).
**Merge logic**: `resolveConfigChain()` 같은 파일.

이 문서는 기존에 여러 곳 (README §"LLM Provider Configuration", `.onto/processes/reconstruct.md` §"Build-time configuration", `.onto/processes/onboard.md`, `CHANGELOG.md`) 에 흩어져 있던 config 문서를 하나의 SSOT 로 통합한다. 문서 간 drift 가 자주 발생해 왔다. 이제부터는:

- 각 key 의 **의미·기본값·유효값 범위** → 본 문서
- 각 key 의 **런타임 사용 위치** → 본 문서 §"Key reference" 의 참조 링크
- 각 key 의 **타입** → `config-chain.ts` 의 interface (이 파일은 type 진실이며 주석 변경 시 본 문서도 동기)

---

## 1. 파일 경로와 gitignore

| 경로 | 역할 |
|---|---|
| `{project}/.onto/config.yml` | project-local config. `.gitignore` 처리됨 → remote main 에 커밋되지 않음 |
| `{onto-home}/.onto/config.yml` | (선택) installation 단위 default. `ONTO_HOME` env 로 override |

project-local 우선 → home 보조. 자세한 병합 규칙은 §3 참조.

## 2. 생성 방법

두 가지:

- **`onto onboard`** — 대화형으로 `output_language` 등 필수 필드 prompt. 대부분의 경우 권장.
- **수동 작성** — 본 문서 §"Key reference" 를 참고해 yaml 직접 편집.

`onto onboard` 상세 절차는 `.onto/processes/onboard.md` 참조. 특히 remote main 은 본 파일이 없으므로, 새 환경 진입 시 기본값은 항상 "unset → 런타임 auto-resolve" 로 동작한다.

## 3. Resolution 체인 (병합 규칙)

```
(1) 런타임 built-in 기본값
    ↓ (next wins)
(2) {onto-home}/.onto/config.yml
    ↓ (next wins)
(3) {project}/.onto/config.yml          ← 대부분의 경우 유일 소스
    ↓ (next wins)
(4) CLI flags (e.g. --llm-base-url, --tool-mode, --domain)
    ↓ (next wins)
(5) 환경변수 (ONTO_HOST_RUNTIME, LITELLM_BASE_URL, ONTO_LEARNING_EXTRACT_MODE, ...)
```

- **scalar key**: last-wins (replacement)
- **array key**: project 가 home 을 **완전 교체**
- **예외**: `excluded_names` 는 union merge (`[home ∪ project]`)

## 4. Key reference

각 subsection 은 "**용도 / 유효값 / 기본값 / 사용 위치**" 형식으로 기술한다.

### 4.1 Output language (external-facing only)

#### `output_language`
- 용도: 개발자·이용자가 읽는 최종 텍스트의 언어. **내부 agent 프롬프트·artifact 는 English 고정** (`.onto/principles/output-language-boundary.md` 참조)
- 유효값: ISO 639-1 code (`en`, `ko`, `ja`, ...)
- 기본값: `en`
- 사용: onboard 대화형, halt 메시지 렌더, 완료 리포트 렌더, help 출력

### 4.2 Host runtime 와 execution realization (review 실행 주체)

#### `host_runtime`
- 용도: review lens/synthesize unit 이 실행되는 host
- 유효값:
  - `codex` — codex CLI 자식 프로세스가 lens 마다 실행 (chatgpt 구독 / API-key)
  - `claude` — Claude Code 세션이 Agent Teams (nested) 또는 Agent tool (flat) 로 subagent spawn
  - `standalone` — TS 프로세스가 단독으로 실행. `subagent_llm` 블록 필수
  - `litellm` / `anthropic` / `openai` — TS 프로세스가 해당 엔드포인트로 직접 HTTP 호출. `execution_realization` 은 자동으로 `ts_inline_http` 로 해소
- 기본값: auto-resolution. `CLAUDECODE=1` 감지 → claude, codex binary 감지 → codex
- 사용: `src/core-runtime/cli/review-invoke.ts::resolveExecutionProfile` (세션 metadata 기록), `resolveExecutorConfig` (subprocess 선택)

#### `execution_realization`
- 용도: host 내부의 실행 실현 방식
- 유효값: `subagent` | `agent-teams` | `ts_inline_http`
- 기본값: `host_runtime` 으로부터 자동 결정 — claude → agent-teams, codex → subagent, standalone/litellm/anthropic/openai → ts_inline_http
- 권장: 대부분의 경우 이 필드는 생략하고 `host_runtime` 만 지정

#### `execution_mode`
- 레거시 별칭 — `execution_realization` 과 동일. 새 config 에서는 `execution_realization` 을 사용

### 4.3 Subagent LLM (per-lens executor 전용)

`host_runtime: standalone` 일 때 **필수**. 다른 host 에서도 main host 와 **별개의 LLM** 을 lens executor 로 쓰고 싶을 때 사용 (예: Claude host + qwen3 lens).

#### `subagent_llm.provider`
- 유효값: `anthropic` | `openai` | `litellm` | `codex`

#### `subagent_llm.model`
- 용도: provider 가 인식하는 모델 id 문자열
- 예시:
  - local MLX: 모델 서버의 `/v1/models` 응답 id 그대로 (예: `mlx-community/Qwen3-30B-A3B-Instruct-2507-4bit`)
  - anthropic: `claude-opus-4-5`, `claude-sonnet-4-6`
  - openai: `gpt-5.4`
  - codex: chatgpt 구독 호환 모델 (예: `gpt-5-codex`)

#### `subagent_llm.base_url`
- 용도: OpenAI-호환 엔드포인트 URL (`provider: litellm` 시 필수)
- 예시: `http://localhost:8080/v1` (MLX), `http://localhost:1234/v1` (LM Studio), `http://localhost:11434/v1` (Ollama), `http://localhost:8000/v1` (vLLM), `http://localhost:4000/v1` (LiteLLM proxy)
- CLI override: `--llm-base-url`
- Env override: `LITELLM_BASE_URL`

#### `subagent_llm.max_tokens`
- 기본값: 4096

#### `subagent_llm.tool_mode`
- 용도: `ts_inline_http` executor 의 tool-calling 전략
- 유효값:
  - `native` — 항상 function-calling loop (Tier 1). provider ∈ {anthropic, openai, litellm} 필수 + 모델이 tool_use 지원
  - `inline` — 단일 턴, 전체 context 인라인 (Tier 2). small model (Qwen3-4B 등) 이나 tool-calling 미지원 엔드포인트에 적합
  - `auto` (기본) — native 시도 후 실패 시 inline fallback
- CLI override: `--tool-mode`
- 참고: packet `Boundary Policy Tools: required` 선언 시 inline 은 자동 거부 (PR #74, A4)

#### `subagent_llm.embed_domain_docs`
- 용도: packet 이 참조하는 domain 문서를 프롬프트에 인라인 embed
- 기본값: false

### 4.4 Background LLM (learn / govern / promote)

Background task (learning extraction, governance check, promote) 는 review lens 와 **별도의 LLM** 호출 경로를 가진다. 이 섹션 key 들은 그 경로 전용.

#### `api_provider`
- 용도: background task 의 provider
- 유효값: `anthropic` | `openai` | `litellm` | `codex`
- 기본값: cost-order auto-resolution — codex OAuth → LiteLLM → Anthropic → OpenAI
- 주의: `host_runtime` 과 동일할 필요 없음 (예: `host_runtime: claude` + `api_provider: litellm` 병행 가능)

#### `model`
- 용도: top-level 모델 id. provider 별 override (`anthropic.model`, `codex.model` 등) 가 있으면 그것이 우선
- 기본값: provider 별 기본 모델

#### `llm_base_url`
- 용도: top-level base URL. `api_provider: litellm` 시 필수
- CLI override: `--llm-base-url`. Env: `LITELLM_BASE_URL`

#### `anthropic.model` / `openai.model` / `litellm.model`
- 용도: provider-specific 모델 override
- 선택 순서: CLI flag > `{provider}.model` > `model` > provider 기본값 (codex) / fail-fast (api-key paths)

#### `reasoning_effort`
- 용도: thinking-capable 모델의 추론 예산
- 유효값: `low` | `medium` | `high` | `xhigh`
- 기본값: 모델 기본값
- 참고: MLX / 일반 오픈 모델은 대부분 무시. codex / anthropic thinking 모델에서 의미

#### `codex.model` / `codex.effort`
- 용도: codex provider 전용 override. chatgpt 구독 계정은 모델 allowlist 제한이 있으므로 주의
- 예시: `codex.model: gpt-5-codex`, `codex.effort: xhigh`

#### `suppress_codex_install_notice`
- 용도: codex OAuth 감지됐으나 binary 미설치 시 1회성 STDERR 안내 억제
- 기본값: false

### 4.5 Review-specific

#### `review_mode`
- 용도: review lens set 선택 — `core-axis` 는 cost-constrained Pareto-optimal 고정 6 lens (axiology / coverage / evolution / logic / semantics / structure), `full` 은 전수 9 lens. 4-axis (coverage × depth × items-lost × cost) 경험적 trade-off 분석 근거. 비용은 부수 효과 (core-axis 는 full 대비 ~67%). 수치 상세: `development-records/benchmark/20260419-lens-contribution-analysis.md`
- 유효값: `core-axis` | `full`

##### Default resolution by invocation path

Default 는 단일 값이 아니라 **invocation path + environment** 에 따라 결정된다. 우선순위 ladder (높은 우선순위가 승리):

| 우선순위 | Trigger | 결정 | 소스 |
|---|---|---|---|
| 1 | CLI `--review-mode <X>` 명시 | `<X>` 그대로 사용 | `review-invoke.ts:1162` resolveReviewMode |
| 2 | Config `review_mode: <X>` 명시 (CLI 없음) | `<X>` 그대로 사용 | `review-invoke.ts:1167` |
| 3 | `host_runtime: standalone \| litellm \| anthropic \| openai` + no explicit mode + no `--lens-id` | Step 1.5 Complexity Assessment 가 LLM 으로 동적 판정 → `core-axis` (6 empirical lenses 또는 dynamic selection) 또는 `full` | `review-invoke.ts:1426` + `complexity-assessment.ts` |
| 4 | 위 모두 불일치 (absolute fallback) | `full` | `review-invoke.ts:1171` |

**실용 요약**:
- 대부분의 사용자 — `.onto/config.yml` 에 `review_mode: core-axis` 명시 → 매일 review 가 core-axis 로 고정 (우선순위 2)
- 자동 판정 원하는 경우 — `host_runtime: standalone/anthropic/…` + `review_mode` 미설정 → Step 1.5 가 target 별로 판정 (우선순위 3)
- 명시 없으면 안전 fallback — `full` 9-lens (우선순위 4)

**주의**:
- 옛 `review_mode: light` 입력 시 stale-input friendly error 발생 (우선순위 ladder 진입 전 rejection). 자세한 migration 은 CHANGELOG.md 의 Consumer migration matrix 참조
- Host-facing positional invoke (예: `/onto:review <target> <intent>`) 는 위 ladder 를 그대로 사용하지만, interactive interpretation 경로에서 principal 이 `--review-mode-recommendation` 으로 override 가능

#### `max_concurrent_lenses` (legacy top-level alias)
- 용도: lens 병렬 실행 상한. **P9.2 (2026-04-21) 이후 runtime resolver 는 본 top-level 필드 대신 `review.max_concurrent_lenses` (Axis C, 아래 §4.5 review block) 만 본다.** 본 필드는 `OntoConfig` 타입에 남아있으나 review session 의 batch dispatch 결정에는 영향 없음 (`src/core-runtime/review/artifact-types.ts` L497-500 의 resolution order 참조)
- 유효값: 양의 정수
- 기본값: 9 (9-lens 전체 병렬) — 본 필드만 두는 경우의 nominal default. 실제 default 는 review block 이 absent 일 때 topology catalog default 로 결정됨 (`execution-topology-resolver.ts`)
- 로컬 GPU 환경 권장: `1~3`. MLX 30B 단일 GPU 는 `1` 권장 (OOM 회피, 2026-04-17 세션 실증). 새 config 에서는 `review.max_concurrent_lenses` 로 적는 것이 canonical

#### `review:` — review execution axis block (canonical, P1 2026-04-20)

`review:` block 은 Review UX Redesign P1 (2026-04-20, PR #152) 에서 도입된 6 axes (A teamlead / B subagent / C concurrency / D auto host detection / E lens deliberation / F effort) 중 user-facing 인 A·B·C·E 를 노출하는 canonical surface 다. P1 이전의 `execution_topology_priority` 배열을 대체한다.

- 용도: review session 의 lens executor (subagent) + synthesize 단계 teamlead 를 명시적으로 선언
- 유효값: 아래 4 개 sub-key. 모두 optional
- 기본값: 미설정 시 universal fallback (teamlead=main / subagent=main-native / lens_deliberation=synthesizer-only / max_concurrent_lenses=topology default)
- Type 진실: `src/core-runtime/discovery/config-chain.ts` 의 `OntoReviewConfig` (L245-L252)
- Validator: `src/core-runtime/review/review-config-validator.ts`

##### `review.teamlead.model`
- 용도: 각 lens 결과를 모아 synthesize 단계를 수행하는 teamlead 역할의 model
- 유효값:
  - `"main"` — 현재 host session (Claude Code / Codex CLI) 의 main context 가 teamlead 를 겸함
  - `{ provider, model_id, effort? }` — 외부 model 지정. `provider` ∈ {`codex`, `anthropic`, `openai`, `litellm`}, `model_id` 필수, `effort` 는 thinking-capable provider 에서만 의미
- 기본값: `"main"`

##### `review.subagent`
- 용도: 각 lens 단위 (review unit) 를 실제로 실행하는 subagent 의 model. Discriminated union — `main-native` 분기와 외부 분기는 schema 가 다름
- 유효값:
  - `{ provider: "main-native" }` — host 가 제공하는 native subagent. Claude Code 에서는 Agent tool / Agent Teams, Codex CLI 에서는 자식 프로세스. `model_id` / `effort` 필드를 가질 수 없음 (validator 가 거부)
  - `{ provider, model_id, effort? }` — 외부 model 지정. `provider` ∈ {`codex`, `anthropic`, `openai`, `litellm`}, `model_id` 필수
- 기본값: `{ provider: "main-native" }`

##### `review.lens_deliberation`
- 용도: lens 간 deliberation 채널 선택 (Axis E)
- 유효값:
  - `synthesizer-only` — lens 가 독립 실행 후 synthesizer 가 종합 (표준 경로)
  - `sendmessage-a2a` — lens agent 들이 SendMessage 로 상호 deliberation 라운드 수행. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 환경 + `lens_agent_teams_mode: true` 의 double opt-in 필요 (`config-chain.ts` L165-L177 참조)
- 기본값: `synthesizer-only`

##### `review.max_concurrent_lenses` (canonical concurrency, Axis C)
- 용도: lens 병렬 실행 상한 user override
- 유효값: 양의 정수
- 기본값: 해당 topology 의 catalog default (`execution-topology-resolver.ts` 의 TOPOLOGY_CATALOG)
- Resolution order (`artifact-types.ts` L497-500): `review.max_concurrent_lenses` > topology catalog default. 0/음수 override 는 무시되고 catalog default 가 적용됨

##### `subagent_llm` 과의 관계 (§4.3 cross-reference)

`subagent_llm` (§4.3) 은 Phase 2 host-decoupling 시절 (sketch v3) 도입된 subagent LLM 지정 필드, `review.subagent` 는 P1 Review UX Redesign 의 canonical replacement 다. **둘 다 lens executor 의 model 을 지정하는 같은 axis 의 두 세대**.

- 새 config: `review.subagent` 만 사용 권장
- 두 필드 동시 존재 시: axis-first resolver (`execution-topology-resolver.ts:resolveAxisFirstTopology`) 가 `config.review` 가 있으면 그 block 으로 derive, 없으면 universal `main_native` degrade 경로로 fallback. 즉 `review:` block 이 한 번이라도 작성되면 `subagent_llm` 은 review session 결정에 더 이상 영향을 주지 않음 (단, `host_runtime: standalone` 의 ts_inline_http executor 결정 등 다른 경로에서는 여전히 소비됨)

##### Deprecated: `execution_topology_priority`
- 상태: P9.2 (PR-K, 2026-04-18) 에서 `OntoConfig` 타입에서 제거. P9.5 (PR #166, 2026-04-21) 에서 deprecation 모듈 (`legacy-field-deprecation.ts`) 도 삭제
- 현재 거동: silently inert. YAML 에 남아있어도 type-level consumer 가 없어 무시되며 warning 도 emit 안 됨
- Migration:
  - **자동**: `onto onboard --strip-legacy-priority` — legacy 필드를 제거하고 `review:` block 으로 동시 전환 (`.onto/processes/onboard.md:246-259` 참조)
  - **수동**: 본 §4.5 `review:` axis block 으로 옮김. 7 topology id → axis 매핑 (authoritative): `src/core-runtime/review/review-config-legacy-translate.ts` 의 `legacyTopologyIdToAxes`. 예: `codex-nested-subprocess` → `teamlead.model = { provider: codex, model_id: <user fill>, effort: <user fill> }` + `subagent = { provider: codex, model_id: <user fill>, effort: <user fill> }`

##### 사용 예시

```yaml
# 예시 1 — Claude Code 세션 + Codex CLI lens executor (codex-nested-subprocess 등가)
review:
  teamlead:
    model:
      provider: codex
      model_id: gpt-5.4
      effort: high
  subagent:
    provider: codex
    model_id: gpt-5.4
    effort: high

# 예시 2 — Claude Code 세션 + native subagent (cc-main-agent-subagent 등가)
review:
  teamlead:
    model: main
  subagent:
    provider: main-native
  max_concurrent_lenses: 6

# 예시 3 — A2A deliberation 활성화 (cc-teams-lens-agent-deliberation 등가)
lens_agent_teams_mode: true
review:
  teamlead:
    model: main
  subagent:
    provider: main-native
  lens_deliberation: sendmessage-a2a
```

### 4.6 Domain selection

#### `domains`
- 용도: 프로젝트에서 세션별 적용 가능한 도메인 unordered set
- 유효값: list<string>
- 세션별 선택: CLI `--domain {name}` 또는 `--no-domain`. 생략 시 auto-resolve (단일 등록 → 직접 적용; 다중 → TTY prompt 또는 fail-fast)

#### `domain` / `secondary_domains`
- 레거시 필드. 새 config 에서는 `domains:` 사용

### 4.7 Learning

#### `learning_extract_mode`
- 용도: review 종료 후 learning 추출 모드
- 유효값:
  - `disabled` (기본) — extractor 미실행
  - `shadow` — extractor 실행 + manifest 기록, live learnings 업데이트 안 함 (dry-run)
  - `active` — learnings/ 디렉토리 실제 업데이트
- Env override: `ONTO_LEARNING_EXTRACT_MODE`

### 4.8 Scan / listing 제한

#### `max_listing_depth` / `max_listing_entries` / `max_embed_lines`
- 용도: source 스캔 시 디렉토리 리스팅 깊이·엔트리·embed 라인 상한

#### `excluded_names`
- 용도: 특정 파일/폴더명 스캔 제외
- merge: home 과 project 간 union

### 4.9 Main LLM (standalone 전용, reserved)

#### `main_llm.provider` / `main_llm.model` / `main_llm.base_url` / `main_llm.max_tokens`
- 용도: `host_runtime: standalone` 에서 orchestration 용 main LLM. Phase 3-1 (PR #66) 으로 Step 1.5 Complexity Assessment 에서 실제 사용됨
- 기본값: 없음. 미설정 시 해당 기능 비활성

### 4.10 User extension namespace

#### `x-*` / `custom.*`
- 용도: user/tool 확장용. Runtime 이 경고 없이 ignore 하므로 integrator 가 자유롭게 annotate 가능
- 예시:
  ```yaml
  x-my-tool:
    setting: value
  custom:
    org_policy: ...
  ```

### 4.11 Reconstruct dogfood switches (P4 W-A-103, 2026-04-27)

<!-- runtime-mirror-of: step-4-integration §8.2 §8.3 + govern §14.6 -->

reconstruct activity 의 v1 (intent_inference + Hook α/γ/δ) 적용 여부를 제어하는 SDK-like dogfood 차단 스위치 3개. 본 onto 자기 적용 시점에는 모두 `enabled: true` (default v1 mode), 다른 product 가 v0 fallback 으로 사용하려면 `false` 로 설정.

#### `reconstruct.v1_inference.enabled`
- 용도: Hook α (Rationale Proposer) + Hook γ (Rationale Reviewer) + Hook δ (Phase 3 rationale rendering) 전체 enable/disable
- 기본값: `true`
- `false` 시: reconstruct runtime 은 v0 flow (rationale 없음) 동일. wip.yml `intent_inference` block 미작성, raw.yml 의 element-level intent_inference omit, Phase 3 rendering 의 Rationale column 비활성화

#### `reconstruct.phase3_rationale_review.enabled`
- 용도: Hook γ (Step 2c review) 만 enable/disable. Hook α / Hook δ 는 영향 없음
- 기본값: `true`
- `false` 시: Step 2c parallel dispatch 단계에서 2c (Reviewer) 만 skip. proposed element 의 review 없이 직접 Phase 3 진입
- **Dependency**: `v1_inference.enabled == false` 이면 본 switch 도 함께 false 여야 함 — `phase3_rationale_review_requires_v1_inference` invariant 위반 시 runtime 거부

#### `reconstruct.write_intent_inference_to_raw_yml.enabled`
- 용도: raw.yml `elements[].intent_inference` block 기록 여부
- 기본값: `true`
- `false` 시: 본 element-level block 을 raw.yml 에서 omit. wip.yml 단계에는 v1 mode 로 동작하지만 govern reader 는 v0 raw.yml 만 본다
- **Dependency**: `v1_inference.enabled == false` 이면 본 switch 도 함께 false 여야 함 — `write_intent_inference_to_raw_yml_requires_v1_inference` invariant 위반 시 runtime 거부

#### Default block (`.onto/config.yml` self-dogfood ON)
```yaml
reconstruct:
  v1_inference:
    enabled: true
  phase3_rationale_review:
    enabled: true
  write_intent_inference_to_raw_yml:
    enabled: true
```

#### v0 fallback block (다른 product 의 dogfood OFF)
```yaml
reconstruct:
  v1_inference:
    enabled: false
  phase3_rationale_review:
    enabled: false
  write_intent_inference_to_raw_yml:
    enabled: false
```

#### §14.6 invariant 4점 보존 검증

| invariant | 검증 |
|---|---|
| 1. dogfood off 가능 | 위 v0 fallback block 으로 reconstruct 가 v0 flow 동일 작동 |
| 2. 들어내기 용이 | switch + `src/core-runtime/reconstruct/` 디렉토리 삭제로 v0 복귀 |
| 3. govern reader 친화 | `manifest.yaml` + `raw.yml.meta` atomic write 보존 (W-A-94/97/100) |
| 4. 본질 sink ≠ dogfood sink | wip 본질 sink (Phase 0~3.5 lifecycle) ↔ raw mirror sink (govern audit) 분리 (W-A-100) |

Runtime impl: `src/core-runtime/reconstruct/dogfood-switches.ts` (loader + dependency invariant check). W-A-104 E2E smoke 가 4점 invariant 를 cycle 단위로 검증.

#### Review fix-up notes (PR #232 r1)

**(a) `{enabled: boolean}` wrapper shape rationale (conciseness lens)**:
- 각 switch 는 plain `boolean` 이 아닌 `{enabled: boolean}` object 로 표현. 의도된 future-extensibility — v1.1+ 에 per-switch metadata (예: `allowed_overrides`, `requires_confirmation`, `audit_log_seat`) 를 같은 object 안에 추가 가능
- plain boolean 으로 reduce 시 첫 metadata 추가에서 schema break 발생 → wrapper 는 SDK forward-compat seat

**(b) `write_intent_inference_to_raw_yml=false` 의 omit semantic (pragmatics lens)**:
- 본 switch 가 `false` 일 때 raw.yml 의 `elements[].intent_inference` block 은 omit
- govern reader 가 *v0 fallback* 과 *v1 mode 의 write 억제* 를 구별하는 path:
  - `meta.inference_mode == "none"` + `intent_inference` block 부재 → **v0 fallback** (Step 4 §4.3 omit semantic, full v0 path)
  - `meta.inference_mode ∈ {full, degraded}` + `intent_inference` block 부재 → **v1 mode 의 write 억제** (`write_intent_inference_to_raw_yml=false` 적용 결과 — wip 에는 v1 data 가 있지만 raw 에 미작성)
- 즉 두 case 의 distinction 은 `meta.inference_mode` field 가 single source. 별도 `omit_reason` field 는 추가하지 않음 (W-A-94 raw-meta-extended-schema 의 minimal-add 원칙 보존)

**(c) Silent default v1 semantic — RISK + migration window (evolution + axiology re-eval, r4 추가 강화)**:

> **본 PR scope 한정**: 현재 fall-through 는 helper layer 만 — production runtime 이 config 를 read 하지 않으므로 silent default 의 *runtime risk 는 wire commit 시점에 비로소 발현*. 본 PR 단계에서는 doc/spec 표면의 risk 만 존재. wire commit 진입 시 아래 backlog 가 우선순위 1 fix-up.

- `reconstruct:` config block 부재 시 loader 는 **default v1 mode ON** 으로 fall-through. 이는 dogfood self-application 자연성을 위한 의도된 silent default — 그러나 **v0 product 가 본 PR 머지 후 ontology binary 를 upgrade 시 silent v1 진입 risk** 가 존재 (wire 시점 발현)
- **명시적 권고 (v0 product / migration window)**:
  - 부재 의존 금지 — v0 product 는 위 v0 fallback block 을 `.onto/config.yml` 에 **explicit 선언 필수**
  - migration audit: govern reader 또는 dashboard 가 `meta.inference_mode` 분포를 monitor 해서 의도치 않은 v1 진입 detect
  - **wire commit 시 추가 권고 (v1.1 candidate)**: `loadReconstructDogfoodSwitches()` 가 부재 config 를 detect 시 console.warn 또는 session-log 에 `reconstruct_config_absent_default_v1_applied` 신호 emit — explicit silent-default audit log
- **v1.1 backlog (fail-explicit 전환)**: `reconstruct.config_required: bool` switch 도입 시 부재를 fail-explicit (`reconstruct_config_required` halt) 으로 전환 (migration window 종료 후). 본 PR 의 silent default 는 *transition seat* 으로만 유지 — wire commit 시 transition window 명시 필수

**(d) Production wiring gap — Helper-only scope (no production runtime effect yet, r2+r3+r4 강화)**:

> **CONTRACT (PR #232, 4 mirror seats 동일 sentence)**:
> - `.onto/config.yml` 의 `reconstruct:` block 은 **현재 reconstruct runtime 에서 read 되지 않는다** — helper / spec / test contract surface only
> - v1 mode 가 unconditional default — switch 가 `false` 여도 reconstruct runtime 은 v1 path 를 그대로 실행 (wire 부재)
> - Production wire (`.onto/config.yml` consumer + Hook gating switch consumption + dependency invariant rejection edge) 는 **별도 commit scope**

**4 mirror seats** (review 가 어느 surface 를 봐도 동일 contract):
1. `.onto/config.yml` reconstruct: block 위 CONTRACT comment
2. `src/core-runtime/reconstruct/dogfood-switches.ts` 파일 header CONTRACT block
3. `.onto/processes/configuration.md` §4.11 (d) (본 항목)
4. `src/core-runtime/reconstruct/INTEGRATION.md` W-A-104 row

- **현 stage helper layer caller**: `dogfood-switches.test.ts` (17 test) + `e2e-smoke.test.ts` (37 test) 두 test file 만. production reconstruct runtime caller 부재
- **W-A-104 mock dispatcher 의 의미**: production wire shape 의 *spec contract* 정의 (test = wiring shape spec). 실제 wire 는 동일 mock 형태의 dispatcher 를 *real codex spawn* 으로 교체하는 1:1 대응
- **실제 wire commit 의 scope** (별도 PR / Track B 다음 commit 묶음 또는 reconstruct v1 production 진입 시점): Coordinator class 신설 (또는 기존 Coordinator 의 reconstruct entry path 확장) + `.onto/config.yml` read at boot + dependency invariant rejection edge + Hook gating switch consumption

**(e) Partial-disable mode — first-class supported modes (coverage U6, r2 신규)**:

3 switch × 2 boolean = 8 조합 중 SDK 가 *정합* 으로 인정하는 mode:

| mode | v1_inference | phase3_rationale_review | write_intent_inference_to_raw_yml | use case |
|---|---|---|---|---|
| **full v1** (default, dogfood ON) | true | true | true | 본 onto 자기 적용 / 모든 v1 hook 활성 |
| **v1 without review** | true | false | true | Hook γ Reviewer 만 skip — Hook α (intent inference) + Hook δ (Phase 3 rendering) 활성, review 비용 절감 |
| **v1 wip-only** | true | true | false | wip.yml 단계만 v1, raw.yml 은 v0 schema 유지 (govern reader 가 v0 raw.yml 만 본다) |
| **v1 wip-only without review** | true | false | false | 위 두 partial 조합 — wip 만 v1, review skip |
| **full v0** (v0 fallback) | false | false | false | 다른 product 의 v0 mode |

3 invalid 조합 (dependency invariant violation, runtime reject):
- `v1_inference=false + phase3_rationale_review=true` → `phase3_rationale_review_requires_v1_inference`
- `v1_inference=false + write_intent_inference_to_raw_yml=true` → `write_intent_inference_to_raw_yml_requires_v1_inference`
- 위 두 violation 동시 발생 시 두 violation 모두 list 에 reject

본 5 mode 는 모두 *의도된 use case* — 그러나 본 PR 의 *behavioral lifecycle 검증* 은 **3 mode 만**:

- **`e2e-smoke.test.ts` 검증 scope**: Cycle 1 (full v1 happy path) + Cycle 2 (full v0 fallback) + Cycle 3 (3 dependency invariant reject case)
- **검증 미포함 (spec-only declaration, behavioral lifecycle 부재)**: partial-disable 3 mode — `v1 without review` / `v1 wip-only` / `v1 wip-only without review`. **본 PR 의 lifecycle/E2E test 가 이 3 mode 를 직접 검증하지 않는다** (helper-only contract surface)

**v1.1 backlog (partial mode lifecycle 검증)**: 3 partial mode 의 use case 가 정해지는 시점 (예: production 환경에서 review 비용 절감 mode 또는 v0 reader 와의 hybrid mode) 에 `e2e-smoke.test.ts` 에 cycle 3개 추가. 본 PR 단계에서는 *config schema spec + helper invariant* 만 declare, behavioral runtime 검증은 wire commit 또는 v1.1 cycle 추가 시점

## 5. 사용 예시 — 시나리오별 minimum config

### 5.1 Claude Code 세션 (권장 기본)

```yaml
output_language: ko
# host_runtime 생략 → CLAUDECODE=1 감지로 claude 자동 선택
# api_provider 생략 → cost-order (codex OAuth 또는 Anthropic API key 자동)
```

### 5.2 Codex CLI 구독

```yaml
output_language: ko
host_runtime: codex
codex:
  model: gpt-5-codex
  effort: xhigh
api_provider: codex
```

### 5.3 로컬 MLX (qwen3 30B)

```yaml
output_language: ko
host_runtime: standalone
subagent_llm:
  provider: litellm
  model: mlx-community/Qwen3-30B-A3B-Instruct-2507-4bit
  base_url: http://localhost:8080/v1
  max_tokens: 4096
  tool_mode: inline               # MLX qwen3 는 OpenAI tool-calling 미지원
max_concurrent_lenses: 1          # 로컬 단일 GPU OOM 회피
api_provider: litellm
llm_base_url: http://localhost:8080/v1
model: mlx-community/Qwen3-30B-A3B-Instruct-2507-4bit
```

### 5.4 LiteLLM proxy + 다중 provider

```yaml
output_language: en
host_runtime: litellm
llm_base_url: http://localhost:4000/v1
model: claude-opus-4-5           # proxy 가 이 문자열을 실제 provider 로 라우팅
api_provider: litellm
```

### 5.5 Mixed — Claude host + 저렴한 subagent

```yaml
output_language: ko
host_runtime: claude             # main session 은 Claude Code
subagent_llm:                    # lens 는 Anthropic Haiku 로 비용 절감
  provider: anthropic
  model: claude-haiku-4-5-20251001
  max_tokens: 4096
```

## 6. Validation 과 error-handling 정책

- **파일 없음** — 모든 key 기본값 적용. 런타임 정상 동작 (대부분의 경우 auto-resolution 이 host 를 찾음)
- **파일 있으나 malformed YAML** — parser 예외 → halt. 자세한 정책은 `.onto/processes/reconstruct.md` §"Build-time configuration"
- **유효한 YAML 이나 type-invalid 값** — warning `config_type_invalid` 로그 + 해당 key default 로 fallback
- **유효한 YAML 이나 out-of-range 값** — warning `config_out_of_range` 로그 + default fallback
- **알 수 없는 key** — `x-*` / `custom.*` 네임스페이스 외에는 warning `config_unknown_key_ignored`. 무시됨

## 7. 타 문서와의 경계

본 문서는 **key surface 의 SSOT** 이다. 다음 문서는 각자의 관심사에 한정하여 해당 key 를 언급하며, 정의/유효값/기본값 기술은 본 문서로 참조한다:

- `.onto/processes/reconstruct.md` §"Build-time configuration" — reconstruct 가 소비하는 key 집합 + reconstruct-specific error handling
- `.onto/processes/onboard.md` — config 생성 절차 (대화형 프롬프트)
- `.onto/commands/review.md` — review 관련 key 사용 방식 (CLI flag 와 config 의 관계)
- `README.md` — 첫 진입자용 요약·quickstart
- `CHANGELOG.md` — config 진화 이력

새 key 를 추가할 때는:
1. `config-chain.ts::OntoConfig` 에 field 추가 (type 진실)
2. 본 문서 §"Key reference" 에 subsection 추가
3. 기존에 해당 기능을 다루던 문서가 있다면 본 문서로의 참조만 남기기

## 8. 관련 참고

- Type 진실: `src/core-runtime/discovery/config-chain.ts` — 본 문서의 key 집합 변동 시 **가장 먼저** 확인해야 함
- Resolver 구현: `resolveConfigChain()` 같은 파일
- 출력 언어 경계 규범: `.onto/principles/output-language-boundary.md` (rank 4)
- LLM Provider Resolution Ladder: `README.md` §"LLM Provider Configuration"
