# 작업 목록 작성을 위한 Meta 작업 목록 (v3)

작성일: 2026-04-13
상태: v2 9-lens review(`20260413-12eb28e0`) Immediate 5건 + Recommendations 2건 반영 (경로 α)
이전 버전: v2 (review session `20260413-21695bbe` 반영. 경로 B 선택)

## 맥락

- 상위 문서: `20260413-onto-direction.md` (§1 상위 목표)
- 최종 산출물: 축 A/B/C/D의 work item 리스트 (to-do list)
- 본 문서: 그 산출물을 만들기 위한 준비 작업 체크리스트

## Review Feedback Disposition

본 v3가 이전 review 결함을 어디서 어떻게 해소했는지 추적 가능하도록 매핑한다.

### v1 → v2 반영 (session `20260413-21695bbe`)

| Review 지적 | v2 반영 위치 |
|---|---|
| M-05 vs M-07 중복 | M-05 (pre-draft) · M-07 (post-draft) 분리 |
| 독립성 절대 규칙 logic 충돌 | "독립성 규칙" 섹션 명시 |
| M-06 이전 canonical output 결정 부재 | M-04에 `Canonical output spec` 포함 |
| Task schema verification 필드 부족 | M-04 필드 스키마 확장 |
| Gap → task disposition rule | M-03 4분류 추가 |
| (coverage) backlog consolidation 누락 | M-00 신규 |
| (evolution) refresh protocol 부재 | M-08 신규 |
| (axiology) canonicality gate | "Canonicality Gate" 섹션 |
| (semantics) task 3층 overload | "용어 정리" 섹션 |
| (dependency) D = 완료되는 선행 | M-05 재정립 `D0 bootstrap → B → A → C, D continuing` |

### v2 → v3 반영 (session `20260413-12eb28e0`)

| Review 지적 | v3 반영 위치 |
|---|---|
| dependency-1 M-03 prose/graph 불일치 | 순서·의존 그래프에 `M-00 → M-03` 직접 화살표 추가 |
| dependency-2 Revise loop 과소 모델링 | M-07에 upstream escalation rule 추가 (M-04·M-05까지 reopen 가능) |
| pragmatics-1 Prior review 흡수 추적 불가 | 본 "Review Feedback Disposition" 섹션 신설 |
| pragmatics-2 M-00 inclusion rule 부재 | M-00에 `inclusion criteria` 추가 |
| coverage-1 Lifecycle balance optional | M-09 제거 후 M-07에 fold-in |
| evolution-1 Activity/axis set 확장 프로토콜 부재 | 본 문서 말미 "Expansion Protocol" 신설 |
| (recommendation) Canonicality decision rule 컴팩트화 | "Canonicality Gate" 섹션에 판정 기준 추가 |

## 용어 정리

| 용어 | 의미 | 대상 문서 |
|---|---|---|
| **meta task (M-*)** | 본 문서의 준비 작업 항목 | 본 문서 |
| **work item (W-*)** | 최종 to-do list의 항목. M-06이 생성 | `20260413-onto-todo.md` (예정) |
| **execution unit** | work item이 agent·runtime으로 실행될 때 단위. work item과 1:1 또는 1:N | runtime 실행 기록 |

## 독립성 규칙

- "모든 task 독립" 절대 규칙 **폐기**
- 원칙: **"각 work item은 가능한 한 독립적으로 구성. 불가능한 경우 명시적 `deps` 필드로 선언"**
- M-07이 사후 cluster·순차화 책임

## Canonicality Gate

각 work item은 다음 3분류 중 하나를 반드시 선언한다.

| 분류 | 판정 기준 |
|---|---|
| **canonical-advancing** | §1.2 활동 정의, §1.5 축 정의, 또는 핵심 개념(§1.1)에 **새 seat를 더하거나 기존 seat의 완성도를 높임**. 제거 시 canonical 실행 경로에 누락이 생김 |
| **canonical-supporting** | 임시 지원. 구현 중에만 필요하거나 stabilize 후 canonical에 흡수될 예정. 제거 시 성능·경험은 떨어지나 canonical 실행은 유지 |
| **scaffolding** | 실행·검증·이관을 위한 임시 setup. 목표 달성 후 삭제 예정. 제거해도 canonical 실행에 영향 없음 |

M-06은 분류가 없는 item을 거부. M-03 disposition과 함께 canonical path에서 벗어나는 task의 유입을 차단.

---

## Meta task 8건 (필수)

### M-00 Planning·Backlog Source Consolidation

기존 memory·PR backlog·design record의 관련 항목을 단일 리스트로 통합.

**Inclusion criteria** (executor 해석 방지):
1. §1 축 A/B/C/D 또는 5 활동(review/design/reconstruct/learn/govern) 중 하나와 **직접 관계**
2. 2026-04-01 이후 발생·유효
3. Source: `MEMORY.md` entry **또는** Open PR **또는** `development-records/design/` 산출물 **또는** backlog 전용 memory 파일
4. **제외**: 이미 merged되어 해결된 것 / 완전히 폐기된 제안 / 주체자 대화용 메모

**Source 후보**:
- `MEMORY.md` 관련 entry (roles refactor v3 backlog, Build 8th Review Backlog, Principal Stage 3 Backlog, Design Spec v4 잔여 등)
- Open PR (#20, #21, #22, #7)
- `development-records/design/` 산출물

**산출**: `backlog-consolidated.md` — raw backlog entries with source tag

### M-01 다섯 활동 구현 상태 Inventory

- **대상**: review / design / reconstruct / learn / govern
- **산출**: 각 활동별 {존재 파일, 기능, 미구현 요소, 참조 contract}

### M-02 축 B 기반 인프라 Inventory

- **대상 범위**: scope-runtime, readers, middleware 기반, 공통 유틸
- **산출**: 각 인프라 구성요소별 {현황, 확장 필요성}

### M-03 Gap 분석 + Disposition 분류

- **입력**: M-00 (backlog) + M-01 (활동) + M-02 (인프라)
  - M-00은 직접 입력 (backlog 항목이 gap 판정 대상에 포함됨)
  - M-01·M-02는 현황 기준선으로 입력
- **각 gap을 4분류**:
  - `gap`: 실제 미구현, work item 후보
  - `already covered`: 이미 존재, 항목 불필요
  - `n/a`: 범위 밖
  - `deferred`: 인지됐으나 당장 다루지 않음
- **Canonicality tag 부착**: 각 gap이 canonical 실행 경로와 어떻게 관계되는가 (advancing/supporting/scaffolding)
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

**개념 범위 명확화**:
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

### M-07 Post-draft 충돌·병렬 Cluster 검증 + Lifecycle Balance + Revise Escalation

**검증 항목**:
- 같은 파일 touch work item들의 순차화 규칙
- ownership·verification 모호성 검토
- 병렬 cluster 판정
- **Lifecycle balance check** (v3 신설): 축 × 활동 × 생애주기 단계(buildout/migration/validation/maintenance/adoption) coverage 편향 확인. 편향 지점은 M-06 갱신 또는 deferred 전환 대상
- **Revise escalation** (v3 확장): 발견된 defect의 원인이 어느 단계인가 판정
  - 원인이 M-06: M-06 갱신
  - 원인이 M-05 (dep modeling): **M-05 reopen** → M-06 재생성
  - 원인이 M-04 (schema): **M-04 reopen** → M-06 재생성
  - 원인이 M-03 (disposition): **M-03 reopen** → M-06 재생성
- Revise cycle 최대 2회. 이후 남은 defect은 M-08로 이관 (maintenance 대상)

**산출**: 검증된 parallel cluster 지정 + lifecycle coverage matrix + revise log (escalation 이력 포함)

### M-08 Refresh·Maintenance Protocol

- **신규 항목 처리**: Principal이 새 work item을 제안할 때 절차
- **완료 item 처리**: archive vs 삭제 rule
- **defer 전환·복귀 rule**
- **정기 재검토**: 주기 (예: 월별) 및 절차
- **M-07에서 이관된 잔여 defect 처리** (v3 추가)
- **산출**: maintenance protocol 문서 섹션 + 갱신 체크리스트

---

## 순서·의존 그래프

```
  M-00 ──► M-01 ──┐
   │      M-02 ──┴──► M-03 ──┐
   │                            │
   └────────────────────────────┤   (M-00 → M-03 직접 입력)
                                │
          M-04 ──────────────────┤
                                │
          M-05 ──────────────────┤
                                ▼
                                M-06 ◄─┐◄─┐◄─┐
                                │         │  │  │
                                ▼         │  │  │
                                M-07 ─────┘  │  │ (escalation)
                                │  │         │  │
                                │  └─ M-05 ──┘  │ (reopen)
                                │  └─ M-04 ─────┘ (reopen)
                                ▼
                                M-08 ──► 완성
```

- **M-00 선행**: consolidation이 inventory + gap 판정에 직접 입력
- **M-01·M-02 병렬**: M-00 후 동시 진행 가능
- **M-03**: M-00 + M-01 + M-02 모두 입력 (그래프 직접 반영)
- **M-04·M-05 조기 시작 가능**: M-03 결과 필요 시 보완 (scope 제한 하에)
- **M-06**: M-03+M-04+M-05 모두 완료 필요
- **M-07 revise escalation**: defect 원인 단계로 reopen (M-04/M-05/M-06 선택적)
- **Revise cycle 최대 2회**, 이후 M-08 maintenance로 이관
- **M-08**: 최종 단계. 이후 continuing maintenance

## 실행 방식

경로 B 권장 순서:
1. M-00 (backlog consolidation, inclusion criteria 적용)
2. M-01 · M-02 병렬
3. M-03
4. M-04 · M-05 (M-03과 약간 overlap 가능)
5. M-06
6. M-07 (cluster + lifecycle balance + 필요 시 escalation)
7. (M-07 escalation 시 해당 단계 reopen → M-06 재생성 → M-07 재실행. 최대 2회)
8. M-08 protocol 수립
9. 완성 선언. 이후 M-08 protocol 하에 maintenance.

---

## Expansion Protocol (신설)

5 활동(review/design/reconstruct/learn/govern) 또는 4축(A/B/C/D) 구조가 변경될 필요가 발견된 경우의 handling rule.

### Trigger

- §1 재review에서 **unresolved gap**이 기존 활동·축 범위에 흡수되지 않는 경우
- Principal이 직접 새 활동·축을 제안하는 경우
- learn 축적 결과 기존 구조가 일관된 패턴을 담지 못한다는 증거가 누적된 경우

### Decision 층위

- **활동 추가·삭제·병합**: Principal 직접 승인 only (§1.2 수정 필요. govern 영역)
- **축 추가·삭제·병합**: Principal 직접 승인 only (§1.5 수정 필요. govern 영역)
- **work item schema 변경**: M-04 schema versioning 경유 (v2/v3 증가)

### Process

1. 변경 제안서 작성 (이유, 영향 범위, 대안)
2. §1 재review 실행 (9-lens)
3. Principal 승인
4. §1 관련 섹션 수정 + lifecycle_status 관리
5. work item schema versioning 적용 (기존 item migration rule 포함)
6. M-06 재실행 (필요 시)

### 제약

- 활동·축 변경은 onto의 핵심 구조 변경이므로 Principal의 §1.3 "Principal 직접 분기"에 해당
- 자체 실행 금지
- learn·govern이 제안만 가능, 결정은 불가

---

## 경로 α 선택 근거

- v2 재review에서 Disagreement 0건, Axiology 추가 lens 필요 없음 판정
- Immediate 5건 모두 "required" 명시 (conditional consensus, 6 lens 이상 지지)
- Recommendations 2건(canonicality decision rule + expansion protocol)은 **drift 방지** 목적. 향후 재설계 비용 회피가 지금 반영하는 비용보다 큼
- 9-step 구조 자체는 review가 "justified" 판정 → 유지

## 다음 작업

Principal 확정 시:
1. 본 v3 commit + push
2. v3를 한 번 더 9-lens review (재검증 3차)
3. 통과 시 M-00 착수
4. `.onto/review/20260413-21695bbe/` 및 `.onto/review/20260413-12eb28e0/`는 reference로 보존 (audit trail)
