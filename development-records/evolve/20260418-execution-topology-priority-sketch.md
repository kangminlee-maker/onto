---
as_of: 2026-04-18
status: design-sketch
functional_area: execution-topology-priority-ladder
revision_history:
  - "2026-04-18: initial sketch (topology 축 도입, 10 옵션 catalog, config.yml 스키마, sketch v2 의 Transport 축 재배치)"
purpose: |
  Review 실행을 "Topology 축" (teamlead 위치 + lens spawn 방식 + deliberation 채널)
  기준으로 우선순위화하는 단일 ladder 를 설계. 2026-04-18 주체자 피드백
  ("구조적으로 훨씬 단순했으면 좋겠어") 에서 제시된 10 옵션을 canonical
  catalog 로 확정하고, sketch v2 의 Separation Rank (S0~S3) Transport 축을
  Topology 옵션의 파생 속성으로 격하. 현재 PR-1 (PR #96) 의 `resolveExecutionPlan`
  과 별도 경로로 존재하는 `resolveExecutorConfig` (executor binary selection
  Layer 3) 를 이번 설계로 통합.
authority_stance: non-authoritative-design-surface
canonicality: scaffolding
source_refs:
  sister_sketch_v2: "development-records/evolve/20260417-context-separation-ladder-design-sketch.md (Transport 축 S0~S3, PR #94 merged)"
  pr_96_execution_plan_resolver: "src/core-runtime/review/execution-plan-resolver.ts (2026-04-18)"
  pr_96_config_profile: "src/core-runtime/discovery/config-profile.ts (2026-04-18)"
  layer3_divergence_evidence: "src/core-runtime/cli/review-invoke.ts:718-731 resolveExecutorConfig"
  principal_input_20260418: "2026-04-18 세션, '구조적으로 훨씬 단순했으면 좋겠어' + 10 옵션 catalog 확정"
---

# Execution Topology Priority — Design Sketch (2026-04-18)

> **Status**: sketch. Implementation 은 sketch v3 merge 이후 후속 PR. 본 문서는 설계 합의용.

## 1. 문제 정의

### 1.1 기존 구조의 혼재 — Transport 와 Topology 의 얽힘

Sketch v2 (PR #94) 는 LLM 도달 채널을 **Separation Rank (S0~S3)** 로 정렬해 "어떤 channel 로 LLM 에 닿는가" 를 단일화했습니다:

- S0: Subprocess (codex CLI)
- S1: External HTTP API (Anthropic / OpenAI / LiteLLM)
- S2: Host nested spawn (Claude Code agent-teams)
- S3: In-process mock

이 축은 **Transport 축** 입니다 — "LLM 호출 네트워크/프로세스 경로" 만 분류.

그러나 review 에는 별도의 결정이 있습니다:

- **Teamlead 가 어디 있는가?** — 메인 컨텍스트 vs TeamCreate team vs codex subagent
- **Lens 가 어떻게 spawn 되는가?** — Claude Agent tool vs codex CLI subprocess (`child_process.spawn("codex exec")`) vs TeamCreate team member vs LiteLLM HTTP session vs nested codex subprocess
- **Deliberation 이 가능한가?** — SendMessage (team 내부) vs synthesizer 단계만

이 셋이 합쳐진 **Topology 축** 이 Transport 보다 상위 결정입니다. 예: 같은 Claude Code host 에서도 topology 가 (teamlead=TeamCreate) × (lens=Claude Agent tool) 인 경우와 (teamlead=onto TS main) × (lens=codex CLI subprocess) 인 경우가 근본적으로 다른 실행 구조. Transport 로는 둘 다 "S2 nested" 로 뭉뚱그려지지만 Topology 는 구별해야 합니다.

### 1.2 PR-1 이 남긴 Layer 3 divergence

PR-1 (PR #96) 은 `resolveExecutionProfile` 과 `resolveProvider` 두 layer 를 `resolveExecutionPlan` 으로 통합했지만, **`resolveExecutorConfig`** (review-invoke.ts:718-731) 는 여전히 `OntoConfig.host_runtime` 을 독립적으로 읽어 executor binary 를 선택합니다:

```ts
if (
  (subagentLlm && typeof subagentLlm.provider === "string") ||
  hostRuntime === "standalone" ||
  hostRuntime === "litellm" ||
  hostRuntime === "anthropic" ||
  hostRuntime === "openai"
) {
  return buildExecutorConfigFromRealization("ts_inline_http", ontoHome);
}
return buildExecutorConfigFromRealization("codex", ontoHome);
```

증거 (2026-04-18 `--codex` 플래그 review 실행):

- `resolveExecutionPlan` 은 `P1 explicit-codex: matched` 로 codex plan 반환
- 하지만 `resolveExecutorConfig` 는 `host_runtime: anthropic` (config 에서) 을 읽어 `ts_inline_http` executor spawn
- 결과: inline-http executor × 4 → 각자 callLlm cost-order fallback → codex subprocess × 4 (2-hop chain)

이것은 Topology 축이 하나의 resolver 에 표현되지 않기 때문에 생기는 구조적 결함. Topology 가 "어떤 executor binary 를 어떤 방식으로 spawn 할지" 를 함께 결정해야 합니다.

### 1.3 재설계의 원칙

> 구조적으로 훨씬 단순했으면 좋겠어 — 주체자 피드백, 2026-04-18

**원칙 확정**:

1. **단일 ladder** — Topology 가 "어느 옵션 하나를 고른다". 선택 후에는 teamlead 위치, lens spawn 방식, executor binary, max_concurrent, deliberation 채널, Transport rank 모두 정적으로 결정.
2. **Principal 순서 제어** — config.yml 배열로 우선순위 명시. 필요조건 충족하는 첫 옵션 채택.
3. **감지 기반 자동 resolution** — env 변수 / filesystem / config 신호만으로 필요조건 판정. Runtime LLM 호출 없이 결정.
4. **Transport 는 Topology 의 파생 속성** — Topology 옵션이 결정되면 Transport rank (S0~S3) 는 자동 따라옴. Sketch v2 의 S0~S3 개념은 유지하되 축으로 승격되지 않고 옵션 속성으로 격하.

## 2. Axiom — Topology 축 vs Transport 축

| 축 | 결정하는 것 | 예 | Rank 값 |
|---|---|---|---|
| **Topology** (상위) | Teamlead 위치 + Lens spawn 방식 + Deliberation 채널 + 필요조건 | "TeamCreate teamlead + Claude Agent tool lens" vs "onto TS main + codex CLI subprocess lens" | 10 옵션 ID (후술) |
| **Transport** (하위, sketch v2) | 각 lens 의 LLM 호출 경로 | HTTP vs Subprocess vs Host-nested | S0 / S1 / S2 / S3 |

**Axiom**: Topology 가 1개 선택되면 Transport 는 옵션별로 고정. Principal 이 직접 Transport 를 설정할 수 없음 — Topology 를 바꿔야 함.

이유: Transport 를 독립 축으로 둘 수 있다고 가정하면, 예컨대 "TeamCreate teamlead + S1 HTTP lens" 같은 hybrid 가 의미 있는지 매번 판정해야 합니다. 실제로는 각 Topology 옵션은 Transport 를 암묵적으로 결정하므로 독립 축으로 두면 무의미한 조합 공간이 열립니다.

**Lens 독립성의 위치** (sketch v2 §1.1.1 의 epistemic independence axiom 계승):

- **Epistemic independence** (판단의 독립) — 옵션 1-0 에서만 lens agent 가 실행 후 살아남아 `SendMessage` 로 서로 대화. 나머지 10 옵션은 lens agent 가 실행 직후 종료되어 synthesizer 단계에서만 교차. Lens 는 기본적으로 packet-to-packet 독립 판단.
- **Execution consistency** (실행 맥락의 공유) — Topology 옵션이 결정되면 모든 lens 가 동일 executor binary + 동일 max_concurrent 규약 공유.

## 3. 10 옵션 Canonical Catalog

**용어 정의**:
- "codex CLI subprocess" — `child_process.spawn("codex", ["exec", ...])` 직접 호출. onto 의 `callCodexCli` (llm-caller.ts) 가 현재 사용하는 방식. 실행 조건은 **`codex` 바이너리 PATH 상 존재 + `~/.codex/auth.json` 자격** 뿐.
- "Claude Agent tool" — Claude Code 의 `Agent` 툴로 일회성 subagent spawn (return-only 응답).
- "TeamCreate member" — Claude Code 의 `TeamCreate` 로 팀의 지속 member 생성 (A2A `SendMessage` 가능).
- "LiteLLM HTTP session" — onto TS 프로세스가 LiteLLM 프록시에 HTTP 호출 (프로세스 내부).

| # | ID | Host 환경 | Teamlead | Lens spawn | Deliberation | max_concurrent | Transport Rank | 필요조건 (AND) |
|---|---|---|---|---|---|---|---|---|
| 1-0 | `cc-teams-lens-agent-deliberation` | Claude Code | TeamCreate team | TeamCreate member (lens 당 1 agent, persistent) | **SendMessage (기존 lens agent 간)** | 10 | S2 | `CLAUDECODE=1` + `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (env) + config `lens_agent_teams_mode: true` |
| 1-1 | `cc-teams-agent-subagent` | Claude Code | TeamCreate team | Claude Agent tool | synthesizer | 10 | S2 | `CLAUDECODE=1` + `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` |
| 1-2 | `cc-teams-codex-subprocess` | Claude Code | TeamCreate team | codex CLI subprocess | synthesizer | 5 | S0 per lens | `CLAUDECODE=1` + `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` + codex 바이너리 + `~/.codex/auth.json` |
| 2-1 | `cc-main-agent-subagent` | Claude Code | **onto TS main** | Claude Agent tool | synthesizer | 10 | S2 | `CLAUDECODE=1` |
| 2-2 | `cc-main-codex-subprocess` | Claude Code | **onto TS main** | codex CLI subprocess | synthesizer | 5 | S0 per lens | `CLAUDECODE=1` + codex 바이너리 + `~/.codex/auth.json` |
| 3-1 | `cc-teams-litellm-sessions` | Claude Code | TeamCreate team | LiteLLM HTTP session | synthesizer | 1 | S1 | `CLAUDECODE=1` + `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` + LiteLLM 서버 접근 가능 |
| codex-A | `codex-nested-subprocess` (통합: 구 1-3 + codex-1) | Claude Code **또는** Codex CLI 세션 | codex CLI subprocess (outer, teamlead 역할) | nested codex CLI subprocess (outer 가 shell 로 spawn) | synthesizer | 5 | S0 full stack | 어느 host 든 codex 바이너리 + `~/.codex/auth.json` + non-seatbelt 실행 환경 |
| codex-B | `codex-main-subprocess` | Codex CLI 세션 | **onto TS main** (codex host 안에서 실행) | codex CLI subprocess | synthesizer | 5 | S0 per lens | Codex CLI 세션 signal 감지 + codex 바이너리 + `~/.codex/auth.json` |
| generic-1 | `generic-nested-subagent` | Other LLM | Host subagent (teamlead) | Nested subagent | synthesizer | TBD (실측 후 확정) | depends on host | Host LLM 이 nested subagent spawn 지원 (principal config 선언) |
| generic-2 | `generic-main-subagent` | Other LLM | **onto TS main** | Host subagent | synthesizer | TBD | depends | Host LLM 이 단일 레벨 subagent 지원 |

**설계 단순화 노트**: Codex nested subprocess 토폴로지는 Claude Code 호스트 / Codex CLI 호스트 어느 쪽에서 실행되든 **런타임 구조 동일** ("첫 codex CLI subprocess = teamlead, 그 subprocess 가 shell 로 lens 당 nested codex spawn"). 따라서 outer host 구분은 감지 단계 시그널로만 기록하고 옵션 catalog 는 `codex-A: codex-nested-subprocess` 하나로 통합.

### 3.1 Topology 별 상세 서술

#### 1-0 `cc-teams-lens-agent-deliberation` (유일한 lens 간 deliberation 옵션)

메인 Claude 컨텍스트가 `TeamCreate` 로 **teamlead agent** 를 spawn. Teamlead 가 `TeamCreate` member 로 **lens 당 agent 1명** 을 spawn (logic agent, pragmatics agent, axiology agent, …). 각 lens agent 는 자기 lens 실행을 마친 **후에도 종료되지 않고 살아 있음** — `TeamCreate` member 는 지속적 lifecycle 이므로. Synthesize 직전에 teamlead 가 lens agent 들 간 `SendMessage` A2A 로 **lens 간 deliberation** (서로의 결과를 보고 반박/보완) 을 명령. Deliberation 완료 후 최종 lens 출력이 synthesize 로 전달.

**핵심 차별점**: 다른 10 옵션은 lens 실행 직후 agent 가 종료되어 lens 간 직접 대화 불가 (synthesizer 단계에서만 교차). 1-0 은 **lens agent 가 살아 있는 상태에서 서로 대화** 가 가능한 유일한 옵션.

**장점**: Lens 간 cross-checking. 단일 LLM 응답의 고립 한계 완화.
**단점**: Claude Code 구독의 2차 opt-in 필요 (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` + `lens_agent_teams_mode: true`). Lens agent 가 deliberation 단계까지 메모리를 점유.
**Deliberation**: 기존 lens agent 간 `SendMessage` (**추가 agent 생성 없음**). Synthesizer 는 deliberation 결과를 받아 최종 종합.

#### 1-1 `cc-teams-agent-subagent`

메인이 `TeamCreate` teamlead 하나 spawn → teamlead 가 **Agent tool** 로 lens 마다 subagent 1명씩 spawn. 각 lens subagent 는 독립. Synthesizer 가 종합.

#### 1-2 `cc-teams-codex-subprocess`

onto TS main 이 `TeamCreate` teamlead 를 spawn → teamlead 가 shell 로 `codex exec` subprocess 를 lens 당 1개씩 spawn (onto 내 `callCodexCli` 패턴과 동일). Teamlead 는 Claude 기반이지만 lens 는 codex CLI subprocess. 모델 혼재 (Claude + GPT) 가능.

#### 2-1 `cc-main-agent-subagent`

TeamCreate 없이 **onto TS main 이 teamlead** 역할 (onto runner 가 직접 orchestration). Claude Agent tool 로 lens subagent spawn. 가장 흔한 "기본 Claude Code 환경" 옵션.

#### 2-2 `cc-main-codex-subprocess`

onto TS main 이 teamlead → lens 만 `child_process.spawn("codex", ["exec", ...])` 으로 spawn. 현재 onto 의 `callCodexCli` 경로와 구조 동일.

#### 3-1 `cc-teams-litellm-sessions`

`TeamCreate` teamlead → 각 lens 는 별도 HTTP 세션으로 LiteLLM 프록시 호출 (로컬 MLX 모델 등). Max_concurrent=1 (LiteLLM 프록시 단일 큐 가정).

#### codex-A `codex-nested-subprocess` (host-agnostic)

onto 가 (Claude Code 또는 Codex CLI 세션에서) 실행될 때. onto TS main 이 `codex exec` subprocess 하나를 teamlead 로 spawn. 그 teamlead codex 프로세스가 자체 shell 로 lens 당 nested `codex exec` subprocess 를 spawn. 전체 lens 실행이 codex 공간에서 이뤄짐 (onto 는 bootstrap + 최종 synthesize 만 담당).

**§9 실측 검증**: 2026-04-18 직접 호출로 nested spawn 정상 작동 확인 (outer/inner 세션 ID 독립, sandbox `danger-full-access` 기준).

#### codex-B `codex-main-subprocess`

onto 가 Codex CLI 세션 안에서 실행 중일 때. 최상위 codex 세션은 user 가 있는 환경이고, 그 안에서 onto 가 `tsx` subprocess 로 실행됨. onto TS main 이 teamlead 로서 직접 `codex exec` lens subprocess 를 spawn. codex-A 대비 "중간 teamlead codex layer" 가 없음 (onto 가 teamlead 자체).

#### generic-1 / generic-2

Claude Code / Codex 가 아닌 LLM 호스트 (미래 확장). Host 가 자체 subagent spawn 메커니즘을 제공. Nested spawn 지원 여부로 둘 중 하나 선택.

## 4. 감지 로직 (필요조건 판정 시그널)

**Claude Code 환경**:
- `process.env.CLAUDECODE === "1"`

**Claude Code 계정 폴더 경로** (`.claude-1/`, `.claude-2/` 멀티 계정 대응):
- `process.env.CLAUDE_CONFIG_DIR` (우선), 없으면 `${process.env.HOME}/.claude`

**Experimental Agent Teams flag**:
- `process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1"` (Claude Code CLI 가 settings.json 의 env 블록을 프로세스 env 로 주입)

**Lens Agent Teams Mode**:
- `.onto/config.yml` 의 `lens_agent_teams_mode: true` (신규 필드, 2026-04-18 신설)

**Codex CLI 바이너리 + 자격**:
- `detectCodexBinaryAvailable()` (기존 seat, discovery/host-detection.ts): `~/.codex/auth.json` 존재 + `codex` binary on PATH
- 이 하나의 조건이 codex 관련 모든 옵션 (`cc-teams-codex-subprocess`, `cc-main-codex-subprocess`, `codex-nested-subprocess`, `codex-main-subprocess`) 의 필요조건. `codex` 바이너리 배포 경로는 무관하며 PATH 탐색만으로 충분.

**Codex CLI 세션 (host)**:
- `process.env.CODEX_SESSION_ID` 등 codex 세션 시그널 (확인 필요; TBD)

**LiteLLM 서버 접근**:
- `config.llm_base_url` 또는 `process.env.LITELLM_BASE_URL` 설정됨
- (Optional) 실제 health-check ping 은 옵션. 초기 구현은 설정 존재만 판정.

**Nested spawn 가능 여부 (generic)**:
- TBD — host LLM 이 subagent-of-subagent 지원 선언 방식 확정 필요. 초기에는 `generic_nested_spawn_supported: true` config 필드로 principal 직접 선언 권장.

## 5. Config.yml 스키마

```yaml
# .onto/config.yml

# ============================================================================
# Execution Topology Priority (2026-04-18, sketch v3)
# ============================================================================
#
# Review 실행 시 아래 리스트를 위에서부터 확인하여 **필요조건이 충족되는
# 첫 옵션** 을 채택합니다. 순서 변경은 배열 재정렬로 제어합니다.
# 특정 옵션만 쓰고 싶으면 나머지를 주석 처리하거나 제거하세요.
# 배열이 없으면 내장 기본 우선순위가 적용됩니다.

execution_topology_priority:

  # ── 1. Claude Code 세션 내 실행 ──────────────────────────────────────────

  # [1-0] TeamCreate teamlead → TeamCreate member (lens agent) → lens 간 SendMessage
  #   필요조건: Claude Code 세션 (CLAUDECODE=1)
  #           + ~/.claude*/settings.json 의 CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
  #           + 이 config 의 lens_agent_teams_mode: true
  #   max_concurrent_lenses: 10
  #   Deliberation: 기존 lens agent 들 간 SendMessage (추가 agent 생성 없음).
  #                 10 옵션 중 lens 간 직접 대화 가능한 유일한 옵션.
  #   Transport: S2 (host nested spawn)
  - cc-teams-lens-agent-deliberation

  # [1-1] TeamCreate teamlead → Agent tool lens subagent
  #   필요조건: CLAUDECODE=1 + CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
  #   max_concurrent_lenses: 10
  #   Transport: S2
  - cc-teams-agent-subagent

  # [1-2] TeamCreate teamlead → codex CLI subprocess per lens
  #   필요조건: CLAUDECODE=1 + CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
  #           + codex 바이너리 PATH + ~/.codex/auth.json
  #   max_concurrent_lenses: 5
  #   Transport: S0 per lens (codex subprocess)
  - cc-teams-codex-subprocess

  # [2-1] onto TS main = teamlead, Claude Agent tool 로 lens subagent
  #   필요조건: CLAUDECODE=1 (experimental teams 불필요)
  #   max_concurrent_lenses: 10
  #   Transport: S2
  - cc-main-agent-subagent

  # [2-2] onto TS main = teamlead, codex CLI subprocess 로 lens
  #   필요조건: CLAUDECODE=1 + codex 바이너리 + ~/.codex/auth.json
  #   max_concurrent_lenses: 5
  #   Transport: S0 per lens
  - cc-main-codex-subprocess

  # [3-1] TeamCreate teamlead → LiteLLM 개별 HTTP 세션으로 lens
  #   필요조건: CLAUDECODE=1 + CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
  #           + LiteLLM 서버 (llm_base_url 또는 LITELLM_BASE_URL)
  #   max_concurrent_lenses: 1 (LiteLLM 프록시 단일 큐)
  #   Transport: S1 (HTTP)
  - cc-teams-litellm-sessions

  # ── 2. Codex 기반 전체 스택 (host-agnostic, Claude Code 또는 Codex 세션) ─

  # [codex-A] onto TS main → teamlead codex subprocess → nested codex subprocess per lens
  #   필요조건: codex 바이너리 PATH + ~/.codex/auth.json + non-seatbelt 환경
  #   (실측: 2026-04-18 §9 검증, outer/inner 세션 ID 독립 확인)
  #   max_concurrent_lenses: 5
  #   Transport: S0 full stack
  - codex-nested-subprocess

  # [codex-B] onto TS main = teamlead (Codex host 안에서), codex subprocess per lens
  #   필요조건: Codex CLI 세션 signal 감지 + codex 바이너리 + ~/.codex/auth.json
  #   max_concurrent_lenses: 5
  #   Transport: S0 per lens
  - codex-main-subprocess

  # ── 3. 기타 LLM 환경 ─────────────────────────────────────────────────────

  # [generic-1] Nested subagent 가능한 LLM: teamlead subagent → lens subagent
  #   필요조건: 호스트 LLM 이 nested subagent spawn 지원 (현재: config 에서
  #            principal 이 generic_nested_spawn_supported: true 로 선언)
  #   max_concurrent_lenses: TBD (실측 후 확정)
  - generic-nested-subagent

  # [generic-2] 단일 레벨 subagent 만 가능한 LLM: 메인 = teamlead, lens subagent
  #   필요조건: 호스트 LLM 이 subagent spawn 지원
  #   max_concurrent_lenses: TBD
  - generic-main-subagent

# ============================================================================
# Topology-Related Switches
# ============================================================================

# [1-0] 옵션의 2차 opt-in. CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS env 와 병행 필수.
lens_agent_teams_mode: false

# Generic LLM host 가 subagent-of-subagent 를 지원하는지 여부 (principal 선언).
# true 이면 generic-nested-subagent 옵션 활성화.
generic_nested_spawn_supported: false

# 옵션별 max_concurrent_lenses 개별 override (선택).
# execution_topology_overrides:
#   cc-teams-agent-subagent:
#     max_concurrent_lenses: 6
```

## 6. 기존 코드와의 관계

### 6.1 Sketch v2 (Transport 축) 의 재배치

Sketch v2 의 S0~S3 Separation Rank 는 **Topology 옵션의 파생 속성** 으로 격하되되 개념은 유지:

- 각 옵션 표에 `Transport Rank` 컬럼 명시 (§3 표 참조)
- `ExecutionPlan.separation_rank` 필드는 Topology 결정 후 자동 채워짐
- Principal 이 직접 Transport rank 를 설정할 수 없음 (Topology 를 바꿔야 함)

### 6.2 PR-1 (PR #96) `resolveExecutionPlan` 과의 관계

PR-1 은 Layer 1 + Layer 2 를 통합했습니다. Sketch v3 는 **Layer 3 (executor binary 선택)** 까지 확장:

| 현재 PR-1 | Sketch v3 후 |
|---|---|
| `resolveExecutionProfile` (adapter) → `resolveExecutionPlan` | `resolveExecutionTopology()` → topology_id 반환 |
| `ExecutionPlan.execution_realization` ∈ {subagent, agent-teams, ts_inline_http, mock} | `ExecutionTopology.id` ∈ 10 옵션, `execution_realization` 은 파생 |
| `resolveExecutorConfig` 가 config 독립 재판정 | 제거. Topology 옵션이 executor binary 를 결정 |
| `host_runtime` ∈ {claude, codex, standalone, anthropic, openai, litellm} | `host_runtime` 은 topology 의 파생 속성 (legacy 호환 adapter 유지) |

### 6.3 Atomic Profile Adoption (PR-1 addendum) 와의 관계

PR-1 의 `config-profile.ts` 가 정의한 **profile completeness** 개념은 Topology 로 진화:

- "완전한 profile" = "Topology 옵션 중 하나 이상이 현 환경에서 채택 가능" 으로 재정의
- `validateProfileCompleteness` → `validateTopologyResolvable` 로 rename + 로직 교체
- Fail-fast 메시지의 "4 canonical options (Anthropic / Codex / Claude / LiteLLM)" 은 "11 topology options" 로 확장

PR-1 의 코드는 제거되지 않고 **Sketch v3 구현 PR 에서 교체**. PR-1 은 Transport 층 통합 + profile 원자 채택 정책을 먼저 확립한 중간 단계.

### 6.4 CLI 플래그의 재해석

- `--codex` → Topology `cc-main-codex-subprocess` (또는 `codex-nested-subprocess`) 강제. 둘 중 어느 쪽으로 해석할지는 구현 PR 에서 결정 (주체자 의도: 메인 컨텍스트 teamlead + codex lens 가 단순하므로 `cc-main-codex-subprocess` 기본 제안).
- `--executor-realization mock` → Topology 층 위 test-only bypass. Topology ladder 를 우회해서 mock executor 로 직행 (별도 취급).

## 7. 구현 PR scope

### 7.1 신설 파일

- `src/core-runtime/review/execution-topology-resolver.ts` — 10 옵션 catalog + ladder resolver + 감지 로직
- `src/core-runtime/review/execution-topology-resolver.test.ts` — 10 옵션별 positive/negative 감지 테스트

### 7.2 수정 파일

- `src/core-runtime/review/execution-plan-resolver.ts` — Topology 결정 후 파생 속성으로 ExecutionPlan 구성. 기존 P0~P4 ladder 는 topology 감지 로직의 내부 helper 로 이동.
- `src/core-runtime/cli/review-invoke.ts` — `resolveExecutorConfig` 삭제. Topology 옵션이 executor binary 결정.
- `src/core-runtime/discovery/config-chain.ts` + `config-profile.ts` — `validateProfileCompleteness` → `validateTopologyResolvable` 로 확장. Fail-fast 메시지를 10 옵션 가이드로.
- `src/core-runtime/discovery/config-chain.ts` OntoConfig 에 신규 필드 추가:
  - `execution_topology_priority?: string[]`
  - `lens_agent_teams_mode?: boolean`
  - `generic_nested_spawn_supported?: boolean`
  - `execution_topology_overrides?: Record<string, { max_concurrent_lenses?: number }>`
- 기존 `host_runtime` / `execution_realization` / `api_provider` / `external_http_provider` 는 legacy adapter 로 유지 (deprecation warning 후 제거).

### 7.3 신설 executor (필요 시)

현재 executor 3개:
- `codex-review-unit-executor.ts`
- `inline-http-review-unit-executor.ts`
- `mock-review-unit-executor.ts`

Sketch v3 도입 시 신규 executor 필요성 검토:

| Topology | 재사용 executor | 신설 필요성 |
|---|---|---|
| 1-0 | Claude TeamCreate member + SendMessage | 있음 (`team-lens-agent-deliberation-executor.ts`). 기존 lens agent lifecycle 을 "deliberation 대기 상태" 로 유지하는 wrapper 필요 |
| 1-1 / 2-1 | Claude Agent tool | 있음 (혹은 parent Claude 가 직접 spawn 하는 스파이를 두는 방식) |
| 1-2 / 2-2 / codex-B | codex CLI subprocess (`codex exec`) | `codex-review-unit-executor.ts` 재활용 |
| 3-1 | LiteLLM HTTP | `inline-http-review-unit-executor.ts` 재활용 |
| codex-A | 중첩 codex subprocess (outer codex 가 shell 로 inner spawn) | 신설 — outer codex 에게 lens packet 을 분배 + inner spawn 명령 내리는 prompt wrapper 필요 |
| generic-1 / generic-2 | 호스트 LLM 의 subagent tool | 신설 (향후) |

초기 구현은 **이미 구현된 경로 (1-1, 1-2, 2-1, 2-2, 3-1, codex-1, codex-2)** 를 먼저 정리하고, 1-0 과 generic-* 은 별도 후속 PR.

### 7.4 Migration

- Phase A: Sketch v3 (이 문서) merge — authority-non. 설계 합의용.
- Phase B: PR scope 확정 후 `execution_topology_resolver.ts` 신설 + 기존 P0~P4 ladder 를 내부 helper 로 수렴.
- Phase C: `resolveExecutorConfig` 제거. CLI 플래그 (`--codex` 등) 를 topology 매핑으로 재해석.
- Phase D: Legacy `host_runtime` / `execution_realization` 필드 deprecation. 마이그레이션 가이드 문서.

예상 규모: XL (~1000-1500 줄, 50+ test case). PR 분할 권장.

## 8. 미해결 / TBD

| 항목 | 상태 | 다음 액션 |
|---|---|---|
| `CODEX_SESSION_ID` 등 Codex CLI 세션 감지 시그널 | 확정 안 됨 | 실 codex CLI 세션에서 env dump 로 조사 |
| `generic-1 / generic-2` 의 max_concurrent_lenses 기본값 | TBD | 초기 `1` 로 배치, 실측 후 조정 |
| Codex CLI nested subprocess spawn 가능 여부 실측 | **2026-04-18 RESOLVED** — §9 에 기록. outer/inner 세션 독립 생성 확인. 단 non-seatbelt 실행 환경 전제 | 구현 PR 시 sandbox 설정 가이드 (codex teamlead 의 `--sandbox danger-full-access` 명시) 포함 |
| Host LLM generic adapter 의 API | 미정 | generic-* 옵션 구현 시 tool 시그니처 설계 |
| Deliberation 옵션 ID 가 역사상 확정값인지 | 조정 가능 | PR 구현 전에 naming 재검토 가능 — 본 sketch 의 11 ID 는 v3 초기안 |

## 9. 실측 검증 — Codex CLI nested subprocess spawn (2026-04-18)

Sketch v3 의 옵션 `codex-A codex-nested-subprocess` 는 "첫 codex CLI subprocess 가 teamlead, 그 프로세스가 자체 shell 에서 또 다른 codex CLI subprocess 를 lens 당 1개씩 spawn" 하는 토폴로지입니다. Codex CLI v0.120.0 에서 이 nested spawn 구조가 실제 동작하는지 직접 확인:

### 9.1 방법

Claude Code 의 기본 Bash tool 에서 `codex exec` 을 직접 호출 (`child_process.spawn("codex", ...)` 과 동일 경로). 외부 wrapper / sandbox 개입 없음.

### 9.2 프로토콜

1. Level 1: Bash → `codex exec --skip-git-repo-check --ephemeral -` (단일 codex 호출).
2. Level 2: Level 1 의 codex 세션에게 "shell 로 또 다른 `codex exec` 을 실행" 지시.

### 9.3 결과

| 단계 | Session ID | sandbox | exit | 응답 |
|---|---|---|---|---|
| Level 1 (outer) | `019d9f37-9de4-7571-8362-ff49bf554302` | `danger-full-access` | 0 | `LEVEL1_OK` |
| Level 2 (nested, outer 가 shell 에서 spawn) | `019d9f37-f4ae-7a50-b75c-35c7ea64f714` | `danger-full-access` | 0 | `NESTED_OK_LEVEL2` |

**두 세션 ID 가 상이 — 독립 codex 인스턴스 2개가 모두 정상 실행**. `~/.codex/auth.json` 의 OAuth 자격은 읽기 공유 가능하며 세션 파일은 각각 독립 생성.

### 9.4 결론

- **`codex-A codex-nested-subprocess` 토폴로지는 현재 Codex CLI (v0.120.0) 에서 구현 가능**.
- 필요조건: codex 바이너리 PATH + `~/.codex/auth.json` + **non-seatbelt 실행 환경**. Codex CLI 의 기본 sandbox 모드 (`danger-full-access` 또는 쓰기 경로 허용 세팅) 면 nested spawn 이 가능.
- Sandbox 제약된 실행 환경 (예: `CODEX_SANDBOX=seatbelt`) 안에서는 inner codex 가 세션 파일을 생성하지 못해 실패. 구현 PR 시 codex teamlead 에 적용되는 sandbox 모드 설정을 문서화 필요.

### 9.5 관련 업데이트

`§8 미해결 / TBD` 표의 `Codex CLI nested subprocess spawn 가능 여부 실측` 항목은 본 §9 로 **RESOLVED**.

## 10. Sketch 의 정체성

`authority_stance: non-authoritative-design-surface` — 본 문서는 구현 PR 들의 설계 input 이며 구현 후 각 PR 의 commit / test 가 canonical. 구현 완료 시 본 sketch 는 archive.

Sister sketch v2 (20260417-context-separation-ladder-design-sketch.md, PR #94) 와 함께 읽어야 full picture:
- v2: Transport 축 (S0~S3)
- v3 (이 문서): Topology 축 (10 옵션), Transport 를 파생 속성으로 포함

10 옵션 ID, 필요조건 시그널, Transport rank 매핑은 주체자 피드백 (2026-04-18 세션) 기반 확정. Implementation PR 은 이 catalog 를 reference 로 작성합니다.
