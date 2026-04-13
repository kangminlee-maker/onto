# Current Planning Artifacts

Last updated: 2026-04-13 (M-04 Phase A v1.1 완료 기준 — 9-lens review CONDITIONAL Option 2 해소)

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

### onto Work Item Canonical Output
- **Current**: `../design/20260413-onto-todo.md`
- **Status**: active (v1.1 patch, item_count=0, M-06 에서 채움)
- **Scope**: 축 A/B/C/D work item canonical output seat. 17 필드 schema + append/revise 규약 + W-{axis}-{nn:02d} 명명 + Phase B exit 경로 + cluster 알고리즘
- **Revision**: v1.1 (2026-04-13, 9-lens review `20260413-a9e93dd7` CONDITIONAL 해소: BLOCKING 1 + MAJOR 4 + MODERATE 5)
- **Review session**: `.onto/review/20260413-a9e93dd7/` (Option 2 patch — Immediate 5 + MODERATE 5)

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
- **Scope**: Meta task 실행 경과 시간 (V1 점진성 측정 기준선). M-00/01/02/03/04-A entries

### Decision Records
- **M-00 decisions**: `20260413-m00-decisions.md` (active, DR-M00-01 ~ 06)
- **M-03 decisions**: `20260413-m03-decisions.md` (active, DR-M03-01 ~ 04)
- **M-04 decisions**: `20260413-m04-decisions.md` (active v1.1, DR-M04-01 ~ 02 applied with v1.1 patch — anchor reject trigger, legacy 호환 상한, halt 주체, M-08 consumer, Stage 3 monitor)

### Deferred Ledger
- **Current**: `20260413-deferred-ledger.md`
- **Status**: active
- **Revision**: v1.6 (31 items 중 14 resolved / 17 pending)
- **Resolved stages**: M-01 (3) + M-03 (9) + M-04-A (2) = 14
- **Pending stages**: M-05 (2, DL-031 추가) / M-06 (8, DL-029 추가) / M-07 (2) / M-08 (5, DL-030 추가) = 17
- **Policy**: DR-M00-06 (stage completion protocol) — M-03 에서 첫 완결, M-04-A 에서 두 번째 완결 적용. 본 ledger §"관리 정책" 은 m00-decisions.md DR-M00-06 을 SSOT 로 참조 (CN-5 축약)

### Prior (historical reference)
- `20260404-prototype-to-service-productization-plan.md`
- `20260404-review-prototype-to-product-mapping.md`

## Usage

M-08 refresh protocol 또는 새 artifact 생성 시:
1. 새 파일 생성 (frontmatter 포함)
2. 이전 파일이 있다면 `status: superseded`로 변경 + `supersedes` 필드로 체인 연결
3. 본 `CURRENT.md`의 해당 entry 업데이트
4. Last updated 날짜 갱신
