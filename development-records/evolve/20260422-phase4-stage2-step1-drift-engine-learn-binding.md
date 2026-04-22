---
as_of: 2026-04-22
status: design-artifact
functional_area: phase-4-stage-2-step-1
purpose: |
  Phase 4 Stage 2 Step 1 (PR #133 handoff §3.4 Step 1) — 현 `govern/drift-engine.ts`
  의 3 분기 (self_apply / queue / principal_direct) 와 learn v1 자동 편집의 결합
  구조 기술. 본 문서는 **설계 artifact** 이며 구현 금지. Step 2 (authority 파일
  intersection) / Step 3 (2-phase commit) / Step 4 (Principal 개입 matrix) 의
  입력.
authority_stance: non-authoritative-design-surface
canonicality: scaffolding
source_refs:
  stage_2_handoff: "development-records/plan/20260419-phase4-handoff.md §3.4"
  design_input: "development-records/evolve/20260419-phase4-design-input.md"
  onto_direction: "development-records/evolve/20260413-onto-direction.md §1.3"
  drift_engine: "src/core-runtime/govern/drift-engine.ts"
  promote_executor: "src/core-runtime/learning/promote/promote-executor.ts"
  govern_types: "src/core-runtime/govern/types.ts"
---

# Phase 4 Stage 2 Step 1 — drift-engine × learn v1 결합

## 0. 본 Step 의 범위

Stage 2 전체 goal: **learn v1 ↔ govern v1 순환 의존 해소**. Step 1 은 그 첫 단계로, 현 코드 상태 파악 + 결합 계약 초안 작성. Step 2~4 의 input.

산출: learn v1 이 편집 action 을 실행하기 전 drift-engine classification 을 **강제 호출** 하도록 하는 **contract 정의**. staging/rollback/Principal matrix 의 상세는 Step 2~4.

## 1. 현재 상태 (v0)

### 1.1 learn/promote — 이미 자동 파일 편집 수행

`src/core-runtime/learning/promote/promote-executor.ts` 가 Phase B Orchestrator (Step 10b) 로서 이미 **8 mutation step** 을 자동 실행한다:

| # | Mutation step | 대상 파일 양상 (추정) |
|---|---|---|
| 1 | promotions | global learnings file append |
| 2 | contradiction_replacements | in-place line replace |
| 3 | axis_tag_changes | in-place line edit |
| 4 | retirements | delete or comment out |
| 5 | audit_outcomes | modify/delete based on audit |
| 6 | obligation_waive | audit-state transition |
| 7 | cross_agent_dedup_approvals | scope-aware line-level mark + consolidated append |
| 8 | domain_doc_updates | LLM content generation + file update |

실제 write 는 `fs.writeFileSync` / `fs.appendFileSync` 직접 호출 (L271, L309, L331, L367, L553, L648, L729, L889, L1568). 경로는 caller 가 `filePath` 로 전달 — 주로 `artifact-registry.ts` (`REGISTRY`) 가 해소.

**즉 design-input §1.4 의 "v0 수동 편집 → v1 자동 편집" 표현은 코드 상태와 상충**. v0 에서 이미 `learnings/*.md` + `domains/*/*.md` 자동 편집 수행 중.

### 1.2 govern/drift-engine — 3 분기 classifier (standalone)

`src/core-runtime/govern/drift-engine.ts`:

**DriftRoute**:
```ts
export type DriftRoute = "self_apply" | "queue" | "principal_direct";
```

**Governance core target 정의** (L50-L58):
```ts
const GOVERNANCE_CORE_DIR_PREFIXES = [
  ".onto/authority/",
  ".onto/principles/",
];
const GOVERNANCE_CORE_FILES = [
  ".onto/processes/govern.md",
];
```

**Classification 규칙** (L75-L101, deterministic, 우선순위 순):
1. **principal_direct**: `target_files` 중 하나라도 governance core → drift 여부 무관
2. **self_apply**: `change_kind === "docs_only"` AND `target_files.length === 1` AND 규칙 1 미적용
3. **queue**: 그 외 전부 (drift 증폭 가능성 default)

**Route 실행** (L106-L145):
- `self_apply`: no-op. caller 가 자체 실행 후 보고 로그만 기록
- `queue`: govern queue 에 `origin=system, tag=drift` append
- `principal_direct`: queue 에 `origin=system, tag=drift` + payload marker `route=principal_direct`

### 1.3 결합 현황 — 없음

```
$ grep -rn "from.*drift-engine\|import.*drift-engine" src/core-runtime/
src/core-runtime/govern/cli.ts:21: import { routeProposal } from "./drift-engine.js";
src/core-runtime/govern/cli.ts:22: import type { ChangeKind, ChangeProposal } from "./drift-engine.js";
src/core-runtime/govern/drift-engine.test.ts:15: import { classifyProposal, routeProposal } from "./drift-engine.js";
```

**`govern/cli.ts` 만 drift-engine 사용** (`onto govern ...` CLI 경로). `learn/promote` 는 drift-engine 을 호출하지 않는다. 즉 learn 의 자동 편집 8 step 은 **drift 분류 gate 없이 실행**.

### 1.4 v1 차이점 재정의 (design-input §1.4 정정)

"v0 수동 → v1 자동" 이 아니라:

| 축 | v0 | v1 |
|---|---|---|
| 편집 대상 범위 | `learnings/*.md` + `domains/*/*.md` | **+ `.onto/authority/*.yaml` + `.onto/principles/*.md` + `.onto/processes/*.md` (govern.md 제외)** |
| drift gate | 없음 | drift-engine.classifyProposal() 강제 호출 |
| staging | 없음 | queue route 의 경우 staging area 에 patch 적재 |
| rollback | recoverability checkpoint (promote-executor 내부) | + staging area 기반 Principal reject 경로 |

**v1 의 핵심 변화는 "편집 대상 확장 + drift gate 강제 + staging + rollback"**, 기존 자동 편집 기능은 유지.

## 2. v1 결합 계약 (초안)

### 2.1 결합 흐름

```
[learn/promote decide approve]
        ↓
[promote-executor] 가 각 mutation step 을 수행하기 전:
        ↓
[1] ChangeProposal 조립 (target_files + change_kind + origin)
        ↓
[2] drift-engine.classifyProposal() 호출 → DriftDecision { route, matched_rule, reason }
        ↓
[3] route 별 분기:
        self_apply       → promote-executor 가 직접 write (현 v0 거동 유지)
        queue            → staging area 에 patch 기록 + govern queue submit
                           (Principal 승인 후 promote-executor 가 staging 에서 apply)
        principal_direct → promote-executor 거부. Principal 에게 수동 편집 안내
                           + queue 에 route=principal_direct marker 기록
```

### 2.2 ChangeProposal 생성 규약

`promote-executor` 의 각 mutation step 이 ChangeProposal 을 조립해야 한다. 현 `ChangeProposal` (drift-engine.ts L24-L29):
```ts
export interface ChangeProposal {
  id: string;
  target_files: string[];
  change_kind: ChangeKind;   // "docs_only" | "code" | "config" | "mixed"
  origin_event: string;       // e.g. "learn.promote.approve"
}
```

learn 의 각 step 이 `origin_event` 에 구체 identifier 를 넣어 추적:
- `learn.promote.promotions`
- `learn.promote.contradiction_replacement`
- `learn.promote.axis_tag_change`
- `learn.promote.retirement`
- `learn.promote.audit_outcome`
- `learn.promote.obligation_waive`
- `learn.promote.cross_agent_dedup`
- `learn.promote.domain_doc_update`

### 2.3 Route → 실행 주체 matrix

| Mutation step | 편집 target 유형 | change_kind | 현 v0 거동 | v1 drift route | v1 실행 주체 |
|---|---|---|---|---|---|
| promotions | `learnings/_global.md` 단일 | docs_only | auto | **self_apply** | promote-executor 직접 |
| contradiction_replacements | `learnings/*.md` 단일 | docs_only | auto | **self_apply** | promote-executor 직접 |
| axis_tag_changes | `learnings/*.md` 단일 | docs_only | auto | **self_apply** | promote-executor 직접 |
| retirements | `learnings/*.md` 단일 | docs_only | auto | **self_apply** | promote-executor 직접 |
| audit_outcomes | `learnings/*.md` 단일 (audit-state 별도) | docs_only | auto | **self_apply** | promote-executor 직접 |
| obligation_waive | audit-state (`.onto/learnings/_audit/*`) | config | auto | **self_apply** 또는 queue | TBD — Step 2 에서 결정 |
| cross_agent_dedup | `learnings/*.md` 복수 파일 | docs_only | auto | **queue** | staging → Principal approve → apply |
| domain_doc_updates | `domains/*/concepts.md` 단일 | docs_only | auto | **self_apply** | promote-executor 직접 |
| domain_doc_updates (복수) | `domains/*/*.md` 복수 | docs_only | auto | **queue** | staging → Principal approve → apply |
| **(v1 신규) lexicon patch** | `.onto/authority/core-lexicon.yaml` | config | — | **principal_direct** | Principal 수동 |
| **(v1 신규) principle patch** | `.onto/principles/*.md` | docs_only | — | **principal_direct** | Principal 수동 |
| **(v1 신규) process patch** | `.onto/processes/*.md` (govern.md 제외) | docs_only | — | **self_apply** 또는 queue | 단일이면 self_apply, 복수면 queue |

### 2.4 3 routes 의 계약 차이

- **self_apply** route:
  - promote-executor 가 `withFileLock` 으로 직접 write
  - `recoverability.createRecoverabilityCheckpoint()` 로 rollback 가능
  - govern queue 에 event 기록 없음 (drift-engine 의 현 계약 유지)
  - learn v1 의 `feedback-to-product` log 에 "self_apply executed" 기록

- **queue** route:
  - promote-executor 가 **직접 write 하지 않음**
  - 대신 patch 를 staging area 에 기록 (Step 3 에서 schema 확정)
  - `govern/queue` 에 `submit` event append (`origin=system, tag=drift`, payload 에 `staging_path` 포함)
  - Principal 이 `onto govern list-drift-candidates` 로 확인 → `onto govern decide <id> approve` 시 staging 에서 apply
  - reject 시 staging 에서 삭제 + queue 에 reject 기록

- **principal_direct** route:
  - promote-executor 가 **거부**. learn/promote session 결과에 "principal_direct required" 기록
  - govern queue 에 payload marker `route=principal_direct` append (W-C-02 현 계약 유지)
  - Principal 에게 수동 편집 안내 메시지 출력 (output-language-boundary 경유)
  - **`.onto/authority/` 와 `.onto/principles/` 는 자동 편집 없음이 원칙**

## 3. 미해결 점 (Step 2~4 이월)

### Step 2 — "learn 편집" vs "govern 차단" intersection 정밀 정의

본 문서 §2.3 matrix 의 "TBD" 항목:
- `obligation_waive` 의 audit-state 변경이 self_apply vs queue 중 어느 쪽인가
- `cross_agent_dedup_approvals` 가 항상 queue 인가, 일부 경우 self_apply 가능한가
- `domain_doc_updates` 의 복수 파일 기준 (현재는 "갯수" 만 본다 — 내용 의미도 고려?)
- `.onto/processes/*.md` 의 세분화 (예: `review.md` 처럼 review 계약은 principal_direct 로 승격?)

### Step 3 — 2-phase commit staging area schema

- Staging path: `.onto/govern/staging/<proposal-id>/` 제안
- 포함 파일: `patch.diff` (unified diff), `meta.yaml` (ChangeProposal + DriftDecision + origin), `baseline.snapshot` (rollback reference)
- Commit 조건: Principal `onto govern decide approve` 로 trigger
- Rollback 경로: reject 시 staging 삭제 + queue 에 reject 이유 기록
- .gitignore 정책: staging area 는 ephemeral — gitignored 할지 commit 할지 결정 필요

### Step 4 — Principal 개입 지점 matrix

- 자동 적용 (self_apply): Principal 사후 보고만
- 승인 대기 (queue): Principal 이 `onto govern list-drift-candidates` 로 확인 → approve/reject
- 수동 편집 (principal_direct): Principal 이 파일 직접 편집 + `onto govern decide` 로 후기 기록
- Emergency pause: Principal 이 learn v1 자동 편집을 일시 중단 (`onto learn pause` 같은 CLI)

## 4. 구현 영향 (참고용, 구현 금지)

v1 구현 시 영향 받는 파일:

- `src/core-runtime/learning/promote/promote-executor.ts` — 각 mutation step 앞에 drift-engine 호출 + 3 route 분기
- `src/core-runtime/govern/drift-engine.ts` — ChangeProposal 에 `origin_event` field 가 이미 있음. 추가 수정 없음
- `src/core-runtime/govern/queue.ts` — staging 참조 payload schema 확장 필요
- `src/core-runtime/govern/cli.ts` — `govern decide approve` 가 staging 에서 apply 수행 로직 추가
- **신규 모듈**: `src/core-runtime/govern/staging.ts` (staging area read/write/rollback)

## 5. 주체자 결정 기록 (2026-04-22 pm)

Step 2 진입 전 주체자 confirm 완료. 네 항목 모두 추천안 채택.

### (1) §1.4 재정의 — 수락 ✅

design-input §1.4 의 "v0 수동 편집 → v1 자동 편집" 표현은 코드 실상 (promote-executor 가 v0 부터 이미 8 step 자동 write) 과 상충. **v1 의 진짜 차이는 "편집 대상 확장 + drift gate + staging + rollback 의 4 축"** 으로 정본화. 향후 design-input 업데이트 시 §1.4 문구 정정 (본 Step 1 문서가 근거).

### (2) §2.3 self_apply matrix — 수락 ✅

`learnings/*.md` + `domains/*/concepts.md` **단일 파일** 편집은 v1 에서도 drift-engine.classifyProposal() 이 `self_apply` 를 반환하면 **Principal 개입 없이 즉시 자동 실행**. 근거: v0 거동 유지가 dogfood 실행 가능성 보장 — 매번 Principal 승인 요구 시 사실상 v0 퇴보.

### (3) §2.4 `principal_direct` 원칙 — 수락 ✅

`.onto/authority/` 전체 + `.onto/principles/` 전체 + `.onto/processes/govern.md` 는 **learn 이 자동 편집하지 않음**. 반드시 Principal 수동 편집 + govern queue 기록. **예외 없음**. 근거: authority / principle 은 시스템의 canonical 소스, 자동 수정 허용 시 self-drift 위험 (Phase 4 dogfood 가 자기 정체성을 수정하는 역설 방지).

### (4) §3.4 Step 3 staging path — (a) 확정 ✅

Staging area 위치 + tracking:

- **Path**: `.onto/govern/staging/`
- **Tracking**: **gitignored** (ephemeral)
- **근거**: staging 은 Principal 판정 이전의 transient state. commit 가치 낮음. `.gitignore` 의 enumerated-ephemeral 정책 + allowlist guard (`scripts/check-onto-allowlist.sh`) 와 정합. 단 `.onto/govern/staging/` 을 `.gitignore` 에 추가하면서 동시에 allowlist 에서 직접 exclusion 명시 필요 (Step 3 에서 구현)

### 확정된 결정이 Step 2~4 에 미치는 영향

- **Step 2** (authority 파일 intersection 정밀 정의): (3) 에 따라 governance core 경계는 현 drift-engine `isGovernanceCoreTarget` 을 그대로 사용. 추가 정밀화는 "governance core 아닌 파일 중 learn 자동 편집 허용 범위" 세분화에 집중
- **Step 3** (2-phase commit staging schema): (4) 에 따라 `.onto/govern/staging/<proposal-id>/` 구조로 설계. gitignore + allowlist 정책 동시 반영
- **Step 4** (Principal 개입 matrix): (2) 의 self_apply 기본값 + (3) 의 principal_direct 원칙이 matrix 의 양쪽 끝. queue route 의 중간 지점 세분화가 Step 4 의 핵심

## 6. 연관 artifacts

- Step 2/3/4 문서 (예정): `development-records/evolve/20260422-phase4-stage2-step{2,3,4}-*.md`
- 계약 정착 시 merge 대상: `.onto/processes/govern.md` (drift 분기 × learn 결합 섹션 추가) + `.onto/processes/learn/promote.md` (drift gate 호출 contract)
- W-ID 예약 (Q4 결정 기반): 실제 구현 착수 시 W-C-09~ / W-A-79~ 부여 — Stage 2 완료 후
