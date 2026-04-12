# 작업 목록 작성을 위한 Meta 작업 목록 (v2)

작성일: 2026-04-13
상태: 9-lens review 반영 (review session `20260413-21695bbe`, 경로 B 채택)

## 맥락

- 상위 문서: `20260413-onto-direction.md` (§1 상위 목표)
- 최종 산출물: 축 A/B/C/D의 work item 리스트 (to-do list)
- 본 문서: 그 산출물을 만들기 위한 준비 작업 체크리스트

## 용어 정리

| 용어 | 의미 | 대상 문서 |
|---|---|---|
| **meta task (M-*)** | 본 문서의 준비 작업 항목 | 본 문서 |
| **work item (W-*)** | 최종 to-do list의 항목. M-06이 생성 | `20260413-onto-todo.md`(예정) |
| **execution unit** | work item이 agent·runtime으로 실행될 때 단위. work item과 1:1 또는 1:N | runtime 실행 기록 |

## 독립성 규칙

- "모든 task 독립" 절대 규칙 **폐기**
- 원칙: **"각 work item은 가능한 한 독립적으로 구성. 불가능한 경우 명시적 `deps` 필드로 선언"**
- M-07이 사후 cluster·순차화 책임

## Canonicality Gate

각 work item은 다음 3분류 중 하나를 반드시 선언한다.

| 분류 | 의미 |
|---|---|
| **canonical-advancing** | canonical 실행 경로를 직접 강화 |
| **canonical-supporting** | 임시 지원. 추후 canonical로 흡수 또는 제거 |
| **scaffolding** | 설치 후 제거 가능 |

M-06은 분류가 없는 item을 거부. M-03 disposition과 함께 canonical path에서 벗어나는 task의 유입을 차단.

---

## Meta task 9건 (필수) + 1건 (선택)

### M-00 Planning·Backlog Source Consolidation

기존 memory·PR backlog·design record의 관련 항목을 단일 리스트로 통합.

- **Source 후보**:
  - `MEMORY.md` 관련 entry (roles refactor v3 backlog, Build 8th Review Backlog, Principal Stage 3 Backlog, Design Spec v4 잔여 등)
  - Open PR (#20, #21, #22, #7)
  - `development-records/design/` 산출물
- **산출**: `backlog-consolidated.md` — raw backlog entries with source tag

### M-01 다섯 활동 구현 상태 Inventory

- **대상**: review / design / reconstruct / learn / govern
- **산출**: 각 활동별 {존재 파일, 기능, 미구현 요소, 참조 contract}

### M-02 축 B 기반 인프라 Inventory

- **대상 범위**: scope-runtime, readers, middleware 기반, 공통 유틸
- **산출**: 각 인프라 구성요소별 {현황, 확장 필요성}

### M-03 Gap 분석 + Disposition 분류

- **입력**: M-00 + M-01 + M-02
- **각 gap을 4분류**:
  - `gap`: 실제 미구현, work item 후보
  - `already covered`: 이미 존재, 항목 불필요
  - `n/a`: 범위 밖
  - `deferred`: 인지됐으나 당장 다루지 않음
- **Canonicality tag 부착**: 각 gap이 canonical 실행 경로와 어떻게 관계되는가
- **산출**: gap list with disposition + canonicality tag

### M-04 Task Schema·Canonical Output 결정

**필드 스키마**:
| 필드 | 의미 |
|---|---|
| ID | W-{axis}-{nn} 형식 |
| 제목 | 한 줄 요약 |
| files | touch 예정 파일 목록 (충돌 판정 근거) |
| deps | 선행 work item ID |
| verification consumer | 누가 완료를 판정 (Principal / runtime / test 등) |
| verification method | 판정 방법 (테스트 / 리뷰 / 실행 결과 등) |
| evidence seat | 검증 산출물 저장 위치 |
| blockers | 현재 차단 원인 |
| ownership boundary | 수정 주체 (중복 방지) |
| canonicality class | canonical-advancing / supporting / scaffolding |
| 완료 기준 | observable event |

**Canonical output spec**:
- 저장 seat: `development-records/design/20260413-onto-todo.md`
- 구조: **축별 섹션** (병렬 클러스터링 용이)
- 갱신 rule: append + revise (기록 보존)
- Schema versioning: schema 변경 시 v2/v3 증가, 기존 work item 자동 migration rule

**개념 범위 명확화** (semantics 결함 해소):
- `축 B 기반 인프라` 세부 범위 명시 (M-02 결과 반영)
- `축 D` 내 policy/validation vs registry/intake seat 분리

**산출**: task schema 정의 + canonical output spec + 명명 규약

### M-05 Pre-draft Dependency Modeling

- **범위**: pre-draft 의존성만. 축 간·활동 간 수준. task-level은 M-07 책임.
- **축 순서 재정립**: `D0 bootstrap → B → A → C`. **축 D는 bootstrap 후 continuing cross-cutting lane**이며 완료되는 선행이 아님.
- **산출**: 축·활동 의존 그래프 + D의 bootstrap vs ongoing 구분

### M-06 축별 Work Item 초안

- **입력**: M-03 (gap + disposition + canonicality) + M-04 (schema + seat) + M-05 (dep graph)
- **축 A/B/C/D 각각의 work item list 생성**
- 각 item에 M-04 모든 필드 채움
- canonicality class 없는 item 거부
- **산출**: `20260413-onto-todo.md` 초안

### M-07 Post-draft 충돌·병렬 Cluster 검증 + Revise Loop

- **검증 항목**:
  - 같은 파일 touch work item들의 순차화 규칙
  - ownership·verification 모호성 검토
  - 병렬 cluster 판정
- **Revise loop**: 발견된 문제는 **M-06 갱신으로 반영**. 1~2 cycle 허용.
- **산출**: 검증된 parallel cluster 지정 + revise log

### M-08 Refresh·Maintenance Protocol

- **신규 항목 처리**: Principal이 새 work item을 제안할 때 절차
- **완료 item 처리**: archive vs 삭제 rule
- **defer 전환·복귀 rule**
- **정기 재검토**: 주기 (예: 월별) 및 절차
- **산출**: maintenance protocol 문서 섹션 + 갱신 체크리스트

### M-09 (선택) Lifecycle Coverage Matrix Check

- **Matrix**: 축 × 활동 × 생애주기 단계 (buildout/migration/validation/maintenance/adoption)
- 편향 확인 (e.g., buildout만 많고 validation 부족)
- **산출**: coverage matrix + 편향 지점 list

---

## 순서·의존 그래프

```
  M-00 ──► M-01 ──┐
          M-02 ──┴──► M-03 ──┐
                                │
          M-04 ──────────────────┤
                                │
          M-05 ──────────────────┤
                                ▼
                                M-06 ◄─── revise ──┐
                                │                    │
                                ▼                    │
                                M-07 ────────────────┘
                                │
                                ▼
                         (선택 M-09)
                                │
                                ▼
                                M-08 ──► 완성
```

- **M-00 선행**: consolidation이 inventory에 입력
- **M-01·M-02 병렬**: M-00 후 동시 진행 가능
- **M-03**: M-01+M-02 합산 후
- **M-04·M-05 조기 시작 가능**: M-03 결과 필요 시 보완 (scope 제한 하에)
- **M-06**: M-03+M-04+M-05 모두 완료 필요
- **M-07 ↔ M-06 revise loop**: 1~2 cycle
- **M-08**: 최종 단계. 이후 continuing maintenance로 이어짐
- **M-09 optional**: M-07 후 · M-08 전 삽입 가능

## 실행 방식

경로 B 권장 순서:
1. M-00 (backlog consolidation)
2. M-01 · M-02 병렬
3. M-03
4. M-04 · M-05 (M-03과 약간 overlap 가능)
5. M-06
6. M-07 ↔ M-06 revise loop (최대 2 cycle)
7. M-08 protocol 수립
8. 완성 선언. 이후 M-08 protocol 하에 maintenance.

## 경로 B 선택 근거

- 9-lens review에서 4 lens(pragmatics/evolution/coverage + axiology via canonicality)가 확장 지지
- 7개 유지 시 M-04가 5개 concern 흡수하며 overload 발생
- 확장 후 각 M-*는 **단일 책임** 유지
- semantics 해소(task 3층 분리)가 구조에 자연 반영

## 다음 작업

Principal 확정 시:
1. 본 meta task list v2 commit
2. `.onto/temp/meta-task-list-proposal.md` 삭제 (review 완료됨)
3. `.onto/review/20260413-21695bbe/`는 reference로 보존 (필요 시 삭제 결정)
4. M-00 착수
