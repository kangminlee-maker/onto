---
as_of: 2026-04-17
status: active
functional_area: active-remaining-work-handoff
purpose: |
  2026-04-17 세션 종료 시점의 active 잔여 작업 8 건에 대한 session-restart handoff.
  `/clear` 직후 다음 세션이 맨땅에서 시작하지 않고 즉시 착수할 수 있도록 각 항목의
  현재 상태 · 범위 · verify 명령 · 착수 순서를 고정.
source_refs:
  session_record: "git log (PR #77~#87, 2026-04-17)"
  track_memory: "~/.claude-1/projects/-Users-kangmin-cowork-onto-4/memory/project_output_language_boundary_track.md"
  principal_memory: "~/.claude-1/projects/-Users-kangmin-cowork-onto-4/memory/project_principal_stage3_backlog.md"
  roles_memory: "~/.claude-1/projects/-Users-kangmin-cowork-onto-4/memory/project_roles_refactor_v3_backlog.md"
---

# Active Remaining Work Handoff (2026-04-17 → next session)

## 0. 첫 명령 (이 문서 + memory 읽은 뒤)

```
development-records/plan/20260417-active-remaining-work-handoff.md 읽고 §3 권장 순서대로 착수해줘
```

## 1. Session context (directly preceding)

2026-04-17 세션에서 **11 PR 머지 + Output Language Boundary Track 전수 완결 + 5 건 의심 backlog 재평가**. Phase 3-4 wrap-up 의 미해결 backlog 도 대부분 처리.

현재 main 상태:
- `main` up-to-date with origin
- OPEN PRs: 0
- Working tree: clean
- 계획 단계 M-00~M-08 완결, 실행 단계 143/143 완결
- Output Language Boundary 5-layer 방어 + production A4 + boilerplate + sketch 완비
- 오늘 merged PR: #77/#78/#79/#80/#81/#82/#83/#84/#85/#86/#87

## 2. Active 잔여 8 건 (verify 결과 기반 정리)

**중요**: memory 가 주장하는 10 건 중 2 건은 이미 RESOLVED 됐으나 memory 가 stale. verify 결과 실제 active = **8 건**.

### Resolved (memory stale — handoff 에서 제거, 다음 세션에 memory 정리 권장)

| 원 ID | 실제 상태 | 증거 |
|---|---|---|
| Roles BL-1 CONS-1 | **RESOLVED** | `processes/review/lens-prompt-contract.md §9.3.3` 이 shared fallback mini-contract 의 canonical seat 선언 + "CONS-1 지적 대응" 명시 |
| Roles BL-3 UF-1/UF-2 | **RESOLVED** | `roles/dependency.md:3` + `roles/conciseness.md:3` 이 각각 scope 주의 note 포함 (lexicon 정의와 동일 scope 명시) |

### 8 Active Items

#### A. 코드 refactor 2 건 (독립 실행 가능, XS-S 규모)

**A1. Principal #2 — Structured diagnostic contract**

- **위치**: `src/core-runtime/evolve/commands/error-messages.ts:83, 86`
- **현재 pattern**: `reason.includes(m.includes)`, `m.includes_all.every((s) => reason.includes(s))`
- **목표**: stable diagnostic `code` → principal-facing `copy` 의 2-tier 구조. 현재는 문자열 substring 매칭으로 에러 분류 — `reason` 텍스트가 바뀌면 분류 깨짐
- **규모**: S (~50-100 줄, test 포함)
- **Verify 명령**: `grep -n "reason.includes\|reason ===" src/core-runtime/evolve/commands/error-messages.ts`
- **Blast radius**: evolve commands 의 error 처리 호출자 전수 (`grep -rn "error-messages" src/core-runtime/evolve/`)
- **Recommended approach**: error type union (e.g., `type DiagnosticCode = "schema_missing" | "packet_not_found" | ...`) + `code → copy` 매핑 테이블. 호출자는 code 로 분류, copy 는 render seat 에서 조합

**A2. Principal #3 — draft-packet.ts constraint source 일치**

- **위치**: `src/core-runtime/evolve/renderers/draft-packet.ts` (`constraint_details` 5 refs) + `propose-align.test.ts:87` (`constraint_pool.summary.total`)
- **현재 문제**: `state.constraint_pool.summary` 와 `content.constraint_details` 가 다른 source 를 사용 → 값 불일치 가능
- **규모**: S (consistency guard 추가 또는 단일 source 통합)
- **Verify 명령**: `grep -n "constraint_pool\|constraint_details" src/core-runtime/evolve/**/*.ts`
- **Recommended approach**: 하나를 canonical 로 선택 (likely `constraint_details` 이 detail-level, `constraint_pool.summary` 는 그로부터 derived). `draft-packet` 렌더 시점에 consistency assert 추가. 또는 test 에서 두 값이 일치하는지 invariant check

#### B. Lexicon 확장 cluster (5 건, 함께 처리 권장, M 규모)

**B1. Principal #5 — dispatch target relation**

- **위치**: `authority/core-lexicon.yaml:626, 631, 635, 644` 4 지점이 `"dispatch target: deferred to Stage 3 (intentional, not modeling omission)"` note 보유
- **적용 대상**: reconstruct / learn / govern / evolve entity instance (review instance 는 이미 dispatch target relation 보유)
- **목표**: 각 activity entity 에 dispatch target relation 추가. 현재 review 만의 패턴을 4 활동으로 확장
- **규모**: M (lexicon schema 확장 + 4 instance update + authority 검증)
- **Blast radius**: `authority/core-lexicon.yaml` v bump + 이전 버전 anchor 참조자

**B2. Principal #6 — 각 entrypoint 별 process entity**

- **상태**: Principal #5 와 불가분. review 가 `review_process` entity 를 가지듯 reconstruct/evolve/learn/govern 에도 process entity 도입
- **규모**: M (B1 과 함께 처리 권장, 동일 lexicon version bump 에 포함)

**B3. Principal #8 — competency scope / competency questions 개념**

- **목표**: onto 가 답할 수 있는 질문의 경계를 ontology 내에서 표현하는 1급 개념 도입
- **현재**: pragmatics lens 가 `competency_qs.md` 를 domain 파일로 사용하는 정도. lexicon 에 entity 로 등재 안 됨
- **규모**: M (concept entity + 기존 pragmatics 와의 edge 정의)

**B4. Principal #9 — provenance concept**

- **목표**: ontology 개념의 authorship / modification 추적을 위한 1급 개념
- **overlap 주의**: Roles BL-5 (provenance lens) 와 통합 설계 가능 — "provenance lens" 신설 여부까지 한 번에 결정
- **규모**: M (lexicon entity + 선택적으로 lens 추가)

**B5. Principal #10 — modularity boundary**

- **목표**: 파일 분할 시점의 canonical 기준을 lexicon 에 명시
- **현재 lexicon 의 `partition_trigger` 와 연계**
- **규모**: S-M (기존 partition_trigger 확장 또는 별도 entity)

#### C. Design 단일 건 (1 건, L 규모)

**C1. Roles BL-4 — Authority/Lineage Compatibility Gate**

- **상태**: axiology-proposed perspective 로 여러 리뷰에서 preserved, standing lens 로 미채택
- **목표**: canonical 문서 refactor 시 `authority → contract → artifact seat → consumer` chain 이 강화/약화되는지 pre-gate 로 검증하는 메커니즘
- **규모**: L (governance 메커니즘 — Phase 4 govern 활동 설계와 밀접 연관)
- **Recommended**: **독립 PR 금지**. Phase 4 govern 설계 세션의 input 으로 자연스럽게 흡수

## 3. 권장 착수 순서

### 옵션 1: Warm-up 우선 (A1 → A2 → B cluster → C1)

`/clear` 직후 cognitive load 낮은 항목부터:

1. **A2 (draft-packet constraint source)** 먼저 — 가장 좁은 scope, test 이미 있음, 1 파일 중심 수정
2. **A1 (error-messages 2-tier)** — test 추가 필요하지만 evolve commands 에 한정
3. **B cluster (B1-B5 일괄)** — lexicon schema bump 은 한 번에. 부분 작업하면 version 관리 복잡
4. **C1 (BL-4 Gate)** — Phase 4 govern 설계로 이연

### 옵션 2: Cluster 우선 (B cluster → A → C1)

Lexicon 확장을 먼저 처리하면 Principal concept 체계가 명확해져서 이후 code refactor (A1/A2) 가 새 concept 활용 가능:

1. **B cluster 전체 (#5/#6/#8/#9/#10)** — lexicon Stage 3-3 mini-cycle 로 한 번에
2. **A1/A2** — lexicon 의 새 concept 을 code 에도 반영
3. **C1** — Phase 4 govern 으로

### 옵션 3: Phase 4 설계 바로 진입

8 건을 개별 backlog 로 풀지 말고 **Phase 4 설계 세션 requirements list 로 편입**:

- B1/B2/B3/B4/B5 는 Phase 4 가 4 활동 (evolve / reconstruct / learn / govern) 의 실행 체계를 정의할 때 자연 흡수
- C1 (BL-4 Gate) 는 Phase 4 govern 설계 핵심 input
- A1/A2 는 독립 code refactor — Phase 4 와 무관하게 언제든 가능

Phase 4 설계 세션 착수 → 위 8 건 중 6 건 (B+C) 이 설계 안에서 해소 → A1/A2 만 별도 처리.

### 권장

**옵션 1 또는 3**. 옵션 2 는 B cluster 선처리가 Phase 4 설계를 선제 제약할 가능성 — Phase 4 가 process entity 구조를 재정의할 수도 있으므로 B 를 먼저 확정하면 재작업 위험.

**가장 안전한 경로**: **옵션 1 의 A1 + A2 만 한 세션에 처리** → 그 뒤 Phase 4 설계 세션 (옵션 3) 으로 진입. 8 건 중 **2 건은 즉시 처리, 6 건은 Phase 4 에 흡수**.

## 4. Anti-patterns (오늘 세션 learnings)

- **Memory drift 주의**: 본 handoff 의 "Resolved (memory stale)" 섹션 참조. memory 의 active 주장은 verify 필수. 본 섹션에서 확인한 2 건 (BL-1 / BL-3) 외에도 추가 stale 항목 있을 수 있음 — 각 item 착수 전 관련 파일 grep 권장
- **Main 에 직접 commit 금지**: 오늘 Stage γ (PR #85) 에서 실수로 main 에 commit 했다가 `git branch <sha> + git reset --hard origin/main` 으로 복구. 새 세션은 PR 착수 시점에 `git checkout -b <branch>` 먼저 습관화
- **로컬 LLM 관련 작업 defer 유지**: `feedback_local_llm_architectural_review.md` 에 따라 qwen3-30B-A3B 같은 로컬 모델은 architectural review 에 부적합. 만약 review 가 필요하면 Claude/Codex 사용. 또한 현재 production synthesize packet 이 `tools: required` 를 강제하므로, 로컬 MLX + `tool_mode: inline` 조합은 fail-fast (PR #85 migration note 참조)
- **PR 묶음 vs 분리**: 오늘 세션의 11 PR 은 모두 "한 리뷰 질문 = 한 PR" 원칙을 지켰음. Lexicon cluster (B1-B5) 같이 의존적 변경은 한 PR 로 묶고, 독립 변경은 분리. A1 과 A2 는 독립 (서로 무관) 이므로 별도 PR 권장

## 5. Session startup checklist (`/clear` 직후)

- [ ] MEMORY.md 읽고 오늘 세션 성과 확인 (특히 마지막 10 entries)
- [ ] `git status` — main 이 clean 한지 + origin/main 과 동기 확인
- [ ] `gh pr list --state open` — 0 PRs 확인 (혹시 이 handoff 후 새 PR 생겼는지)
- [ ] `npm run lint:output-language-boundary` — 374+ files clean 확인 (baseline 보호 상태)
- [ ] 옵션 1/2/3 중 선택, 그에 맞는 branch checkout
- [ ] 착수할 item 의 verify 명령 (§2) 실행해 현재 상태 재확인

## 6. Related memory pointers

- `project_execution_phase_progress.md` — 143/143 완결
- `project_output_language_boundary_track.md` — track 전수 완결 이력
- `project_principal_stage3_backlog.md` — Principal 6 active items detail
- `project_roles_refactor_v3_backlog.md` — Roles 4 items (2 는 stale, 2 는 실제 active)
- `feedback_local_llm_architectural_review.md` — 로컬 LLM 부적합 규칙
- `feedback_implicit_review_target.md` — 명시 없는 review 요청 처리 규칙

## 7. 이 handoff 의 생애 주기

- **활성**: 다음 세션이 첫 작업을 시작할 때까지
- **Superseded**: 다음 세션이 §3 의 옵션 중 하나를 선택해 착수하면, 그 세션의 결과에 따라 본 handoff 는 superseded. `status: active` → `status: superseded` + 후속 handoff 생성 (필요 시)
- **Archive**: 8 active items 모두 해소되거나 Phase 4 설계에 흡수되면 archive
