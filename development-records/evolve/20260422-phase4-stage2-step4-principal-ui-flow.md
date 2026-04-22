---
as_of: 2026-04-22
status: design-artifact
functional_area: phase-4-stage-2-step-4
purpose: |
  Phase 4 Stage 2 Step 4 — Stage 2 마지막 설계 단계. Step 1~3 의 결합 계약 +
  authority intersection + staging schema 위에 (1) Principal UI flow (CLI 진입점)
  + (2) Emergency pause + (3) self_apply 사후 보고 UX + (4) 3-route 통합 개입
  matrix. Stage 2 종결 후 Track B (reconstruct v1) 로 이행.
authority_stance: non-authoritative-design-surface
canonicality: scaffolding
source_refs:
  step_1: "development-records/evolve/20260422-phase4-stage2-step1-drift-engine-learn-binding.md"
  step_2: "development-records/evolve/20260422-phase4-stage2-step2-authority-intersection.md"
  step_3: "development-records/evolve/20260422-phase4-stage2-step3-staging-schema.md"
  design_input: "development-records/evolve/20260419-phase4-design-input.md"
  govern_cli: "src/core-runtime/govern/cli.ts"
  govern_queue: "src/core-runtime/govern/queue.ts"
  govern_types: "src/core-runtime/govern/types.ts"
  promote_executor: "src/core-runtime/learning/promote/promote-executor.ts"
---

# Phase 4 Stage 2 Step 4 — Principal UI Flow + 개입 Matrix

## 0. 본 Step 의 범위

Step 3 §7 가 Step 4 로 이월한 4 항목을 단일 설계 문서로 통합:

1. **Principal UI flow** — staging-driven CLI 진입점 (4 명령)
2. **Emergency pause** — `onto learn pause/resume` (learn v1 자동 편집 toggle)
3. **self_apply 사후 보고 UX** — Principal 이 자동 실행분을 사후 검토하는 표면
4. **Principal 개입 matrix** — self_apply / queue / principal_direct 3 route 통합

구현 금지. 본 Step 결과로 Stage 2 종결 → wrap-up + Track B (reconstruct v1) 설계 세션 별도 진행.

### 0.1 설계 제약 — dogfood 는 SDK-like layer (주체자 인풋, 2026-04-22 pm)

**정본**: `.onto/processes/govern.md §14.6` (dogfood SDK-like sink 의존 방향 invariant). 규칙·함의·5 활동 sink 위치·Q6 재해석은 정본 참조. 본 §0.1 은 그 invariant 의 Step 4 first application — 결정점 영향 매트릭스만 본 절에 보존.

| 결정점 | dogfood 의존 위험 | 영향 |
|---|---|---|
| §6.1 self_apply 사후 보고 seat | **있음** | 추천 변경 — dogfood 통합 (B) → govern 내부 seat (A 재배정) |
| §6.2 pause flag 경로 | 없음 | `.onto/govern/` 내부 — 영향 없음 |
| §6.3 diff 생성 전략 | 없음 | promote-executor in-process — 영향 없음 |
| §6.4 manual edit 기록 | 없음 | govern queue append — 영향 없음 |

## 1. 현재 상태 (코드 근거)

### 1.1 onto govern CLI v0 surface

`src/core-runtime/govern/cli.ts:42-51` — 5 subcommand:

| subcommand | semantic | 출처 |
|---|---|---|
| `submit` | freeform payload append (drift-engine 호출 없음) | W-C-01 |
| `list` | queue entries 표시 (status filter) | W-C-01 |
| `decide` | **record-only verdict** ("v0 는 기록만") | W-C-01 |
| `route` | drift-engine classification + 조건부 queue append | W-C-02 |
| `promote-principle` | learning → principle 승격 제안 | W-C-03 |

`decide` 의 v0 시멘틱 (cli.ts:446-449):
```
v0 는 기록만 — 실제 authority 파일 반영은 주체자 수동 편집 또는 W-C-02
```

### 1.2 본 Step 의 첫 design move — semantic gap 해소

v1 staging-driven `decide approve` 는 **promote-executor 재주입 → mutation 수행 → staging cleanup** 까지 책임진다 (Step 1 §2.4 + Step 3 §3.2 decision replay). 즉 v0 `decide` 의 record-only 시멘틱과 충돌.

**해소안**: v0 명령을 **그대로 보존** + v1 staging-driven 명령을 **새 subcommand 로 분리**.

| 명령 그룹 | 시멘틱 | 대상 | 출처 |
|---|---|---|---|
| `submit` / `list` / `decide` (v0) | record-only ledger | freeform payload, manual 후속 | W-C-01 |
| `list-drift-candidates` / `show` / `decide-staged` (v1 신규) | staging-driven actual apply | drift-engine 산 staged proposal | Step 4 |
| `record-manual-edit` (v1 신규) | principal_direct 사후 기록 | Principal 본인 편집 결과 | Step 4 |
| `onto learn pause` / `resume` (v1 신규) | learn v1 자동 편집 toggle | drift-engine gate 진입 차단 | Step 4 |

**근거**: 두 시멘틱을 같은 `decide` 에 합치면 (a) freeform payload vs staging path lookup 의 라우팅 분기 복잡성 + (b) "v0 decide approve = 메모만, v1 decide approve = 실제 mutation" 가 사용자 mental model 에서 위험. 명령 분리가 surface contract 안전선.

### 1.3 queue.ndjson semantic — event-sourced ledger of all governance events

`queue.ndjson` 은 **single seat 이지만 entry kind 가 다중**:

| Entry kind | origin event | 시점 | 후속 |
|---|---|---|---|
| pending decision (drift-engine staging) | `GovernSubmitEvent` with `payload.staging_path` | 자동 — drift-engine queue route | `decide-staged approve|reject` 또는 `apply_failed` |
| decided verdict | `GovernDecideEvent` (verdict=approve|reject) | Principal 명시 결정 | 종결 (재판정 v0 미지원) |
| apply 실패 outcome | `GovernApplyFailedEvent` (verdict 와 구별, §2.3) | apply 시점 | 재시도/조사 (구현 세션 정책) |
| manual_edit marker (principal_direct) | `GovernSubmitEvent` with `payload.route="principal_direct"`, `manual_edit=true` (§5.4) | Principal 본인 편집 후 | 종결 (이미 완료 상태) |
| v0 freeform | `GovernSubmitEvent` (staging_path 없음) | W-C-01 v0 호환 | 기존 `decide` (record-only) |

**Semantic 통일**: queue.ndjson 은 "pending decision 전용 seat" 가 아니라 **all governance events 의 event-sourced ledger** — pending + decided + manual_edit + apply_failed + v0 freeform 모두 포함. consumer 는 entry kind 로 필터링한다 (예: `list-drift-candidates` 는 `kind=pending decision AND payload.staging_path` 필터).

정본 규약: govern.md §14.6 location 표의 govern queue 행과 일치.

## 2. Principal UI flow — 신규 4 CLI 진입점

### 2.1 `onto govern list-drift-candidates`

목적: queue 의 pending entries 중 **staging-backed (drift-engine 산)** 만 표시. v0 freeform queue entry 와 분리.

**Behavior**:
- `readQueueEvents(queuePath) → projectQueue` 재사용 (현 list machinery)
- 필터: `entry.status === "pending"` AND `entry.payload.staging_path !== undefined` (Step 3 §5.1 convention)
- 컬럼: `id`, `mutation_step`, `target_count`, `change_kind`, `atomic_batch`, `staged_at`
- `--format json` 지원 (현 list 와 동일 패턴)

**예시 출력**:
```
id                                 mutation_step       target_count  change_kind  atomic_batch  staged_at
gov-20260422T184530Z-ab12c3        cross_agent_dedup   3             docs_only    true          2026-04-22T18:45:30Z
gov-20260422T185012Z-de4567        domain_doc_updates  2             docs_only    true          2026-04-22T18:50:12Z
```

기존 `list` 와 분리한 근거: list 는 v0 freeform payload + v1 staging payload 를 섞어 보여주면 column 구조 비대칭 + Principal mental model 분리 어려움.

### 2.2 `onto govern show <id>`

목적: 단일 staging 내용 조사 + Principal 이 approve 결정 전 변경 예고 확인.

**Behavior**:
1. queue entry lookup → `payload.staging_path` 읽기
2. staging dir 의 `meta.yaml` + `decision.yaml` parse
3. **3-way drift 검사** (Step 3 §3.3):
   - target_files 각각의 현재 content vs `baseline.snapshot/<path>` 비교
   - 일치 → 정상. 불일치 → 경고 (`current ≠ baseline`)
4. **예측 diff 생성** (전략은 §6.3 결정점) — 추천: `promote-executor dry-run` 으로 decision 재주입 + write 인터셉트 → in-memory snapshot ↔ baseline 비교 → unified diff 출력
5. 출력 끝에 next-action 명시:
```
Next:
  onto govern decide-staged <id> approve [--reason "<text>"]
  onto govern decide-staged <id> reject  --reason "<text>"
```

**완전 출력 예시**:
```
proposal_id:    gov-20260422T184530Z-ab12c3
mutation_step:  cross_agent_dedup
target_files:   3
atomic_batch:   true
staged_at:      2026-04-22T18:45:30Z
drift_decision: queue (rule=drift_default)
reason:         docs-only 단일 파일도 아니고 governance core 도 아님

[3-way drift check]
  learnings/agent-A.md:    OK (current = baseline)
  learnings/agent-B.md:    OK
  learnings/_global.md:    OK

[Predicted diff]
--- baseline/learnings/agent-A.md
+++ predicted/learnings/agent-A.md
@@ -10,3 +10,3 @@
- - CC_LL005 ...
+ - CC_LL005 ... <!-- consolidated to _global.md (cluster-42) -->
...

Next:
  onto govern decide-staged gov-20260422T184530Z-ab12c3 approve [--reason "<text>"]
  onto govern decide-staged gov-20260422T184530Z-ab12c3 reject  --reason "<text>"
```

### 2.3 `onto govern decide-staged <id> approve [--reason <text>]`

목적: 승인 + apply + staging cleanup + queue `decide` event append.

**Behavior**:
1. queue entry lookup + `payload.staging_path` 검증 (없으면 "v0 freeform entry — `onto govern decide` 사용" 에러)
2. **3-way drift 재검사** — 불일치면 abort (Principal `show` 시점과 actual apply 시점 사이 변동 방지). 메시지: `"target file changed since staging — re-run 'onto govern show <id>' or reject"`
3. promote-executor 재주입 — `decision.yaml` 을 corresponding mutation step 에 inject 후 mutation 수행 (Step 3 §3.2)
4. 성공 → staging directory 삭제 + queue 에 `GovernDecideEvent { verdict: "approve" }` append
5. 실패 (mutation error) → staging 보존 + queue 에 **별도 event** `GovernApplyFailedEvent { id, reason: "apply failed: <error>", failed_at }` append. **Principal 의 명시적 reject 와 구별** — apply_failed 는 후속 재시도/조사 가능, reject 는 제안 자체 폐기. 재시도 정책 (자동 vs Principal 수동) 은 구현 세션 결정 (Stage 2 범위 밖). `GovernApplyFailedEvent` 는 신규 type 으로 `src/core-runtime/govern/types.ts` 에 추가 — 본 PR 은 design only, 코드 구현은 구현 세션

**`--reason` 정책**:
- approve: **optional** (생략 시 자동 `"approved at <ISO timestamp>"`)
- reject: **required** (현 v0 decide 와 동일)

근거: approve 는 default 행동이라 reason 강제하면 마찰. reject 는 폐기 사유 추적이 dogfood 신호로 가치.

### 2.4 `onto govern decide-staged <id> reject --reason <text>`

목적: 거부 + staging cleanup + queue `decide` event append.

**Behavior**:
1. queue entry lookup + staging_path 검증
2. apply 안 함
3. staging directory 삭제 (baseline.snapshot 포함 — 거부된 proposal 의 baseline 보존 가치 낮음)
4. queue 에 `GovernDecideEvent { verdict: "reject", reason }` append

`--reason` required.

## 3. Emergency pause

### 3.1 명령 surface

| 명령 | 동작 |
|---|---|
| `onto learn pause [--reason <text>]` | flag 생성. 이미 paused 면 reason 만 갱신 |
| `onto learn resume` | flag 삭제. 이미 resume 상태면 no-op + 안내 |
| `onto learn status` (옵션) | 현 pause 상태 + 마지막 toggle 시각 + reason |

`status` 는 핵심 contract 아님 — 구현 세션에서 추가 여부 결정.

### 3.2 Flag 위치 (§6.2 결정점)

추천: **`.onto/govern/learn-paused.flag`** (ephemeral file)

**파일 내용** (생성 시):
```yaml
paused_at: 2026-04-22T18:50:00Z
paused_by: principal
reason: "Phase 4 Stage 2 dogfood 검증 중"
```

### 3.3 영향 범위

**learn v1 의 자동 mutation 만 차단**:
- promote-executor 가 mutation step 진입 직전 flag 체크
- flag 존재 → 그 mutation step skip + log "paused, skipped" 기록
- 이미 staged 된 proposal 은 보존 (queue 비우지 않음). 새 proposal 생성만 차단

**Principal 명시 명령은 무관 (pause 가 차단하지 않는 경로)**:
- `onto govern decide-staged <id> approve` — Principal 명시 승인이라 pause flag 무시 + mutation 수행. **근거**: pause 의 의도는 "learn v1 의 **자동** 편집 차단" 이지 "Principal 명시 작업 차단" 이 아님. Principal 도 차단해야 하는 경우는 emergency stop (별도 mechanism, 본 Step 4 범위 밖)
- `onto govern decide-staged <id> reject` — mutation 없음, 항상 가능
- principal_direct 경로 — Principal 이 직접 파일 편집, pause 대상 아님
- `onto govern record-manual-edit` (§5.4) — 사후 기록, 무관

**state matrix**:

| 상태 | 자동 promote-executor mutation | decide-staged approve | decide-staged reject | record-manual-edit |
|---|---|---|---|---|
| paused | 차단 | 가능 | 가능 | 가능 |
| resumed | 가능 | 가능 | 가능 | 가능 |

### 3.4 Pause 가 "잠시 멈춤" 의미를 보장하는 이유

`.onto/govern/` 가 이미 gitignored (Step 3 §1.2) 라 flag 가 commit 으로 새어나가지 않는다. config field 선택 시 PR 에 무심코 포함될 위험이 있는데, ephemeral file 은 그 위험이 구조적으로 차단된다.

## 4. self_apply 사후 보고 UX

### 4.1 보고 seat (§6.1 결정점) — §0.1 제약 반영

추천: **govern 내부 seat** `.onto/govern/self-apply-log/<session>/events.jsonl`

근거:
- §0.1 invariant — govern 의 본질 contract (사후 검토 표면) 는 dogfood 와 독립해야 함. dogfood off → 본 seat 는 그대로 살아 있음
- 의존 방향 보장: **govern (sink) ← dogfood (reader)** — dogfood 는 본 seat 를 mirror 하거나 옵저버로 구독, 역방향 write 없음
- `.onto/govern/` 이 이미 gitignored (Step 3 §1.2) → 자동 ephemeral, tracked 증가 없음
- queue 에 기록은 부적절 — queue 는 **pending decision** 전용, self_apply 는 완료 상태

dogfood 와의 관계:
- dogfood on → dogfood layer 가 본 seat 의 events.jsonl 을 read + 자체 분석/feedback 파이프라인에 mirror (구현 세션에서 dogfood-side reader 정의)
- dogfood off → 본 seat 는 정상 기록. Principal 이 직접 `cat` 또는 `onto govern self-apply-log show <session>` 같은 v1.1 CLI 로 검토 (본 Step 4 범위 밖)

### 4.2 self-apply-log entry shape

```jsonl
{"event":"self_apply","session_id":"promote-20260422T184530Z","mutation_step":"promotions","decision_id":"prom-7","target_files":["learnings/_global.md"],"executed_at":"2026-04-22T18:45:31Z","atomic_batch":false}
{"event":"self_apply","session_id":"promote-20260422T184530Z","mutation_step":"obligation_waive","decision_id":"obl-3","target_files":[".onto/learnings/_audit/agent-A.yaml"],"executed_at":"2026-04-22T18:45:32Z","atomic_batch":false}
```

queue entry 의 `proposal_summary` (Step 3 §5.1) 와 동일한 field 사용 — Principal 이 `list-drift-candidates` 와 동일한 mental model 로 self_apply 결과 검토.

### 4.3 promote session 종료 시 stdout summary

```
[promote-executor] Self-apply summary (session promote-20260422T184530Z):
  promotions:                  5 decisions  →  5 files modified
  contradiction_replacements:  2 decisions  →  2 files modified
  obligation_waive:            3 decisions  →  3 files modified
  domain_doc_updates:          1 decision   →  1 file modified
  ─────────────────────────────────────────────────────────────
  TOTAL: 11 self_apply decisions executed without Principal approval.

Queued for Principal decision:
  cross_agent_dedup:           1 cluster (3 files)  → onto govern list-drift-candidates
  domain_doc_updates batch:    1 batch   (2 files)  → onto govern list-drift-candidates

Detailed log: .onto/govern/self-apply-log/promote-20260422T184530Z/events.jsonl
```

stdout 은 인지 1차 표면, govern self-apply-log 는 사후 검토 표면. Principal 이 매 session 마다 log 를 강제로 열 필요 없도록 stdout summary 가 first-pass 만족.

### 4.4 사후 rollback 경로

self_apply 는 promote-executor 의 `createRecoverabilityCheckpoint` (Phase B Orchestrator DD-15) 가 이미 backup 생성 — rollback 가능. 단 별도 CLI 미설계.

향후 v1.1 backlog: `onto learn rollback <session>` 명령. 본 Step 4 범위 밖.

## 5. Principal 개입 matrix (통합)

### 5.1 통합 표

| Route | 개입 시점 | Principal action | 1차 UI | 보고/추적 seat |
|---|---|---|---|---|
| **self_apply** | **사후** | (선택) 사후 검토. rollback CLI 는 v1.1 backlog (§4.4 — 본 v1 contract 는 검토만 보장) | promote session stdout summary | `.onto/govern/self-apply-log/<session>/events.jsonl` (dogfood 는 reader) |
| **queue** | **사전** | approve / reject | `onto govern list-drift-candidates → show <id> → decide-staged <id>` | `.onto/govern/queue.ndjson` (decide event) + staging dir 삭제 |
| **principal_direct** | **대신** | 본인 직접 편집 + manual record | 파일 편집기 + `onto govern record-manual-edit` | `.onto/govern/queue.ndjson` (route=principal_direct marker) |

### 5.2 시간 축

```
   ─────── time ───────►

   self_apply:        [decide=auto]──[apply]──[summary]──┐
                                                         └─ Principal 사후 검토 (선택)

   queue:             [decide=stage]──[wait]──┬──[show]──[decide-staged]──[apply]
                                              └─ Principal 사전 승인 (필수)

   principal_direct:  [edit by Principal]──[record-manual-edit]──[done]
                       │
                       └─ Principal 처음부터 주체
```

### 5.3 Cognitive load 분포

| Route | 결정 빈도 | 결정 단위 | 1건당 시간 | 차단 옵션 |
|---|---|---|---|---|
| self_apply | 낮음 (사후 review 만) | stdout summary review (또는 self-apply-log skim) | 분 단위 | `onto learn pause` (사전, 일괄) |
| queue | 중간 (모든 cluster/batch) | show + decide | 분~10분 | `onto learn pause` (사전), reject (개별) |
| principal_direct | 낮음 (Principal 자발) | 본인 편집 | 분~시간 | (자발이므로 차단 불필요) |

설계 의도: **self_apply 가 default, queue 는 진짜 위험한 변경만, principal_direct 는 시스템 정체성 변경만**. 이 분포가 v1 의 "drift gate 가 burden 으로 되지 않는" 보장.

### 5.4 principal_direct 의 govern queue 기록 (§6.4 결정점)

추천: **명시 CLI `onto govern record-manual-edit --target <path> --reason <text>`**

내부적으로 현 `submit` 와 동일한 queue append, payload 에 marker:
```json
{
  "route": "principal_direct",
  "manual_edit": true,
  "target": ".onto/principles/output-language-boundary.md",
  "reason": "translation policy refinement (Phase 2)"
}
```

**예시**:
```bash
onto govern record-manual-edit \
  --target .onto/principles/output-language-boundary.md \
  --reason "translation policy refinement (Phase 2)"
```

**v1 contract scope — single-file only**:
- 본 명령은 single-file manual edit 만 지원 (single `--target`)
- multi-file manual edit 은 (a) 명령을 여러 번 호출 또는 (b) v1.1 schema 확장 (`--target` 다중 또는 `--targets file1,file2,...`) — 후속 backlog
- multi-file 단일 의도 (예: lexicon term rename 이 N 파일 동시 편집) 의 정합성 추적은 v1.1 결정. 현 v1 은 명령 호출 단위로 atomic — 여러 호출이 논리적 1 batch 임을 표현하려면 `--reason` 에 명시 (예: `"lexicon rename for X — file 1/3"`)

기록 누락에 대한 enforcement 는 별도 backlog (v1.1 의 `onto govern audit` lint 같은 것).

## 6. 주체자 결정점 (4 점)

### 6.1 self_apply 사후 보고 seat (§0.1 제약 반영, 추천 재배정)

| 옵션 | seat | 장점 | 단점 |
|---|---|---|---|
| **(A) govern 내부 seat ✅추천** | `.onto/govern/self-apply-log/<session>/events.jsonl` | §0.1 invariant 충족 (dogfood off → 정상). govern 응집성 강화. dogfood 는 reader 로 mirror | 두 위치 join 부담 (dogfood on 시 dogfood 가 reader) |
| (B) dogfood 통합 | `.onto/dogfood/learn/<session>/self-apply.jsonl` | 단일 sink. Phase 4 dogfood 단계에서 자연스러움 | **§0.1 위반 — dogfood off 시 govern 본질 contract 휘발** |
| (C) stdout-only | (저장 없음) | 가장 단순 | session 종료 후 휘발 — 사후 검토 불가 |

**추천 재배정 근거**: 초안은 (B) 를 추천했으나, 주체자 인풋 (§0.1) 으로 의존 방향 invariant 가 추가됨. govern 의 본질 sink 는 govern 내부에 있어야 dogfood 의 ON/OFF 와 무관하게 작동. dogfood 는 본 seat 의 reader 로 위치 — Stage 1 Q6 정합은 "dogfood 가 본 seat 를 read 하여 자체 분석 파이프라인에 mirror" 로 달성 (의존 방향 보존).

**Stage 1 Q6 와의 정합 재해석**: Q6 의 "mandatory dogfood" 는 Phase 4 dogfood 단계 한정 운영 정책. 일반 사용자 환경에서 dogfood off 가능 → govern self-apply-log 는 두 환경 모두 정상 작동 → Q6 와 충돌 없음.

### 6.2 Emergency pause flag 경로

| 옵션 | path | 장점 | 단점 |
|---|---|---|---|
| **(A) ephemeral file ✅추천** | `.onto/govern/learn-paused.flag` | gitignored 자동, persistent across shell | 외부에서 toggle 가능성 (의도된 단점) |
| (B) config field | `.onto/config.yml` `learn.paused: true` | 의도적으로 commit 가능 | PR review 마다 토글 누락 위험 |
| (C) env var | `ONTO_LEARN_PAUSED=1` | 가장 가벼움 | shell scope 한계 (다중 터미널 불일치) |

**추천 근거**: (A) — pause 의 본질은 "한 시점만 잠시 멈춤". `.onto/govern/` 이 이미 gitignored (Step 3 §1.2) 라 flag 가 commit 으로 새어나가지 않음 → ephemeral 의미를 구조적으로 보장.

### 6.3 `onto govern show <id>` 예측 diff 생성 전략

| 옵션 | 방식 | 장점 | 단점 |
|---|---|---|---|
| **(A) promote-executor dry-run ✅추천** | decision 재주입 + write 인터셉트 + diff | 정확 (apply 와 같은 mechanism) | 구현 복잡도 (write 인터셉트 필요) |
| (B) LLM description | LLM 이 baseline + decision 보고 자연어 요약 | 빠른 prototype | 정확성 낮음, abstraction mismatch |
| (C) text diff only | baseline ↔ decision content 단순 텍스트 diff | 단순 | decision object 가 typed → text diff 무의미 |

**추천 근거**: (A) — Step 3 §3.2 의 "promote-executor 가 decision 만으로 mutation 재수행" 결정과 일관. 본 Step 4 의 contract 는 "show 가 정확한 예측 diff 를 보여준다" 까지 — 실제 dry-run 구현 (메모리 vfs vs in-process simulation) 은 구현 세션 결정.

### 6.4 principal_direct 의 govern queue 기록 방식

| 옵션 | 방식 | 장점 | 단점 |
|---|---|---|---|
| **(A) 명시 CLI ✅추천** | `onto govern record-manual-edit --target ... --reason ...` | Principal 책임 명확, 단순 | 누락 가능 (Principal 잊음) |
| (B) file watcher daemon | daemon 이 GC 경로 변경 감지 | 누락 0% | daemon 운영, race, cross-platform 의존 |
| (C) 기록 안 함 | Principal 자유 편집 | 단순 | 변화 추적 손실 — govern 원칙 위반 |

**추천 근거**: (A) — 누락 risk 는 v1.1 backlog 의 enforcement lint (`onto govern audit` 가 GC 경로의 git diff vs queue record_manual_edit event 비교) 로 보완. file watcher 는 운영 부담 + 외부 편집 도구 race 가 govern 단순성과 충돌.

## 7. Stage 2 종결 + 다음 단계

본 Step 4 결정 confirm 후 Stage 2 의 4 Step + 누적 21 점 결정 wrap-up 작성:

- **wrap-up 위치**: `development-records/evolve/20260422-phase4-stage2-wrap-up.md` (가칭)
- **내용**: Stage 1 (Q1~Q7, 5점) + Step 1 (4점) + Step 2 (4점) + Step 3 (4점) + Step 4 (4점) = 21점 결정 인덱스 + 누적 matrix 통합

Stage 2 종결 후:

- **Track B (reconstruct v1) 설계 세션 별도 진행** — Q2 결정 (C/D → B → A) 의 다음 stage. Stage 2 와 independent scope 라 별도 세션 권장
- **Track C/D 구현 착수**: 주체자 결정. 첫 세션 원칙 ("설계 합의만") 을 벗어나므로 별도 구현 세션 스케줄링
- **W-ID 부여**: Q4 (기존 축 연장) 따라 Track C → W-C-09~, Track D → W-C-09~ (구현 세션 진입 시 확정)

## 8. 본 문서의 위치

- **Previous**: Step 1 (PR #194), Step 2 (PR #196), Step 3 (PR #197)
- **Current**: Step 4 (본 문서)
- **Next**: Stage 2 wrap-up + Track B 설계 입구
- **최종 정착**: 구현 세션에서 `.onto/processes/govern.md` 에 본 4 신규 명령 + pause + matrix 계약 섹션 추가. `.onto/processes/learn/promote.md` 에 emergency pause gate 호출 contract 추가

## 9. 주체자 결정 기록 (2026-04-22 pm)

Stage 2 wrap-up 진입 전 주체자 confirm 완료. 4 결정점 + 별도 authority 안건 + dogfood SDK-like invariant 반영.

### (1) self_apply 사후 보고 seat — A 채택 (재배정 인정) ✅

`.onto/govern/self-apply-log/<session>/events.jsonl` (govern 내부 seat). 초안 추천 (B) dogfood 통합은 §0.1 invariant 위반으로 판정 → (A) 로 재배정. dogfood 는 본 seat 의 reader 위치.

근거: dogfood 는 SDK-like layer 이므로 govern 본질 sink 가 dogfood path 에 의존하면 dogfood removal 시 본질이 깨진다. Stage 1 Q6 (mandatory) 는 Phase 4 dogfood 단계 한정 운영 정책으로 재해석.

### (2) Emergency pause flag 경로 — A 채택 ✅

`.onto/govern/learn-paused.flag` (ephemeral file). `.onto/govern/` 이 이미 gitignored — pause 의 "한 시점만 잠시 멈춤" 의미를 구조적으로 보장. config field / env var 옵션은 reject.

### (3) `onto govern show <id>` 예측 diff 전략 — A 채택 ✅

`promote-executor dry-run` (decision 재주입 + write 인터셉트). Step 3 §3.2 decision replay 결정과 일관. 본 Step 4 는 "show 가 정확한 예측 diff 를 보여준다" 까지 contract 로 확정 — 실제 dry-run 구현 (메모리 vfs vs in-process simulation) 은 구현 세션 결정.

### (4) principal_direct queue 기록 방식 — A 채택 ✅

명시 CLI `onto govern record-manual-edit --target <path> --reason <text>`. file watcher daemon 의 운영/race 부담 회피. 누락 risk 는 v1.1 backlog 의 enforcement lint (`onto govern audit`) 로 보완.

### (별도) authority 등재 여부 — A 채택 (미등재 유지) ✅

dogfood 는 `.onto/authority/core-lexicon.yaml` 에 entity 로 등재하지 않음. 운영 contract 는 `.onto/processes/govern.md §14` 에 정착. 근거: lexicon entity 격상 시 relation 형성으로 removal 비용 비대칭 증가 → §0.1 invariant ("들어내기 쉬워야 함") 와 충돌. dogfood 의 "운영 layer 위상" 이 미등재로 구조적 보장.

dogfood entity 격상 안건은 lexicon Stage 3 backlog 또는 Phase 5 자율성 수준 2 진입 시 재평가.

### dogfood SDK-like invariant 정본 정착

본 Step 4 의 §0.1 invariant 는 다음 위치에 동시 반영 (정본 + cross-ref 구조):

| 위치 | 위계 | 역할 |
|---|---|---|
| `.onto/processes/govern.md §14.6` | rank 5 (process 계약) | **정본** |
| `development-records/evolve/20260419-phase4-design-input.md §1.6.3` | 위계 밖 (이력) | cross-ref 보강 |
| `development-records/plan/20260419-phase4-handoff.md §2.3` | 위계 밖 (이력) | cross-ref 보강 |
| 본 §0.1 | 위계 밖 (Step 4 설계) | first application |

### 확정된 결정이 Stage 2 wrap-up + Track B 에 미치는 영향

- **Stage 2 wrap-up**: 4 Step + 누적 21 점 결정 + dogfood SDK-like invariant 단일 정본 (govern.md §14.6) 을 wrap-up 정본에 포함
- **Track B (reconstruct v1) 설계**: §0.1 invariant 가 reconstruct 의 sink 결정 (`.onto/reconstruct/<session>/`) 에 자동 적용 — dogfood 와 독립한 본질 sink 위치를 design 시점부터 보장
- **Track A (learn v1 후속)**: learn 의 본질 sink (`.onto/learnings/*.md` + `_audit/`) 도 동일 invariant 적용. 추가 설계 변경 없음 (이미 dogfood path 와 분리)
- **W-ID 부여**: Stage 2 종결 후 Q4 결정 (기존 축 연장) 따라 Track C → W-C-09~ / Track D → W-C-09~ (구현 세션 진입 시 확정)

### review fix-up 반영 (PR #198 9-lens review, 2026-04-22)

PR 머지 전 9-lens consensus 3 + UF 5 + Q1 (design sink TBD placeholder) + Q2 (pause 중 decide-staged 가능) 결정이 본 문서에 반영됨:

| Finding ID | 처리 위치 | 변경 |
|---|---|---|
| CF-queue-seat-overload | §1.3 신설 + Stage 2 wrap-up §3 | queue.ndjson semantic 을 "event-sourced ledger of all governance events" 로 재정의 (5 entry kind) |
| CF-design-sink-gap | govern.md §14.6 location 표 | design 행 추가 — 본질 sink 미정착 + 임시 sink (`development-records/design/<date>-<topic>.md`) 명시 + 절차 정착 시 invariant 자동 적용 |
| CF-invariant-duplication | govern.md §14.6 (정본 보존) + design-input + handoff + 본 §0.1 | 비-canonical 문서의 산문을 cross-ref only 로 축소. 본 §0.1 도 결정점 영향 매트릭스만 보존 |
| UF-rollback-request-broken-surface | §5.1 통합 표 | self_apply Principal action 에서 "rollback 요청" 제거 — "사후 검토 (rollback CLI 는 v1.1 backlog)" 로 명확화 |
| UF-dogfood-review-surface-leak | §5.3 cognitive table | self_apply 결정 단위 "dogfood log skim" → "stdout summary review (또는 self-apply-log skim)" 변경 |
| UF-approve-failure-collapsed-into-reject | §2.3 | apply 실패를 별도 event `GovernApplyFailedEvent` 로 분리 (verdict=reject 와 구별) |
| UF-pause-transition-undefined-for-staged-items | §3.3 + state matrix | pause 중에도 Principal 명시 `decide-staged approve` 는 mutation 가능 (pause = "자동" 만 차단). Q2 결정 (a) 채택 |
| UF-sink-term-overloaded | govern.md §14.6 본문 + 본 매트릭스 caption | "sink" = 본질 sink, "mirror seat" = dogfood layer log 위치 — 단어 분리 |

후속 backlog (본 PR scope 외):

- **CCF-principal-direct-audit-contract**: record-manual-edit 의 multi-file 확장. 현 v1 은 single-file scope 명시 (§5.4) — multi-file 은 v1.1 schema 확장 backlog
- **UF-step4-over-specification**: Step 4 본문의 같은 결정 반복은 양식 (option table + decision record + summary) 의 자연 결과 — 광범위 trim 은 별도 PR scope

### 두 결정점 default 채택

- **Q1 (design 활동 sink 위치)**: `.onto/processes/design.md` 절차 미정착 → location 표에 design 행을 placeholder 로 추가 (임시 sink = `development-records/design/<date>-<topic>.md`, 절차 정착 시 invariant 자동 적용). invariant scope 축소 옵션 (b) 대신 honest 한 placeholder (a) 채택 — design 활동도 5 활동의 일원이라는 sphere 보존
- **Q2 (pause 중 decide-staged 가능 여부)**: pause 의 의도 = "learn v1 의 **자동** 편집 차단" 이지 "Principal 명시 작업 차단" 이 아님. (a) decide-staged approve 가능 채택. 보수 옵션 (b) "전수 차단" 은 emergency stop 이라는 별도 mechanism 으로 분리 — 본 v1 범위 밖
