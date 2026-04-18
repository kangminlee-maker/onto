---
as_of: 2026-04-18
status: approved
functional_area: review-mode-naming
revision_history:
  - "2026-04-18: initial proposal (light → core-axis rename, 5 후보 평가, 3 migration 옵션, big-bang 권장)"
  - "2026-04-18: approved — 주체자 권장안 6 항목 (§8) 전수 채택. 후속 implementation PR 진입"
purpose: |
  `review_mode: light` 의 이름이 선정 근거를 전달하지 않는 문제를 해결하기 위한
  rename proposal. 현재 light 는 4 lens (logic / pragmatics / evolution / axiology)
  를 실행하고 그 선정 이유는 "meta-level 4 axis core" 이지만 이름은 "빠름·축소"
  signal 만 전달한다. PR #122 가 SSOT 주석에 rationale 을 기록했으나 사용자
  mental model 까지 도달하지 않으므로 이름 자체의 변경이 필요하다. 본 문서는
  rename 후보 평가 + 영향 범위 + migration 전략을 제시하고 단일 권장안을 명시한다.
  구현 (실제 rename) 은 본 proposal 합의 후 별도 PR.
authority_stance: non-authoritative-design-surface
canonicality: scaffolding
source_refs:
  pr_122_rationale: "PR #122 (8d63552) — authority/core-lens-registry.yaml 에 full/light/always_include 근거 주석 추가"
  ssot: "authority/core-lens-registry.yaml:52-114"
  consumer_resolver: "src/core-runtime/cli/review-invoke.ts:1174-1199 resolveLensDefaultsForReviewMode"
  registry_parser: "src/core-runtime/discovery/lens-registry.ts:5-10"
  type_def: "src/core-runtime/cli/review-invoke.ts:54 ReviewMode = 'light' | 'full'"
  light_design_memory: "~/.claude-1/projects/-Users-kangmin-cowork-onto-4/memory/project_light_review_lens_design.md"
  onto_direction_memory: "~/.claude-1/projects/-Users-kangmin-cowork-onto-4/memory/project_onto_direction.md (네 축 재정의)"
  prior_session_handoff: "development-records/plan/20260418-session3-handoff.md §2 (본 proposal 의 trigger)"
---

# Light → Core-Axis Rename — Design Proposal (2026-04-18)

## 1. 문제 진술

### 1.1 현 상태

`authority/core-lens-registry.yaml` 의 두 lens set:

- `full_review_lens_ids` — 9 lens (logic, structure, dependency, semantics, pragmatics, evolution, coverage, conciseness, axiology)
- `light_review_lens_ids` — 4 lens (logic, pragmatics, evolution, axiology)

`review_mode: 'light' | 'full'` 은 `.onto/config.yaml` 또는 CLI `--review-mode {light|full}` 로 선택. `light` 는 default (review-invoke.ts:1171 의 `return "full"` 은 explicit/config 모두 없을 때만; 실제 host-facing positional invoke 는 light 로 진입 — review-invoke.ts:1186 주석).

### 1.2 결함

`light` 는 **사용자 mental model** 에 "시간/토큰 절감, 축소판" signal 을 전달한다. 그러나 4 lens 의 선정 근거는 (PR #122 SSOT 주석에 명시):

> onto 의 "meta-level 판단 축" 4 개 — 대상의 의도 / 목적 / 판단에 관한 lens. 대상 크기에 무관하게 적용 가치 유지.

선정 근거는 **"meta-level 4 axis core"** 이고 비용 절감은 **부수 효과**다. 이름 `light` 는 부수 효과만 가리키며 본질을 가리키지 않는다.

### 1.3 왜 SSOT 주석으로 부족한가

PR #122 가 `authority/core-lens-registry.yaml` 에 rationale 주석을 추가했으나, **주석은 사용자가 읽지 않는다**. 사용자가 `--review-mode light` 를 타이핑할 때 SSOT yaml 을 열어보지 않는다. 이름 자체가 의미를 전달해야 mental model 이 실체와 정렬된다.

### 1.4 메모리에 기록된 부수 risk (본 proposal scope 외이지만 같은 trigger)

메모리 `project_light_review_lens_design.md` 의 3 지점 검토 중 본 proposal 은 **(a) 이름 signal 오도** 만 다룬다. 나머지 2 지점은 별도 design 으로:
- (b) dependency lens 누락의 silent failure
- (c) coverage lens 누락의 진단 지연

## 2. 두 surface 의 분리

Rename 대상이 한 덩어리로 보이지만 **두 개의 독립 surface** 가 있다:

| surface | 현재 이름 | 위치 | 사용자 노출 |
|---|---|---|---|
| A. field name (yaml/ts interface) | `light_review_lens_ids` / `full_review_lens_ids` | `authority/core-lens-registry.yaml`, `discovery/lens-registry.ts` 의 `CoreLensRegistry` interface | 주체자가 SSOT 직접 편집 또는 lens set 확장할 때 |
| B. mode value (string literal) | `'light'` / `'full'` (`ReviewMode` union) | `review_mode:` config field, `--review-mode` CLI flag, `ReviewMode` type, log entries, record artifacts | 매일 review 실행 시 |

**분리 가능성**: A 만 변경 (yaml field 명만 더 명확히), B 만 변경 (CLI/config UX 만 정렬), 또는 양쪽 동시. 본 proposal 은 **양쪽 동시 변경** 을 권장 (§6) 하지만 후속 PR 에서 분할 가능 (A 먼저, B 나중) 할지의 선택지로 남긴다.

## 3. Rename 후보 평가

### 3.1 `light` 후보

| 후보 | Signal 정확도 | 단점 | 권장도 |
|---|---|---|---|
| **`core-axis`** | meta-level 핵심 축 의미 직접. 메모리 `project_onto_direction.md` 의 "네 축 재정의" 와 어휘 일치 | "axis" 가 lens 와 별개 개념인지 학습 필요. 단/복수 (axis vs axes) 결정 필요 | **★ 1순위** |
| `four-axes` | 축 개수 명시 | lens set 변동 시 (5/3 으로 조정) 즉시 거짓이 되어 다시 rename 필요. 숫자 hard-code 는 anti-pattern | 2순위 |
| `meta-axis` | content-axis 와의 대비 명확 | "meta" 어휘가 너무 광범위 (meta-programming, meta-data 등). 비전문가 진입 비용 | 3순위 |
| `foundations` | 근본/기초 의미 강함 | 너무 추상적. axis / lens 와 분리되어 보임. 구체성 손실 | 4순위 |
| `axis-only` | full 과의 대비 ("축만, content 분석 제외") | full 도 axis 를 포함 (logic/pragmatics/evolution/axiology) 하므로 "only" 가 거짓 | 미권장 |
| `light` (유지) | 비용 절감 부수 효과 신호 | 본질 (meta-axis 선정) 미전달 — 본 proposal 의 trigger | 미권장 |

**선택**: `core-axis`. 어휘를 `project_onto_direction.md` 의 onto core 4 축 개념과 정렬하고, 숫자 hard-code 회피 (4 가 아니라 "core" 라는 정성적 분류). 단/복수는 yaml/CLI 에서 `core-axis` 단수 (descriptor 역할) 로 통일.

### 3.2 `full` 후보

| 후보 | Signal 정확도 | 단점 | 권장도 |
|---|---|---|---|
| **`full`** (유지) | "lens 전수" 의미 충분 — 9 lens 모두 실행 | base 가 아니라 "확장" 으로 보일 수 있음 | **★ 1순위** |
| `all-axes` | core-axis 와의 짝 | 9 lens 가 모두 "축" 인지 모호 (content-level 5 도 축인가?) | 2순위 |
| `all-lens` | "lens 전수" 명확 | OK 이지만 `full` 대비 우위 약함 | 3순위 |
| `full-spectrum` | 전 영역 의미 강함 | "spectrum" 메타포 사용 — `non-specialist-communication-guideline.md` 의 "비유 금지" 위반 | 미권장 |
| `axis-and-content` | 정확 | 길고 합성어 어색 | 미권장 |

**선택**: `full` 유지. `light` 만 비대칭 rename 해도 의미 손상 없음. `core-axis vs full` 의 짝은 "core 4 vs 전수 9" 라는 실체를 잘 전달.

### 3.3 `always_include_lens_ids` 처리

`always_include_lens_ids: [axiology]` 는 본 rename scope 밖. 이유:
- 의미 (어떤 set 에도 반드시 포함) 가 이름과 정확히 일치
- light set 에 axiology 가 들어있는 것은 **결과적 일치** (PR #122 주석) — always_include 와 core-axis 선정이 각각 독립 이유로 axiology 채택. 이 독립성을 유지해야 미래에 "core-axis 에서 axiology 제외 가능 + always_include 는 유지" 같은 분리 변경 여지 보존

## 4. 영향 범위 분석

### 4.1 변경 대상 (rename 실행 시 수정 파일)

| 분류 | 파일 | 변경 형태 |
|---|---|---|
| **Authority SSOT** | `authority/core-lens-registry.yaml` | 필드명 `light_review_lens_ids` → `core_axis_lens_ids`, 주석 갱신 |
| **Registry parser** | `src/core-runtime/discovery/lens-registry.ts` (5-10, 58-61) | interface + parser 필드 |
| **Mode resolver** | `src/core-runtime/cli/review-invoke.ts` (54, 82-83, 96, 104-105, 1164-1199, 1404-1444, 1546, 1563-1564, 1612, 1913, 1971, 2065, 2093) | `ReviewMode` 타입 union + 모든 consumer + CLI flag 메시지 |
| **Type/payload (review)** | `src/core-runtime/review/artifact-types.ts` (79, 156, 198, 227, 341, 383, 522), `src/core-runtime/review/materializers.ts` (42, 63, 214, 303, 337, 368) | type def + materializer params |
| **CLI binding/session** | `bootstrap-review-binding.ts` (201), `prepare-review-session.ts` (275, 321), `write-review-interpretation.ts` (71, 87) | `--review-mode` flag 처리 |
| **Run/coordinator/render** | `run-review-prompt-execution.ts` (712, 870, 938), `coordinator-helpers.ts` (587), `render-review-final-output.ts` (115-117, 278, 287) | downstream consumer |
| **Complexity assessment** | `complexity-assessment.ts` (참조) | mode 추천 로직 |
| **Reader/log** | `src/core-runtime/readers/review-log.ts` (33, 102, 273) | log entry schema |
| **Discovery/profile** | `discovery/config-chain.ts` (60, 256, 303), `discovery/config-profile.ts` (13) | orthogonal field 선언 |
| **Tests** | `e2e-codex-multi-agent-fixes.test.ts` (420), `codex-nested-dispatch.test.ts` (61), `config-profile.test.ts` (44, 118, 125, 258, 262, 279, 284, 311), `review-log.test.ts` (18, 184, 383), `ontology-path-classifier.test.ts` (16), `e2e-review-invoke.test.sh` | string literal `"light"`/`"full"` 또는 field 참조 |
| **Smoke topology** | `scripts/smoke-topology/*.sh` (8 script), `scripts/smoke-topology/manual-claude-host-topologies.md`, `scripts/smoke-topology/README.md` | inline yaml `review_mode: light` |
| **Public docs** | `BLUEPRINT.md` (372-381), `CHANGELOG.md`, `processes/configuration.md`, `processes/review/review.md` (302, 312, 331, 348, 389-394, 495-496, 514-515), `processes/review/binding-contract.md` (70, 134, 159), `processes/review/record-field-mapping.md`, `processes/review/record-contract.md`, `processes/review/execution-preparation-artifacts.md`, `processes/review/interpretation-contract.md` | mode value + field name reference |
| **Watch script** | `scripts/onto-review-watch.sh` (136, 141, 146) | `review_mode` 메타데이터 read |

총 변경 예상: ~35-40 파일 (test 포함). 대부분 mechanical search-and-replace 이지만 4 종류의 sentinel (`light_review_lens_ids` / `full_review_lens_ids` / `'light'` / `'full'`) 별 검증 필요.

### 4.2 freeze 대상 (변경하지 않음)

| 분류 | 파일 | 이유 |
|---|---|---|
| **Records (이력)** | `development-records/benchmark/20260418-topology-smoke-*.md`, `development-records/evolve/20260330-optimization-4features.md`, `development-records/evolve/20260413-onto-todo.md`, `development-records/plan/20260418-session3-handoff.md` | 시점 freeze. 과거 시점에서는 `light` 이름이 사용된 사실 자체가 기록 |
| **dist.bak-20260418/** | 모든 .js | backup snapshot, 코드 빌드 산출물 |

## 5. Migration 전략 3 옵션

### 5.1 옵션 A — Big-bang (한 번에 전수 변경)

**동작**: 한 PR 에서 모든 reference 동시 변경. 옛 이름 (`light_review_lens_ids`, `'light'`) 은 즉시 에러. 외부 사용자가 `.onto/config.yaml` 에 `review_mode: light` 를 적어두었다면 다음 버전 업그레이드 시 실행 실패.

**장점**:
- 코드 복잡도 증가 0
- 의미 분기 없음 — 한 시점부터는 새 이름만 존재
- 회귀 진단 단순 (drift surface 가 1 개)

**단점**:
- 외부 사용자에게 breaking change. CHANGELOG 에 명시 필수
- 업그레이드 가이드 필요

**적용 조건**: onto-core 가 외부 사용자에게 거의 또는 전혀 채택되지 않은 상태일 때.

### 5.2 옵션 B — Dual-read + deprecation

**동작**: parser 가 새 필드 `core_axis_lens_ids` 와 옛 필드 `light_review_lens_ids` 둘 다 받음. CLI 는 `--review-mode core-axis` 와 `--review-mode light` 둘 다 동작. 옛 이름 사용 시 stderr 에 deprecation warning emit. N 버전 후 옛 이름 제거.

**장점**:
- 외부 사용자 grace period 확보
- 점진적 migration

**단점**:
- 코드 복잡도 N 버전간 증가 (parser 양쪽 read, CLI 양쪽 accept, type 두 union 합집합)
- 양쪽이 동시에 정의된 경우 우선순위 정책 필요 (양쪽 충돌 시 어느 쪽?)
- deprecation timeline 의 강제력 부재 시 양쪽이 영구 공존하는 위험

### 5.3 옵션 C — Alias 영구

**동작**: `core-axis` 가 공식 이름, `light` 는 영구 alias. parser 가 양쪽 둘 다 받음. deprecation warning 도 없음.

**장점**:
- 외부 사용자 영원히 변경 불필요
- 코드 변경 한 번 후 더 이상 maintenance 부담 없음

**단점**:
- 두 이름이 영구 공존 — 새 사용자가 어느 것이 canonical 인지 혼동
- "이름이 본질을 전달하지 않는다" 라는 본 proposal 의 trigger 가 부분 해결 (옛 이름이 여전히 코드 어딘가에 보임)
- 본질적으로 옵션 A 의 깔끔함과 옵션 B 의 안정성 사이의 어중간

### 5.4 옵션 비교

| 기준 | A (big-bang) | B (dual-read) | C (alias 영구) |
|---|---|---|---|
| 외부 사용자 breaking | ⚠ 즉시 | ✓ N 버전 grace | ✓ 영구 호환 |
| 코드 복잡도 | ✓ 변동 없음 | ⚠ N 버전 증가 | ⚠ 영구 증가 |
| Mental model 정렬 | ✓ 즉시·완전 | △ N 버전 후 완전 | ✗ 부분 (옛 이름 잔존) |
| Drift surface | 1 (새 이름만) | 2 (양쪽) | 2 (양쪽) |
| Maintenance 부담 | ✓ 없음 | △ deprecation 진행 추적 | ⚠ 영구 |

## 6. 권장안

### 6.1 단일 선택: **옵션 A (Big-bang) + `light` → `core-axis` + `full` 유지 + field 명도 동시 rename**

근거:
1. **외부 사용자 부재 가정**: `package.json` 의 `onto_release_channel: "beta"` + `onto_release_label: "onto-harness"` 는 정식 배포 전 단계. 현재 시점 외부 채택 사례 미확인. 큰 비용으로 grace period 확보할 가치 낮음.
2. **본 proposal trigger 가 mental model 정렬**: 옵션 B/C 는 옛 이름이 코드/문서에 잔존하면서 새 사용자에게 "왜 두 개인가" 질문을 발생시킴 — 본 proposal 이 해결하려는 문제를 부분적으로 재생산.
3. **drift surface 최소화**: 본 세션 (PR #117~#124) 의 핵심 학습 (handoff §1.3 "drift 감지 3 layer") 은 surface 가 적을수록 회귀 진단이 쉽다는 것. 옵션 A 가 이 학습과 일치.
4. **field 명과 mode value 의 동시 rename**: 두 surface 가 항상 짝으로 사용 (config 의 `review_mode: light` 가 SSOT 의 `light_review_lens_ids` 를 가리킴). 분리 rename 시 일관성 결함 발생.

### 6.2 후속 PR 의 안전망

옵션 A 의 risk 완화책:
- **CHANGELOG.md 에 BREAKING CHANGE 명시** + 1-line migration guide ("`.onto/config.yaml` 의 `review_mode: light` 를 `review_mode: core-axis` 로 변경. CLI flag `--review-mode light` 도 `--review-mode core-axis` 로 변경.")
- **PR description 에 외부 사용자 영향 평가 첨부** (npm install 사례 검색 결과 또는 미확인 명시)
- **npm package version bump**: `0.1.0` → `0.2.0` (semver 의 minor 가 아니라 0.1 → 0.2 는 beta 단계 breaking 신호로 용인)

### 6.3 권장하지 않는 선택지

- **옵션 B (dual-read)** 는 onto-core 가 정식 release (1.0.0) 후 외부 채택 확인된 시점에 도입. 현 시점에는 과잉.
- **`light` 유지 + 주석만 보강** 은 본 proposal trigger 자체를 부정 — PR #122 가 이미 그 시도였고 부족함을 본 proposal 이 진단.

## 7. 후속 PR 단계 (proposal 합의 후 구현)

본 design record 합의 후 구현은 다음 단계로:

### Step 1 — Authority + parser
- `authority/core-lens-registry.yaml` 의 `light_review_lens_ids` → `core_axis_lens_ids`, 주석 갱신 (light 어휘 제거)
- `src/core-runtime/discovery/lens-registry.ts` 의 interface + parser 필드 rename
- 단위 테스트 통과 확인

### Step 2 — Type + resolver
- `ReviewMode = 'light' | 'full'` → `ReviewMode = 'core-axis' | 'full'`
- `review-invoke.ts` 의 `LIGHT_REVIEW_LENS_IDS` const 명 + `resolveLensDefaultsForReviewMode` 의 내부 분기 + rationale 메시지 갱신
- CLI flag 에러 메시지 ("Specify at least one --lens-id or use --review-mode full|light") 갱신

### Step 3 — Downstream consumer
- artifact-types / materializers / record / log / coordinator / run / render 의 type 전파 확인
- prepare-session / bootstrap-binding / write-interpretation 의 flag 처리 갱신

### Step 4 — Tests
- string literal `"light"` → `"core-axis"` 일괄 변경
- snapshot 갱신 (있다면)
- e2e shell test 갱신

### Step 5 — Smoke topology + public docs
- 8 smoke shell + manual md 의 inline yaml `review_mode: light` → `review_mode: core-axis`
- BLUEPRINT.md / processes/review/*.md / processes/configuration.md / scripts/smoke-topology/README.md / scripts/onto-review-watch.sh 갱신

### Step 6 — CHANGELOG + version bump
- CHANGELOG.md 에 BREAKING CHANGE 항목
- package.json version `0.1.0` → `0.2.0`

각 Step 을 별도 commit 으로 구성하면 회귀 발생 시 `git bisect` 가 layer 별 격리 가능. 단일 PR 로 묶을지 분할 PR 로 갈지는 구현 PR 작성 시점에 결정 (Step 1+2 와 Step 3-6 을 분리하는 옵션이 자연).

## 8. 의사결정 지점 (주체자 승인)

본 proposal 합의를 위해 주체자가 판단해야 할 항목:

| 결정 항목 | 권장 | 대안 |
|---|---|---|
| **`light` 의 새 이름** | `core-axis` | `four-axes` / `meta-axis` / `foundations` (§3.1) |
| **`full` 의 처리** | 유지 | `all-axes` / `all-lens` (§3.2) |
| **Migration 전략** | 옵션 A (big-bang) | 옵션 B (dual-read N 버전) / 옵션 C (alias 영구) |
| **Field 명과 mode value 의 분리 여부** | 동시 rename | 분리 (A 먼저, B 나중) |
| **외부 사용자 영향 평가** | "현재 미확인 + beta 단계로 용인" | 영향 평가 후 결정 |
| **Version bump** | `0.1.0` → `0.2.0` | `0.1.0` → `0.1.1` (breaking 미신호) |

주체자가 권장과 다른 선택을 하면 본 proposal 을 갱신 (revision_history 추가) 한 후 구현 PR 진입.

### 8.1 승인 결과 (2026-04-18)

주체자가 §8 의 **6 결정 항목 전수를 권장대로 승인**. 채택 내용:

| # | 결정 | 채택값 |
|---|---|---|
| 1 | `light` 새 이름 | `core-axis` |
| 2 | `full` 처리 | 유지 |
| 3 | Migration | 옵션 A (big-bang) |
| 4 | Field/value | 동시 rename |
| 5 | 외부 영향 평가 | "미확인 + beta 단계 용인" |
| 6 | Version bump | `0.1.0` → `0.2.0` |

후속: §7 의 6 step 을 implementation PR 에서 실행. 분할 vs 단일 PR 결정은 implementation PR 작성 시점.

## 9. 참조

- **PR #122** (commit 8d63552) — `authority/core-lens-registry.yaml` 에 full/light/always_include 근거 주석 추가. 본 proposal 의 직전 시도이자 trigger
- **메모리** `project_light_review_lens_design.md` — 3 지점 검토 (a 이름 signal 오도 / b dependency 누락 / c coverage 누락). 본 proposal 은 (a) 만 다룸
- **메모리** `project_onto_direction.md` — onto 4 축 (logic / pragmatics / evolution / axiology) 의 authority 근거. `core-axis` 어휘 선택의 정렬 기반
- **SSOT** `authority/core-lens-registry.yaml:52-114` — 현재 lens set 정의
- **Resolver** `src/core-runtime/cli/review-invoke.ts:1174-1199` — `resolveLensDefaultsForReviewMode` (light/full 분기)
- **Type** `src/core-runtime/cli/review-invoke.ts:54` — `ReviewMode = 'light' | 'full'` union
- **Public doc** `BLUEPRINT.md:372-381` — Full vs Light Review 표 (사용자 노출 면)
- **이전 handoff** `development-records/plan/20260418-session3-handoff.md §2` — 본 proposal 의 trigger 명세
- **개발 원칙** `design-principles/non-specialist-communication-guideline.md` — 비유 금지 (§3.2 의 `full-spectrum` 제외 근거)
