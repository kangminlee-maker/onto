# Changelog

## Unreleased

### Added

#### Review execution realization canonicalization & auto-resolution (stay-in-host)

`onto review`(플래그 무명시)가 이전엔 `"Claude runs use 'onto coordinator start'"` 에러를 던졌습니다. 이제 **host 감지 기반 auto-resolution**을 수행하고, 적절한 canonical path로 자동 라우팅합니다.

**세 canonical path** (`execution_realization × host_runtime` 2-axis 조합):

| Canonical path | Orchestrator | Context 비용 | Billing source |
|---|---|---|---|
| `agent_teams_claude` | coordinator subagent (TeamCreate로 spawn) | 메인 무소비 | Claude Code 구독 |
| `subagent_claude` (신규 wiring) | 주체자 메인 세션 (Agent tool 직접, TeamCreate 없음) | 메인 일부 소비(orchestration만; lens reasoning은 독립 subagent) | Claude Code 구독 |
| `subagent_codex` | codex CLI subprocess | 메인 무소비 | chatgpt 구독 또는 API-key |

**Auto-resolution (stay-in-host 정책)**:
- `--codex` flag 또는 `--prepare-only` → `subagent_codex` path (self 실행)
- `host_runtime: claude` config 또는 `CLAUDECODE=1` 감지 → `coordinator-start` handoff JSON emit
- codex binary + `~/.codex/auth.json` 감지 → codex path
- 둘 다 없음 → fail-fast with host-setup guidance
- `host_runtime: codex` config → codex path 강제

**Handoff JSON** (`onto review` 무명시 + Claude host 감지 시 emit):

```json
{
  "handoff": "coordinator-start",
  "execution_realization": "agent-teams",
  "host_runtime": "claude",
  "requested_target": "<target>",
  "request_text": "<intent>",
  "next_action": {
    "cli": "onto coordinator start \"<target>\" \"<intent>\"",
    "orchestration_guidance": {
      "preferred": "TeamCreate로 coordinator subagent를 nested spawn (canonical path = agent_teams_claude)",
      "fallback": "TeamCreate 비가용 환경에서는 주체자가 Agent tool 직접 사용 (canonical path = subagent_claude)"
    }
  }
}
```

주체자(Claude Code 세션)는 이 JSON을 읽고 `onto coordinator start`를 호출하며, TeamCreate 가용성에 따라 nested/flat orchestration을 선택합니다.

**타입 확장점**: `ReviewHostRuntime`에 `"litellm"` 추가 (forward-compat slot). `subagent_litellm` wiring은 후속 PR.

**Authority 신규 등재**: `authority/core-lexicon.yaml`에 `LlmAgentSpawnRealization` entry 추가 — 세 canonical 조합의 `orchestration_locus`, `context_cost`, `billing_source` 속성을 rank-1에 박제 (priority rank는 사용자 상황 의존적이므로 고정하지 않음).

### Changed

#### Authority: `LlmBillingMode.cost_order_rank` 제거

기존 `LlmBillingMode` entry에서 `cost_order_rank` attribute를 제거했습니다. 이유: ranking은 사용자 상황(보유 구독·API 예산·context 여유·로컬 하드웨어 등)에 따라 달라지므로 authority rank-1에 고정하는 것이 부적절. 기본 정책(stay-in-host 등)은 resolver 정책 층에서 관리하고, 사용자는 `api_provider` config·`--codex` flag·`host_runtime` config 등 명시적 override로 조정합니다. `LlmAgentSpawnRealization`도 같은 원칙(rank 없음)으로 등재.

### Breaking changes

#### `onto review` 에러 메시지 변경

- 이전: 플래그 무명시 + Claude host 세션 → `"Unsupported --executor-realization: ... Claude runs use 'onto coordinator start' (Agent Teams nested spawn)."`
- 신규: 플래그 무명시 + Claude host 감지 → coordinator-start handoff JSON emit (에러 아님, stdout JSON + exit 0)
- 플래그 무명시 + 어떤 host도 감지 안 됨 → 명시적 fail-fast with 4가지 해결 경로 가이드

기존 스크립트가 에러 exit code에 의존했다면 영향. 정상 경로를 원했던 사용자에겐 개선.

#### Background task LLM provider resolution — cost-order ladder + explicit model required

Learn / govern / promote 등 background task의 LLM 호출 경로가 **cost-order 기반 provider 해소**로 재설계되었습니다. 기존 하드코딩된 기본 모델(`DEFAULT_ANTHROPIC_MODEL`, `DEFAULT_OPENAI_MODEL`)은 완전히 제거되었습니다.

**이전 동작 (broken in some cases)**:
- `ANTHROPIC_API_KEY` → `OPENAI_API_KEY` → `~/.codex/auth.json`의 `OPENAI_API_KEY` 필드 순으로 해소.
- 모델은 암묵적으로 `claude-sonnet-4-20250514` 또는 `gpt-4o-mini` 자동 사용.
- chatgpt OAuth 모드는 "not supported" 에러로 fail-fast.

**신규 동작**:
- Cost-order 6단계 ladder (caller-explicit → config-explicit → codex OAuth → LiteLLM → Anthropic → OpenAI per-token).
- 모델은 사용자가 명시해야 함. anthropic / openai / litellm 경로에서 모델 미지정 시 fail-fast. codex는 CLI가 자체 default 선택.
- chatgpt OAuth는 **cost-order 최상위 공식 경로**로 승격.

#### 영향을 받는 사용자 시나리오

| 사용자 상태 | 변경 전 | 변경 후 | 조치 필요 |
|---|---|---|---|
| `ANTHROPIC_API_KEY`만 set, `.onto/config.yml`에 model 없음 | anthropic + `claude-sonnet-4-20250514` 자동 | **fail-fast (missing-model)** | `.onto/config.yml`에 `model: claude-sonnet-4-20250514` 또는 `anthropic: { model: ... }` 추가 |
| `OPENAI_API_KEY`만 set, model 없음 | openai + `gpt-4o-mini` 자동 | **fail-fast (missing-model)** | `.onto/config.yml`에 `model: gpt-4o-mini` 또는 `openai: { model: ... }` 추가 |
| `~/.codex/auth.json` chatgpt OAuth + codex 바이너리 | "not supported" 에러 | **codex CLI OAuth 경로로 자동 전환** (호출당 한계비용 0) | 없음 (의도된 개선) |
| chatgpt OAuth + `ANTHROPIC_API_KEY` 공존 | anthropic 사용 | **codex로 자동 전환 + 세션당 1회 STDERR 전환 안내** | Anthropic 유지하려면 `api_provider: anthropic` 명시 |
| chatgpt OAuth 있으나 codex 바이너리 없음, 다른 key 있음 | "not supported" 에러 | **다음 cost-order 경로로 폴백 + 설치 안내** | codex 설치 권장 (구독제 경로 활성화) |
| `~/.codex/auth.json`의 `OPENAI_API_KEY` 필드만 (API-key 모드) | openai 폴백 | openai 폴백 (priority 6 sub-resolution) | 없음 |

#### 신규 설정 위치 (모든 provider 대칭)

```yaml
# .onto/config.yml

# provider 결정 (생략 시 cost-order auto-resolution)
api_provider: anthropic  # or "openai" | "litellm" | "codex"

# per-provider 모델 — 해당 provider가 선택되면 자동 적용 (auto-resolution 포함).
# api_provider가 명시되지 않아도, cost-order가 해당 provider를 고르면 이 값이 쓰임.
anthropic: { model: claude-sonnet-4-20250514 }
openai:    { model: gpt-4o }
codex:     { model: gpt-5-codex, effort: medium }
litellm:   { model: claude-sonnet-local }

# top-level fallback — per-provider를 설정하지 않은 provider가 선택됐을 때
model: claude-sonnet-4-20250514

# LiteLLM endpoint (api_provider=litellm 시 필수)
llm_base_url: http://localhost:4000/v1

# codex 설치 안내 opt-out (OAuth 있고 바이너리 없을 때의 STDERR 알림 끔)
suppress_codex_install_notice: false
```

**모델 해소 순서** (각 provider의 dispatch 시점):

1. 호출부의 `LlmCallConfig.model_id` (runtime override)
2. `OntoConfig.{provider}.model` (per-provider 설정)
3. `OntoConfig.model` (top-level fallback)
4. → api-key 경로(anthropic/openai/litellm)는 여기서 fail-fast. codex는 CLI가 자체 default 선택.

#### 환경변수 (CLI·임시 override용)

- `LITELLM_BASE_URL` — 세션 동안 litellm endpoint override
- `LITELLM_API_KEY` — LiteLLM 프록시 auth (프록시가 검증하는 경우)
- `ONTO_SUPPRESS_COST_ORDER_NOTICE=1` — B1 전환 안내 STDERR 로그 끔
- `ONTO_LLM_MOCK=1` — (기존 유지) in-process mock provider, CI·테스트용

### Added

- `authority/core-lexicon.yaml`:
  - `LlmCompatibleProxy` (LiteLLM 등 OpenAI-compatible 프록시 개념)
  - `LlmBillingMode` (subscription / per_token / variable — cost-order의 의미론적 근거)
- `OntoConfig`:
  - `llm_base_url?: string`
  - `suppress_codex_install_notice?: boolean`
  - `anthropic?: { model?: string }`
  - `openai?: { model?: string }`
  - `litellm?: { model?: string }`
- `LlmCallConfig`:
  - `provider` enum에 `"litellm"`, `"codex"` 추가
  - `base_url?: string`
  - `reasoning_effort?: string` (codex 전용)
- `LlmCallResult`:
  - `effective_base_url?: string` (audit trail)
  - `declared_billing_mode?: "subscription" | "per_token"` (선언적 분류, 실측 아님)
- 신규 함수:
  - `resolveLearningProviderConfig` — OntoConfig + CLI overrides → `Partial<LlmCallConfig>` 브리지
  - `callCodexCli` — codex exec subprocess spawn (단일-턴, `--ephemeral`)

### Changed

- `resolveProvider` 완전 재작성: 6단계 cost-order. 명시적 provider (`"anthropic"`/`"openai"`)는 credential 부재 시 fail-fast (이전: 조용히 다음 경로로 폴백).
- 기존 chatgpt OAuth "not supported" 에러 문구 삭제 — OAuth는 이제 공식 경로.

### Design record

- `development-records/plan/20260415-litellm-provider-design.md` — 결정표(D1~D13), 실측 검증, 테스트 전략, 롤아웃 계획.
