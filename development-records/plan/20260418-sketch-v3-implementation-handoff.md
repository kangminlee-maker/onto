---
as_of: 2026-04-18
status: active
functional_area: sketch-v3-execution-topology-priority-implementation
purpose: |
  Sketch v3 (10 옵션 execution topology priority ladder) 를 5 PR 로 분할하여
  다음 세션에서 연속 실행. 위험 1 (TeamCreate lifecycle) 과 위험 2 (codex-A
  outer codex orchestration) 은 주체자가 사전 실행 검증 완료 — 구현 착수에
  차단 요소 없음. 본 handoff 는 /clear 후 새 세션이 즉시 PR-A 착수할 수
  있도록 설계됨.
source_refs:
  sketch_v3_branch: "docs/sketch-v3-execution-topology-priority (commit 00597b6, unmerged)"
  sketch_v3_file: "development-records/evolve/20260418-execution-topology-priority-sketch.md"
  pr_1_merged: "d3b7819 — PR #96 (Review Recovery PR-1: resolveExecutionPlan + atomic profile adoption)"
  pr_97_merged: "638e9af — PR #97 (pre-existing TS 에러 7건 해소)"
  prior_handoff: "development-records/plan/20260418-handoff-next-session.md (PR-1 단계 handoff, 이미 completed)"
---

# Sketch v3 Implementation Handoff — 2026-04-18 → Next Session

## 0. /clear 후 첫 명령

```
development-records/plan/20260418-sketch-v3-implementation-handoff.md 읽고 §3 PR-A 부터 연속 실행해줘
```

새 세션은 **PR-A → PR-B → PR-C → PR-D → PR-E 를 중간 승인 없이 연속 merge**. 각 PR 내 의사결정은 본 handoff 의 §3~§7 규약을 직접 참조.

## 1. 현재 저장소 상태 (2026-04-18)

### 1.1 Main 의 최신 상태

- **`638e9af`** `fix(typecheck): resolve 7 pre-existing TS errors blocking CI lint workflow (#97)`
- **`d3b7819`** `feat(review): unified ExecutionPlan resolver + [model-call] observability — PR-1 (R1+R2+R5) (#96)`
- **`b942d5e`** `docs(plan): 2026-04-18 session handoff — review recovery + phase 4 foundation (#95)`

### 1.2 머지 안 된 관련 브랜치

- **`docs/sketch-v3-execution-topology-priority`** (commit `00597b6`) — sketch v3 본문 단일 파일. PR-A 와 함께 merge 예정.
- **`docs/sketch-v3-implementation-handoff`** (이 문서 포함) — 본 handoff 가 여기 있음. PR-A 착수 전 merge 필요.

### 1.3 CI 상태

PR #97 이 merge 된 순간부터 `lint-output-language-boundary` workflow 는 **clean green**. 후속 PR 들은 이 상태에서 시작하므로 typecheck regression 을 도입하지 않도록 주의.

## 2. 참조 catalog (스냅샷)

### 2.1 10 옵션 canonical IDs

```
Claude Code 환경:
  1-0  cc-teams-lens-agent-deliberation   # SendMessage A2A, max 10 (특수)
  1-1  cc-teams-agent-subagent             # TeamCreate + Agent, max 10
  1-2  cc-teams-codex-subprocess           # TeamCreate + codex, max 5
  2-1  cc-main-agent-subagent              # onto TS main + Agent, max 10
  2-2  cc-main-codex-subprocess            # onto TS main + codex, max 5
  3-1  cc-teams-litellm-sessions           # TeamCreate + LiteLLM HTTP, max 1

Codex / host-agnostic:
  codex-A  codex-nested-subprocess         # 중첩 codex 체인, max 5
  codex-B  codex-main-subprocess           # Codex 세션 내 onto + codex lens, max 5

기타 LLM (이연):
  generic-1 generic-nested-subagent        # 후속 PR
  generic-2 generic-main-subagent          # 후속 PR
```

### 2.2 감지 시그널

| 시그널 | 체크 방법 |
|---|---|
| Claude Code 세션 | `process.env.CLAUDECODE === "1"` |
| Claude Code 계정 폴더 | `process.env.CLAUDE_CONFIG_DIR` (없으면 `${HOME}/.claude`) |
| Experimental Agent Teams | `process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1"` |
| lens_agent_teams_mode | `.onto/config.yml` 의 `lens_agent_teams_mode: true` (신설 필드) |
| Codex 바이너리 + 자격 | `detectCodexBinaryAvailable()` (discovery/host-detection.ts) |
| Codex CLI 세션 host | `process.env.CODEX_COMPANION_SESSION_ID` 존재 여부 |
| LiteLLM 서버 | `config.llm_base_url` OR `process.env.LITELLM_BASE_URL` |

### 2.3 신규 OntoConfig 필드 (PR-A 에서 추가)

```ts
export interface OntoConfig {
  // ... 기존 필드 ...
  execution_topology_priority?: string[];
  lens_agent_teams_mode?: boolean;
  generic_nested_spawn_supported?: boolean;
  execution_topology_overrides?: Record<string, { max_concurrent_lenses?: number }>;
}
```

### 2.4 ExecutionTopology 타입 (PR-A 에서 신설)

```ts
export type TopologyId =
  | "cc-teams-lens-agent-deliberation"
  | "cc-teams-agent-subagent"
  | "cc-teams-codex-subprocess"
  | "cc-main-agent-subagent"
  | "cc-main-codex-subprocess"
  | "cc-teams-litellm-sessions"
  | "codex-nested-subprocess"
  | "codex-main-subprocess"
  | "generic-nested-subagent"
  | "generic-main-subagent";

export interface ExecutionTopology {
  id: TopologyId;
  teamlead_location: "onto-main" | "claude-teamcreate" | "codex-subprocess" | "generic-subagent";
  lens_spawn_mechanism: "claude-agent-tool" | "claude-teamcreate-member" | "codex-subprocess" | "litellm-http" | "generic-subagent";
  max_concurrent_lenses: number;
  transport_rank: "S0" | "S1" | "S2" | "S3";
  deliberation_channel: "sendmessage-a2a" | "synthesizer-only";
  plan_trace: string[];
}

export type ExecutionTopologyResolution =
  | { type: "resolved"; topology: ExecutionTopology }
  | { type: "no_host"; plan_trace: string[]; reason: string };
```

### 2.5 내장 기본 우선순위 (priority 배열 미설정 시)

```ts
const DEFAULT_TOPOLOGY_PRIORITY: TopologyId[] = [
  "cc-teams-lens-agent-deliberation",  // experimental + lens_agent_teams_mode 필요
  "cc-teams-agent-subagent",            // experimental 만 필요
  "cc-teams-codex-subprocess",          // experimental + codex
  "cc-main-agent-subagent",             // 가장 단순한 CC 경로
  "cc-main-codex-subprocess",           // CC + codex
  "cc-teams-litellm-sessions",          // experimental + LiteLLM
  "codex-nested-subprocess",            // codex 체인
  "codex-main-subprocess",              // Codex host
  "generic-nested-subagent",            // 후속
  "generic-main-subagent",              // 후속
];
```

## 3. PR-A — Foundation + 단순 옵션 3 (2-1 / 2-2 / codex-B)

### 3.1 Scope

- `execution-topology-resolver.ts` 신설 (10 옵션 catalog + resolver + 감지 로직)
- `sketch v3` 문서 merge 포함 (PR-A 와 함께 올라감)
- OntoConfig 4 신규 필드 + `config-profile.ts` 확장
- `resolveExecutionPlan` (기존 PR-1) 을 topology resolver 의 파생으로 전환
- 옵션 `cc-main-agent-subagent` / `cc-main-codex-subprocess` / `codex-main-subprocess` 만 실제 spawn 지원 (나머지는 resolver 에 등록되지만 spawn 호출 시 "not yet implemented" 로 명시 throw)
- `resolveExecutorConfig` (review-invoke.ts:718-731) 는 topology resolver 결과를 읽도록 수정 (아직 삭제하지 않음)

### 3.2 신설 파일

```
development-records/evolve/20260418-execution-topology-priority-sketch.md
  ← docs/sketch-v3-execution-topology-priority branch 에서 merge

src/core-runtime/review/execution-topology-resolver.ts
  - TopologyId / ExecutionTopology / ExecutionTopologyResolution 타입
  - TOPOLOGY_CATALOG : TopologyId → 메타데이터 맵
  - resolveExecutionTopology(args) 함수
  - DEFAULT_TOPOLOGY_PRIORITY 상수
  - emitTopologyLog(line) — [topology] prefix STDERR

src/core-runtime/review/execution-topology-resolver.test.ts
  - 10 옵션 positive 감지 테스트 각 1개
  - 10 옵션 negative 감지 (필요조건 불충족) 테스트 각 1개
  - priority 배열 override 테스트 3개
  - plan_trace assertion 테스트 1개
  - execution_topology_overrides max_concurrent_lenses 테스트 1개
  - 총 ~25 test
```

### 3.3 수정 파일

```
src/core-runtime/discovery/config-chain.ts
  - OntoConfig 에 신규 4 필드 추가 (§2.3)
  - PROFILE_FIELDS set 에 추가 여부 검토 (execution_topology_priority 는 profile 필드 아님 — orthogonal 로 분류)
  - 구체적으로: execution_topology_priority / execution_topology_overrides 는 orthogonal,
    lens_agent_teams_mode / generic_nested_spawn_supported 는 profile 필드

src/core-runtime/discovery/config-profile.ts
  - PROFILE_FIELDS 확장 (lens_agent_teams_mode, generic_nested_spawn_supported)
  - validateProfileCompleteness 는 그대로 유지 — topology resolution 은 별개 layer

src/core-runtime/review/execution-plan-resolver.ts
  - ExecutionPlan 을 ExecutionTopology 의 파생으로 재정의
  - resolveExecutionPlan(args) 내부에서 resolveExecutionTopology 호출 후 투영
  - P0-P4 ladder 는 토폴로지 resolver 내부로 흡수 (외부 export 제거)
  - 기존 단위 테스트 (execution-plan-resolver.test.ts) 는 동작 보존 assert 로 리팩터

src/core-runtime/cli/review-invoke.ts
  - resolveExecutorConfig 는 유지하되 내부에서 resolveExecutionTopology 의
    lens_spawn_mechanism 에 따라 executor bin 선택:
      "claude-agent-tool" → (현재) inline-http-review-unit-executor.ts
      "codex-subprocess"  → codex-review-unit-executor.ts
      "litellm-http"      → inline-http-review-unit-executor.ts (provider=litellm)
      "claude-teamcreate-member" → (PR-D 에서 신설)
      "generic-subagent"  → (PR-E / 이연)
```

### 3.4 PR-A 의 "단순 3 옵션" 범위 선정 근거

`cc-main-agent-subagent` / `cc-main-codex-subprocess` / `codex-main-subprocess` 셋은 **이미 구현된 executor (`inline-http`, `codex`) 를 그대로 활용** 하므로 PR-A 에서 새 executor 추가 없이도 작동. 나머지 7 옵션은 TeamCreate teamlead 계층 또는 신설 executor 가 필요하므로 PR-B 이후.

### 3.5 PR-A 의 "등록되지만 spawn 불가" 옵션

Resolver 는 10 옵션 전부 감지/선택 가능하지만, 선택된 topology 를 기반으로 실제 review unit 을 spawn 하는 단계에서 아직 구현되지 않은 경우 다음 메시지로 명확한 throw:

```
ExecutionTopology id="cc-teams-agent-subagent" 는 현 설치에서 아직 구현되지 않았습니다 (PR-B 에서 제공 예정).
execution_topology_priority 배열에서 다음 중 하나로 fallback 하거나 순서를 조정하세요:
  - cc-main-agent-subagent
  - cc-main-codex-subprocess
  - codex-main-subprocess
```

### 3.6 PR-A verification

```bash
# 1. typecheck — 0 신규 에러 (#97 기준 clean 상태 유지)
npm run check:ts-core 2>&1 | grep "error TS" | wc -l   # → 0 기대

# 2. lint — 0 violation
npm run lint:output-language-boundary

# 3. 신규 topology resolver + 기존 execution-plan-resolver + config-profile 전수
npx vitest run src/core-runtime/review/execution-topology-resolver.test.ts \
               src/core-runtime/review/execution-plan-resolver.test.ts \
               src/core-runtime/discovery/config-profile.test.ts \
               src/core-runtime/cli/review-invoke-auto-resolution.test.ts
# → 약 85+ test 통과, 0 실패

# 4. 전체 unit test regression
npx vitest run
# → 1400+ passed, 3 pre-existing E2E 실패 (e2e-codex-multi-agent-fixes,
#   e2e-start-review-session, e2e-promote) 만 잔존
```

### 3.7 PR-A 규모 예상

- 신설: ~600 줄 (resolver 400 + test 200)
- 수정: ~150 줄
- Sketch v3 파일 포함 (이미 작성됨)
- 총: ~750 줄 변경

## 4. PR-B — TeamCreate 계열 옵션 3 (1-1 / 1-2 / 3-1)

### 4.1 Scope

- `cc-teams-agent-subagent` / `cc-teams-codex-subprocess` / `cc-teams-litellm-sessions` 실제 spawn 지원
- `TeamCreate` teamlead 계층 추가 — review runner 가 먼저 TeamCreate 로 teamlead agent 1명 spawn 하고, 그 teamlead 가 각 lens 를 병렬 spawn
- 기존 executor 재활용 (inline-http / codex) — 신설 executor 없음

### 4.2 신설 파일

```
src/core-runtime/cli/teamcreate-teamlead-orchestrator.ts
  - runReviewViaTeamCreateTeamlead(args) 함수
  - TeamCreate API 호출 + teamlead 에게 lens packet 분배 + 결과 수집
  - Lens spawn 은 teamlead 가 내부적으로 Agent tool / codex / inline-http 중 선택
  - Topology.lens_spawn_mechanism 으로 분기

src/core-runtime/cli/teamcreate-teamlead-orchestrator.test.ts
  - TeamCreate mock + 3 옵션별 spawn 경로 assertion
  - Teamlead 프롬프트 구성 테스트
  - 실패 전파 (teamlead spawn 실패 시) 테스트
```

### 4.3 수정 파일

```
src/core-runtime/cli/run-review-prompt-execution.ts
  - Topology.teamlead_location === "claude-teamcreate" 분기 추가
  - 분기 시 teamcreate-teamlead-orchestrator 호출
  - 나머지 onto-main teamlead 경로는 기존 로직 유지

src/core-runtime/review/execution-topology-resolver.ts
  - PR-A 의 "not implemented" throw 에서 TeamCreate 3 옵션 제거
```

### 4.4 PR-B verification

- Typecheck / lint clean
- TeamCreate orchestrator test 통과
- 실 Claude Code 환경 (CLAUDECODE=1 + experimental flag) 에서 `cc-teams-agent-subagent` 로 review 실행 → logic/pragmatics lens 출력 생성 확인 (smoke test)

### 4.5 PR-B 규모 예상

- 신설: ~400 줄 (orchestrator 300 + test 100)
- 수정: ~100 줄
- 총: ~500 줄

## 5. PR-C — codex-nested-subprocess (codex-A)

### 5.1 Scope

- 옵션 `codex-nested-subprocess` 실제 spawn 지원
- 신설 executor: outer codex teamlead 가 자체 shell 로 nested codex lens 를 dispatch
- Sandbox 설정 가이드 문서 (`--sandbox danger-full-access` 필수)

### 5.2 신설 파일

```
src/core-runtime/cli/codex-nested-teamlead-executor.ts
  - runCodexNestedTeamlead(args) 함수
  - Outer codex subprocess spawn — prompt 로 "lens packet 목록 받아서 shell 로
    nested codex exec 을 lens 당 1회 spawn, 결과 파일 경로 수집" 지시
  - Outer codex 의 stdout 을 parse 해 lens 별 success/failure 집계
  - 순차 dispatch 로 초기 구현 (병렬화는 후속 개선 과제)

src/core-runtime/cli/codex-nested-teamlead-executor.test.ts
  - Mock codex outer → lens 3개 dispatch 성공 / 1개 실패 시나리오
  - Prompt 포맷 assertion

docs/codex-nested-topology-sandbox.md
  - 사용자가 codex-nested-subprocess 옵션 선택 시 필요한 설정 안내
  - non-seatbelt 실행 환경 요구사항
```

### 5.3 수정 파일

```
src/core-runtime/cli/run-review-prompt-execution.ts
  - Topology.id === "codex-nested-subprocess" 분기 추가

src/core-runtime/review/execution-topology-resolver.ts
  - PR-A 의 "not implemented" throw 에서 codex-nested-subprocess 제거
```

### 5.4 PR-C verification

- Typecheck / lint clean
- Mock outer codex test 통과
- 실 codex CLI 환경에서 smoke test — 4 lens review 완료 확인
- `[topology]` → `[plan]` → `[codex-nested] outer spawned` → `[codex-nested] inner spawned for lens=X` → `[model-call]` 로그 순서 관찰

### 5.5 PR-C 규모 예상

- 신설: ~400 줄 (executor 300 + test 100)
- 수정: ~50 줄
- 문서: ~80 줄
- 총: ~530 줄

### 5.6 위험 2 (outer codex prompt 설계) — 사전 검증 완료

주체자가 실행 검증 완료 (2026-04-18). Nested codex chain 이 outer 의 prompt 기반 dispatch 로 정상 작동 확인. 구현 시 prompt 설계만 깔끔하게 마감.

## 6. PR-D — cc-teams-lens-agent-deliberation (1-0)

### 6.1 Scope

- 옵션 `cc-teams-lens-agent-deliberation` 실제 spawn 지원
- Lens agent 를 TeamCreate member 로 생성 → 실행 후에도 종료하지 않음
- Lens 실행 완료 후 teamlead 가 lens 들 간 `SendMessage` A2A 로 deliberation round 1-2회 수행
- Deliberation 결과를 synthesize packet 에 통합

### 6.2 신설 파일

```
src/core-runtime/cli/teamcreate-lens-deliberation-executor.ts
  - runLensAgentDeliberation(args) 함수
  - Lens member 들을 kickoff 후 실행 완료 대기 (종료 금지)
  - Deliberation round 프로토콜:
      round 1: 각 lens agent 에게 다른 lens 의 출력 공유 + 재평가 요청
      round 2: 의견 수렴 / disagreement 명시
  - SendMessage 메시지 템플릿 + response 수집
  - Deliberation 결과를 lens 출력 파일 옆에 `round1/{lens}-deliberation.md` 로 저장

src/core-runtime/cli/teamcreate-lens-deliberation-executor.test.ts
  - Mock TeamCreate + SendMessage 로 3 lens deliberation 전 과정 테스트
  - Lens 종료 방지 lifecycle assertion
```

### 6.3 수정 파일

```
src/core-runtime/cli/run-review-prompt-execution.ts
  - Topology.deliberation_channel === "sendmessage-a2a" 분기 추가

src/core-runtime/cli/synthesize-packet-builder.ts (또는 해당하는 seat)
  - Deliberation artifact 를 synthesize input 으로 통합
```

### 6.4 PR-D 의 double opt-in 강제 로직

Resolver 가 `cc-teams-lens-agent-deliberation` 을 선택하려면:

1. `CLAUDECODE === "1"`
2. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1"`
3. `config.lens_agent_teams_mode === true`

세 조건 모두 필요. Resolver 의 해당 분기에서 trace:
```
[topology] cc-teams-lens-agent-deliberation: check CLAUDECODE=1 → OK
[topology] cc-teams-lens-agent-deliberation: check CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 → OK
[topology] cc-teams-lens-agent-deliberation: check config.lens_agent_teams_mode=true → OK
[topology] cc-teams-lens-agent-deliberation: matched
```

조건 하나라도 실패하면 다음 우선순위 옵션으로 넘어감 (skip 로그 명시).

### 6.5 PR-D verification

- Typecheck / lint clean
- Mock 환경에서 unit test
- 실 Claude Code + experimental flag + lens_agent_teams_mode=true 환경에서 smoke test
- Deliberation artifact `round1/{lens}-deliberation.md` 생성 확인

### 6.6 PR-D 규모 예상

- 신설: ~600 줄 (executor 400 + test 200)
- 수정: ~80 줄
- 총: ~680 줄

### 6.7 위험 1 (TeamCreate member 수명주기) — 사전 검증 완료

주체자가 실행 검증 완료 (2026-04-18). TeamCreate member agent 가 실행 후에도 살아있어 SendMessage deliberation 가능 확인. 구현 시 lifecycle 관리만 정확하게.

## 7. PR-E — Cleanup + Legacy deprecation

### 7.1 Scope

- `resolveExecutorConfig` (review-invoke.ts:718-731) **완전 삭제**
- Legacy `host_runtime` / `execution_realization` / `execution_mode` / `executor_realization` / `api_provider` 필드 deprecation warning → error → 필드 삭제 단계
- CLI 플래그 `--codex` 재매핑 (topology `cc-main-codex-subprocess` 로 직접 매핑)
- Migration guide 문서

### 7.2 수정 파일

```
src/core-runtime/cli/review-invoke.ts
  - resolveExecutorConfig 삭제
  - --codex flag 처리 로직을 topology priority 주입으로 전환

src/core-runtime/discovery/config-chain.ts
  - OntoConfig 에서 legacy 필드 제거 (BREAKING)
  - deprecation 주석 최종 정리

src/core-runtime/discovery/config-profile.ts
  - PROFILE_FIELDS 에서 legacy 필드 제거

docs/topology-migration-guide.md
  - 기존 host_runtime: X → execution_topology_priority: [Y] 매핑표
  - 사용자가 .onto/config.yml 을 어떻게 업데이트해야 하는지
```

### 7.3 PR-E verification

- Typecheck / lint clean
- 전체 unit test 1400+ passed
- Legacy 필드 사용 시도 시 명확한 deprecation error 메시지 확인
- Migration guide 대로 config 수정 후 review 정상 작동 smoke test

### 7.4 PR-E 규모 예상

- 수정: ~200 줄
- 문서: ~100 줄
- 총: ~300 줄

## 8. PR 진행 프로토콜 (공통)

### 8.1 각 PR 의 라이프사이클

```bash
# 1. main 에서 새 feature branch 분기
git checkout main && git pull origin main
git checkout -b feat/topology-pr-{A|B|C|D|E}-{short-name}

# 2. 구현 + test

# 3. 검증 (PR 별 §3.6 / §4.4 / §5.4 / §6.5 / §7.3 참조)
npm run check:ts-core
npm run lint:output-language-boundary
npx vitest run

# 4. commit (PR 별 개별 scope 로 1-2 commit)

# 5. push
git push -u origin <branch>

# 6. PR 생성
gh pr create --title "..." --body "..."

# 7. CI 확인 — lint workflow green 기대 (PR #97 이후 clean baseline)

# 8. Merge
gh pr merge <num> --squash --delete-branch

# 9. main pull
git checkout main && git pull origin main
```

### 8.2 Commit 메시지 포맷 (PR #96 / #97 와 일관)

```
<type>(<scope>): <subject>

<body — 문제 / 변경 / 검증 / follow-up>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

- type: `feat` / `fix` / `refactor` / `docs`
- scope: `review` / `config` / `topology` / `evolve` 등
- subject: 70자 이내, 한국어/영어 혼용 허용 (프로젝트 관례)

### 8.3 PR body 템플릿

각 PR body 에 포함:
- Summary (2-3 bullet)
- Changes (신설/수정 파일 목록)
- Verification (typecheck / lint / test 결과 숫자)
- Test plan (checklist)
- Reference (본 handoff §3/§4/§5/§6/§7 해당 섹션)

### 8.4 Sketch v3 문서의 위치

Sketch v3 본문은 `docs/sketch-v3-execution-topology-priority` branch (commit `00597b6`) 에 단일 커밋. **PR-A 의 feature branch 에 cherry-pick 또는 git merge** 하여 PR-A 와 함께 main 으로 올린다:

```bash
# PR-A 브랜치 작업 중에:
git checkout feat/topology-pr-a-foundation
git merge origin/docs/sketch-v3-execution-topology-priority --no-ff -m "docs: bring sketch v3 into PR-A"
# 또는
git cherry-pick 00597b6
```

PR-A merge 후 `docs/sketch-v3-execution-topology-priority` branch 는 삭제 (`gh api -X DELETE /repos/.../git/refs/heads/docs/sketch-v3-execution-topology-priority`).

## 9. Known-good 패턴 (PR #96 기반)

### 9.1 Resolver observability 패턴

```ts
function emitTopologyLog(line: string): void {
  process.stderr.write(`[topology] ${line}\n`);
}

// 내부에서 모든 분기 결정 시 호출:
log(`P1 explicit-config: matched (host_runtime=${host})`);
trace.push(lastLogLine);
```

기존 `[plan]`, `[provider-ladder]`, `[model-call]`, `[plan:executor]` prefix 와 **동일 포맷** 유지. `[topology]` 가 가장 상위 층, 그 아래 `[plan]` / `[model-call]` 순.

### 9.2 Test 구조 (execution-plan-resolver.test.ts 참조)

```ts
describe("resolveExecutionTopology — <카테고리>", () => {
  it("<분기명> 기대 결과", () => {
    const res = resolveExecutionTopology({
      env: { ... },
      ontoConfig: { ... },
      claudeHost: false,
      codexAvailable: false,
    });
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("<expected id>");
    expect(resolved.topology.plan_trace[0]).toContain("<expected marker>");
  });
});
```

Test injection 패턴 (env / claudeHost / codexAvailable 주입) 은 기존 `execution-plan-resolver.ts` 의 `ResolveExecutionPlanArgs` 와 동일.

### 9.3 Atomic profile adoption 기존 코드 (PR-1 introduced)

`discovery/config-profile.ts` 의 다음 기능은 PR-A 에서 확장만:
- `PROFILE_FIELDS` 세트 (신규 필드 중 profile-coupled 만 추가)
- `adoptProfile` — 그대로 유지
- `buildBothIncompleteError` — 메시지를 "4 canonical options" 에서 "topology priority 가이드" 로 확장

## 10. 위험 요약 (사전 검증 완료)

| ID | 위험 | 상태 | 비고 |
|---|---|---|---|
| **위험 1** | TeamCreate member lifecycle (실행 후 종료 vs 지속) | **주체자 사전 검증 완료** | PR-D 에서 SendMessage A2A 전제로 구현 가능 |
| **위험 2** | codex-A outer codex 가 lens packet dispatch orchestration 수행 가능한지 | **주체자 사전 검증 완료** | PR-C 에서 초기 순차 dispatch 로 구현 |
| **위험 3** | PR-A dual-path 기간 divergence | 대응 설계됨 | PR-A 에서 P0-P4 ladder 를 topology resolver 내부로 흡수 |
| **위험 4** | 2-1 vs 1-1 / 2-2 vs 1-2 런타임 차이 | 대응 설계됨 | TeamCreate teamlead 가 lens spawn 주체 vs onto TS main 이 주체 |

**구현 session 에서 추가 실측 검증 불필요**. 바로 PR-A 착수.

## 11. 성공 기준 (전체 5-PR merge 완료 시)

1. `execution_topology_priority` 가 단일 source-of-truth 로 10 옵션 중 하나 원자적 선택.
2. `resolveExecutorConfig` 삭제 완료 — Layer 3 divergence 구조적으로 불가능.
3. `--codex` CLI 플래그가 topology `cc-main-codex-subprocess` 로 명확히 매핑.
4. Legacy `host_runtime` / `api_provider` 등 필드가 config 에서 사용 시 명확한 deprecation 에러.
5. 10 옵션 중 8 개 (generic-1/-2 제외) 실 spawn 지원.
6. Typecheck 0 에러 (PR #97 baseline 유지).
7. Unit test 1400+ passed, 새 topology resolver test 25+ passed.
8. Migration guide 문서 제공.

## 12. 이연 / 다음 후속 세션

- `generic-nested-subagent` / `generic-main-subagent` 구현 — host adapter API 명세 설계 선행 필요. 별도 세션에서.
- Phase 4 govern 설계 Phase 2 — 기존 handoff (`20260418-handoff-next-session.md`) §1.3 의 F1~F4 finding 기반. Topology 구현 완료 후 착수 가능.
- `onto review` 실 환경 E2E — 각 topology 별 실 LLM 사용 smoke test (비용 의식 필요).

## 13. /clear 후 새 세션을 위한 체크리스트

- [ ] MEMORY.md 에 본 handoff 포인터 추가됨 (이 handoff merge 시점에 자동 확정)
- [ ] 이 handoff 자체가 main 에 merged (PR 로 올림)
- [ ] `docs/sketch-v3-execution-topology-priority` branch 가 origin 에 남아있음 (PR-A 에서 cherry-pick 예정)
- [ ] PR #96 / #97 이 main 에 merged — typecheck clean baseline
- [ ] `/Users/kangmin/.onto/config.yml` / `/Users/kangmin/cowork/onto-4/.onto/config.yml` 의 기존 설정은 그대로 유지 (구현 중 마이그레이션 불필요; PR-E 에서 일괄 안내)

## 14. 본 handoff 의 라이프사이클

- **Active**: 다음 세션이 PR-A 를 시작할 때까지
- **Superseded**: 5 PR 모두 merged 시 `status: superseded` + `development-records/benchmark/<날짜>-sketch-v3-implementation-wrapup.md` 로 최종 결과 집계
- **Archive**: Archive 시 sketch v3 자체 (`20260418-execution-topology-priority-sketch.md`) 와 함께 archive 대상. Sketch v3 의 `authority_stance: non-authoritative-design-surface` 가 이 시점부터 "superseded by implementation" 로 전환.
