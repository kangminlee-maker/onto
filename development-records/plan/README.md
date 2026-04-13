# development-records/plan/

이 디렉토리는 onto 개발의 **실행 준비물 (planning artifacts)**을 보관한다.

## 포함 범위

- Backlog consolidation (M-00 산출물)
- Meta task 답변서 (실행 직전 준비)
- 실행 계획·순서 기록
- Decision records (결정 기록)

## 구분: plan vs design

| | plan/ | design/ |
|---|---|---|
| **질문** | 무엇을 할지 | 어떻게 할지 |
| **성격** | 실행 준비물 | 설계 결정 · 방향 결정 |
| **refresh** | 주기적 (M-08 protocol) | 이벤트 기반 (review 후) |
| **예시** | backlog-consolidated, preparation-qa, decisions | §1 정본, todo-meta, direction |

## 파일 명명

- `{YYYYMMDD}-{description}.md` 기본 형식
- 동일 날짜 다수 refresh: `{YYYYMMDD}T{HHmm}-{description}.md`
- Decision record: `{YYYYMMDD}-{stage}-decisions.md` (예: `20260413-m00-decisions.md`)

## Lineage 규칙

### Frontmatter 필수 필드

```yaml
---
as_of: 2026-04-13T00:00:00+09:00
supersedes: null      # 이전 파일 경로, 최초본은 null
status: active        # active / superseded / archived
functional_area: ...  # 선택: planning-preparation, decisions, backlog 등
---
```

### Current Selector

`CURRENT.md`가 각 artifact 계열의 최신본 경로를 명시한다. 정기 refresh 시 `CURRENT.md` 업데이트 필수.

### Archive 규칙

- `status: archived` 파일은 read path에서 제외
- 삭제 대신 status 변경으로 이력 보존
- `supersedes` 필드로 버전 체인 추적

## Read path (M-08 refresh)

1. **default**: CURRENT.md가 가리키는 최신 active 파일
2. **diff**: 이전 버전과 비교해 변경분 추출
3. **archive 제외**: `status: archived` 파일은 skip

## 외부 경계

- `.onto/temp/backlog-snapshots/`: 원본 캡처 (untracked, gitignored)
- `development-records/plan/`: consolidated artifact (tracked, audit trail)
- 두 경계는 read/write 방향 명확화: snapshots → consolidated (단방향)

## Admission rule

다음 중 하나라도 해당하면 `plan/` 대상:
- backlog 수집·분해·우선순위 결정 기록
- 실행 직전 준비 답변서
- 결정 기록 (decisions)

다음은 `design/` 대상:
- 시스템 방향·원칙 정의 (§1 정본)
- meta task list (todo-meta)
- 설계 review 결과 반영 문서
