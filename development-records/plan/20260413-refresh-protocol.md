---
as_of: 2026-04-13T22:10:00+09:00
supersedes: null
status: active
revision: v1
functional_area: refresh-maintenance-protocol
purpose: |
  onto-todo.md v2 (139 W-ID) 및 관련 계획 artifact 의 지속 관리 protocol.
  M-08 (meta task list v5.1 마지막 단계) 산출. 신규 항목 처리, 완료·폐기·defer 전이,
  정기 재검토, 진행률 모니터링, Principal 개입 trigger 를 성문화.
authority_stance: non-authoritative-design-surface
canonicality: canonical-advancing  # refresh protocol 자체가 onto-todo lifecycle 관리의 canonical seat
source_refs:
  meta: "development-records/evolve/20260413-onto-todo-meta.md v5.1 §M-08"
  onto_todo: "development-records/evolve/20260413-onto-todo.md v2 (139 W-ID, §3 갱신 규칙)"
  onto_direction: "development-records/evolve/20260413-onto-direction.md (§1 정본)"
  deferred_ledger: "development-records/plan/20260413-deferred-ledger.md v1.12"
  m07_decisions: "development-records/plan/20260413-m07-decisions.md v1 (DR-M07-01~04)"
  m00_decisions: "development-records/plan/20260413-m00-decisions.md (DR-M00-06 stage completion protocol)"
deferred_items_resolved:
  - DL-025  # 진행률·비용 모니터링 → §4
  - DL-026  # Principal 개입 trigger → §5
  - DL-027  # longitudinal replay/audit → §6
  - DL-028  # primary_tag_convention SSOT → §7
  - DL-030  # NP-1 aggregate lens → §8
---

# onto Refresh·Maintenance Protocol (2026-04-13)

본 문서는 onto-todo.md v2 (139 W-ID) 및 관련 계획 artifact 의 **지속 관리 protocol** 이다. M-00~M-07 에서 수립된 계획·검증 체계를 운영 단계로 전환하는 규약을 정의한다.

## 0. 적용 범위

| 관리 대상 | 파일 | 역할 |
|---|---|---|
| Work item canonical seat | `20260413-onto-todo.md` | 139 W-ID 의 SSOT |
| Dependency graph | `20260413-onto-todo-dep-graph.md` | 축·활동·compound 의존 |
| Backlog consolidated | `20260413-backlog-consolidated.md` | 123 BL 원천 |
| Deferred ledger | `20260413-deferred-ledger.md` | defer 추적 |
| Decision records | `20260413-m0N-decisions.md` | 결정 이력 |
| Execution log | `20260413-execution-log.md` | 실행 시간·비용 |

---

## 1. 신규 Work Item 처리 절차

### 1.1 진입 경로

새 work item 이 발생하는 3가지 경로:

| 경로 | 발생 주체 | 진입 조건 |
|---|---|---|
| **Principal 제안** | 주체자 | 제안 시 축(A/B/C/D) + 활동(5종) 1개 이상 지정 |
| **실행 중 발견** | 구현 agent | 기존 W-ID 실행 중 새로운 gap 발견. 해당 W-ID 의 `notes` 에 발견 사실 기록 후 별도 W-ID 신청 |
| **Refresh cycle 발견** | refresh 실행자 | §3 정기 재검토 중 미등록 gap 식별 |

### 1.2 등록 절차

1. **Schema 준수 확인**: onto-todo.md §1.1 의 11 required 필드 전부 채울 수 있는지 확인
2. **ID 할당**: 해당 축 섹션의 기존 최대 nn + 1. 공백 허용 (§3 갱신 규칙)
3. **canonicality 분류 필수**: canonical-advancing / supporting / scaffolding 중 1개. 미분류 item 거부
4. **depends_on 채움**: W-ID / BL / DL edge 해당 시 기록. 의미 구분 (§1.3) 준수
5. **Cluster 재판정**: 기존 cluster (DR-M07-02) 와 파일 겹침 확인. 겹치면 해당 cluster 에 편입 (순차 실행)
6. **Append commit**: onto-todo.md 해당 축 섹션에 행 추가 + `rewrite_trace` 에 `{change_type: "new_item", date: YYYY-MM-DD}` 기록

### 1.3 거부 조건

- canonicality 미분류
- §1 정본(onto-direction.md) 과 무관한 항목
- 기존 W-ID 와 scope 중복 (dedup — 기존 W-ID 확장으로 처리)

---

## 2. Work Item 생애주기 전이

### 2.1 전이 규칙

onto-todo.md §1.2 lifecycle_status enum 기준:

```
active ─────► done ─────► (유지, 참조용)
  │  ▲           
  │  │           
  ▼  │           
deferred         
  │              
  ▼              
active ─► deprecated ─► archived ─► (6개월 후 expansion-migration 파일 이관)
```

| 전이 | 조건 | 주체 |
|---|---|---|
| active → done | verification_method 로 정의된 검증 통과 + evidence_seat 에 증거 존재 | verification_consumer |
| active → deferred | blocker 발생 또는 우선순위 하락. `blockers` 필드에 이유 기록 필수 | Principal 또는 refresh cycle |
| deferred → active | blocker 해소 또는 우선순위 상승. `blockers` 필드 비움 | Principal 또는 refresh cycle |
| active → deprecated | 더 이상 유효하지 않음 (§1 정본 변경, 중복 발견 등). `notes` 에 사유 기록 | Principal |
| deprecated → archived | deprecated 전환 후 30일 경과 + 참조하는 다른 W-ID 없음 확인 | refresh cycle |
| archived → 이관 | archived 전환 후 6개월 경과 | refresh cycle (§3 갱신 규칙) |

### 2.2 완료 item 처리 (archive vs 삭제)

- **삭제 금지** (onto-todo.md §3 원칙). 행 자체를 제거하지 않음.
- **done**: 행 유지. evidence_seat 의 검증 증거가 참조 가능한 상태로 보존.
- **archived → expansion-migration**: `development-records/evolve/expansion-migration-{YYYYMMDD}.md` 에 이관. 원 행에는 `notes: "archived → expansion-migration-{YYYYMMDD}.md 이관"` 기록.

### 2.3 Defer 전환·복귀 규칙

- **defer 전환 시** 필수 기록: `blockers` 필드에 구체적 이유 + `deferred_reason` 분류 (아래 3종)
- **deferred_reason enum** (DL-025 CN-4 반영):
  - `production_phase`: PRODUCTION PHASE 진입 조건 미충족
  - `low_priority`: P3 저우선순위. 상위 작업 완료 후 재평가
  - `scale_trigger`: 특정 수치 조건(예: N≈20) 미달
- **복귀 판정**: refresh cycle 에서 `blockers` 조건 재평가. 충족 시 active 전환 + `blockers` 비움
- **현황**: deferred 20건 (축 B 19건 + 축 A 1건). 주로 low_priority(SE Stage 4 12건 + 도메인 4건) + scale_trigger(3건) + production_phase(1건)

---

## 3. 정기 재검토 (Refresh Cycle)

### 3.1 주기

- **정기**: onto-todo.md 내 active W-ID 가 10건 이상 done 전환되었을 때, 또는 마지막 refresh 이후 30일 경과 시 (둘 중 먼저 도래)
- **임시**: §1 정본(onto-direction.md) 개정 시 즉시 실행

### 3.2 Refresh 점검 항목

| # | 점검 | 방법 | 이상 시 조치 |
|---|---|---|---|
| 1 | **DAG integrity** | depends_on W→W edge topological sort | cycle 발견 → 즉시 수정 |
| 2 | **Cluster 갱신** | 신규/변경 W-ID 의 files glob 재비교 | cluster 목록 갱신 |
| 3 | **Lifecycle balance** | 축×활동×lifecycle 교차표 재생성 | scaffolding ratio 추이 기록 (§4) |
| 4 | **Deferred 재평가** | 각 deferred W-ID 의 blockers 조건 확인 | 해소 시 active 전환 |
| 5 | **§1 정본 정합성** | onto-direction.md 변경 여부 확인 | 변경 시 영향받는 W-ID 식별 + 갱신 또는 deprecated |
| 6 | **Compound 무결성** | 4 불변식 재검증 (compound 변경 시만) | 위반 시 즉시 수정 |
| 7 | **Schema 호환성** | schema_version 변경 여부 확인 | 변경 시 migration rule 적용 |

### 3.3 Refresh 산출

- onto-todo.md revision bump (변경 있으면)
- execution-log 에 refresh entry 추가
- deferred-ledger 갱신 (신규 defer 발생 시)

---

## 4. 진행률·비용 모니터링 (DL-025 해소)

### 4.1 추적 지표

| 지표 | 정의 | 기준선 (M-08 시점) | 건전 방향 |
|---|---|---|---|
| **done_count** | lifecycle_status=done 인 W-ID 수 | 0 | 증가 |
| **active_count** | lifecycle_status=active | 119 | 감소 (done 전환) |
| **deferred_count** | lifecycle_status=deferred | 20 | 안정 또는 감소 |
| **scaffolding_ratio** | scaffolding / total | 46.0% (64/139) | 감소 |
| **canonical_advancing_done** | canonical-advancing 중 done | 0/17 | 증가 |
| **elapsed_minutes_cumulative** | execution-log 누적 시간 | M-00~M-08 합산 | 참조용 |

### 4.2 기록 방법

- 각 refresh cycle 시 위 6개 지표를 execution-log refresh entry 에 snapshot 으로 기록
- scaffolding_ratio_trend: M-03(50.4%) → M-07(46.0%) → refresh N (기록 예정)

### 4.3 deferred_reason enum (DL-025 CN-4)

onto-todo.md schema 에 `deferred_reason` 필드를 **formal 추가하지 않음** (schema v1.2 유지). 대신 본 protocol §2.3 에서 `blockers` 필드 내 free-text 로 3종 분류를 권장. schema minor bump 는 실행 단계에서 필요 시 결정.

---

## 5. Principal 개입 Trigger (DL-026 해소)

### 5.1 M-00~M-07 실행 중 누적 사례

| 사례 | 발동 조건 | 결과 |
|---|---|---|
| M-05 Phase B skip | 비용 > 효용 판단 필요 | Principal 선택 → skip-by-delegation |
| DR-M06-02 축 D 재배치 | 14 BL 의 축 재배정 정책 | Principal 승인 |
| DR-M06-04 review 경로 분리 | 2 W-ID split 선택 | Principal 선택 |
| DL 연속 2회 defer | DR-M00-06 escalation 규칙 | 발동 0회 (전원 기한 내 해소) |

### 5.2 확정 trigger 목록

| # | Trigger | 임계값 | 조치 |
|---|---|---|---|
| 1 | **Schema major bump** | schema_version major 증가 시 | Principal 승인 필수. migration rule 검토 |
| 2 | **Axis 추가/제거** | axis_enum 변경 시 | Principal 승인 필수. §1 정본 개정 선행 |
| 3 | **DL 연속 2회 defer** | 동일 DL 이 2 stage 연속 pending | Principal escalation (DR-M00-06) |
| 4 | **Scaffolding ratio 역전** | refresh cycle 에서 scaffolding_ratio 가 이전 대비 5%p 이상 증가 | Principal 보고 + 원인 분석 |
| 5 | **canonical-advancing 축 공백** | refresh cycle 에서 특정 축의 canonical-advancing done = 0 이고 active 도 0 | Principal 보고 |
| 6 | **Compound 무결성 위반** | 4 불변식 중 1건 이상 FAIL | 즉시 Principal 보고 + 수정 |
| 7 | **W-ID 90% 포화** | 단일 축의 nn ≥ 90 | Principal 보고 + schema major bump 검토 |

---

## 6. Longitudinal Replay/Audit 인프라 방향 (DL-027 해소)

### 6.1 현재 상태

M-00~M-08 실행 이력이 다음 artifact 에 분산:
- execution-log: 시간·비용
- decision records (m0N-decisions): 결정 이력 27건
- deferred-ledger: defer 추적 31건
- onto-todo.md rewrite_trace: W-ID 변경 이력

### 6.2 M-08 시점 결정

**구현 지연 (deferred to implementation phase)**. 이유:

- replay/audit 인프라 (dedup_rule_set_ref, verification_status enum, dr_registry_ref) 는 W-ID **실행 단계** 에서 실측 데이터가 발생해야 설계 유의미
- 현 시점은 계획 완료 직후이므로 실행 데이터 0건. 인프라 선행 구축은 premature
- axis D 30+ 재평가 trigger monitoring (E-6): 현재 axis D = 4건. 30+ 도달 시까지 모니터링만

### 6.3 실행 단계 진입 조건

다음 조건 중 하나 충족 시 audit 인프라 설계 착수:
- done W-ID 10건 이상 달성
- schema_version major bump 발생
- Principal 명시적 요청

---

## 7. primary_tag_convention SSOT 단일화 (DL-028 해소)

### 7.1 결정

**frontmatter canonical 선언 원칙 확인**. 이미 적용 중:

- onto-todo.md: frontmatter 에 `activity_enum_ref`, `axis_enum_ref`, `canonicality_enum_ref` 등 canonical ref 명시
- consolidated: frontmatter 에 `source_taxonomy`, `dedup_evidence_schema` 명시
- 본문은 frontmatter 가 선언한 canonical source 를 **참조만**

### 7.2 추가 조치

본 protocol 에서 원칙을 재확인하며 별도 구현 불요:
- 모든 계획 artifact 의 frontmatter 에 canonical ref 필드가 존재하면 본문은 그 ref 를 참조
- 새 artifact 생성 시 frontmatter 에 ref 필드 포함 필수

---

## 8. NP-1 Aggregate Prioritization Coherence Lens (DL-030 해소)

### 8.1 제안 내용

canonical-advancing 집합의 **축 분포** 가 §1.5 축 중요도·의존 관계와 정합하는지 평가하는 집합 level lens. 현 9 lens 는 item-level 또는 개별 가치 위주.

### 8.2 판정

**Lens set 확장 보류 (preserved, not adopted)**. 이유:

- 현재 canonical-advancing 17건의 축 분포 (A:7, B:3, C:4, D:3) 는 축 의존 관계(D0→B→A→C)와 정합 — 불균형 없음
- 집합 level lens 는 W-ID 실행이 진행되어 done 전환이 발생한 후에 유의미 (현재 done=0)
- 기존 9 lens 로 item-level 검증은 충분

### 8.3 재검토 조건

- canonical-advancing done 5건 이상 달성 후 축 분포 편향 발생 시
- 또는 refresh cycle 에서 scaffolding_ratio 역전 시 (§5.2 trigger 4)

---

## 9. M-07 이관 잔여 Defect 처리

M-07 revise escalation 판정: **PASS** (DR-M07-01). 이관 defect **0건**.

유일한 부수 발견 (M-06 execution log 오집계 3건) 은 DR-M07-03 에서 정정 완료. 구조적 defect 아님.

---

## 10. Refresh 실행 체크리스트

refresh cycle 실행 시 아래를 순서대로:

- [ ] §1 정본(onto-direction.md) 변경 여부 확인
- [ ] onto-todo.md 내 done 전환 건수 집계
- [ ] DAG integrity check (topological sort)
- [ ] 신규/변경 W-ID cluster 재판정
- [ ] 축×활동×lifecycle 교차표 재생성
- [ ] deferred W-ID blockers 재평가
- [ ] §4 지표 snapshot 기록 (execution-log)
- [ ] §5 Principal trigger 해당 여부 확인
- [ ] compound 변경 시 4 불변식 재검증
- [ ] onto-todo.md revision bump (변경 시)
