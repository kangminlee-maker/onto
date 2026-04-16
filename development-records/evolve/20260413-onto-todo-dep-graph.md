---
as_of: 2026-04-13T19:45:00+09:00
supersedes: null
status: active
revision: v1.1
functional_area: onto-dep-graph
purpose: M-05 (Pre-draft Dependency Modeling) 산출 — 축 간·활동 간 의존 그래프 + D bootstrap/continuing 구분 + Compound sequencing 표기 규약 + M-05/M-06/M-07 책임 경계. M-06 work item 분배의 입력 계약.
authority_stance: non-authoritative-design-surface
canonicality: canonical-advancing  # M-06 이 본 그래프를 기반으로 work item 분배를 결정
source_refs:
  onto_direction: "development-records/evolve/20260413-onto-direction.md (§1.5 축 정의 + §1.2 활동 정의 정본, as_of=2026-04-13)"
  onto_todo: "development-records/evolve/20260413-onto-todo.md v1.4 (schema + §1.1 row 18 compound_member + §1.3 Compound 무결성 불변식 + §1.3 depends_on 3종 의미 구분)"
  m04_decisions: "development-records/plan/20260413-m04-decisions.md v1.2 (DR-M04-03 compound_member schema seat)"
  m05_decisions: "development-records/plan/20260413-m05-decisions.md v1.1 (DR-M05-01/02/03/04)"
  deferred_ledger: "development-records/plan/20260413-deferred-ledger.md v1.7 (DL-015 + DL-031 resolved)"
  consolidated: "development-records/plan/20260413-backlog-consolidated.md v3.2 (123 BL, compound 3 사례 식별)"
  meta: "development-records/evolve/20260413-onto-todo-meta.md v5.1 (§M-05 spec)"
decision_records_applied:
  - id: DR-M05-01
    status: applied
    note: "축 순서 D0→B→A→C + D continuing 재정립 + 축 간 의존"
  - id: DR-M05-02
    status: applied
    note: "Compound sequencing 표기 규약 (DL-015 해소). v1.1 에서 canonical seat 확정 + SSOT 명시"
  - id: DR-M05-03
    status: applied
    note: "Phase B skip-by-delegation (DL-031 해소). v1.1 에서 escalation tighten + defect taxonomy + minimum validation surface"
  - id: DR-M05-04
    status: applied
    note: "M-05/M-06/M-07 책임 경계 재정의 (logic-01 해소). M-05 = minimum W-ID sequencing contract"
  - id: DR-M04-03
    status: applied
    note: "Compound metadata canonical schema seat (compound_member field + compound_expansion change_type). onto-todo v1.4 schema 와 연계"
review_session_refs:
  - id: ".onto/review/20260413-383afe00"
    executor: "codex/subagent (M-05 9-lens review)"
    verdict: "CONDITIONAL (Partial pass — Consensus 2 negative + 6 Immediate + 6 unique findings) → resolved via v1.1 consolidated patch (Option B per Principal)"
---

# onto 축·활동 Dependency Graph (M-05)

본 문서는 M-05 (Pre-draft Dependency Modeling) 산출 seat 이다. pre-draft 단계에서 **축 (A/B/C/D) 간 의존**, **활동 (review/evolve/reconstruct/learn/govern) 간 의존**, **D bootstrap vs continuing 구분**, **Compound sequencing 표기 규약**, **M-05/M-06/M-07 책임 경계** 를 모델링한다.

## 0. 위상·경계

- **canonicality**: canonical-advancing. M-06 이 본 그래프를 읽어 축별 work item 분배를 결정.
- **authority_stance**: non-authoritative-design-surface. rank 1 authority 아님. authority SSOT 는 `authority/core-lexicon.yaml` (axis_enum / activity_enum) + `development-records/evolve/20260413-onto-direction.md` §1.5 / §1.2.
- **소비 제약**: 본 문서 참조는 **M-06 이후** 허용. M-05 종료 (DR-M05-01/02/03/04 applied + ledger v1.7 + execution-log M-05 entry) 후 활성화.

### 0.1 M-05 / M-06 / M-07 책임 경계 (v1.1 추가, DR-M05-04 — logic-01 해소)

v1 에서는 "task-level W-X-NN 의존은 M-07 책임" 으로 표기하면서 본 문서 §5 Compound sequencing 에서 `depends_on` W-ID 체인 rules 를 정의했다 — logic-01 적발 모순. v1.1 에서 세 stage 의 책임을 다음과 같이 재정의 (DR-M05-04).

| Stage | 책임 | 본 문서 연관 섹션 |
|---|---|---|
| **M-05** | (a) 축 backbone (D0→B→A→C+D continuing), (b) 활동 간 의존, (c) 축×활동 매트릭스, (d) D bootstrap vs continuing 구분, (e) **minimum W-ID sequencing contract** (compound 간 phase→phase DAG) | §1 / §2 / §3 / §4 / §5 |
| **M-06** | (a) 축별 work item 전수 생성, (b) 18 필드 전부 채움, (c) **compound 외 W-W edge 의 depends_on 값 채움**, (d) BL/DL → W provenance 매핑, (e) Delegated validation minimum surface 3 조건 (DR-M05-03 v1.1) | `20260413-onto-todo.md` §2 축별 섹션 |
| **M-07** | (a) 전체 W-W DAG validation (acyclic + Compound 무결성 불변식 재검증), (b) Cluster 판정 알고리즘 실행, (c) Lifecycle balance check (DL-023), (d) Revise escalation 판정 | (M-07 artifact seat 미정) |

즉 M-05 는 **compound sequencing** 에 한하여 W-W edge 를 결정하고, compound 외 W-W edge + 개별 W-ID authoring 은 M-06 책임, 전체 DAG validation 은 M-07 책임. M-06 이 M-05 범위 (a)~(e) 를 수정하려면 M-05 reopen.

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

### 2.2 D continuing 범위 (v1.1 patch: accumulation structure 마감 — structure-01 / A5 해소)

D0 이후 전 축 병행 운영:

- 각 축 work item 작성 중 **새 lexicon term 등장 시** D continuing lane 이 등록·관리 (per-occurrence, 별도 work item 아님)
- 별도 W-ID 로 분리 **않음**. lifecycle 자체가 cross-cutting lane. M-08 refresh 가 주기적으로 D continuing 의 accumulated term 을 scan.

#### 2.2.1 Accumulation structure (v1.1 신설, structure-01 해소)

D continuing 이 "writer intent + scan intent" 만 있고 structured recording contract 가 없다는 지적에 대응하여, 다음 4 seat 을 명시:

| Seat | 내용 | 결정 |
|---|---|---|
| **Recording seat** | 새 lexicon term 등록 저장소 | `authority/core-lexicon.yaml` 의 `provisional_terms` section (D0 에서 본 section 을 성문화하는 게 BL-123 D0 outcome). 별도 파일 분리는 D0 에서 결정 가능. |
| **Recording actor** | 등록 주체 | 새 lexicon term 을 등장시킨 work item 의 `ownership_boundary` 에 해당하는 role (또는 활동 agent). 명시적 책임 없이 등록 누락 시 M-07 lifecycle balance check 이 gap 으로 flag. |
| **Downstream consumer** | 등록된 term 의 소비자 | (i) M-08 refresh protocol (주기 scan + lifecycle_status 승격·폐기 판정), (ii) 다른 축의 work item 작성자 (provisional term 인용 금지 검증 도구 — D0 outcome). |
| **Promotion path** | seed → candidate → provisional → promoted | D0 에서 authority/core-lexicon.yaml 의 `schema_version_evolution` 규약 준수로 성문화. 승격 trigger 는 govern runtime (DL-021) 완료 후 정식화. |

#### 2.2.2 BL-122 처리 (v1.1 patch: axis D scope 재정의 — semantics-01 해소)

v1 에서 BL-122 (knowledge → principle 승격 경로, §1.2 "보류 중") 를 "D continuing 의 reactivation trigger" 로 표기했으나, 이는 axis D 를 **lexicon lifecycle 에서 knowledge-to-principle governance 로 확장** 하는 의미상 과도한 scope 확장 (semantics-01).

v1.1 에서 BL-122 를 D continuing 에서 **분리**:
- BL-122 는 **govern runtime (DL-021) follow-on** 으로 재배치 — axis D 가 아닌 축 C 또는 축 A govern 영역에서 처리
- D continuing 의 scope 는 lexicon term lifecycle 에만 한정 (seed → provisional → promoted)
- knowledge (promoted learning) → principle 승격은 govern runtime 의 별도 프로세스. axis D 가 lexicon provisional 관리를 담당하더라도 knowledge/principle 경로는 govern 책임
- BL-122 M-06 처리: resolution_path=DL-022 (M-06 govern-runtime 신규 도출), reactivation_trigger=govern runtime DL-021 design 착수. 본 처리는 consolidated v3.2 BL-122 Notes 에 이미 명시.

### 2.3 BL-123 내부 분할

| 부분 | 범위 | 처리 |
|---|---|---|
| D0 (bootstrap) | lexicon provisional lifecycle 최소 성문화 + 인용 금지 검증 도구 + provisional_terms recording seat 구조 결정 | M-06 에서 W-D-NN work item |
| D continuing | 각 축 work item 이 등록하는 새 lexicon term 관리 (§2.2.1 4 seat 구조) | lifecycle 자체, 별도 W-ID 없음 |

## 3. 활동 의존 그래프

### 3.1 활동 간 관계 (§1.2)

```
  review ─┐
  evolve ─┼──► product / ontology
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

- **review / evolve / reconstruct**: 상호 **독립**. ontology 유무에 따라 선택적 입력 (있으면 비용 감소).
- **learn**: 앞 3 활동의 **부산물 관리** (§1.2 독립 대상 없음). 앞 3 활동 최소 1사이클 운영 후 learning 수집·검증·승격.
- **govern**: 전 활동의 **메타** — 규범 등재·갱신·폐기 추적. 기준을 정하고 learn 이 실행 (§1.2 "경계 계약: govern 이 기준을 정하고, learn 이 실행한다").

### 3.3 활동 간 의존 edge

| From | To | 관계 | 출처 |
|---|---|---|---|
| review | learn | 부산물 수집 (운영 후) | §1.2 표 |
| evolve | learn | 부산물 수집 (운영 후) | §1.2 표 |
| reconstruct | learn | 부산물 수집 (운영 후) | §1.2 표 |
| govern | learn | 기준 정의 (선행) | §1.2 경계 계약 |
| govern | review, evolve, reconstruct | 규범 제약 (상시) | §1.1 principle |

## 4. 축 × 활동 매트릭스

M-06 이 본 매트릭스로 work item 을 축별로 분배한다.

**v1.1 patch 요지**:
- W-D 행을 **bootstrap-only** 로 제한 (A4 해소 — D-lane typing conflict)
- review 활동을 **ontology-present / ontology-absent 2 sub-path** 로 split (A6 / coverage-01 / DL-029 해소)
- D continuing 은 매트릭스 **바깥** cross-cutting obligation 로 이동

### 4.1 매트릭스 본체 (v1.1 수정)

review 활동 split + W-D bootstrap-only:

|        | review-ontology-present (r+) | review-ontology-absent (r−) | evolve | reconstruct | learn | govern |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| **W-A** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **W-B** | – | – | – | ✓ (A0) | ✓ (저장·처리) | – |
| **W-C** | – | – | – | – | – | ✓ |
| **W-D (bootstrap only)** | – | – | – | – | – | ✓ (D0) |

**매트릭스 바깥 (cross-cutting obligation)**:
- **D continuing lane**: 매트릭스 행이 아님. 별도 W-ID 없이 모든 축 work item 의 부수 obligation (새 lexicon term 등록). §2.2.1 accumulation structure 참조.

### 4.2 해설

- **W-A (review split, r+/r−)**: DL-029 review ontology 경로 분기 allocation — r+ (ontology 있음, 비용↓ 품질↑) / r− (ontology 없음, 비용↑ 품질 하락 가능). M-06 에서 각 경로별 W-A-NN 2-path 구조 or 단일 W-ID 내부 분기 결정.
- **W-A (5 활동)**: 5 활동 모두 entrypoint 구현 대상 (command / process / calling convention). M-06 주 배분 축.
- **W-B**:
  - reconstruct = **A0 framework (scope-runtime) 추출** (DL-016, DL-018 → M-06 work item)
  - learn = **learning 저장·처리 공통 인프라** (DL-017 중 기제 seat 지원, 측면 3)
  - 나머지 활동은 W-B 에 직접 귀속되지 않음 (A 에서 진입)
- **W-C**: govern = **drift 판정 engine + 큐·승인 + 수준 0→1→2** (DL-019)
- **W-D (bootstrap only, v1.1)**: govern = **lexicon provisional lifecycle bootstrap** (BL-123 D0 성문화 + 인용 금지 도구). D continuing 관리는 lane 자체 (매트릭스 바깥). **W-D-NN 은 D0 outcomes 만 작성**, D continuing 동작은 M-08 refresh + 각 축 work item 의 부수 obligation 으로 수행.

### 4.3 예외 — 축 A 내 measurement infra cluster

DL-017 (§1.4 측정 infra 3 지표: 점진성 / 지속성 / 기제) 은 M-06 분할 필수 (ledger v1.3 CC-A):
- 점진성 seat → 축 A learn 하위 또는 review 하위 (실행 로그 측정)
- 지속성 seat → 축 C (eval 인프라, 향후)
- 기제 seat → 축 A learn (knowledge 활용 히트율) + reconstruct (domain knowledge 추정 적중률)
- BL-120 (Feature 15 Consumption Feedback Verification) = 측면 3 기제 proxy, 축 A/C 경계 candidate

매트릭스 상으로는 W-A·W-C 가 대부분, 일부 W-B 도 가능. M-06 에서 3 지표별 개별 W-ID 분할.

## 5. Compound Sequencing 규약 (DL-015 해소) — **rule SSOT** (v1.1 conciseness-01 해소)

본 §5 는 Compound sequencing 규약의 **유일 rule SSOT** 이다. `m05-decisions.md` DR-M05-02 / `m04-decisions.md` DR-M04-03 / `onto-todo.md` schema 는 본 §5 를 **참조만** (중복 규칙 서술 금지 — v1 의 Notes/frontmatter 허용 언급은 v1.1 에서 revoke).

### 5.1 Compound 정의

**Compound** = 2 이상의 W-ID 가 **strict sequence** 로 연결된 work item 묶음. backlog (consolidated) 차원에서는 1 row (`item_granularity: consolidation-row`), work item (onto-todo.md) 차원에서는 N W-ID.

### 5.2 표기 규약 (v1.1 patch: canonical schema seat 확정)

- **Canonical seat** (v1.1, DR-M04-03): `onto-todo.md` v1.4 schema 의 **formal field `compound_member`** (18번째 field, object `{id, ordinal, total}` | null). Notes 또는 frontmatter 확장 필드 표기는 v1.1 에서 **revoke**. compound_member formal field 가 유일 seat.
- **sequencing**: 각 W-ID 의 `depends_on` 필드에 직전 ordinal 의 동일 compound 멤버 W-ID 기록 (**실행 DAG edge**, `onto-todo.md` §1.3 C-04 의 `W-[ABCD]-NN` 원소 의미).
- **granularity 전환**: consolidated v3.x row 1건 → onto-todo.md N W-ID (M-06 책임).
- **rewrite_trace** (v1.1, DR-M04-03 schema 확장 완료): compound 분해 시 각 W-ID 의 `rewrite_trace` 최초 entry 로 `{change_type: "compound_expansion", source_bl: "BL-NNN" 또는 null, compound_id: "<id>", phase: <ordinal>}` 기록. `compound_expansion` 은 `onto-todo.md` v1.4 schema 에 **정식 등재** (v1 의 "필요 시 M-04 minor bump" 보류 상태 해소).
- **Compound 무결성 불변식 4건** (`onto-todo.md` v1.4 §1.3 참조, 본 §5 와 동일 rule):
  - (i) 같은 `compound_member.id` 공유 W-ID 의 ordinal 은 `1..total` 연속·중복 없음
  - (ii) 각 W-ID `depends_on` 에 직전 ordinal 동일 compound 멤버 W-ID 포함
  - (iii) total 값 일관
  - (iv) 최초 rewrite_trace entry 로 compound_expansion 기록

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

### 5.4 M-06 분해 규칙 (v1.1 정정)

- **consolidation v3.x row** = 1 → **N W-ID** (onto-todo.md) 로 전개
- 각 W-ID 의 `provenance` 에 원 BL ID 기록 (`provenance: [BL-104]` 등)
- `compound_member` formal field 설정 (v1.1: Notes 에 기록 금지) — M-07 cluster 판정 시 같은 `compound_member.id` 는 **순차 실행 cluster 후보** (같은 파일 touch 가능성 높음)
- `rewrite_trace` 최초 entry 로 `compound_expansion` change_type 기록 (schema v1.4 에 정식 등재)
- `depends_on` 에 직전 ordinal 의 동일 compound 멤버 W-ID 기록 (W-ID 원소 = 실행 DAG, onto-todo.md §1.3)
- **compound 외 W-W edge** (예: DL-016 ↔ DL-018) 는 M-06 책임 (DR-M05-04 책임 경계) — M-05 는 compound 만 결정

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
| **활동 의존** | review / evolve / reconstruct 독립 + learn 부산물 + govern 메타 (§1.2) |
| **축 × 활동 매트릭스** | M-06 분배 근거 확정 (§4) |
| **D bootstrap vs continuing** | BL-123 중 lifecycle 성문화 + 인용 금지 도구 = D0. D continuing 은 cross-cutting lane, 별도 W-ID 없음 |
| **Compound sequencing** | compound_id + depends_on 체인 + Notes compound_member (DR-M05-02, DL-015 해소) |
| **Phase B** | skip-by-delegation (DR-M05-03, DL-031 해소). M-06 전수 작성이 최종 검증 |

## 8. 참조

- `development-records/evolve/20260413-onto-direction.md` §1.5 (축 정의) + §1.2 (활동 정의)
- `development-records/evolve/20260413-onto-todo.md` v1.3 (schema + §1.3 depends_on 의미 구분 + §4 Phase B exit 경로 skip-by-delegation 추가)
- `development-records/plan/20260413-m05-decisions.md` (DR-M05-01/02/03)
- `development-records/plan/20260413-deferred-ledger.md` v1.7 (DL-015 + DL-031 resolved)
- `development-records/plan/20260413-backlog-consolidated.md` v3.2 (123 BL — compound 3 사례 식별 근거)
- `development-records/evolve/20260413-onto-todo-meta.md` v5.1 (§M-05 spec — 축 순서 D0→B→A→C+D continuing)

## 9. 개정 이력

- v1 (2026-04-13T19:20): 파일 신설. M-05 Pre-draft Dependency Modeling 산출. 축 순서 재정립 + 활동 의존 + 축×활동 매트릭스 + D bootstrap/continuing 구분 + Compound sequencing 규약. DR-M05-01/02/03 applied. DL-015 + DL-031 resolved.
- v1.1 (2026-04-13T19:45): codex 9-lens review session `20260413-383afe00` CONDITIONAL 해소 (Option B consolidated patch per Principal). 주요 변경:
  - **§0.1 신설 (logic-01 해소, DR-M05-04)**: M-05/M-06/M-07 책임 경계 재정의 — M-05 = minimum W-ID sequencing contract (compound) 소유, M-06 = 개별 W-ID authoring + compound 외 depends_on 채움, M-07 = 전체 DAG validation + cluster verification.
  - **§2.2.1 신설 (structure-01 / A5 해소)**: D continuing accumulation structure — Recording seat (core-lexicon.yaml provisional_terms) + Recording actor (new term 등장 work item 의 ownership_boundary) + Downstream consumer (M-08 refresh + 인용 금지 도구) + Promotion path (seed→provisional→promoted).
  - **§2.2.2 신설 (semantics-01 해소)**: BL-122 를 D continuing reactivation trigger 에서 분리 — govern runtime (DL-021) follow-on 으로 재배치. axis D scope 를 lexicon term lifecycle 로 한정.
  - **§4 매트릭스 재구성 (A4 + A6 / coverage-01 해소)**: review 활동을 `review-ontology-present` / `review-ontology-absent` 2 sub-column 으로 split (DL-029 allocation). W-D 행을 **bootstrap-only** 로 제한 (D continuing 은 매트릭스 바깥 cross-cutting obligation). §4.1 / §4.2 / §4.3 재작성.
  - **§5 SSOT 선언 (conciseness-01 해소)**: Compound sequencing rule 의 **유일 SSOT** 명시. §5.2 canonical seat = `compound_member` formal field (DR-M04-03 schema v1.4), Notes/frontmatter 표기 revoke. §5.4 M-06 분해 규칙 에 "compound 외 W-W edge 는 M-06 책임" 명시 (DR-M05-04 연계).
  - frontmatter: revision v1 → v1.1, as_of 19:45, source_refs 에 m04_decisions v1.2 추가, onto_todo v1.3 → v1.4, decision_records_applied 에 DR-M05-04 + DR-M04-03 추가, review_session_refs 383afe00 추가.
