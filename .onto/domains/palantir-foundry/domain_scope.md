---
version: 4
last_updated: "2026-03-31"
source: manual
status: established
---

# Palantir Foundry Ontology Domain — Domain Scope Definition

This is the reference document used by coverage to identify "what should exist but is missing" in a Palantir Foundry-style ontology.

## Scope of Application

This domain applies when **implementing Foundry's design principles and structure using in-house technology** (YAML + TypeScript). This is not about adopting the Foundry platform itself, but about referencing Foundry's design principles and structure to build an equivalent system independently.

Key differences from traditional ontologies (OWL/RDFS):
- Design philosophy: Optimizes for **business operational executability**, not logical accuracy of knowledge
- World assumption: **Closed-world assumption** (if it is not in the system, it does not exist), not open-world
- Execution layer: An operational system with **integrated read + write + execute**, not read-only

[관찰] Foundry defines its ontology as a "digital twin of the organization" — not a static data catalog but an operational semantic layer where decisions are captured via writeback and fed back into the system. This closed-world + read-write design is what separates it from Semantic Web (OWL/RDFS) read-only repositories. (Ref: Palantir Ontology System Architecture docs)

### Domain Identity Axiom

> **Ontology-first**: 비즈니스 개념을 먼저 정의하고, 데이터를 그 개념에 바인딩한다. 데이터베이스 스키마나 테이블 구조에서 출발하지 않는다.

이 원칙은 이 도메인의 정체성을 규정하는 기초 공리(axiom)이다. 모든 설계 결정, 리뷰 기준, 바이어스 탐지가 이 공리를 전제로 한다. 이 공리를 위반하는 설계(data-first, table-entity direct mapping)는 바이어스로 간주된다.

[관찰→참여] **Ontology-first vs Data-first**: Foundry starts from business concepts and binds data to them; Snowflake/Databricks start from tables and overlay semantic meaning afterward. SAP BTP/CAP takes a Domain-first approach via DDD principles. The Ontology-first approach prevents "table-entity direct mapping," where technical structures are mistaken for business concepts. When building in-house, this principle translates to: define Object Types from business decisions, not from database schemas. (Ref: competitive_comparison.md Section 2)

## Three-Layer Architecture

Classification axis: **layer** — classified by the level of functionality the ontology handles.

[관찰] The three layers separate three concerns: what exists (Semantic), what can be done (Kinetic), and who can do what (Dynamic). Different stakeholders work at different layers — analysts at Semantic, engineers at Kinetic, operators at Dynamic — and each layer can evolve independently. (Ref: Palantir Ontology Core Concepts docs)

### Semantic Layer — Required

Defines the structure of business concepts. Answers "What exists in the world?"

- **Object Type** (required): [관찰→참여] Business entity type definition (e.g., Order, Product, Customer). Maps to a dataset but is not the dataset — one Object Type can be backed by multiple datasets
  - display_name: User-facing display name
  - primary_key: Unique identifier
  - properties: List of attributes. Each Property has a 3-layer type structure: base type (String, Integer, Decimal, Date, Boolean, Enum, Geopoint, Timestamp, Long, etc.) + Value Type (semantic wrapper with metadata) + constraints (nullable, default, validation rule, enum, range, regex, uniqueness). Description states business meaning in natural language
  - data_source: Origin from which data is ingested (dataset binding)

- **Link Type** (required): [관찰→참여] Relationship definition between Object Types. Unlike FK/JOIN in RDBMS, Link Types require business meaning to be explicitly stated
  - Direction: source -> target
  - Cardinality: one-to-one, one-to-many, many-to-many
  - Meaning: Business meaning of the relationship explicitly stated

- **Interface** (when applicable): [관찰→참여] Common shape definition (shape contract, not inheritance) that multiple Object Types must implement. Enables polymorphism without explicit inheritance chains — core mechanism for minimizing coupling in multi-ontology environments
  - A set of Properties that an Object Type must include
  - Multiple implementation supported (one Object Type can implement multiple Interfaces)
  - Serves as a cross-reference contract in multi-ontology environments

- **Shared Property** (when applicable): [관찰→참여] A Property used across multiple Object Types, defined in a single location
  - Changes to the definition automatically propagate to all referencing Object Types

- **Enum** (required): [관찰→참여] Permitted value set definition
  - Code generation as union type (e.g., "content_lifetime_ownership" | "subscription" | ...)
  - Adding a value is breaking_minor (immediate); removing a value is breaking_major (deprecation — grace period required)

### Kinetic Layer — When Applicable

Defines and executes business logic. Answers "What can be done?"

[관찰] Foundry represents this layer as "verbs" — if the Semantic Layer defines nouns, the Kinetic Layer defines actions on those nouns. Without the Kinetic Layer, the ontology is read-only, and organizational learning (decision capture via writeback) is impossible. (Ref: Palantir Action Types Overview docs)

- **Action Type** (when applicable): [관찰→참여] Definition of mutation operations on Objects. Uses a 2-tier design: declarative built-in rules for simple CRUD, imperative Function-Backed Actions for complex logic
  - Input parameters
  - Execution logic (state changes, object creation/deletion)
  - Submission criteria and permissions
  - Writeback: user edits are recorded in a separate writeback dataset (source data is never directly modified)

- **Function** (when applicable): [관찰→참여] Server-side business logic execution
  - Implemented in TypeScript or Python
  - Uses ontology Objects as inputs and outputs

#### Action Inbox Pattern

[관찰→참여] 사용자에게 작업을 할당하고, 데이터 탐색 → 의사결정 → 의사결정 기록의 흐름을 지원하는 UI 패턴이다. 의사결정이 Object의 Property 변경으로 기록되어 조직 학습의 기반이 된다. 의사결정은 하류(downstream) 프로세스와 외부 시스템(SAP, Salesforce 등)에 전파된다.

이 패턴은 Process Ontology(워크플로우: 담당자, 상태, 우선순위)와 Subject Matter Ontology(도메인 데이터)의 분리를 전제한다. (Ref: RESEARCH_NOTES.md Section 9.4, domain_scope.md Multi-Ontology Design Patterns)

### Dynamic Layer — Scale-Dependent

Defines policies, automation, and permissions. Answers "Who can do what, and when?"

[관찰] This layer becomes necessary at scale. Small teams can operate with Semantic + Kinetic only, but multi-user, multi-agent environments require automated governance and access control. (Ref: Palantir Markings docs, Object Security Policies docs)

- **Workflow** (scale-dependent): [관찰→참여] Sequential/parallel execution flow of multiple Actions
- **Rule** (scale-dependent): [관찰→참여] Conditional automatic execution (event trigger -> Action execution)
- **Permission** (scale-dependent): [관찰→참여] Access control per Object Type / Action Type. Foundry uses Marking (mandatory access control with automatic propagation to derived data) — a design where security travels with the data

## Data Layer Hierarchy

[관찰→참여] Foundry-style ontologies separate data into three layers. Upper layers reference lower layers, but lower layers do not know about upper layers.

| Layer | Nature | Change Frequency | Examples |
|-------|--------|-----------------|----------|
| A. Master Data | "What exists" | Low | Business units, products, customers |
| B. Transaction | "Who did what, when" | High (daily) | Orders, payments, enrollments |
| C. Derived/Aggregated | "Computed results" | Periodic | Aggregated metrics, computed scores |

- If Layer A (Master Data) is unstable, everything above it is unstable -> stabilize first via Shared Ontology

### Data Integration Flow

[관찰→참여] Data flows through a staged pipeline before reaching the ontology:

```
Source Systems → Data Connection → Sync → Datasets → Transforms → Ontology
                                              ↑
                                      Virtual Datasets (compute-on-demand)
```

[관찰] Foundry distinguishes **Backing Datasets** (persistent copies with version history and full lineage) from **Virtual Datasets** (compute-on-demand, no storage, source-system latency). The choice depends on audit requirements, latency tolerance, and transformation complexity. (Ref: Palantir Data Integration docs)

[관찰→참여] Source data (backing dataset) and change data (writeback dataset) are separated — source systems are never directly modified. This is a variant of the CQRS pattern that guarantees source data immutability while tracking user edits.

### Pipeline Quality Stages

[관찰→참여] 데이터는 3단계 품질 레이어를 거쳐 온톨로지에 도달한다 (Medallion Architecture 변형):

| Stage | Nature | Purpose |
|-------|--------|---------|
| Raw | 소스 시스템에서 그대로 수집된 데이터 | 원본 보존 |
| Clean | 기본 정제가 적용된 상태 | "많은 Foundry 활동(분석, 모델링, 파이프라인)의 시작점" |
| Transform | Clean에서 특정 사용 사례를 위해 변환된 데이터 | 사용 사례별 최적화 |

핵심 원칙: "Clean에서 다운스트림으로 가는 중간 변환 단계는 처음에 형식적으로 느껴지더라도 항상 권장된다." 각 단계의 목적을 명확히 구분하여 데이터 품질을 단계적으로 높인다. (Ref: RESEARCH_NOTES.md Section 16.1)

### Naming Conventions

[관찰→참여] 데이터셋과 컬럼 네이밍 규칙:
- snake_case 사용 (awesome_dataset, not AwesomeDataset)
- 고유 부분(distinctive portion)을 이름 앞에 배치 (UI 드롭다운에서 잘리는 것 방지)
- 약어 사용 금지
- 번호 증분 금지 (dataset1, dataset2 등)

(Ref: RESEARCH_NOTES.md Section 16.2)

### Catalog Organization Pattern

[관찰→참여] 데이터 카탈로그는 `/Domain/Subject Area/Entity` 구조로 조직한다:

```
/Domain
  /Subject Area
    /Entity
      - gold_<entity>
      - silver_<entity>
      - ref_<lookups>
```

(Ref: RESEARCH_NOTES.md Section 16.3)

## Change Management (Schema Migration)

### Change Classification

변경은 두 개의 직교축으로 분류된다. 단일 변경에 두 축의 값이 동시에 부여된다.

**Impact Severity** — 기존 시스템에 미치는 영향 정도:

| Classification | Definition | Examples |
|---------------|-----------|----------|
| non_breaking | No impact on existing systems | Adding a Property (nullable), editing descriptions |
| breaking_minor | Minor impact on existing data | Adding an enum value, changing an optional attribute to required |
| breaking_major | May break existing data/integrated systems | Changing a Property type, changing PK, changing data source |

**Lifecycle Intent** — 변경의 생명주기 의도:

| Classification | Definition | Examples |
|---------------|-----------|----------|
| immediate | Change takes effect upon deployment | All non_breaking changes, most breaking changes |
| deprecation | Element is retired with a grace period | Removing an Object Type/Property, removing an enum value |

예: enum 값 제거 = breaking_major + deprecation (grace period 후 제거).

### Change Detection Mechanism

[관찰→참여] **Ontology -> codegen -> auto-generated TypeScript types -> compile errors automatically detect impact scope**. This is the core pattern for implementing Foundry's OSDK + Schema Migration in-house. Re-running codegen causes compile errors in all code that references the changed types, converting runtime errors into compile-time errors.

### Branching

[관찰] Foundry uniquely branches both code and data simultaneously — feature branches can run entire ETL pipelines independently and verify data results before merging. Other platforms (Snowflake, Databricks, SAP BTP) branch code only; data must be recomputed per environment. (Ref: competitive_comparison.md Section 3.3)

[참여] In-house implementation:
- Changes are isolated via Git branches
- Changes are verified on the branch, then merged into Main
- Pull Request corresponds to Foundry's Proposal

## Multi-Ontology Structure

### Space-Ontology Mapping

[관찰→참여] No single monolithic ontology is created. Separate by domain, then connect. This pattern prevents change-impact explosion and enables independent team ownership.

```
Organization
 |-- Shared Ontology      (common entities: BusinessUnit, Product, Customer)
 |-- Domain Ontology A    (domain-specific entities)
 |-- Domain Ontology B    (domain-specific entities)
 +-- Domain Ontology C    (domain-specific entities)
```

### Connection Mechanisms

- **Interface**: [관찰→참여] Common shape that Object Types from multiple ontologies must implement
- **Shared Property**: [관찰→참여] A Property used across multiple ontologies, defined in a single location
- **Cross-reference rules**: [참여] Contracts for when an Object Type in Ontology A references an Object Type in Ontology B

### Data Sharing and De-identification

[관찰→참여] Federated 온톨로지에서 조직 간 데이터 공유 시:
- Canonical Data Model(CDM)이 공통 스키마를 정의 — CDM의 IP는 참여 조직이 소유
- 각 조직이 자체 데이터를 CDM에 매핑하는 변환 파이프라인이 필요
- PHI/PII 속성은 Property 정의 시점에 분류하고 마스킹 규칙을 적용 — 인덱싱 후 거버넌스 회고 적용은 비용이 크다

(Ref: RESEARCH_NOTES.md Section 9.2, NHS Federated Data Platform 사례)

### Multi-Ontology Design Patterns from Practice

[관찰→참여] **Federated ontology**: Each organizational unit operates its own ontology instance, connected via a common Canonical Data Model (CDM). Data ownership remains at the unit level; cross-unit sharing requires de-identification rules defined at the property level. (Pattern observed in NHS Federated Data Platform — Ref: NHS FDP docs)

[관찰→참여] **Process + Subject Matter separation**: Separate the workflow ontology (assignee, status, priority, SLA) from the domain ontology (business entities). Workflow patterns become domain-independent and reusable across different subject matter ontologies. (Pattern observed in Foundry Operational Process Coordination — Ref: Palantir use case docs)

## Governance

### Role Structure (Evolution by Phase)

[관찰→참여] Governance roles evolve as the organization matures. The North/South Ontology Team split (CodeStrap model) maps Semantic Layer ownership to the South team (data engineers) and Application Layer to the North team (domain experts + engineers). (Ref: RESEARCH_NOTES.md Section 13)

| Phase | Key Roles |
|:-----:|----------|
| 1 (Initial) | Program Lead, Ontology Lead, Data Lead |
| 2 (Expansion) | + Data Governance Admin |
| 3 (Maturity) | + Platform Governance Team |
| 4 (Enterprise) | + Ontology Product Manager (OPM) |

### Approval Authority

Impact Severity에 따른 승인 권한:

| Impact Severity | Approval Authority |
|----------------|-------------------|
| non_breaking | Ontology Lead alone |
| breaking_minor | Ontology Lead + business unit owner |
| breaking_major | Ontology Lead + Program Lead + executive sponsor |

Lifecycle Intent가 deprecation인 경우, Impact Severity 승인 요건에 추가로 Program Lead 승인과 grace period가 필요하다.

[참여] **Core principle**: When an ontology change directly affects operational metrics, it must not be approved solely by technical personnel.

### FDE (Forward Deployed Engineer) Operating Model

[관찰→참여] Foundry's FDE serves as a translator between domain experts and engineers. When building in-house, a substitute for the FDE role must be explicitly defined:
- Who handles domain translation
- Who builds the system
- Who supports user training/adoption

## AI/LLM Integration

### Ontology-Augmented Generation (OAG)

[관찰→참여] LLM 컨텍스트에 텍스트 문서가 아니라 온톨로지 객체(Object) 자체를 주입한다. Object의 Property와 Link는 구조적 바인딩(structural binding)을 형성하여 해석의 여지를 줄인다. 텍스트 기반 RAG(Retrieval-Augmented Generation)와의 차이: 구조화된 Object는 명확한 의미를 가지므로 할루시네이션이 감소한다. (Ref: RESEARCH_NOTES.md Section 14.3)

### AI Agent Permission Inheritance

[관찰→참여] AI 에이전트의 접근 범위 = 호출한 사용자의 접근 범위. Marking과 Permission이 AI 에이전트에도 동일하게 적용된다. 사용자에게 보이지 않는 데이터는 LLM에도 도달하지 않는다. 이 원칙이 없으면 AI가 사용자보다 더 많은 데이터에 접근하여 권한 상승(privilege escalation)이 발생한다. (Ref: RESEARCH_NOTES.md Section 14.3)

### Human-in-the-Loop Governance

[관찰→참여] AI 에이전트가 Action을 직접 실행하지 않고, Branch Proposal로 변경을 제안한다. 사람이 검토 후 승인/거절한다. AI FDE(LLM 기반 AI 에이전트)는 이 거버넌스 하에서 자연어로 Foundry를 조작하되, 모든 변경은 사람의 승인을 거친다. (Ref: concepts.md AI FDE 정의, RESEARCH_NOTES.md Section 13)

### AIP Logic Overview

[관찰] Foundry의 AIP(AI Platform)는 System of Record에서 System of Action으로의 전환을 구현한다. 온톨로지 위에서 LLM이 읽기(Object 조회)와 쓰기(Action 실행)를 모두 수행한다. 기업에 필요한 것은 저장소(repository)가 아니라 통합 읽기-쓰기(read-write) 아키텍처이다. (Ref: RESEARCH_NOTES.md Section 14.3)

## Code Generation (Codegen)

### OSDK Design Principles

[관찰] Foundry's OSDK follows 5 design principles: development acceleration (minimal code for ontology access), strong type safety (generated types mapped to ontology entities), centralized maintenance (Foundry as authoritative backend), built-in security (token-scoped to selected ontology subset), and ergonomic access (convenience for large-scale queries and writeback). A key design decision is **subset generation** — only the relevant portion of the ontology is generated, not the entire ontology. This benefits both performance (linear scaling with ontology shape, not size) and security (no access tokens for unneeded entities). (Ref: Palantir OSDK Overview docs)

[관찰→참여] The codegen pipeline is a schema-change impact detection mechanism: schema change -> type regeneration -> compile errors in referencing code. This pattern applies to any schema-based system, not just ontologies.

> **Note**: Implementation-level codegen rules (`[참여]` output structure, mapping table, template specifications) are defined in structure_spec.md "Codegen Output Structure" section. This document covers design principles only.

### Frontend Integration Pattern

[관찰→참여] 온톨로지 정의 → 타입 생성 → 타입 안전한 UI 컴포넌트의 전체 파이프라인은 범용적 설계 패턴이다:

1. **Schema → Type → UI 변경 감지**: 스키마(ontology) 변경 → 생성된 타입 변경 → UI 컴포넌트 컴파일 오류. 이 연쇄 변경 감지가 대규모 시스템의 안정성을 보장한다
2. **다형적 컴포넌트 렌더링**: 온톨로지의 Interface가 프론트엔드의 다형적 UI 렌더링으로 매핑된다. Interface를 구현하는 각 Object Type은 `$objectType` 필드로 구분되어 적절한 서브컴포넌트로 렌더링된다

[관찰] OSDK v2의 핵심 설계 결정:
- 성능이 온톨로지 전체가 아닌 형태(shape)에 비례하여 선형 스케일링
- Lazy loading (사용 시점에 로딩)
- 클라이언트-코드 분리 (라이브러리 업데이트 시 SDK 재생성 불필요)

(Ref: RESEARCH_NOTES.md Section 12)

## Project Methodology

### Four Criteria for Choosing a Starting Point

[관찰→참여] Derived from Foundry's AIP Bootcamp methodology (5-day sprint):

1. **Decision-based**: Criterion of "What decisions does the user make?"
2. **Use-case-driven**: Value description -> final decision -> intermediate decisions
3. **Parallel build**: Front-end (app with dummy data) + Data Engineering (pipeline) simultaneously
4. **Pragmatism**: An incomplete ontology that delivers value > a perfect ontology that delivers none

### Three Core Principles

[관찰→참여] These principles counter the anti-pattern of "complete the ontology before building apps":

1. **Start with what you can show in 5 days** — do not complete the ontology from the start
2. **Build and show** — iterate with users
3. **Prove small, scale big** — first success -> trust -> further approval

### Adoption Expansion Pattern

[관찰→참여] 온톨로지 도입은 3단계로 확장된다 (Airbus Skywise에서 관찰):
1. **Internal use**: 조직 내부의 단일 사용 사례에서 시작 (예: A350 생산 최적화)
2. **Partner extension**: 외부 파트너와 동일 온톨로지를 공유 (예: 공급업체, 항공사와 Skywise 연결)
3. **Industry platform**: 업계 표준 플랫폼으로 확장 (예: 100개+ 항공사가 동일 플랫폼 위에서 운영)

이 패턴의 설계 시사점: 초기 온톨로지가 단일 조직 전용으로 경직되면 외부 확장이 불가능하다. 확장을 위해서는 Multi-Ontology 구조와 Organization-level 접근 격리가 초기 설계에 포함되어야 한다. (Ref: RESEARCH_NOTES.md Section 9.1)

## Required Concept Categories

Concept categories that must be addressed in a Foundry-style ontology.

| Category | Description | Risk if Missing |
|----------|------------|----------------|
| Object Type definition | Structural definition of business entities | Data remains unstructured |
| Link Type definition | Explicit declaration of relationships between entities | Cannot connect or query across data |
| Data source binding | Mapping between Object Types and source data | Ontology is an empty shell |
| Action Type definition | Declaration of mutation operations and writeback | Read-only system, no decision capture |
| Change classification system | Impact Severity (non_breaking/breaking_minor/breaking_major) × Lifecycle Intent (immediate/deprecation) | Uncontrolled destructive changes |
| Governance roles | Explicit assignment of change approval authority | Unauthorized changes, operational errors |
| Codegen pipeline | Ontology -> types -> compile check | Cannot determine change impact scope |
| Data layer classification | Master / Transaction / Derived separation | Dependency direction unclear, unstable foundations |

## Bias Detection Criteria

Conditions that indicate structural deficiency in the ontology design:

- If only the Semantic Layer exists and the Kinetic Layer is entirely absent -> **read-only ontology (not executable)**. Decisions cannot be captured, organizational learning loop is broken
- If Object Types are abundant but Link Types are sparse -> **isolated entities (cannot connect)**. Graph navigation is impossible; users must guess JOIN logic
- If all domains are placed in a single ontology -> **monolithic ontology (change impact explosion)**. Every change risks cascading effects across unrelated domains
- If building without governance -> **uncontrolled changes (operational risk)**. No approval gate for changes that affect operational metrics
- If managing YAML without codegen -> **undetectable changes (manual tracking)**. Runtime errors instead of compile-time errors
- If adopting Foundry methodology without substituting the FDE role -> **unmet prerequisites (rules without enablement)**
- If Action Types lack writeback design -> **ephemeral decisions (no audit trail)**. User decisions are not recorded, preventing feedback loops
- If data-first instead of ontology-first -> **table-entity mapping trap**. Technical structures are mistaken for business concepts; schema changes break business logic
- If security is applied after indexing rather than at property definition time -> **retroactive governance (high remediation cost)**
- If the same real-world entity is modeled as separate Object Types per team -> **entity fragmentation**. Properties desynchronize across copies, violating the "one entity = one Object Type" principle

### Transfer Bias (전이 편향)

Foundry 패턴을 다른 시스템에 적용할 때 발생하는 편향:

- **Overfit Transfer (과적합 전이)**: Foundry 고유의 구현 세부사항(OSDK API, Object Storage V2 등)을 다른 시스템에 그대로 복제하려는 편향. [관찰→참여] 인라인 태그 중 `[관찰]`만으로 구성된 패턴을 다른 시스템에 적용하면 과적합 전이에 해당한다
- **Partial Transfer (불완전 전이)**: Foundry 패턴의 일부만 전이하여 전체 설계 의도가 훼손되는 편향. 예: Semantic Layer만 전이하고 Kinetic Layer를 생략하면 읽기 전용 시스템이 되어 조직 학습(decision capture via writeback)이 불가능해진다
- **Scale Mismatch Transfer (규모 부적합 전이)**: 엔터프라이즈 규모 패턴을 소규모 시스템에 그대로 적용하여 불필요한 복잡성을 초래하는 편향. 예: 3명이 사용하는 시스템에 Dynamic Layer 전체(Workflow, Rule, Permission)를 적용

## Reference Standards/Frameworks

| Standard | Application Area | Usage |
|----------|-----------------|-------|
| Palantir Foundry Ontology | Overall structure | Reference for Object Type / Link Type / Action Type patterns |
| Palantir OSDK | Codegen | Reference for TypeScript type generation patterns |
| Palantir Schema Migration | Change management | Destructive/non-destructive change classification and migration patterns |
| Palantir Governance & Markings | Governance | Phase-based role evolution, approval authority levels, mandatory access control |
| Palantir AIP Bootcamp | Methodology | 5-day MVP, prove small and scale big |
| Snowflake Semantic View / Databricks Metric View | Competitive reference | Data-first semantic layer alternatives; metric governance approach |
| SAP BTP CAP/CDS | Competitive reference | Domain-first modeling, Association vs Composition, declarative security (@restrict) |
| Forrester TEI Study | ROI reference | ROI 315%, payback period under 6 months (Ref: Forrester TEI of Palantir Foundry) |
| IDC MarketScape: Decision Intelligence 2024 | Market positioning | Foundry classified as Decision Intelligence platform |
| Gartner Magic Quadrant for Data Integration Tools | Market positioning | Foundry classified as Data Integration tool; dual identity (integration + decision) |

## Related Documents

- concepts.md — definitions of terms within this scope
- structure_spec.md — specific rules for physical layout, including codegen output structure (SSOT)
- competency_qs.md — questions this scope must be able to answer
- logic_rules.md — constraint conflict checking, reasoning logic
- dependency_rules.md — inter-ontology dependencies and mapping-related rules
- extension_cases.md — expansion scenarios
- conciseness_rules.md — conciseness rules, including entity-relation ratio thresholds
