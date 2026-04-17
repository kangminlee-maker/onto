---
as_of: 2026-04-17
status: design-sketch
functional_area: provider-resolution-context-separation-ladder
purpose: |
  Cost-order provider resolution ladder 폐기 + context-separation 기반 새 ladder 설계.
  Cost 는 각 principal 환경에 따라 상대적이라 universal quality 축이 될 수 없고,
  context separation (메인 context 오염 방지) 은 누구에게나 항상 더 좋은 결과이므로
  정렬축으로 우월. 본 sketch 는 설계 합의용 — 구현은 후속 PR.
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

### 3.1 단일 resolver 로 통합

Layer 1 + Layer 2 를 `resolveExecutor` 하나로 통합. 반환값:
```ts
type ResolvedExecutor = {
  separation_rank: "S0" | "S1" | "S2" | "S3";
  execution_realization: "subprocess" | "ts_inline_http" | "host_nested_spawn" | "mock";
  provider_identity: "codex" | "anthropic" | "openai" | "litellm" | "claude-code" | "mock";
  credentials: { ... };  // provider 별 필수 자격
  ladder_trace: string[];  // 관찰 로그 — emitLadderLog 가 반환 전 stderr 에 발행한 줄
};
```

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

## 7. 구현 PR scope (예상)

- `src/core-runtime/learning/shared/llm-caller.ts` — resolveProvider / tryNonCodexProviders 삭제, 통합 resolveExecutor 추가. §4.1 A 반영 (config-based external_http_provider)
- `src/core-runtime/cli/review-invoke.ts` — resolveExecutionProfile 삭제. §4.2 no-policy 로 entrypoint allowlist 불필요 → 구현 단순
- `src/core-runtime/cli/inline-http-review-unit-executor.ts` — config field `external_http_provider` 소비 (env auto-resolution 제거)
- `src/core-runtime/discovery/config-chain.ts` — 신설 필드 `external_http_provider` + `execution_realization` 스키마 추가
- Test 재작성 (§5)
- Docs / memory 갱신 (§6.3)

규모: L (~250-400 줄 수정, 15-20 test case). §4 결정이 "config-only" 로 수렴한 덕에 entrypoint-layer 로직 (allowlist / warning) 불필요 → 초안 추정 대비 구현 범위 축소. 한 PR 로 가능하나 9-lens review 1-2 round 필요.

## 8. Next step (이 세션)

본 sketch 가 주체자 합의 얻으면:
1. Sketch 를 commit (별도 doc PR, scope 작음) — 설계 artifact 보존.
2. 그 후 즉시 v0 govern review 재실행 — 단 Codex explicit provider 지정 (`--provider codex`) 하여 current (여전히 cost-order 인) ladder 에서 Codex 경로 강제. Memory 정책 (Claude/Codex 필수) 준수.
3. Review 결과 → Phase 4 scope 재협의 input + memory 갱신 + handoff 작성.

본 sketch 가 수정 필요하면 주체자 feedback 반영 후 재제출.
