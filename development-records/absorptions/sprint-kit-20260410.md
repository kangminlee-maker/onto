# sprint-kit Absorption Record

**Date**: 2026-04-10
**Source**: kangminlee-maker/sprint-kit @ 769bff8 (main branch, cleaned)
**Target**: onto/src/core-runtime/
**Git strategy**: cp + commit (history not preserved, provenance via commit messages)

## What was absorbed

| Source | Target | Notes |
|---|---|---|
| src/kernel/ | scope-runtime/ | Event pipeline, reducer, state machine, constraint pool, gate guard. 11 source + 9 test files |
| src/scanners/ (essential) | readers/ | scan-local, scan-vault, scan-tarball, ontology-index/query/resolve, file-utils, brownfield-builder, code-chunk-collector, figma-adapter. generators/ and patterns/ excluded |
| src/commands/ | design/commands/ | start, align, draft, apply, close, stale-check, error-messages |
| src/renderers/ | design/renderers/ | align-packet, draft-packet, scope-md, format |
| src/compilers/ | design/adapters/code-product/compile/ | compile, compile-defense |
| src/parsers/ | design/adapters/code-product/parsers/ | brief-parser |
| src/validators/ | design/adapters/code-product/validators/ | validate |
| src/config/ | design/config/ | project-config |
| src/logger.ts | logger.ts | Shared logger utility |
| (new) | design/adapters/methodology/ | adapter, perspectives/authority-consistency, scope-types/process, v9.3 fixture |
| (new) | design/cli.ts | CLI entry point for onto design subcommand |

## What was NOT absorbed

- `src/scanners/generators/` — Language-specific code parsers (224 type errors, ~10% coverage). Deferred until code-product adapter activation with test coverage first.
- `src/scanners/patterns/` — Code pattern detection (36 type errors). Deferred. Stub created at `readers/patterns/index.ts`.
- `src/index.ts` — Package export. Not needed in onto.
- `scopes/`, `domains/`, `sources/` — Sprint-kit project artifacts.
- `dev-docs/` — Reference only.

## TypeScript strict compliance

onto strict config (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes) applied.
Total type errors fixed: ~160 across all phases.

Fix discipline followed:
- Cluster B (exactOptionalPropertyTypes): `| undefined` added to type declarations only
- Cluster A (noUncheckedIndexedAccess): `!` non-null assertions in test files
- start.ts: `!` assertion only (19 errors, no runtime changes)

## Test results

- **38 test files**, **952 tests passing**, **5 skipped** (patterns/ dependency)
- vitest added as devDependency, configured for scope-runtime/readers/design paths
- Sprint-kit baseline: 47 files, 1,124 tests — gap is the excluded generators/patterns tests

## Dependencies added

- `zod: ^4.3.6` (new)
- `yaml: ^2.8.1 → ^2.8.2` (bump)
- `@types/node: ^24.6.0 → ^25.3.5` (major bump)
- `tsx: ^4.20.6 → ^4.21.0` (bump)
- `vitest: ^4.0.18` (new)

## Relationship to podo

Complete separation. No re-speak/sprint-kit connection remains.
