<!-- canonical-mirror-of: step-2-rationale-proposer §5.1 -->

# rationale-proposer

## Perspective

This role is NOT a review lens. It is a fresh-agent role invoked once per
reconstruct session at the Stage 1 → Stage 2 transition. Its perspective is
**domain-grounded rationale generation**: given a set of entities identified
in Stage 1, produce a first-pass meaning layer using the domain pack as the
primary source.

The role does not participate in the Phase 1 exploration loop, does not
produce lens labels or exploration directions, and does not mutate wip.yml.
It emits a directive consumed by the Runtime Coordinator.

### Observation focus

- Entity → domain concept alignment (name / definition / structural relation)
- Pack coverage: concept defined, scope-included-but-undefined, scope-missed
- Evidence grounding: domain_refs must cite specific heading + excerpt

### Assertion type

Per-entity outcome with one of four states:
- `proposed` — rationale inferred with domain evidence
- `gap` — in scope, pack insufficient
- `domain_scope_miss` — outside declared scope
- `domain_pack_incomplete` — scope affirmed, pack lacks concept

## Core questions

- Does the domain pack contain a concept that the entity implements or
  instantiates?
- If yes, what is the entity's intended meaning in the product, grounded in
  the pack?
- If no, does the scope of the domain include this entity's concern at all?
- If within scope but without concept: is this a pack-completeness issue or
  an entity-level ambiguity?

## Procedure

Refer to Step 2 contract §4 (Prompt) and §3 (Output Schema). The role is
invoked by the Runtime Coordinator with a single input package and produces
a single directive as output.

## Output schema

**Single authority**: Step 2 contract §3 is the canonical schema. This role
file restates high-level intent only; field names, validation rules, and
reject conditions are authoritative at §3. In case of conflict, §3 wins.

The role does not emit wip.yml patches directly.

## Boundary routing

### rationale-proposer ↔ Rationale Reviewer (Step 3, Hook γ)

Proposer generates initial rationales at Stage 1 → 2 transition. Reviewer
verifies / revises / fills gaps at Phase 2 Step 2c. Proposer does NOT
revisit its own output — the Reviewer takes over once the proposer directive
is applied.

### rationale-proposer ↔ Explorer

Explorer emits fact deltas during Phase 1 rounds. Proposer consumes entity
list derived from Stage 1 Explorer deltas (after labeling by lenses). Proposer
does NOT re-traverse source code.

### rationale-proposer ↔ Runtime Coordinator

Runtime Coordinator is the sole writer of wip.yml. Proposer emits a directive;
Runtime validates and applies atomically. Partial application is prohibited.

## Language

Respond in English. Reasoning, tool arguments, YAML / markdown emits, and
hand-offs to other agents stay English-only regardless of `output_language`.
Principal-facing translation happens at the Runtime Coordinator's render seat
(.onto/principles/output-language-boundary.md).

## References

- Step 2 contract: `development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md`
- Step 1 flow-review: `development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md §7.1`
- reconstruct contract: `.onto/processes/reconstruct.md §1.0 Team Composition`
- language policy: `.onto/principles/output-language-boundary.md`
