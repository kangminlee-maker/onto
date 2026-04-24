# command-catalog-templates/

Template files for catalog-derived markdown artifacts.

Populated in **P1-2b** (Phase 1, catalog SSOT — markdown derive). This
directory is intentionally empty except for this README during P1-2a
(generator infrastructure only).

## Convention

Each catalog entry with a `doc_template_id` references a file here named
`{doc_template_id}.md.template`. The generator
(`scripts/generate-command-catalog-derived.ts`) combines the template with
the entry's declared fields to emit derived markdown under `.onto/commands/`.

## Authority

Template placement and consumption are defined in
`development-records/evolve/20260423-phase-1-catalog-ssot-design.md` §7.2.
