# Current Planning Artifacts

Last updated: 2026-04-13

이 파일은 `plan/` 디렉토리 각 artifact 계열의 최신 active 버전 경로를 명시한다. M-08 refresh protocol이 매 갱신 시 업데이트한다.

## Active Artifacts

### M-00 실행 준비 답변서
- **Current**: `20260413-m00-preparation-qa.md`
- **Status**: active
- **Scope**: M-00 착수 직전 5개 점검 질문에 대한 답변 (v2, 2 review 반영)

### Backlog Consolidation
- **Current**: 아직 생성 안 됨 (M-00 실행 후 생성 예정)
- **Expected path**: `20260413-backlog-consolidated.md`

### Decision Records
- **M-00 decisions**: `20260413-m00-decisions.md` (M-00 실행 중 생성)
- **M-04 decisions**: `20260413-m04-decisions.md` (M-04 실행 중 생성)

### Prior (historical reference)
- `20260404-prototype-to-service-productization-plan.md`
- `20260404-review-prototype-to-product-mapping.md`

## Usage

M-08 refresh protocol 또는 새 artifact 생성 시:
1. 새 파일 생성 (frontmatter 포함)
2. 이전 파일이 있다면 `status: superseded`로 변경 + `supersedes` 필드로 체인 연결
3. 본 `CURRENT.md`의 해당 entry 업데이트
4. Last updated 날짜 갱신
