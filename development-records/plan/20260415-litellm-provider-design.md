---
as_of: 2026-04-15T00:00:00+09:00
supersedes: null
status: active
functional_area: llm-caller-design
purpose: |
  Background task (learn / govern / promote) LLM 호출자(llm-caller.ts)의 provider 해소를
  cost-order 기반으로 재설계한다. 상위부터: codex CLI OAuth 구독 → LiteLLM(OpenAI-compatible
  proxy) → Anthropic API key → OpenAI per-token(env 또는 auth.json). review 경로의 agent
  spawn은 별도 축(execution realization)으로, 본 설계의 대상이 아니다.
---

# Background Task LLM Provider Cost-Order 해소 설계 (learn·govern·promote)

## 1. 맥락

### 1.0 축 분리 (범위 선언)

onto에는 **LLM을 쓰는 두 개의 독립된 축**이 있다. 본 설계는 그중 하나만 다룬다.

| 축 | 대상 | 무엇을 정렬하나 | 소유 문서 |
|---|---|---|---|
| **Provider resolution** (단일-턴 API-level 호출) | **learn · govern · promote** 등 background task | "어떤 LLM 제공자·엔드포인트·키로 call을 보낼까" | **본 설계 문서** |
| Execution realization (agent spawn) | review 등 agentic 작업 | "어떻게 실행 단위를 spawn할까" — Agent Teams nested spawn, codex CLI subagent, host main-model delegation 등 | `design-principles/llm-runtime-interface-principles.md` §3.15 + 후속 별도 설계 |

두 축의 priority는 서로 공유되지 않는다. 예를 들어 "host main-model delegation"은 execution realization 축의 개념(agentic scaffold 포함)으로 provider resolution ladder에 편입되지 않는다.

### 1.1 현재 구조

onto-3는 LLM 호출 경로가 두 갈래로 나뉜다.

| 경로 | 축 | 진입점 | 기제 |
|---|---|---|---|
| learning / promote (Panel review, Judgment audit 등) | **provider resolution** | `src/core-runtime/learning/shared/llm-caller.ts:240` `callLlm()` | SDK 직호출. `resolveProvider()` (:90~155) — `ANTHROPIC_API_KEY` → `OPENAI_API_KEY` → `~/.codex/auth.json` 순. baseURL 주입 경로 없음. |
| review (9-lens, `onto review --codex`) | **execution realization** | `src/core-runtime/cli/codex-review-unit-executor.ts` | codex CLI `exec` subcommand를 subprocess로 spawn. agentic scaffold(`-C`, `-s`, `-o`) 포함. onto 자체 SDK 호출이 아니라 codex 본체의 auth·endpoint 상속. |

본 설계는 **첫 번째 행**만 대상으로 한다.

### 1.2 문제

사용자가 로컬에 LiteLLM 프록시를 구축하고 그 뒤에 로컬 모델을 둔 상태. 이를 onto에서 사용하려면 OpenAI SDK에 `baseURL`을 주입할 수 있는 입구가 필요하나, 현재 코드는 SDK를 기본 `api.openai.com`에 고정해 호출한다 (`llm-caller.ts:199-211`).

### 1.3 경계 결정 (이중 경로 유지 + cost-order 확장)

- codex CLI는 **chatgpt OAuth 정액제 billing**을 보존하기 위해 유지. OAuth 토큰은 chatgpt.com 백엔드 전용이라 LiteLLM 경유가 구조적으로 불가능(`llm-caller.ts:15-33` 주석 근거) — 단 codex CLI 자체는 OAuth 토큰으로 chatgpt.com 백엔드를 호출할 수 있으므로, onto가 codex CLI를 subprocess로 spawn하면 learning 경로에서도 구독제 billing을 활용할 수 있다.
- codex를 review 경로에서 제거하면 9-lens 리뷰가 의존하는 agentic loop (tool use, sandbox, approval gate, multi-turn scaffold)를 onto 안에서 재구현해야 하며, 이는 별도 스프린트 규모 작업. 이번 설계 범위 밖.
- 따라서 본 설계는 **background task(learn/govern/promote) 경로에 cost-order 기반 provider 해소를 도입**하고, 최상위 cost 경로로 **codex CLI subprocess spawn**(OAuth 구독제)을, 차상위로 **LiteLLM**(로컬/프록시)을, 그 뒤로 기존 API-key 경로를 둔다. review 경로(codex-review-unit-executor.ts)의 execution realization은 건드리지 않는다.
- credential 전무 상황은 본 설계에서 fail-fast 처리한다. "host main-model delegation으로 폴백한다"는 발상은 execution realization 축의 개념이므로 본 설계의 대상이 아니며, 후속 설계(Execution Realization Priority)에서 다룬다.

### 1.4 현 개발 시스템 실측 검증 (2026-04-15)

본 설계의 필요성과 우선순위 타당성을 확인하기 위해 개발 환경의 credential 상태를 실측했다.

| 확인 항목 | 결과 | 의미 |
|---|---|---|
| `codex` 바이너리 | `/opt/homebrew/bin/codex`, `codex-cli 0.120.0` | priority 3 OAuth 경로 실행 준비 OK |
| `~/.codex/auth.json` | 존재, `auth_mode: "chatgpt"`, `tokens` (access/refresh/id_token, account_id) | **priority 3 OAuth 경로가 이 시스템의 유일 실작동 경로** |
| `~/.codex/auth.json`의 `OPENAI_API_KEY` 필드 값 | 비어 있음 (chatgpt 모드 선택 시 미채워짐) | priority 6의 auth.json 서브해소는 **이 시스템에 적용 안 됨** (API-key 모드 사용자용) |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` env | 모두 없음 | priority 5, 6의 env 서브해소 경로 비활성 |
| `LITELLM_BASE_URL` / `llm_base_url` | 없음 | priority 4 비활성 |

**현 시스템에서 기존 `llm-caller.ts` 동작**: priority 1~3(env 기반) 모두 실패 → auth.json의 OPENAI_API_KEY 필드도 비어 있으므로 priority 4(기존 코드 기준)도 실패 → chatgpt OAuth 감지 → "not supported" 에러로 fail-fast. **learn/govern이 지금 실행 불가능**.

**본 설계 적용 후**: priority 3 codex CLI OAuth 경로가 개설되어 learn/govern이 처음으로 동작 가능해진다. 이 사용자에게 priority 3은 "비용 최적화"가 아니라 "동작 전제 조건"이다. Priority 6의 auth.json 서브해소는 여전히 설계 보편성을 위해 유지(API-key 모드 사용자용)하나 본 시스템에는 적용되지 않음.

**설계 구현상 주의**: `codex exec` 호출 시 `--ephemeral` 플래그를 추가해 codex 세션 디스크 영속화를 피한다(learning은 단일-턴이므로 세션 파일 불요). §3.5a에 반영.

**런타임 smoke test 결과** (2026-04-15 구현 후 실측): 짧은 프롬프트("ping"→"pong") 단일 호출로 priority 3 경로 동작 확인. `effective_base_url="codex-cli://oauth"`, `declared_billing_mode="subscription"`, model_id sentinel `"codex-default"` 기록됨.

**D12 (신규, smoke test 후 결정)**: `DEFAULT_ANTHROPIC_MODEL` / `DEFAULT_OPENAI_MODEL` 하드코딩 **완전 제거**. 이유: (1) 초기 스모크 테스트에서 `gpt-4o-mini` fallback이 chatgpt account에 의해 거부당하는 사례 확인 — 하드코딩된 모델은 특정 계정 권한에 안 맞을 수 있음. (2) 모델 선택은 비용·품질·계정 호환성이 걸린 사용자 결정이므로 라이브러리 코드에서 암묵적으로 가정하면 stale·mismatch 위험. 결과: anthropic / openai / litellm 경로는 model 미해소 시 fail-fast. codex는 `-m` 생략 시 codex CLI가 자체 기본값을 선택하므로 예외.

**D13 (신규)**: 모델 설정 위치를 `OntoConfig.codex.model` 패턴으로 **모든 provider에 대칭 확장**. 필드: `anthropic?: { model?: string }`, `openai?: { model?: string }`, `litellm?: { model?: string }`, 기존 `codex?: { model?, effort? }`.

**D14 (신규, 로컬 검토 반영)**: Per-provider model은 **auto-resolution에서도 적용**된다. 초안에서는 "bridge가 provider를 모르니 auto-resolution엔 top-level model만 적용"이라는 제약이 있었으나 이는 "anthropic.model을 설정해두고 api_provider는 안 썼는데 왜 안 먹지?" UX 놀람을 만든다. 해결: `LlmCallConfig.models_per_provider?: { anthropic?, openai?, litellm?, codex? }` 필드 추가. Bridge가 config.{provider}.model 전부를 여기에 담아 전달하고, dispatch가 resolveProvider 결과 provider에 맞는 모델을 조회. 최종 해소 순서: (1) caller model_id > (2) models_per_provider[resolved] > (3) fail-fast(api-key) 또는 codex CLI 기본값(codex).

### 1.4 상위 원칙 정합성

`design-principles/llm-runtime-interface-principles.md` §3.15 (host/runtime neutrality)는 `execution_realization`과 `host_runtime`을 분리 축으로 본다. 본 설계는 learning 경로에 대해 "provider" 축을 추가로 분리하는 셈이며, 동일 원칙의 자연스러운 연장이다.

## 2. 확정된 결정 7개

| ID | 결정 | 이유 |
|---|---|---|
| D1 | `api_provider` enum에 `"litellm"`, `"codex"` 추가 (openai 재사용 아님) | 과금·라우팅·모델 네임스페이스가 각기 다름. codex CLI OAuth는 구독제 flat-rate, litellm은 로컬/프록시 라우팅(audit identity 별도 — 요청 라우팅 정책·downstream 모델 네임스페이스가 api.openai.com 본가와 다름), openai/anthropic은 per-token. 로그·감사에서 구분되어야 함. |
| D2 | config 필드명 `llm_base_url` | provider-agnostic. OpenAI SDK env `OPENAI_BASE_URL`과 멘탈 모델 호환. |
| D3 | **Provider 해소 우선순위는 비용 순 (6단계)** — caller-explicit → config-explicit non-auto (사용자 override) → **codex CLI OAuth 구독** → LiteLLM → Anthropic API key → OpenAI per-token (env → auth.json 서브해소). `llm_base_url` 서브 해소는 CLI flag > env > project config > onto-home config. | 한계비용 순서: (1) codex 구독 — flat-rate 기지불, 호출당 0, (2) LiteLLM — 로컬 시 0·유료 backend 시 variable, (3) API-key 경로 — per-token 과금. 명시적 사용자 override만 이 순서를 거스를 수 있음. Credential 전무 시 fail-fast — host delegation 폴백은 execution realization 축의 개념이므로 본 ladder에 편입하지 않음. |
| D4 | `LlmCallResult`에 `effective_base_url?: string` 추가 | §3 evidence/provenance boundary 정합. 감사·비용 분석 시 필수. |
| D5 (개정됨) | 기존 chatgpt OAuth "not supported" 에러 메시지는 **삭제**하고, OAuth를 cost-order 최상위 공식 경로로 승격. codex CLI subprocess spawn이 새 호출 기제(`--ephemeral` 포함). | 이전 D5는 "OAuth는 LiteLLM으로도 못 쓴다"는 사실에 근거했으나, 본 설계에서 codex CLI를 subprocess로 부르는 경로를 추가하면서 OAuth 토큰이 공식 루트를 갖게 됨. 구독제의 cost 우위(flat-rate, 한계비용 0)가 가장 큰 설계 동기. §1.4 실측에서 이 경로가 본 시스템의 유일 실작동 경로임을 확인함. |
| D6 | `authority/core-lexicon.yaml`에 `LlmCompatibleProxy` 개념 등재 + `LlmBillingMode` 등재. "LiteLLM"·"codex CLI"는 README/plan에만. | Authority rank 1은 벤더 중립 개념 공간. `LlmBillingMode`는 cost-order 결정의 의미론적 근거(subscription vs per_token)를 rank 1에 고정. |
| D8 (철회) | 기존안: host main-model delegation을 priority 7 fallback으로 추가. → **본 설계에서 삭제**. | 재분류 이유: "host main-model delegation"은 agent spawn 기제이므로 provider resolution 축이 아닌 execution realization 축에 속한다. 본 설계(background task provider ladder)에 포함시키면 두 축의 priority가 섞여 개념적 일관성이 깨진다. 후속 설계 "Execution Realization Priority"에서 다룬다. |
| D9 | **OpenAI API key 경로의 env / auth.json을 단일 priority로 병합** — 둘 다 동일한 OpenAI per-token provider를 가리키므로 별도 priority 슬롯이 아니라 priority 6 내부의 key 해소 서브순서(env → auth.json)로 둔다. | 두 경로의 wire-level 동작(`api.openai.com/v1`, per_token billing)이 완전히 동일. 별도 priority로 분리하면 "같은 provider인데 순위가 다르다"는 개념적 중복 발생. 서브해소 패턴(`llm_base_url`의 CLI flag > env > config)과 구조적 일관성. |
| D10 (신규, 리뷰 반영) | **`codex` provider는 OAuth 구독 실행에만 바인드.** `~/.codex/auth.json`의 `OPENAI_API_KEY` 필드(API-key mode)는 `openai` provider의 priority 6 서브해소에서만 사용되며, `codex` provider로는 해소되지 않는다. | 리뷰의 `dependency:3` finding — 같은 auth.json 파일이 두 provider에 걸치면 provider/executor diamond가 생긴다. codex = "OAuth + codex CLI subprocess" 전용으로 고정하면 provider identity와 execution mechanism이 명확히 분리됨. |
| D11 (신규, 리뷰 반영) | **`LlmCallResult.billing_mode`를 `declared_billing_mode`로 renaming + 주석 강화.** 필드가 실측 billing이 아니라 "onto가 cost-order 결정에 사용한 선언적 분류"임을 명시. authority-level 개념 `LlmBillingMode`는 lexicon에 rank-1 분류로 유지. | 리뷰 finding #5 — 필드명이 truth처럼 들리지만 LiteLLM 같은 불투명 backend는 보수적으로 기록되기 때문에 truth는 아님. 이름을 `declared_*`로 바꿔 의미론을 정직하게 표현. |
| D7 | 스코프: `llm-caller.ts` + learning/promote 호출자. review 경로 불변. agentic loop 재구현 논외. | 1.3 경계 결정과 일치. §2 Non-Goals에 명시. |

## 3. 변경 스펙

### 3.1 `OntoConfig` 확장 (`src/core-runtime/discovery/config-chain.ts`)

추가 필드:

```ts
export interface OntoConfig {
  // ...기존 필드 유지...

  /**
   * API provider for api executor: anthropic | openai | litellm
   * (extended — "litellm" added for OpenAI-compatible proxy routing)
   */
  api_provider?: string;   // 기존 필드, 타입 주석만 확장

  /**
   * Base URL for LLM-compatible proxy (LiteLLM 등).
   * Used when api_provider="litellm". Ignored otherwise.
   * Resolution: CLI flag > env (LITELLM_BASE_URL) > this field > onto-home config.
   */
  llm_base_url?: string;

  /**
   * codex OAuth 자격이 감지되었으나 codex 바이너리가 PATH에 없을 때
   * 세션당 1회 표시되는 설치 안내 로그를 끈다. 기본 false(안내 표시).
   * 회사 보안 정책 등으로 codex 설치가 불가능한 환경용 opt-out.
   */
  suppress_codex_install_notice?: boolean;
}
```

기존 필드(`api_provider`, `model`)는 **타입 정의 자체는 `string`**이라 wire-level 변경 없음. 유효값 문서만 "anthropic | openai | litellm | codex"로 확장.

### 3.2 `LlmCallConfig` 확장 (`llm-caller.ts:49-53`)

```ts
export interface LlmCallConfig {
  provider: "anthropic" | "openai" | "litellm" | "codex";
  model_id: string;
  max_tokens: number;
  base_url?: string;   // 신규. litellm 또는 openai custom endpoint용.
  // codex provider는 model_id를 codex CLI의 -m flag로 전달. base_url 무시.
}
```

### 3.3 `LlmCallResult` 확장 (`llm-caller.ts:55-60`)

```ts
export interface LlmCallResult {
  text: string;
  input_tokens: number;
  output_tokens: number;
  model_id: string;
  effective_base_url?: string;  // 신규. 실제 호출 endpoint (audit).
  /**
   * 신규. onto가 cost-order 결정에 사용한 선언적 billing 분류.
   * 실측 billing truth가 아니라 "어느 ladder 슬롯에서 해소됐는지"의 기록이다.
   * 예: LiteLLM이 로컬 모델을 태워도 downstream이 불투명하므로 보수적으로 per_token으로 기록.
   * authority-level 개념 분류는 lexicon의 LlmBillingMode 참조.
   */
  declared_billing_mode?: "subscription" | "per_token";
}
```

- anthropic: `effective_base_url="https://api.anthropic.com"`, `declared_billing_mode="per_token"`
- openai: `effective_base_url="https://api.openai.com/v1"`, `declared_billing_mode="per_token"`
- litellm: `effective_base_url=<resolved URL>`, `declared_billing_mode="per_token"` (보수적 — downstream 불투명)
- codex (OAuth): `effective_base_url="codex-cli://oauth"` (sentinel), `declared_billing_mode="subscription"`
- codex auth.json API-key mode는 openai provider 경로에서 처리되며 openai와 동일 값 기록.

### 3.4 `resolveProvider()` 변경 (`llm-caller.ts:90~155`)

**원칙**: 우선순위는 **비용 순**이다. 구독제(flat-rate, 한계비용 0)를 가장 앞, 로컬/프록시(variable, 로컬 모델 시 0)를 그 다음, per-token 과금(API key)을 가장 뒤에 둔다. 단 caller가 코드 레벨에서 명시적으로 provider를 지정하거나, config에서 명시적 provider를 선택한 경우는 **사용자의 명시적 오버라이드**로 간주해 cost-order 규칙에 우선한다.

우선순위 (높은 것부터, 6단계):

1. **Caller-explicit**: `callLlm(..., { provider: "anthropic" | "openai" | "litellm" | "codex" })`. 최고 우선순위 — 호출자의 의도가 어떤 resolution보다 앞선다.
2. **Config-explicit (비-auto)**: `OntoConfig.api_provider`가 `"openai"` · `"anthropic"` · `"litellm"` · `"codex"` 중 하나로 명시. 사용자 의도적 선택으로 간주, cost-order보다 우선. 해당 provider의 credential이 없으면 fail-fast (§3.7).
3. **codex CLI OAuth 구독** (cost-order 제1순위):
   - `~/.codex/auth.json`이 존재하고 `auth_mode === "chatgpt"` 또는 `tokens.access_token` 필드 존재, AND
   - `codex` 바이너리가 PATH에 있음 (`which codex` 성공).
   둘 다 true면 이 경로가 선택됨. OAuth 토큰은 chatgpt.com 백엔드 전용이라 codex CLI만 사용 가능하므로 subprocess spawn으로 호출 (§3.5a). **이 경로는 OAuth 구독 실행에만 바인드된다(D10) — `~/.codex/auth.json`의 `OPENAI_API_KEY` 필드(API-key mode)는 여기서 처리되지 않고 priority 6의 openai 서브해소에서만 사용된다.**
4. **LiteLLM selected** (cost-order 제2순위):
   - `OntoConfig.api_provider === "litellm"`, 또는
   - `llm_base_url`이 어느 경로로든 해소됨 (CLI flag > env `LITELLM_BASE_URL` > project config > onto-home config).
   선택됐는데 base URL 최종 해소 불가면 fail-fast.
5. **Anthropic API key** (per-token 과금) — `ANTHROPIC_API_KEY` env 존재.
6. **OpenAI per-token** (per-token 과금) — 키 해소 서브순서:
   a. `OPENAI_API_KEY` env (명시적 export, 높은 의도 신호)
   b. `~/.codex/auth.json`의 `OPENAI_API_KEY` 필드 (codex CLI의 API-key mode 설정 시 부수적으로 저장된 키. env 없을 때 폴백)
   둘 중 하나라도 있으면 동일한 OpenAI per-token 경로로 해소됨. `effective_base_url`·`declared_billing_mode` 동일.

**Credential 전무 시**: fail-fast (§3.7 d). "host main-model delegation으로 폴백"은 execution realization 축의 개념이므로 본 ladder에 편입되지 않는다(D8 철회, §1.0 축 분리).

**codex OAuth vs codex API-key 분기**: 같은 `~/.codex/auth.json` 파일이 두 우선순위에 등장한다. #3은 OAuth mode(chatgpt.com subscription), #7은 API-key mode(api.openai.com per-token). 두 mode는 같은 파일의 다른 필드(`auth_mode`/`tokens.access_token` vs `OPENAI_API_KEY`)로 구별되며 과금 체계가 완전히 다르다. 기존 코드(`llm-caller.ts:109-137`)는 OAuth mode를 의도적으로 무시하고 API-key mode만 사용했는데, 본 설계에서는 OAuth mode를 최상위로 승격하고 호출 방식을 SDK 직접 호출에서 codex CLI subprocess spawn으로 전환한다.

**Backward compat 재해석**: 기존 사용자 중 `~/.codex/auth.json`이 OAuth mode로 있고 `ANTHROPIC_API_KEY`도 set해 둔 경우, 이전에는 Anthropic으로 라우팅됐지만 신규 규칙에서는 codex OAuth로 전환된다. 이는 **의도된 비용 절감 전환**이며 §7.4 감사 포인트에 fleet-wide 관측으로 포함. 명시적으로 Anthropic을 원하면 `OntoConfig.api_provider: anthropic`을 config에 기재해 override.

`ResolvedProvider` 타입 확장:

```ts
interface ResolvedProvider {
  provider: "anthropic" | "openai" | "litellm";
  apiKey: string;
  defaultModel: string;
  baseUrl?: string;   // 신규. litellm / openai override용.
}
```

litellm 경로의 `apiKey`: `LITELLM_API_KEY` env → config `litellm_api_key` → dummy string `"sk-litellm-proxy"` (프록시가 자체 인증하는 경우). 결정 D5 정합성상 fallback은 명시적 env 부재 시에만.

### 3.5a `callCodexCli()` 신설 (신규 함수, `llm-caller.ts`)

OAuth 구독 경로 전용 subprocess spawn 함수. `codex-review-unit-executor.ts:55-138`의 패턴을 참조하되 **learning 경로용으로 단순화**: sandbox/projectRoot/output-file 인자 없음, 단일 프롬프트 → stdout 응답의 단방향 호출.

```ts
async function callCodexCli(
  systemPrompt: string,
  userPrompt: string,
  modelId?: string,        // 없으면 codex default model
  reasoningEffort?: string, // OntoConfig.codex.effort 또는 config.reasoning_effort
  timeoutMs?: number,       // 기본 DEFAULT_TIMEOUT_MS
): Promise<LlmCallResult> {
  const { spawn } = await import("node:child_process");

  const args: string[] = ["exec", "--skip-git-repo-check", "--ephemeral"];
  if (modelId) args.push("-m", modelId);
  if (reasoningEffort) args.push("-c", `model_reasoning_effort="${reasoningEffort}"`);
  args.push("-");  // stdin prompt mode

  const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

  // spawn codex, pipe combinedPrompt → stdin, collect stdout, handle ENOENT/timeout/non-zero exit.
  // 에러 처리:
  //   - ENOENT → "codex CLI not found on PATH. codex OAuth 경로를 쓰려면 codex를 설치하세요."
  //   - 비-0 exit → stderr 본문을 에러로 throw
  //   - timeout → child.kill() + 명시적 timeout 에러

  // 반환:
  return {
    text: stdout.trim(),
    input_tokens: estimateTokens(combinedPrompt),   // codex exec는 토큰 카운트 미반환. 문자열 길이 기반 근사 (§3.5a 주의사항 참조).
    output_tokens: estimateTokens(stdout),
    model_id: modelId ?? "codex-default",
    effective_base_url: "codex-cli://oauth",
    billing_mode: "subscription",
  };
}
```

**주의사항**:

1. **토큰 카운트 부정확**: codex CLI `exec`의 stdout은 모델 응답 텍스트이며 사용량 메타데이터를 기본 반환하지 않는다. `estimateTokens` 근사치(≈ 문자수/4)로 채우되 `LlmCallResult`에 `tokens_estimated: true` flag를 추가할지 여부는 §7.4 후속 검토 항목. 학습 promote의 비용 감사에서 codex 경로는 "구독 사용량 근사"로 명시.
2. **timeout 정책**: anthropic/openai와 동일 `DEFAULT_TIMEOUT_MS` (120s). codex exec는 긴 reasoning도 할 수 있으니 learning 경로에서는 실제 프롬프트 크기 기준 충분한 여유.
3. **model/effort 소스**: `OntoConfig.codex.model` / `OntoConfig.codex.effort`가 이미 존재(`config-chain.ts:44-48`). 재사용.
4. **sandbox·projectRoot 불필요**: learning 경로는 파일 읽기/쓰기 agentic 작업이 아닌 단일-턴 텍스트 생성. review 경로의 `-C projectRoot -s sandbox-mode`는 채택하지 않는다. smallest sufficient bundle 원칙(§3.8 llm-runtime-interface-principles).
5. **`--ephemeral` 사용**: codex는 기본적으로 `exec` 호출마다 세션 파일을 디스크에 영속화하나 learning 단일-턴 호출에는 불필요. `--ephemeral`로 디스크 오염 방지(§1.4 검증 결과 반영).

### 3.5b `callOpenAI()` 변경 (`llm-caller.ts:199-230`)

시그니처에 `baseUrl?: string` 추가하고 OpenAI 클라이언트에 전파:

```ts
async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  modelId: string,
  maxTokens: number,
  baseUrl?: string,   // 신규
): Promise<LlmCallResult> {
  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl,   // 신규. undefined면 SDK 기본값.
    timeout: DEFAULT_TIMEOUT_MS,
    maxRetries: DEFAULT_MAX_RETRIES,
  });
  // ...나머지 기존 로직...
  return {
    // ...
    effective_base_url: baseUrl ?? "https://api.openai.com/v1",
  };
}
```

litellm provider는 별도 함수 신설하지 않고 `callOpenAI`를 재사용. 이유: wire-format이 OpenAI 호환이므로 한 함수로 충분하며 D1에서 분리한 것은 **provider 식별자**와 **결정 트리**이지 호출 코드 자체가 아니다.

### 3.6 `callLlm()` 변경 (`llm-caller.ts:240-258`)

resolve된 provider에 따라 4-way dispatch:

- `"codex"` → `callCodexCli(systemPrompt, userPrompt, modelId, reasoningEffort, timeout)`
- `"litellm"` → `callOpenAI(..., baseUrl=resolved.baseUrl)` (provider 식별자만 `"litellm"`로 보존, 호출 함수는 openai와 공용. audit identity는 provider 식별자로 구별)
- `"anthropic"` → `callAnthropic(...)` (기존)
- `"openai"` → `callOpenAI(...)` (기존)

`LlmCallResult.effective_base_url`과 `declared_billing_mode`는 각 호출 함수가 책임지고 채운다.

### 3.6a Config → callLlm 브리지 (리뷰 finding #3 해소)

`resolveConfigChain()`(`src/core-runtime/discovery/config-chain.ts`)이 생산한 `OntoConfig`와 CLI flag override가 `callLlm()`에 전파되는 경로를 명시한다. 기존 문서는 이 지점을 비워두어 "config가 어떻게 해소되어 provider 선택까지 오는가"가 불명확했다.

**브리지 함수 신설** (`llm-caller.ts`에 추가):

```ts
export interface LearningProviderContext {
  config: OntoConfig;           // resolveConfigChain 결과
  cliOverrides?: {              // CLI flag (예: --provider, --llm-base-url, --model)
    provider?: "anthropic" | "openai" | "litellm" | "codex";
    llm_base_url?: string;
    model?: string;
  };
}

/**
 * OntoConfig + CLI overrides를 callLlm이 소비할 수 있는 Partial<LlmCallConfig>로 변환.
 * resolveProvider의 입력은 이 함수 결과이며, 외부 호출자(learning/promote 등)는
 * 직접 Partial<LlmCallConfig>를 만들지 않고 LearningProviderContext를 넘긴다.
 */
export function resolveLearningProviderConfig(
  ctx: LearningProviderContext,
): Partial<LlmCallConfig> {
  const cli = ctx.cliOverrides ?? {};
  const config = ctx.config;
  return {
    provider: cli.provider ?? (config.api_provider as any),
    model_id: cli.model ?? config.model,
    base_url: cli.llm_base_url ?? config.llm_base_url,
    // max_tokens는 호출자 컨텍스트에 따라 다르므로 callLlm 인자로 직접 전달.
  };
}
```

**호출자 접점** — learning/promote의 진입점(예: `panel-reviewer.ts`, `promote-executor.ts`, `judgment-auditor.ts`):

```ts
// before (기존):
const result = await callLlm(system, user, { max_tokens: 2048 });

// after (변경):
const providerConfig = resolveLearningProviderConfig({
  config: ontoConfig,         // runtime이 이미 해소해 보유 중
  cliOverrides: cliFlags,     // CLI 진입점에서 전달
});
const result = await callLlm(system, user, { ...providerConfig, max_tokens: 2048 });
```

이 브리지를 명시함으로써 "config-explicit 우선순위가 실제 호출 경로에서 어떻게 동작하는지"가 코드 레벨에서 검증 가능해진다.

### 3.7 에러 메시지 변경

네 가지 fail-fast 메시지.

**(a) LiteLLM 선택되었으나 base URL 미해소** — §3.4 priority 4에서 "LiteLLM selected"로 판정됐으나 실제 URL이 resolve 안 됨 (priority 번호 변경 없음):

```
api_provider=litellm 또는 llm_base_url 설정이 감지되었으나 endpoint가 해소되지 않았습니다.
해소 우선순위: CLI flag > env LITELLM_BASE_URL > project .onto/config.yml > onto-home config.
예: export LITELLM_BASE_URL=http://localhost:4000/v1
```

**(b) Config-explicit, credential 부재** — §3.4 priority 2에서 명시된 provider의 credential이 없음:

```
api_provider={openai|anthropic|litellm|codex}이 config에 명시되었으나 {해당 credential}이 없습니다.
  - openai: OPENAI_API_KEY
  - anthropic: ANTHROPIC_API_KEY
  - litellm: llm_base_url
  - codex: ~/.codex/auth.json (OAuth 또는 API-key mode) + codex 바이너리
명시적 provider override를 사용하려면 위 credential을 구성하세요.
비용이 낮은 경로를 원하시면 api_provider를 제거하고 cost-order 자동 해소에 맡기세요.
```

**(c) codex OAuth 선택됐으나 codex 바이너리 부재** — §3.4 priority 3에서 OAuth 토큰은 감지했으나 `codex`가 PATH에 없음. **동작: 다른 credential이 있으면 다음 cost-order 경로로 graceful fallback하되 세션당 1회 STDERR 설치 안내 로그**. 다른 credential도 전무이면 (d)로 이어지되 설치 안내를 1번 항목에 강조.

폴백 진행 시 STDERR 안내 로그:

```
[onto] 구독제 cost-order 최상위 경로(codex OAuth)를 놓치고 있습니다.
~/.codex/auth.json에 chatgpt OAuth 자격이 있으나 codex 바이너리를 PATH에서 찾을 수 없습니다.

codex 를 설치하면 이 경로가 자동으로 활성화됩니다 (구독제, 호출당 한계비용 0):
  설치: https://github.com/openai/codex  (또는 brew install codex / npm i -g @openai/codex 등 환경별 안내 참조)
  설치 후 `codex --version` 으로 PATH 인식 확인.

지금은 다음 cost-order 경로로 폴백합니다: {fallback_provider} (declared_billing_mode={fallback_mode}).
명시적으로 다른 provider를 쓰려면 .onto/config.yml에 api_provider를 지정하세요.
```

**Opt-out**: `.onto/config.yml`에 `suppress_codex_install_notice: true`로 세션당 안내 로그를 끌 수 있다. 자격은 있지만 영구적으로 codex를 안 쓰기로 한 환경(회사 보안 정책 등)을 위한 escape hatch.

**(d) 어떤 provider도 해소 불가** — priority 1~6이 모두 미해소. cost-order 가이던스:

```
background task용 LLM provider를 해소할 수 없습니다.

권장 순서(비용 낮은 순):
  1. codex OAuth 구독: ~/.codex/auth.json을 chatgpt 모드로 구성 + codex 바이너리 설치 (구독제, 한계비용 0)
  2. LiteLLM: llm_base_url을 .onto/config.yml에 설정하거나 LITELLM_BASE_URL을 export (로컬 모델 사용 시 0)
  3. Anthropic API: ANTHROPIC_API_KEY를 export (per-token 과금)
  4. OpenAI per-token: OPENAI_API_KEY를 export, 또는 ~/.codex/auth.json의 OPENAI_API_KEY 필드 (per-token 과금)
```

**chatgpt OAuth 자격은 있지만 codex 바이너리 부재 케이스에서는 (c)의 설치 안내가 먼저 출력된 뒤 본 (d)가 이어진다** — 즉 "OAuth 있으니 codex 설치만 하면 된다"가 가장 행동 장벽이 낮다는 점이 시각적으로 앞에 위치.

기존 chatgpt OAuth "not supported" 에러 문구(`llm-caller.ts:144-153`)는 **삭제된다** — OAuth 경로가 이제 공식 지원되므로. 해당 블록 전체를 (c)+(d) 메시지로 대체.

**참고**: 본 ladder는 background task(learn/govern/promote) provider resolution 전용이다. credential 전무 + Claude Code 세션 안에서의 host main-model delegation은 execution realization 축의 fallback이며 별도 설계(§5 Non-Goals)에서 다룬다.

## 4. Authority 변경 (`authority/core-lexicon.yaml`)

`entities:` 섹션에 두 entry 추가.

### 4.1 `LlmCompatibleProxy`

```yaml
LlmCompatibleProxy:
  canonical_label: "LlmCompatibleProxy"
  korean_label: "LLM 호환 프록시"
  definition: "공용 LLM provider(OpenAI 등)의 wire-format을 유지한 채 백엔드 모델·라우팅·과금을 치환하는 중간 계층. onto는 이를 별도 provider 축으로 인식한다"
  core_value: "이 개념이 없으면 로컬 모델·자체 호스팅·비용 관측·벤더 다중화 요구를 openai provider와 구분 없이 혼입해, 과금 경로·인증 모드·모델 네임스페이스가 섞인다"
  attributes:
    shared: []
    local:
      wire_format:
        definition: "프록시가 준수하는 상위 공용 API의 와이어 포맷"
        values: ["openai", "anthropic"]
      base_url_resolution:
        definition: "엔드포인트 결정 경로"
        values: ["cli_flag", "env", "project_config", "onto_home_config"]
  execution_rules_ref:
    provider_resolution: "src/core-runtime/learning/shared/llm-caller.ts:resolveProvider"
    config_schema: "src/core-runtime/discovery/config-chain.ts:OntoConfig"
  notes:
    - "구현 인스턴스 예: LiteLLM (openai wire-format). 벤더 이름은 lexicon에 직접 넣지 않는다"
    - "codex CLI OAuth 경로와 구별됨 — OAuth 토큰은 chatgpt.com 백엔드 전용이라 프록시 wire-format으로 접근 불가. subprocess spawn이 필요하며 이는 LlmBillingMode=subscription 경로로 별도 분류된다"
```

### 4.2 `LlmBillingMode`

```yaml
LlmBillingMode:
  canonical_label: "LlmBillingMode"
  korean_label: "LLM 과금 모드"
  definition: "provider 호출당 한계비용 구조의 분류. onto의 provider 해소 우선순위(cost-order)의 의미론적 근거"
  core_value: "이 개념이 없으면 provider 목록이 단순 열거로만 남아 '왜 이 순서인지'가 코드에서만 설명되고 개념 공간에서 사라진다. 구독제와 per-token 과금은 같은 호출 빈도에서도 비용 구조가 완전히 다르므로 rank 1에서 구분되어야 한다"
  attributes:
    shared: []
    local:
      mode:
        definition: "과금 방식"
        values:
          subscription: "사전 정액제. 호출당 한계비용이 0에 수렴 (rate limit까지). 예: codex CLI의 chatgpt OAuth"
          per_token: "입출력 토큰 수 기반 과금. 호출량과 비용이 선형. 예: Anthropic API, OpenAI API, 유료 LiteLLM backend"
          variable: "경로별로 0 또는 per-token일 수 있음. LiteLLM처럼 프록시 downstream이 불투명할 때 사용"
      cost_order_rank:
        definition: "provider 해소 우선순위 결정 시 과금 모드별 랭크 (낮은 숫자 = 더 앞)"
        values:
          subscription: 1
          variable: 2
          per_token: 3
  execution_rules_ref:
    resolution_ladder: "src/core-runtime/learning/shared/llm-caller.ts:resolveProvider (§3.4)"
    design_record: "development-records/plan/20260415-litellm-provider-design.md §3.4"
  notes:
    - "명시적 사용자 override(config.api_provider 또는 caller-explicit)는 이 랭크를 거스를 수 있다 — override는 cost가 아니라 의도에 복무한다"
    - "LiteLLM을 variable로 분류하는 이유: 프록시 downstream이 로컬 모델이면 0, 유료 API backend면 per-token. 감사 관점에서는 보수적으로 per-token 신호를 기록(§3.3) 하지만 cost-order 랭크는 variable로 둔다 (로컬 사용 의도를 수용)"
```

## 5. Non-Goals (스코프 제외)

| 항목 | 이유 |
|---|---|
| `review --codex` 경로(codex-review-unit-executor.ts) 변경 | review의 agentic scaffold(tool use, sandbox, multi-turn)는 그대로. 본 설계의 codex CLI 호출은 **learning 경로용 단일-턴 subprocess**로 review와 callsite·인자 구성이 다르다(§3.5a). |
| codex CLI 바이너리 자체의 수정 또는 fork | 바이너리는 외부 의존. onto는 호출 방식만 추가. |
| review 경로를 llm-caller.ts 경유로 리라우팅 | agentic loop 재구현 = 별도 스프린트 규모. 본 설계의 learning 경로 codex 호출과는 목적·요구 기능이 다름. |
| Anthropic-compatible proxy 지원 | 현재 수요 없음. `LlmCompatibleProxy.wire_format` 축이 일반화해 있으니 필요 시 후속. |
| litellm 프록시 자체 설정·운영 | onto 레포 밖. README에 링크만. |
| 기존 mock provider 변경 | `ONTO_LLM_MOCK=1` 경로는 provider 결정 이전에 선분기되므로 영향 없음 (`llm-caller.ts:246-248`). |
| review 로그·record에 provider 필드 추가 | review 경로 자체를 안 건드리므로 불요. learning record에만 `effective_base_url`·`billing_mode` 반영. |
| codex CLI 토큰 카운트 정확화 | codex exec는 사용량 메타를 기본 반환하지 않음. 추정치 사용 + `tokens_estimated` flag는 §7.4 후속 검토. |
| **Execution realization (agent spawn) priority** | 본 설계는 provider resolution 축만 다룸. review의 Agent Teams nested spawn, codex CLI subagent, host main-model delegation 등 agent spawn 기제의 우선순위는 **별도 설계**(Execution Realization Priority, 다음 설계 문서)에서 다룬다. 해당 축은 "메인 컨텍스트 소진을 감수해서라도 실행이 우선"이라는 원칙이 적용되며, main-model이 해당 축에서는 마지막 fallback으로 포함된다. |
| background task를 host main-model로 delegation | execution realization 축의 개념. §1.0 축 분리 참조. 수요가 생기면 "background task agent spawn" 축을 신설해 다룬다. |

## 6. 테스트 전략

### 6.1 단위 테스트 (`llm-caller.ts` 대응)

현재 onto-3에는 `llm-caller`에 대한 직접 단위 테스트가 없고 `e2e-promote.test.ts`가 간접 커버한다. 아래 케이스 추가 — **cost-order 우선순위 규칙의 각 분기를 전수 커버**한다.

| 케이스 | 입력 | 기대 provider | 근거 |
|---|---|---|---|
| T1 (caller-explicit) | `callLlm(..., { provider: "anthropic" })` + env에 LITELLM_BASE_URL·OPENAI_KEY·codex OAuth 모두 존재 | anthropic | §3.4 priority 1 |
| T1b (캐링-explicit invalid) | `callLlm(..., { provider: "main-model" })` | TypeScript 컴파일 에러 또는 runtime rejection | `LlmCallConfig.provider` enum에서 제거됐으므로 불가 — execution realization 축 개념 |
| T2 (config-explicit, credential 있음) | `api_provider: "openai"`, `OPENAI_API_KEY` set, codex OAuth도 존재 | openai | priority 2 — 명시적 override가 cost-order보다 위 |
| T3 (config-explicit, credential 없음) | `api_provider: "anthropic"` in config, `ANTHROPIC_API_KEY` 없음 | fail-fast (b) | §3.7 (b) |
| T4 (codex OAuth 자동 감지) | `~/.codex/auth.json` chatgpt OAuth + codex 바이너리 PATH 있음, `ANTHROPIC_API_KEY`·`LITELLM_BASE_URL`도 set | codex | priority 3 — cost-order 최상위 |
| T5a (codex OAuth, no binary, 다른 자격 있음) | chatgpt OAuth + codex 바이너리 없음 + `ANTHROPIC_API_KEY` set | anthropic (폴백) + STDERR에 설치 안내 로그 1회 | §3.7 (c) graceful fallback |
| T5b (codex OAuth, no binary, 자격 전무) | chatgpt OAuth + 바이너리 없음 + credential 전무 | fail-fast (c)+(d) — 설치 안내 1번 강조된 가이던스 | §3.7 (c)+(d). `CLAUDECODE=1` 유무와 무관 — host delegation은 본 설계 축이 아님 |
| T5c (opt-out) | 위 T5a + `suppress_codex_install_notice: true` | anthropic 폴백, 안내 로그 없음 | §3.7 (c) opt-out |
| T6 (litellm via api_provider) | `api_provider: "litellm"`, `llm_base_url=http://x:4000/v1`, 기타 credential 있음, codex OAuth 없음 | litellm | priority 4 |
| T7 (litellm via env만) | `LITELLM_BASE_URL` export, codex OAuth 없음 | litellm | priority 4 — env 자체가 intent 신호 |
| T8 (litellm 선택, URL 미해소) | `api_provider: "litellm"`, `llm_base_url` 전부 미존재 | fail-fast (a) | §3.7 (a) |
| T9 (llm_base_url 경로 우선순위) | CLI flag·env·project·onto-home 각각 다른 URL | CLI flag 값 승리 | sub-resolution (D3) |
| T10 (legacy env-only, Anthropic) | `ANTHROPIC_API_KEY`만, codex OAuth·LiteLLM 모두 없음 | anthropic | priority 5, backward compat |
| T11 (legacy env-only, OpenAI via env) | `OPENAI_API_KEY`만 | openai | priority 6 (env 서브해소), backward compat |
| T12 (OpenAI via auth.json 서브해소) | env 전무, `~/.codex/auth.json`에 `OPENAI_API_KEY` 필드만 (OAuth 없음) | openai | priority 6 (auth.json 서브해소 — env 부재 시 폴백), backward compat |
| T12b (env vs auth.json 우선순위) | `OPENAI_API_KEY` env + auth.json에도 `OPENAI_API_KEY` 필드 존재 (다른 값) | openai, env 값 사용 | priority 6 서브해소 — env가 auth.json보다 우선 |
| T13 (codex OAuth + Anthropic key 공존) | chatgpt OAuth + `ANTHROPIC_API_KEY` | codex | priority 3 > priority 5 — **cost-order 의도 전환** |
| T14 (completely empty) | 어떤 credential 신호도 없음 | fail-fast (d) | §3.7 (d). `CLAUDECODE=1` 유무와 무관 |
| T15 (effective_base_url·declared_billing_mode 기록) | 네 경로 각각 호출 | anthropic→api.anthropic.com + per_token, openai→api.openai.com/v1 + per_token, litellm→resolved URL + per_token (보수적), codex→`codex-cli://oauth` + subscription | §3.3 audit trail |
| T16 (resolveLearningProviderConfig 브리지) | `OntoConfig { api_provider: "litellm", llm_base_url: "x", model: "m" }` + `cliOverrides: { provider: "anthropic" }` | Partial<LlmCallConfig> = `{ provider: "anthropic", model_id: "m", base_url: "x" }` → resolveProvider에서 priority 1 caller-explicit로 anthropic 최종 선택 | §3.6a config bridge |

**T5 결정(확정됨)**: graceful fallback + 세션당 1회 설치 안내 로그. `suppress_codex_install_notice: true`로 opt-out 가능. 다른 자격도 전무일 때만 hard-fail이며, 이때도 "OAuth 자격 있음 → 설치만 하면 최저비용 경로 열림"을 강조.

### 6.2 통합 테스트

- `e2e-promote.test.ts`에 litellm provider 시나리오 추가 (mock downstream 또는 `ONTO_LLM_MOCK=1` 우회 — 이 경우 provider resolution은 우회되므로 별도 테스트로 분리).
- Mock provider 영향: 0. `ONTO_LLM_MOCK=1`은 resolution 이전에 리턴.

### 6.3 Backward Compat 확인 케이스

**전환 발생 조건**: 기존 사용자의 경로가 바뀌는 경우는 두 가지 — (1) `~/.codex/auth.json`이 chatgpt OAuth 모드이고 codex 바이너리가 PATH에 있음(이전엔 "not supported" 에러, 신규엔 cost-order 최상위 사용), (2) `LITELLM_BASE_URL`을 신규 export. **이 두 조건 중 하나도 해당하지 않으면 기존과 동일 동작**.

| 시나리오 | 기대 (신규) | 비교 (기존) |
|---|---|---|
| `ANTHROPIC_API_KEY`만, codex OAuth·LiteLLM 없음 | anthropic + per_token | 동일 |
| `OPENAI_API_KEY`만, codex OAuth·LiteLLM 없음 | openai + per_token | 동일 |
| `~/.codex/auth.json` API-key mode만 | openai 폴백 + per_token | 동일 |
| `~/.codex/auth.json` chatgpt OAuth + codex 바이너리 **없음** + 다른 자격 있음 | 다음 cost-order 경로로 폴백 + STDERR 설치 안내 로그 1회 | 이전은 "not supported" 에러 |
| `~/.codex/auth.json` chatgpt OAuth + 바이너리 없음 + 자격 전무 | fail-fast (c)+(d), 설치 안내 강조 | 이전은 "not supported" 에러 |
| `~/.codex/auth.json` chatgpt OAuth + codex 바이너리 **있음** | **codex OAuth 경로 (신규)** | 이전은 "not supported" 에러 |
| `~/.codex/auth.json` chatgpt OAuth + codex 바이너리 + `ANTHROPIC_API_KEY` | **codex OAuth 경로 (신규)** — cost-order 전환 | 이전은 Anthropic 사용 |
| `.onto/config.yml`에 `llm_base_url`·`api_provider` 모두 없음 + env에 ANTHROPIC_KEY만 | anthropic | 동일 |
| `ANTHROPIC_API_KEY` + 신규 `LITELLM_BASE_URL` | **litellm으로 전환** (cost-order) | 이전은 anthropic |

**전환 고지 의무**: 위 "신규" 열에서 "codex OAuth 경로 (신규)"와 "litellm으로 전환" 두 케이스는 사용자가 아무 config 변경 없이도 경로가 바뀔 수 있는 지점. README·CHANGELOG에 명시적으로 고지하고, 최초 호출 시 로그에 `"provider changed by cost-order rule: X → Y"` 일회성 안내를 찍는 방안 §7.4 검토.

## 7. 롤아웃 & 문서화

### 7.1 변경 파일 목록

| 파일 | 변경 |
|---|---|
| `src/core-runtime/discovery/config-chain.ts` | `OntoConfig.llm_base_url` 필드 + 주석. `api_provider` 문서에 `"litellm"`·`"codex"` 언급. |
| `src/core-runtime/learning/shared/llm-caller.ts` | `LlmCallConfig`·`LlmCallResult` 확장. `resolveProvider` 우선순위 6단계 재작성(OpenAI env·auth.json은 priority 6 서브해소로 병합). `callOpenAI` baseURL 전파. `callCodexCli` 신설(`--ephemeral` 포함). `callLlm` 4-way dispatch. `resolveLearningProviderConfig` 브리지 신설. |
| learning/promote 호출자들 (`panel-reviewer.ts`, `promote-executor.ts`, `judgment-auditor.ts` 등) | `resolveLearningProviderConfig` 호출 추가 — `OntoConfig`+CLI overrides를 `callLlm` 인자로 변환해 전달. |
| `authority/core-lexicon.yaml` | `entities.LlmCompatibleProxy` + `entities.LlmBillingMode` 추가 |
| `README.md` | LLM provider 섹션 (cost-order 설명, codex OAuth/LiteLLM/API-key 각 설정 예시, 전환 고지) |
| `development-records/plan/20260415-litellm-provider-design.md` | 본 문서 |
| `src/core-runtime/learning/shared/llm-caller.test.ts` (신규) | §6.1 T1~T15 |

### 7.2 사용자 설정 예시

**자동(cost-order): 아무것도 안 적음.** codex OAuth → LiteLLM → API keys 순으로 자동 해소.

**codex OAuth 명시적 지정** (이미 `~/.codex/auth.json`에 OAuth 있으면 자동이지만 명시도 가능):

```yaml
# .onto/config.yml
api_provider: codex
codex:
  model: gpt-5
  effort: medium
```

**LiteLLM 사용**:

```yaml
# .onto/config.yml
api_provider: litellm
llm_base_url: http://localhost:4000/v1
model: claude-sonnet-local
```

환경변수 임시 라우팅:

```bash
export LITELLM_BASE_URL=http://staging-litellm:4000/v1
export LITELLM_API_KEY=sk-proxy-token   # 프록시가 검증한다면
```

**Per-token API로 강제** (cost-order를 거스르고 Anthropic 사용):

```yaml
# .onto/config.yml
api_provider: anthropic
model: claude-sonnet-4-20250514
```

### 7.3 PR 전략

단일 PR. 이유: (1) OntoConfig 스키마와 llm-caller 변경은 시그니처 연결, (2) lexicon entry는 코드 변경의 개념 근거라 같이 머지되어야 드리프트 안 남음, (3) 테스트·README는 동일 변경의 입출력 관찰점, (4) cost-order 재설계는 여러 분기를 한 번에 바꿔야 중간 상태(예: codex 경로만 추가되고 litellm은 없음)에서 혼선 발생 안 함.

커밋 순서 (PR 내부):
1. `feat(authority): add LlmCompatibleProxy and LlmBillingMode concepts`
2. `feat(config): add llm_base_url, suppress_codex_install_notice fields; document api_provider extensions`
3. `feat(learning): add codex CLI spawn (ephemeral single-turn) and litellm provider routing`
4. `feat(learning): add resolveLearningProviderConfig bridge (config → callLlm)`
5. `feat(learning): re-order resolveProvider by cost-order (subscription > variable > per_token)`
6. `refactor(learning): rename billing_mode → declared_billing_mode with semantics note`
7. `test(learning): cover cost-order resolution, codex OAuth, litellm, provenance`
8. `docs(readme): document provider cost-order and transition cases`

### 7.4 후속 감사 포인트

- 첫 호출 후 `LlmCallResult.effective_base_url`·`billing_mode`가 학습 promote 로그에 노출되는지 확인.
- **경로 전환 고지 로그**: 기존 사용자가 config 변경 없이 codex OAuth나 LiteLLM으로 자동 전환되는 경우(§6.3), 세션 당 1회 `"[onto] provider resolution changed by cost-order: would have used {old}, now using {new}"` 안내. 사용자가 의도하지 않은 전환인지 알아채도록.
- **codex 미설치 안내 로그**: §3.7 (c) graceful fallback 경로에서 세션당 1회 STDERR 안내가 실제로 찍히는지 확인. `suppress_codex_install_notice: true` opt-out이 조용히 동작하는지 테스트. 몇 주 뒤 "OAuth 자격 있는 사용자 중 codex 설치한 비율"을 관측해 안내 문구의 효과 측정.
- **codex 토큰 근사치 감사**: 한 달 후 codex 경로 `tokens_estimated: true` 비중 확인. 필요 시 codex exec에서 사용량 메타를 반환하는 flag(있다면)를 채택하거나 근사 알고리즘 정밀화.
- **rate limit 관측**: codex OAuth의 chatgpt Plus/Pro/Team 한도를 learning promote 빈도가 burn하면 사용자가 review(동일 계정 공유)에서 먼저 rate limit을 맞음. 최초 배포 2주간은 codex 경로 호출 수를 로그에 집계해 비정상 급증 알림.
- **credential 전무 fail 빈도**: priority 1~6 전부 미해소로 fail-fast (d)가 발생하는 빈도 관측. 높으면 README 가이드 강화 또는 `onto init` 등의 setup assistant 도입 검토.
- 6개월 내 Anthropic-compatible proxy 수요 등장 시 `LlmCompatibleProxy.wire_format: "anthropic"` 인스턴스 추가 — schema 변경 없이 확장 가능해야 정상.

## 8. 참조

- `src/core-runtime/learning/shared/llm-caller.ts` — 주 변경 대상
- `src/core-runtime/cli/codex-review-unit-executor.ts:55-138` — codex subprocess spawn 패턴 참조 (learning 경로용으로 `--ephemeral` 추가하고 sandbox/-C/-o 생략해 단순화 재사용)
- `src/core-runtime/discovery/config-chain.ts` — 설정 스키마. `resolveConfigChain()` 결과가 `resolveLearningProviderConfig()`의 입력이 되는 브리지(§3.6a)
- `design-principles/llm-runtime-interface-principles.md` §3.15 (host/runtime neutrality), §3.8 (smallest sufficient bundle)
- `design-principles/ontology-as-code-naming-charter.md` — 필드명 general-specific 패턴
- `authority/core-lexicon.yaml` — LlmCompatibleProxy·LlmBillingMode 등재 위치
- Memory: `project_codex_cli_retention.md` — codex 보존 + 이중 경로 배경
- 후속 설계 (예정): `Execution Realization Priority` — review 등 agentic 작업의 agent spawn 기제 우선순위. Agent Teams nested spawn → codex CLI subagent → host main-model delegation 순. 본 설계와 독립 축.
