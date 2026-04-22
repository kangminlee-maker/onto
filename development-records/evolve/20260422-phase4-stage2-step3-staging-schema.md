---
as_of: 2026-04-22
status: design-artifact
functional_area: phase-4-stage-2-step-3
purpose: |
  Phase 4 Stage 2 Step 3 — queue route 의 staging area schema + atomic cross-doc
  flag + .gitignore/allowlist 정책 + queue event payload 확장. Step 2 (PR #196)
  이월 4 항목을 단일 설계 문서로 통합. Step 4 Principal 개입 matrix 의 input.
authority_stance: non-authoritative-design-surface
canonicality: scaffolding
source_refs:
  step_1: "development-records/evolve/20260422-phase4-stage2-step1-drift-engine-learn-binding.md"
  step_2: "development-records/evolve/20260422-phase4-stage2-step2-authority-intersection.md"
  design_input: "development-records/evolve/20260419-phase4-design-input.md"
  govern_queue: "src/core-runtime/govern/queue.ts"
  govern_types: "src/core-runtime/govern/types.ts"
  promote_executor: "src/core-runtime/learning/promote/promote-executor.ts"
---

# Phase 4 Stage 2 Step 3 — Staging Schema + Cross-doc Flag + Gitignore + Queue Payload

## 0. 본 Step 의 범위

Step 2 가 이월한 4 항목을 단일 설계 문서로 통합:

1. **Staging directory layout** — `.onto/govern/staging/<proposal-id>/` 구조 확정
2. **atomic cross-doc flag** — promote-executor API 확장 (cross_agent_dedup / domain_doc_updates atomic batch)
3. **.gitignore + allowlist 정책** — staging area 의 tracking 상태 명시
4. **queue event payload 확장** — `GovernSubmitEvent.payload` 에 `staging_path` 등 필드 추가

구현 금지. 본 Step 결과가 Stage 2 의 **architectural core** — Step 4 Principal UI flow 는 본 schema 위에서 설계된다.

### 0.1 Draft → Final 재설계 경위 (2026-04-22 pm)

초기 draft 는 `patch.diff` + hash-only baseline 로 설계됐으나, **target artifact 가 code 가 아닌 markdown (learnings/*.md, domains/*/*.md) 이라는 통찰** 이 반영되며 재설계. unified diff + `git apply` 는 line-stable text (source code) 의 block semantics 를 전제하는데, markdown 은 append-heavy + line drift 잦음 → apply fail 리스크.

대신 **promote-executor 가 이미 소비하는 typed `decision` object 를 staging 의 canonical content 로 저장** — apply = "decision replay" (promote-executor 에 재주입 후 mutation 재수행). 이게 abstraction 계층 일치 + 정확성 확보. diff 는 Principal UX 용 runtime 산출물로 위치 이동.

본 문서 §3 이하는 재설계 최종형. patch.diff 는 staging 에 저장하지 않음.

## 1. 현재 상태 (코드 근거)

### 1.1 govern queue (`src/core-runtime/govern/`)

- `types.ts`: `GovernSubmitEvent.payload: Record<string, unknown>` — **타입 수준 extensible**. staging_path 필드 추가가 schema 깨짐 없이 가능
- `queue.ts`:
  - `resolveQueuePath(projectRoot)` — queue file 경로
  - `appendQueueEvent(queuePath, event)` — 단일 이벤트 append
  - `readQueueEvents` / `projectQueue` — 조회 + entries projection
  - `generateGovernId(now)` — 결정적 id (timestamp 기반). **proposal-id 재사용 가능**

### 1.2 `.gitignore` 현 상태

```
.onto/review/
.onto/builds/
.onto/learnings/
.onto/govern/        ← 이미 전체 디렉토리 gitignored
.onto/reconstruct/
.onto/temp/
.onto-review/
.claude/
```

**`.onto/govern/` 이 이미 enumerated-ephemeral 에 등록**되어 있어 `.onto/govern/staging/` 은 자동으로 gitignored. Step 2 의 이월 항목 (3) "gitignore 추가" 는 **작업 없음으로 수렴** — 별도 엔트리 추가 불필요.

### 1.3 allowlist (`scripts/check-onto-allowlist.sh`)

```
ALLOWED = ["commands", "domains", "roles", "processes", "principles", "authority"]
ALLOWED_FILES = [".onto/config.yml"]
```

gitignored 디렉토리는 `git ls-files` 에 안 나오므로 guard 대상 아님. `.onto/govern/staging/` 은 검사 skip — **allowlist 추가 불필요**.

### 1.4 promote-executor Phase B atomicity (DD-15)

- `ApplyExecutionState` + `attempt_id` + state persistence + rollback 기제 이미 존재
- `applyAndPersist(kind, id, fn)` 래퍼가 각 mutation 을 atomic 단위로 persist
- `createRecoverabilityCheckpoint` 가 mutation 이전에 backup. **본 Step 의 atomic batch 확장은 이 기존 machinery 위에 flag 만 얹음**

## 2. Staging Directory Layout

### 2.1 경로 규칙 (Step 1 §5 확정 재서술)

```
.onto/govern/staging/
  └── <proposal-id>/
      ├── meta.yaml               # ChangeProposal + DriftDecision + origin + timestamps
      ├── decision.yaml           # promote-executor 가 소비하는 decision object 그대로
      ├── baseline.snapshot/      # target_files 의 pre-state full copy
      │     └── <target path>     # e.g. learnings/agent-A.md
      └── status.yaml             # (선택) attempt log, resume 지원
```

### 2.2 proposal-id

- `queue.generateGovernId(now)` 재사용 — timestamp-based 결정적 ID. queue event ID 와 1:1 매핑으로 traceability 확보
- 예: `gov-20260422T184530Z-ab12c3`
- **불변**: proposal-id 는 staging directory 이름 = queue event id. 두 값 분리 저장 안 함

### 2.3 Tracking 정책

- `.onto/govern/` prefix 가 이미 gitignored (§1.2) — staging 은 자동 ephemeral
- Principal 이 다른 기기에서 승인하려면 staging 을 pass-around 해야 함 — 현재 scope 밖. "로컬 Principal 전제" 를 Step 4 에서 명시

## 3. 파일 Schema

### 3.1 `meta.yaml`

```yaml
# .onto/govern/staging/<proposal-id>/meta.yaml
proposal_id: gov-20260422T184530Z-ab12c3  # = queue event id
attempt_id: attempt-1                      # DD-22 재진입 시 증가

origin:
  mutation_step: cross_agent_dedup          # promote-executor step 명 (Step 1 §2.2)
  decision_id: cross_agent_dedup:cluster-42 # promote-executor decision_id
  promote_session_id: promote-20260422...   # 추적용
  atomic_batch: true                        # Step 3 §4: batch aggregate 여부

change_proposal:
  id: gov-20260422T184530Z-ab12c3
  target_files:                             # drift-engine ChangeProposal.target_files
    - learnings/agent-A.md
    - learnings/agent-B.md
  change_kind: docs_only                    # drift-engine ChangeKind enum

drift_decision:
  route: queue                              # classifyProposal 결과
  matched_rule: drift_default
  reason: "docs-only 단일 파일도 아니고 governance core 도 아님..."

timestamps:
  staged_at: 2026-04-22T18:45:30Z
  decided_at: null                          # Principal approve 시 기록
```

### 3.2 `decision.yaml`

Staging 의 **canonical content**. promote-executor 가 이미 소비하는 typed decision object 를 그대로 직렬화.

```yaml
# .onto/govern/staging/<proposal-id>/decision.yaml
# decision object 는 promote-executor 가 원자적으로 소비하는 unit.
# shape 은 mutation_step 별로 다름. 예: cross_agent_dedup:

decision_kind: cross_agent_dedup
decision_id: cross_agent_dedup:cluster-42
cluster_id: cluster-42
members:
  - agent_id: agent-A
    source_path: learnings/agent-A.md
    line_index: 12
    line_text: "CC_LL005 ..."
  - agent_id: agent-B
    source_path: learnings/agent-B.md
    line_index: 28
    line_text: "CC_LL005 ..."
consolidated_target:
  path: learnings/_global.md
  content: "<consolidated line>"
# 필드 세부는 promote-executor 의 각 mutation_step 타입 정의를 따름.
```

**기대 속성**:

- **완전성**: promote-executor 의 `applyAndPersist(kind, id, fn)` 가 이 decision 만으로 mutation 재수행 가능 (외부 session context 불필요)
- **결정성**: 같은 decision + 같은 baseline → 같은 결과
- **검증 가능**: decision_id 가 meta.yaml 의 origin.decision_id 와 일치 — tamper detection

### 3.3 `baseline.snapshot/` (디렉토리, full copy)

```
baseline.snapshot/
  learnings/
    agent-A.md        ← target 의 staging 생성 시점 content 전체
    agent-B.md
```

- target_files 의 **pre-state 전체** 를 staging 디렉토리 내부로 복사. 원 경로 구조 보존 (e.g. `baseline.snapshot/learnings/agent-A.md`)
- 파일 size 추정: markdown 보통 1-10 KB / file. staging 1건당 총 10-50 KB 범위. `.onto/govern/` 전체가 gitignored 라 tracked 증가 없음
- **apply 동작**:
  1. 현재 target content 와 `baseline.snapshot/<path>` 비교
  2. **일치** → promote-executor 재주입 (decision replay) → mutation 수행
  3. **불일치** → abort + Principal 에게 3-way 정보 제시 (`baseline` / `current` / `decision 이 수행할 변경 예고`)
- **rollback 동작**: `baseline.snapshot/<path>` 를 target 위치에 `cp` overwrite — **100% 결정적 복원**. diff machinery 비의존

### 3.4 `status.yaml` (선택)

- DD-22 attempt log 의 staging-local mirror. attempt 당 1 entry
- Principal 이 decide 전에 "staging 이 어떤 시도 상태인지" 확인 가능
- Optional — promote-executor 의 `ApplyExecutionState` 가 이미 상위에 존재하므로 redundant 할 수 있음. **실제 구현 시 필요 여부 재평가**

### 3.5 Principal UX 용 diff (runtime 파생)

`patch.diff` 는 staging 에 **저장하지 않음**. Principal 이 `onto govern show <id>` 호출 시 runtime 으로 생성:

```
1. baseline.snapshot/<path> vs (decision replay 시 예상 결과) 비교
2. diff -u 로 unified diff 포맷 생성하여 stdout 출력
```

또는 dry-run 으로 promote-executor 를 돌려 결과 snapshot 을 메모리에 만들고 baseline 과 비교. 구현 세션에서 결정.

## 4. Atomic Cross-doc Flag

### 4.1 ChangeProposal 확장

```ts
// src/core-runtime/govern/drift-engine.ts (구현안)
export interface ChangeProposal {
  id: string;
  target_files: string[];
  change_kind: ChangeKind;
  origin_event: string;
  atomic_batch?: boolean;   // ← 신규. true 면 target_files 를 하나의 논리 단위로 처리
}
```

### 4.2 promote-executor 의 배치 판정

각 mutation step 이 결과를 ChangeProposal 로 조립할 때 `atomic_batch` 판정:

| Mutation step | atomic_batch 기본값 | 판정 로직 |
|---|---|---|
| promotions / contradiction_replacements / axis_tag_changes / retirements / audit_outcomes / obligation_waive | false | 각 decision 이 단일 파일 독립 편집 |
| **cross_agent_dedup** | **true (unconditional)** | cluster 본질상 member 전체가 하나의 논리 단위 (line mark + consolidated append 가 동시 반영돼야 의미) |
| **domain_doc_updates** | **조건부** | §4.3 참조 |

### 4.3 domain_doc_updates 조건부 aggregate

각 decision 이 단일 domain doc 편집 → default `atomic_batch: false` → self_apply 경로로 직접 write.

**예외 — cross-doc reference mutation**: 예를 들어 `concepts.md` 의 용어 개명이 `structure_spec.md`, `logic_rules.md` 등 다른 domain docs 의 참조도 동시 업데이트해야 하는 경우. 이건 개별 decision 이 아닌 **aggregate** 로 처리해야 한 dependent batch 이 반절 apply 되어 정합성 깨지는 것을 방지.

판정 기준 (Step 3 제안):

1. **기본**: 각 `domain_doc_update` decision 은 individual ChangeProposal. self_apply.
2. **집계 trigger**: promote-executor 의 `domain-doc-proposer.ts` (이미 존재) 가 LLM 호출 결과에 `cross_doc_references: string[]` 필드를 emit 하면, 해당 decision 은 `atomic_batch: true` 로 aggregate ChangeProposal 생성 — cross_doc_references 에 나열된 모든 대상 파일을 target_files 에 포함
3. **집계 결과**: target_files.length > 1 → drift-engine `queue` route → staging 에 aggregate patch

**주의**: Step 3 는 판정 기준을 "제안" 만. 실제 `cross_doc_references` field 를 domain-doc-proposer 가 emit 하는지, 아니면 promote-executor 가 별도 heuristic 으로 감지하는지는 **구현 세션에서 결정**. 본 설계의 contract 는 "atomic_batch flag 의 존재" 까지.

### 4.4 atomic_batch 와 Step 2 matrix 의 정합

Step 2 §3.4 matrix 의 "queue" 분류:

- **cross_agent_dedup**: 항상 `atomic_batch: true` — ChangeProposal 생성 시 cluster 전체가 target_files
- **atomic domain_doc_updates batch**: 조건부 `atomic_batch: true` — cross-doc reference 감지 시

Step 2 matrix 의 "self_apply" 분류 mutation step 은 `atomic_batch: false` 로 고정. per-decision individual ChangeProposal.

## 5. Queue Event Payload 확장

### 5.1 `GovernSubmitEvent.payload` 필드 추가

타입 변경 없음 (`Record<string, unknown>` 그대로). 기존 consumer 가 unknown 필드 무시 → backward compat.

신규 필드 (권장 convention):

```ts
{
  staging_path: ".onto/govern/staging/gov-20260422T184530Z-ab12c3",
  proposal_summary: {
    mutation_step: "cross_agent_dedup",
    target_count: 3,
    change_kind: "docs_only",
    atomic_batch: true,
  },
  // 기존 필드 (예: route=principal_direct marker) 는 유지
}
```

### 5.2 consumer 영향

- `onto govern list-drift-candidates` CLI (Step 4 설계): `staging_path` 를 보여주고 Principal 이 `cat <path>/patch.diff` 로 내용 확인 가능
- `onto govern decide <id> approve`: staging_path 에서 patch apply 후 staging directory 삭제
- `onto govern decide <id> reject`: staging directory 삭제 + reject 이유 queue 기록

## 6. Gitignore + Allowlist 정책 — 재확인

- **추가 작업 불필요**. `.gitignore` 의 `.onto/govern/` 엔트리가 staging 을 자동 cover
- allowlist script 는 gitignored 경로를 검사 대상에서 제외하므로 영향 없음
- **유일한 작업**: `scripts/check-onto-allowlist.sh` 의 주석 문자열 갱신 — "Ephemeral subdirs" 리스트에 `staging/` 추가가 문서화 차원에서 유용 (line 40-43 주석). 단 기능 변경 아님

## 7. Step 4 로 이월

본 Step 3 완결 후 Step 4 가 다뤄야 할 잔여:

1. **Principal UI flow**:
   - `onto govern list-drift-candidates` — staging 목록 + proposal_summary 기반 표시
   - `onto govern decide <id> approve|reject [--reason <text>]` — 승인/거부 실행 경로
   - `onto govern show <id>` — staging 디렉토리 내용 (meta.yaml + patch.diff) dump
2. **Emergency pause**: `onto learn pause` — learn v1 자동 편집 일시 중단 CLI (self_apply 경로도 차단)
3. **self_apply 사후 보고 UX**: self_apply 경로는 Principal 승인 없이 즉시 실행 — 사후 어떻게 가시화? (예: stdout summary + optional log pipe)
4. **Principal 개입 matrix**: self_apply (사후 보고) / queue (사전 승인) / principal_direct (수동 편집) 3 지점의 UX 통합

## 8. 주체자 결정 기록 (2026-04-22 pm)

Step 4 진입 전 주체자 confirm 완료. 네 항목 모두 추천안 채택 (단 (2) 는 draft → final 재설계로 전환).

### (1) Staging layout — 수락 ✅

`.onto/govern/staging/<proposal-id>/{meta.yaml, decision.yaml, baseline.snapshot/}` + 선택 `status.yaml`. proposal-id = `generateGovernId()` 재사용 (queue event id 와 1:1 매핑).

근거: traceability (proposal ↔ queue event), 추가 ID 체계 없음.

### (2) Canonical staging content = `decision.yaml` + full-copy `baseline.snapshot/` — 재설계 확정 ✅

**Draft (α) `patch.diff` + hash-only baseline** 는 target 이 code 일 때만 안전하다는 통찰에 따라 **final (β) decision replay + full-copy baseline** 로 재설계 (§0.1 참조).

- apply = promote-executor 에 decision 재주입 후 mutation 재수행 (decision replay)
- rollback = `baseline.snapshot/<path>` 를 target 에 `cp` overwrite (100% 결정적)
- diff 는 staging 에 저장하지 않음. Principal UX 용 runtime 생성 (`onto govern show <id>` 가 baseline 과 "decision 예상 결과" 를 runtime 비교)

근거: target artifact 가 markdown (learnings/domains) 으로 code 가 아님. unified diff 의 line-context 전제 부적합. promote-executor 의 typed decision semantics 와 staging content 의 abstraction 일치가 정확성 + 구현 자연스러움 동시 확보. 디스크 비용 (target 총합 10-50 KB / staging 건) 은 `.onto/govern/` gitignored 로 tracked 증가 없음.

### (3) atomic_batch flag — 수락 ✅

`ChangeProposal.atomic_batch?: boolean` (drift-engine 확장). 판정:

- `cross_agent_dedup`: unconditional `true` (cluster 본질)
- `domain_doc_updates`: 조건부 `true` — `cross_doc_references` 감지 시 aggregate ChangeProposal 로 변환
- 나머지 mutation step: `false` (per-decision independent)

`cross_doc_references` 실제 detection (domain-doc-proposer 가 emit 할지 promote-executor 가 heuristic 으로 감지할지) 은 **구현 세션에서 결정** — 본 Step 3 의 contract 는 flag 존재까지.

### (4) Queue payload convention — 수락 ✅

`GovernSubmitEvent.payload` (이미 `Record<string, unknown>`) 에 추가 convention:

```ts
{
  staging_path: ".onto/govern/staging/<proposal-id>",
  proposal_summary: {
    mutation_step: "cross_agent_dedup" | "domain_doc_updates" | ...,
    target_count: number,
    change_kind: "docs_only" | "code" | "config" | "mixed",
    atomic_batch: boolean,
  },
}
```

타입 변경 없음 (Record extensible). Step 4 UI (`onto govern list-drift-candidates`) 가 summary 를 그대로 표시 — meta.yaml 파일 read 없이 빠른 목록 rendering.

### 확정된 결정이 Step 4 에 미치는 영향

- **Principal UI flow**: `onto govern show <id>` 가 baseline + decision replay 시뮬레이션 결과로 diff 를 runtime 생성해 제시. 3-way drift 발생 시 (`current ≠ baseline`) abort 경고를 Principal 에게 명확히 표시
- **self_apply 사후 보고 UX**: self_apply 도 동일한 decision object 를 소비하므로, 사후 보고 포맷을 queue entry 의 proposal_summary 와 통일 가능 (Step 4 에서 UX 통합 설계)
- **Emergency pause**: `onto learn pause` 가 promote-executor 의 drift-engine 게이트 호출 전 flag 체크 — staging 이 flush 되지 않은 pending queue 는 보존 (로컬 Principal 전제 유지)

---

## 9. 본 문서의 위치

- **Previous**: Step 1 (PR #194, drift×learn 결합), Step 2 (PR #196, authority intersection 확정)
- **Current**: Step 3 (본 문서)
- **Next**: Step 4 (Principal UI flow + 개입 matrix)
- **최종 정착**: Stage 2 완결 시 `.onto/processes/govern.md` + `.onto/processes/learn/promote.md` 에 계약 섹션 + `.onto/authority/core-lexicon.yaml` 에 staging/proposal relation 추가 (구현 세션에서)
