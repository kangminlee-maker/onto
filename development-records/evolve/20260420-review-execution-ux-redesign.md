---
as_of: 2026-04-20
status: design-draft
functional_area: review-execution-ux
purpose: |
  Sketch v3 (PR #98) 이 도입한 10 canonical topology 가 user-facing 표면으로
  노출된 것이 UX 상 잘못임을 재정립. User 의 실제 결정 변수는 "teamlead
  model / subagent model / concurrency / deliberation / effort / agent teams
  availability" 6 축이며, topology 는 이 축의 조합에서 runtime 이 자동 유도
  해야 함. 본 문서는 해당 재설계 spec.
source_refs:
  origin_drift_memory: "project_onto_review_infra_drift.md (Phase 1 dogfood 2 drift)"
  topology_catalog: "src/core-runtime/review/execution-topology-resolver.ts:TOPOLOGY_CATALOG"
  executor_mapping: "src/core-runtime/cli/topology-executor-mapping.ts"
  sketch_v3: "development-records/evolve/20260418-execution-topology-priority-sketch.md"
  migration_guide: "docs/topology-migration-guide.md"
---

# Review Execution UX — User-Facing Axis 재설계 (2026-04-20)

## 1. 문제 정의

### 1.1 현 상태

Sketch v3 (PR #98~#111, 2026-04-18) 가 도입한 `execution_topology_priority` 필드는 10 개의 canonical topology id 를 user-facing 배열로 요구한다:

```yaml
execution_topology_priority:
  - cc-main-codex-subprocess
  - codex-main-subprocess
  - codex-nested-subprocess
```

User 가 "Claude Code 세션 안에서 codex 를 lens 로 쓰고 싶다" 는 의도를 표현하려면 10 topology 의 naming convention, teamlead location, lens spawn mechanism, transport rank, deliberation channel 을 모두 해석해야 한다.

### 1.2 관찰된 결함

Phase 1 repo layout migration (PR #151) dogfood 에서 2 drift 가 노출되었다:

1. **`--codex` flag 와 `host_runtime: codex` config 의 이중 표현** — 문서는 canonical 로 소개하지만 PR-J 이후 legacy field 는 error-stage.
2. **`codex-nested-subprocess` topology 가 CLAUDECODE=1 환경에서 dispatch 불가** — `review-invoke.ts:runReviewInvokeCli` 가 topology 를 보지 않고 `host_runtime=claude` 로 coordinator-start handoff 만 emit.

근본 원인은 **topology id 자체가 user-facing 축이 아니라 derivation artifact 여야 함에도 표면에 노출된 것**. User 는 teamlead/subagent/effort 같은 실질 변수를 결정하고, topology 는 그로부터 자동 유도되어야 한다.

### 1.3 설계 전환의 목적

- User config = **6 axes** (axis-level decision)
- Topology id = runtime 이 유도하는 internal identifier (로깅·디버깅 용도 한정)
- Universal fallback = 지정한 provider 가 실패하면 `main_native` shape (host 의 native subagent) 로 자동 강등
- Onboard + `onto config` interactive CLI = axis 설정을 환경 감지 + 대화형으로 지원

## 2. 6 User-Facing Axes

### 2.1 Axis 정의

| Axis | 종류 | 도메인 |
|---|---|---|
| **A. Teamlead model** | user | `main` \| `{provider, model_id, effort}` |
| **B. Subagent model** | user | `main-native` \| `{provider, model_id, effort}` |
| **C. Max concurrent lenses** | derived(B.provider) + user override | int, provider 별 default (§2.3 표) |
| **D. Agent teams available** | auto-detect (env) | bool — `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 감지 |
| **E. Lens deliberation** | user | `synthesizer-only` \| `sendmessage-a2a` |
| **F. Effort** | user (A 와 B 각각) | provider-specific domain |

**User 가 직접 결정**: A, B, E, F (+ C override)  
**Runtime 자동**: C default, D

### 2.2 각 축의 의미

#### A. Teamlead model

Teamlead 는 review session 의 orchestrator. `main` 은 **onto 를 invoke 한 host 의 main context**. 대부분의 경우 `main` 이 올바른 선택.

- `main` 선택 시: Claude Code 에서 invoke → Claude Code 메인 세션이 teamlead. Codex CLI 에서 invoke → Codex 메인 세션이 teamlead. Plain terminal → `ext-teamlead_native` shape 로 자동 강등.
- `{provider, model_id, effort}` 선택: 외부 process 를 teamlead 로 spawn (현재 실질 지원: codex).

#### B. Subagent model

각 lens 를 실행하는 reasoning unit.

- `main-native` = host 의 native subagent mechanism. Claude Code → Agent tool subagent. Codex CLI → codex subprocess.
- `{provider, model_id, effort}` = 명시한 foreign provider (codex / anthropic / openai / litellm).

#### C. Max concurrent lenses

전체 lens 중 동시에 실행할 개수. **Provider 별 기본값** (§2.3) 에서 유도; user 가 override 가능.

핵심 원칙: **subagent/agent-teams 같은 spawn mechanism 과 무관하게 "한 번에 최대한 많이 spawn" 이 최적**. 제한은 provider 쪽 안정성·rate limit 에서만 발생.

#### D. Agent teams available

Claude Code 의 TeamCreate 기능 사용 가능 여부. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` env 에서 자동 true. User 가 config 에 기록하는 값이 아니라 runtime 이 session metadata 에 snapshot.

#### E. Lens deliberation

Lens 간 cross-talk 허용 여부.

- `synthesizer-only` (default) = 각 lens 독립, synthesize 단계에서만 합의
- `sendmessage-a2a` = lens 들이 round 1 중 SendMessage 로 서로 상호참조

제약: `sendmessage-a2a` 는 **(a) Teamlead 가 `main-teams` shape 이고 (b) D=true 일 때** 만 활성. User 가 a2a 를 선택했는데 조건 미충족이면 runtime 이 config load 시 fail-fast + 교정 guidance.

#### F. Effort

모델별 reasoning 깊이. Teamlead 와 Subagent 각각 독립으로 설정.

Provider 별 domain:
- codex: `minimal` \| `low` \| `medium` \| `high` \| `xhigh`
- anthropic extended thinking: thinking budget (token 수)
- openai (gpt-5.x): `reasoning_effort: low`~`high`
- litellm: 모델에 따라 pass-through
- main-native (Claude Code Agent tool): 별도 host-level 관리 — onto config 범위 밖

### 2.3 Provider 별 concurrency guidance (C 의 default)

| Provider | 권장 `max_concurrent_lenses` | Rationale |
|---|---|---|
| **codex CLI** (subprocess) | **6** | 더 많이 동시 실행할수록 완료가 빨라지지만 full concurrency 에서 간헐적 generation 오류. 6 = 실측 속도/안정 sweet spot |
| **main-native (Claude Code Agent tool)** | **num_lenses** (한 번에 모두) | 미테스트. 원칙: "필요한 모든 agent 동시 spawn" |
| **anthropic API** | **num_lenses** | 미테스트. 동일 원칙 |
| **openai API** | **num_lenses** | 미테스트. 동일 원칙 |
| **litellm** (로컬 proxy) | **1-2** | Proxy bandwidth / rate limit |

**핵심 원칙**: concurrency 는 **provider** 단위 결정이며 spawn mechanism (subagent vs agent-teams 등) 과 독립.

## 3. Config Schema v3

### 3.1 사용자 기준 (canonical form)

```yaml
# .onto/config.yml — onto review execution config
output_language: ko
domains:
  - software-engineering

review:
  teamlead:
    model: main                         # A축. onboard 에서 자동 감지 기록.
                                        # 다른 모델이면 {provider, model_id, effort}
  subagent:
    provider: codex                     # B축. 또는 main-native
    model_id: gpt-5.4
    effort: high                        # F축 (subagent 쪽)
  max_concurrent_lenses: 6              # C축. subagent.provider 에서 default, override 가능
  lens_deliberation: synthesizer-only   # E축. synthesizer-only | sendmessage-a2a
```

D (agent_teams_available) 는 runtime 이 session-metadata.yaml 에 기록. Config 에 user 가 적지 않음.

### 3.2 변형 예

**Universal fallback (명시하지 않은 경우)**:

```yaml
review:
  teamlead:
    model: main
  subagent:
    provider: main-native               # provider=main-native 면 model_id/effort 생략 가능
```

**Claude Code + a2a deliberation**:

```yaml
review:
  teamlead:
    model: main                         # = Claude Code 메인 (TeamCreate wrapping 자동 적용 조건: D=true)
  subagent:
    provider: main-native               # TeamCreate member
  lens_deliberation: sendmessage-a2a    # D=true 필요 — runtime 이 검증
```

**Claude Code + codex lens + high effort**:

```yaml
review:
  teamlead:
    model: main
  subagent:
    provider: codex
    model_id: gpt-5.4
    effort: high
  max_concurrent_lenses: 6
```

**Codex 세션 내부 fallback** (main=codex 자동):

```yaml
review:
  teamlead:
    model: main
  subagent:
    provider: main-native               # codex 의 native = codex subprocess
    effort: medium
```

### 3.3 TypeScript type (OntoConfig 에 추가될 필드)

```ts
export interface OntoReviewConfig {
  teamlead?: {
    model: "main" | ExplicitModelSpec;
  };
  subagent?: {
    provider: "main-native" | "codex" | "anthropic" | "openai" | "litellm";
    model_id?: string;                  // main-native 면 생략
    effort?: string;                    // provider-specific
  };
  max_concurrent_lenses?: number;       // 생략 시 provider default
  lens_deliberation?: "synthesizer-only" | "sendmessage-a2a";
}

type ExplicitModelSpec = {
  provider: "codex" | "anthropic" | "openai" | "litellm";
  model_id: string;
  effort?: string;
};
```

## 4. 6 Topology Shapes (Internal)

User 는 config 의 A-F 만 결정; runtime 이 아래 6 shape 중 하나로 유도해서 `[topology]` STDERR + session-metadata 에 기록.

### 4.1 Shape catalog

| Shape | Teamlead | Lens | 사용 예 |
|---|---|---|---|
| **`main_native`** | host main session | host 의 native subagent | Universal fallback. Claude=Agent tool, Codex=codex subprocess |
| **`main_foreign`** | host main session | 명시 foreign provider | Claude main + codex lens, Claude main + litellm lens |
| **`main-teams_native`** | TeamCreate wrapping (Claude only) | Agent tool subagent | 다수 lens 를 TeamCreate 로 격리 |
| **`main-teams_foreign`** | TeamCreate wrapping | 명시 foreign provider | TeamCreate wrapping + codex lens |
| **`main-teams_a2a`** | TeamCreate wrapping | TeamCreate member + a2a | Lens deliberation 활성 |
| **`ext-teamlead_native`** | spawned subprocess (현재 codex) | 그 subprocess 의 native | Plain terminal 에서 codex-nested |

기존 10 topology 의 `generic-*` 2개는 미구현·비유효로 **catalog 에서 제거**.

### 4.2 Host × Shape 매핑

| Host | User config (A, B) | Shape 유도 |
|---|---|---|
| Claude Code | A=main, B=main-native, D=false | `main_native` |
| Claude Code | A=main, B=codex, D=false | `main_foreign` (provider=codex) |
| Claude Code | A=main, B=main-native, D=true | `main-teams_native` |
| Claude Code | A=main, B=codex, D=true | `main-teams_foreign` (provider=codex) |
| Claude Code | A=main, B=main-native, D=true, E=a2a | `main-teams_a2a` |
| Codex CLI | A=main, B=main-native | `main_native` (codex 의 native = subprocess) |
| Codex CLI | A=main, B=litellm | `main_foreign` (provider=litellm) |
| Plain terminal | A=main, B=main-native | `ext-teamlead_native` (codex 가 outer teamlead) |
| Plain terminal | A={provider=codex,...}, B=codex | `ext-teamlead_native` (동등; A 명시는 override 검증용) |

### 4.3 Universal fallback policy

다음 경우 자동으로 `main_native` 로 강등 + STDERR warning:

1. User 가 subagent.provider=codex 로 지정했는데 codex binary · auth 부재
2. User 가 E=sendmessage-a2a 로 지정했는데 D=false (teams env 미활성)
3. User 가 teamlead=`{provider=X,...}` 로 지정했는데 해당 provider unreachable

Fallback 적용 시 `[topology] degraded: requested=main-teams_a2a → actual=main_native (reason: ...)` 형태로 trace.

Fallback 이 config load 단계에서 throw 하지 않고 자동 강등하는 이유: **review 가 어떻게든 진행되는 게 critical path**. 완전 불가능할 때만 `no_host` fail-fast.

## 5. Onboard Flow 강화

### 5.1 기존 onboard 의 한계

현재 `onto onboard` 는 `domains` 선택 정도만 처리. Review execution 설정은 user 가 migration guide 를 직접 읽고 config.yml 을 수정해야 함.

### 5.2 신규 onboard 단계

1. **Host 감지** (자동):
   - `CLAUDECODE=1` → main host = Claude Code
   - `CODEX_THREAD_ID` / `CODEX_CI` → main host = Codex CLI
   - 둘 다 없음 → plain terminal (ext-teamlead_native shape 제안)

2. **Agent teams env 감지** (자동):
   - `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` → D=true 기록

3. **Codex 가용성 감지** (자동):
   - `which codex` + `~/.codex/auth.json` 존재 → subagent.provider 옵션에 codex 포함

4. **LiteLLM endpoint 감지** (자동):
   - `LITELLM_BASE_URL` env 또는 기존 config 에 `llm_base_url` → litellm 옵션 포함

5. **Subagent provider 선택** (대화):
   - 감지된 옵션 제시 (main-native 포함). Default = main-native.
   - Codex 선택 시 → model_id (default gpt-5.4) + effort (default high) + concurrency (default 6) 제시
   - LiteLLM 선택 시 → model_id + concurrency (default 1)
   - Anthropic/OpenAI 선택 시 → API key 요구 + model_id + concurrency (num_lenses 모두)

6. **Deliberation 선택** (대화, D=true AND teamlead=main 일 때만):
   - `synthesizer-only` (default) / `sendmessage-a2a` 제시

7. **Config 쓰기**: 위 axis 들을 `.onto/config.yml` `review:` block 으로 기록. 기존 legacy field 가 있으면 제거 + deprecation 안내.

### 5.3 Re-onboard

환경이 바뀌면 (예: codex 설치, teams env 활성) `onto onboard --re-detect` 로 감지 단계만 재실행, user 선택은 유지.

## 6. `onto config` Interactive CLI

### 6.1 명령 구조

```
onto config                            # 현재 config 요약 출력
onto config show                       # 상세 출력 (모든 field + topology derivation)
onto config set <key> <value>          # 단일 field 수정
onto config edit                       # interactive 대화형 수정
onto config re-detect                  # host + env + provider 재감지 (D field 등 자동 갱신)
onto config validate                   # config 유효성 검사 + topology derivation preview
```

### 6.2 Interactive 화면 예

```
$ onto config edit

현재 설정:
  teamlead.model:       main (감지: Claude Code)
  subagent.provider:    codex
  subagent.model_id:    gpt-5.4
  subagent.effort:      high
  max_concurrent_lenses: 6   (default for codex: 6)
  lens_deliberation:    synthesizer-only
  [auto] agent_teams_available: true (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 감지)
  [derived] topology:   main-teams_foreign (provider=codex, effort=high)

무엇을 변경하시겠습니까?
  [1] Subagent provider (현재: codex → main-native | codex | anthropic | openai | litellm)
  [2] Subagent model_id (현재: gpt-5.4)
  [3] Subagent effort (현재: high → minimal | low | medium | high | xhigh)
  [4] Max concurrent lenses (현재: 6, provider default 6, 1~10)
  [5] Lens deliberation (현재: synthesizer-only → sendmessage-a2a 선택 시 teams 필요)
  [6] Teamlead model (현재: main, 외부 provider 로 변경)
  [7] Environment 재감지
  [8] 저장 후 종료
  [9] 취소
>
```

### 6.3 Validation 규칙

- `lens_deliberation: sendmessage-a2a` AND `agent_teams_available: false` → 경고 + synthesizer-only 로 저장 유도
- `subagent.provider: codex` AND codex binary 부재 → 경고 + main-native fallback 유도
- `subagent.model_id` 누락 AND provider != main-native → 에러

## 7. Migration Path

### 7.1 Legacy field 감지 + 변환

기존 `execution_topology_priority` 나 PR-J removed field (`host_runtime` 등) 가 있는 config 는 다음 단계로 자동 변환:

1. First run 시 detection → "Legacy config detected. Migrate to new schema? [Y/n]"
2. Y → `execution_topology_priority` 의 첫 entry 를 signal 로 사용해서 A-F axis 로 번역
3. 변환된 config 를 `.onto/config.yml.bak-{timestamp}` 으로 백업 + 새 schema 로 overwrite
4. User 확인용 diff 표시

### 7.2 Topology ID 매핑 (legacy → v3 axis)

| Legacy topology id | 유도된 axis |
|---|---|
| `cc-main-agent-subagent` | teamlead=main, subagent=main-native |
| `cc-main-codex-subprocess` | teamlead=main, subagent.provider=codex |
| `cc-teams-agent-subagent` | teamlead=main, subagent=main-native (D auto-true) |
| `cc-teams-codex-subprocess` | teamlead=main, subagent.provider=codex (D auto-true) |
| `cc-teams-litellm-sessions` | teamlead=main, subagent.provider=litellm (D auto-true) |
| `cc-teams-lens-agent-deliberation` | teamlead=main, subagent=main-native, E=sendmessage-a2a |
| `codex-main-subprocess` | teamlead=main, subagent=main-native (host=codex 자동 해석) |
| `codex-nested-subprocess` | teamlead={provider=codex,...}, subagent.provider=codex (host=plain) |
| `generic-*` | **삭제** (미구현·비유효) |

### 7.3 삭제될 내부 identifier

- `execution_topology_priority` config field → `review.*` 하위 axis 로 대체 (내부 derivation 만)
- `host_runtime`, `execution_realization`, etc. → 이미 error-stage. 본 redesign 이 완료되면 제거 완결
- `TopologyId` type → 내부 유지 (logging/debugging) 하되 user-facing surface 에서 제거

## 8. 구현 Phase 계획

각 phase = 별도 PR. Codex rescue 로 independent review (onto:review 는 이 redesign 의 대상이므로 self-review 불가).

| Phase | Scope | 의존성 |
|---|---|---|
| **P1. Config schema** | `OntoConfig.review` type 추가 + parser + validator + legacy migration | — |
| **P2. Topology derivation** | User axis → shape → concrete executor 매핑. `deriveTopologyFromAxes()` 신규 seat | P1 |
| **P3. Universal fallback** | Runtime degradation policy + `[topology] degraded` trace | P2 |
| **P4. Onboard 강화** | §5 flow 구현 — detect + interactive 선택 + config 쓰기 | P1, P2 |
| **P5. `onto config` CLI** | §6 명령 구현 + interactive edit | P1, P4 |
| **P6. Docs 전수 갱신** | `.onto/commands/review.md`, `config.yml.example`, `docs/topology-migration-guide.md`, BLUEPRINT, README | P1~P5 전부 |
| **P7. Legacy 정리** | `execution_topology_priority` field 제거 (deprecation 경로 거쳐), `generic-*` 삭제 | P6 |
| **P8. Dispatch audit** | Phase 1 dogfood 의 Drift #2 (codex-nested CLAUDECODE=1) 를 포함해서 6 shape 각각 end-to-end 실행 테스트 | P2, P3 |

각 phase 간 merge 가능하도록 backward compat 유지. P7 이후부터 legacy 완전 단절.

### 8.1 Session session 권장 배분

- 세션 1: P1 + P2 (타입·derivation) — 핵심
- 세션 2: P3 + P8 초반 (fallback + 1-2 shape smoke) — robustness 확인
- 세션 3: P4 (onboard)
- 세션 4: P5 (config CLI)
- 세션 5: P6 + P7 (docs + legacy 제거)
- 세션 6: P8 full (6 shape × 7 pipeline step smoke)

## 9. Open Questions

### 9.1 설계 미결 항목

1. **Effort 의 TypeScript typing**: provider 별 domain 이 달라서 discriminated union 필요. 구조 어떻게?
2. **Concurrency override 의 상한**: provider 가 API 라고 해도 user 의 API rate limit 이 낮을 수 있음. Runtime 이 실제 rate limit 정보를 알 방법 없음. Guidance 만 제시하고 user 책임으로 둘지, 혹은 retry/backoff 로 흡수할지.
3. **Teamlead=main 이 아닌 경우**: `main_foreign` 같은 shape 가 §4.1 catalog 에 없음. 현재는 teamlead 는 항상 `main` 혹은 `ext-teamlead` (codex subprocess) 만 존재. 다른 provider 가 teamlead 가 될 수 있는 경로를 열어둘지, 혹은 "teamlead 는 main or ext-codex 만" 을 고정할지.
4. **Onboard 와 `onto config` 의 중복**: onboard 의 대화형 단계가 `onto config edit` 과 거의 동일. 공통 seat 로 추출할지.
5. **Re-detection 의 auto-trigger**: env 변경 (예: codex 설치 후) 을 runtime 이 매번 감지해서 config 와 불일치 시 경고할지, 아니면 user 가 명시 `onto config re-detect` 호출해야 반영할지.

### 9.2 검증되지 않은 가정

- Anthropic API / OpenAI API 에서 "한 번에 모든 agent spawn" 이 실제로 최적인지 미테스트. 실제로 돌려봐서 rate limit 문제 없음을 확인 필요.
- LiteLLM 1-2 가 일반 local 모델 환경에서 타당한지, 혹은 local 하드웨어 성능에 따라 달라지는지.

## 10. 다음 단계

이 design doc 이 승인되면 §8.1 세션 배분대로 phase 착수.

**첫 PR 추천 scope**: P1 (config schema + parser + legacy migration). 이것이 이후 모든 phase 의 foundation. P1 단독으로도 가치가 있는 이유는 user 가 legacy config 를 새 schema 로 migration 한 뒤 runtime 은 기존 `execution_topology_priority` 로도 계속 동작 가능 (backward compat layer 를 P7 까지 유지).

## 11. 연관 문서

- 기존 sketch: `development-records/evolve/20260418-execution-topology-priority-sketch.md`
- Drift 발견 경위: `project_onto_review_infra_drift.md`
- Legacy 제거 이력: `docs/topology-migration-guide.md`
- Topology catalog source: `src/core-runtime/review/execution-topology-resolver.ts:TOPOLOGY_CATALOG`
