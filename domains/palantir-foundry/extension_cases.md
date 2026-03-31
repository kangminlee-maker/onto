---
version: 3
last_updated: "2026-03-31"
source: manual
status: established
---

# Palantir Foundry Domain — Extension Cases

Classification axes: **trigger** (내부/외부) × **impact** (단일 레이어/다중 레이어/다중 온톨로지/전체).

## Case 1: Adding a New Object Type [참여]
내부 × 단일 레이어. A new Object Type (e.g., Subscription) is added to an existing ontology.
- [ ] Addable without changing existing Object Types or Link Types?
- [ ] Re-running codegen produces no compile errors in existing code?
- [ ] New OT satisfies isolated element check (≥1 Link Type)?
- **Files**: structure_spec.md, concepts.md, dependency_rules.md | **CQ**: CQ-SEM-01, CQ-SEM-02, CQ-SEM-06, CQ-X-01

## Case 2: Adding a New Private Ontology [참여]
내부 × 다중 온톨로지. A new domain-specific ontology is built independently from existing ontologies.
- [ ] Shared Ontology OTs referenced through Interfaces?
- [ ] New ontology addable without changing existing ontologies?
- [ ] Common attributes defined as Shared Properties?
- **Files**: dependency_rules.md, structure_spec.md, domain_scope.md | **CQ**: CQ-X-02, CQ-X-03, CQ-SEM-04

## Case 3: Property Type Change [참여]
내부 × 단일 레이어. A Property's base type is changed (e.g., Integer to Decimal).
- [ ] Automatically classified as breaking_major?
- [ ] Codegen detects change via compile errors in referencing code?
- [ ] Migration path exists for Backing Dataset and Writeback Dataset?
- **Files**: structure_spec.md, logic_rules.md, dependency_rules.md | **CQ**: CQ-SEM-09, CQ-X-01, CQ-DAT-03

## Case 4: Adding a Business Unit [참여]
외부 × 다중 레이어. A new business unit is added to the organization.
- [ ] Instance addition distinguished from schema change?
- [ ] Enum value addition handled as breaking_minor?
- [ ] Existing Derived Data aggregation includes new unit automatically?
- **Files**: domain_scope.md, logic_rules.md, structure_spec.md | **CQ**: CQ-SEM-05, CQ-SEM-09, CQ-DAT-05

## Case 5: Ontology Rule Change [참여]
외부 × 다중 레이어. A business rule encoded in the ontology changes (e.g., calculation period 60→90 days).
- [ ] Classified as breaking_major when directly affecting operational outputs?
- [ ] Approval process includes executive approval?
- [ ] Retroactive vs prospective application distinguished?
- **Files**: logic_rules.md, domain_scope.md, structure_spec.md | **CQ**: CQ-KIN-01, CQ-DYN-06, CQ-X-01

## Case 6: External Standard Change [참여]
외부 × 다중 레이어. An external dependency changes: Foundry API version upgrade, OSDK breaking change, or upstream data source schema restructuring.
- [ ] Affected OTs, Properties, and Action Types identifiable via codegen impact analysis?
- [ ] Old and new versions coexist during migration (parallel operation)?
- [ ] Deprecation process removes old definitions after grace period?
- **Files**: dependency_rules.md, structure_spec.md, logic_rules.md, domain_scope.md | **CQ**: CQ-SEM-09, CQ-X-01, CQ-X-05

## Case 7: Adding Currency Handling [참여]
외부 × 다중 레이어. Multi-currency support must be added for global operations.
- [ ] Currency Property addable as nullable (non_breaking)?
- [ ] Conversion logic separated into a Function?
- [ ] Multi-currency aggregation runs without affecting single-currency Derived Data?
- **Files**: structure_spec.md, concepts.md, logic_rules.md | **CQ**: CQ-SEM-01, CQ-KIN-02, CQ-DAT-05

## Case 8: Expanding Automation Scope [참여]
내부 × 다중 레이어. After automating one domain, another domain's operations are also automated.
- [ ] No circular dependency when new ontology references existing structure?
- [ ] Shared Ontology Master Data supports both domains?
- [ ] Governance applies independently per ontology?
- **Files**: dependency_rules.md, domain_scope.md, structure_spec.md | **CQ**: CQ-X-02, CQ-X-03, CQ-DAT-02

## Case 9: AIP Agent Integration [관찰→참여]
외부 × 다중 레이어. An LLM-based AI agent is connected to the ontology, reading Objects and executing Actions via natural language.
- [ ] Action Type preconditions sufficient to prevent unintended AI-initiated mutations?
- [ ] Marking propagation prevents agent from accessing restricted data?
- [ ] Human-in-the-loop governance maintained (AI proposes via Branch Proposal)?
- [ ] AI agent receives ontology objects (not unstructured text) as context — OAG pattern applied?
- [ ] AI agent's data access scope verified to equal the invoking user's scope (no privilege escalation)?
- [ ] AI-proposed schema changes (new Object Types, Property modifications) routed through Branch Proposal?
- [ ] Action Type 2-tier design (declarative rules default, Function-Backed as escape hatch) maintained when AI generates Action definitions?
- **Files**: logic_rules.md, structure_spec.md, dependency_rules.md, domain_scope.md, concepts.md | **CQ**: CQ-KIN-01, CQ-DYN-01, CQ-DYN-02, CQ-DYN-06, CQ-AI-01, CQ-AI-02, CQ-AI-03, CQ-AI-04

## Case 10: Organizational Restructuring [참여]
외부 × 다중 온톨로지. Business units are merged or split, requiring restructuring of ontology boundaries.
- [ ] Shared Ontology Master Data absorbs restructuring without breaking Private Ontologies?
- [ ] Marking and Permission boundaries reassigned to new organizational structure?
- [ ] Cross-ontology Interface contracts maintained through transition?
- **Files**: domain_scope.md, dependency_rules.md, structure_spec.md | **CQ**: CQ-X-02, CQ-DYN-01, CQ-DYN-02

## Case 11: Platform Adoption Observation [관찰]
외부 × 전체. Observing how an organization adopts Foundry — from AIP Bootcamp through FDE-led expansion to self-sustaining operation.
- [ ] Four starting-point criteria documented (decision-based, use-case-driven, parallel build, pragmatism)?
- [ ] Governance role evolution (Phase 1-4) mapped to in-house equivalents?
- [ ] FDE role explicitly substituted?
- **Files**: domain_scope.md, concepts.md | **CQ**: CQ-X-04, CQ-X-06

## Case 12: Technology Stack Transfer ★ [관찰→참여]
내부 × 전체. **Primary domain-purpose verification scenario.** Foundry architecture (3-layer, codegen, multi-ontology) is implemented using a different technology stack (e.g., YAML + TypeScript).
- [ ] Three-layer separation mappable to target system architecture?
- [ ] Codegen pipeline functions without Foundry-specific components?
- [ ] Multi-ontology structure (Shared + Private, Interface cross-reference) implementable with standard tools?
- [ ] Marking propagation and Permission structures implementable without Foundry's security engine?
- [ ] Source-writeback separation achievable without Foundry's Object Storage?
- [ ] Resource Status Lifecycle operates independently of Foundry?
- [ ] All `[관찰→참여]` patterns sufficient to produce a working system skeleton?
- [ ] AI/LLM integration pattern (OAG, permission inheritance, human-in-the-loop) implementable without Foundry's AIP?
- [ ] Pipeline quality stages (Raw → Clean → Transform) achievable with target stack's ETL tools?
- [ ] Testing infrastructure (DAO pattern, mocks, schema verification) operational without Foundry Mocks?
- [ ] Transfer bias checks applied — no overfit transfer (copying [관찰]-only patterns), no partial transfer (missing Kinetic Layer), no scale mismatch?
- **Files**: ALL domain files | **CQ**: CQ-X-07, CQ-X-06, CQ-X-01, CQ-SEM-02, CQ-SEM-03, CQ-SEM-06, CQ-DAT-03, CQ-DAT-06, CQ-DYN-01, CQ-DYN-02, CQ-AI-01, CQ-AI-02, CQ-DAT-07, CQ-KIN-05

## Case 13: Scale Transfer (enterprise → small team) [관찰→참여]
내부 × 다중 레이어. Enterprise-scale patterns are adapted for a small team (single domain, simplified governance).
- [ ] Dynamic Layer omittable without breaking Semantic + Kinetic layers?
- [ ] Multi-ontology collapsible to single ontology without losing structural integrity?
- [ ] Governance simplifiable without removing change classification?
- **Files**: domain_scope.md, structure_spec.md, logic_rules.md, conciseness_rules.md | **CQ**: CQ-X-07, CQ-DYN-01, CQ-DYN-06

## Case 14: Private Ontology Retirement [참여]
내부 × 다중 온톨로지. A Private Ontology is decommissioned — OTs, Action Types, and data migrated or archived.
- [ ] Removable without changing Shared Ontology?
- [ ] Interface implementations migrated or deprecated?
- [ ] Resource Status Lifecycle (Deprecated → Retired) cascades correctly?
- [ ] Cross-ontology Link Types cleaned up (no dangling references)?
- **Files**: dependency_rules.md, logic_rules.md, structure_spec.md | **CQ**: CQ-X-02, CQ-X-03, CQ-X-05, CQ-SEM-09

## Case 15: Foundry Pattern-Based New System Design ★ [관찰→참여]
내부 × 전체. **Domain-purpose verification scenario.** A new operational system is designed from scratch using Foundry patterns as the blueprint.
- [ ] Ontology-first principle guides initial OT identification from business decisions (not tables)?
- [ ] Three-layer architecture provides clear separation of concerns for the design team?
- [ ] Codegen pipeline planned as part of initial architecture (not retrofitted)?
- [ ] Data layer hierarchy (Master → Transaction → Derived) guides data modeling?
- [ ] Change classification established before the first schema change?
- [ ] Competitive platform comparison informs architecture trade-off decisions?
- [ ] AIP Bootcamp methodology (prove small, scale big) applicable to project timeline?
- [ ] AI/LLM integration architecture designed (OAG context delivery, permission inheritance, human review gate)?
- [ ] Data pipeline quality stages (Raw → Clean → Transform) planned as part of data architecture?
- [ ] Testing strategy defined (DAO abstraction, mock infrastructure, E2E pipeline verification)?
- [ ] Transfer bias detection criteria applied to prevent overfit/partial/scale-mismatch transfer?
- **Files**: ALL domain files | **CQ**: CQ-X-06, CQ-X-07, CQ-SEM-03, CQ-SEM-06, CQ-KIN-01, CQ-KIN-03, CQ-DAT-01, CQ-DAT-06, CQ-AI-01, CQ-AI-03, CQ-DAT-07, CQ-X-08

## Case 16: Implementation Testing Strategy [참여]
내부 × 다중 레이어. Testing infrastructure is established to validate that the ontology implementation matches its design specification across all layers.
- [ ] Business logic isolated from platform via DAO pattern — unit-testable with mock implementations?
- [ ] Mock Object reads and mock Action executions verify parameter correctness and side effects?
- [ ] Backing Dataset schema verified to match Object Type Property types (integration test)?
- [ ] Writeback Dataset schema verified to align with current Object Type definition?
- [ ] Codegen output compiles without errors against current ontology (schema verification)?
- [ ] End-to-end pipeline (Source → Raw → Clean → Transform → Ontology → codegen → compile) passes?
- [ ] Pipeline naming conventions (snake_case, distinctive portion first) enforced?
- **Files**: structure_spec.md, logic_rules.md, dependency_rules.md | **CQ**: CQ-KIN-05, CQ-DAT-07, CQ-DAT-08, CQ-X-08

---

## Scenario Interconnection Matrix

| Scenario | Triggers / Interacts With | Reason |
|---|---|---|
| 1 (New OT) | → 2 (New Ontology) | Many OTs may warrant a new Private Ontology |
| 2 (New Ontology) | → 8 (Expanding Automation) | New ontology enables new automation domain |
| 3 (Property Change) | ← 6 (External Standard) | External standard change may force property type changes |
| 4 (New BU) | → 10 (Org Restructuring) | BU addition may be part of larger restructuring |
| 6 (External Standard) | → 3 (Property Change) | API/schema changes propagate to property definitions |
| 9 (AIP Agent) | → 5 (Rule Change) | AI-initiated actions may trigger rule review |
| 10 (Org Restructuring) | → 14 (Ontology Retirement) | Merged BU may retire one ontology |
| 9 (AIP Agent) | → 16 (Testing) | AI agent testing requires mock infrastructure |
| 12 (Stack Transfer) | ↔ 15 (New System Design) | Mutual: transfer experience informs new design and vice versa |
| 13 (Scale Transfer) | → 12 (Stack Transfer) | Scale reduction is a subset of transfer decisions |
| 14 (Ontology Retirement) | → 2 (New Ontology) | Retired ontology may be replaced by new one |
| 16 (Testing) | ← 12 (Stack Transfer) | Transfer validation requires testing infrastructure |

## ME Cross-Verification (9-15 vs 1-8)

| New | Unique Trigger | Distinct From |
|---|---|---|
| 9 | AI/LLM agent connection | 1-8 assume human-initiated changes |
| 10 | Organizational boundary change | 4 adds a BU; 10 restructures ownership |
| 11 | Adoption methodology observation | 1-8 are design changes; 11 is process observation |
| 12 | Technology platform replacement | 1-8 operate within existing stack |
| 13 | Scale reduction | 1-8 assume enterprise scale |
| 14 | Ontology decommissioning | 2 adds ontologies; 14 removes them |
| 15 | Greenfield design from patterns | 1-8 modify existing systems; 15 creates new |
| 16 | Implementation testing infrastructure | 1-15 focus on design verification; 16 validates implementation |

## Related Documents
- domain_scope.md — layer and scope to which each scenario pertains
- logic_rules.md — logic rules that may be violated during extension
- dependency_rules.md — new dependency relationships formed during extension
- structure_spec.md — structural requirements that extensions must satisfy
- competency_qs.md — CQ codes that each scenario validates
- concepts.md — term definitions referenced in verification checklists
