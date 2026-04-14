# Current Planning Artifacts

Last updated: 2026-04-13 (M-05 v1.1 patch 완료 기준 — codex review 383afe00 CONDITIONAL consolidated 해소. M-06 진입 준비)

이 파일은 `plan/` 디렉토리 각 artifact 계열의 최신 active 버전 경로를 명시한다. M-08 refresh protocol이 매 갱신 시 업데이트한다.

## Active Artifacts

### M-00 실행 준비 답변서
- **Current**: `20260413-m00-preparation-qa.md`
- **Status**: active
- **Revision**: v3
- **Scope**: M-00 착수 직전 5개 점검 질문 답변 + CC1 4항 반영 (6차 review PASS)

### M-00 Startup Handoff
- **Current**: `20260413-m00-startup.md`
- **Status**: superseded (M-00 실행 완료)
- **Scope**: 새 세션 착수 가이드

### M-03 Startup Handoff
- **Current**: `20260413-m03-startup.md`
- **Status**: superseded (M-03 실행 완료)
- **Scope**: /clear 후 새 Claude Code 세션에서 M-03 (Gap 분석 + Disposition 분류) 진입 경로

### M-04 Startup Handoff
- **Current**: `20260413-m04-startup.md`
- **Status**: superseded (M-04 Phase A 실행 완료)
- **Scope**: /clear 후 새 Claude Code 세션에서 M-04 Phase A (Task Schema·Canonical Output 결정) 진입 경로

### M-05 Startup Handoff
- **Current**: `20260413-m05-startup.md`
- **Status**: superseded (M-05 실행 완료)
- **Scope**: /clear 후 새 Claude Code 세션에서 M-05 (Pre-draft Dependency Modeling) 진입 경로. DL-015 (Compound sequencing) + DL-031 (Phase B sanity check) 처리 + 축·활동 의존 그래프 작성 + D bootstrap vs continuing 명문화

### M-06 Startup Handoff
- **Current**: `20260413-m06-startup.md`
- **Status**: active (다음 세션에서 M-06 착수용)
- **Scope**: /clear 후 새 Claude Code 세션에서 M-06 (축별 Work Item 초안) 진입 경로. ~132 W-ID 추정, Wave 1~4 (D → B → A → C) 분할 실행. compound 3 사례 N W-ID 분해 + DL-016~022/029 신규 도출 + delegated validation minimum surface 3 조건 + 각 W-ID 18 필드 채움.

### onto Dependency Graph (M-05 산출)
- **Current**: `../design/20260413-onto-todo-dep-graph.md`
- **Status**: active (v1.1)
- **Scope**: 축 (A/B/C/D) 간 의존 그래프 + 활동 간 의존 + 축×활동 매트릭스 (review split + W-D bootstrap-only) + D bootstrap/continuing (accumulation structure 마감) + Compound sequencing rule SSOT + M-05/M-06/M-07 책임 경계. M-06 work item 분배 입력 계약.
- **Revision**: v1.1 (2026-04-13, DR-M05-01/02/03/04 + DR-M04-03 applied. codex review `20260413-383afe00` CONDITIONAL 해소)

### onto Work Item Canonical Output
- **Current**: `../design/20260413-onto-todo.md`
- **Status**: active (v1.4 patch, item_count=0, M-06 에서 채움)
- **Scope**: 축 A/B/C/D work item canonical output seat. **18 필드 schema** (v1.4 compound_member 추가) + append/revise 규약 + W-{axis}-{nn:02d} 명명 + Phase B exit 경로 (PASS/FAIL/FAIL-boundary/skipped-by-delegation) + cluster 알고리즘 + A0 ownership clarity + **Compound 무결성 불변식 4건**
- **Revision**: v1.4 (2026-04-13, DR-M04-03 적용 — schema_version v1.1→v1.2 additive minor bump. compound_member field + compound_expansion change_type + Compound 무결성 불변식 4건)
- **Review sessions** (3 라운드):
  - `.onto/review/20260413-a9e93dd7/` (claude/agent-teams) — CONDITIONAL → v1.1 해소 (BLOCKING 1 + MAJOR 4 + MODERATE 5)
  - `.onto/review/20260413-de95c971/` (codex/subagent, deliberation in-process) — PASS-with-residuals → v1.2 해소 (4 follow-up)
  - `.onto/review/20260413-383afe00/` (codex/subagent, M-05 review) — CONDITIONAL → v1.4 해소 (Immediate A1 schema 확장)

### Backlog Consolidation
- **Current**: `20260413-backlog-consolidated.md`
- **Status**: active
- **Revision**: v3.2 (2026-04-13, 9-lens review MINOR 20+ 전수 해소 + DL-029/030 신규 도출)
- **Review session**: `.onto/review/20260413-cf964039/` (CONDITIONAL verdict, Agent Teams nested spawn; v3.1 BLOCKING+MAJOR+MODERATE 10건 + v3.2 MINOR 20+ 전수 해소)
- **Item count**: 123
- **Source 분포**: backlog_memory 87 / memory 29 / design 4 / onto_direction 3 / pr 0
- **Activity 분포** (primary): E 76 / G 39 / D 4 / R 4 / L 0
- **Disposition 분포** (M-03): gap 101 / deferred 21 / already covered 1 / n/a 0 (합계 123, 본문 표가 canonical)
- **Canonicality 분포** (M-03): canonical-advancing 8 / supporting 53 / scaffolding 62
- **gap × canonical-advancing**: 7 (M-06 P1 후보: BL-053/063/064/110/120/121/123)
- **v1 review session**: `.onto/review/20260413-30463d46/` (CONDITIONAL verdict, v2에서 BLOCKING 2 + MAJOR 2 해소)
- **v2 review session**: `.onto/review/20260413-fd95ef08/` (PASS verdict, MINOR 3건 → v2.1 patch로 해소)

### Execution Log
- **Current**: `20260413-execution-log.md`
- **Status**: active
- **Scope**: Meta task 실행 경과 시간 (V1 점진성 측정 기준선). M-00/01/02/03/04-A/05 entries

### Decision Records
- **M-00 decisions**: `20260413-m00-decisions.md` (active, DR-M00-01 ~ 06)
- **M-03 decisions**: `20260413-m03-decisions.md` (active, DR-M03-01 ~ 04)
- **M-04 decisions**: `20260413-m04-decisions.md` (active v1.2, DR-M04-01 ~ 03 — v1.2 에서 DR-M04-03 신규: compound_member schema seat + compound_expansion change_type)
- **M-05 decisions**: `20260413-m05-decisions.md` (active v1.1, DR-M05-01 ~ 04 — 축 순서 / Compound sequencing 규약 + canonical seat / Phase B skip-by-delegation + escalation tighten + minimum validation surface / 책임 경계 재정의)

### Deferred Ledger
- **Current**: `20260413-deferred-ledger.md`
- **Status**: active
- **Revision**: v1.8 (31 items 중 16 resolved / 15 pending. v1.8 에서 DL-015/031 resolution_note 에 v1.1 patch 반영)
- **Resolved stages**: M-01 (3) + M-03 (9) + M-04-A (2) + M-05 (2) = 16
- **Pending stages**: M-06 (8, DL-029 추가) / M-07 (2) / M-08 (5, DL-030 추가) = 15
- **Policy**: DR-M00-06 (stage completion protocol) — M-03 (첫 완결), M-04-A (두 번째), M-05 (세 번째) 완결 적용. 본 ledger §"관리 정책" 은 m00-decisions.md DR-M00-06 을 SSOT 로 참조 (CN-5 축약)

### Prior (historical reference)
- `20260404-prototype-to-service-productization-plan.md`
- `20260404-review-prototype-to-product-mapping.md`

## Usage

M-08 refresh protocol 또는 새 artifact 생성 시:
1. 새 파일 생성 (frontmatter 포함)
2. 이전 파일이 있다면 `status: superseded`로 변경 + `supersedes` 필드로 체인 연결
3. 본 `CURRENT.md`의 해당 entry 업데이트
4. Last updated 날짜 갱신
