---
version: 3
last_updated: "2026-03-31"
source: manual
status: established
---

# Palantir Foundry Domain — Logic Rules

## Object Type Definition Rules

- Every Object Type must have a primary_key defined. An Object Type without a primary_key cannot uniquely identify instances, making Link Type connections impossible
- If Properties with the same name within an Object Type are defined with different types, it is a contradiction. Resolve by: (a) renaming one Property to distinguish meaning, or (b) extracting as Shared Property per conciseness_rules.md Section 1 criteria
- An Object Type's description and its properties must describe the same subject. If the description says "Order" but the properties contain only attributes unrelated to orders, it is a contradiction
- Enum values must be mutually exclusive (ME). A single instance must not be able to hold two Enum values simultaneously

## Link Type Rules

- The direction of a Link Type (source -> target) must match the business meaning. In "Order has Payment," Order is the source and Payment is the target
- Cardinality must match actual business rules. If "1 order = 1 payment," then one-to-one; if "1 order = N payments," then one-to-many. Cardinality errors break data integrity
- Multiple Link Types with different meanings may exist for the same source-target pair. In such cases, each Link Type's meaning must be distinguishable

## Change Classification Rules

- 변경은 두 개의 직교축으로 분류된다: Impact Severity (non_breaking / breaking_minor / breaking_major)와 Lifecycle Intent (immediate / deprecation). Impact Severity와 Lifecycle Intent는 직교축이다. 단일 변경에 두 축의 값이 동시에 부여된다
- Impact Severity 값은 상호 배타적(ME)이다. 단일 변경은 non_breaking, breaking_minor, breaking_major 중 정확히 하나의 값을 가진다
- breaking_major is not a superset of breaking_minor. Each classification is determined by independent criteria (impact scope, degree of compatibility breakage)
- Changing a Property type (e.g., String -> Integer) is always breaking_major + immediate. This is because existing data requires conversion
- Adding an enum value is breaking_minor + immediate. This is because existing code may not handle the new value
- Removing an enum value is breaking_major + deprecation. This is because existing data may be using that value; grace period is required before removal

## Governance Rules

- Approval authority level is determined by Impact Severity. Lifecycle Intent가 deprecation인 경우 추가 승인 요건이 적용된다. Approval cannot proceed without both axes classified
- Changes that directly affect operational metrics require additional executive approval regardless of Impact Severity or Lifecycle Intent. (Ref: domain_scope.md "Approval Authority")
- Deprecation (Lifecycle Intent) must include a grace period. Deprecation without a grace period is functionally identical to immediate removal and violates the obligation to provide advance notice to integrated systems

## Data Layer Rules

- Lower layers (Master Data) do not reference upper layers (Transaction, Derived). Reverse references create circular dependencies that prevent guaranteed data update ordering
- Derived Data must be traceable back to source records in the Transaction and Master layers. If tracing back is impossible, auditing is impossible
- Master Data changes propagate to all upper layers. Therefore, Master Data changes have the widest impact scope and tend to be classified as breaking_major

## Temporal and Ordering Rules

[관찰→참여] Action execution and Rule evaluation follow deterministic ordering. Unpredictable ordering breaks transactional guarantees. (Ref: Palantir Action Types Overview)

- Rule evaluation within an Action is sequential. Later rules on the same property override earlier ones. If the final value depends on evaluation order and the order is not intentional, this is a latent conflict
- When a webhook is configured as writeback, it executes before other rules. If the webhook fails, all changes are cancelled — no partial commits occur. This is a simplified saga pattern: external system confirmation is a precondition for ontology mutation
- Function-Backed Actions execute asynchronously relative to the caller. The caller receives a confirmation that the Action was submitted, not that it completed. Design consuming code to handle eventual consistency, not immediate state change
- Workflow Rule triggers (event-driven Actions) execute after the triggering event commits. A Rule triggered by "Property X changed" observes the committed value, not an intermediate value. Chained Rules (Rule A triggers event -> Rule B fires) execute sequentially in commit order

## Constraint Conflict Patterns

[관찰→참여] Constraint conflicts arise when independently valid rules produce contradictions when combined. Detection requires cross-rule analysis, not single-rule inspection.

### Precondition-Postcondition Conflicts

- If an Action Type's submission criteria (precondition) and its ontology rules (postcondition) contradict each other, that Action is non-executable. Example: submission criteria requires status = "active" but the rule sets status = "closed" — the next invocation of the same Action on the same object will always fail
- If a postcondition creates a state that violates an invariant defined on the Object Type (e.g., setting a required Property to null), the Action commits but produces an invalid object. Validate postcondition states against Object Type constraints at design time

### Permission-Action Authorization Conflicts

- [관찰→참여] Marking (mandatory, AND-evaluated, restricts access) and role-based Permission (discretionary, expands access) operate in opposite directions. A user with the correct role but missing a required Marking cannot execute the Action. Conflicts arise when Action authorization checks role only and ignores Marking — the Action appears authorized but data access is denied at runtime. (Ref: Palantir Markings docs)
- If an Action modifies an Object protected by a Marking that the Action's executor does not possess, the Action fails at execution time, not at definition time. Validate that the Action's expected executors hold all required Markings

### Concurrent Action Race Conditions

- If the postconditions of Action Types that can execute simultaneously on the same Object conflict, there is a race condition risk. Example: Action A sets priority = "high" while Action B sets priority = "low" on the same Object
- Resolution: (a) define Object-level locking via submission criteria (check version/timestamp), or (b) design Actions so that concurrent execution on the same Object is impossible (sequential Workflow), or (c) accept last-write-wins semantics and document this explicitly

### Marking AND Logic vs Permission OR Logic

- [관찰→참여] Multiple Markings on a resource are AND-evaluated: a user must hold all Markings. Multiple role grants are OR-evaluated: any one sufficient role grants access. When both mechanisms apply to the same resource, the effective access is: (any role grants access) AND (all Markings are held). Misunderstanding this interaction produces false expectations about who can access what

### Schema-Level Constraint Declaration

[참여] Constraints belong at the schema level (ontology definition), not at the application level. When constraints are defined in consuming applications instead of the ontology, different applications may enforce different rules, producing inconsistent data.

- Value Type constraints (regex, range, enum, uniqueness)는 온톨로지 정의에서 선언적으로 정의되어야 한다. 애플리케이션 코드에서 정의하면 소비자마다 다른 규칙이 적용될 수 있다
- 온톨로지에서 선언된 constraint는 모든 소비 경로(OSDK, API, UI)에 일관되게 적용되어야 한다. 특정 소비 경로에서만 검증하는 것은 불완전한 제약이다
- Constraint 변경은 영향 범위 분석이 필요하다. regex 패턴 변경은 기존 데이터의 유효성을 무효화할 수 있으므로 breaking_minor 이상으로 분류한다

## Data Integrity Rules

[관찰→참여] The ontology sits atop physical data. Schema mismatches between the ontology definition and the backing data produce silent errors or runtime failures. (Ref: Palantir Data Integration docs)

- Backing Dataset schema must be consistent with Object Type definition. If the Object Type declares a Property of type Integer but the Backing Dataset column is String, queries may return incorrect results or fail. Verify type alignment after Pipeline transforms and before ontology binding
- Writeback Dataset captures user edits as a separate layer from the Backing Dataset. If Writeback Dataset schema diverges from the Object Type definition (e.g., after a Property type change), existing writeback records become unreadable. Property type changes require Writeback Dataset migration
- Source-writeback separation must be maintained: the Backing Dataset (source) is never directly modified by Actions. All user mutations are recorded in the Writeback Dataset. Violating this separation breaks the audit trail and rollback capability. Cross-reference: structure_spec.md "Data Integration Structural Requirements"

## Pipeline Quality Rules

[관찰→참여] Data pipelines follow a staged quality progression. Each stage has a distinct purpose, and skipping stages introduces quality gaps that compound downstream.

- 파이프라인은 Raw → Clean → Transform의 3단계를 따른다. Raw는 소스 시스템 원본, Clean은 기본 정제(타입 정렬, null 처리, 중복 제거), Transform은 사용 사례별 변환이다
- Clean에서 Transform으로 가는 중간 변환 단계는 항상 존재해야 한다. Clean에서 직접 Ontology에 바인딩하면 사용 사례별 변환 로직이 바인딩에 섞여 유지보수가 어렵다
- 네이밍 규칙: Dataset/Column 이름은 snake_case, 고유 부분(distinctive portion)을 이름 앞에 배치, 약어 사용 금지, 번호 증분(dataset1, dataset2) 금지
- 각 파이프라인 단계의 출력 Dataset은 독립적으로 검증 가능해야 한다. Clean 단계 출력이 올바른지 확인하지 않고 Transform으로 진행하면, 오류의 원인 추적이 어렵다

## Codegen Logic

[참여] Codegen rules are defined in structure_spec.md "Codegen Output Structure (SSOT)." This section defines the logical inference and detection rules that operate on that structure. It does not redefine generated file layout, type naming conventions, or subset generation principles.

### Type Inference Rules

- Object Type -> TypeScript interface: each Property becomes a readonly field. The generated type is the contract between ontology definition and application code. If a Property is nullable in the ontology, the generated field type includes `| undefined`
- Link Type -> reference type with direction encoded in the name. The generated type enforces cardinality at the type level: one-to-one produces a single reference, one-to-many produces an array
- Enum -> union type with literal values. The set of literal values is exhaustive. Adding a value requires regeneration; consuming code that does not handle the new value produces a compile error (this is the intended detection mechanism)

### Breaking Change Detection Logic

- Schema change -> type regeneration -> compile errors in referencing code. This converts runtime errors into compile-time errors. The number of compile errors equals the impact scope of the change
- Property type change (e.g., String -> Integer) produces type mismatch errors at every usage site. This is always breaking_major
- Property removal produces "property does not exist" errors. This is breaking_major + deprecation (grace period required)
- New required Property (non-nullable without default) produces errors in every Action that creates the Object Type without providing the new value

## Multi-Ontology Consistency Rules

[관찰→참여] In multi-ontology environments, consistency across ontology boundaries is maintained through Interface contracts and Shared Properties. Direct cross-ontology references without these mechanisms destroy ontology independence.

- An Object Type that implements an Interface must include all Properties defined by that Interface. Partial implementation is a contradiction. Cross-reference: structure_spec.md "Multi-Ontology Connection Structure"
- Changing the type of a Shared Property triggers breaking_major for all referencing Object Types across all ontologies that use that Shared Property. Impact scope analysis must span ontology boundaries
- Cross-references between ontologies must be made only through Interface or Shared Property. Direct references (Object Type A in Ontology 1 directly links to Object Type B in Ontology 2) create tight coupling that prevents independent ontology evolution
- Interface compliance verification: when an Object Type claims to implement an Interface, verify that (a) all Interface Properties exist with matching types, (b) all Interface Link Type Constraints are satisfied, and (c) the Object Type does not redefine an Interface Property with a different type

## AI Agent Authorization Rules

[관찰→참여] AI agents operating on the ontology are subject to the same authorization model as human users, plus additional constraints to prevent autonomous mutations.

- AI 에이전트의 데이터 접근 범위는 호출한 사용자의 접근 범위를 초과할 수 없다. Marking과 Permission이 동일하게 적용된다. AI 에이전트에게 별도의 확장 권한을 부여하면 privilege escalation 경로가 생긴다
- AI 에이전트가 제안한 ontology 변경(Object 생성/수정/삭제, Action 실행)은 Branch Proposal을 통해 사람의 검토를 거쳐야 한다. 직접 Main에 커밋하는 것은 거버넌스 우회이다
- AI 에이전트가 Action을 실행할 때, Action Type의 submission criteria(precondition)가 AI 에이전트에게도 동일하게 적용된다. AI가 precondition을 우회하는 것은 허용되지 않는다
- [관찰→참여] Ontology-Augmented Generation(OAG): AI 에이전트에게 컨텍스트를 제공할 때, 텍스트 문서가 아닌 온톨로지 객체(Object의 Property와 Link)를 주입한다. 구조화된 데이터는 해석의 여지가 적어 할루시네이션을 줄인다

## Resource Status Logic

[관찰→참여] Ontology resources follow a lifecycle that governs their availability and stability guarantees. Status transitions are unidirectional within the standard path and affect all dependent resources.

### Status Lifecycle (5-stage)

| Stage | Meaning | Allowed Transitions |
|-------|---------|---------------------|
| Draft | Under construction, not yet available to consumers | -> Experimental |
| Experimental | Available for testing, no stability guarantees | -> Stable, -> Deprecated |
| Stable | Production-ready, breaking changes require full governance | -> Deprecated |
| Deprecated | Scheduled for removal, grace period active | -> Retired |
| Retired | Removed from active ontology, retained in history | (terminal) |

- Backward transitions (e.g., Stable -> Experimental) are prohibited. If a Stable resource needs fundamental redesign, deprecate it and create a new resource starting at Draft
- The Draft -> Stable shortcut is prohibited. All resources must pass through Experimental to verify consumer compatibility before receiving stability guarantees

### Hierarchical Cascade Rules

- If a parent Object Type's status transitions to Deprecated, all child Object Types (connected via Link Types where the parent is the source) must be evaluated for deprecation. Children that have no other active parent remain functional but lose their dependency anchor
- An Experimental parent cannot contain Stable children. The stability guarantee of a child cannot exceed the stability guarantee of its parent. If a child needs to be Stable, its parent must first transition to Stable
- Shared Property status constrains referencing Object Types: a Deprecated Shared Property forces all referencing Object Types to plan migration to an alternative Property within the grace period

## External References

1. Palantir Action Types & Rules — rule evaluation order, webhook transaction guarantees, submission criteria (Ref: Palantir Action Types Overview)
2. Palantir Markings & Object Security Policies — mandatory access control, AND-evaluation, Marking propagation (Ref: Palantir security docs)
3. Palantir Data Integration — Pipeline, Backing Dataset, Writeback Dataset, schema consistency (Ref: Palantir Data Integration docs)
4. Palantir OSDK — codegen pipeline, type inference, subset generation (Ref: Palantir developer docs)

## Related Documents
- concepts.md — definitions of terms used in each rule (Action Type, Marking, Backing Dataset, codegen, etc.)
- dependency_rules.md — dependency direction rules, Pipeline data flow
- structure_spec.md — structural required elements, Codegen Output Structure (SSOT)
- domain_scope.md — three-layer architecture scope, change classification definitions
- competency_qs.md — questions this logic must be able to answer
- conciseness_rules.md — entity-relation ratio thresholds
