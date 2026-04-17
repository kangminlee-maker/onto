---
as_of: 2026-04-18
status: design-sketch
functional_area: provider-resolution-context-separation-ladder
revision_history:
  - "2026-04-17: initial sketch (cost-order deprecation + context-separation ladder)"
  - "2026-04-18: scope 확장 — independence axiom (§1.1.1), ExecutionPlan 통합 (§3.1 expanded), 8 결함 R1~R8 매핑 (§7), PR 분할 (§8)"
purpose: |
  Cost-order provider resolution ladder 폐기 + context-separation 기반 새 ladder 설계.
  Cost 는 각 principal 환경에 따라 상대적이라 universal quality 축이 될 수 없고,
  context separation (메인 context 오염 방지) 은 누구에게나 항상 더 좋은 결과이므로
  정렬축으로 우월. 2026-04-18 세션에서 review 5 회 실패 drill-down 으로 8 결함 catalog
  추가, "independent judgments over shared execution plan" 이라는 design axiom 확립.
  본 sketch 는 설계 합의용 — 구현은 후속 PR (§8 우선순위).
authority_stance: non-authoritative-design-surface
canonicality: scaffolding
source_refs:
  deprecated_ladder: "src/core-runtime/learning/shared/llm-caller.ts (@deprecated since PR #91)"
  observability_precedent: "src/core-runtime/learning/shared/llm-caller.ts emitLadderLog (PR #91)"
  two_layer_decision: "src/core-runtime/cli/review-invoke.ts resolveExecutionProfile"
  local_llm_policy_memory: "~/.claude-1/projects/-Users-kangmin-cowork-onto-4/memory/feedback_local_llm_architectural_review.md"
  original_litellm_design: "development-records/plan/20260415-litellm-provider-design.md §1.0"
---

# Context-Separation Provider Ladder — Design Sketch (2026-04-17)

> **Status**: sketch. Implementation will be the follow-up PR (replacing cost-order ladder marked @deprecated in PR #91). This document captures the shared scope + design commitments agreed in the 2026-04-17 session before code work begins.

## 1. 문제 정의

### 1.1 폐기 대상 정책 — cost-order ladder

현재 `llm-caller.ts` 의 `resolveProvider` 는 6 단계 cost-order ladder:
1. Mock (test only)
2. Config-explicit (`OntoConfig.api_provider`)
3. Codex CLI OAuth subscription
4. LiteLLM (per-token, base_url resolved)
5. Anthropic API key (per-token)
6. OpenAI per-token

정렬축은 **비용** (subscription < per-token < …). 주체자 피드백 (2026-04-17 세션):

> cost는 각자가 처한 환경에 따라 상대적이야. 하지만 메인 context를 사용하지 않는게 좋다는 것, 컨텍스트의 분리가 명확하다는 것은 누구에게나 항상 좋은 결과야.

즉 **비용은 universal quality 축이 아님** (회사 계정 / 개인 / subscription 유형 / 지역별 가격 차이). 반면 **context 분리** 는 principal 환경과 무관하게 항상 동일한 quality 향상을 제공.

### 1.1.1 Design axiom — Independence 의 두 종류 분리 (2026-04-18 추가)

Review 에는 두 종류의 "independence" 가 존재하고, **서로 다른 layer 에 속해야** 합니다. 이 둘을 혼동하면 한쪽의 올바른 독립성이 다른 쪽의 잘못된 독립성을 낳습니다.

| 독립성 종류 | 올바른 위치 | 이유 |
|---|---|---|
| **Epistemic independence** (판단의 독립) | **Lens layer** — axiology / logic / structure / evolution / pragmatics / … | Review 의 존재 이유. 다각도 관점이 서로의 판단에 오염되지 않고 독립적으로 target 을 조망해야 발견되지 않던 결함이 드러남 |
| **Execution consistency** (실행 맥락의 공유) | **Infrastructure layer** — provider / transport / model / config / retry / synthesize pipeline | 각 lens 가 같은 조건에서 판단하도록 공통 plan 제공. Lens 마다 다른 provider / retry 로 실행되면 판단의 비교 가능성 소실 |

**Axiom**: **Independent judgments over shared execution plan.** Judgment 는 독립, 실행 plan 은 공유.

2026-04-17~18 세션의 실패 반복이 이 axiom 위반의 증거. 아래 §2 의 silent divergence 는 infrastructure layer 가 독립 resolver 로 분산된 탓이고, 이것이 lens 들에게 inconsistent execution plan 을 전달해서 (logic 만 Codex, 나머지는 Anthropic) **lens 의 올바른 epistemic 독립성을 infrastructure 의 잘못된 독립성이 훼손** 하는 구조가 재현됐습니다.

본 sketch 의 ladder 재설계 scope 는 **infrastructure layer 에만** 작동합니다. Lens 의 epistemic independence (다른 lens 의 round1 결과를 못 보고 독립 평가하는 구조) 는 review 의 핵심 가치이므로 **보존 대상**이며, 설계 변경 범위 밖.

### 1.2 교체 원칙 — context separation

`review` / `learn` / `govern` 같은 background task 는 principal 의 **메인 대화 context (Claude Code 세션 등)** 와 섞이지 않을수록 다음이 좋아진다:
- 결과의 재현성 (다른 principal 에게서도 같은 input → 같은 output)
- 주제 오염 방지 (메인 context 의 이전 대화가 review 판단에 영향 주지 않음)
- Observability (subprocess 경계가 분명하면 log / audit 추적이 쉬움)
- Token budget 독립 (subprocess 는 자체 context window)

Context separation rank (높음 → 낮음):

| Rank | 분리 방식 | 대표 경로 |
|---|---|---|
| **S0** | Subprocess — 완전 분리 | Codex CLI (`codex exec --ephemeral`) |
| **S1** | External HTTP API session — process 공유, API context 는 독립 | Anthropic / OpenAI / LiteLLM HTTP call |
| **S2** | Host main-model delegation — host process 의 메인 context 공유 | Claude Code nested spawn (`Agent` tool) |
| **S3** | In-process mock | Test fixtures only |

## 2. 현재 구조의 2-layer silent decision

Principal 이 인식하는 ladder (`resolveProvider`) 는 실은 **2차 layer**. 그 위에 **1차 layer** 가 따로 있음:

### 2.1 Layer 1 — `resolveExecutionProfile` (review-invoke.ts:493-529)

입력: `OntoConfig.host_runtime`, `OntoConfig.subagent_llm`, `~/.codex/auth.json` 감지, env override  
출력: `{ execution_realization, host_runtime }`

결정 예시:
- `host_runtime: "codex"` → `codex-review-unit-executor.ts` 로 라우팅 (subprocess)
- `host_runtime: "standalone"` → `inline-http-review-unit-executor.ts` 로 라우팅 (inline HTTP)

오늘 세션 실패 진단 (PR #91 commit message 참조):
- Codex auth.json `auth_mode: chatgpt` + binary on PATH 인데도 Layer 1 이 **`standalone / ts_inline_http`** 로 결정. Codex subprocess executor 가 load 되지 않음.
- Layer 1 결과가 `standalone` 이면 Layer 2 (resolveProvider) 가 호출되지만, "HTTP provider" 범위 내에서만 (Anthropic / OpenAI / LiteLLM). Codex 는 범위 밖.

### 2.2 Layer 2 — `resolveProvider` (cost-order ladder)

Layer 1 의 결과가 inline-http 일 때만 실행. 내부에서 step 3 (codex)  은 `readCodexAuthState()` 로 다시 판정 — **Layer 1 의 판정과 독립적**, 중복 체크.

### 2.3 2-layer 의 문제

- **Silent divergence**: Layer 1 이 Codex 경로 우회한 이유가 stderr 로 발행되지 않음. PR #91 은 Layer 2 만 observable 하게 했고 **Layer 1 은 여전히 silent**.
- **중복 로직**: `readCodexAuthState` / `codexBinaryOnPath` 가 두 layer 에서 중복 호출 + 다른 결정 조건.
- **정렬축 불일치**: Layer 1 이 context separation 축을 쓰는지 cost 축을 쓰는지 명시되지 않음. 현재는 config field (`host_runtime`) 를 그대로 사용.

## 3. 제안 — 통합 context-separation ladder

### 3.1 단일 resolver 로 통합 — `resolveExecutionPlan` (2026-04-18 scope 확장)

Layer 1 + Layer 2 뿐 아니라 **retry policy / lens budget / synthesize strategy 까지 한 plan 으로 통합**. 이는 §1.1.1 axiom 의 "shared execution plan" 을 충족하는 구체 구조. 반환값:

```ts
type ExecutionPlan = {
  // Infrastructure transport (§3.2 ladder 에서 결정)
  separation_rank: "S0" | "S1" | "S2" | "S3";
  execution_realization: "subprocess" | "ts_inline_http" | "host_nested_spawn" | "mock";
  provider_identity: "codex" | "anthropic" | "openai" | "litellm" | "claude-code" | "mock";
  model_id: string;
  credentials: { ... };  // provider 별 필수 자격

  // Retry policy (오늘 R4 결함 반영 — per-error-type 분기)
  retry_policy: {
    timeout_ms: number;
    max_attempts: number;
    backoff: "exponential" | "linear" | "none";
    classify: {
      // transient: rate-limit-429, connection-reset, overloaded-529
      // permanent: auth-401, invalid_model-400, timeout-after-subprocess-kill
      [errorSignature: string]: "retry" | "halt";
    };
  };

  // Lens dispatch (R7 결함 반영 — lens 별 budget/priority)
  lens_dispatch: {
    max_concurrent: number;
    per_lens_learning_budget_tokens: number;
    per_lens_context_budget_tokens: number;
    overflow_policy: "drop-learnings-first" | "truncate-context" | "reject";
  };

  // Synthesize strategy (R6 결함 반영 — partial synthesize 허용)
  synthesize_strategy: {
    quorum: "all-lenses" | "majority" | "custom";
    custom_threshold?: number;  // e.g., 3 of 4
    missing_lens_marker: "skip" | "error-note" | "halt";
  };

  // Observability (PR #91/#93 + R5 확장)
  plan_trace: string[];  // 전체 decision sequence — stderr 발행 + session artifact 저장
};
```

이 plan 은 session 시작 시 **한 번 계산** 되어 `execution-plan.yaml` 에 persisted. 이후 lens runner / retry logic / synthesize step 은 **plan 의 필드를 참조만** 하고 재-resolve 하지 않음.

### 3.1.1 Lens 의 epistemic independence 보존 경계

`ExecutionPlan` 은 lens 의 **실행 환경** 만 공유. 각 lens 의 **판단 컨텍스트** 는 여전히 독립:
- Lens 간 round1 출력 공유 없음 (synthesize 전까지)
- Lens 별 prompt 는 독립 구성 (`prompt-packets/<lens>.prompt.md`)
- Plan 의 `per_lens_*_budget` 은 각 lens 가 동일 **자원 할당** 을 받게 하는 장치 (판단 개입 아님)

이 경계가 흐려지면 안 됨 — §1.1.1 axiom 의 implementation 경계.

### 3.2 새 ladder 의 순서

```
Priority 0 (special): Mock — ONTO_LLM_MOCK=1 (test only)
Priority 1: Explicit config override — OntoConfig.provider + OntoConfig.execution_realization
Priority 2 (S0): Codex CLI subprocess
    - ~/.codex/auth.json (auth_mode=chatgpt OR tokens.access_token) + codex binary on PATH
    - executor: codex-review-unit-executor (subprocess)
Priority 3 (S1): External HTTP API — 동등 그룹, 내부 정렬 없음
    - 3a: Anthropic (ANTHROPIC_API_KEY)
    - 3b: OpenAI (OPENAI_API_KEY or ~/.codex/auth.json OPENAI_API_KEY field)
    - 3c: LiteLLM (LITELLM_BASE_URL env or config.llm_base_url)
    - 이 셋은 context separation 동등. 내부 선택은 §4.1 결정 규칙 참조.
    - executor: inline-http-review-unit-executor (HTTP call)
Priority 4 (S2): Host nested spawn — principal explicit request 만
    - CLI flag: --host-nested-spawn 또는 config: nested_spawn: true
    - 자동 fallback 없음 — 명시적 opt-in
    - executor: (별도 nested-spawn-review-unit-executor)
Credential 전무: fail-fast with context-separation guidance
```

### 3.3 Observability 확장

`emitLadderLog` (PR #91) 패턴을 재사용. 각 priority step 의 match / skip / reason 을 `[provider-ladder]` prefix stderr 로 발행. 통합 resolver 이므로 Layer 1/2 silent divergence 자동 해소.

## 4. 합의된 결정 (2026-04-17 주체자 결정)

### 4.1 External HTTP API 동등 그룹 (3a/3b/3c) 내부 선택 규칙 — **A. Config-only explicit**

`OntoConfig.external_http_provider: anthropic | openai | litellm` 필드로 명시 강제.
미지정 시 fail-fast with guidance (config 예시 제시).

근거: Environment-relative 자동 선택을 배제하고 **config 가 single source of truth**. Env 변수는 credential 공급만 담당, provider 선택은 오직 config. Principal intent 가 항상 명시적이고 silent decision 제거.

Fail-fast message 예시:
```
[provider-ladder] step 3 external-http: skipped — OntoConfig.external_http_provider 미지정.
  예: .onto/config.yaml 또는 ~/.onto/config.yaml 에 다음을 추가:
    external_http_provider: anthropic
  허용값: anthropic | openai | litellm
```

### 4.2 LiteLLM 의 memory 정책 반영 — **No policy (ladder 배제)**

`feedback_local_llm_architectural_review.md` 의 "LiteLLM MoE 는 review 에 부적합" 내용은 **ladder 에 강제하지 않음**. 이유: 로컬 MoE 환각 위험은 **사용자 환경 (어떤 모델을 붙였는지) 에 크게 의존** 하므로 universal 정책 축이 아님. Ladder 의 정렬축 (context separation = universal) 와 동일한 "environment-relative 는 ladder 에 들이지 않는다" 원칙 적용.

- Warning 발행 없음
- Entrypoint allowlist 없음
- Hard-reject 없음

Memory 자체는 **principal 의 config 작성 참고용 경험 기록** 으로 역할 재정의. 별도 memory 갱신 필요 (scope 를 "특정 로컬 MoE 실험" 으로 한정, ladder 정책 아님을 명시).

구현 영향: `review_invoke` 에 `allowed_providers` 제약 로직 불필요. Ladder 는 entrypoint 맥락을 받을 필요 없음 → API 단순화.

### 4.3 Nested spawn (S2) 의 explicit request mechanism — **ii. Config field only**

`OntoConfig.execution_realization: "host_nested_spawn"` 설정 시에만 nested spawn executor 선택.

- CLI flag 별도 설정 없음
- 자동 fallback 없음 (기본은 §3.2 priority 2→3→fail)
- One-off 실험이 필요하면 config 를 임시 수정 → 원복

근거: §4.1 A 와 동일 철학 — **config 가 single source of truth**. CLI flag 는 ad-hoc override 를 허용하는 구멍이라 "설정 분산 최소화" 원칙과 배치. 반복 사용 편의는 config commit 으로 해결.

---

### 결정 복합의 일관된 철학

세 결정 모두 **"Config 가 single source of truth, CLI ad-hoc override 없음"** 원칙 공유. Provider resolution 의 모든 explicit 입력이 `.onto/config.yaml` / `~/.onto/config.yaml` 한 곳에 집약. Environment-relative 한 판단 (cost / MoE 품질 / ad-hoc 변경 선호) 은 universal ladder 에 들어가지 않고, config 를 작성하는 principal 의 판단 영역으로 이양.

## 5. Test 재작성 범위

### 5.1 기존 test 삭제 / 재작성 대상

`src/core-runtime/learning/shared/llm-caller.test.ts`:
- `describe("callLlm resolveProvider cost-order", ...)` — cost-order 전제 전수 재작성. ~13 test case.
- `describe("resolveLearningProviderConfig", ...)` — provider resolution 이 통합되면 이 함수 자체 사라질 수 있음. 함수 존속 여부 결정 후 판단.
- `describe("resolveProvider ladder observability", ...)` — PR #91 에서 추가. 새 ladder 의 context-separation step 로그로 재작성. ~6 test case.

### 5.2 신규 test 필요

- Priority 2 (Codex S0) match/skip 분기
- Priority 3 (External HTTP S1) §4.1 A 반영:
  - `OntoConfig.external_http_provider: anthropic` + `ANTHROPIC_API_KEY` 있음 → matched (anthropic)
  - `external_http_provider: litellm` + `LITELLM_BASE_URL` 있음 → matched (litellm)
  - `external_http_provider` 미지정 → fail-fast with config guidance message
  - `external_http_provider: anthropic` 이지만 `ANTHROPIC_API_KEY` 없음 → credential-missing fail-fast (별개 분기)
- Priority 4 (S2 nested spawn) §4.3 ii 반영:
  - `OntoConfig.execution_realization: "host_nested_spawn"` 있음 → nested spawn executor 선택
  - 설정 없음 → priority 2/3 로 진행 (nested spawn 자동 fallback 없음 검증)
- 통합 resolver 의 ladder_trace 필드가 stderr 발행 내용과 일치
- **§4.2 no-policy 확인 test**: `entrypoint: "review"` 에서도 LiteLLM 이 정상 매칭 (warning / rejection 없음)

### 5.3 `resolveExecutionProfile` test (review-invoke.ts)

통합으로 삭제되는 함수. 기존 test 가 있다면 삭제 or 통합 resolver test 로 흡수.

## 6. Migration path

### 6.1 Breaking changes

신설/변경 OntoConfig 필드:
- **`external_http_provider: anthropic | openai | litellm`** (신설, §4.1 A) — External HTTP API 경로 선택 시 필수
- **`execution_realization: "host_nested_spawn"`** (값 추가, §4.3 ii) — nested spawn 경로 opt-in
- `api_provider` (기존) → deprecated. Priority 1 (explicit override) 에서만 소비되는지 검토 후 cleanup.
- `host_runtime` 필드 (기존) → deprecated / `execution_realization` 으로 대체
- Env `ONTO_HOST_RUNTIME` (있다면) 동일 deprecation

현재 config 파일은 `.onto/config.yaml` (없음) + `~/.onto/config.yaml` (없음) + onto-home config. **Config 신설이 필수** 가 되었으므로 (§4.1 A) 첫 실행 시 fail-fast message 가 config 예시 + 경로 힌트를 명확히 제공해야 함.

### 6.2 @deprecated marker → 실제 대체

PR #91 의 `@deprecated` 주석 → 본 구현 PR 에서 **"Replaced by context-separation ladder in PR #XXX"** 로 갱신.

### 6.3 관련 docs / memory 갱신

- `development-records/plan/20260415-litellm-provider-design.md` — cost-order 전제로 작성됨. cross-reference 갱신 필요.
- memory `feedback_local_llm_architectural_review.md` — **§4.2 결정 반영**: "ladder 정책 아님 / 특정 로컬 MoE 실험 경험 기록" 으로 scope 재정의. "review 에 Claude/Codex 필수" 는 principal 의 config 작성 참고 조언이지 자동 강제 아님 명시.
- memory `feedback_review_executor_policy.md` — **§4.3 결정 반영**: Nested spawn 은 `OntoConfig.execution_realization: "host_nested_spawn"` 로만 opt-in (CLI flag 없음) 명시.

## 7. 구현 PR scope (예상, 2026-04-18 확장)

2026-04-17~18 세션에서 drill-down 된 **review 파이프라인 8 결함 (R1~R8)** 을 본 구현 PR 이 커버하는 범위로 명시:

| 결함 ID | 내용 | 본 PR 의 해소 기제 |
|---|---|---|
| **R1** | tool-native vs inline path 의 provider propagation 비대칭 | `resolveExecutionPlan` 통합 — 두 path 가 동일 plan 참조 |
| **R2** | 2-layer silent divergence (resolveExecutionProfile vs resolveProvider) | 두 resolver 를 `resolveExecutionPlan` 로 통합 |
| **R3** | config schema 불일치 (yml/yaml, subagent_llm vs top-level) | loader yaml 우선 + yml fallback + deprecation warn. Schema validation + fail-fast |
| **R4** | retry policy 동질 처리 (transient / permanent 미구분) | `ExecutionPlan.retry_policy.classify` 에 per-error 분기 명시 |
| **R5** | model-call observability 경로 누락 (callLlmWithTools / callCodexCli) | 모든 call path 에 `emitModelCallLog` 추가 (PR #93 확장) |
| **R6** | halted_partial 에서 synthesize 불가 (all-or-nothing) | `ExecutionPlan.synthesize_strategy.quorum` 으로 partial synthesize 명시 |
| **R7** | lens 별 learn-loader context 불균형 무통제 | `ExecutionPlan.lens_dispatch.per_lens_*_budget` 으로 균등 할당 |
| **R8** | config schema 역할 분리 미문서화 | `processes/configuration.md` 에 config shape + 각 field 의 소비 경로 표 |

파일 변경 범위:
- `src/core-runtime/learning/shared/llm-caller.ts` — resolveProvider / tryNonCodexProviders 삭제, ExecutionPlan resolver 일부 이동
- `src/core-runtime/cli/review-invoke.ts` — resolveExecutionProfile 삭제 → resolveExecutionPlan 호출 진입점
- `src/core-runtime/cli/inline-http-review-unit-executor.ts` — config 소비 → plan 참조로 전환
- `src/core-runtime/cli/codex-review-unit-executor.ts` — plan.retry_policy.timeout_ms 참조 + [model-call] 로그
- `src/core-runtime/learning/shared/llm-caller.ts` 의 `callLlmWithTools` — [model-call] 로그 추가
- `src/core-runtime/discovery/config-chain.ts` — 신설 필드 schema + yaml loader
- `src/core-runtime/review/execution-plan-resolver.ts` (신설) — `resolveExecutionPlan(config) → ExecutionPlan`
- Test 재작성 (§5)
- Docs (`processes/configuration.md`) / memory 갱신 (§6.3)

규모: L+ (~500-700 줄 수정/신설, 25-30 test case). 8 결함 통합 scope 이라 초안 (250-400 줄, 15-20 test) 대비 확장. 9-lens review 2-3 round 예상. 필요 시 **PR 분할** (Critical: R1/R2/R5, High: R3/R4, Medium: R6/R7/R8) — §8 에서 우선순위 명시.

## 8. Next step — 2026-04-18 업데이트

2026-04-17~18 세션에서 v0 govern review 를 5 회 시도했고 각 시도가 다른 layer 의 silent divergence 를 드러냄. 3/4 lens 부분 완료로 F1~F4 govern finding 확보 (별도 handoff 문서 참조). 다음 세션 진입 순서:

### 우선순위 1 — Review Recovery PR-1 (Critical)

**R1 + R2 + R5** 묶음:
- `resolveExecutionPlan` 통합 resolver 신설 (R1/R2 해소)
- 모든 LLM call 경로 (`callAnthropic`, `callOpenAI`, `callLlmWithTools`, `callCodexCli`) 에 `[model-call]` observability (R5 확장)
- §3 의 ExecutionPlan schema 중 **infrastructure transport + retry_policy + plan_trace** 만 우선 구현

**이 PR 이 먼저 merged 돼야 Phase 4 govern review 가 재현 가능한 상태에서 돌 수 있음.**

### 우선순위 2 — Review Recovery PR-2 (High)

**R3 + R4** 묶음:
- Config loader 의 yaml/yml transitional support + schema validation (R3)
- `retry_policy.classify` 의 per-error-type 분기 (R4) — timeout/invalid_model/auth 는 즉시 halt, rate-limit/connection-reset 만 retry

### 우선순위 3 — Review Recovery PR-3 (Medium, Phase 4 이후 가능)

**R6 + R7 + R8** 묶음:
- ExecutionPlan 의 `synthesize_strategy.quorum` 구현 (R6)
- `lens_dispatch.per_lens_*_budget` 구현 (R7)
- `processes/configuration.md` 신설/갱신 (R8)

### 그 후 — Phase 4 govern 설계 Phase 2 진입

F1~F4 finding 을 input 으로 scope 확정:
- F1 (W-C-02 분할 문서적 명확성) — 상태 마커 도입
- F2 (BL-4 gate registry) — gate 들의 disposition 표
- F3 (§12-§13 scope bloat) — derived summary 로 재배치
- F4 (value justification) — bounded minimum 의 "왜"

### 본 sketch 의 정체성

`authority_stance: non-authoritative-design-surface` — 본 문서는 구현 PR 들의 설계 input 이며, 구현 후 각 PR 의 commit / test 가 canonical. 구현 완료 시 본 sketch 는 archive 대상.
