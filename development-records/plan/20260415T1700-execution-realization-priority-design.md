---
as_of: 2026-04-15T17:00:00+09:00
supersedes: null
status: active
functional_area: execution-realization-design
purpose: |
  Review(agentic) 경로의 execution realization(agent spawn) 축 공식화.
  기존 타입 공간 `execution_realization × host_runtime`의 세 유효 조합
  (agent_teams+claude, subagent+claude, subagent+codex)을 canonical로 확정하고,
  `subagent+claude`(TeamCreate 없이 주체자가 Agent tool로 lens subagent 직접 spawn)
  경로를 review-invoke auto-resolution에 wiring한다.
  Default 정책은 stay-in-host — 현재 host ecosystem 안에서 independent context를
  우선, host 간 전환은 명시적 opt-in. 사용자 상황별 선호가 달라질 수 있으므로
  universal rank를 authority에 고정하지 않는다.
  LiteLLM host 확장점(`subagent+litellm`)은 타입·lexicon에 자리를 마련해두고
  구현은 후속 PR.
  Background task provider resolution 축(20260415-litellm-provider-design.md)과 직교.
---

# Review Execution Realization Canonicalization & Auto-Resolution 설계

## 1. 맥락

### 1.0 축 분리 재확인

onto에는 LLM 사용 축 두 개가 독립적으로 존재한다. 본 설계는 두 번째 축만 다룬다.

| 축 | 대상 | 질문 | 소유 문서 |
|---|---|---|---|
| Provider resolution (단일-턴 API call) | background task (learn·govern·promote) | 어떤 LLM 제공자·엔드포인트·키로 호출할까 | `20260415-litellm-provider-design.md` |
| **Execution realization (agent spawn)** | **review 등 agentic 작업** | **어떻게 실행 단위를 spawn할까 — orchestrator 소재·context 비용·billing source** | **본 설계** |

### 1.1 현 코드베이스 베이스라인 (2026-04-15 조사 결과)

타입은 이미 2-axis로 분리되어 있다 (`src/core-runtime/review/artifact-types.ts:3-4`):

```ts
type ReviewExecutionRealization = "subagent" | "agent-teams";
type ReviewHostRuntime          = "codex"    | "claude";
```

2×2 = 4 조합 중 **세 개만 의미 있는 사용 패턴**을 가지며, 구현 상태는 다음과 같다:

| 조합 | 의미 | 구현 상태 |
|---|---|---|
| `agent-teams + claude` | 주체자가 `TeamCreate + Agent tool`로 coordinator subagent를 nested spawn, coordinator가 다시 Agent tool로 lens subagents spawn | ✅ state machine 완비 (`coordinator-state-machine.ts`), review-invoke auto 분기 미구현 |
| `subagent + codex` | codex CLI가 각 lens를 subprocess로 spawn | ✅ 완전 구현 (`codex-review-unit-executor.ts`), `onto review --codex`로 wire |
| `subagent + claude` | 주체자가 TeamCreate 없이 Agent tool로 각 lens subagent를 직접 spawn (flat orchestration) | ❌ 타입 공간에 존재하나 review-invoke·처리 경로 미구현 |
| `agent-teams + codex` | 사용 안 함 | — |

현재 `review-invoke.ts` (line 389, 404, 1237)는 flag 없이 `host_runtime: "claude"` 요청이 오면 `"Claude runs use 'onto coordinator start'"` 에러를 던진다. 즉 **Claude host 경로 전체가 별도 entrypoint로 분리**되어 있고, `subagent + claude` 조합은 wiring 자체가 없다.

### 1.2 본 설계가 추가·교정하는 것

1. **`subagent + claude` 경로 wiring** — 주체자(Claude Code 세션)가 TeamCreate 없이 Agent tool 직접 사용. `coordinator-state-machine.ts`는 caller 중립이라 동일 state machine 재활용 가능. **새 코드 경로 아님**, 기존 state machine을 다른 orchestration 패턴으로 호출하게 계약 열기.
2. **`ReviewHostRuntime`에 `"litellm"` 확장점 추가** — `subagent + litellm`(로컬 모델 등) 조합이 타입 공간에 존재하도록. 실제 wiring은 후속 PR.
3. **review-invoke auto-resolution** — 플래그 무명시 시 stay-in-host 정책으로 감지된 host에 맞는 조합을 자동 선택. 기존 "Claude runs use coordinator start" 에러를 "호스트 감지 → 적절한 경로 안내" 로 개선.
4. **Authority 등재** — `LlmAgentSpawnRealization` 개념을 rank-1 lexicon에 추가. 세 조합의 orchestration_locus·context_cost·billing_source 속성을 명시. **Priority rank는 고정하지 않음** (사용자 상황 의존적이므로 resolver 정책 층 소관).
5. **`LlmBillingMode.cost_order_rank` 제거** — 동일 원칙(rank는 사용자 상황 의존)을 provider resolution 축에도 일관 적용.

### 1.3 세 조합의 실체 구분

**공통점**: 셋 다 lens reasoning은 **독립 context의 subagent 또는 subprocess에서** 수행 (리뷰 품질의 핵심 — 주체자 대화 context가 lens 판단에 섞이지 않음).

**차이점은 orchestrator 소재·context 비용·billing source**:

| 조합 | Orchestrator | Orchestration context | Lens context | Billing source |
|---|---|---|---|---|
| `agent-teams + claude` | coordinator subagent (main이 TeamCreate로 spawn) | subagent (메인 무소비) | lens subagent (독립) | Claude Code 구독 |
| `subagent + claude` | main session 자체 (Agent tool 직접 호출) | **메인 세션 사용** (단 lens reasoning은 여전히 독립) | lens subagent (독립) | Claude Code 구독 |
| `subagent + codex` | codex subprocess | subprocess (메인 무소비) | codex subprocess (독립) | chatgpt 구독 또는 API-key |

## 2. 확정된 결정

| ID | 결정 | 이유 |
|---|---|---|
| D1 | **Default 정책은 stay-in-host**. 감지된 host 안에서 independent-context 조합을 orchestration_only보다 우선. Host 간 이동은 명시적 opt-in(`--codex` flag, `OntoConfig.execution_realization`·`host_runtime`). Claude host 내부에서는 `agent_teams_claude` → `subagent_claude` 순. codex host면 `subagent_codex`만 유효. LiteLLM host(후속)면 `subagent_litellm`만. | Universal rank를 주장하지 않음 — 사용자 상황(보유 구독·context 여유·로컬 하드웨어 등)에 따라 선호가 달라짐. Resolver 정책 층이 reasonable default 제공, 사용자가 override. |
| D2 | **opt-in flag 없음**. `subagent + claude` 경로 전용 CLI 플래그 추가하지 않음. 주체자 세션이 TeamCreate 가용성에 따라 nested/flat 선택. | CLI surface 확장 최소화. 주체자의 session-level 판단이 onto child process의 introspect보다 정확. |
| D3 | **제한적 자동 fallback**: 명시 플래그(`--codex` 등) 경로는 해당만 시도 후 실패 시 fail-fast. 플래그 무명시 시만 auto-resolution. | 사용자 의도 존중. |
| D4 | **Entrypoint 통합하지 않음**. 기존 `onto review --codex`와 `onto coordinator start`는 보존. 플래그 무명시 `onto review`가 세 번째 편의 진입점으로 auto-resolution 수행. | 두 기존 entrypoint는 계약(stdout vs state machine)이 다름. 점진적 확장. |
| D5 | **구현 본 PR 포함**. `subagent + claude` 구현은 `coordinator-state-machine.ts` 재활용이므로 추가 코드가 크지 않음 — review-invoke auto 분기 + 주체자 수신 JSON + 계약 문서 갱신 수준. | 초안에서 과소평가 우려가 있었으나 state machine이 이미 caller-중립으로 설계되어 있어 실제 변경 범위가 작음. |
| D6 | **스코프는 review 전용**. Background task의 execution realization은 범위 밖. | learn/govern 현재는 단일-턴 API call이라 agent spawn 축이 의미 없음. 향후 agentic 요구 생기면 별도 설계. |
| D7 | **Authority 등재 — `LlmAgentSpawnRealization` (attributes only, rank 없음)**. 동시에 기존 `LlmBillingMode.cost_order_rank` 제거로 일관성 유지. | 세 조합의 orchestration_locus·context_cost·billing_source 차이를 rank-1에 명시. Priority는 사용자 상황 의존이므로 lexicon에 박지 않음. 기존 `LlmBillingMode`도 같은 하자를 가지므로 동시 제거. |
| D8 | **LiteLLM 확장점 준비**. `ReviewHostRuntime`에 `"litellm"` 값 추가(타입 공간만). `LlmAgentSpawnRealization` entry에 확장점 주석. Wiring은 후속 PR 명시. | 사용자 의도된 미래 확장. 지금 타입·lexicon 자리를 열어두면 후속 PR에서 코드·instance 추가만으로 완료. |

## 3. 변경 스펙

### 3.1 `artifact-types.ts` 타입 확장

```ts
// before
export type ReviewHostRuntime = "codex" | "claude";

// after
export type ReviewHostRuntime = "codex" | "claude" | "litellm";
// "litellm": future — OpenAI-compatible proxy (LlmCompatibleProxy instance) as review host.
// Wiring deferred; type space opened for forward compatibility.
```

기존 두 값의 의미는 불변. `ReviewExecutionRealization`은 변경 없음.

### 3.2 `review-invoke.ts` auto-resolution 재작성

현재 `resolveExecutorConfig`(line 344-413)의 "Claude runs use coordinator start" 에러를 제거하고 auto-resolution 블록으로 교체.

```ts
function resolveExecutionRealization(
  cliFlags: { codex?: boolean; executor?: string },
  config: OntoConfig,
): { realization: ReviewExecutionRealization; host: ReviewHostRuntime; handoff: "self" | "coordinator-start" } {
  // Priority 0: explicit CLI flag
  if (cliFlags.codex) {
    return { realization: "subagent", host: "codex", handoff: "self" };
  }
  if (cliFlags.executor === "mock") {
    return { realization: "subagent", host: "codex", handoff: "self" /* mock executor 분기 기존 유지 */ };
  }

  // Priority 0': explicit config
  const configRealization = narrow(config.execution_realization);
  const configHost = narrow(config.host_runtime);
  if (configRealization === "subagent" && configHost === "codex") {
    return { realization: "subagent", host: "codex", handoff: "self" };
  }
  if (configHost === "claude") {
    return {
      realization: (configRealization ?? "agent-teams"),
      host: "claude",
      handoff: "coordinator-start",
    };
  }

  // Auto-resolution (stay-in-host):
  if (detectClaudeCodeHost()) {
    // Claude host ecosystem. Prefer agent_teams_claude (independent context).
    // Subject session may fall back to subagent_claude if TeamCreate unavailable —
    // that decision belongs to the subject, not onto. We emit handoff to coordinator-start.
    return { realization: "agent-teams", host: "claude", handoff: "coordinator-start" };
  }
  if (detectCodexAvailable()) {
    return { realization: "subagent", host: "codex", handoff: "self" };
  }

  throw noHostDetectedError();
}

function detectClaudeCodeHost(): boolean {
  return process.env.CLAUDECODE === "1";
}

function detectCodexAvailable(): boolean {
  // Reuse codexBinaryOnPath pattern from llm-caller (same dir check).
  // For review, both OAuth and API-key modes are valid.
  return codexBinaryOnPath() && codexAuthJsonExists();
}
```

**핵심 변화**:
- `handoff: "self"` — review-invoke 자신이 끝까지 실행 (codex 경로)
- `handoff: "coordinator-start"` — review-invoke가 세션 준비 후 주체자에게 `onto coordinator start` 호출을 안내 (Claude host 경로, nested·flat 모두)

onto는 주체자의 TeamCreate 가용성을 알 수 없으므로 nested vs flat 최종 선택은 주체자 세션이 담당. `coordinator-state-machine.ts`는 어느 쪽이든 동일하게 수용.

### 3.3 주체자 수신 출력 (handoff=coordinator-start 시)

```json
{
  "entrypoint_plan": { /* 기존 필드 */ },
  "execution_realization": "agent-teams",
  "host_runtime": "claude",
  "handoff": "coordinator-start",
  "next_action": {
    "cli": "onto coordinator start <target> <intent>",
    "orchestration_guidance": {
      "preferred": "TeamCreate로 coordinator subagent를 nested spawn, coordinator가 Agent tool로 9 lens + synthesize subagent 추가 nested spawn (canonical path = agent_teams_claude)",
      "fallback": "TeamCreate 비가용 환경에서는 주체자 세션이 Agent tool로 lens subagent를 직접 spawn 가능 (canonical path = subagent_claude). coordinator state machine은 양쪽 모두 수용."
    }
  }
}
```

주체자 세션은 이 guidance를 읽고 TeamCreate 호출 시도 → 실패 시 flat 패턴으로 전환. onto는 힌트만 제공.

codex 경로(handoff=self)는 기존 출력 그대로 + `handoff: "self"` 필드 추가만.

### 3.4 `coordinator-state-machine.ts` caller convention 명시

코드 변경 없음. 계약 문서(§3.5)에서 "state machine은 nested/flat 양쪽 caller를 수용한다" 명시.

### 3.5 `processes/review/*` 계약 갱신

- **`nested-spawn-coordinator-contract.md`**: "Nested가 필수 제약 아님" 섹션 추가. TeamCreate 비가용 시 주체자가 직접 Agent tool로 lens subagent spawn 가능하며, 이는 `subagent + claude` canonical path임을 명시.
- **`productized-live-path.md`**: Agent Teams 경로 대안으로 `subagent + claude` 설명 추가. (기존 "Codex 경로를 사용한다" 문구는 `commands/review.md`에서 삭제.)
- **`commands/review.md`**: "Execution path selection" 표에 세 번째 canonical 조합 행 추가. "Agent Teams가 비활성화된 환경에서 해당 경로는 사용 불가 — Codex 경로를 사용한다"의 후반부 "— Codex 경로를 사용한다" 삭제 (단정 폐기).

## 4. Authority 변경 (`authority/core-lexicon.yaml`)

### 4.1 `LlmAgentSpawnRealization` 신규 등재

```yaml
LlmAgentSpawnRealization:
  canonical_label: "LlmAgentSpawnRealization"
  korean_label: "LLM 에이전트 생성 실현"
  definition: "review agentic 작업에서 lens reasoning unit을 어떤 기제로 spawn하고 누가 orchestration하는가를 규정하는 축. execution_realization × host_runtime 2-axis의 세 유효 조합에 대한 의미론적 seat"
  core_value: "이 개념이 없으면 2-axis 조합의 의미가 타입 정의에만 존재해, '세 조합이 왜 서로 다른가'를 설명하는 rank-1 자리가 없다. 특히 orchestrator 소재·context 비용·billing source의 차이가 운영 의사결정 근거인데 authority에 부재"

  attributes:
    shared: []
    local:
      orchestration_locus:
        definition: "lens dispatch와 state 전이를 담당하는 주체의 소재"
        values:
          coordinator_subagent: "main이 TeamCreate로 spawn한 별도 subagent가 orchestration 담당"
          main_session: "주체자 세션 자체가 Agent tool 호출로 orchestration"
          subprocess: "외부 CLI (codex 등)가 자체 orchestration"

      context_cost:
        definition: "메인 세션 context 소비 특성"
        values:
          independent: "orchestration·lens reasoning 모두 메인 외부 context"
          orchestration_only: "orchestration만 메인 소비, lens reasoning은 독립 context"

      billing_source:
        definition: "실행에 대해 이미 지불된 자원의 출처"
        values:
          claude_code_subscription: "주체자의 Claude Code 구독"
          chatgpt_subscription: "~/.codex/auth.json OAuth 경유 chatgpt 구독"
          openai_per_token: "~/.codex/auth.json API-key mode"
          local_or_self_hosted: "로컬 모델 또는 자체 호스팅 LiteLLM 등"

  instances:
    agent_teams_claude:
      execution_realization: agent-teams
      host_runtime: claude
      orchestration_locus: coordinator_subagent
      context_cost: independent
      billing_source: claude_code_subscription
      notes: "`onto coordinator start` + 주체자의 TeamCreate + nested Agent tool. 주체자 메인 context 거의 무소비."

    subagent_claude:
      execution_realization: subagent
      host_runtime: claude
      orchestration_locus: main_session
      context_cost: orchestration_only
      billing_source: claude_code_subscription
      notes: "주체자가 TeamCreate 없이 Agent tool을 직접 사용해 lens subagent를 flat spawn. 같은 `coordinator-state-machine.ts` 재활용. 주체자 context가 orchestration에 사용되지만 lens reasoning은 독립 subagent context."

    subagent_codex:
      execution_realization: subagent
      host_runtime: codex
      orchestration_locus: subprocess
      context_cost: independent
      billing_source: chatgpt_subscription        # OAuth mode 기준
      notes: "`onto review --codex` 경로. codex CLI subprocess가 각 lens 실행. auth.json API-key mode일 경우 billing_source=openai_per_token."

    # 확장점: subagent_litellm (future)
    #   execution_realization: subagent
    #   host_runtime: litellm
    #   orchestration_locus: subprocess
    #   context_cost: independent
    #   billing_source: local_or_self_hosted
    #   wiring 후속 PR.

  execution_rules_ref:
    resolution_policy: "src/core-runtime/cli/review-invoke.ts:resolveExecutionRealization"
    state_machine: "src/core-runtime/cli/coordinator-state-machine.ts (agent_teams_claude + subagent_claude 공용)"
    codex_executor: "src/core-runtime/cli/codex-review-unit-executor.ts (subagent_codex 전용)"
    design_record: "development-records/plan/20260415T1700-execution-realization-priority-design.md"

  notes:
    - "Priority(선호 순서)는 사용자 상황 의존적이므로 이 entry에 고정하지 않는다. resolver 정책 층이 기본값(stay-in-host) 제공, 사용자가 `--codex` flag·OntoConfig.execution_realization·host_runtime으로 override"
    - "Provider resolution 축(LlmCompatibleProxy, LlmBillingMode)과 직교 — background task의 단일-턴 API call 경로와 review의 agentic 실행 경로는 서로 영향 주지 않음"
    - "`host_runtime: litellm`는 타입 공간에 열려 있으며 `subagent_litellm` 조합은 후속 설계에서 wiring"
```

### 4.2 `LlmBillingMode.cost_order_rank` 제거

기존 entry의 `cost_order_rank` attribute와 관련 주석 제거. 이유: rank는 사용자 상황(보유 구독·API 예산 등) 의존적이므로 authority에 박지 않는 원칙을 두 축에 일관 적용. Priority는 resolver 정책 층에서만 관리.

Before:
```yaml
attributes:
  local:
    mode: { ... }
    cost_order_rank:
      definition: "provider 해소 우선순위 ..."
      values: { subscription: 1, variable: 2, per_token: 3 }
```

After:
```yaml
attributes:
  local:
    mode: { ... }
    # cost_order_rank removed 2026-04-15: ranking is user-situation-dependent
    # (available subscriptions, API budget, context headroom). Default policy lives
    # in src/core-runtime/learning/shared/llm-caller.ts:resolveProvider and its
    # design record, not authority rank-1.
```

## 5. Non-Goals

| 항목 | 이유 |
|---|---|
| `subagent + litellm` 실제 wiring | D8 확장점만 준비. 실 구현은 후속 PR — 로컬 모델 agent loop 요구사항·provider·auth 방식이 별도 설계 필요. |
| `TeamCreate` 가용성 onto쪽 자동 감지 | onto child process가 주체자 Claude Code 세션의 tool 가용성을 introspect 할 수 없음. 주체자 세션이 호출 시도 후 실패하면 flat 패턴으로 전환 — 주체자 책임. |
| Cursor·Windsurf 등 추가 host 감지 | 현 스코프는 Claude Code + codex + litellm 확장점. 다른 host는 수요 등장 시 `detectClaudeCodeHost` 패턴 확장. |
| Background task (learn/govern/promote)의 agent spawn 축 | 현 background task는 단일-턴 API call. agent spawn 의미 없음. 향후 agentic 기능 요구 시 본 설계를 해당 도메인에 복제. |
| "Preference order" 기반 config 확장 (`execution_realization_preference: [...]`) | 현 CLI flag·config 강제 override로 충분. 리스트 기반 preference는 수요 누적 시 후속 설계. |
| coordinator start의 codex-only prepare 결합 분해 | 현재 `coordinator start`는 Claude host 전용으로 이미 분기. 본 설계 변경 없이 정상 동작. 결합 분해가 필요한 리팩토링은 별도 후속. |

## 6. 테스트 전략

### 6.1 단위 테스트 (`review-invoke.test.ts` 신규 또는 확장)

| 케이스 | 입력 | 기대 |
|---|---|---|
| E1 explicit --codex | `--codex` flag | `{realization: subagent, host: codex, handoff: self}` |
| E2 explicit config claude | `config.host_runtime: claude` | `{host: claude, handoff: coordinator-start}` |
| E3 auto + CLAUDECODE=1 | 플래그·config 없음 + `CLAUDECODE=1` | `{realization: agent-teams, host: claude, handoff: coordinator-start}` |
| E4 auto + codex only | 플래그·config 없음 + codex binary + auth.json + `CLAUDECODE` unset | `{realization: subagent, host: codex, handoff: self}` |
| E5 auto + 둘 다 감지 | 플래그·config 없음 + `CLAUDECODE=1` + codex available | stay-in-host: `host: claude` (codex는 명시 opt-in 필요) |
| E6 auto + 아무것도 없음 | 신호 전무 | throw `noHostDetectedError` |
| E7 출력 schema (handoff=coordinator-start) | E3 경로 | stdout JSON에 `next_action.cli`·`orchestration_guidance.preferred`·`.fallback` 포함 |
| E8 detectClaudeCodeHost | `CLAUDECODE=1` 존재/부재 | boolean 정확 반환 |
| E9 detectCodexAvailable | 바이너리·auth.json 조합 케이스 | 각각 기대 반환 |

### 6.2 통합 테스트

- 기존 `onto review --codex` e2e 불변 확인 (E1 경로와 동등)
- 기존 `onto coordinator start/next` state machine e2e 불변 확인 (agent_teams_claude + subagent_claude 공용 증명)
- 신규: `CLAUDECODE=1` 환경에서 `onto review` (플래그 무명시) 호출 시 stdout JSON 구조 검증

### 6.3 Backward Compat

| 기존 사용자 | 이전 동작 | 신규 동작 |
|---|---|---|
| `onto review --codex` | codex 경로 완료 | 동일 |
| `onto coordinator start` | state machine 진입 | 동일 |
| `onto review` (플래그 무명시, Claude Code 세션) | "Claude runs use 'onto coordinator start'" 에러 | **auto-resolution → handoff=coordinator-start JSON** (사용자 다음 액션 명시) |
| `onto review` (플래그 무명시, codex 가용) | 기본 "codex" 가정 경로 시도 | 동일 (handoff=self) |
| `onto review` (플래그 무명시, 아무것도 없음) | 기본 "codex" 시도 → codex 에러 | **auto-resolution fail-fast with cost-order guidance** |

## 7. 롤아웃 & 문서화

### 7.1 변경 파일 목록

| 파일 | 변경 |
|---|---|
| `src/core-runtime/review/artifact-types.ts` | `ReviewHostRuntime`에 `"litellm"` 추가 |
| `src/core-runtime/cli/review-invoke.ts` | `resolveExecutionRealization` 재작성. `detectClaudeCodeHost`·`detectCodexAvailable` 신설. `handoff: "self" \| "coordinator-start"` 필드 추가. 기존 error 문구 제거. |
| `src/core-runtime/cli/review-invoke.test.ts` (확장) | §6.1 E1~E9 |
| `authority/core-lexicon.yaml` | `LlmAgentSpawnRealization` 추가. `LlmBillingMode.cost_order_rank` 제거. |
| `processes/review/nested-spawn-coordinator-contract.md` | "Nested 필수 제약 아님" 섹션 추가 (flat caller 수용 명시) |
| `processes/review/productized-live-path.md` | `subagent + claude` 대안 경로 언급 |
| `commands/review.md` | Execution path selection 표 3행으로 확장. "Codex 경로를 사용한다" 삭제. |
| `CHANGELOG.md` | 본 설계 내용 + `LlmBillingMode.cost_order_rank` 제거 항목 |
| `development-records/plan/20260415T1700-execution-realization-priority-design.md` | 본 문서 |

### 7.2 PR 전략

단일 PR. 커밋 순서:

1. `docs(plan): add execution realization canonicalization design`
2. `feat(authority): add LlmAgentSpawnRealization; remove LlmBillingMode.cost_order_rank`
3. `feat(types): extend ReviewHostRuntime with "litellm" forward-compat slot`
4. `feat(cli): auto-resolve execution realization in review-invoke (stay-in-host)`
5. `docs(review): document subagent+claude caller convention and three canonical combos`
6. `test(cli): cover execution realization auto-resolution`
7. `docs(changelog): execution realization auto-resolution and billing rank removal`

### 7.3 후속 감사 포인트

- `onto review` 플래그 무명시 호출이 실 사용자 세션에서 얼마나 발생하는가 (handoff=coordinator-start 비율 vs handoff=self 비율)
- `subagent + claude` 경로 선택 빈도 — 주체자 세션이 TeamCreate 실패 후 flat으로 전환하는 실 케이스
- LiteLLM host wiring 수요 타이밍
- `ReviewHostRuntime` 확장 요구(Cursor·Windsurf 등) 누적 시 감지 함수 확장

## 8. 참조

- `src/core-runtime/cli/review-invoke.ts:344-413` — 현 `resolveExecutorConfig` (재작성 대상)
- `src/core-runtime/cli/coordinator-state-machine.ts` — agent_teams_claude + subagent_claude 공용 state machine
- `src/core-runtime/cli/codex-review-unit-executor.ts` — subagent_codex 전용 executor
- `src/core-runtime/review/artifact-types.ts:3-4` — 기존 2-axis 타입
- `processes/review/nested-spawn-coordinator-contract.md` — coordinator 계약
- `design-principles/llm-runtime-interface-principles.md` §3.15 — host/runtime neutrality 원칙
- `authority/core-lexicon.yaml` — `LlmBillingMode`, `LlmCompatibleProxy` (보완 관계 개념)
- `development-records/plan/20260415-litellm-provider-design.md` — 직교 축 (provider resolution)
- Memory: `project_codex_cli_retention.md` — 이중 경로 결정 배경
