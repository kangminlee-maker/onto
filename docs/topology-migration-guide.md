---
as_of: 2026-04-18
status: active
functional_area: topology-migration-legacy-to-sketch-v3
purpose: |
  Sketch v3 (PR #98~#102 merged 2026-04-18) 이후 `execution_topology_priority`
  가 canonical 해서, legacy `host_runtime` / `execution_realization` /
  `executor_realization` / `api_provider` 필드는 사용 시 deprecation warning
  을 내고 향후 PR 에서 제거된다. 본 문서는 기존 `.onto/config.yml` 을 신
  스키마로 마이그레이션하는 매핑표와 실무 가이드를 제공.
source_refs:
  sketch_v3: "development-records/evolve/20260418-execution-topology-priority-sketch.md"
  pr_99: "d3b7819 → (TBD squash) — PR-A foundation"
  pr_100: "(TBD squash) — PR-B executor mapping"
  pr_101: "(TBD squash) — PR-C codex-nested orchestrator"
  pr_102: "(TBD squash) — PR-D deliberation protocol"
  pr_103: "(이 PR 포함, TBD) — PR-E legacy deprecation"
---

# Topology Migration Guide — Legacy → Sketch v3

## 1. 왜 마이그레이션 하는가

Sketch v3 이전의 `.onto/config.yml` 에는 review 실행 경로를 결정하는 필드가
여러 개 섞여 있었다:

- `host_runtime` — LLM 도달 경로 (codex / claude / anthropic / …)
- `execution_realization` / `execution_mode` — subagent vs agent-teams
- `executor_realization` — codex / mock / ts_inline_http
- `api_provider` — Anthropic / OpenAI / LiteLLM / codex

이 필드들은 서로 독립적으로 해석되어 silent divergence 를 만들었다. PR #96
(Review Recovery PR-1, 2026-04-18) 이 해소한 주된 원인. Sketch v3 는 하나의
**topology 축** 으로 수렴:

```yaml
execution_topology_priority:
  - cc-main-agent-subagent      # Claude Code + Agent tool (가장 단순)
  - cc-main-codex-subprocess    # Claude Code + codex lens
  - codex-main-subprocess        # Codex CLI session + codex lens
```

10 개의 canonical topology 중 priority 순서대로 첫 번째 성립하는 옵션이
채택된다.

## 2. 자주 쓰이는 매핑

### 2.1 Codex CLI 구독 사용자 (주체자 환경의 다수)

**Before**:
```yaml
host_runtime: codex
codex:
  model: gpt-5.4
  effort: high
```

**After**:
```yaml
execution_topology_priority:
  - cc-main-codex-subprocess       # Claude Code 세션 안에서 실행할 때
  - codex-main-subprocess          # Codex CLI 세션 안에서 실행할 때
  - codex-nested-subprocess        # Plain terminal 에서 실행할 때
codex:
  model: gpt-5.4
  effort: high
```

`codex` 블록은 그대로 유지 — topology 는 "어떤 경로로 spawn 할지" 만
결정하고 model / effort 는 별도 config.

### 2.2 Claude Code Agent tool 사용자

**Before**:
```yaml
host_runtime: claude
execution_realization: subagent
```

**After**:
```yaml
execution_topology_priority:
  - cc-main-agent-subagent
```

### 2.3 Claude Code TeamCreate teamlead (experimental)

**Before**:
```yaml
host_runtime: claude
execution_realization: agent-teams
```

**After**:
```yaml
execution_topology_priority:
  - cc-teams-agent-subagent
# 전제: ~/.claude*/settings.json 에
#   "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }
```

### 2.4 LiteLLM 프록시 (로컬 MLX 등)

**Before**:
```yaml
host_runtime: standalone
external_http_provider: litellm
llm_base_url: http://localhost:4000
litellm:
  model: llama-8b
```

**After (Claude Code 세션 안)**:
```yaml
execution_topology_priority:
  - cc-teams-litellm-sessions
llm_base_url: http://localhost:4000
litellm:
  model: llama-8b
```

**After (세션 밖, legacy HTTP 경로 유지)**:

```yaml
# 이 경우 sketch v3 에 대응 topology 없음 — legacy 설정 유지.
# Deprecation warning 은 계속 나오지만 동작은 유지된다.
host_runtime: standalone
external_http_provider: litellm
llm_base_url: http://localhost:4000
litellm:
  model: llama-8b
```

### 2.5 Deliberation (lens 간 SendMessage A2A) — 특수

**Before**: 표현 불가 (기존 스키마에는 없음)

**After**:
```yaml
execution_topology_priority:
  - cc-teams-lens-agent-deliberation
lens_agent_teams_mode: true  # 3중 opt-in 의 프로젝트 단 신설 필드
# 전제: ~/.claude*/settings.json 에
#   "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }
#   + Claude Code 세션 (CLAUDECODE=1 자동)
```

## 3. 단계별 마이그레이션 절차

1. **현재 config 확인**: `.onto/config.yml` 과 `~/.onto/config.yml` (global)
   에서 legacy 필드 식별 — `grep -nE 'host_runtime|execution_realization|
   execution_mode|executor_realization|api_provider' .onto/config.yml`.

2. **위 §2 매핑표 적용**: 사용 중인 조합에 대응하는 topology priority 를
   선택. 한 번에 여러 topology 를 priority 순서로 나열 가능 — 환경이
   변하면 첫 번째 성립하는 옵션이 자동 선택됨.

3. **Legacy 필드 제거 또는 유지 (선택)**:
   - 제거: 가장 깨끗함. `execution_topology_priority` 만 남기고 legacy
     필드 삭제.
   - 유지: 잠정 호환 — 주체자가 아직 확신 없으면 legacy 필드를 남기고
     `execution_topology_priority` 를 동시에 추가. 이 경우 topology 가
     우선하고 legacy 는 무시된다 (deprecation warning 은 `topology_priority_set`
     감지 시 억제).

4. **Review 실행**: 평소와 동일. `[topology]` STDERR 로그가 출력되어
   어떤 옵션이 채택되었는지 확인 가능.

5. **Deprecation warning 대응**: `[onto:deprecation]` 으로 시작하는 STDERR
   메시지가 남아있으면 §2 매핑을 다시 검토.

## 4. Deprecation 단계

**현재 PR-J (2026-04-18): error stage**. Legacy 필드 사용 시 fail-fast.

| Stage | When | 동작 |
|---|---|---|
| Warning | PR-E (#103) | Legacy 필드 사용 시 `[onto:deprecation]` STDERR. 동작 유지. |
| **Error (현재)** | **PR-J (2026-04-18)** | **Legacy 필드 + `execution_topology_priority` 없음 → `LegacyFieldRemovedError` throw. Config 로드 실패 → review 중단.** |
| Removal (후속) | 미정 | OntoConfig 타입에서 필드 제거 (type-level breaking). |

### Error stage 이해

`.onto/config.yml` 에 다음 중 하나가 있으면 error stage 에서 fail-fast:

- `host_runtime: <값>`
- `execution_realization: <값>`
- `execution_mode: <값>`
- `executor_realization: <값>`
- `api_provider: <값>`

**단, `execution_topology_priority` 가 함께 있으면 허용** (silent). Migration
하는 주체자가 legacy 필드를 참고용으로 남길 수 있도록.

Error 메시지 예:

```
[onto:legacy-removed] Legacy provider profile 필드는 이제 error-stage 입니다 (PR-J, sketch v3 §7.4 Phase D).
[onto:legacy-removed] 사용된 필드:
[onto:legacy-removed]   - host_runtime=codex → 권장 topology: [cc-main-codex-subprocess, codex-main-subprocess, codex-nested-subprocess]
[onto:legacy-removed]   - api_provider=codex → 권장 topology: [codex-main-subprocess, codex-nested-subprocess]
[onto:legacy-removed] 해결: .onto/config.yml 에 `execution_topology_priority: [옵션]` 추가 후 legacy 필드 제거.
[onto:legacy-removed] Migration guide: docs/topology-migration-guide.md
```

## 5. FAQ

**Q1**: `execution_topology_priority` 와 legacy `host_runtime` 을 동시에
설정하면?

A: topology 가 우선. Legacy 필드는 무시되고 deprecation warning 도 억제됨
(주체자가 "legacy 를 참고용으로 남긴" 상황 가정).

**Q2**: topology 중 어느 것도 성립하지 않으면?

A: resolver 가 `no_host` 로 fail-fast — STDERR 에 환경 시그널 덤프 +
해결 경로 (CLAUDECODE 환경 실행, codex 설치, priority 재정렬 등) 안내.

**Q3**: Legacy 필드를 모두 제거하면 어떤 파일이 영향받는가?

A: 세션 artifact (session-metadata.yaml) 에 기록된 `host_runtime` /
`execution_realization` 필드는 read-only 로 유지. Topology 로 마이그레이션
되면 동일 위치에 `topology_id` 필드도 함께 기록 예정 (후속 PR).

**Q4**: 주체자의 global config `~/.onto/config.yml` 만 수정해도 되나?

A: 네. Atomic profile adoption (PR-1, 2026-04-18) 덕에 project 의 `.onto/
config.yml` 이 불완전하면 global 이 채택됨. `execution_topology_priority`
도 동일하게 atomic 하게 전파.

## 6. Reference

- Sketch v3: `development-records/evolve/20260418-execution-topology-priority-sketch.md`
- Codex nested sandbox: `docs/codex-nested-topology-sandbox.md`
- Resolver: `src/core-runtime/review/execution-topology-resolver.ts`
- Executor mapping: `src/core-runtime/cli/topology-executor-mapping.ts`
- Codex nested orchestrator: `src/core-runtime/cli/codex-nested-teamlead-executor.ts`
- Deliberation protocol: `src/core-runtime/cli/teamcreate-lens-deliberation-executor.ts`
- Deprecation detection: `src/core-runtime/discovery/legacy-field-deprecation.ts`
