---
as_of: 2026-04-21
status: active
functional_area: topology-migration-legacy-to-review-axes
purpose: |
  Review UX Redesign (PR #152~#157, 2026-04-20~21) 은 `execution_topology_priority`
  를 대체하는 user-facing axis block (`review:`) 을 도입했다. 이 문서는
  두 migration 계층을 다룬다:
    (a) Legacy provider-profile (host_runtime, api_provider 등)
        → sketch v3 (execution_topology_priority) — §1~§6
    (b) sketch v3 execution_topology_priority → Review UX Redesign review: axes — §7
  신규 프로젝트는 (b) 경로만 필요. 구 프로젝트는 (a) → (b) 두 단계.
source_refs:
  sketch_v3: "development-records/evolve/20260418-execution-topology-priority-sketch.md"
  review_ux_redesign: "development-records/evolve/20260420-review-execution-ux-redesign.md"
  p8_audit: "development-records/audit/20260421-shape-pipeline-audit.md"
  pr_99: "d3b7819 → (TBD squash) — PR-A foundation"
  pr_100: "(TBD squash) — PR-B executor mapping"
  pr_101: "(TBD squash) — PR-C codex-nested orchestrator"
  pr_102: "(TBD squash) — PR-D deliberation protocol"
  pr_103: "(이 PR 포함, TBD) — PR-E legacy deprecation"
  pr_152_157: "Review UX Redesign P1~P8 (config / derivation / fallback / onboard / CLI / audit)"
---

# Topology Migration Guide — Legacy → Review UX Redesign (2026-04-21 갱신)

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

**현재 PR-K (2026-04-18): removal stage** (sketch v3 §7.4 Phase D 완료).
Legacy 5 필드가 OntoConfig 타입에서 제거됨 + Runtime 에서도 throw.

| Stage | When | 동작 |
|---|---|---|
| Warning | PR-E (#103) | Legacy 필드 사용 시 `[onto:deprecation]` STDERR. 동작 유지. |
| Error | PR-J (#110) | Legacy 필드 + `execution_topology_priority` 없음 → `LegacyFieldRemovedError` throw. Config 로드 실패 → review 중단. |
| **Removal (현재)** | **PR-K (2026-04-18)** | **OntoConfig 타입에서 5 legacy 필드 제거. TypeScript 코드에서 `config.host_runtime` 같은 접근은 컴파일 에러. YAML 에서는 여전히 감지 가능 (Record cast 경로) — PR-J 의 throw 동작 유지.** |

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

---

## 7. Review UX Redesign migration (execution_topology_priority → `review:` axes)

**Added 2026-04-21.** Review UX Redesign (P1~P8, PRs #152~#157) replaces
`execution_topology_priority` with a user-facing **6-axis block**. Runtime
derives one of 6 internal `TopologyShape` s from the axes and dispatches
to the same canonical TopologyIds §2 covers.

### 7.1 왜 두 번째 migration 이 필요한가

Sketch v3 는 10 topology id 를 user-facing 배열로 노출했다. 주체자가 이 id 들의
naming convention (`cc-teams-*` / `cc-main-*` / `codex-*` / `generic-*`) 과 각
id 의 teamlead location / lens spawn mechanism / deliberation channel 을 모두
해석해야 했다. Review UX Redesign 이 관찰한 결함:

- Topology id 는 **derivation artifact** 이지 user-facing decision 축이 아님
- User 의 실제 결정 변수는 6 axis (teamlead / subagent / concurrency / deliberation + per-model effort)
- Topology id 를 지우고 axis 로 승계 — runtime 이 매핑을 내부화

### 7.2 매핑표 — sketch v3 topology id → review axes

| Legacy topology id | 유도된 axis 조합 | 비고 |
|---|---|---|
| `cc-main-agent-subagent` | `teamlead=main, subagent=main-native` | 단순. Claude Code Agent tool |
| `cc-main-codex-subprocess` | `teamlead=main, subagent.provider=codex` | codex.model → subagent.model_id |
| `cc-teams-agent-subagent` | `teamlead=main, subagent=main-native` (D=true 필요) | CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 |
| `cc-teams-codex-subprocess` | `teamlead=main, subagent.provider=codex` (D=true 필요) | |
| `cc-teams-litellm-sessions` | `teamlead=main, subagent.provider=litellm` (D=true 필요) | litellm.model → subagent.model_id |
| `cc-teams-lens-agent-deliberation` | `teamlead=main, subagent=main-native, lens_deliberation=sendmessage-a2a` | D=true + `lens_agent_teams_mode: true` 이중 opt-in |
| `codex-main-subprocess` | `teamlead=main, subagent=main-native` (host=codex 자동 해석) | |
| `codex-nested-subprocess` | `teamlead={provider=codex, model_id=..., effort=...}, subagent.provider=codex` | host=plain terminal |
| `generic-*` | **삭제** (사용 불가, 설계 상 deferred) | |

Translator 구현: `src/core-runtime/review/review-config-legacy-translate.ts` (pure, 테스트 커버).

### 7.3 Migration 수단

**자동 변환 (권장)**:
```bash
# Onboard 의 detect + write 헬퍼를 이용해 대화형 migration
onto onboard --re-detect           # 감지 단계만 재실행
# 또는 script 경로:
npm run onboard:write-review-block -- .onto/config.yml '<OntoReviewConfig JSON>' --strip-legacy-priority
```

**대화형 CLI (P5)**:
```bash
onto config show                   # 현재 상태 + 예상 TopologyId preview
onto config edit                   # stepwise prompt
onto config set subagent.provider codex
onto config set subagent.model_id gpt-5.4
onto config set subagent.effort high
onto config validate               # 쓰기 전 검증 + preview
```

**수동 편집**: `.onto/config.yml` 에 `review:` block 을 작성 후
`execution_topology_priority` 제거. 두 필드가 공존할 때는 `review:` block 이
우선하고 legacy priority 는 무시됨 (backward compat layer).

### 7.4 Universal fallback (P3) 의 보장

User 가 reachable 하지 않은 shape 을 config 에 적어도 (예: codex 미설치 환경에
`subagent.provider=codex`) review 는 중단되지 않는다. Resolver 는 `main_native`
shape 으로 강등하고 `[topology] degraded: requested=... → actual=main_native` 를
STDERR 에 기록. 이 한 층의 안전망이 legacy migration 의 시행 착오를 허용한다.

### 7.5 현재 spawn-ready 상태 (P8 audit 결과)

| Axis 조합 | 유도 shape | Spawn ready? |
|---|---|---|
| teamlead=main, subagent=main-native | main_native / main-teams_native | ✅ |
| teamlead=main, subagent.provider=codex | main_foreign / main-teams_foreign | ✅ |
| teamlead=main, subagent.provider=litellm (teams=true) | main-teams_foreign | ✅ |
| teamlead=main, lens_deliberation=sendmessage-a2a | main-teams_a2a | ❌ (PR-D 대기) |
| teamlead={provider=codex,...} | ext-teamlead_native | ❌ (PR-C 대기) |

Deferred shape 을 선택한 경우 P3 fallback 이 활성. 세부: `development-records/audit/20260421-shape-pipeline-audit.md`.

### 7.6 Troubleshooting

**Q5**: `review:` block 만 있고 legacy 가 없는데 `onto info` 가 "legacy profile 필요" 로 fail

A: `resolveConfigChain` 의 atomic profile adoption 이 legacy profile 을 여전히 요구하는 현재 상태 (P7 에서 해소). 임시 조치: legacy `execution_topology_priority: [cc-main-agent-subagent]` 를 함께 유지하거나, `onto config show` 는 `resolveOrthogonalConfigChain` 으로 우회되어 정상 작동.

**Q6**: `onto config validate` 가 degraded 를 표시

A: P3 universal fallback 활성. 구체 이유는 degrade trace `(reason: ...)` 에 기록. Config 수정으로 해소 가능.
- Deprecation detection: `src/core-runtime/discovery/legacy-field-deprecation.ts`
