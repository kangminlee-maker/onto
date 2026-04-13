# Current Planning Artifacts

Last updated: 2026-04-13

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
- **Status**: active (다음 세션에서 M-03 착수용)
- **Scope**: /clear 후 새 Claude Code 세션에서 M-03 (Gap 분석 + Disposition 분류) 진입 경로

### Backlog Consolidation
- **Current**: `20260413-backlog-consolidated.md`
- **Status**: active
- **Revision**: v2.1 (2026-04-13, deferred ledger DL-001/002/003 patch 반영)
- **Item count**: 123
- **Source 분포**: backlog_memory 87 / memory 29 / design 4 / onto_direction 3 / pr 0
- **Activity 분포** (primary): E 76 / G 39 / D 4 / R 4 / L 0 — v2.1에서 BL-035/BL-121 버킷 교정
- **v1 review session**: `.onto/review/20260413-30463d46/` (CONDITIONAL verdict, v2에서 BLOCKING 2 + MAJOR 2 해소)
- **v2 review session**: `.onto/review/20260413-fd95ef08/` (PASS verdict, MINOR 3건 → v2.1 patch로 해소)

### Execution Log
- **Current**: `20260413-execution-log.md`
- **Status**: active
- **Scope**: Meta task 실행 경과 시간 (V1 점진성 측정 기준선)

### Decision Records
- **M-00 decisions**: `20260413-m00-decisions.md` (active, DR-M00-01 ~ 06)
- **M-04 decisions**: `20260413-m04-decisions.md` (M-04 실행 중 생성)

### Deferred Ledger
- **Current**: `20260413-deferred-ledger.md`
- **Status**: active
- **Revision**: v1.1 (28 items 중 3 resolved / 25 pending)
- **Policy**: DR-M00-06 (stage completion protocol)

### Prior (historical reference)
- `20260404-prototype-to-service-productization-plan.md`
- `20260404-review-prototype-to-product-mapping.md`

## Usage

M-08 refresh protocol 또는 새 artifact 생성 시:
1. 새 파일 생성 (frontmatter 포함)
2. 이전 파일이 있다면 `status: superseded`로 변경 + `supersedes` 필드로 체인 연결
3. 본 `CURRENT.md`의 해당 entry 업데이트
4. Last updated 날짜 갱신
