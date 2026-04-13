---
as_of: 2026-04-13T19:20:00+09:00
supersedes: null
status: active
revision: v1
functional_area: onto-dep-graph
purpose: M-05 (Pre-draft Dependency Modeling) 산출 — 축 간·활동 간 의존 그래프 + D bootstrap/continuing 구분 + Compound sequencing 표기 규약. M-06 work item 분배의 입력 계약.
authority_stance: non-authoritative-design-surface
canonicality: canonical-advancing  # M-06 이 본 그래프를 기반으로 work item 분배를 결정
source_refs:
  onto_direction: "development-records/design/20260413-onto-direction.md (§1.5 축 정의 + §1.2 활동 정의 정본, as_of=2026-04-13)"
  onto_todo: "development-records/design/20260413-onto-todo.md v1.3 (schema + §1.3 depends_on 3종 의미 구분)"
  m05_decisions: "development-records/plan/20260413-m05-decisions.md (DR-M05-01/02/03)"
  deferred_ledger: "development-records/plan/20260413-deferred-ledger.md v1.7 (DL-015 + DL-031 resolved)"
  consolidated: "development-records/plan/20260413-backlog-consolidated.md v3.2 (123 BL, compound 3 사례 식별)"
  meta: "development-records/design/20260413-onto-todo-meta.md v5.1 (§M-05 spec)"
decision_records_applied:
  - id: DR-M05-01
    status: applied
    note: "축 순서 D0→B→A→C + D continuing 재정립 + 축 간 의존"
  - id: DR-M05-02
    status: applied
    note: "Compound sequencing 표기 규약 (DL-015 해소)"
  - id: DR-M05-03
    status: applied
    note: "Phase B skip-by-delegation (DL-031 해소)"
---

# onto 축·활동 Dependency Graph (M-05)

본 문서는 M-05 (Pre-draft Dependency Modeling) 산출 seat 이다. pre-draft 단계에서 **축 (A/B/C/D) 간 의존**, **활동 (review/design/reconstruct/learn/govern) 간 의존**, **D bootstrap vs continuing 구분**, **Compound sequencing 표기 규약** 을 모델링한다. task-level (W-X-NN) 의존은 **M-07 책임** (post-draft cluster 검증).

## 0. 위상·경계

- **canonicality**: canonical-advancing. M-06 이 본 그래프를 읽어 축별 work item 분배를 결정.
- **authority_stance**: non-authoritative-design-surface. rank 1 authority 아님. authority SSOT 는 `authority/core-lexicon.yaml` (axis_enum / activity_enum) + `development-records/design/20260413-onto-direction.md` §1.5 / §1.2.
- **소비 제약**: 본 문서 참조는 **M-06 이후** 허용. M-05 종료 (DR-M05-01/02/03 applied + ledger v1.7 + execution-log M-05 entry) 후 활성화.

## 1. 축 의존 그래프

### 1.1 시간 순 축 의존

```
  D0 bootstrap
      │ (1회, 완료 후 B/A/C 진입 가능)
      ▼
      B                      ◀──┐
      │                          │
      ▼                          │ D continuing
      A                      ◀──┤  (cross-cutting lane,
      │                          │   전 축 병행)
      ▼                          │
      C                      ◀──┘
```

- **D0 (bootstrap)**: 축 D 의 최소 성문화. 전 축 진입 전 1회 완료.
- **B** (기반 인프라): D0 이후 착수. A 의 선행.
- **A** (entrypoint 구현): B 완료 후. 5 활동 command·process·calling convention.
- **C** (자율성 진화): A·B 최소 1사이클 운영 후 설계.
- **D continuing** (상시 원칙): D0 이후 cross-cutting lane. 모든 축의 work item 이 새 lexicon term 등록 시 D continuing 의 소비자.

### 1.2 축 의존 원천 (§1.5)

§1 정본 §1.5 "축 간 의존" 선언:

- **A → B**: 활동 구현은 기반 인프라 위에서 작동 (B 가 A 의 선행). A0(scope-runtime framework 추출) = axis=B (onto-todo.md §2 A0 ownership clarity).
- **C → A, B**: 자율성은 A·B 가 최소 1사이클 운영된 경험 위에서만 설계 가능.
- **D → A, B, C**: 모든 축에서 새 용어가 등장하면 D 가 등록·관리. 독립 축이 아닌 **교차 원칙**.

위 선언을 시간 축에 풀면 `D0 → B → A → C + D continuing`. D 는 완료되는 선행이 아니라 **bootstrap 후 continuing lane** 이다 (v5.1 meta 재정립).

### 1.3 축별 핵심 내용

| 축 | 성격 | 핵심 내용 | M-01/M-02 inventory 맥락 |
|---|---|---|---|
| **A** (entrypoint) | 활동별 | 5 활동 command·process·calling convention | 5 활동 구현 PARTIAL, A0 선행 미확보 |
| **B** (기반 인프라) | 공통 | scope-runtime, readers, middleware, data-seats | 10 component 중 state machine 3중 구현 미통합 (DL-018) |
| **C** (자율성 진화) | 메타 | self-application, drift 판정, 큐·승인, 수준 0→1→2 | drift engine 부재 (DL-019), harness 수준에 머무름 |
| **D** (상시 원칙) | 교차 | lexicon provisional lifecycle (bootstrap + continuing) | axis D 15 item 모두 lexicon lifecycle 범주 (DL-007) |

## 2. D bootstrap vs continuing 구분

### 2.1 D0 (bootstrap) 범위

**BL-123** (축 D 선행 확인, §1 "다음 작업 #2") 중 다음을 D0 으로 한정:

- **lexicon provisional lifecycle 최소 성문화**: seed → candidate → provisional → promoted 전이 규칙 + `lifecycle_status` 관리 위치 (authority/core-lexicon.yaml 확장 or 별도 seat 결정)
- **인용 금지 검증 도구**: provisional term 인용 시 경고·reject. §1 "다음 작업 #2" 본문 지시 직접 대응.

**완료 기준**: D0 완료 시 B/A/C 축 work item 착수 가능. M-06 에서 W-D-01 (또는 소수 W-D-NN) 으로 구현.

### 2.2 D continuing 범위

D0 이후 전 축 병행 운영:

- 각 축 work item 작성 중 **새 lexicon term 등장 시** D continuing lane 이 등록·관리 (per-occurrence, 별도 work item 아님)
- **BL-122** (knowledge → principle 승격 경로, §1.2 "보류 중") = D continuing 의 reactivation trigger — govern runtime (DL-021 의 M-06 도출) 완료 후 재활성
- 별도 W-ID 로 분리 **않음**. lifecycle 자체가 cross-cutting lane. M-08 refresh 가 주기적으로 D continuing 의 accumulated term 을 scan.

### 2.3 BL-123 내부 분할

| 부분 | 범위 | 처리 |
|---|---|---|
| D0 (bootstrap) | lexicon provisional lifecycle 최소 성문화 + 인용 금지 검증 도구 | M-06 에서 W-D-NN work item |
| D continuing | 각 축 work item 이 등록하는 새 lexicon term 관리 | lifecycle 자체, 별도 W-ID 없음 |

## 3. 활동 의존 그래프

### 3.1 활동 간 관계 (§1.2)

```
  review ─┐
  design ─┼──► product / ontology
reconstruct ┘       │
                    │ (역설계, reconstruct)
                    ▼
                 ontology ────┐
                              │
     (모든 활동 운영 부산물)   │
            │                 │
            ▼                 │
          learn ◄─────(기준)──┤
            ▲                 │
            │                 │
          govern  (메타, 전 활동 위 규범)
```

### 3.2 활동 의존 해설 (§1.2)

- **review / design / reconstruct**: 상호 **독립**. ontology 유무에 따라 선택적 입력 (있으면 비용 감소).
- **learn**: 앞 3 활동의 **부산물 관리** (§1.2 독립 대상 없음). 앞 3 활동 최소 1사이클 운영 후 learning 수집·검증·승격.
- **govern**: 전 활동의 **메타** — 규범 등재·갱신·폐기 추적. 기준을 정하고 learn 이 실행 (§1.2 "경계 계약: govern 이 기준을 정하고, learn 이 실행한다").

### 3.3 활동 간 의존 edge

| From | To | 관계 | 출처 |
|---|---|---|---|
| review | learn | 부산물 수집 (운영 후) | §1.2 표 |
| design | learn | 부산물 수집 (운영 후) | §1.2 표 |
| reconstruct | learn | 부산물 수집 (운영 후) | §1.2 표 |
| govern | learn | 기준 정의 (선행) | §1.2 경계 계약 |
| govern | review, design, reconstruct | 규범 제약 (상시) | §1.1 principle |

## 4. 축 × 활동 매트릭스

M-06 이 본 매트릭스로 work item 을 축별로 분배한다.

|        | review | design | reconstruct | learn | govern |
|--------|:---:|:---:|:---:|:---:|:---:|
| **W-A** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **W-B** | – | – | ✓ (A0) | ✓ (저장·처리) | – |
| **W-C** | – | – | – | – | ✓ |
| **W-D** | – | – | – | – | ✓ |

### 4.1 해설

- **W-A**: 5 활동 모두 entrypoint 구현 대상 (command / process / calling convention). M-06 주 배분 축.
- **W-B**:
  - reconstruct = **A0 framework (scope-runtime) 추출** (DL-016, DL-018 → M-06 work item)
  - learn = **learning 저장·처리 공통 인프라** (DL-017 중 기제 seat 지원, 측면 3)
  - 나머지 활동은 W-B 에 직접 귀속되지 않음 (A 에서 진입)
- **W-C**: govern = **drift 판정 engine + 큐·승인 + 수준 0→1→2** (DL-019)
- **W-D**: govern = **lexicon provisional lifecycle 관리** (BL-123 bootstrap + D continuing 관리)

### 4.2 예외 — 축 A 내 measurement infra cluster

DL-017 (§1.4 측정 infra 3 지표: 점진성 / 지속성 / 기제) 은 M-06 분할 필수 (ledger v1.3 CC-A):
- 점진성 seat → 축 A learn 하위 또는 review 하위 (실행 로그 측정)
- 지속성 seat → 축 C (eval 인프라, 향후)
- 기제 seat → 축 A learn (knowledge 활용 히트율) + reconstruct (domain knowledge 추정 적중률)
- BL-120 (Feature 15 Consumption Feedback Verification) = 측면 3 기제 proxy, 축 A/C 경계 candidate

매트릭스 상으로는 W-A·W-C 가 대부분, 일부 W-B 도 가능. M-06 에서 3 지표별 개별 W-ID 분할.

## 5. Compound Sequencing 규약 (DL-015 해소)

### 5.1 Compound 정의

**Compound** = 2 이상의 W-ID 가 **strict sequence** 로 연결된 work item 묶음. backlog (consolidated) 차원에서는 1 row (`item_granularity: consolidation-row`), work item (onto-todo.md) 차원에서는 N W-ID.

### 5.2 표기 규약

- **metadata**: onto-todo.md v1.x work item 의 Notes 또는 frontmatter 확장 필드 `compound_id: <snake_case_name>` 로 compound 식별
- **sequencing**: 각 W-ID 의 `depends_on` 필드에 직전 Phase W-ID 기록 (**실행 DAG edge**, §1.3 C-04 "depends_on 의미 구분" 에서 `W-[ABCD]-NN` 원소 = 실행 DAG)
- **notes**: 각 W-ID 의 Notes 에 `compound_member: <compound_id> phase_<n> of <N>` 기록
- **granularity 전환**: consolidated v3.x row 1건 → onto-todo.md N W-ID (M-06 책임)
- **rewrite_trace**: compound 분해 시 각 W-ID 의 `rewrite_trace` 에 `{change_type: "compound_expansion", source_bl: "BL-NNN", compound_id: "<name>", phase: <n>}` 기록 (schema v1.x `rewrite_trace.change_type` enum 에 `compound_expansion` 추가 필요 시 M-04 minor bump)

### 5.3 Pre-identified Compound (3 사례)

#### 5.3.1 `compound_id: agent_id_rename` (BL-104~109, 6 Phase)

| Phase | BL | 내용 | 의존 |
|---|---|---|---|
| 0 | BL-104 | Dual-read 구현 (learning loader + role loader + core-lens-registry reader) | (선행 없음) |
| 1 | BL-105 | Repo content 치환 (10쌍, ~50 파일) | Phase 0 |
| 2 | BL-106 | Repo file renames (roles/onto_*.md → roles/*.md × 10) | Phase 1 |
| 3 | BL-107 | Global data migration (~/.onto/ + ~/.onto/learnings/) | Phase 2 |
| 4 | BL-108 | 3-layer verification | Phase 3 |
| 5 | BL-109 | Authority 갱신 (core-lexicon legacy_aliases + Charter §17 + BLUEPRINT lens ID) | Phase 4 |

**M-06 분해**: 6 W-ID (Phase 0~4 는 activity=reconstruct/review, Phase 5 는 activity=govern + axis=D 유력 — BL-109 primary=G, axis=D 이미 분류). canonicality=scaffolding 5건 + supporting 1건 (Phase 4 verification).

#### 5.3.2 `compound_id: build_review_cycle` (§2 build_3rd → §1 build_8th, 2 단계)

| 단계 | Source | 내용 | 의존 |
|---|---|---|---|
| 1 | §2 (22 items, BL-??~??) | project_build_3rd_review_backlog 처리 | (선행 없음) |
| 2 | §1 (15 items, BL-001~015) | project_build_8th_review_backlog 처리 | 단계 1 |

**M-06 분해**: 단계별 다수 W-ID (sub-cluster 로 집약 가능). 순서 rationale — "build 3차 review backlog" 가 선행해야 "build 8차 review backlog" 가 의미를 가짐 (3rd 완료 후 8th 의 open items 재평가 가능). **scaffolding 비중 주 기여**: 62 scaffolding 중 37건 (71% 중 37/44) 이 본 compound cluster.

#### 5.3.3 `compound_id: business_domain_wave` (BL-101~103, 3 단계)

| 단계 | BL | 내용 | 의존 |
|---|---|---|---|
| 1 | BL-101 | Wave 1-3 실행 (5개 파일 병렬 각 wave, compound N=3 nested) | (선행 없음) |
| 2 | BL-102 | Gate 1 / Gate 2 (wave 간 review checkpoint) | 단계 1 |
| 3 | BL-103 | 교차 참조 + 글로벌 sync + commit | 단계 2 |

**M-06 분해**: 3 W-ID (또는 BL-101 이 Wave 1/2/3 로 nested compound → 9 W-ID 까지 확장 가능). BL-103 은 DL-010 cross-ref (BL-085 general rule ↔ BL-103 Business wave 3 instance) 로 `rule_to_instance` 관계 기록.

### 5.4 M-06 분해 규칙 (summary)

- **consolidation v3.x row** = 1 → **N W-ID** (onto-todo.md) 로 전개
- 각 W-ID 의 `provenance` 에 원 BL ID 기록 (`provenance: [BL-104]` 등)
- `compound_id` metadata 유지 — M-07 cluster 판정 시 같은 compound 는 **순차 실행 cluster 후보** (같은 파일 touch 가능성 높음)
- `rewrite_trace` 에 `compound_expansion` change_type 기록 (필요 시 schema v1.3 minor bump)
- `depends_on` 에 직전 Phase W-ID 기록 (W-ID 원소 = 실행 DAG, §1.3)

## 6. 의존 edge 타입 정리 (onto-todo.md §1.3 C-04 연계)

onto-todo.md v1.2 §1.3 에서 depends_on 의 3종 의미를 이미 확정. 본 dep graph 는 3종을 각각 별도 edge 로 모델링:

| Edge 원소 | 의미 | M-05 dep graph 모델링 |
|---|---|---|
| `W-[ABCD]-NN` | **실행 DAG 선행** | **본 문서 §1 (축) + §3 (활동) + §5 (compound)** 에서 주 모델링 |
| `BL-NNN` | **resolves 관계** (work item 이 backlog 해결) | M-06 에서 각 W-ID 의 `provenance` 또는 `depends_on` 에 기록 |
| `DL-NNN` | **resolution_stage 도달** (work item 완료가 DL 을 resolved 로 전환) | M-06 에서 각 W-ID 의 `provenance` 또는 `depends_on` 에 기록 |

본 dep graph 는 **실행 DAG (W-W edge)** 주 대상. BL/DL edge 는 M-06 work item 작성 시 각 W-ID 의 filed 에서 처리.

## 7. 산출 요약

| 항목 | 결정 |
|---|---|
| **축 순서** | `D0 → B → A → C + D continuing` (DR-M05-01) |
| **활동 의존** | review / design / reconstruct 독립 + learn 부산물 + govern 메타 (§1.2) |
| **축 × 활동 매트릭스** | M-06 분배 근거 확정 (§4) |
| **D bootstrap vs continuing** | BL-123 중 lifecycle 성문화 + 인용 금지 도구 = D0. D continuing 은 cross-cutting lane, 별도 W-ID 없음 |
| **Compound sequencing** | compound_id + depends_on 체인 + Notes compound_member (DR-M05-02, DL-015 해소) |
| **Phase B** | skip-by-delegation (DR-M05-03, DL-031 해소). M-06 전수 작성이 최종 검증 |

## 8. 참조

- `development-records/design/20260413-onto-direction.md` §1.5 (축 정의) + §1.2 (활동 정의)
- `development-records/design/20260413-onto-todo.md` v1.3 (schema + §1.3 depends_on 의미 구분 + §4 Phase B exit 경로 skip-by-delegation 추가)
- `development-records/plan/20260413-m05-decisions.md` (DR-M05-01/02/03)
- `development-records/plan/20260413-deferred-ledger.md` v1.7 (DL-015 + DL-031 resolved)
- `development-records/plan/20260413-backlog-consolidated.md` v3.2 (123 BL — compound 3 사례 식별 근거)
- `development-records/design/20260413-onto-todo-meta.md` v5.1 (§M-05 spec — 축 순서 D0→B→A→C+D continuing)

## 9. 개정 이력

- v1 (2026-04-13T19:20): 파일 신설. M-05 Pre-draft Dependency Modeling 산출. 축 순서 재정립 + 활동 의존 + 축×활동 매트릭스 + D bootstrap/continuing 구분 + Compound sequencing 규약. DR-M05-01/02/03 applied. DL-015 + DL-031 resolved.
