# Changelog

## Unreleased

### Added — Phase 2: ts_inline_http review unit executor (2026-04-17)

**Phase 2** of host runtime decoupling — TS process가 LLM HTTP endpoint (LiteLLM / Anthropic SDK / OpenAI SDK) 를 직접 호출하여 lens / synthesize 단위를 실행하는 새 executor 추가. host runtime 에 tool ecosystem 이 없는 standalone CLI 시나리오 또는 cross-host 조합 (Claude main + LiteLLM subagent 등) 의 subagent 경로 enable.

#### Added

- **`src/core-runtime/cli/inline-http-review-unit-executor.ts`** (CLI binary) — codex executor 와 동일 인터페이스 (project-root, session-root, unit-id, unit-kind, packet-path, output-path) + LLM 선택 flag (`--provider`, `--model`, `--llm-base-url`, `--reasoning-effort`, `--max-tokens`, `--embed-domain-docs`)
- **`src/core-runtime/review/inline-context-embedder.ts`** — Phase 2 inline content mode helper. packet 의 도메인 doc reference (`- Primary: <path>.md`) 를 inline 으로 expand. ONTO_PLUGIN_DIR fallback notation, 한국어 section label (기본/보조), 파일 truncation (default 500 lines) 지원
- **`package.json`** 신규 npm script: `review:inline-http-unit-executor`
- 단위 테스트 16건 (embedder 9 + executor 7), mock LLM provider branch 신규

#### Changed

- `ReviewExecutionRealization` 타입 확장: `"subagent" | "agent-teams"` → `"subagent" | "agent-teams" | "ts_inline_http"`
- `ReviewHostRuntime` 타입 확장: `"codex" | "claude" | "litellm"` → `"codex" | "claude" | "litellm" | "anthropic" | "openai" | "standalone"`
- `llm-caller.ts` mock provider: ts_inline_http executor system prompt 패턴 인식 + 결정적 lens-shaped markdown 반환

#### Design decisions

| 결정 | 선택 |
|---|---|
| Tool ecosystem 처리 | inline content mode (function-calling loop 는 Phase 3) |
| LLM provider 결정 경로 | `learning/shared/llm-caller.ts` cost-order ladder 재사용 (`resolveLearningProviderConfig` bridge) |
| Inline embedding default | opt-in (`--embed-domain-docs` flag) — 기본은 ref-only 보존 |
| `host_runtime` JSON 보고 값 | 사용자 지정 `--provider` 따름 (litellm/anthropic/openai/codex) — auto-resolution 시 anthropic fallback |

#### Phase 2 사용 예

**Standalone CLI 직접 실행** (mock):
```bash
ONTO_LLM_MOCK=1 npm run review:inline-http-unit-executor -- \
  --project-root . --session-root /tmp/sess --onto-home ~/.onto \
  --unit-id logic --unit-kind lens \
  --packet-path /tmp/sess/lens-logic.packet.md \
  --output-path /tmp/sess/round1/logic.md
```

**LiteLLM 8B 로컬 subagent**:
```bash
ANTHROPIC_API_KEY=sk-... LITELLM_BASE_URL=http://localhost:4000/v1 \
npm run review:inline-http-unit-executor -- \
  --project-root . --session-root /tmp/sess --onto-home ~/.onto \
  --unit-id structure --unit-kind lens \
  --packet-path /tmp/sess/lens-structure.packet.md \
  --output-path /tmp/sess/round1/structure.md \
  --provider litellm --model llama-8b --max-tokens 4096 \
  --embed-domain-docs
```

#### 다음 단계 (별도 PR 권장)

- Phase 2 wiring: `host_runtime: standalone` config 시 `run-review-prompt-execution.ts` 가 ts_inline_http executor 자동 선택
- Cross-host config schema: `.onto/config.yml` 에 `main_llm` + `subagent_llm` 분리 설정
- Phase 3 (선택): function-calling loop in TS — subagent 가 file read 등 tool 사용 가능

### Changed — Phase 1: Host runtime decoupling (2026-04-17)

**onto는 더 이상 "Claude Code plugin" 단일 호스트 도구가 아닌, "multi-host LLM-driven runtime"으로 재포지셔닝.** 3 host 환경 (Claude Code session, Codex CLI session, standalone CLI process) 을 동등하게 인식.

**Phase 1 scope** (이 PR): host detection + capability matrix + 2-axis (main LLM × subagent LLM) configuration schema + override mechanism + 문서/렉시콘 reframing. Phase 2 에서 standalone host 의 직접 LLM 호출 wiring 진행 예정.

#### Added

- **`src/core-runtime/discovery/host-detection.ts`** (canonical seat) — `detectHostRuntime()` + `detectHostCapabilities()` + 6단계 priority resolution
- **`src/core-runtime/discovery/plugin-path.ts`** — `resolvePluginPath()` + `ONTO_PLUGIN_DIR` env var 지원
- **`ONTO_HOST_RUNTIME`** env var (`claude` | `codex` | `standalone`) — host detection explicit override
- **`ONTO_PLUGIN_DIR`** env var — plugin install 경로 override (default: `~/.claude/plugins/onto`)
- 단위 테스트 신규 31건 (`host-detection.test.ts` 24건 + `plugin-path.test.ts` 5건 + 기타)
- Lexicon `provisional_terms` 신규 seed: `host_runtime_detection`, `main_subagent_llm_axis`

#### Changed

- 3 파일에 중복되어 있던 host detection 로직을 canonical seat 로 통합:
  - `src/core-runtime/cli/bootstrap-review-binding.ts` (line 50-62)
  - `src/core-runtime/cli/prepare-review-session.ts` (line 75-87)
  - `src/core-runtime/cli/review-invoke.ts` (line 377-395)
- README + BLUEPRINT 재포지셔닝: "Claude Code plugin" → "multi-host LLM-driven runtime" + Host Compatibility Matrix + Two-tier LLM model 추가
- 17 개 markdown 문서 (commands/*.md 7파일 + processes/*.md 3파일 + README + process.md + BLUEPRINT 등) 의 hardcoded `~/.claude/plugins/onto/` 표기 → `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/` fallback notation 으로 갱신
- `processes/review/execution-preparation-artifacts.md`: 예시 데이터 (literal absolute path) 보존 + canonical 표기 안내문 추가

#### Architecture decisions

| 결정 | 선택 |
|---|---|
| `unknown` host category | 도입 안 함 — 어떤 신호도 없으면 `standalone` default (TS process 가 valid use case) |
| Capability detection 분리 | host runtime 의존 (TeamCreate/AgentSpawn) vs 환경 독립 (Codex/Anthropic/OpenAI/LiteLLM) 두 부류 분리 |
| Subagent inline tool mode (Phase 2) | inline content mode 우선; function-calling loop 는 Phase 3 |
| Standalone main LLM 역할 (Phase 2) | TS process 가 별도 LLM 호출하여 lens 선택 + synthesize — 단순 dispatcher 가 아닌 main LLM 사용 |

#### Backward compatibility

- 기존 `host_runtime: claude|codex` config 값 그대로 인식
- 기존 detection 시그널 모두 유지 (`CLAUDECODE`, `CLAUDE_PROJECT_DIR`, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, `CODEX_THREAD_ID`, `CODEX_CI`)
- 기존 boolean predicate (`detectClaudeCodeHost()`, `detectCodexAvailable()`) — 시그너처 변경 없음, 내부만 위임
- `~/.claude/plugins/onto/` 경로는 `ONTO_PLUGIN_DIR` 미설정 시 default 로 유지

### Changed — Domain selection canonical syntax (2026-04-17)

**`--domain {name}` / `--no-domain` 을 canonical 도메인 selection 문법으로 도입.** Legacy 위치 인자 `@{domain}` / `@-` 도 backward compat 으로 계속 인식.

**문제**: Claude Code 가 `@filename` 을 컨텍스트 첨부 mention 문법으로 사용하므로, `/onto:review src/foo.ts @software-engineering` 같은 입력에서 `@software-engineering` 이 도메인 selector 가 아니라 "파일 mention 시도" 로 해석될 위험.

**해결**:
- `src/core-runtime/cli/review-invoke.ts` 파서에 `--domain` (option) + `--no-domain` (flag) 추가
- 우선순위: `--requested-domain-token` (internal) > `--no-domain` > `--domain {name}` > legacy `@{domain}` / `@-` positional
- `--domain` 과 `--no-domain` 동시 지정 시 parser layer 에서 fail-fast
- 내부 canonical 토큰 (`@{name}` / `@-`) 은 유지 — session artifact backward compat
- e2e tests E22a (`--no-domain`), E22b (`--domain {name}`), E22c (mutual exclusion fail) 추가, 모두 PASS

**문서 업데이트**: `commands/review.md`, `commands/reconstruct.md`, `commands/evolve.md`, `commands/help.md`, `processes/review/review.md`, `processes/review/interpretation-contract.md`, `processes/review/productized-live-path.md`, `README.md`, `BLUEPRINT.md` — canonical 우선 표기, legacy `@` 표기를 backward compat 으로 명시.

### Added — Session 18 (2026-04-16): 142/142 (100%) execution-phase completion

#### Activity name normalization

- `design` → `evolve` (활동명) — methodology terms (`design_target`, `design_area`, `design_constraint`, `design_gap`)와 디렉토리 경로(`design-principles/`)는 보존
- `build` → `reconstruct` (활동명) — `npm run build:ts-core` 등 toolchain 명령과 `legacy_aliases` 등재 내용은 보존
- 정본 정렬: `processes/reconstruct.md` 자체 선언("legacy `build` 토큰은 activity_enum.legacy_aliases에만 alias로 보존")과 본문 일치
- Lexicon `activity_enum.allowed_values`: `[review, evolve, reconstruct, learn, govern]`

#### Reconstruct confirm subcommand (W-B-07)

- `onto reconstruct confirm --session-id <id> --verdict passed|rejected` 신규
- `principal_review_status: pending → requested → passed|rejected` 상태 머신 완결
- `executeReconstructConfirm()` + 에러 가드 (비-converted 상태, 비-requested 상태, 잘못된 verdict 차단)
- 테스트 22/22 PASS (신규 10건 포함)
- `processes/reconstruct.md §1.4` 3축 중 "Principal 검증 경로" 런타임 구현 완료

#### CJK/Unicode tokenization rules in reconstruct (W-A-27)

- `processes/reconstruct.md §2 Tier 1`에 CJK/Unicode 처리 규칙 명시
- Unicode-aware splitting (`/[\p{L}\p{N}]+/gu`) — 기존 ASCII-only split 대체
- Latin 최소 토큰 길이 4, CJK 최소 2 (한글·한자·히라가나)
- CJK 문자 범위 명시 (U+3040–30FF, U+3130–318F, U+AC00–D7AF, U+4E00–9FFF)
- `panel-reviewer.ts:significantTokens()` 코드 구현과 일치 확인

#### Domain upgrades (4건)

| Domain | Before | After | Ratio |
|---|---|---|---|
| visual-design (W-B-48) | 57K | 184K | 3.2x |
| finance (W-B-47) | 46K | 128K | 2.8x |
| accounting (W-B-46) | 44K | 133K | 3.0x |
| market-intelligence (W-B-45) | 42K | 117K | 2.79x |

각 도메인 8파일 v2 확장: Normative System Classification (Tier-1a/1b/2/3), Cross-Cutting Concerns, Inter-Document Contract, CQ-ID 섹션 + P1/P2/P3 우선순위 + inference path + PASS/FAIL 기준, Required Relationships, Classification Criteria Design, SE Transfer Verification 추가. 글로벌 동기화 (`~/.onto/domains/{domain}/`) 완료.

#### Adaptive Light Review verification (W-B-51)

- 이미 구현 확인 — W-A-50 commit 33427df (shared-phenomenon §7 reverse application) 시점에 인프라 완성
- `processes/review/review.md §1.5 Complexity Assessment` (lines 99-160): Q2/Q3 cheap trigger + Principal 확인 절차
- `shared-phenomenon-contract.md §7 Reverse Application`: lens 선택 로직
- `interpretation-contract.md §4.7 lens_selection_plan`: output schema
- `review.md` Step 4 경량/전원 모드 분기 (lines 387-392), 세션 메타데이터 `review_mode: light | full`

#### Palantir 4th upgrade decision (W-B-49)

- 분석가 보고서 §10 수치 추가 반영 불필요로 결정
- Forrester TEI ROI 315%·Gartner MQ·IDC MarketScape positioning은 `domain_scope.md:383-385` Reference Standards에 이미 반영
- 달러 수치($345M/$83.2M)는 벤더 의뢰·조직 특정·시간 한정 데이터로 도메인 지식이 아님

### Progress

- 4축 모두 100% 완결: 축 A 76/76, 축 B 55/55, 축 C 8/8, 축 D 5/5
- §1 정본의 모든 W-ID 작업이 main에 통합됨 (PR #59 squash merged)

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

**Handoff JSON** (`onto review` 무명시 + Claude host 감지 시 emit). Plan-time 권장(`preferred_realization`)과 실제 realized truth(`actual_realization`)를 분리. actual은 deferred — 주체자가 TeamCreate 가용성에 따라 선택한 뒤 coordinator-state-machine이 session artifact에 기록:

```json
{
  "handoff": "coordinator-start",
  "host_runtime": "claude",
  "preferred_realization": "agent-teams",
  "actual_realization": "deferred_to_subject_session",
  "requested_target": "<target>",
  "request_text": "<intent>",
  "next_action": {
    "cli": "onto coordinator start \"<target>\" \"<intent>\"",
    "orchestration_guidance": {
      "preferred": "TeamCreate로 coordinator subagent를 nested spawn (canonical path = agent_teams_claude)",
      "fallback": "TeamCreate 비가용 환경에서는 주체자가 Agent tool 직접 사용 (canonical path = subagent_claude)",
      "recording_note": "주체자가 실제 선택한 realization은 coordinator-state-machine이 session artifact(binding.yaml 등)에 기록"
    }
  }
}
```

주체자(Claude Code 세션)는 이 JSON을 읽고 `onto coordinator start`를 호출하며, TeamCreate 가용성에 따라 nested/flat orchestration을 선택합니다. 최종 realization 값은 session artifact에 기록되어 downstream consumer가 "실제 어떤 경로로 실행됐는지" 정확히 answer 할 수 있습니다.

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
  - `LlmBillingMode` (subscription / per_token / variable — billing 속성 분류; 선호 순위는 resolver 정책 층이 관리)
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
