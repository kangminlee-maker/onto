# onto build Two-Layer Architecture + graphify Adoption Hypothesis (v7)

## 0. Document Status

| 항목 | 값 |
|---|---|
| version | 7 (major revision: Two-Layer Architecture + graphify adoption consolidated) |
| scope | **Part I**: onto build Two-Layer Architecture (Phase 0 ARCH 6건 전체) + **Part II**: graphify adoption evaluation (v6 consolidated, layer-classified) |
| artifact purpose | **onto build의 canonical architecture design document**. Two-Layer Architecture는 사용자 confirmed principle. graphify adoption 부분은 여전히 backlog hypothesis (build authority owner re-review 필요) |
| 1차 review session | `.onto/review/20260408-a406b52b/` |
| 2차 review session | `.onto/review/20260408-19089faf/` |
| 3차 review session | `.onto/review/20260408-3b79cbd7/` |
| 4차 review session | `.onto/review/20260409-09ccdbed/` |
| 5차 review session | `.onto/review/20260409-48f8a7f3/` |
| 6차 review session | `.onto/review/20260409-57d2f40a/` |
| revision trigger (v6→v7) | 사용자 결정 (2026-04-10): (1) Two-Layer Architecture 원칙 확정, (2) BT-E5/E6 split, (3) Promotion gate 메커니즘, (4) Phase 0 ARCH 6건 전체 진행, (5) v6 major revision in place |
| **추적 메커니즘** | §19 Prior-Finding Crosswalk가 1차~6차 finding + v7 architectural decisions를 추적 |

## 1. Source Materialization (Evidence Basis for Part II)

| 항목 | 값 |
|---|---|
| upstream repo | `safishamsi/graphify` |
| branch | `v3` |
| commit | `92b70ce5f4f208bb7ea4d4e796f70e52e40418eb` |
| commit message | `fix: sanitize_label double-encoding and --wiki missing from skill (#66, #55)` |
| local root | `.onto/temp/graphify-source/` (gitignored, ephemeral, 현재 정리됨) |

모든 graphify-side claim은 §18 Evidence Index에서 `1 claim = 1 row = 1 file path + numeric line(s)` 규칙으로 추적됩니다.

---

# Part I — onto build Two-Layer Architecture

> Phase 0 architectural decisions. 6 ARCH-* items consolidated into one design document.

## 2. Two-Layer Architecture Principle [ARCH-L1L2]

### 2.1 Motivation

사용자의 두 목적 진술 (2026-04-10):

> *"정밀재현이 필요한 이유는, Ontology가 실제로 작동하는 코드 혹은 something이어야 하기 때문이야."*
>
> *"추론의 영역이 필요한 이유는, ontology는 코드 혹은 something이 변경/업데이트 될 때에 함께 진화해야 하기 때문이야."*

이 두 목적은 다른 layer를 요구합니다:

| 목적 | Layer | 성격 |
|---|---|---|
| 실행 가능성 (functioning code/something) | **Ground Truth Layer** (precise reproduction) | 결정론적, 검증 가능, 실행 가능 |
| 진화 가능성 (evolves with source) | **Inference Layer** (evolution driver) | 해석적, 가설적, 살아있음 |

build의 본질 = 두 layer를 **동시에** 생성·유지하면서, **layer 간 경계를 절대 흐리지 않는 것**.

### 2.2 Layer Definitions

#### 2.2.1 Ground Truth Layer (Layer 1 — Precise Reproduction)

**목적**: ontology가 *실제로 작동하는 코드 혹은 something*이어야 한다는 사용자 요구를 충족.

**성격**:
- 소스에서 **직접 관찰 가능**한 사실만 포함
- **실행 가능**: 이 layer만 가지고 코드 생성, 검증, 결정론적 질의가 성립해야 함
- certainty는 **`observed` 한 단계만 허용**
- 소스 파일이 변경되지 않는 한 **불변**

**내용 카테고리**:

| 카테고리 | 예시 |
|---|---|
| **Structural elements** | entity, enum, property, relation (with `from`/`to` directly verified) |
| **Observable behaviors** | state_transition (literal in code), command (with literal preconditions), query (literal signature) |
| **Literal values** | policy_constant의 실제 값, configuration values, enum members |
| **Code mappings** | code_mapping (legacy aliases와 canonical name의 literal 매핑) |
| **Literal workflows** | saga 정의가 코드에 명시된 경우 (DDD framework의 saga annotation 등), domain_flow가 코드에 선언된 경우 |
| **Observed rationale** | `# WHY:`, `# HACK:`, `# NOTE:` 같은 literal comment, docstring의 design intent 문장, ADR 문서의 결정 rationale (BT-E5a) |
| **Constraints** | source-verified business rules, FK constraints, type constraints |

**소비자**:
- Code generators (ontology → 코드)
- Schema validators (실제 코드를 ontology에 대조 검증)
- Deterministic query consumers (정확한 답을 요구하는 도구)
- Production-grade pipelines

#### 2.2.2 Inference Layer (Layer 2 — Evolution Driver)

**목적**: ontology가 *코드/something이 변경될 때 함께 진화*해야 한다는 사용자 요구를 충족.

**성격**:
- **domain 지식을 활용한 의미·맥락 추론**의 결과
- **해석 가능**: "왜", "어떤 패턴", "어떻게 묶이는가"를 담음
- certainty는 **`rationale-absent` / `inferred` / `ambiguous` / `not-in-source`** (non-observed)
- **살아있음**: 끊임없이 리팩토링·재평가·pruning 대상
- **임시적**: 검증되면 ground truth로 승격, 무효화되면 제거

**내용 카테고리**:

| 카테고리 | 예시 |
|---|---|
| **Semantic similarity edges** | `validate_email()` ↔ `check_mail_format()` 의미 유사성 (직접 호출 없음) — BT-E4 |
| **Inferred groupings (hyperedges)** | "이 5개 함수가 함께 auth flow를 구성한다" (LLM 추론), protocol 구현 멤버 클러스터 — BT-E6-inferred |
| **Inferred rationale** | LLM이 "이 hardcoded 값 500은 regulatory limit일 것" 같이 추측한 design intent — BT-E5b |
| **Community clusters** | Leiden community detection의 출력 — 토폴로지 기반 자동 군집 — BT-A1 |
| **Structural insights** | god nodes (구조적 hub), surprising connections, suggested questions — BT-A2/A3/A4 |
| **Inferred elements** | `inferred` certainty entities/relations |
| **Ambiguous elements** | `ambiguous` certainty entities (다중 해석 경합) |
| **Placeholders** | `not-in-source` certainty (위치만 표시) |
| **Promotion candidates** | inference → ground truth 승격 대기 항목 |

**소비자**:
- Review lenses (의미 검증, 해석 평가)
- `/onto:refine` (annotation 정리, 살아있는 ontology 유지)
- `/onto:promote-inference` (검증된 inference의 GT 승격)
- Exploration UIs (탐색·발견)
- Phase 3 user confirmation surface

### 2.3 Never Mix Principle

**원칙**: 두 layer는 구조적으로 분리되어야 하며, 내용이 한쪽에서 다른 쪽으로 **자동·암묵적**으로 오염되면 안 됩니다.

#### 오염의 두 방향과 각각의 위험

| 오염 방향 | 무엇이 깨지는가 | 사용자 목적 침해 |
|---|---|---|
| Inference → Ground Truth (자동) | ontology가 "실행 가능한 코드"가 아니게 됨. 추측이 사실처럼 취급되어 결정론적 소비 불가 | "실제로 작동" 침해 |
| Ground Truth → Inference (경화) | ontology가 "살아있지" 못하게 됨. 고정된 사실이 리팩토링을 막아 진화 불가 | "함께 진화" 침해 |

#### 분리를 보장하는 구조적 guard

1. **파일 분리**: `raw-ground-truth.yml` + `raw-inference.yml` 별도 파일 (§3 참조)
2. **소비자 격리**: executable consumer는 ground truth 파일만 읽도록 제한 (§7, §8 참조)
3. **단방향 cross-reference**: inference → ground truth ID 참조만 허용, 역방향 금지 (§4 참조)
4. **Validation 게이트**: build-time validator가 layer boundary 위반 탐지 (§4.3 참조)
5. **Promotion gate**: inference → ground truth 이동은 유일한 합법 경로이며 panel review + user approval 요구 (§5 참조)

### 2.4 Unidirectional Promotion (Inference → Ground Truth, Gated)

사용자 추가 원칙 (2026-04-10):

> *"inference 또한 promote 처럼 검토와 승인 하에 ground truth로 승격 가능해야 해."*

#### 원칙

- **방향**: Inference → Ground Truth **만** (단방향)
- **자동 금지**: 모든 promotion은 panel review + user approval gate를 통과해야 함
- **Audit trail**: promoted entry는 양방향 marker로 추적 (origin in inference, evidence in ground truth)
- **Original 보존**: 원본 inference entry는 삭제되지 않고 marker만 부착 (§5.6 참조)

#### Gated Forward Promotion이 보장하는 것

1. **Layer 순도 유지**: 검증되지 않은 inference가 자동으로 ground truth로 새지 않음
2. **Evolution 가능성**: 검증된 inference는 gate를 거쳐 ground truth로 이동 가능 → ontology 진화
3. **Audit trail**: 모든 promotion이 trace 가능 → 향후 결정 근거 추적 가능
4. **Reversibility**: marker 기반으로 잘못된 promotion을 rollback 가능

자세한 mechanism은 §5에서 다룹니다.

### 2.5 Cross-Layer Reference Direction

#### Allowed (단방향)

```
Inference Layer ───reference──→ Ground Truth Layer (entity ID)
```

**예시**: inference layer의 semantic similarity annotation이 ground truth의 entity ID를 참조

```yaml
# raw-inference.yml
annotations:
  - id: ann-42
    type: semantic_similarity
    from_gt: gt-entity-Order      # ← ground truth ID 참조 (allowed)
    to_gt: gt-entity-Payment      # ← ground truth ID 참조 (allowed)
    confidence: 0.85
    certainty: inferred
```

#### Forbidden (역방향)

```
Ground Truth Layer ──reference──→ Inference Layer  ❌
```

**금지 이유**: ground truth가 inference에 의존하면 inference layer 전체를 삭제할 때 ground truth가 broken state가 됨. 즉 **inference layer는 ground truth 없이 살 수 없지만, ground truth는 inference 없이 독립 생존**해야 함.

#### 검증 방법

build-time validator가 다음을 체크:
- `raw-ground-truth.yml` 안에서 inference ID 참조 (`ann-*`, `inf-*`, `hyper-*` 등) 발견 시 fail-close
- `raw-inference.yml` 안에서 ground truth ID 참조는 정상

자세한 enforcement는 §4에서 다룹니다.

### 2.6 Why Two-Layer Architecture Matters

이 architecture는 onto build의 다음 결정들과 직접 정합합니다:

| Onto canonical principle | Two-Layer 정합성 |
|---|---|
| 5-level certainty (`observed` vs non-observed) | observed → ground truth, non-observed → inference. 자연스러운 1:1 대응 |
| `abduction_quality` (Phase 3 SSOT) | inference layer 내부의 ranking signal로 작동. ground truth는 binary이므로 quality 평가 불요 |
| Integral exploration loop | Stage 1 (statics) → Stage 2 (kinetics): 둘 다 ground truth 생산. dynamics 추론은 별도 inference layer에서 |
| Single artifact truth (raw.yml) | "single truth"이 아니라 "**two truths, never mixed, with gated bridge**"로 진화. canonical principle은 유지 (각 layer 내부의 single truth) |
| Review-first canonical priority | Two-Layer는 review에도 적용 가능 — review-record의 ground truth (lens가 직접 검증한 것) vs inference (lens가 추측한 것) 분리 가능 |
| LLM-Native development | layer 분리는 LLM 의견(inference)과 결정론적 사실(ground truth)의 ownership을 명확히 분리하는 패턴 |
| OaC (concept → contract → seat → consumer chain) | 각 layer가 독립적인 concept→contract→seat→consumer chain을 가짐 |

---

## 3. Raw File Format [ARCH-RAWFMT]

### 3.1 File Separation Decision

**Option β 채택** (사용자 승인 2026-04-10): `raw-ground-truth.yml` + `raw-inference.yml` 별도 파일.

#### 다른 옵션 대비 선택 이유

| 옵션 | 분리 강도 | 채택 여부 |
|---|---|---|
| α — 단일 파일 + top-level section | YAML section level | 거부: validator 없으면 enforcement 약함 |
| **β — 별도 파일** | **파일 시스템 level** | **채택: 가장 강한 physical guard** |
| γ — 단일 파일 + 원소별 layer 태그 | 태그 level | 거부: 태그 미부착 시 모호 |

#### β의 강점

- **Physical guard**: 파일 자체가 분리되어 있으므로 ground truth 파일에 inference 내용을 실수로 쓸 수 있는 통로가 거의 없음
- **Selective consumption**: executable consumer가 `raw-ground-truth.yml`만 읽으면 inference 오염 risk 0
- **Independent invalidation**: cache/diff/refactoring을 layer별로 독립 운영 가능 (§6 참조)
- **Independent evolution**: inference 파일만 수정해도 ground truth는 그대로 유지

### 3.2 File Layout

빌드 세션의 산출물:

```
{project}/.onto/builds/{session_id}/
├── schema.yml                    # 기존 schema 정의 (변경 없음)
├── context_brief.yml             # 기존 context (변경 없음)
├── raw-ground-truth.yml          # 🆕 Layer 1: 정밀 재현
├── raw-inference.yml             # 🆕 Layer 2: 추론
├── deltas/                       # 기존 (변경 없음)
└── cache/                        # 🆕 layer-aware (§6 참조)
    ├── ground-truth/
    └── inference/
```

기존 `raw.yml` 단일 파일은 **deprecated**. 마이그레이션 경로는 §3.6 참조.

### 3.3 raw-ground-truth.yml Schema

```yaml
# Raw Ontology — Ground Truth Layer (Layer 1)
# 이 파일은 source에서 직접 관찰 가능한 사실만 포함합니다.
# certainty는 'observed' 단일 값. 다른 값 발견 시 validation fail.

meta:
  schema: ./schema.yml
  layer: ground_truth        # 🆕 layer marker (validator가 검증)
  source_type: code          # code | spreadsheet | database | document | mixed
  domain: software-engineering
  source: src/payment/
  date: 2026-04-10
  build_session: 20260410-abc12345
  rounds: 4
  convergence: converged
  agents: [explorer, logic, structure, dependency, semantics, pragmatics, evolution, coverage, conciseness, axiology, philosopher]

# === Structural elements ===
elements:
  - id: gt-entity-Payment
    type: entity
    name: Payment
    definition: 결제 트랜잭션 단위
    certainty: observed       # ⚠ 반드시 observed
    added_in_round: 0
    labeled_by: [structure, semantics]
    source:
      locations:
        - "src/payment/Payment.java:15-87"
      deltas: [d-0-1]
    details:
      properties:
        - name: id
          type: UUID
          nullable: false
        - name: amount
          type: BigDecimal
          nullable: false
        - name: status
          type: PaymentStatus  # enum reference
      
  - id: gt-enum-PaymentStatus
    type: enum
    name: PaymentStatus
    certainty: observed
    source:
      locations:
        - "src/payment/PaymentStatus.java:5-12"
      deltas: [d-0-2]
    details:
      values:
        - {value: PENDING, code: 0}
        - {value: APPROVED, code: 1}
        - {value: REJECTED, code: 2}
        - {value: REFUNDED, code: 3}

# === Relations (binary, directed) ===
relations:
  - id: gt-rel-001
    from: gt-entity-Payment
    to: gt-entity-Order
    type: belongs_to
    cardinality: many-to-one
    certainty: observed
    source:
      locations: ["src/payment/Payment.java:42"]
      deltas: [d-0-3]

# === Observable behaviors ===
behaviors:
  state_transitions:
    - id: gt-st-001
      entity: gt-entity-Payment
      field: status
      from: PENDING
      to: APPROVED
      trigger: PaymentService.approve()
      certainty: observed
      source:
        locations: ["src/payment/PaymentService.java:78-82"]
        deltas: [d-1-1]
  
  commands:
    - id: gt-cmd-001
      name: approvePayment
      actor: PaymentService
      target_entities: [gt-entity-Payment]
      preconditions:
        - "payment.status == PENDING"
      results:
        - "payment.status = APPROVED"
        - "audit log entry created"
      certainty: observed
      source:
        locations: ["src/payment/PaymentService.java:78-92"]
  
  queries:
    - id: gt-qry-001
      name: findByStatus
      actor: PaymentRepository
      target_entities: [gt-entity-Payment]
      certainty: observed
      source:
        locations: ["src/payment/PaymentRepository.java:34"]

# === Literal workflows (when in source) ===
literal_workflows:
  # Schema D의 saga가 코드에 literal하게 정의된 경우만 여기에
  - id: gt-flow-001
    type: saga
    name: PaymentApprovalFlow
    steps:
      - {step: validate, actor: gt-cmd-validate}
      - {step: charge, actor: gt-cmd-charge}
      - {step: notify, actor: gt-cmd-notify}
    certainty: observed
    source:
      locations: ["src/payment/PaymentApprovalSaga.java:1-50"]

# === Constraints ===
constraints:
  - id: gt-cst-001
    applies_to: gt-entity-Payment
    description: "amount must be > 0"
    type: business_rule
    certainty: observed
    source:
      locations: ["src/payment/Payment.java:24-28"]

# === Code mappings ===
code_mappings:
  - canonical: gt-entity-Payment
    legacy_aliases: [PymtEntity, OldPayment]
    db_table: payments
    fk_variants: [pymt_id, payment_id]
    source:
      locations: ["src/payment/migration/V003.sql"]

# === Observed rationale (BT-E5a) ===
observed_rationale:
  - id: gt-ratl-001
    rationale_for: gt-cst-001
    text: "amount > 0 invariant — refund 시 negative balance 방지 위함"
    type: comment        # comment | docstring | adr | spec
    source:
      locations: ["src/payment/Payment.java:23 # comment"]

# === Ubiquitous language ===
ubiquitous_language:
  - term: Payment
    definition: 결제 트랜잭션 단위
    used_in: [gt-entity-Payment, gt-cmd-001]
    source_delta: d-0-1

# === External systems ===
external_systems:
  - name: StripeAPI
    role: payment_gateway
    integration_point: gt-cmd-charge
    direction: downstream
```

### 3.4 raw-inference.yml Schema

```yaml
# Raw Ontology — Inference Layer (Layer 2)
# 이 파일은 domain 지식을 활용한 의미·맥락 추론의 결과를 포함합니다.
# certainty는 'rationale-absent' / 'inferred' / 'ambiguous' / 'not-in-source' 만 허용.
# ground truth ID(gt-*)는 참조 가능. inference ID(ann-*, hyper-*, inf-*)는 참조 가능.
# 단방향 reference: 이 파일 → ground truth ID 참조 OK, 반대 금지.

meta:
  schema: ./schema.yml
  layer: inference            # 🆕 layer marker
  source_type: code
  domain: software-engineering
  source: src/payment/
  date: 2026-04-10
  build_session: 20260410-abc12345
  ground_truth_ref: ./raw-ground-truth.yml   # 🆕 paired GT 파일 명시
  rounds: 4
  agents: [...]

# === Annotations (semantic similarity) [BT-E4] ===
annotations:
  - id: ann-001
    type: semantic_similarity
    from_gt: gt-entity-Payment       # → ground truth ID
    to_gt: gt-entity-LegacyPayment   # → ground truth ID
    confidence: 0.92
    certainty: inferred
    rationale: "두 entity가 동일한 도메인 개념(결제 트랜잭션)을 표현하고 있으나 서로 직접 참조하지 않음. 명명 패턴과 field 구조가 거의 동일."
    labeled_by: [semantics, evolution]
    source:
      locations:
        - "src/payment/Payment.java:15"
        - "src/legacy/LegacyPayment.java:8"
      deltas: [d-2-3]
    promoted_to_ground_truth: null   # marker가 부착되면 promoted

  - id: ann-002
    type: semantic_similarity
    from_gt: gt-cmd-validate
    to_gt: gt-cmd-checkInput
    confidence: 0.78
    certainty: inferred
    rationale: "두 command가 입력 검증이라는 동일한 책임을 분담하나 별도 클래스에 배치됨. 통합 가능성 시사."
    labeled_by: [conciseness]
    source:
      locations: ["..."]

# === Hyperedges (groupings) [BT-E6-inferred] ===
hyperedges:
  - id: hyper-001
    type: inferred_grouping
    pattern: auth_flow_members
    members:
      - gt-cmd-validateLogin
      - gt-cmd-createSession
      - gt-cmd-updateLastLogin
      - gt-cmd-logAuthEvent
    confidence: 0.88
    certainty: inferred
    rationale: "이 4개 command가 모두 인증 흐름의 한 단계로 작동. 직접 호출 관계는 일부만 있으나 의미적 그룹."
    labeled_by: [pragmatics, logic]
    source:
      locations: ["src/auth/*"]
    promoted_to_ground_truth: null

  - id: hyper-002
    type: protocol_implementation
    pattern: comparable_implementers
    protocol: gt-interface-Comparable
    members:
      - gt-entity-Order
      - gt-entity-Payment
      - gt-entity-Refund
    confidence: 0.95
    certainty: inferred
    rationale: "세 entity가 모두 Comparable 인터페이스 구현 (IDE-level 정보, 코드에는 implements 키워드 외 명시 없음)"

# === Insights (god nodes / surprising / questions) [BT-A2/A3/A4] ===
insights:
  god_nodes:
    - id: insight-god-001
      entity: gt-entity-Payment
      degree: 23
      why: "Payment가 23개의 다른 entity와 관계 맺음 — 시스템의 핵심 abstraction"
      labeled_by: [analyze]
      epsilon_candidate: true   # 다음 round의 epsilon으로 promote 가능
      promotion_candidate: true  # ground truth로 승격 가능 (Phase 3 user 확인)
  
  surprising_connections:
    - id: insight-srp-001
      from_gt: gt-entity-User
      to_gt: gt-entity-Inventory
      relation: shares_data_with
      score: 8.5
      composite_factors:
        confidence_bonus: 3       # AMBIGUOUS edge
        cross_file_type: 2        # code ↔ doc
        cross_repo: 0
        cross_community: 1
        peripheral_to_hub: 1
        semantic_similarity: 1.5
      why: "User가 Inventory와 직접 관계를 맺을 이유가 없는데 발견됨 — design pattern 위반 또는 의도된 cross-cutting concern인지 user 확인 필요"
      epsilon_candidate: true
      promotion_candidate: true

  suggested_questions:
    - id: insight-q-001
      question: "Order와 Payment 사이의 정확한 관계는?"
      context: "Order ↔ Payment edge가 AMBIGUOUS로 표시됨"
      origin: ambiguous_edge_detection
      labeled_by: [analyze]
      epsilon_candidate: true   # 다음 round의 exploration target
      promotion_candidate: false  # question 자체는 promotion 대상 아님

# === Inferred elements (non-observed certainty) ===
inferred_elements:
  - id: inf-entity-001
    type: entity
    name: AuditLog
    certainty: rationale-absent
    rationale: "코드에 entity 자체는 있으나 (`gt-entity-AuditLog` 참조), 왜 immutable한지에 대한 rationale이 코드 어디에도 없음"
    related_to: gt-entity-AuditLog
    abduction_quality:
      explanatory_power: high
      coherence: consistent

  - id: inf-rel-001
    type: relation
    from_gt: gt-entity-User
    to_gt: gt-entity-Profile
    relation_type: owns
    certainty: inferred
    confidence: 0.7
    rationale: "User 클래스에 Profile 필드는 있으나 ownership 의미가 명시적이지 않음"
    abduction_quality:
      explanatory_power: medium
      coherence: consistent

# === Ambiguous elements ===
ambiguous_elements:
  - id: amb-st-001
    type: state_transition
    entity: gt-entity-Order
    field: status
    from: PROCESSING
    options:
      - to: COMPLETED
        triggered_by: success_path
        evidence: "성공 시 status = COMPLETED"
      - to: ARCHIVED
        triggered_by: timeout
        evidence: "timeout 시 status = ARCHIVED — 정확한 timeout 조건이 코드에서 불명확"
    certainty: ambiguous
    user_decision_required: true

# === Not-in-source placeholders ===
not_in_source:
  - id: nis-001
    placeholder_type: business_rule
    description: "환불 정책이 코드에 없음 — refund() 메서드가 간단히 status 변경만 수행. 실제 환불 정책 (기간, 조건, 승인)이 어디에 있는지 user에게 확인 필요"
    related_to: gt-cmd-refund
    certainty: not-in-source

# === Inferred rationale (BT-E5b) ===
inferred_rationale:
  - id: inf-ratl-001
    rationale_for: gt-cst-001     # ground truth constraint 참조
    hypothesis: "amount > 0 invariant는 회계 표준 (negative balance 금지) 또는 PCI 요구사항에서 비롯되었을 가능성"
    confidence: 0.6
    abduction_quality:
      explanatory_power: medium
      coherence: consistent
    labeled_by: [evolution]
    source:
      locations: ["src/payment/Payment.java:24-28"]

# === Promotion candidates ===
promotion_candidates:
  - id: pc-001
    inference_id: ann-001
    trigger_type: source_update    # source_update | user_knowledge | external_verification | cross_reference | review_finding
    trigger_evidence: "git commit abc123 added explicit @SemanticEquivalent annotation linking Payment and LegacyPayment"
    proposed_target_layer: ground_truth
    proposed_gt_entry:
      id: gt-rel-002
      from: gt-entity-Payment
      to: gt-entity-LegacyPayment
      type: semantically_equivalent
      certainty: observed
    panel_status: pending     # pending | reviewed | approved | rejected
    user_approval: pending
    
  - id: pc-002
    inference_id: hyper-002
    trigger_type: cross_reference
    trigger_evidence: "Comparable interface implementation 정보가 build/.onto/{another-session}/raw-ground-truth.yml#gt-interface-Comparable에서 확인됨"
    proposed_target_layer: ground_truth
    panel_status: pending
    user_approval: pending

# === Issues (warnings, concerns from inference) ===
issues:
  - id: iss-001
    severity: warning
    description: "Payment.amount의 precision이 BigDecimal이지만 일부 query에서 Double로 변환 — 정밀도 손실 가능성"
    reported_by: [logic]
    related_to: [gt-entity-Payment, gt-qry-001]
```

### 3.5 ID Reference System

#### ID prefix convention

| Prefix | Layer | 카테고리 |
|---|---|---|
| `gt-entity-{Name}` | Ground Truth | entity |
| `gt-enum-{Name}` | Ground Truth | enum |
| `gt-rel-{NNN}` | Ground Truth | relation |
| `gt-st-{NNN}` | Ground Truth | state_transition |
| `gt-cmd-{NNN}` | Ground Truth | command |
| `gt-qry-{NNN}` | Ground Truth | query |
| `gt-cst-{NNN}` | Ground Truth | constraint |
| `gt-flow-{NNN}` | Ground Truth | literal workflow |
| `gt-ratl-{NNN}` | Ground Truth | observed rationale |
| `ann-{NNN}` | Inference | annotation (semantic similarity) |
| `hyper-{NNN}` | Inference | hyperedge (inferred grouping) |
| `insight-god-{NNN}` | Inference | god node insight |
| `insight-srp-{NNN}` | Inference | surprising connection |
| `insight-q-{NNN}` | Inference | suggested question |
| `inf-entity-{NNN}` | Inference | inferred entity |
| `inf-rel-{NNN}` | Inference | inferred relation |
| `amb-{NNN}` | Inference | ambiguous element |
| `nis-{NNN}` | Inference | not-in-source placeholder |
| `inf-ratl-{NNN}` | Inference | inferred rationale |
| `pc-{NNN}` | Inference | promotion candidate |
| `iss-{NNN}` | Inference | issue |

#### Reference rules

- ID prefix는 immutable (한번 부여되면 layer와 카테고리가 고정)
- Inference layer entry는 ground truth ID(`gt-*`)를 자유롭게 참조 가능
- Ground truth layer entry는 inference ID 참조 **금지**
- Promoted entry는 새 ground truth ID를 부여받음 (e.g., `pc-001` → `gt-rel-002`)
- Promoted 후 원본 inference entry는 보존되며 `promoted_to_ground_truth: gt-rel-002` marker 부착

### 3.6 Migration from Single `raw.yml`

기존 `raw.yml` 사용하던 build session은 다음 절차로 마이그레이션:

1. `raw.yml`을 읽음
2. 각 element를 certainty 기준으로 분류:
   - `observed` → `raw-ground-truth.yml`로 이동
   - `rationale-absent` / `inferred` / `ambiguous` / `not-in-source` → `raw-inference.yml`로 이동
3. ID prefix 부여 (`gt-*` 또는 `inf-*` 등)
4. Cross-reference를 inference ID에서 ground truth ID로 정리
5. validation 실행 (§4 참조)
6. 원본 `raw.yml`은 `.deprecated`로 rename, 보존

마이그레이션 도구는 `/onto:transform --migrate-to-two-layer {session_id}` (신규)로 제공.

---

## 4. Cross-Layer Boundary [ARCH-BOUNDARY]

### 4.1 Allowed Reference Patterns

**Inference → Ground Truth (단방향)**:

```yaml
# raw-inference.yml
annotations:
  - from_gt: gt-entity-Payment      # ✓ inference → GT
    to_gt: gt-entity-Order          # ✓ inference → GT

hyperedges:
  - members:
      - gt-cmd-validate              # ✓ inference → GT
      - gt-cmd-charge                # ✓ inference → GT

inferred_elements:
  - rationale_for: gt-cst-001       # ✓ inference → GT
```

**Inference → Inference (intra-layer)**:

```yaml
# raw-inference.yml
annotations:
  - id: ann-002
    rationale: "extends ann-001"    # ✓ intra-inference reference
    based_on: ann-001                # ✓ intra-inference (메타 참조)
```

**Ground Truth → Ground Truth (intra-layer)**:

```yaml
# raw-ground-truth.yml
relations:
  - from: gt-entity-Payment         # ✓ intra-GT
    to: gt-entity-Order              # ✓ intra-GT
```

### 4.2 Forbidden Reference Patterns

**Ground Truth → Inference (역방향)**:

```yaml
# raw-ground-truth.yml
relations:
  - from: gt-entity-Payment
    to: ann-001                     # ❌ FORBIDDEN — GT는 inference 참조 금지

elements:
  - id: gt-entity-Order
    rationale_ref: inf-ratl-001     # ❌ FORBIDDEN
```

이런 reference가 발견되면 build process가 **fail-close**.

### 4.3 Validation Checks (Build-time Enforcement)

build process의 Phase 2 finalization 단계에 **boundary validator**를 추가:

```python
def validate_layer_boundary(gt_yml_path, inference_yml_path):
    gt = load_yaml(gt_yml_path)
    inf = load_yaml(inference_yml_path)
    
    # Check 1: GT 파일의 layer marker
    assert gt['meta']['layer'] == 'ground_truth', \
        f"raw-ground-truth.yml meta.layer must be 'ground_truth', got {gt['meta']['layer']}"
    
    # Check 2: Inference 파일의 layer marker
    assert inf['meta']['layer'] == 'inference', \
        f"raw-inference.yml meta.layer must be 'inference', got {inf['meta']['layer']}"
    
    # Check 3: GT certainty 단일성
    for elem in walk_elements(gt):
        if elem.get('certainty') and elem['certainty'] != 'observed':
            raise BoundaryViolation(
                f"GT element {elem['id']} has certainty '{elem['certainty']}', "
                f"only 'observed' allowed in ground truth layer"
            )
    
    # Check 4: GT가 inference ID 참조 금지
    inference_id_prefixes = ('ann-', 'hyper-', 'inf-', 'amb-', 'nis-', 'pc-', 'iss-', 'insight-')
    for elem in walk_elements(gt):
        for ref in walk_references(elem):
            if any(ref.startswith(p) for p in inference_id_prefixes):
                raise BoundaryViolation(
                    f"GT element {elem['id']} references inference entity {ref} — forbidden"
                )
    
    # Check 5: Inference가 GT ID 참조 시 GT 파일에 실제 존재하는지
    gt_ids = collect_all_ids(gt)
    for elem in walk_elements(inf):
        for ref in walk_references(elem):
            if ref.startswith('gt-'):
                if ref not in gt_ids:
                    raise DanglingReference(
                        f"Inference element {elem['id']} references {ref} which doesn't exist in GT"
                    )
    
    # Check 6: Inference certainty가 non-observed인지
    for elem in walk_elements(inf):
        if elem.get('certainty') == 'observed':
            raise BoundaryViolation(
                f"Inference element {elem['id']} has certainty 'observed' — "
                f"observed entries belong in ground truth layer"
            )
    
    return ValidationResult(passed=True)
```

#### Validation 실행 시점

| 시점 | 동작 | Failure 처리 |
|---|---|---|
| Phase 2 finalization 후 | 자동 실행 | fail-close: build halt, user에게 위반 위치 보고 |
| `/onto:promote-inference` 실행 직전 | 실행 | fail-close: promotion 거부 |
| `/onto:refine` 실행 직전 | 실행 | warning만 (refine은 정리 작업이라 일부 issue는 수용 가능) |
| `/onto:transform` 실행 직전 | 실행 | fail-close: transform 거부 (산출물 오염 방지) |

### 4.4 Detection of Violations

#### 위반 패턴별 진단 메시지

| 위반 종류 | 진단 메시지 | 권장 조치 |
|---|---|---|
| GT에 non-observed certainty | "Element {id} has non-observed certainty in GT layer" | inference layer로 이동 |
| GT가 inference ID 참조 | "GT element {id} references inference {ref}" | reference 제거 또는 inference 항목을 GT로 promote |
| Inference에 observed certainty | "Inference element {id} has observed certainty" | GT layer로 이동 (자동 promote 불가, user 승인 필요) |
| Inference의 dangling GT ref | "Inference element {id} references {ref} which doesn't exist in GT" | GT 파일 확인, 누락된 entity 추가 또는 reference 수정 |
| Layer marker 누락 | "Meta.layer field missing" | meta header 확인 |

---

## 5. Promotion Mechanism [ARCH-PROMOTION]

### 5.1 Trigger Conditions

Inference entry가 promotion candidate가 되는 5가지 trigger:

| Trigger | 정의 | 자동 탐지 가능? |
|---|---|---|
| **Source update** | 소스 파일이 변경되어 inferred 사실이 이제 literal하게 명시됨 | 부분 가능 (file diff) |
| **User domain knowledge** | 사용자가 "이 inference는 실제로 맞다"고 직접 확인 | 불가능 (user input only) |
| **External verification** | 테스트 실행, spec 문서, ADR 등 외부 artifact가 inference를 확증 | 부분 가능 (artifact scan) |
| **Cross-reference corroboration** | Ontology의 다른 부분이 inference를 뒷받침 (다른 build session, 다른 domain) | 가능 (cross-build query) |
| **Review finding** | `/onto:review` 중 lens가 "이 inferred 사실이 observable"이라고 판정 | 가능 (review record output) |

각 trigger마다 evidence 형식이 다름. promotion candidate entry에는 `trigger_type` + `trigger_evidence` 필드 필수.

### 5.2 Panel Composition (mirrors `/onto:promote`)

3-agent panel:

| 역할 | 누가 | 이유 |
|---|---|---|
| **Original lens** | Inference entry를 원래 생성한 lens | 자기 판단의 진화를 평가 |
| **philosopher** (legacy) | 항상 포함 | Synthesis + 모순 검출 |
| **Relevant lens** | 내용에 가장 가까운 다른 lens (auto-selected) | 외부 관점 |

#### Lens 선택 휴리스틱

| Inference 종류 | 권장 relevant lens |
|---|---|
| Semantic similarity (annotation) | semantics |
| Inferred grouping (hyperedge) | structure 또는 dependency |
| Inferred rationale | semantics |
| Insight (god/surprise/question) | 해당 dimension의 lens (god → structure, surprise → dependency, question → pragmatics) |
| Inferred element/relation | logic 또는 semantics |
| Ambiguous element | logic (충돌 해소) |

### 5.3 Review Criteria (5)

각 promotion candidate에 대해 panel이 다음 5개 기준으로 평가:

| # | 기준 | 질문 | Verdict 영향 |
|---|---|---|---|
| 1 | **Source verifiability** | 이 inference가 이제 source에서 직접 관찰 가능한가? | source_update trigger 시 가장 중요 |
| 2 | **Evidence strength** | 승격 증거가 기존 `inferred/ambiguous` confidence보다 충분히 강한가? | confidence threshold |
| 3 | **GT consistency** | 승격 후 기존 ground truth와 contradiction이 발생하지 않는가? | reject if contradicts |
| 4 | **Ambiguity resolution** | 원본이 ambiguous였다면 다른 해석들을 명확히 배제할 수 있는가? | ambiguous → observed 시 필수 |
| 5 | **Non-regression** | 승격 후 layer 분리 원칙이 깨지지 않는가? | dependency direction 검증 |

### 5.4 User Approval Flow

```markdown
## Inference Promotion Review Result — {session_id}

### Domain: {domain}
### Total candidates: {N}

---

### Recommended for Promotion (N items)

| # | id | Inference type | Original certainty | Panel vote | Trigger | Evidence summary |
|---|---|---|---|---|---|---|
| 1 | ann-001 | semantic_similarity | inferred (0.92) | 3/3 promote | source_update | git commit abc123 added @SemanticEquivalent annotation |
| 2 | hyper-002 | protocol_implementation | inferred (0.95) | 3/3 promote | cross_reference | matched in build session 20260408-xyz |
| 3 | inf-rel-001 | relation | inferred (0.70) | 2/3 promote | user_knowledge | user confirmed ownership intent |

### Defer (N items)
| # | id | Reason |
|---|---|---|
| 4 | hyper-001 | Panel uncertain about precise membership boundaries — defer until next refine |

### Reject (N items)
| # | id | Reason |
|---|---|---|
| 5 | ann-005 | Contradicts existing GT relation gt-rel-014 |

---

Please specify which items to promote.
- "promote all" → 권장 항목 모두 승격
- "promote 1,3" → 선택 항목만
- "promote all + reject 5 confirmation" → 권장 + reject 확인
```

User approval tier: **정보 변경** (일괄 승인/거절 가능, 개별 승인도 지원).

### 5.5 Execution Steps

User approval 후 다음 절차로 promotion 실행:

#### Step 1: Generate new ground truth ID

inference entry의 type에 따라 GT ID prefix 결정:

| Inference type | GT ID prefix |
|---|---|
| `semantic_similarity` (annotation) | `gt-rel-{NNN}` (relation) |
| `inferred_grouping` (hyperedge) | `gt-flow-{NNN}` 또는 `gt-group-{NNN}` (workflow 또는 grouping) |
| `inferred_element` (entity/relation) | `gt-entity-{Name}` 또는 `gt-rel-{NNN}` |
| `inferred_rationale` | `gt-ratl-{NNN}` |

#### Step 2: Construct GT entry

```python
def promote_to_ground_truth(inference_entry, evidence):
    gt_id = generate_gt_id(inference_entry.type)
    gt_entry = {
        'id': gt_id,
        'type': map_inference_to_gt_type(inference_entry.type),
        'name': inference_entry.get('name', derive_name(inference_entry)),
        'certainty': 'observed',
        'source': merge_source_locations(inference_entry, evidence),
        'promoted_from_inference': {
            'inference_id': inference_entry['id'],
            'promotion_date': today(),
            'trigger_type': evidence['trigger_type'],
            'evidence': evidence['trigger_evidence'],
            'panel_consensus': evidence['panel_vote'],
            'user_approved': True,
        }
    }
    return gt_id, gt_entry
```

#### Step 3: Append to `raw-ground-truth.yml`

새 GT entry를 적절한 섹션(`elements`, `relations`, `behaviors` 등)에 append.

#### Step 4: Mark inference entry

원본 inference entry는 **삭제하지 않고** marker만 부착:

```yaml
# raw-inference.yml (원본 entry 그대로 유지)
annotations:
  - id: ann-001
    type: semantic_similarity
    from_gt: gt-entity-Payment
    to_gt: gt-entity-LegacyPayment
    confidence: 0.92
    certainty: inferred
    rationale: "..."
    # 🆕 marker 추가
    promoted_to_ground_truth:
      ground_truth_ref: gt-rel-002
      promotion_date: 2026-04-10
      trigger_type: source_update
      evidence: "git commit abc123"
      panel_consensus: 3/3
      user_approved: true
```

#### Step 5: Cross-validate

§4 boundary validation을 다시 실행하여 promotion이 새 violation을 만들지 않았는지 확인.

#### Step 6: Update build session metadata

```yaml
# build-session-metadata.yml
promotions:
  - date: 2026-04-10
    count: 3
    promoted_ids: [pc-001, pc-002, pc-003]
    panel_session: promote-inference-20260410-xyz
```

### 5.6 Audit Trail Format

#### Bidirectional markers

**In `raw-inference.yml`** (origin):
```yaml
- id: ann-001
  promoted_to_ground_truth:
    ground_truth_ref: gt-rel-002
    promotion_date: 2026-04-10
    trigger_type: source_update
    evidence: "..."
    panel_consensus: 3/3
    user_approved: true
```

**In `raw-ground-truth.yml`** (destination):
```yaml
- id: gt-rel-002
  ...
  promoted_from_inference:
    inference_id: ann-001
    promotion_date: 2026-04-10
    trigger_type: source_update
    evidence: "..."
    panel_consensus: 3/3
    user_approved: true
```

두 marker는 **bidirectional reference**로, audit trail의 무결성을 보장.

#### Audit query 예시

- "이 GT entry는 inference에서 왔는가?" → `gt-rel-002.promoted_from_inference` 확인
- "이 inference entry는 promote되었는가?" → `ann-001.promoted_to_ground_truth` 확인
- "지난 30일간 어떤 inference가 GT로 승격되었는가?" → 모든 `promoted_from_inference.promotion_date` 필터

### 5.7 `/onto:promote-inference` Command Specification

#### Command syntax

```
/onto:promote-inference [{session_id} | --all-sessions] [{candidate_id} ...]
```

#### Arguments

| 인수 | 의미 |
|---|---|
| `{session_id}` | 특정 build session의 promotion candidates 처리 |
| `--all-sessions` | 모든 build session의 pending candidates 처리 |
| `{candidate_id} ...` | 특정 candidate IDs만 처리 (e.g., `pc-001 pc-003`) |

#### Process file

`processes/promote-inference.md` (신규).

#### Process flow

```
Step 1: Target Collection
  - Scan promotion_candidates from specified session(s)
  - Filter by candidate_id if provided
  - Group by inference_type (annotation/hyperedge/insight/etc.)

Step 2: Pre-Analysis
  - For each candidate, validate inference entry still exists
  - Check trigger evidence freshness
  - Detect already-promoted candidates (skip)

Step 3: Panel Review (3-agent panel via Agent Teams or Codex subagent)
  - Per inference_type, select panel: original lens + philosopher + relevant lens
  - Each agent reviews all candidates with 5 criteria
  - Outputs: promote/defer/reject + reasoning per candidate

Step 4: Consensus Aggregation
  - 3/3 promote → automatic candidate
  - 2/3 promote → candidate with minority opinion
  - 2+/3 defer → defer
  - 2+/3 reject → reject

Step 5: User Approval
  - Present table per §5.4
  - User selects items to promote

Step 6: Execution
  - For each approved item: §5.5 Steps 1-6
  - Cross-validate boundary

Step 7: Cleanup
  - Inference entries marked, not deleted
  - GT entries appended
  - Build session metadata updated

Step 8: Completion Report
  - Promoted count
  - Deferred count
  - Rejected count
  - Boundary violations (should be 0)
  - Updated GT/inference file paths
```

#### Differences from `/onto:promote`

| 측면 | `/onto:promote` (learning) | `/onto:promote-inference` (build) |
|---|---|---|
| Source | `{project}/.onto/learnings/{agent}.md` | `{project}/.onto/builds/{session}/raw-inference.yml` |
| Target | `~/.onto/learnings/{agent}.md` | `{project}/.onto/builds/{session}/raw-ground-truth.yml` |
| Subject | Methodology learnings | Domain facts |
| Panel composition | original agent + philosopher + relevant | original lens + philosopher + relevant |
| Review criteria | Generalizability, accuracy, axis tags, dedup | Source verifiability, evidence strength, GT consistency, ambiguity resolution, non-regression |
| Audit format | `(-> promoted to global, date)` inline marker | bidirectional `promoted_to_ground_truth` + `promoted_from_inference` markers |
| User approval tier | 정보 추가 (자동 + 사후 보고) | 정보 변경 (일괄 승인/거절) |

### 5.8 Relationship to `/onto:refine`

`/onto:refine`은 inference layer **내부**의 정리 작업.
`/onto:promote-inference`는 inference → ground truth **간** 이동 작업.

| 프로세스 | 대상 layer | 동작 | 빈도 |
|---|---|---|---|
| `/onto:refine` | Inference layer 내부 | 중복 통합, 낮은 confidence pruning, stale 감지 | 주기적 또는 build 후 |
| `/onto:promote-inference` | Inference → Ground Truth | 검증된 inference의 GT 승격 | 트리거 발생 시 |

#### 권장 실행 순서

```
build session completion
  ↓
raw-ground-truth.yml + raw-inference.yml 생성
  ↓ (선택 1)
/onto:refine {session} → inference layer 내부 정리 (중복 제거, 낮은 confidence pruning)
  ↓ (선택 2, 선택 1 후 권장)
/onto:promote-inference {session} → 검증 완료된 inference → GT 승격
  ↓
final raw-ground-truth.yml + raw-inference.yml (cleaner state)
```

`/onto:refine`이 먼저 inference layer를 청소하면 `/onto:promote-inference`의 panel review 부담이 줄어듭니다 (정리된 candidate만 평가).

---

## 6. Layer-Aware Cache [ARCH-CACHE-L]

### 6.1 Motivation

graphify의 cache 메커니즘은 file-level SHA256 하나로 단순합니다. 그러나 onto의 Two-Layer 구조에서는 **각 layer의 invalidation 조건이 다릅니다**:

- **Ground truth**: 소스 파일이 변경되어야만 invalidate. 소스가 그대로면 ground truth는 영원히 유효.
- **Inference**: 소스 파일 + LLM 모델/프롬프트/스키마 등이 변경되면 invalidate. 동일 소스라도 새 모델이나 새 프롬프트로 다시 추론하면 결과가 다를 수 있음.

이 차이를 무시하고 단일 cache를 쓰면:
- 모델 변경 시 ground truth까지 무의미하게 재추출 (낭비)
- 또는 모델 변경 후에도 stale inference 사용 (오류)

### 6.2 Ground Truth Cache Key

```python
def ground_truth_cache_key(file_path):
    return sha256(
        file_contents(file_path) +
        b"\x00" +
        extractor_version() +     # tree-sitter / grammar version
        b"\x00" +
        schema_version() +        # ontology schema version
        b"\x00" +
        profile_version()         # explorer profile version
    ).hexdigest()
```

#### Invalidation 조건

| 조건 | invalidate? |
|---|---|
| 파일 내용 변경 | ✓ |
| Extractor (tree-sitter) 버전 변경 | ✓ |
| Schema 버전 변경 | ✓ |
| Explorer profile 버전 변경 | ✓ |
| LLM 모델 변경 | ✗ (LLM 무관, 결정론적 추출) |
| 프롬프트 변경 | ✗ |

#### Cache directory

```
{project}/.onto/builds/{session}/cache/ground-truth/
├── {hash1}.yml      # ground truth facts for file 1
├── {hash2}.yml      # ground truth facts for file 2
└── ...
```

### 6.3 Inference Cache Key

```python
def inference_cache_key(file_path):
    return sha256(
        file_contents(file_path) +
        b"\x00" +
        extractor_version() +
        b"\x00" +
        schema_version() +
        b"\x00" +
        profile_version() +
        b"\x00" +
        model_version() +        # 🆕 LLM model identifier (e.g., "claude-sonnet-4-20250514")
        b"\x00" +
        prompt_version()         # 🆕 prompt template hash
    ).hexdigest()
```

#### Invalidation 조건

| 조건 | invalidate? |
|---|---|
| 파일 내용 변경 | ✓ |
| Extractor 버전 변경 | ✓ |
| Schema 버전 변경 | ✓ |
| Explorer profile 버전 변경 | ✓ |
| LLM 모델 변경 | **✓** 🆕 |
| 프롬프트 변경 | **✓** 🆕 |

#### Cache directory

```
{project}/.onto/builds/{session}/cache/inference/
├── {hash1}.yml      # inference facts for file 1
├── {hash2}.yml      # inference facts for file 2
└── ...
```

### 6.4 Independent Invalidation Examples

| 시나리오 | GT cache | Inference cache | 효과 |
|---|---|---|---|
| 파일 1 수정 | invalidate (file 1만) | invalidate (file 1만) | file 1 재추출, 다른 파일 유효 |
| Schema v3 → v4 업그레이드 | 전체 invalidate | 전체 invalidate | 양쪽 다 재구축 |
| LLM 모델 sonnet → opus 변경 | **유효** | 전체 invalidate | inference만 재실행, GT는 유지 |
| 프롬프트 템플릿 수정 | **유효** | 전체 invalidate | 동일 |
| Tree-sitter parser 업그레이드 | 전체 invalidate | 전체 invalidate | 양쪽 다 재구축 |
| Explorer profile 수정 (e.g., scan target 추가) | invalidate (해당 profile만) | invalidate (해당 profile만) | profile에 영향받는 파일만 |

LLM 모델/프롬프트만 바뀌는 시나리오에서 **GT cache가 유효하게 유지되어 토큰 비용 절감**.

### 6.5 Diff Wiring (Layer-Aware)

`/onto:build --update` 또는 `/onto:transform --diff` 실행 시:

```python
def layer_aware_diff(old_session, new_session):
    # Ground truth diff
    old_gt = load_yaml(old_session / 'raw-ground-truth.yml')
    new_gt = load_yaml(new_session / 'raw-ground-truth.yml')
    gt_diff = compute_diff(old_gt, new_gt)
    
    # Inference diff (별도)
    old_inf = load_yaml(old_session / 'raw-inference.yml')
    new_inf = load_yaml(new_session / 'raw-inference.yml')
    inf_diff = compute_diff(old_inf, new_inf)
    
    return {
        'ground_truth': {
            'added': gt_diff.added,
            'removed': gt_diff.removed,
            'changed': gt_diff.changed,
            'reason_categories': ['source_change', 'extractor_upgrade', 'schema_change'],
        },
        'inference': {
            'added': inf_diff.added,
            'removed': inf_diff.removed,
            'changed': inf_diff.changed,
            'reason_categories': ['source_change', 'model_change', 'prompt_change', 'reinterpretation'],
        },
        'promotions': detect_promotions(old_session, new_session),  # inference → GT 이동
    }
```

#### 핵심: graphify의 CR1/CR2 결함 회피

graphify의 `--update`는 deletion-safety가 부재 (CR1) + diff wiring bug (CR2) 가 있음. onto는 이를 회피:

- **CR1 회피**: 각 layer에서 deleted_files 처리. 변경/삭제된 source 파일의 prior contribution을 layer별로 명시적으로 제거 후 merge
- **CR2 회피**: diff는 항상 `old_full_layer` vs `new_full_layer` 비교 (delta-only 비교 금지)

자세한 precondition은 §6.5의 P3을 v6에서 계승.

#### Diff 출력 예시

```markdown
## Build Diff — session 20260410-aaa vs 20260411-bbb

### Ground Truth Layer Changes (3 added, 1 removed, 2 changed)
- ➕ gt-entity-Refund (new entity from src/payment/Refund.java)
- ➕ gt-cmd-processRefund
- ➕ gt-rel-005 (Refund belongs_to Payment)
- ➖ gt-cmd-oldApprove (removed, src/legacy/Approve.java deleted)
- 🔄 gt-entity-Payment (added field: refundedAmount)
- 🔄 gt-st-001 (transition added: APPROVED → REFUNDED)

### Inference Layer Changes (5 added, 2 removed, 1 promoted)
- ➕ ann-007 (Refund ↔ Payment semantic similarity)
- ➕ hyper-003 (refund flow members)
- ➕ insight-q-005 (Refund 정책의 명확한 사양?)
- ➖ ann-002 (PROMOTED to gt-rel-005)
- ➖ inf-rel-003 (refuted by new GT, gt-rel-005)
- 🔄 hyper-001 (members updated based on new commands)

### Promotions (1 inference → GT this update)
- ann-002 → gt-rel-005 (trigger: source_update, evidence: explicit @SemanticEquivalent in commit abc123)
```

---

## 7. Layer-Aware MCP Interface [ARCH-MCP-L]

### 7.1 Tool Categorization Principle

MCP 인터페이스의 모든 도구는 **명시적으로 layer를 표시**합니다. 이는 consumer가 어떤 layer를 쿼리하는지 항상 알 수 있게 하기 위함입니다.

도구 이름 prefix:
- `gt_*` — Ground Truth layer 전용
- `inf_*` — Inference layer 전용
- `combined_*` — 두 layer 모두 접근 (drill-down 지원)

### 7.2 Ground Truth Tools

executable consumer를 위한 도구. **Ground truth layer만 접근**.

| Tool name | 설명 | 입력 | 출력 |
|---|---|---|---|
| `gt_get_element` | 특정 entity 1개 조회 | id (gt-*) | element JSON |
| `gt_list_entities` | 모든 entity 조회 | [filter] | entity list |
| `gt_list_relations` | 모든 relation 조회 | [from, to, type] | relation list |
| `gt_list_behaviors` | state_transition / command / query 조회 | [type, entity] | behavior list |
| `gt_list_constraints` | constraint 조회 | [applies_to] | constraint list |
| `gt_get_observed_rationale` | observed rationale 조회 (BT-E5a) | rationale_for | rationale list |
| `gt_get_literal_workflow` | literal workflow (saga 등) 조회 | name | workflow JSON |
| `gt_shortest_path` | entity 간 최단 경로 (GT 내부 directed graph) | from, to | path list |
| `gt_neighbors` | entity의 N홉 이웃 (directed) | entity, depth | entity list |
| `gt_validate_consistency` | GT 내부 consistency 검증 | — | violation list (empty if OK) |
| `gt_export_for_codegen` | code generator 친화적 형태로 export | — | structured JSON |

#### Property: Determinism

모든 `gt_*` 도구는 **결정론적**입니다. 동일 GT 파일에 동일 쿼리를 두 번 실행하면 항상 동일 결과.

### 7.3 Inference Tools

evolution consumer를 위한 도구. **Inference layer 접근** (필요시 GT ID로 cross-reference).

| Tool name | 설명 | 입력 | 출력 |
|---|---|---|---|
| `inf_list_annotations` | semantic similarity edges 조회 | [from_gt, to_gt, min_confidence] | annotation list |
| `inf_list_hyperedges` | hyperedge 조회 | [pattern, contains_member] | hyperedge list |
| `inf_get_god_nodes` | god nodes 조회 | [top_n] | god node list |
| `inf_get_surprising_connections` | surprising connections 조회 | [top_n, min_score] | surprise list |
| `inf_get_suggested_questions` | suggested questions 조회 | [origin] | question list |
| `inf_list_inferred_elements` | inferred entity/relation 조회 | [type, certainty] | element list |
| `inf_list_ambiguous_elements` | ambiguous element 조회 | [type] | ambiguous list with options |
| `inf_get_inferred_rationale` | inferred rationale 조회 (BT-E5b) | rationale_for | rationale hypothesis list |
| `inf_get_promotion_candidates` | promotion candidate 조회 | [trigger_type, status] | candidate list |
| `inf_semantic_neighbors` | semantic 이웃 조회 (annotation 기반 grouping) | gt_id, depth | similar entity list |
| `inf_traverse_hyperedge` | hyperedge 멤버 traversal | hyperedge_id | member list with GT references |

#### Property: Non-determinism awareness

`inf_*` 도구의 결과는 **시간에 따라 변할 수 있습니다** (refine, promote-inference, 새 build 결과). consumer는 inference 결과를 cache할 때 timestamp를 함께 저장해야 합니다.

### 7.4 Combined Tools (cross-layer)

drill-down 또는 layered view를 지원하는 도구. **양쪽 layer 모두 접근 가능**.

| Tool name | 설명 | 입력 | 출력 |
|---|---|---|---|
| `combined_get_entity_full` | entity의 GT 정보 + inference 정보 통합 조회 | gt-entity-id | `{ground_truth: {...}, inference: {annotations: [...], inferred_attributes: [...]}}` |
| `combined_explain_relation` | relation의 GT/inference 양쪽 근거 | from, to | `{gt_relation: ..., inferred_relations: [...], annotations: [...]}` |
| `combined_get_promotion_history` | 특정 GT entry의 promotion 이력 | gt_id | promotion trace list |
| `combined_layer_diff` | 두 build session의 layer-aware diff | session_a, session_b | layered diff (GT diff + inference diff + promotions) |

### 7.5 Tool Naming Convention

#### 명명 규칙

```
{layer_prefix}_{action}_{target}
  layer_prefix: gt | inf | combined
  action: get | list | search | traverse | validate | export
  target: element/relation/behavior/etc.
```

#### 명명 예시

| 잘못된 이름 | 올바른 이름 | 이유 |
|---|---|---|
| `get_entity` | `gt_get_entity` | layer 명시 누락 |
| `get_inferred` | `inf_list_inferred_elements` | action + target 분리 명확 |
| `query_graph` | `gt_shortest_path` 또는 `inf_semantic_neighbors` | 모호 — graph 종류 명시 |
| `explain` | `combined_explain_relation` | layer 명시 |

### 7.6 Consumer Access Patterns

#### Executable consumer (예: code generator)

```python
import onto_mcp_client

client = onto_mcp_client.connect("onto-build-session-20260410")

# Code generator는 gt_* 도구만 사용
entities = client.gt_list_entities(type="entity")
for e in entities:
    generate_class(e['name'], e['details']['properties'])

# inference 도구를 사용하지 않음 — 추측에 기반한 코드 생성 방지
```

#### Evolution consumer (예: review lens)

```python
client = onto_mcp_client.connect("onto-build-session-20260410")

# Review lens는 양쪽 layer 모두 접근
gt_entities = client.gt_list_entities()
inf_annotations = client.inf_list_annotations(min_confidence=0.7)
ambiguous = client.inf_list_ambiguous_elements()

for entity in gt_entities:
    related_inf = client.combined_get_entity_full(entity['id'])
    if related_inf['inference']['inferred_attributes']:
        # 검증 수행
        ...
```

#### Exploration consumer (예: developer Q&A)

```python
# 사용자가 "Payment에 대해 알려줘"라고 질의
result = client.combined_get_entity_full("gt-entity-Payment")
print(format_for_user(result))
# 사용자에게 GT 정보 + inference 정보를 시각적으로 분리하여 제시
```

### 7.7 Access Control (선택)

향후 확장: consumer credential에 따라 layer 접근 제한.

| Consumer role | GT tools | Inference tools | Combined tools |
|---|---|---|---|
| `code_gen` | ✓ | ✗ | ✗ |
| `validator` | ✓ | ✗ | ✗ |
| `review_lens` | ✓ | ✓ | ✓ |
| `refine_process` | ✗ | ✓ (write) | ✗ |
| `promote_inference_process` | ✓ (write to GT) | ✓ (mark inference) | ✓ |
| `explorer_ui` | ✓ | ✓ | ✓ |

이 access control은 v8 또는 productization 단계에서 도입 검토. 현재는 모든 tool을 모든 consumer에게 노출.

---

## 8. Consumer Types and Layer Access

### 8.1 Executable Consumer (Ground Truth Only)

**정의**: ontology 정보를 받아 결정론적 산출물(코드, 검증 보고서, 변환 결과)을 생성하는 consumer.

**예시**:
- Code generator (entity → Java class, command → REST endpoint)
- Schema validator (실제 DB schema vs ontology DB section)
- API contract generator
- Migration script generator
- Test fixture generator

**Layer access**: **Ground truth only**

**원칙**:
- inference layer 접근 금지 (validator로 enforcement)
- 모든 입력은 `observed` certainty
- 결과의 결정론성 보장

**MCP tools**: `gt_*` only

### 8.2 Evolution Consumer (Both Layers)

**정의**: ontology의 변화/진화를 추적하고 평가하는 consumer.

**예시**:
- Review lens (구조/의미/논리 검증)
- `/onto:refine` 프로세스 (annotation curation)
- `/onto:promote-inference` 프로세스 (promotion 판정)
- Diff visualizer
- Trend dashboard

**Layer access**: **Both layers**

**원칙**:
- inference layer는 dynamic — 결과가 시간에 따라 변할 수 있음
- promotion 결정 시 GT consistency 필수 검증
- 모순 발견 시 user에게 보고 (자동 수정 금지)

**MCP tools**: `gt_*`, `inf_*`, `combined_*` 모두

### 8.3 User-Facing Surface (Layer-Separated Display)

**정의**: 사용자에게 ontology 정보를 제시하는 인터페이스.

**예시**:
- Phase 3 user confirmation report (build process 출력)
- `/onto:transform --html` 결과 (HTML interactive viz)
- `/onto:transform --wiki` 결과
- Onto IDE plugin UI

**Layer access**: **Both layers, but visually separated**

**원칙**:
- GT 정보와 inference 정보가 같은 화면에 나오더라도 시각적으로 분리되어야 함 (다른 색상, 다른 섹션, 다른 아이콘)
- "이건 사실이고 이건 추측입니다"가 사용자에게 명확해야 함
- inference 정보 옆에 confidence score 표시
- promotion candidate는 별도 highlight

#### 시각적 분리 예시 (Phase 3 report)

```markdown
## Ontology Build Result Summary

### ✅ Verified Facts (Ground Truth Layer)

| # | Type | Name | Source |
|---|---|---|---|
| 1 | entity | Payment | src/payment/Payment.java:15 |
| 2 | command | approvePayment | src/payment/PaymentService.java:78 |

### 🔮 Inferences (Inference Layer)

> 다음은 LLM이 도메인 지식을 활용해 추론한 내용입니다.
> 정확하지 않을 수 있으며, 검증 후 ground truth로 승격할 수 있습니다.

| # | Type | Description | Confidence | Promotion candidate |
|---|---|---|---|---|
| 1 | semantic_similarity | Payment ≈ LegacyPayment | 0.92 | ⭐ Yes |
| 2 | inferred_grouping | auth flow members (4 commands) | 0.88 | ⭐ Yes |

### Promotion Decisions Required

이 inference 항목들을 ground truth로 승격하시겠습니까?
[1] Payment ≈ LegacyPayment — git commit abc123이 explicit annotation 추가
[2] auth flow members — cross-build verification 통과
```

### 8.4 Layer Access Matrix

| Consumer category | GT read | GT write | Inference read | Inference write | Combined |
|---|---|---|---|---|---|
| Code generator | ✓ | ✗ | ✗ | ✗ | ✗ |
| Validator | ✓ | ✗ | ✗ | ✗ | ✗ |
| Review lens | ✓ | ✗ | ✓ | ✗ | ✓ |
| `/onto:refine` | ✗ | ✗ | ✓ | ✓ | ✗ |
| `/onto:promote-inference` | ✓ | **✓** (gated) | ✓ | ✓ (marker only) | ✓ |
| `/onto:build` (Phase 1) | ✗ | ✓ | ✗ | ✓ | ✗ |
| `/onto:build` (Phase 2) | ✓ | ✓ | ✓ | ✓ | ✓ |
| User UI | ✓ | ✗ | ✓ | ✗ | ✓ |
| Migration tool | ✓ | ✓ (one-time) | ✓ | ✓ (one-time) | ✗ |

**Write access는 매우 제한적**:
- `/onto:build` (Phase 1) — initial creation 시
- `/onto:promote-inference` — gated, audit trailed
- `/onto:refine` — inference layer 내부 정리만
- 다른 모든 consumer는 read-only

---

# Part II — graphify Adoption Evaluation (v6 Consolidated)

> v6의 graphify 차용 평가를 Two-Layer Architecture에 맞춰 재분류한 섹션. 대부분 내용은 v6에서 그대로 계승하되, §13 Adoption Evaluation Matrix는 layer 분류를 추가하여 재구성.

## 9. Fundamental Contrast (v6 §2 updated for Two-Layer)

| 축 | graphify | onto build (with Two-Layer) |
|---|---|---|
| **목적** | 폴더 안의 파일을 navigable knowledge graph로 변환 — **발견/탐색** 지향 | (1) 소스의 도메인 지식을 ontology로 **정밀 재현** (Ground Truth Layer) + (2) domain 지식 기반 **의미 추론** (Inference Layer)로 **함께 진화** |
| **파이프라인** | 1-shot linear: `detect → extract → build → cluster → analyze → report → export` | 반복 루프: Explorer ↔ verification agents ↔ Philosopher, **coverage + fact convergence**로 종료. 두 layer를 **동시에** 생성. |
| **출력** | NetworkX 그래프 + community + HTML/JSON/Wiki | `raw-ground-truth.yml` + `raw-inference.yml` (분리된 두 파일) |
| **추론과 사실의 분리** | 단일 그래프에 confidence score로만 구분 (mix됨) | **구조적 분리** — 별도 파일 + 단방향 promotion gate |

### 9.1 평탄화 금지 항목 (1차·2차·3차·v7 통합)

graphify 패턴 차용 시 다음을 후퇴시키면 안 됩니다:

- **5-level final certainty** + **Stage 1 intermediate `pending`**
- **`abduction_quality`** (Phase 3 정렬 SSOT)
- **Integral exploration loop** (Explorer + verification agents + Philosopher 수렴)
- **Single artifact truth** — Two-Layer Architecture로 진화: ground truth와 inference 각각이 single truth (각 layer 내부에서)
- 🆕 **Two-Layer Architecture (Part I)** — Never Mix 원칙
- 🆕 **Living ontology** — inference layer는 끊임없이 리팩토링·재평가
- 🆕 **Statics → Kinetics → Dynamics 추론 사슬** — 단순 재현이 아닌 의미 추론. semantic judgment 단계 평탄화 금지
- 🆕 **Semantic grouping primitive** — hyperedge (generic N-ary, dual-mode) + annotation (semantic similarity). 둘 다 raw-inference.yml의 1급 시민
- 🆕 **Gated forward promotion** — inference → ground truth는 panel review + user approval 없이 자동 이동 금지

## 10. Selected graphify Mechanisms (v6 §3 preserved with layer tags)

**중요**: 이것은 graphify의 exhaustive inventory가 아닙니다. onto adoption 관점에서 선별한 메커니즘 목록.

각 mechanism에 **Two-Layer 분류 태그** 추가:
- `[GT]` — Ground Truth layer 후보
- `[INF]` — Inference layer 후보
- `[BOTH]` — 두 layer 모두 (구현 시 split)
- `[META]` — Layer 외부 (cache, MCP 등 인프라)

### 10.1 Extraction

| ID | 항목 | Layer | 상태 | Evidence rows |
|---|---|---|---|---|
| **E1** | 2-pass extraction (AST + semantic) | **GT** (Part A) + **INF** (Part B) | Confirmed with correction | E1-a, E1-b, E1-c, E1-d |
| **E2** | Tree-sitter `LanguageConfig` 기반 다언어 AST | **GT** | Confirmed | E2-a, E2-b |
| **E3** | Confidence 3-tier + numeric score | **INF** | Partial — score는 export-time backfill property | E3-a, E3-b, E3-c, E3-d |
| **E4** | Semantic similarity edges | **INF** | Confirmed | E4-a |
| **E5** | Rationale extraction | **BOTH** — observed (GT) + inferred (INF) split 필요 | Partial | E5-a, E5-b |
| **E6** | Hyperedges (3+ node 그룹 관계) | **BOTH** — literal workflow (GT) + inferred grouping (INF) split 필요 | Confirmed with seat caveat | E6-a, E6-b, E6-c |

### 10.2 Analysis

| ID | 항목 | Layer | 상태 |
|---|---|---|---|
| **A1** | Leiden community + Louvain fallback | **INF** | Confirmed |
| **A1c** | Cohesion score | **INF** | Confirmed |
| **A2** | God nodes (file-hub / concept node 필터링) | **INF** | Confirmed |
| **A3** | Surprising connections (합성 surprise score) | **INF** | Confirmed |
| **A4** | Suggested questions | **INF** | Confirmed |
| **A5** | Graph diff (function only) | **META** (cache infrastructure) | Confirmed |
| **A5w** | Graph diff `--update` wiring | **META** — Bug, see §15 CR2 | A5w-a |

### 10.3 Maintenance

| ID | 항목 | Layer | 상태 |
|---|---|---|---|
| **M1** | SHA256 per-file content cache | **META** (layer-aware split 필요) | Confirmed |
| **M2-detect** | `detect_incremental()` deleted file 식별 | **META** | Confirmed |
| **M2-update** | `--update` merge 동작 | **META** — Bug, see §15 CR1 | M2-c |
| **M3** | Watch mode | **META** | Confirmed |
| **M4** | Git hooks | **META** — Reject (see §13.3) | Confirmed |
| **M5** | Token reduction benchmark | **META** | Confirmed |
| **M6** | Cost tracking | **META** | Confirmed |

### 10.4 Consumption Surfaces

| ID | 항목 | Layer | 상태 |
|---|---|---|---|
| **Q1** | MCP stdio server | **META** (layer-aware tool categorization 필요, §7) | Confirmed |
| **Q2** | Interactive HTML 시각화 | **META** (visual surface, layer-separated display) | Confirmed |
| **Q3** | Wiki output | **META** | Confirmed with wiring caveat |
| **Q4-query/path/explain** | BFS/DFS query, shortest path, explain | **META** (gt_* + inf_* + combined_* tools) | Confirmed |
| **Q5** | Q&A 결과 저장 + gating | **META** (deferred: see §13.3) | Confirmed |

### 10.5 Ingress

| ID | 항목 | Layer | 비고 |
|---|---|---|---|
| **I1** | 다국어·다형식 file-type 분류 | **META** | Confirmed |
| **I2** | `.graphifyignore` 패턴 매칭 | **META** | Confirmed |
| **I3** | Office 변환 (.docx, .xlsx) | **META** | Confirmed |
| **I4** | URL fetch + author/contributor metadata | **META** | Confirmed |

### 10.6 Constraints

| ID | 항목 | Layer | Status |
|---|---|---|---|
| **X1** | Core graph가 **undirected** (`nx.Graph`) | **META** — Constraint, see §15 CR3 | X1-a, X1-b, X1-c |
| **X2** | AST-vs-semantic merge precedence (Part C dedup) | **META** | Confirmed |
| **X3** | Changed/deleted file invalidation 부재 | **META** — graphify 자체 미해결 | X3-a |
| **X4-validate** | Extraction schema validation | **META** | Confirmed |
| **X4-security** | URL + path + label sanitization guards | **META** | Confirmed |

### 10.7 SYN-C7 Re-seated: 이미지/PDF 추출은 Mixed-Seat

3차 review UF-LOGIC-SYN-C7-SEAT 권고에 따라 single row를 mixed-seat 구조로 분해.

| ID | 구성 요소 | Layer | 상태 |
|---|---|---|---|
| **MM-detect** | Detect-side file-type 분류 | **META** (ingress) | Confirmed |
| **MM-ingest** | Ingest-side metadata + binary 보관 | **META** (ingress) | Confirmed |
| **MM-skill** | Skill-level semantic/vision contract | **INF** (LLM judgment) | Confirmed (prompt-backed) |
| **MM-pdf-vision** | PDF figure-vision 세부 동작 | — | Insufficient evidence within boundary (§17 OQ-1) |

## 11. onto build Current Capabilities (v6 §4 preserved)

v6에서 정정한 onto-side 사실들 (1차 review C5/C6/C8 결과):

| 항목 | v1 오기 | 정확한 상태 |
|---|---|---|
| **Certainty 단계 수** | "4단계 discrete" | **5 final levels** + **Stage 1 intermediate `pending`**. SSOT: `processes/build.md:40-58` |
| **Explorer 도구** | "LLM 단일 패스로 모든 구조 인식" | 이미 **`Glob/Grep/Read` 결정론 도구** 사용 (`explorers/code.md:3`). 결손은 **"parser-backed AST prepass 부재"** |
| **Rationale 처리** | "rationale 추출 없음" | 이미 있는 것: `lens: rationale`, `label: rationale`, `rationale-absent` certainty. 결손: **standalone canonical `fact_type: rationale` artifact seat 부재** |
| **Hyperedge** | "saga/domain_flow이 동일 역할" | `domain_flows`(Schema B)와 `sagas`(Schema D)는 `steps`/`involved_*`를 가진 **workflow aggregate**. **generic N-ary primitive 아님** |
| **Abduction quality vs numeric score** | v1은 numeric score 도입 주장 | `abduction_quality.{explanatory_power, coherence}`가 이미 Phase 3 정렬 SSOT. consumer contract 없는 별도 scalar는 produced-but-not-consumed |
| **Linear pipeline 금지** | (v1 경고 옳음, 유지) | onto의 integral exploration + convergence는 정밀 재현 보장의 핵심 |

## 12. Gap Analysis (v6 §5 with layer tags)

`closest onto analog` 칼럼은 1차 U4 권고 반영 (`none` / `partial` / `different layer`). **target_layer** 칼럼 추가 (Two-Layer 분류).

| ID | graphify mechanism | target_layer | closest onto analog | 현재 onto seat | 실제 gap |
|---|---|---|---|---|---|
| E1 | 2-pass (AST + semantic) | **GT (Part A) + INF (Part B)** | partial | Glob/Grep/Read | parser-backed AST prepass 부재 |
| E2 | Tree-sitter LanguageConfig | **GT** | none | — | 19개 언어 결정론 extractor 부재 |
| E3 | Confidence + score | **INF** | different layer | abduction_quality | onto는 action-routing taxonomy, graphify는 ranking signal |
| E4 | Semantic similarity edges | **INF** | none | — | 구조적 연결 없는 개념 유사 edge 부재 |
| E5a | Observed rationale extraction | **GT** | partial | rationale 부재 표현은 있음 | observed rationale 1급 seat 부재 |
| E5b | Inferred rationale interpretation | **INF** | none | — | LLM 추론 rationale seat 부재 |
| E6-literal | Literal workflow hyperedge | **GT** | partial | sagas/domain_flows | generic N-ary primitive 부재 (workflow specific만 있음) |
| E6-inferred | Inferred grouping hyperedge | **INF** | none | — | 일반 grouping 표현 수단 부재 |
| A1 | Leiden community + cohesion | **INF** | none | — | 토폴로지 기반 자동 군집화 없음 |
| A2-A4 | God / surprise / question | **INF** | none | Phase 3는 element 리스트 + 결정 항목 | 구조적 통찰 자동 분석 surface 없음 |
| A5 | Graph diff | **META** | none | — | 재빌드 결과 비교 없음 (graphify wiring bug는 §15 CR2) |
| M1 | Per-file content cache | **META** | none | 매 빌드 풀 재생성 | fact reuse 메커니즘 없음 |
| M2 | `--update` incremental | **META** | none | — | (graphify 자체 deletion-safety 결함은 §15 CR1) |
| M3 | Watch mode | **META** | different layer | review에 watcher 존재 | build용 watcher 없음 |
| M4 | Git hooks (build-trigger) | **META** | none | — | (§13.4 reject) |
| M5 | Token reduction benchmark | **META** | none | — | 빌드 가치 정량화 메트릭 없음 |
| M6 | Cost tracking | **META** | none | — | 토큰 비용 누적 기록 없음 |
| Q1 | MCP server | **META** (layer-aware) | different layer | runtime principles에 MCP 개념 존재 | layer-aware tool categorization 부재 |
| Q2 | Interactive HTML | **META** | none | raw.yml만 | transform 단계 후속 |
| Q3 | Wiki output | **META** | different layer | 도메인 문서 생성 경로 존재 | community-별 article + index.md 패턴은 transform 후속 |
| Q4 | BFS/DFS query / explain | **META** | different layer | `/onto:ask`, `/onto:question` 존재 | graph 구조 기반 traversal 없음 |
| Q5 | Q&A feedback loop | **META** | none | `/onto:ask` 결과 휘발 | 단순 누락 아님 — `/onto:ask` utility 강등 후 NB-Q1-query가 read path 담당 |
| MM | 멀티모달 (mixed-seat) | **META + INF** | partial | text 중심 explorer 4종 | image/PDF figure-vision은 별도 source profile 필요 |
| I1-I4 | Ingress 확장 | **META** | partial | explorer profile별 처리 | 자동 file-type 분류 + ignore 규칙 없음 |
| X1 | Undirected graph core | **META** (constraint) | N/A | onto relation은 directed | 차용 시 주의 — §15 CR3 |
| X4 | Schema validate + security guard | **META** | none | — | extraction wrapper의 필수 dependency |

## 13. Adoption Evaluation Matrix (Layer-Classified, v6 §6 rebuilt)

### 13.1 Column Grammar (v7 update)

v6 §6.1의 enum-clean grammar에 **`layer` 칼럼 추가**.

| 칼럼 | 허용 값 | 비고 |
|---|---|---|
| `id` | 고유 ID | — |
| `mechanism` | 항목 이름 | — |
| **`layer`** 🆕 | enum: `ground_truth` / `inference` / `meta` / `mixed` | Two-Layer Architecture 분류 |
| `disposition` | enum: `adopt` / `adapt` / `defer` / `different-seat` / `reject` / `undecided` / **`conditional`** 🆕 | qualifier 금지 |
| `owner` | enum: `script` / `runtime` / `LLM` / `concept-work` / `prompt-experiment` / **`unassigned`** | nullable |
| `seat` | 단일 canonical seat 또는 `unassigned` | — |
| `seat_lineage` | free text (optional) | concept→contract→artifact chain |
| `parent_item` | 다른 §13 row의 ID 또는 빈 값 | — |
| `prompt_path_first` | enum: `yes` / `no` | — |
| `current_fit` | enum: `post-review-backlog` / `not-now` / `dependent` | — |
| `future_value` | enum: `high` / `medium` / `low` | — |
| `authority_work_required` | enum: `yes` / `no` / `partial` | — |
| `handoff_to` | 다른 §13 row의 ID 또는 빈 값 | — |
| `depends_on` | 다른 §13 row의 ID 또는 빈 값 | — |
| `governance_gate` | enum: `none` / `required` / `risk-noted` | — |
| `preconditions_ref` | §13.5 P{n} 참조 또는 빈 값 | — |
| `notes` | free text 1줄 | — |

### 13.2 Build-Track Items (Layer-Classified)

#### Ground Truth Layer 항목

| id | mechanism | layer | disposition | owner | seat | parent_item | depends_on | preconditions | notes |
|---|---|---|---|---|---|---|---|---|---|
| BT-E1 | E1: 2-pass AST seed (Part A only — deterministic) | ground_truth | adapt | script | explorers/code-ast-pass | — | BT-E2 | P1 | E2 framework 위에서 동작 |
| BT-E2 | E2: Tree-sitter LanguageConfig | ground_truth | adapt | script | explorers/code-language-config | BT-E1 | — | — | E1이 사용하는 framework |
| **BT-E5a** | E5a: Observed rationale extraction (`# WHY:`, docstring, ADR) | **ground_truth** | adapt | script | explorers/observed-rationale | — | BT-E1 | P1 | comment/docstring parser |
| **BT-E6-literal** | E6-literal: Literal workflow hyperedge (Schema generic N-ary 확장) | **ground_truth** | adapt | concept-work | schema-extension-literal-workflow | — | — | P4-extended | sagas/domain_flows의 일반화. 코드에 명시된 workflow만 |
| BT-X4-validate | X4-validate: schema validation | ground_truth | adapt | script | extraction-wrapper-validate | — | BT-E1 | — | — |
| BT-X4-security | X4-security: input sanitization | ground_truth | adapt | script | extraction-wrapper-security | — | BT-E1 | — | — |

#### Inference Layer 항목

| id | mechanism | layer | disposition | owner | seat | parent_item | depends_on | preconditions | notes |
|---|---|---|---|---|---|---|---|---|---|
| **BT-E1-PartB** | E1: 2-pass semantic Part B (LLM dispatch) | **inference** | adapt | LLM | explorers/code-semantic-pass | — | BT-E1 | — | Part A 이후 LLM 추론 |
| **BT-E4** | E4: Semantic similarity (annotation) | **inference** | adapt | LLM | inference/annotations | — | BT-E1-PartB | P5 | annotation layer refactoring 동반 (BT-E4-ref) |
| **BT-E4-ref** | Annotation layer refactoring 메커니즘 (Phase 2.5 + `/onto:refine`) | **inference** (process) | adapt | concept-work + script | inference/annotation-curation | — | BT-E4 | — | living ontology 유지 |
| **BT-E5b** | E5b: Inferred rationale (LLM speculation) | **inference** | adapt | LLM | inference/inferred-rationale | — | BT-E1-PartB | — | E5a와 분리 |
| **BT-E6-inferred** | E6-inferred: Inferred grouping hyperedge (LLM judgment) | **inference** | adapt | LLM | inference/hyperedges | — | BT-E1-PartB | — | E6-literal과 분리 |
| **BT-E6-concept** | Generic hyperedge canonical concept/seat (OaC chain) | **mixed** (concept work) | adapt | concept-work | schema-hyperedge-primitive | — | — | — | E6-literal과 E6-inferred 모두의 기반 |
| **BT-E3** | E3: Numeric confidence_score (inference layer 전용 ranking) | **inference** | adapt | LLM/script | inference/confidence-score | — | BT-E4, BT-E6-inferred | — | annotation/hyperedge 전용 axis |
| **BT-A1** | A1: Community detection (Leiden + cohesion) | **inference** | adapt | script | inference/community-clusters | — | BT-E1, BT-E1-PartB | — | hyperedge 후보 source 역할 |
| **BT-A2** | A2: God nodes (degree-based hub) | **inference** | adapt | script | inference/insights/god-nodes | — | BT-E1 | — | epsilon generator + Phase 3 report |
| **BT-A3** | A3: Surprising connections (composite surprise score) | **inference** | adapt | script | inference/insights/surprises | — | BT-E1, BT-A1 | — | epsilon generator + Phase 3 report |
| **BT-A4** | A4: Suggested questions | **inference** | adapt | script + LLM | inference/insights/questions | — | BT-E1, BT-A2, BT-A3 | — | epsilon generator + Phase 3 report |

#### Promotion mechanism 항목

| id | mechanism | layer | disposition | owner | seat | depends_on | notes |
|---|---|---|---|---|---|---|---|
| **BT-PROMOTE-INF** | Inference → GT promotion 프로세스 | meta | adopt | concept-work + runtime | processes/promote-inference.md | ARCH-PROMOTION | `/onto:promote` 구조 재사용 |
| **BT-REFINE** | `/onto:refine` 프로세스 (inference layer curation) | meta | adopt | concept-work + script | processes/refine.md | ARCH-RAWFMT | annotation/hyperedge curation |

#### Maintenance (META layer-aware) 항목

| id | mechanism | layer | disposition | owner | seat | depends_on | preconditions | notes |
|---|---|---|---|---|---|---|---|---|
| BT-M1 | M1: Layer-aware content cache | meta | adapt | runtime | builds-cache-store (gt + inference 분리) | BT-E1, BT-E1-PartB | P2 | layer별 독립 invalidation |
| BT-M2 | M2: Layer-aware incremental update | meta | adapt | runtime | build-phase-1-incremental | BT-M1 | P2 | deletion-safety 필수 |
| BT-A5 | A5: Layer-aware graph diff | meta | adapt | script | build-phase-1-diff | BT-M2 | P3 | old_full vs new_full per layer |
| BT-M5 | M5: Token benchmark | meta | adopt | script | completion-report-bench | BT-M1 | — | — |
| BT-M6 | M6: Cost tracking | meta | adopt | script | session-cost-yml | BT-M1 | — | — |

### 13.3 Non-Build-Core Surfaces

| id | mechanism | layer | disposition | owner | seat | depends_on | notes |
|---|---|---|---|---|---|---|---|
| **NB-Q1-read** | Q1: MCP read-only adapter (Phase 1) | meta | adopt | runtime | mcp-read-only-adapter (gt + inf + combined) | NB-Q1-tools | layer-categorized read tools |
| **NB-Q1-query** | Q1: MCP interactive graph traversal (Phase 2) | meta | adopt | runtime | mcp-traversal-engine | NB-Q1-read | gt_shortest_path, inf_semantic_neighbors 등 |
| NB-Q2 | Q2: HTML viz (layer-separated display) | meta | different-seat | script | transform-html-export | BT-E1 | Python 의존성 도입 판단 필요 |
| NB-Q3 | Q3: Wiki output 패턴 | meta | different-seat | script | transform-wiki-export | BT-A1 | community별 article + index.md |
| NB-Q4 | Q4: BFS/DFS query (NB-Q1-query에 흡수) | meta | merged-into | runtime | (NB-Q1-query) | NB-Q1-query | NB-Q1-query와 통합 |
| NB-MM | MM: 멀티모달 (mixed-seat) | meta + inf | conditional | concept-work | source-profile-multimodal | — | multimodal source 실제 등장 시 활성화 |

### 13.4 Reject Decisions

| id | mechanism | reject reason |
|---|---|---|
| RJ-M4 | M4: git hooks 자동 build trigger | build는 multi-agent integral loop라 commit당 트리거 비용 과다 |
| RJ-PIPELINE | graphify의 linear 1-shot pipeline | onto의 integral exploration + convergence loop 평탄화 위험 |
| RJ-M2-AS-IS | graphify M2 `--update` 원본 wiring | §15 CR1 deletion-safety 결함 |
| RJ-A5-AS-IS | graphify A5 `graph_diff` 원본 wiring | §15 CR2 wiring bug |
| RJ-NXGRAPH | graphify의 `nx.Graph` undirected core | §15 CR3 — onto의 directional relation semantics 손상 |
| **RJ-Q5** | NB-Q5: Q&A governed feedback loop | `/onto:ask`가 utility/step-down으로 강등 예정 — feedback governance 문제 자체가 소멸. utility로 강등된 ask의 결과는 호스트 프로세스의 canonical feedback 파이프라인에 자연스럽게 흡수됨 |
| **RJ-MIXED-LAYER** | 단일 raw.yml에 GT + inference mix | Two-Layer Architecture의 Never Mix 원칙 위반 |

### 13.5 Preconditions Reference

| id | precondition |
|---|---|
| **P1** | Structural recognition에 한정. LLM 의미 해석 대체 금지. AST 결과는 ground truth layer로 직행 (`observed` certainty 자동 부여). AST-vs-semantic merge precedence(X2) 명시 |
| **P2** | Cache key는 layer별로 다른 복합 version key 필수: GT는 `extractor + schema + profile`, Inference는 `extractor + schema + profile + model + prompt`. deletion invalidation 필수. cross-file relation handling 정의 |
| **P3** | `old_full` vs `new_full` 비교만 허용 (per layer). `old_full` vs `delta-only` 패턴 (graphify의 결함) 금지 |
| **P4** | `rationale` / `rationale_for`를 OaC chain으로 먼저 정의: concept → contract → artifact seat → consumer (`ontology-as-code-guideline.md:17, 55, 57`) |
| **P4-extended** | Hyperedge 기능도 동일 OaC chain 필수. generic N-ary primitive concept → schema 확장 contract → raw-ground-truth.yml literal_workflows seat → consumer (codegen 등) |
| **P5** | Annotation layer는 refactoring 메커니즘과 동반 도입 필수 (BT-E4-ref). Phase 2.5 in-build refinement + `/onto:refine` cross-session curation |

### 13.6 Authority-Resolved Items (formerly §6.6 Authority-Pending)

사용자 결정 (2026-04-10)으로 v7에서 다음 항목들이 resolved:

| id | 이전 status | 새 status | 결정 근거 |
|---|---|---|---|
| BT-E4 | undecided | **adapt (inference layer)** | Option B 확정 + BT-E4-ref 동반 |
| BT-E6 | undecided | **adapt (split: literal + inferred)** | dual-mode |
| NB-MM | defer | **conditional** | 활성화 조건 명시 |
| NB-Q1 | undecided | **adopt (Phase 1 + Phase 2 layer-categorized)** | MCP 무조건 필요 |
| NB-Q5 | undecided | **reject (RJ-Q5)** | `/onto:ask` 강등 맥락 |

남은 authority-pending: **없음** (v7 전체 결정 완료).

## 14. Recommendations

### 14.1 Build-Track Sequencing (v7 Phase 0 → F)

#### Phase 0 — Architectural Foundation (v7로 완료)

이 phase는 **본 문서 Part I**에서 모두 결정되었음:

- ✅ ARCH-L1L2 (Two-Layer Architecture Principle) → §2
- ✅ ARCH-RAWFMT (Raw File Format) → §3
- ✅ ARCH-BOUNDARY (Cross-Layer Boundary) → §4
- ✅ ARCH-PROMOTION (Promotion Mechanism) → §5
- ✅ ARCH-CACHE-L (Layer-Aware Cache) → §6
- ✅ ARCH-MCP-L (Layer-Aware MCP Interface) → §7

**Phase 0 status**: COMPLETE (in-document, v7).

#### Phase A — Foundation & Concept Closure (구현 단계 1)

**A-script track (script-owned, parallel)**:
- BT-E2 → BT-E1 (Tree-sitter LanguageConfig + AST 2-pass dispatch)
- BT-E5a (observed rationale extraction)

**A-concept track (concept-work, parallel)**:
- BT-E6-concept (generic hyperedge canonical concept/contract/seat)
- BT-E5-concept (rationale canonical concept/seat — 이미 v6에 있던 항목)
- ARCH-RAWFMT의 구체 schema 정의 (raw-ground-truth.yml + raw-inference.yml)

**A-precondition (single track, before A-script and A-concept)**:
- BT-E6-literal의 Schema 확장 (literal hyperedge primitive 추가)

#### Phase B — Inference Layer Infrastructure

Phase A 완료 후:

- BT-E1-PartB (LLM semantic dispatch)
- BT-E4 (semantic similarity annotation) + BT-E4-ref (refactoring 메커니즘) — 동반
- BT-E5b (inferred rationale)
- BT-E6-inferred (inferred grouping hyperedge)
- BT-A1 (community detection)
- BT-E3 (inference layer confidence scoring)
- BT-X4-validate + BT-X4-security
- §4 boundary validator 구현

#### Phase B-extended — Insights & Inference Loop Integration

- BT-A2 + BT-A3 + BT-A4 (god nodes / surprising / questions)
- integral loop의 epsilon generator 통합

#### Phase C — Living Ontology (Refinement & Promotion)

- BT-E4-ref Phase 2.5 in-build refinement 구현
- BT-REFINE (`/onto:refine` 프로세스 + command)
- BT-PROMOTE-INF (`/onto:promote-inference` 프로세스 + command)
- §5의 promotion gate 구현
- Phase 3 user confirmation에 promotion candidate 표시

#### Phase D — Layer-Aware Maintenance

- BT-M1 (dual-layer cache, ARCH-CACHE-L 구현)
- BT-M2 (layer-aware incremental update)
- BT-A5 (layer-aware graph diff)
- BT-M5 + BT-M6 (instrumentation)

#### Phase E — Read/Query Interface

- NB-Q1-read (Phase 1 MCP read-only adapter, ARCH-MCP-L 구현)
- NB-Q1-query (Phase 2 MCP graph traversal)
- gt_*, inf_*, combined_* 도구 categorization

#### Phase F (선택)

- NB-Q2 (HTML), NB-Q3 (Wiki) — `/onto:transform` 후속
- NB-MM (multimodal) — 활성화 조건 충족 시

각 Phase는 review-first canonical priority가 닫힌 후의 backlog로 가정.

### 14.2 비교 Artifact 작성 원칙 (v6 §7.2 preserved)

향후 유사 비교 작업에 적용:

- **Evidence index**: `1 claim = 1 row = 1 path + numeric line` 규칙
- **Phase × feature lifecycle matrix**: 각 권고가 Phase 0/0.5/1/2/3/4/5 중 어느 단계에 영향
- **Closest analog**: `none` / `partial` / `different layer`
- **Enum-clean column grammar**: disposition / owner / seat / timing / compatibility 분리
- **Prior-finding crosswalk**: 모든 prior finding을 1:1로 추적
- **"부재" 주장 전 기존 커버리지 확인**: rationale·certainty가 대표 사례
- 🆕 **Layer 분류 명시**: 새 메커니즘마다 ground_truth/inference/meta 분류 부여

### 14.3 보존해야 할 Canonical Guardrail (확장)

- Single artifact truth → **Two truths, never mixed, gated bridge** (each layer maintains its own single truth)
- 명시적 LLM / runtime / script ownership 분리
- Convergence loop 평탄화 금지
- Query 결과를 governed artifact seat 없이 truth로 승격 금지
- `Prompt-backed reference path first, bounded TS replacement second`
- 같은 artifact truth 위에서 prompt path와 implementation path가 동작
- 🆕 **Two-Layer Architecture Never Mix**: ground truth와 inference의 자동 오염 금지
- 🆕 **Gated Forward Promotion**: inference → GT는 panel review + user approval 통과 시에만
- 🆕 **Layer-aware consumer access**: executable consumer는 ground truth만, evolution consumer는 양쪽

## 15. graphify Bugs to NOT Carry Over (v6 §8 preserved)

### 15.1 CR1. `--update` deletion-safety 부재 (High)

- **증거**: `detect.py:457`의 `deleted_files` 식별 + `detect.py:461,464`의 result 포함은 정상이지만, `skill.md:742-747`의 update path는 `G_existing.update(G_new)`만 수행
- **결과**: 삭제 파일 유래 노드/엣지가 invalidate되지 않음 → ghost state
- **onto 차용 시 요구**: changed/deleted 파일의 prior contributions를 `source_file` 기준으로 먼저 제거 후 merge → P3 precondition. **Layer-aware**: GT layer와 inference layer 각각 독립 처리

### 15.2 CR2. Graph diff wiring bug (High)

- **증거**: `analyze.py:447`의 `graph_diff()` 함수 자체는 올바름. 그러나 `skill.md:768`의 `--update` 경로는 `G_existing.update(G_new)`로 머지된 `new_full`이 아니라 **`old_full`과 `delta-only extraction`을 비교**
- **결과**: 변경 안 된 파일 유래 노드/엣지가 전부 false-removed로 보고
- **onto 차용 시 요구**: `old_full` vs `new_full` 비교 → P3 precondition. **Layer-aware**: GT diff와 inference diff 각각 독립

### 15.3 CR3. Core graph가 undirected (High)

- **증거**: `build.py:35`가 `nx.Graph()`만 사용. `_src/_tgt`는 attribute로 보존되지만 query/BFS/DFS/path/diff(`analyze.py:474` `edge_key`)가 unordered key로 동작
- **결과**: dependency direction reversal이 분석에서 사라짐
- **onto 차용 시 요구**: `nx.DiGraph` 또는 directed projection. onto의 relation은 `from/to`로 directed이므로 이 결함 차용 시 semantic 손상

### 15.4 onto Adoption Risks (graphify bug 아님, v6 §8.5 preserved)

#### R1. Q&A feedback loop의 governance 위험 (resolved as RJ-Q5 in v7)

`/onto:ask`가 utility로 강등 예정이라 본 risk는 v7에서 RJ-Q5 (reject)로 처리됨.

## 16. Authority / Lineage Compatibility Perspective (v6 §9 preserved)

1차·2차·3차 axiology lens가 일관되게 제안한 평가 frame. **외부 메커니즘 차용을 평가할 때 feature comparison보다 먼저** 적용:

**질문 순서**:
1. 이 외부 기능이 **authority ontology artifact**와 **change lineage**를 강화하는가, 아니면 **derived navigation UX**만 개선하는가?
2. 이 기능은 `script scaffold` / `prompt-path reporting surface` / `transform/read interface` / `ImplementationReplacementStep` 중 어디에 속하는가?
3. `authority → contract → artifact seat → consumer` 체인이 닫히는가?
4. 기존 canonical path(현재 review-first)와 대체 관계인가 보완 관계인가?
5. 🆕 **이 기능은 ground_truth / inference / meta 중 어느 layer에 속하는가? layer 간 경계를 침범하지 않는가?**

이 frame을 통과하지 못하는 기능은 도입 우선순위와 무관하게 뒤로 미뤄야 합니다.

## 17. Insufficient Evidence / Open Questions (v6 §10 preserved)

| id | 항목 | 무엇이 더 필요한가 |
|---|---|---|
| **OQ-1** | PDF figure-vision 세부 동작 | graphify 실제 PDF 처리 테스트 또는 해당 skill path 추적 |
| **OQ-2** | Full `--wiki` end-to-end wiring | wiki 생성 e2e 테스트 |
| **OQ-3** | Build authority owner 최종 tiering 판정 | v7의 §13 Authority-Resolved Items로 대부분 해소. 남은 것은 구체 구현 시점의 의사결정 |
| **OQ-4** | BT-E4 Annotation refactoring 메커니즘 세부 설계 | Phase 2.5 + `/onto:refine`의 구체 알고리즘 (어떤 annotation을 통합·삭제할지의 휴리스틱) |
| **OQ-5** | BT-E6-literal Schema 확장 — 기존 saga/domain_flow와의 관계 | generic N-ary primitive를 schema에 추가할 때 기존 workflow 타입과의 backward compatibility |
| **OQ-6** | Cache stage-level vs file-level granularity | onto loop 특성에 더 맞는 단위 실험 (build session 단위? 파일 단위?) |
| **OQ-7** 🆕 | Layer 위반 자동 복구 정책 | validator가 boundary violation을 발견했을 때 단순 fail-close 외에 자동 복구(예: GT의 non-observed entry를 자동으로 inference로 이동)를 허용할지 |
| **OQ-8** 🆕 | Cross-session promotion candidates | 한 build session의 inference가 다른 session의 GT를 evidence로 promotion 가능한지. cross-build query 메커니즘 필요 |

## 18. Evidence Index (v6 §11 preserved)

**규칙**: 1 claim = 1 row = 1 file path + numeric line(s). 모든 항목은 commit `92b70ce5`에 고정. local root는 `.onto/temp/graphify-source/`로 생략.

| claim_id | claim | file path (relative) | line(s) | status |
|---|---|---|---|---|
| E1-a | 2-pass extraction Part A (AST) 정의 | `graphify/skill.md` | 117-141 | Confirmed |
| E1-b | 2-pass Part B (semantic) 병렬 실행 정의 | `graphify/skill.md` | 143-155 | Confirmed |
| E1-c | Part B는 mixed corpus에서 코드 파일도 의미 추출 | `graphify/skill.md` | 209 | Corrected from v1 |
| E1-d | Part C merge: AST 우선 + semantic id-dedup | `graphify/skill.md` | 303-335 | Confirmed |
| E2-a | LanguageConfig dataclass 선언 | `graphify/extract.py` | 23 | Confirmed |
| E2-b | 다언어 지원 (19 languages) 표기 | `README.md` | 11 | Confirmed |
| E3-a | skill.md "confidence_score is REQUIRED" 정책 선언 | `graphify/skill.md` | 238 | Policy declared |
| E3-b | validate.py가 `confidence_score`를 검증하지 않음 | `graphify/validate.py` | 10 | Corrected — E3 Partial 근거 |
| E3-c | export.py default backfill 조건 | `graphify/export.py` | 267 | Corrected |
| E3-d | export.py default backfill 적용 | `graphify/export.py` | 269 | Corrected |
| E4-a | semantically_similar_to edge 계약 | `graphify/skill.md` | 223 | Confirmed |
| E5-a | deterministic rationale extraction 함수 (Python only) | `graphify/extract.py` | 987 | Corrected |
| E5-b | broader rationale은 prompt-backed | `graphify/skill.md` | 211 | Corrected |
| E6-a | Hyperedges 정의 (skill 지시) | `graphify/skill.md` | 229 | Confirmed |
| E6-b | Hyperedges 그래프 attach (build_from_json) | `graphify/build.py` | 49 | Confirmed |
| E6-c | Hyperedges export 렌더 (viz/export only) | `graphify/export.py` | 250 | Confirmed + seat caveat |
| A1-a | Leiden import + Louvain fallback 분기 | `graphify/cluster.py` | 6 | Confirmed |
| A1-b | cluster() 메인 entry | `graphify/cluster.py` | 46 | Confirmed |
| A1c-a | cohesion_score 함수 | `graphify/cluster.py` | 107 | Confirmed |
| A1c-b | score_all 함수 | `graphify/cluster.py` | 118 | Confirmed |
| A2-a | god_nodes 함수 | `graphify/analyze.py` | 39 | Confirmed |
| A2-b | _is_file_node 필터 | `graphify/analyze.py` | 11 | Confirmed |
| A3-a | surprising_connections 함수 | `graphify/analyze.py` | 61 | Confirmed |
| A3-b | _surprise_score 합성 점수 | `graphify/analyze.py` | 134 | Confirmed |
| A4-a | suggest_questions 함수 | `graphify/analyze.py` | 330 | Confirmed |
| A5-a | graph_diff 함수 정의 | `graphify/analyze.py` | 447 | Confirmed |
| A5w-a | --update가 delta-only를 old와 비교 (CR2 wiring) | `graphify/skill.md` | 768 | **CR2 bug** |
| M1-a | file_hash = SHA256(content + path) | `graphify/cache.py` | 10 | Confirmed |
| M1-b | load_cached | `graphify/cache.py` | 27 | Confirmed |
| M1-c | save_cached | `graphify/cache.py` | 47 | Confirmed |
| M2-a | detect_incremental 함수 | `graphify/detect.py` | 423 | Confirmed |
| M2-b | deleted_files 식별 | `graphify/detect.py` | 457 | Confirmed (CR1 detection 측 근거) |
| M2-c | --update가 G_existing.update(G_new)만 수행 | `graphify/skill.md` | 743 | **CR1 bug** |
| M3-a | watch 함수 | `graphify/watch.py` | 99 | Confirmed |
| M4-a | hooks install | `graphify/hooks.py` | 129 | Confirmed |
| M4-b | hooks uninstall | `graphify/hooks.py` | 144 | Confirmed |
| M4-c | hooks status | `graphify/hooks.py` | 157 | Confirmed |
| M5-a | run_benchmark 함수 | `graphify/benchmark.py` | 64 | Confirmed |
| M5-b | print_benchmark 함수 | `graphify/benchmark.py` | 111 | Confirmed |
| M6-a | cost.json 누적 로직 (Step 9) | `graphify/skill.md` | 612 | Confirmed |
| Q1-a | MCP stdio server 시작 | `graphify/serve.py` | 313 | Confirmed |
| Q1-b | MCP tool list 노출 | `graphify/serve.py` | 103 | Confirmed |
| Q2-a | to_html 함수 (vis.js HTML 생성) | `graphify/export.py` | 301 | Confirmed |
| Q3-a-fn | `to_wiki` 함수 정의 (wiki entry generator) | `graphify/wiki.py` | 168 | Confirmed |
| Q3-a-wire | `--wiki` end-to-end orchestration (CLI → to_wiki → 파일 출력) | `graphify/wiki.py` | 168 | Insufficient evidence within boundary (OQ-2) |
| Q4q-a | /graphify query 정의 | `graphify/skill.md` | 829 | Confirmed |
| Q4p-a | /graphify path 정의 | `graphify/skill.md` | 967 | Confirmed |
| Q4e-a | /graphify explain 정의 | `graphify/skill.md` | 1051 | Confirmed |
| Q5-a | save_query_result 함수 | `graphify/ingest.py` | 232 | Confirmed |
| Q5-b | --update gating (skill: query 결과 다음 update에서 흡수) | `graphify/skill.md` | 946 | Confirmed |
| I1-a | CODE_EXTENSIONS 정의 | `graphify/detect.py` | 20 | Confirmed |
| I1-b | detect 함수 entry | `graphify/detect.py` | 296 | Confirmed |
| I2-a | _load_graphifyignore 함수 | `graphify/detect.py` | 246 | Confirmed |
| I2-b | .graphifyignore 패턴 사용 | `graphify/detect.py` | 306 | Confirmed |
| I3-a | Office 변환 (assistant readme matrix 외부) | `README.md` | 175 | Confirmed |
| I4-a | URL fetch + author/contributor metadata 저장 | `graphify/ingest.py` | 232 | Confirmed |
| MM-d-a | image/PDF file-type 분류 | `graphify/detect.py` | 22 | Confirmed (re-seated SYN-C7) |
| MM-i-a | URL ingest + 이미지 binary 보관 | `graphify/ingest.py` | 232 | Confirmed (re-seated SYN-C7) |
| MM-s-a | image vision/PDF prompt contract | `graphify/skill.md` | 211 | Confirmed (re-seated SYN-C7) |
| X1-a | nx.Graph() 생성 (build core) | `graphify/build.py` | 35 | **CR3 근거** |
| X1-b | analyze 측 undirected edge_key 사용 | `graphify/analyze.py` | 474 | **CR3 propagation** |
| X1-c | serve 측 G.neighbors 사용 (BFS) | `graphify/serve.py` | 52 | **CR3 propagation** |
| X2-a | Part C merge precedence (AST 우선, semantic dedup) | `graphify/skill.md` | 303 | Confirmed |
| X3-a | deleted file invalidation 정책 부재 (M2-c 동일 근원) | `graphify/skill.md` | 743 | **CR1 연결** |
| X4v-a | validate_extraction 함수 | `graphify/validate.py` | 10 | Confirmed |
| X4s-a | validate_url 함수 | `graphify/security.py` | 26 | Confirmed |
| X4s-b | validate_graph_path 함수 | `graphify/security.py` | 144 | Confirmed |
| X4s-c | sanitize_label 함수 | `graphify/security.py` | 188 | Confirmed |

### 18.1 Out-of-Scope Inventory (downstream treatment 없음, v6 §11.1 preserved)

다음은 graphify에 존재하지만 본 v7 artifact의 selected scope 밖이며, downstream evaluation 대상 아님.

| oos_id | mechanism | file path | line | reason for OoS |
|---|---|---|---|---|
| OOS-1 | to_cypher (Neo4j Cypher export) | `graphify/export.py` | 280 | Out-of-scope: onto는 graph DB 통합 우선순위 없음 |
| OOS-2 | to_obsidian (Obsidian vault export) | `graphify/export.py` | 415 | Out-of-scope: onto는 별도 도메인 문서 경로 보유 |
| OOS-3 | push_to_neo4j (live Neo4j push) | `graphify/export.py` | 814 | Out-of-scope: 동일 |
| OOS-4 | to_graphml (GraphML export) | `graphify/export.py` | 880 | Out-of-scope |
| OOS-5 | to_svg (SVG export) | `graphify/export.py` | 897 | Out-of-scope |
| OOS-6 | claude install (CLAUDE.md + PreToolUse hook) | `README.md` | 84-88, 159-164 | Out-of-scope: onto는 자체 plugin 기반 |

---

# Part III — Appendix

## 19. Prior-Finding Crosswalk (v6 §12 + v7 decisions)

### 19.1 1차 Review (`20260408-a406b52b`) — 8 Consensus + 6 Conditional + 6 Unique

| prior_finding_id | severity | resolved_section | resolution_status | residual_caveat |
|---|---|---|---|---|
| 1차 C1 (boundary 증거 부재) | critical | §1, §18 | resolved | — |
| 1차 C2 (Tier 축 혼합) | critical | §13.1 grammar + §13.2-13.5 | resolved | enum strictness는 v3에서 새로 적용 |
| 1차 C3 (repo-level priority 과장) | high | §0 (artifact purpose), §13 current_fit, §14.1 phase note | resolved | — |
| 1차 C4 (discovery surface가 core 아님) | high | §13.2 inference layer + §14.1 Phase B-extended | resolved + reframed (이제 inference layer로 명시 분류됨) | — |
| 1차 C5 (onto-side 사실 오기) | high | §11 정정 표 6건 | resolved | — |
| 1차 C6 (hyperedge 자기모순) | high | §11 정정 + §13.2 BT-E6-literal/inferred split | resolved | — |
| 1차 C7 (Tier 3 거침) | high | §13.3 / §13.4 / §13.6 분리 | resolved | — |
| 1차 C8 (rationale framing 잘못) | medium | §11 정정 + §13.2 BT-E5a/E5b split | resolved | — |
| 1차 CC1 (AST guardrail) | conditional | §13.5 P1, §13.2 BT-E1 | resolved | — |
| 1차 CC2 (cache stricter contract) | conditional | §13.5 P2 + §6 ARCH-CACHE-L | resolved | — |
| 1차 CC3 (score consumer 필요) | conditional | §13.2 BT-E3 (inference 전용 ranking) | resolved | — |
| 1차 CC4 (community = hint only) | conditional | §13.2 BT-A1 (inference layer) | resolved | — |
| 1차 CC5 (cost tracking dependent) | conditional | §13.2 BT-M5/M6 | resolved | — |
| 1차 CC6 (rationale = seat design) | conditional | §13.2 BT-E5a + BT-E5b | resolved | — |
| 1차 U1 (Q&A governance gate) | unique | §13.4 RJ-Q5 (resolved as reject) | resolved | — |
| 1차 U2 (14 inventory inflated by N/A duplication) | unique | §10 E1-c (N이 E1에 흡수) | resolved | — |
| 1차 U3 (phase × candidate feature matrix) | unique | §14.1 phase 구조 + §13.2 depends_on/parent_item | partial — explicit defer | true `phase × feature lifecycle matrix`는 build authority owner 판정 필요 |
| 1차 U4 (closest analog 칼럼) | unique | §12 `closest onto analog` | resolved | — |
| 1차 U5 (community = "structural clustering hint") | unique | §13.2 BT-A1 notes | resolved | — |
| 1차 U6 (claim마다 version/path/id) | unique | §18 (1 claim = 1 row + commit `92b70ce5`) | resolved | — |
| 1차 AP1 (Authority/Lineage Compatibility) | axiology | §16 + 5번째 질문 추가 (layer 분리) | preserved + extended | — |

### 19.2 2차 Review (`20260408-19089faf`) — 9 Consensus + 3 Conditional + 2 Disagreement + 3 Unique + AP1 + 3 CR

| prior_finding_id | severity | resolved_section | resolution_status |
|---|---|---|---|
| 2차 SYN-C1 (14 inventory not canonical) | critical | §10 (selected mechanisms + parent taxonomy) | resolved |
| 2차 SYN-C2 (A restate + N 흡수) | critical | §10.1 E1 + E1-c | resolved |
| 2차 SYN-C3 (B export-time backfill) | critical | §10.1 E3 + §18 E3-a/b/c/d | resolved |
| 2차 SYN-C4 (F + graph_diff deletion/version 미안전) | critical | §10.3 M2 + §15 CR1/CR2 + §13.5 P2/P3 | resolved |
| 2차 SYN-C5 (community cohesion 확인) | confirmed | §10.2 A1c | resolved |
| 2차 SYN-C6 (HTML viz 확인) | confirmed | §10.4 Q2 | resolved |
| 2차 SYN-C7 (이미지/PDF mixed seat) | critical | §10.7 SYN-C7 Re-seated (4 sub-rows) | resolved |
| 2차 SYN-C8 (E Python-only + prompt-backed) | critical | §10.1 E5 + §13.2 BT-E5a/E5b split | resolved |
| 2차 SYN-C9 (G/H/I/L/M 확인) | confirmed | §10.2 A1, §10.3 M3/M5, §10.4 Q5 | resolved |
| 2차 SYN-CC1 (inventory axis 의존) | conditional | §10 (parent taxonomy) + §18.1 OoS | resolved |
| 2차 SYN-CC2 (C/D/J/K seat caveat) | conditional | §10.1 E6 (split), §10.4 Q3 (e2e 미입증) | resolved |
| 2차 SYN-CC3 (graphify support로만 정렬) | conditional | §13.6 Authority-Resolved Items + §16 | resolved |
| 2차 SYN-D1 (14 inventory expansion vs contraction) | disagreement | §10 (parent taxonomy + OoS 양쪽 적용) | resolved |
| 2차 SYN-D2 (priority reranking unresolved) | disagreement | §13.6 Authority-Resolved + v7 사용자 결정 | resolved |
| 2차 SYN-U1 (undirected core) | unique | §10.6 X1, §15 CR3, §18 X1-a/b/c | resolved |
| 2차 SYN-U2 (cache version markers) | unique | §13.5 P2 (layer-aware) + §6 ARCH-CACHE-L | resolved + extended |
| 2차 SYN-U3 (AST-vs-semantic precedence inventory) | unique | §10.6 X2 | resolved |
| 2차 SYN-U4 (Authority/Lineage Compatibility 재확인) | axiology | §16 | preserved |
| 2차 CR1 (--update deletion-safety) | critical bug | §15.1, §13.4 RJ-M2-AS-IS, §13.5 P3 | resolved |
| 2차 CR2 (graph_diff wiring) | critical bug | §15.2, §13.4 RJ-A5-AS-IS, §13.5 P3 | resolved |
| 2차 CR3 (undirected core) | critical bug | §15.3, §13.4 RJ-NXGRAPH | resolved |

### 19.3 3차 Review (`20260408-3b79cbd7`) — Cleanliness Verdict

(v6 §12.3 preserved — 모든 항목 resolved)

### 19.4 4차 Review (`20260409-09ccdbed`)

(v6 §12.4 preserved — 모든 항목 resolved)

### 19.5 5차 Review (`20260409-48f8a7f3`)

(v6 §12.5 preserved — 모든 항목 resolved)

### 19.6 6차 Review (`20260409-57d2f40a`)

(v6 §12.6 preserved — 모든 항목 resolved)

### 19.7 v7 User Decisions (2026-04-10)

| decision_id | type | resolved_section | description |
|---|---|---|---|
| **V7-D1** | architectural | §2 ARCH-L1L2 | Two-Layer Architecture 원칙 — ground truth + inference 분리 |
| **V7-D2** | architectural | §2.4, §5 ARCH-PROMOTION | Gated forward promotion (inference → GT, panel + user approval) |
| **V7-D3** | format | §3 ARCH-RAWFMT | raw-ground-truth.yml + raw-inference.yml 파일 분리 (Option β) |
| **V7-D4** | boundary | §4 ARCH-BOUNDARY | Cross-layer reference 단방향 enforcement |
| **V7-D5** | infrastructure | §6 ARCH-CACHE-L | Layer-aware cache (GT는 source-only, inference는 +model+prompt) |
| **V7-D6** | interface | §7 ARCH-MCP-L | Layer-aware MCP tool categorization (gt_*, inf_*, combined_*) |
| **V7-D7** | adoption | §13.2 BT-E5a/E5b split | Observed rationale + inferred rationale 분리 |
| **V7-D8** | adoption | §13.2 BT-E6-literal/inferred split | Literal hyperedge + inferred hyperedge 분리 |
| **V7-D9** | adoption | §13.6 NB-MM | Conditional disposition |
| **V7-D10** | adoption | §13.6 NB-Q1-read + NB-Q1-query | Layer-categorized MCP, Phase 1 + Phase 2 둘 다 |
| **V7-D11** | adoption | §13.4 RJ-Q5 | Q&A feedback loop reject (`/onto:ask` 강등 맥락) |
| **V7-D12** | command | §5.7 `/onto:promote-inference` | 신규 promotion command |
| **V7-D13** | process | §13.2 BT-REFINE | `/onto:refine` 신규 process |
| **V7-D14** | adoption | §13.2 BT-A1/A2/A3/A4 inference layer 분류 | "different-seat reporting"이 아니라 inference layer 1급 시민 |
| **V7-D15** | document | (본 문서) | v6 major revision in place (5a) + Phase 0 ARCH 6건 전체 (4a) |

### 19.8 Crosswalk Tracking Statistics (extended)

| 카테고리 | row count | tracked | preserved | acknowledged | residual |
|---|---|---|---|---|---|
| 1차 consensus (C1-C8) | 8 | 8 | 0 | 0 | 0 |
| 1차 conditional (CC1-CC6) | 6 | 6 | 0 | 0 | 0 |
| 1차 unique (U1-U6) | 6 | 6 | 0 | 0 | 0 |
| 1차 axiology (AP1) | 1 | 0 | 1 | 0 | 0 |
| 2차 consensus (SYN-C1~C9) | 9 | 9 | 0 | 0 | 0 |
| 2차 conditional (SYN-CC1~CC3) | 3 | 3 | 0 | 0 | 0 |
| 2차 disagreement (SYN-D1~D2) | 2 | 2 | 0 | 0 | 0 |
| 2차 unique (SYN-U1~U3) | 3 | 3 | 0 | 0 | 0 |
| 2차 axiology (SYN-U4) | 1 | 0 | 1 | 0 | 0 |
| 2차 critical bugs (CR1~CR3) | 3 | 3 | 0 | 0 | 0 |
| 3차 consensus (CNS1~CNS4) | 4 | 3 | 1 | 0 | 0 |
| 3차 conditional | 2 | 2 | 0 | 0 | 0 |
| 3차 disagreement (DG1) | 1 | 1 | 0 | 0 | 0 |
| 3차 axiology | 1 | 0 | 1 | 0 | 0 |
| 3차 unique | 4 | 4 | 0 | 0 | 0 |
| 4차 consensus | 2 | 1 | 1 | 0 | 0 |
| 4차 conditional | 2 | 2 | 0 | 0 | 0 |
| 4차 disagreement | 2 | 2 | 0 | 0 | 0 |
| 4차 axiology | 1 | 0 | 1 | 0 | 0 |
| 4차 unique | 3 | 2 | 0 | 1 | 0 |
| 5차 consensus | 6 | 2 | 4 | 0 | 0 |
| 5차 conditional | 3 | 2 | 1 | 0 | 0 |
| 5차 axiology | 1 | 0 | 1 | 0 | 0 |
| 5차 unique | 1 | 0 | 0 | 1 | 0 |
| 6차 consensus | 2 | 1 | 1 | 0 | 0 |
| 6차 conditional | 3 | 0 | 3 | 0 | 0 |
| 6차 disagreement | 1 | 1 | 0 | 0 | 0 |
| 6차 axiology | 1 | 0 | 1 | 0 | 0 |
| 6차 unique | 2 | 2 | 0 | 0 | 0 |
| **🆕 v7 user decisions** | **15** | **15** | **0** | **0** | **0** |
| **합계** | **99** | **78** | **18** | **2** | **3 (OQ-1, OQ-2, OQ-7/8)** |

(v6 합계 84건 → v7 합계 99건. 추가 15건은 모두 v7 user decisions.)

## 20. Appendix A: Review History

### A.1 1차 review — `.onto/review/20260408-a406b52b/`
- Intent: 14 메커니즘 발견 내용이 전부인지 / 잘못 해석한 부분이 있는지 / 우선순위 판단이 타당한지
- Boundary limit: graphify 원본 미materialize → graphify-side 사실 검증 불가
- 결과: 8 consensus + 6 conditional + 6 unique + 1 axiology

### A.2 2차 review — `.onto/review/20260408-19089faf/`
- Intent: graphify 원본 materialize 후 사실 정확성 검증
- Materialization: commit `92b70ce5` → `.onto/temp/graphify-source/`
- 결과: 9 consensus + 3 conditional + 2 disagreement + 3 unique + 1 axiology + 3 critical bugs

### A.3 3차 review — `.onto/review/20260408-3b79cbd7/`
- Intent: v2 cleanliness 검증
- 결과: 4 consensus + 2 conditional + 1 disagreement + 1 axiology + 4 unique
- 평결: backlog hypothesis input으로 조건부 사용 가능

### A.4 4차 review — `.onto/review/20260409-09ccdbed/`
- Intent: v3 cleanliness 검증
- 결과: 2 consensus + 2 conditional + 2 disagreement + 1 axiology + 3 unique
- 평결: directional 진전, 5개 immediate action 필요

### A.5 5차 review — `.onto/review/20260409-48f8a7f3/`
- Intent: v4 cleanliness 검증
- 결과: 6 consensus + 3 conditional + disagreement 없음 + 1 axiology + 1 unique

### A.6 6차 review — `.onto/review/20260409-57d2f40a/`
- Intent: v5 cleanliness 검증
- 결과: 2 consensus + 3 conditional + 1 disagreement + 1 axiology + 2 unique
- 평결: directional 진전 유지, narrow propagation fix 필요

### A.7 v6 narrow cleanup 핵심 개선 (v5 대비)
- §7.1 A-script clause를 SSOT 참조로 정정
- §13 A.6 stale claim 제거
- §12.5 → §12.7로 확장, preserved total 정정
- §12 5차/6차 sub-section 추가

### A.8 v5 narrow cleanup 핵심 개선 (v4 대비)
- §6.2 BT-E1/BT-E2 dependency 방향 정정
- §12 heading count drift 정정

### A.9 v4 narrow cleanup 핵심 개선 (v3 대비)
- §6.1 grammar에 nullable enum + helper columns 추가
- §6.2 / §6.3 placeholder/relational prose 제거
- §7.1 Phase A를 두 independent track으로 분리
- §11 Q3-a split
- §12 도입부에 boundary 한계 명시 + 누락된 prior findings 추가
- §0 artifact purpose 명확화
- §5 X4 row의 stale reference 정정

### A.10 v7 major revision 핵심 개선 (v6 대비)

**구조적 변화**:
- 문서 title 변경: "graphify Adoption Hypothesis" → "**onto build Two-Layer Architecture + graphify Adoption Hypothesis**"
- Part I/Part II/Part III 구조 도입 (이전: §0~§13 단순 sequence)
- §0 artifact purpose 변경: "provisional backlog hypothesis memo" → "**canonical architecture design document**"

**Part I 신규 추가 (Phase 0 ARCH 6건)**:
- §2 Two-Layer Architecture Principle [ARCH-L1L2]
- §3 Raw File Format [ARCH-RAWFMT]
- §4 Cross-Layer Boundary [ARCH-BOUNDARY]
- §5 Promotion Mechanism [ARCH-PROMOTION]
- §6 Layer-Aware Cache [ARCH-CACHE-L]
- §7 Layer-Aware MCP Interface [ARCH-MCP-L]
- §8 Consumer Types and Layer Access

**Part II 변경 (v6 §3-§11 → §10-§18)**:
- §10 Selected graphify Mechanisms: 각 mechanism에 layer 태그 추가
- §12 Gap Analysis: target_layer 칼럼 추가
- §13 Adoption Evaluation Matrix: layer 칼럼 + Ground Truth/Inference/META 분류로 재구성
- §13.2 BT-E5/BT-E6 split (E5a/E5b, E6-literal/E6-inferred)
- §13.2 BT-A1/A2/A3/A4를 inference layer 1급 시민으로 재분류 (이전: "different-seat reporting")
- §13.2 BT-E3을 inference layer 전용 ranking으로 승격 (이전: defer)
- §13.4 RJ-Q5 추가 (NB-Q5 reject)
- §13.4 RJ-MIXED-LAYER 추가
- §13.5 P5 추가 (annotation refactoring 동반 필수)
- §13.6 Authority-Resolved Items (formerly Authority-Pending) — 모두 resolved
- §14 Phase 재정렬 (Phase 0 = COMPLETE, Phase A-F 재구성)

**Part III 확장**:
- §19 Crosswalk에 V7-D1~D15 (15건 user decisions) 추가
- §19.8 statistics: v6 84건 → v7 99건
- §20 A.10 v7 major revision 항목 추가

**v7이 의도적으로 보류한 항목**:
- 6차 UF-CON-PROVENANCE-REDUNDANCY는 narrow cleanup 원칙에서 acknowledged 보류 → v7 major revision에서도 prose trim은 별도 작업으로 defer (v7 자체가 기존보다 5배 분량 증가했으므로 trim은 향후 별도 pass)

## 21. Two-Layer Architecture Decision History

### 21.1 사용자 결정 timeline

**2026-04-10 — 핵심 framing 진술**:

1. **첫 framing**: 사용자가 BT-E4 (semantic similarity)에 대한 반응에서 build의 본질을 재정의:

   > *"Semantic Similarity Edges 는 build에서 가장 중요한 요소야. build가 현상과 구조에 domain 지식을 기반으로 의미와 맥락을 덧붙이는 추론작업이야."*

2. **Living ontology 원칙**:

   > *"onto의 핵심원칙 중 하나가 살아있는 ontology라는 점이야. 온톨로지는 변화하기 때문에 절대 C는 안돼."*

3. **Hyperedge 필수성**:

   > *"generic hyperedge도 반드시 필요해. build 과정의 핵심은 statics, kinetics에서 domain 지식을 활용해 dynamics를 유추해내는거야."*

4. **두 영역 분리의 핵심 원칙**:

   > *"정밀 재현 (precise reproduction)과 추론의 영역은 명확하게 분별이 가능해야 해. 이게 뒤섞여버리면 안돼."*

5. **각 영역의 존재 이유**:

   > *"정밀재현이 필요한 이유는, Ontology가 실제로 작동하는 코드 혹은 something이어야 하기 때문이야."*
   >
   > *"추론의 영역이 필요한 이유는, ontology는 코드 혹은 something이 변경/업데이트 될 때에 함께 진화해야 하기 때문이야."*

6. **Promotion 가능성**:

   > *"inference 또한 promote 처럼 검토와 승인 하에 ground truth로 승격 가능해야 해."*

### 21.2 Decision tree

```
사용자 framing 진술
  ↓
Two-Layer Architecture 도출
  ├─ Layer 1: Ground Truth (precise reproduction, 실행 가능)
  └─ Layer 2: Inference (domain 지식 추론, 살아있음)
  ↓
경계 원칙
  ├─ Never Mix (자동 오염 방지)
  ├─ Cross-layer reference 단방향 (inference → GT only)
  └─ Promotion gate (inference → GT는 panel review + user approval)
  ↓
구조적 enforcement
  ├─ 파일 분리 (raw-ground-truth.yml + raw-inference.yml)
  ├─ Validation 게이트 (build-time validator)
  ├─ Layer-aware cache (각 layer 독립 invalidation)
  └─ Layer-aware MCP tools (gt_*, inf_*, combined_*)
  ↓
기존 결정 재분류
  ├─ BT-E5 → BT-E5a (GT) + BT-E5b (Inference)
  ├─ BT-E6 → BT-E6-literal (GT) + BT-E6-inferred (Inference) + BT-E6-concept (mixed)
  ├─ BT-A1/A2/A3/A4 → Inference layer 1급 시민 (이전: "different-seat reporting")
  └─ BT-E3 → Inference layer 전용 ranking (이전: defer)
  ↓
새 work items
  ├─ ARCH-L1L2/RAWFMT/BOUNDARY/PROMOTION/CACHE-L/MCP-L (Phase 0, 본 문서에서 완료)
  ├─ BT-E4-ref (annotation refactoring 메커니즘)
  ├─ BT-PROMOTE-INF (/onto:promote-inference)
  └─ BT-REFINE (/onto:refine)
```

### 21.3 고려되었으나 채택되지 않은 옵션

| 옵션 | 거부 사유 |
|---|---|
| Single-layer with confidence tags | enforcement 약함, 오염 가능 |
| Top-level YAML section split (Option α) | 파일 분리만큼 강하지 않음 |
| 원소별 layer tag (Option γ) | 태그 미부착 시 모호 |
| Promotion 자동화 (no gate) | 검증되지 않은 inference가 GT로 새는 위험 |
| Promotion 절대 금지 | living ontology 원칙 침해 (inference가 영원히 inference로만 남음) |
| Bidirectional reference | dependency cycle 위험 |
| `/onto:promote` 확장 (single command) | learning과 build inference는 다른 subject — 분리가 더 깨끗 |

### 21.4 향후 결정 후보 (Open Questions, §17 참조)

- OQ-7: Layer 위반 자동 복구 정책
- OQ-8: Cross-session promotion candidates
- OQ-4: Annotation refactoring 세부 알고리즘
- OQ-5: BT-E6-literal Schema 확장 시 backward compatibility
- OQ-6: Cache stage-level vs file-level granularity
