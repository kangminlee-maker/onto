---
as_of: 2026-04-21
status: complete
functional_area: review-runtime-legacy-retirement
purpose: |
  P9 Runtime Legacy Cleanup track (2026-04-21) 전수 완결 기록. Review UX
  Redesign P7 (visible surface 제거) 의 후속으로 runtime 레이어에 남아있던
  legacy 구조물을 단계적으로 제거. 6 sub-phase PR (#161~#166) 로 진행.
source_refs:
  p7_handoff: "development-records/evolve/20260421-review-ux-redesign-completion.md"
  design_doc: "development-records/evolve/20260420-review-execution-ux-redesign.md"
  sketch_v3: "development-records/evolve/20260418-execution-topology-priority-sketch.md"
---

# P9 Runtime Legacy Cleanup — Completion Record (2026-04-21)

## 1. 배경

Review UX Redesign (P1~P8) 은 `execution_topology_priority` array 를 대체하는
user-facing 6-axis `review:` block 을 도입했고, P7 Phase 1 에서 user 가
보는 표면 (5 docs) 에서 legacy 언급을 제거했다. 하지만 runtime 코드
(source file 18+ 개) 에는 backward compat 용 legacy 구조물이 남아있었다:

- `execution_topology_priority` ladder walk (resolver)
- `OntoConfig.execution_topology_priority` / `execution_topology_overrides` fields
- opt-in gate (review invocation 일부 경로만 axis-first 사용)
- `validateProfileCompleteness` + `buildBothIncompleteError` (atomic adoption 과잉 검증)
- `legacy-field-deprecation.ts` (throw-stage retirement module)

P9 track 은 이 runtime layer 를 단계적으로 제거하여 resolver 의 universal
`main_native` degrade (P3, PR #154) 를 단일 fail-fast 지점으로 확정했다.

## 2. Sub-phase 진행

| Sub | PR | Commit | 핵심 변경 | Scope |
|---|---|---|---|---|
| **P9.1** | #161 | `c237236` | `DEFAULT_TOPOLOGY_PRIORITY` export + `normalizePriorityArray` helper + resolver ladder loop 제거 | Medium |
| **P9.2** | #162 | `c843e0d` | `OntoConfig.execution_topology_priority` + `execution_topology_overrides` field 삭제 | Medium |
| **P9.3** | #163 | `43f5e51` | `review-invoke.ts` always-on topology dispatch, opt-in gate 제거, coordinator handoff JSON 항상 topology descriptor 포함 | Medium-High |
| **P9.3 m1** | #164 | `58c5328` | resolver 3→1 caching + `--prepare-only` STDERR 관측 불변 보존 | Low-Medium |
| **P9.4** | #165 | `acdc87a` | `config-profile.ts` Option B simplification: `validateProfileCompleteness` / `buildBothIncompleteError` / `buildProjectIncompleteNotice` / `summarizeProfile` 제거, `ProfileAdoption` discriminated union 전환, 5→3 branch decision table | High |
| **P9.5** | #166 | `4aa054c` | `legacy-field-deprecation.ts` 모듈 전면 삭제 (233+252 줄). 3-stage retirement (warning→throw→type removal) 종결 | Low-Medium |
| **P9.6** | *(THIS PR)* | — | Doc sweep + lexicon v0.31.0 + test fixture 위생 | Low |

## 3. 누적 diff

`gh pr view` 로 조회한 각 PR 의 총 additions / deletions (테스트·JSDoc·
주석 포함):

| PR | +lines | −lines | net | files |
|---|---|---|---|---|
| #161 (P9.1) | +541 | −620 | **−79** | 8 |
| #162 (P9.2) | +397 | −418 | **−21** | 16 |
| #163 (P9.3) | +166 | −99 | **+67** | 3 |
| #164 (P9.3 m1) | +217 | −19 | **+198** | 2 |
| #165 (P9.4) | +310 | −521 | **−211** | 5 |
| #166 (P9.5) | +202 | −573 | **−371** | 9 |
| **P9.1~P9.5 subtotal** | **+1,833** | **−2,250** | **−417** | 43 |
| #167 (P9.6, 이 PR) | — | — | self-reporting | 6+ |

P9.6 는 자기 자신의 line count 를 기록하려면 circular reference 가 발생
하므로 (wrap-up 안의 표가 wrap-up 크기를 결정) squash-merge commit 의
실제 diff 를 canonical 로 둡니다. 대략 +250 additions 중 본 wrap-up
문서가 ~200 줄 차지하며, 실질 prose/fixture 수정은 ~40 줄 수준.

P9.1~P9.5 subtotal **−417 줄** 이 runtime 코드층의 실효 감소분. 제거된
**모듈 단위** 는 `legacy-field-deprecation.ts` (233+252 줄),
`buildBothIncompleteError` / `validateProfileCompleteness` /
`buildProjectIncompleteNotice` / `summarizeProfile` 4 함수, resolver
ladder loop + `DEFAULT_TOPOLOGY_PRIORITY` export, `OntoConfig` 의
legacy field 2 종. 동시에 도입된 것은 discriminated union typing
(ProfileAdoption), resolver caching (P9.3 m1 +198), 신규 invariant
regression tests (config-chain.test.ts 등). 원시 line-count 는 모듈
제거의 구조적 의미를 충분히 반영하지 못함 — "절대 감소량" 보다 "제거된
decision surface 수" (config-chain throw path, `validateProfileCompleteness`
gate, legacy detection module) 가 본 track 의 실제 simplification.

Review UX Redesign track 전체 (#152~#167, 16 PRs) 누적 관점: P1~P7
prose+code (6,743 / −364) + P8 audit tests + P9 runtime cleanup
(**+1,833 / −2,250 = −417 subtotal**) + P9.6 sweep = 45+ unique
file 손질.

## 4. Post-P9 runtime 상태

### Resolution order (단순화 완료)

```
1. config.review present + valid  → axis-first dispatch (shape → TopologyId)
2. Axis-first 실패                → P3 universal main_native degrade
3. main_native 도 unmappable      → no_host fail-fast (6-option setup guide)
```

**이전 3-step 에 있던 "legacy execution_topology_priority ladder" 단계가
완전히 제거됨.** Fail-fast 지점은 resolver 의 `no_host` 하나만 남았고,
config-chain 레이어는 더 이상 throw 하지 않음.

### Config ingestion

```
resolveConfigChain (P9.4/P9.5 simplified):
  - 홈 + 프로젝트 YAML read
  - adoptProfile: claimsProfileOwnership(project) → project, else home, else empty
  - mergeOrthogonalFields: last-wins orthogonal merge
  → return merged OntoConfig
```

Legacy 필드가 YAML 에 남아있으면:
- OntoConfig 타입에서 부재하므로 typed 코드 접근 불가 (TS compile error)
- 런타임 Record 에는 값이 잔존하지만 production consumer 전무 (inert)
- Graceful ignore — throw 없음

### 소스 파일 상태

| File | 변화 |
|---|---|
| `execution-topology-resolver.ts` | ladder loop + DEFAULT_TOPOLOGY_PRIORITY 제거 (P9.1) |
| `discovery/config-chain.ts` | legacy-check target builder + throw 제거 (P9.5) |
| `discovery/config-profile.ts` | 5→3 branch, validation 기계 제거 (P9.4) |
| `discovery/legacy-field-deprecation.ts` | **삭제** (P9.5) |
| `review/artifact-types.ts` | `execution_topology_priority` 필드 제거 (P9.2) |
| `cli/review-invoke.ts` | opt-in gate 제거, resolver 1회 호출 (P9.3, P9.3 m1) |

### User-facing error

| Scenario | 이전 | 이후 |
|---|---|---|
| 빈 config | `buildBothIncompleteError` throw (4-option guide) | `buildNoHostReason` / `buildNoHostDetectedError` (6-option guide) |
| Legacy-only + codex reachable | `LegacyFieldRemovedError` throw | review 정상 실행 (auto-detect routing) |
| Legacy-only + no host | `LegacyFieldRemovedError` throw | `no_host` 6-option guide (migration 옵션 포함) |
| Partial project (profile touched, review 블록 없음) + complete home | STDERR notice + home 채택 (`validateProfileCompleteness`=incomplete 판정) | silent project 채택 (`claimsProfileOwnership` 이 `hasAnyProfileField` 으로 ownership 인정 → project 가 이긴다. 사용자가 home 으로 폴백하려면 project profile 필드를 모두 제거해야 함) |

## 5. 핵심 교훈

### 5.1 "Stage 3 완료 = Stage 2 redundant"

3-stage retirement pattern (warning → throw → type removal) 은 backward
compat 을 유지하면서 deprecated 개념을 점진 제거하는 표준이다. 그런데
Stage 3 (타입 제거) 가 완료되면 Stage 2 (throw) 는 자동으로 중복이 된다:
타입에 부재하므로 silent drift 가 불가능하고, throw 는 단지 migration
education layer 로만 기능한다. P9.5 의 `legacy-field-deprecation` 전면
삭제는 이 "Stage 2 redundant" 인식의 사례다. 미래 retirement 에서도
동일 패턴을 기대할 수 있다.

### 5.2 "Resolver 단일 권위" 원칙

P9.3 의 universal `main_native` degrade 이후 "review 실행 가능성" 판단의
권위는 topology resolver 에 단일화됐다. Config-chain 레이어의 fail-fast
guard 들 (`validateProfileCompleteness` + `buildBothIncompleteError` +
`LegacyFieldRemovedError`) 은 모두 같은 정보를 다른 시점에 판정하는
중복 방어선이었다. P9.4/P9.5 는 이 중복을 제거하여 단일 권위 원칙을
확립했다.

### 5.3 "Observable invariant 보존" 을 설계 축으로

P9.3 m1 (#164) 초안은 `--prepare-only` 경로에서 `[topology]` STDERR
라인을 0→5 로 증가시키는 의도치 않은 관측 변화를 동반했다. self-review
에서 이를 잡고 캐시를 2 seat 으로 분할하여 관측 불변을 복구했다.
Refactor-only PR 의 "주장 vs 실제" 정합성 점검은 AI 가 작성한 PR 에서
특히 중요하며, 간과하면 "기능적 일관"인 것처럼 보이는 observable change
를 숨긴다.

### 5.4 "Precision fix" 도 correctness fix

P9.5 self-review round 1 의 INFO-2 ("silent drop via type narrowing"
vs "typed surface omits + no consumer reads") 는 처음 접할 때 문서
용어 수준의 사소한 차이로 보였다. 하지만 실제 테스트를 작성해 보니
"silent drop" 은 런타임 값 제거를 함의하고, 이는 사실과 다른 강한
보장이었다. 용어 정확화가 잘못된 테스트/구현을 유도하는 과정을
막았다. 문서/주석의 정확성은 미래 수정자의 mental model 에 직접
영향을 미친다.

### 5.5 6 PR 연속 self-review 라운드의 효용

P9 track 의 6 PR (#161~#166) 은 모두 동일한 self-review → findings
해소 → merge 프로토콜을 따랐다. 누적 findings 약 15 건, 전수 해소.
각 finding 이 small diff (~50 줄 내외) 로 독립 해결 가능했던 것은
개별 PR 의 scope 가 잘 분리되어 있었음을 증명한다. scope 가 엉성하면
findings 간 의존성이 생겨 round-by-round 해결이 어려워진다.

## 6. Post-merge 권장 검증 (수동)

| Scenario | 확인 대상 |
|---|---|
| `onto review <target>` 기본 | `[topology] signals:` 1회 방출 (P9.3 m1) |
| home-only profile (B-6 class) | project config 부재 시 home 채택 + review 실행 (P9.4) |
| legacy-only YAML (`host_runtime: codex`) | throw 없이 review 실행 (P9.5) |
| legacy + no codex 바이너리 | `buildNoHostReason` 6-option guide 출력 (P9.5) |
| `--prepare-only` | `[topology]` STDERR 라인 0 (P9.3 m1 INFO-1) |

자동화된 스모크 테스트는 없음 — 세션 dispatch 가 실제 CLI 실행을 요구
하므로 harness 비용이 큼. 수동 확인 권장.

## 7. 후속 / parallel work

### P9 내부 잔여 (없음)

P9.6 완료 시점에 P9 track 전수 종결. 잔여 sub-phase 없음.

### 관련 backlog

- **Repo Layout Migration Phase 2+** — `domains/` 이관 (현재 Phase 0+1 merged)
- **`.onto/` allowlist guard** — Codex review MINOR #1 follow-up
- **v0→v1 자율성 수준 2 backlog** — Phase 4 설계 편입 (evolve / reconstruct / learn / govern v1)
- **`review-config-legacy-translate.ts`** — migration CLI 노출 결정 (현재 library-only)

## 8. 참조

- P7 완결 기록: `development-records/evolve/20260421-review-ux-redesign-completion.md`
- Review UX Redesign 설계 doc: `development-records/evolve/20260420-review-execution-ux-redesign.md`
- Sketch v3 (legacy 기반): `development-records/evolve/20260418-execution-topology-priority-sketch.md`
- Migration guide: `docs/topology-migration-guide.md` §4 (Deprecation 단계), §7 (Review UX Redesign migration)
- Shape × pipeline audit: `development-records/audit/20260421-shape-pipeline-audit.md`

---

*본 문서는 P9 track 의 정본 완결 기록이다. 개별 sub-phase 의 세부 설계
결정은 각 PR 의 description 과 memory (`project_p9_*_complete.md`) 를
참조한다.*
