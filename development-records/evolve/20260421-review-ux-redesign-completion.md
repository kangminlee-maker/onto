---
as_of: 2026-04-21
status: track-complete
functional_area: review-execution-ux-redesign
purpose: |
  Review UX Redesign 8-phase track (2026-04-20~21, PRs #152~#159) 의
  완결 wrap-up. 최종 main 상태, phase 별 PR 목록, 설계 결정 정본,
  track 에서 확보된 품질 기록, 후속 "P9 runtime legacy cleanup" 범위
  정리. 다음 세션이 이 문서로 track 의 전체 모습을 회수할 수 있도록
  작성.
source_refs:
  design_doc: "development-records/evolve/20260420-review-execution-ux-redesign.md"
  p1_handoff: "development-records/plan/20260420-review-ux-redesign-p1-handoff.md"
  p8_audit: "development-records/audit/20260421-shape-pipeline-audit.md"
---

# Review UX Redesign — 8-Phase Track Completion (2026-04-21)

## 1. 요약 (30 초 판)

Review 실행 설정을 **10 canonical topology id 의 사용자 노출** 에서 **6 user-facing axis block (`review:`)** 으로 전면 재설계. 주체자는 teamlead / subagent / concurrency / deliberation 6 축만 결정하고 runtime 이 6 TopologyShape 중 하나를 자동 유도. 기존 10 TopologyId catalog 는 유지 (internal dispatch key 로 축소), user surface 는 deprecated. 8 개 squash commit 으로 main 에 landed.

## 2. Main history (최종 8 PR 연속 squash merge)

```
7bdbf38 feat(review-legacy): P7 Phase 1 — visible surface legacy removal (#159)
10e7ce3 docs(review): P6 — prose 전수 갱신 (#158)
72b976f feat(review-audit): P8 — 6 shape × 7 pipeline smoke audit (#157)
0b4e3a7 feat(review-config-cli): P5 — onto config interactive CLI (#156)
a30d07e feat(review-onboard): P4 — onboard detect + write helpers + prose flow (#155)
0bcd705 feat(review-resolver): P3 — universal fallback to main_native (#154)
1aae777 feat(review-topology): P2 — axis → shape → TopologyId derivation (#153)
784b882 feat(review-config): P1 — config schema + validator + legacy translate (#152)
```

병합 순서 = 설계 의존성 순서 (`schema → derivation → fallback → onboard → CLI → audit → docs → legacy 제거`). 도중 재정렬 없음.

## 3. Phase 별 결과

| Phase | PR | 핵심 seat | LOC (add/del) | 자가 검증 |
|---|---|---|---|---|
| P1 config schema | #152 | `OntoReviewConfig` type + validator + legacy translator | +1,856 / -1 | 44 tests |
| P2 topology derivation | #153 | `deriveTopologyShape` + `shapeToTopologyId` + axis-first resolver branch | +1,211 / -3 | 45 tests |
| P3 universal fallback | #154 | `attemptMainNativeDegrade` + `describeDerivationIntent` | +254 / -51 | 10 integration tests |
| P4 onboard | #155 | `detect-review-axes.ts` + `write-review-block.ts` + prose §3.8 | +940 / -2 | 21 tests (incl. M1 fix) |
| P5 config CLI | #156 | `onto-config-cli.ts` (5 subcommand) + key-path + preview | +1,367 / -2 | 31 tests (incl. M1-N2 fix) |
| P8 audit | #157 | `shape-pipeline-audit.test.ts` + audit report MD | +493 / -1 | 35 tests (post-N3 dedup) |
| P6 docs | #158 | 5 user-facing doc + lexicon entity 등재 | +336 / -71 | typecheck + lint (prose only) |
| P7 legacy removal | #159 | `generic-*` 완전 제거 (enum + type + field) + docs legacy 섹션 제거 + lexicon retire | +81 / -233 | dead code sweep 완결 |

Lexicon: v0.23.0 → **v0.30.0** (P1~P7+P8 각 phase version bump, P6 의 self-review amend 에서 P7 내용 일부 선반영됨).

## 4. 최종 설계 구조

### 4.1 User-facing surface

주체자가 `.onto/config.yml` 에 기록하는 canonical 형태:

```yaml
review:
  teamlead:
    model: main                   # "main" (host session) | {provider, model_id, effort}
  subagent:
    provider: main-native         # main-native | codex | anthropic | openai | litellm
    # model_id: gpt-5.4           # foreign provider 시 required
    # effort: high
  # max_concurrent_lenses: 6
  # lens_deliberation: synthesizer-only   # 또는 sendmessage-a2a
```

Management 도구:
- `onto config show` — 현재 상태 + topology derivation preview
- `onto config set <key> <value>` — 단일 field 변경
- `onto config edit` — interactive stepwise (TTY 필요)
- `onto config validate` — writeless 검증 + preview
- `onto onboard --re-detect` — 환경 재감지 + review block 자동 작성

### 4.2 Runtime dispatch (axis-first)

```
config.review 존재
  ↓
validateReviewConfig   (discriminated union + cross-field)
  ↓
deriveTopologyShape    (axes + env signals → 6 TopologyShape 중 하나)
  ↓
shapeToTopologyId      (shape + host → 8 TopologyId 중 하나)
  ↓
resolver emit: [topology] priority source=review-axes order=[<id>]
  ↓
checkTopologyRequirements → spawn

실패 시 (어느 단계든):
  attemptMainNativeDegrade → [topology] degraded: requested=... → actual=main_native
    성공: return main_native TopologyId
    실패: return null → legacy ladder → no_host
```

### 4.3 6 TopologyShape × 8 TopologyId 매핑

| Shape | Mapped TopologyId(s) | Spawn-ready? |
|---|---|---|
| `main_native` | `cc-main-agent-subagent` (Claude) / `codex-main-subprocess` (Codex) | ✅ |
| `main_foreign` | `cc-main-codex-subprocess` | ✅ |
| `main-teams_native` | `cc-teams-agent-subagent` | ✅ |
| `main-teams_foreign` | `cc-teams-codex-subprocess` / `cc-teams-litellm-sessions` | ✅ |
| `main-teams_a2a` | `cc-teams-lens-agent-deliberation` | ❌ PR-D 대기 |
| `ext-teamlead_native` | `codex-nested-subprocess` | ❌ PR-C 대기 |

4/6 shape 가 spawn-ready. 2/6 는 P3 universal fallback 이 `main_native` 로 강등해서 실행 가능.

## 5. 설계에서 지켜낸 invariants

1. **Opt-in migration**: `config.review` 미설정 프로젝트는 기존 경로 100% 동일 작동 (backward compat)
2. **Runtime 완결성**: 6 shape × 7 pipeline step = 42 cell 중 step 5 (dispatch) 만 shape-sensitive. 1~4 / 6~7 은 topology 를 opaque snapshot 으로 소비 → shape 변경이 cascade refactor 유발하지 않음 (P8 audit 경험적 확증)
3. **Universal fallback**: 사용자가 unreachable shape 을 선택해도 `main_native` 로 자동 강등. "Review 는 어떻게든 실행" 원칙
4. **Authority SSOT**: 신규 개념 (`TopologyShape`, `OntoReviewConfig`) 이 lexicon 정식 term 으로 등재 (term_status: active). Legacy (`execution_realization`, `host_runtime`) 는 retired 로 전환
5. **Preview = Runtime mirror**: `onto config` CLI 의 preview 가 runtime dispatch 와 동일 코드 경로 (shape derivation → mapping → degrade) 를 수행 — user 가 config 시점에 본 예측과 run-time 결정이 수학적으로 일치

## 6. 자가 검증 품질 기록

각 phase 는 `/review <PR>` skill 로 self-review 수행. 발견된 이슈와 해소:

| Phase | Findings | 해소 |
|---|---|---|
| P1 | N2: Lexicon 5 types 명시 but 7 exports — changelog 누락 | 같은 PR amend |
| P2 | (self-review 에서 이슈 없음) | — |
| P3 | 2 MINOR coverage gap, 1 trace-format NIT | P3 수용 범위, 이연 |
| P4 | M1: `agent_teams_available` strict match 불일치 (`Boolean()` vs `=== "1"`), M2: `num_lenses` placeholder 모호 | 같은 PR amend |
| P5 | M1: `resolveConfigChain` 이 migration 완료 config 에서 throw, N1: invalid block silent fallback, N2: set multi-word value | 같은 PR amend (`resolveOrthogonalConfigChain` fallback 도입) |
| P6 | M1: BLUEPRINT §7.4 번호 중복, M2: migration-guide orphan, N2: lexicon entity 미등재 | 같은 PR amend |
| P8 | N1~N4: 4 MINOR (title, doc row coverage, duplicate test, hardcoded +3) | 같은 PR amend |
| P7 | M1~M3: `generic-*` top-down 제거 후 6 layer dead code, N1~N2: stale JSDoc + test fixture | 같은 PR amend |

모든 MAJOR / BLOCKING 이 merge 전 해소. 누적 자가 검증 amendment 는 track 의 core 품질 인프라.

## 7. 후속 작업 — P9 Runtime Legacy Cleanup

### 7.1 Scope

P7 Phase 1 이 visible surface 에서 legacy 를 제거했지만 runtime 은 backward compat 을 유지 중. P9 에서 제거할 항목:

| 항목 | 현재 위치 | 제거 시 영향 |
|---|---|---|
| `OntoConfig.execution_topology_priority` field | `config-chain.ts:217` (@deprecated marker) | 전 consumer 수정 필요 |
| `resolveExecutionTopology` 의 legacy priority ladder walk | `execution-topology-resolver.ts:527-545` | axis-first + degrade 만 남김 |
| `DEFAULT_TOPOLOGY_PRIORITY` export | `execution-topology-resolver.ts:262` | 내부 상수로 축소 또는 삭제 |
| `normalizePriorityArray` 함수 | resolver 내부 helper | 제거 |
| `execution_topology_overrides` field | `config-chain.ts` | 함께 제거 |
| `lens_agent_teams_mode` field | `config-chain.ts` + PROFILE_FIELDS | main-teams_a2a shape 의 유효성 재설계 필요 |
| `legacy-field-deprecation.ts` (host_runtime / execution_realization 등 감지) | `discovery/` | 실제 제거하면 이 감지 경로 무의미 |
| 14 references 인 `review-invoke.ts` | topology priority 활용 부분 | axis-first 결과를 항상 소비하는 방식으로 재구조화 |
| `execution-plan-resolver.ts` 의 2 references | 에러 메시지 guidance | `review:` block 가이드로 전환 |
| `config-profile.ts` 의 atomic profile adoption | 완전 재설계 | `review:` block 존재를 completeness signal 로 |

### 7.2 Risk profile

- **18+ files 변경**: test 다수 업데이트 필요
- **config-profile.ts atomic adoption 재설계**: review 실행 외 다른 command 에도 영향 (learn, govern 등)
- **review-invoke.ts 14 references**: coordinator-handoff JSON 구조 조정 + 에러 메시지 다수 갱신
- **Breaking change**: legacy-only config (review block 없고 legacy priority 있음) 를 가진 프로젝트는 review 실행 불가. Onboard migration 필요

### 7.3 P9 진입 전 준비사항

1. 이 문서 전체 참조
2. P1 translator (`review-config-legacy-translate.ts`) 를 migration 도구로 노출 — 신규 CLI 명령 `onto config migrate` 또는 기존 `onto onboard --migrate-legacy` 고려
3. `config-profile.ts` atomic adoption 재설계 방향 결정 — "review block present = complete" 로 단순화할지, 또는 "orthogonal merge + axis derivation" 으로 완전 우회할지
4. 전체 test suite 가 legacy path 없이도 통과하는지 pre-flight 체크

### 7.4 P9 첫 단계 권장

- 먼저 `DEFAULT_TOPOLOGY_PRIORITY` + `normalizePriorityArray` + resolver ladder walk 만 제거. axis-first 가 실패하면 P3 degrade → `main_native` → mapping 실패 시 `no_host` fail-fast. Legacy ladder 단계 생략
- 그 다음 `OntoConfig.execution_topology_priority` field 제거 — 전 consumer 에서 TypeScript 컴파일 에러 catch → 순차 정리
- 마지막으로 `config-profile.ts` 의 atomic adoption 재설계

## 8. Track 의 핵심 교훈 (replicable pattern)

### 8.1 Phase 순서는 의존성 + user journey 양쪽 고려

Design doc §8 의 8 phase 계획이 **schema → derivation → fallback → onboard → CLI → audit → docs → legacy 제거** 순. 이 순서는 (a) 기능 의존성 (validator → derivation → fallback 순) + (b) user journey (onboard → edit → docs 순) 를 동시 만족. Phase 계획 시 두 축을 모두 점검하는 것이 track 의 merge-순서 안정성을 보장.

### 8.2 Self-review 가 매 phase 의 품질 게이트

8 phase 중 7 phase 에서 self-review 가 MAJOR / MINOR 를 포착 후 같은 PR 에서 amend. 이 인프라 없이는 dead code / 구조 결함이 main 에 landed 했을 것. `/review <PR>` skill + amendment commit 패턴은 replicable 실무 인프라.

### 8.3 "Visible surface" vs "runtime path" 분리

P7 의 결정 — visible (types, docs, lexicon, error messages) 만 먼저 제거, runtime code 는 P9 로 이연 — 이 **BREAKING change 의 영향 범위를 phase 에 맞춰 관리** 하는 핵심 패턴. 사용자 관점의 약속 달성 vs 내부 코드 청소 를 시간 축에서 분리해야 PR 크기가 실무적으로 관리 가능.

### 8.4 Enum 제거는 6 layer 점검

`generic-*` 을 `TopologyId` 에서 제거하자 `LensSpawnMechanism` + `DetectionSignals` + `OntoConfig` + `PROFILE_FIELDS` + switch branch + JSDoc 6 layer 에 dead code 가 남았다. **Top-down 삭제 후 grep-driven verification 이 enum 제거의 표준 practice**. TypeScript exhaustive check 는 소비 side 는 잡지만 정의 side 의 unused value 는 놓침.

### 8.5 Lexicon 을 authority hierarchy 의 정본으로 활용

신규 개념을 BLUEPRINT/docs 에 추가할 때 authority/core-lexicon.yaml 의 entities 또는 terms 에 정식 등재. 변경 이력을 changelog 에 시계열로 기록 (v0.23 → v0.30, 각 bump 가 phase landing 에 정확히 대응). 이 practice 가 "개념이 어디서 정의되었나" 의 single source of truth 를 유지.

## 9. 연관 파일

- Design doc: `development-records/evolve/20260420-review-execution-ux-redesign.md`
- P1 handoff: `development-records/plan/20260420-review-ux-redesign-p1-handoff.md`
- P8 audit report: `development-records/audit/20260421-shape-pipeline-audit.md`
- Lexicon changelog: `authority/core-lexicon.yaml` (v0.23.0 ~ v0.30.0 entries)
- Migration guide: `docs/topology-migration-guide.md` §7
- Main entry point (post-track): `.onto/commands/review.md` + `README.md` review section + `BLUEPRINT.md` §7
