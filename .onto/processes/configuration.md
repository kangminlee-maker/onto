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
- 용도: 개발자·이용자가 읽는 최종 텍스트의 언어. **내부 agent 프롬프트·artifact 는 English 고정** (`design-principles/output-language-boundary.md` 참조)
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

#### `max_concurrent_lenses`
- 용도: lens 병렬 실행 상한
- 유효값: 양의 정수
- 기본값: 9 (9-lens 전체 병렬)
- 로컬 GPU 환경 권장: `1~3`. MLX 30B 단일 GPU 는 `1` 권장 (OOM 회피, 2026-04-17 세션 실증)

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
- 출력 언어 경계 규범: `design-principles/output-language-boundary.md` (rank 4)
- LLM Provider Resolution Ladder: `README.md` §"LLM Provider Configuration"
