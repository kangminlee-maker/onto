---
as_of: 2026-04-22
status: design-artifact
functional_area: phase-4-stage-2-step-2
purpose: |
  Phase 4 Stage 2 Step 2 — Step 1 (PR #194) 이 이월한 TBD 3 항목 + `.onto/processes/*.md`
  세분화 결정. Step 1 의 §2.3 matrix 를 확정 matrix 로 승격시키고, Step 3 (staging
  schema) 진입 전 "governance core 경계" 의 정밀한 계약을 확정.
authority_stance: non-authoritative-design-surface
canonicality: scaffolding
source_refs:
  step_1: "development-records/evolve/20260422-phase4-stage2-step1-drift-engine-learn-binding.md"
  design_input: "development-records/evolve/20260419-phase4-design-input.md"
  drift_engine: "src/core-runtime/govern/drift-engine.ts"
  promote_executor: "src/core-runtime/learning/promote/promote-executor.ts"
---

# Phase 4 Stage 2 Step 2 — Authority Intersection 정밀화

## 0. 본 Step 의 범위

Stage 2 goal: learn v1 ↔ govern v1 순환 의존 해소. Step 1 은 전체 결합 구조 + Q1~Q4 주체자 결정 확정. Step 2 는 Step 1 §2.3 matrix 의 **3 TBD 항목 분류 확정** + **`.onto/processes/*.md` 세분화** — 이후 Step 3 (staging schema) / Step 4 (Principal 개입 matrix) 가 사용할 "governance core 경계" 의 마지막 gap 해소.

구현 금지. Step 2 도 설계 artifact (non-authoritative-design-surface).

## 1. 현재 상태 재확인

### 1.1 drift-engine 의 governance core 경계 (현 v0)

`src/core-runtime/govern/drift-engine.ts:50-58`:

```ts
const GOVERNANCE_CORE_DIR_PREFIXES = [
  ".onto/authority/",
  ".onto/principles/",
];
const GOVERNANCE_CORE_FILES = [
  ".onto/processes/govern.md",
];
```

즉 principal_direct 로 강제되는 경로는 현재 3 segment 만: authority 전체 + principles 전체 + govern.md 단일 파일.

### 1.2 `.onto/processes/` 전체 파일 (31 files)

```
.onto/processes/
├── backup.md               ├── install.md         ├── onboard.md
├── configuration.md         ├── question.md        ├── reconstruct.md
├── create-domain.md         ├── restore.md         ├── transform.md
├── evolve.md                ├── feedback.md        ├── govern.md ←
├── learn/                   └── review/
│   ├── health.md                ├── review.md
│   ├── promote-domain.md        ├── binding-contract.md
│   └── promote.md               ├── execution-preparation-artifacts.md
                                 ├── interpretation-contract.md
                                 ├── lens-prompt-contract.md
                                 ├── lens-registry.md
                                 ├── nested-spawn-coordinator-contract.md
                                 ├── ontology-absent-path.md
                                 ├── ontology-path.md
                                 ├── productized-live-path.md
                                 ├── prompt-execution-runner-contract.md
                                 ├── record-contract.md
                                 ├── record-field-mapping.md
                                 ├── review-log-contract.md
                                 ├── shared-phenomenon-contract.md
                                 └── synthesize-prompt-contract.md
```

Top-level 11 + `learn/` 3 + `review/` 14 + `govern.md` (이미 GC). 총 30 files 가 현재 **GC 아님** = learn v1 자동 편집 대상 후보.

### 1.3 3 TBD 항목의 실제 edit 범위 (promote-executor.ts 코드 근거)

- **obligation_waive** (L1608, L1966, L1988): 각 `obligation_id` 마다 audit-state 파일 transition. `applyAndPersist("obligation_waive", id, ...)` 가 개별 persist. → **각 decision = 단일 audit-state 파일 수정**
- **cross_agent_dedup_approvals** (L1063, L1168, L1200): cluster 기반. `members` 배열 순회하며 각 `member.source_path` 에 line-level mark + consolidated append. → **cluster 당 복수 agent file 편집**
- **domain_doc_updates** (L1526, L2048): 각 decision 은 `{ slot_id, instance_id }` 기반 단일 domain doc 수정. `decisions.domain_doc_updates` 배열 순회. → **각 decision = 단일 domain doc 파일**

## 2. 결정 — `.onto/processes/` 전체 승격

### 2.1 대안 비교

| 옵션 | `.onto/processes/` 처리 | 복잡도 | 안전성 |
|---|---|---|---|
| (a) 전체 승격 | `GOVERNANCE_CORE_DIR_PREFIXES` 에 `.onto/processes/` 추가 | **낮음** (1 엔트리 추가) | 최대 (모든 계약 meta-stable) |
| (b) `review/` + `learn/` 만 승격 | prefix 2 추가 + top-level 개별 검토 | 중간 | 중간 (evolve/reconstruct 는 자동 편집 허용) |
| (c) 파일별 세분화 | GC_FILES 에 다수 entry | 높음 | 경계 모호 |

### 2.2 (a) 전체 승격 선택

**근거**:
- `.onto/processes/` 는 **계약 디렉토리** — 모두 stable contract. 자동 편집은 계약 안정성 위협
- `govern.md` 를 예외 처리한 기존 정책은 govern 이 자기 계약을 편집 못함을 의미했는데, 같은 논리로 모든 activity 가 자기 계약을 편집 못해야 함 (learn → learn/promote.md 자동 편집은 self-modification 역설)
- Phase 4 가 evolve/reconstruct/learn/govern 의 v1 계약을 설계 중 — 설계 세션 결과가 learn 자동 편집으로 덮어써지면 meta-design 파괴
- 단일 prefix 추가가 31 개 파일 규칙을 한 번에 정의 — implementation simplicity

### 2.3 구현 영향 (참고용, 구현은 Step 3 이후)

```ts
// src/core-runtime/govern/drift-engine.ts (구현 시 변경안)
const GOVERNANCE_CORE_DIR_PREFIXES = [
  ".onto/authority/",
  ".onto/principles/",
  ".onto/processes/",   // ← Step 2 결정: 전체 승격
];
const GOVERNANCE_CORE_FILES = [
  // .onto/processes/govern.md 는 prefix 에 흡수됨 — 제거 가능.
  // 단 backward compat 위해 주석 남기고 유지 옵션.
];
```

`isGovernanceCoreTarget` 의 `GOVERNANCE_CORE_FILES.includes(...)` 체크는 redundant 가 되지만 기존 테스트 (`drift-engine.test.ts`) 와의 cost 고려해 제거 여부는 구현 세션 결정.

## 3. 결정 — 3 TBD 항목 분류 확정

### 3.1 obligation_waive → **self_apply**

**근거**:
- 각 decision 이 단일 audit-state 파일 (in-place line edit)
- `change_kind === "docs_only"` (audit-state 는 bookkeeping, principal-facing 아님)
- `target_files.length === 1` → drift-engine 의 `self_apply` rule `local_docs_single` 정확히 match
- audit-state 는 learn 내부 상태 — 자동화 가치 큼, Principal 개입 burden 작음

### 3.2 cross_agent_dedup → **queue**

**근거**:
- cluster 본질상 **복수 agent file** 동시 편집 (line-level mark + consolidated append)
- target_files.length > 1 → drift-engine 의 `queue` rule `drift_default`
- scope-aware cross-agent 조작은 범위 큰 편집 — Principal 사후 검토 가치
- CG1/CG2/UF1/SYN-* edge-case fix 가 promote-executor 에 이미 구현된 것은 그만큼 영향 범위 넓음의 증거

### 3.3 domain_doc_updates → **각 decision 이 개별 ChangeProposal → self_apply**

**근거**:
- 각 decision = `{ slot_id, instance_id }` 기반 단일 domain doc 수정
- `change_kind === "docs_only"` + `target_files = [domain_doc_path]` 단일
- → drift-engine 의 `self_apply` rule match

**예외 — atomic cross-doc 정합성**:
- 같은 batch 의 여러 decision 이 cross-doc reference 정합성을 요구하는 경우 (예: 개념 재명명이 모든 domain doc 에 동시 적용되어야 한다)
- 이 경우 **batch 를 단일 aggregate ChangeProposal 로 변환** → target_files 가 복수 → queue
- 판정 기준: promote-executor 가 "cross-doc reference mutation" flag 를 decision 에 부여할 수 있는지 — Step 3 staging schema 에서 결정

### 3.4 확정 matrix (Step 1 §2.3 갱신)

| Mutation step | 편집 target 유형 | change_kind | target_files.length | Route | 실행 주체 |
|---|---|---|---|---|---|
| promotions | `learnings/_global.md` | docs_only | 1 | self_apply | promote-executor |
| contradiction_replacements | `learnings/*.md` | docs_only | 1 | self_apply | promote-executor |
| axis_tag_changes | `learnings/*.md` | docs_only | 1 | self_apply | promote-executor |
| retirements | `learnings/*.md` | docs_only | 1 | self_apply | promote-executor |
| audit_outcomes | `learnings/*.md` + audit-state | docs_only | 1-2 | self_apply (docs=1, audit별도)* | promote-executor |
| **obligation_waive** (Step 2) | audit-state 단일 | docs_only | 1 | **self_apply** | promote-executor |
| **cross_agent_dedup** (Step 2) | `learnings/*.md` 복수 (cluster) | docs_only | 2+ | **queue** | staging → Principal approve |
| **domain_doc_updates** (Step 2) | `domains/*/*.md` 단일 (decision 단위) | docs_only | 1 | **self_apply** | promote-executor |
| (domain_doc_updates atomic batch) | `domains/*/*.md` 복수 | docs_only | 2+ | queue | staging → Principal approve |
| (v1 신규) lexicon/principle patch | `.onto/authority/` + `.onto/principles/` | - | - | **principal_direct** | Principal 수동 + queue 기록 |
| (v1 신규) process patch | `.onto/processes/*.md` | - | - | **principal_direct** (Step 2) | Principal 수동 + queue 기록 |

*audit_outcomes: 각 decision 이 learnings file + audit-state 두 파일을 만질 수 있으나, `audit-state` 는 logical state store (내부) 로 취급해 target_files 집계에서 제외. 즉 docs 관점에서는 1 file. 구현 세부는 Step 3 에서 정리.

## 4. Step 3 로 이월

본 Step 2 완결 후 Step 3 가 다뤄야 할 잔여:

1. **Staging schema**: `.onto/govern/staging/<proposal-id>/{patch.diff, meta.yaml, baseline.snapshot}` 의 field 확정
2. **atomic cross-doc flag**: domain_doc_updates batch 가 cross-doc 정합성을 요구할 때 single aggregate proposal 로 변환하는 기준 (promote-executor API 변경)
3. **gitignore + allowlist 정책**: `.onto/govern/staging/` 의 gitignored 처리 + `check-onto-allowlist.sh` 의 자동 exclusion
4. **queue event payload 확장**: drift-engine 의 `routeProposal` 이 queue 에 append 하는 payload 에 `staging_path` 추가

## 5. 주체자 결정 기록 (2026-04-22 pm)

Step 3 진입 전 주체자 confirm 완료. 네 항목 모두 추천안 채택.

### (1) `.onto/processes/` 전체 승격 — 수락 ✅

- `drift-engine.ts` 의 `GOVERNANCE_CORE_DIR_PREFIXES` 에 `.onto/processes/` 추가
- `GOVERNANCE_CORE_FILES` 의 `.onto/processes/govern.md` 는 prefix 에 흡수되어 redundant — 구현 세션에서 정리 여부 결정 (backward-compat 주석만 남길지)
- 영향: learn v1 이 모든 `.onto/processes/*.md` 을 자동 편집 금지. 모든 계약 문서는 Principal 수동 편집 + govern queue 기록

### (2) obligation_waive → self_apply — 수락 ✅

- 각 decision = 단일 audit-state 파일 in-place 수정
- `drift-engine.classifyProposal` 의 `local_docs_single` rule (docs_only + target_files.length=1) 에 match
- promote-executor 가 `withFileLock` + `createRecoverabilityCheckpoint` 로 직접 write (v0 거동 유지)

### (3) cross_agent_dedup → queue — 수락 ✅

- cluster 본질상 복수 agent file 동시 편집 (line-level mark + consolidated append)
- target_files.length > 1 → `drift_default` rule → queue
- promote-executor 는 직접 write 하지 않고 staging area 에 patch 기록 + govern queue `submit` event append. Principal 승인 시 staging 에서 apply

### (4) domain_doc_updates → self_apply + atomic flag Step 3 이월 — 수락 ✅

- 각 decision 을 **개별 ChangeProposal** 로 변환. 단일 domain doc 수정이므로 대부분 self_apply
- 예외 — atomic cross-doc 정합성 필요 batch: Step 3 staging schema 에서 `atomic_batch` flag 정의 시 aggregate ChangeProposal 로 전환
- Step 3 에서 promote-executor API 가 cross-doc mutation flag 를 어떻게 표현할지 결정

### 확정된 결정이 Step 3 에 미치는 영향

- **Staging schema (§4.1)**: queue route 에 해당하는 mutation step 은 **cross_agent_dedup** + **atomic domain_doc_updates batch** 두 카테고리. staging 경로별로 다른 shape 필요 여부 Step 3 에서 결정
- **gitignore + allowlist (§4.3)**: `.onto/govern/staging/` 을 `.gitignore` enumerated-ephemeral 에 추가 + `scripts/check-onto-allowlist.sh` 의 documentation 주석 갱신 (allowlist entry 추가 불필요 — gitignored 는 tracked 안 되므로 guard 대상 안 됨)
- **queue event payload (§4.4)**: `GovernSubmitEvent.payload` 에 `staging_path: string` 필드 추가 (govern/types.ts 확장). Principal 이 `onto govern list-drift-candidates` 에서 staging 참조

## 6. 본 문서의 위치

- **Previous**: Step 1 (`20260422-phase4-stage2-step1-drift-engine-learn-binding.md`, PR #194 merged)
- **Current**: Step 2 (본 문서)
- **Next**: Step 3 (staging schema), Step 4 (Principal 개입 matrix)
- **최종 정착**: Stage 2 완결 시 `.onto/processes/govern.md` + `.onto/processes/learn/promote.md` 에 계약 섹션 추가 (구현 세션에서)
