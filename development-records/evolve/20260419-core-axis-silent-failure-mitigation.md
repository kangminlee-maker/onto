---
as_of: 2026-04-19
status: design-proposal
functional_area: core-axis-silent-failure-mitigation
revision_history:
  - "2026-04-19: initial proposal (core-axis 의 (b) dependency 누락 + (c) coverage 누락 완화). 5 approach 평가, 옵션 B (자동 감지 + signal emit) 권장"
purpose: |
  core-axis review mode 의 2 silent failure (dependency lens 누락 + coverage
  lens 누락) 를 완화한다. 본 proposal 은 memory `project_light_review_lens_design.md`
  의 3 지점 검토 중 (b)(c) 를 해소한다 ((a) 는 PR #126/#127 로 이미 해소).
  design intent (core-axis = meta-level 고정 4 axes) 를 보존하면서 사용자
  인지 공백을 signal 로 해결. 구현은 합의 후 별도 PR.
authority_stance: non-authoritative-design-surface
canonicality: scaffolding
source_refs:
  light_design_memory: "~/.claude-1/projects/-Users-kangmin-cowork-onto-4/memory/project_light_review_lens_design.md"
  rename_proposal: "development-records/evolve/20260418-light-to-core-axis-rename-proposal.md (PR #126, merged 2026-04-18)"
  core_axis_complete: "project_core_axis_rename_complete.md"
  dependency_role: "roles/dependency.md (purpose: Dependency integrity verification)"
  coverage_role: "roles/coverage.md (purpose: Domain coverage verification)"
  resolver: "src/core-runtime/cli/review-invoke.ts:1174-1199 resolveLensDefaultsForReviewMode"
  select_lenses: "src/core-runtime/cli/complexity-assessment.ts selectLenses (standalone host dynamic path)"
  legacy_policy_seat: "src/core-runtime/review/legacy-mode-policy.ts (PR #128)"
---

# Core-Axis Silent Failure Mitigation — Design Proposal (2026-04-19)

## 1. 문제 진술

### 1.1 현 상태

`core-axis` mode 는 고정 4 lens (logic / pragmatics / evolution / axiology) 를 실행한다. 제외된 5 lens (structure / dependency / semantics / coverage / conciseness) 는 content-level 분석 축으로 분류되어 작은 target 에서 검증 가치 작다는 design intent 에 따라 의도적 제외.

그러나 이 제외는 2 silent failure 를 낳는다:

### 1.2 (b) Dependency lens 누락의 실용 위험

**시나리오**: 주체자가 작은 md 파일 하나를 core-axis 로 review. 그 md 가 다른 파일 참조 (`[see]()`, `` `<file>` ``, 코드 블록의 `import x from "y"`) 를 포함하고 그 참조가 깨져 있음.

**결과**: dependency lens 가 core-axis 에 없으므로 broken reference 는 silent pass. 주체자는 review 가 green 이라 판단하고 target 을 승인. 실제 실행 시점에 참조 깨짐으로 실패.

**Silent 의 의미**: lens review 에서 에러가 나오지 않음 → 주체자가 문제 **존재 자체를 인지하지 못함**. core-axis 가 자기 결함을 숨김.

### 1.3 (c) Coverage lens 누락의 진단 지연

**시나리오**: 주체자가 특정 domain 문서를 반복적으로 core-axis 로 review. 각 review 는 4 lens 로 부분 검증만 수행. "놓친 하위 영역" 은 각 review 에서 감지 불가.

**결과**: 누락이 **누적**. 3 회, 5 회, 10 회 core-axis 를 쓰면서 coverage lens 가 한 번도 실행되지 않으면 domain 완결성은 한 번도 검증 안 됨.

**Trigger 부재**: 현재 "몇 회 사용 후 full 전환 권장" 같은 자동 trigger 없음. 주체자가 의식적으로 `--review-mode full` 전환해야 함 — 그러려면 **필요성을 인지** 해야 하는데 그 인지 경로 자체가 부재.

### 1.4 (b)(c) 의 공통 핵심

두 결함 모두 **사용자 인지 공백** 이 근본 원인:
- dependency 누락: "이 target 에 참조 구조가 있다" 는 사실을 인지 못함
- coverage 누락: "이 target 의 전체 도메인 범위가 검증되지 않았다" 는 사실을 인지 못함

인지하면 `--review-mode full` 또는 `--lens-id dependency/coverage` 로 해결 가능 (이미 존재). 즉 **해결 수단은 이미 있고, 결함은 인지 signal 의 부재**.

### 1.5 이미 부분 해결되는 경로

`host_runtime: standalone | litellm | anthropic | openai` + no-explicit-mode 인 경우 `complexity-assessment.ts` 의 `selectLenses` 가 LLM 으로 2-4 lens 를 dynamic 선택. target 성격에 따라 dependency/coverage 가 포함될 수 있음.

그러나 이는 **standalone host 에만 해당**. 대부분 사용자 (Claude host — `CLAUDECODE=1`, Codex host) 는 고정 4 lens → (b)(c) 결함 그대로 노출.

## 2. 현재 해결 수단 vs 결함의 분리

명시적으로 구분 — 본 proposal 이 다루는 것은 **후자**:

| 질문 | 답 | 본 proposal scope |
|---|---|---|
| "dependency / coverage lens 가 필요할 때 실행할 수단이 있나?" | 있음 — `--lens-id dependency` 또는 `--review-mode full` | 밖 |
| "사용자가 그 필요성을 **인지** 할 수 있나?" | 현재 없음 | **안** |

## 3. Approach 평가

### 3.1 옵션 A — core-axis 에 dependency + coverage 추가 (4 → 6)

**동작**: `core_axis_lens_ids` 를 4 → 6 lens 로 확장.

**Pros**:
- 단순. silent failure 즉시 제거
- 모든 host 환경에 일관 적용

**Cons**:
- **design intent 위반**: "meta-level 4 axes" 라는 core-axis 의 identity 가 "meta-level + content-level 일부" 로 변질. PR #127 의 rename 근거 ("이름이 본질 전달") 가 희석
- 비용 50% 증가 (4 → 6 lens, 각 lens 는 LLM call)
- dependency/coverage 가 content-level 분석인데 meta-level set 에 섞임 → 분류 체계 혼란

### 3.2 옵션 B — 자동 감지 + signal emit (고정 4 유지)

**동작**: core-axis 실행 유지하되 다음 2 signal 추가:
- **B1 (dependency signal)**: core-axis 실행 중 target 본문에 파일 참조 패턴 감지 시 final-output 에 "dependency lens 권장" 경고 섹션 + stderr 경고
- **B2 (coverage signal)**: review-log.ts 의 progressiveness 분석 활용. 최근 N 회 (예: 3) 이상 core-axis 연속 사용 + full 미사용 시 "coverage lens check 권장" 경고

**Pros**:
- design intent 보존 (고정 4 유지)
- 사용자 인지 공백 직접 해소 (signal 이 명시적 알림)
- opt-in 확장 — 사용자가 경고 읽고 `--review-mode full` 또는 `--lens-id dependency` 로 후속 실행 선택
- 비용 증가 최소 (signal 은 LLM call 없음)

**Cons**:
- 구현 복잡도 중간 (target pattern 감지 regex + 세션 tracking)
- False positive risk (파일 참조가 모두 broken 은 아님 — 경고가 잦으면 무시됨)

### 3.3 옵션 C — 새 mode 도입 (`core-axis-plus-deps` 등)

**동작**: ReviewMode union 에 새 값 추가: `'core-axis-plus-deps' | 'core-axis-plus-cov' | 'core-axis-extended'` 등.

**Pros**:
- 명시적 opt-in
- 사용자가 필요 시 명시적 선택

**Cons**:
- ReviewMode union 복잡도 증가 (3 mode → 6 mode)
- 사용자 선택 부담 (어느 mode 선택할지 매번 판단)
- 인지 공백 해결 안 됨 — 사용자가 여전히 "plus-deps" 가 필요함을 **인지** 해야 선택 가능
- `core-axis` 의 의미적 명료성 약화 (variant 늘어나면 기준 흐려짐)

### 3.4 옵션 D — per-target 자동 lens 포함

**동작**: target 본문 분석으로 조건부 lens 자동 포함. 파일 참조 있으면 dependency 자동 추가, 새 domain 이면 coverage 자동 추가.

**Pros**:
- 사용자 무관심 에서도 동작
- design intent 외관상 유지 ("base 4 lens + 조건부 추가")

**Cons**:
- 판정 로직 복잡 + LLM 의존 가능 (regex 로 불충분)
- "core-axis" 가 경우에 따라 4 ~ 6 lens → 사용자가 실행 결과 예측 어려움
- mental model 불일치 (이름은 "core-axis" 인데 실제 실행은 dynamic)

### 3.5 옵션 E — 기존 `--lens-id` 활용 + 문서 개선만

**동작**: 코드 변경 0. `--lens-id dependency` + `--lens-id coverage` 가 이미 `core-axis` 를 bypass 함 (review-invoke.ts:1448 `explicitLensIds.length > 0`). 문서에 "필요 시 --lens-id 로 추가" 만 강조.

**Pros**:
- 코드 변경 0, risk 0

**Cons**:
- (b)(c) 의 **근본 결함 (인지 공백) 미해결**
- 사용자가 문서를 읽고 "필요하다" 판단 — 그 판단의 trigger 는 여전히 사용자 self-motivated

### 3.6 옵션 비교

| 기준 | A (확장) | **B (signal)** | C (new mode) | D (auto-include) | E (docs only) |
|---|---|---|---|---|---|
| 인지 공백 해소 | ✓ (silent 제거) | **✓ (signal 명시)** | ✗ (선택 필요) | ✓ (자동) | ✗ (self-motivated) |
| design intent 보존 | ✗ (4→6) | **✓ (4 유지)** | △ (mode 확장) | △ (dynamic) | ✓ |
| 비용 증가 | 50% | **0 (signal)** | 0 (선택 기반) | 가변 | 0 |
| 구현 복잡도 | 저 | **중** | 저 | 고 | 0 |
| 사용자 예측 가능성 | ✓ | **✓** | ✓ | ✗ (dynamic) | ✓ |
| False positive risk | 없음 | **중 (규제 가능)** | 없음 | 고 | 없음 |

## 4. 권장안

### 4.1 단일 선택: **옵션 B (자동 감지 + signal emit)**

**근거 4 층**:

1. **인지 공백 직접 해소**: (b)(c) 의 근본 결함을 signal 로 알리는 것이 정확한 해결. 옵션 C/E 는 인지 공백 부분 해결 또는 미해결
2. **design intent 보존**: core-axis = meta-level 4 축 이라는 정체성 유지. PR #127 rename 의 mental model 정렬 투자가 흐려지지 않음
3. **Opt-in 확장**: signal 받은 사용자가 `--review-mode full` / `--lens-id` 로 후속 선택 — 주체자 agency 존중. 자동 변경 (D) 의 예측 불가 회피
4. **LLM 비용 0 (signal 자체)**: B1 은 regex/pattern 매치, B2 는 file read (review-log.ts 활용) — 모두 deterministic. core-axis 의 비용 절감 부수 효과 유지

### 4.2 B1 (dependency signal) 구체 설계

**Trigger**: core-axis 실행 중 target 본문에 파일 참조 패턴 감지:
- Markdown link: `[text](path)` 중 path 가 file-system 경로 형식
- Code import: `import ... from "..."`, `require("...")`, `from "..." import ...` 등 언어별
- File reference: `` `src/x.ts` ``, `` `processes/y.md` `` 등 backtick 경로

**Emit**: final-output.md 에 별도 섹션 + stderr 경고:
```
### Signal: Dependency Lens 권장
core-axis mode 는 참조 무결성을 검증하지 않습니다. target 본문에 N 개
파일 참조가 감지되었습니다. 참조 깨짐 가능성이 있다면:
  --lens-id dependency 로 재실행 또는
  --review-mode full 로 9-lens 전수 실행
참고: design-records 의 core-axis silent failure mitigation §B1
```

**False positive 완화**: threshold (참조 3 개 이상) + 사용자 suppress flag (`--suppress-dependency-signal`)

### 4.3 B2 (coverage signal) 구체 설계

**Trigger**: review-log.ts 의 session 히스토리 조회. 조건:
- 동일 target group (review-log.ts progressiveness 의 target_group_key 사용) 에서
- 최근 N 회 (default 3) 연속 core-axis 실행 + full 미사용

**Emit**: final-output.md + stderr:
```
### Signal: Coverage Lens 권장
동일 target 을 N 회 연속 core-axis 로 review 했습니다. "놓친 영역"
감지를 위해 한 번은 coverage lens 적용 권장:
  --lens-id coverage 로 재실행 또는
  --review-mode full
참고: design-records 의 core-axis silent failure mitigation §B2
```

**N 조정**: config 에 `core_axis_signal_threshold: 3` 추가 가능. 0 설정 시 signal 비활성.

### 4.4 B3 (optional) — always_include 와의 관계

현재 `always_include_lens_ids: [axiology]`. signal 은 always_include 와 별개 — axiology 는 매 review 실행, signal 은 실행 후 추천만.

만약 미래에 "dependency/coverage 를 항상 포함" 이 합의되면 `always_include` 에 추가가 자연 — 하지만 그건 core-axis 의 정의를 바꾸는 것이므로 별도 proposal.

## 5. 영향 범위

### 5.1 변경 대상

| 분류 | 파일 | 변경 형태 |
|---|---|---|
| **Signal 생성 (B1)** | 신규 `src/core-runtime/review/dependency-signal.ts` | target 본문 pattern 감지 + signal 구조 생성 |
| **Signal 생성 (B2)** | 신규 `src/core-runtime/review/coverage-signal.ts` | review-log progressiveness 조회 + signal 구조 생성 |
| **Signal consumer** | `src/core-runtime/cli/render-review-final-output.ts` | core-axis 실행 시 signal 섹션 추가 |
| **Signal consumer** | `src/core-runtime/cli/run-review-prompt-execution.ts` 또는 `coordinator-helpers.ts` | core-axis 완료 시 stderr 경고 emit |
| **Config schema** | `src/core-runtime/discovery/config-chain.ts` + `processes/configuration.md` | `core_axis_signal_threshold` 신규 field |
| **CLI flag** | `src/core-runtime/cli/review-invoke.ts` | `--suppress-dependency-signal` / `--suppress-coverage-signal` opt-out |
| **Tests** | 신규 unit + integration | B1 regex + B2 history read + signal rendering |
| **Docs** | `BLUEPRINT.md`, `processes/review/review.md`, `processes/configuration.md` | core-axis signal 설명 추가 |

예상 ~12-15 파일 변경. 신규 2 파일 + 기존 consumer refactor.

### 5.2 freeze 대상

- core-axis lens 집합 (`core_axis_lens_ids` 는 4 lens 유지)
- `always_include_lens_ids` (변경 없음)
- 기존 `--lens-id` / `--review-mode full` 동작 (signal 은 추천일 뿐, 기존 path 영향 X)

## 6. 구현 단계 (proposal 합의 후)

### Step 1 — Signal seat 신설
- `dependency-signal.ts`: target 본문 pattern 감지 + `DependencySignal` 구조 (references_found, suggestion_text)
- `coverage-signal.ts`: review-log progressiveness 조회 + `CoverageSignal` 구조 (consecutive_core_axis_count, suggestion_text)
- 각 seat 는 순수 함수 — 검사 + signal 반환만, emit X

### Step 2 — Consumer wiring
- render-review-final-output.ts: core-axis mode + signal 존재 시 "Signals" 섹션 추가
- stderr 경고: run-review-prompt-execution.ts 또는 coordinator-helpers.ts 완료 시점

### Step 3 — Config + CLI
- `core_axis_signal_threshold: number` (default 3, 0 = 비활성)
- `--suppress-dependency-signal` / `--suppress-coverage-signal` flag

### Step 4 — Tests
- B1 regex unit test (md link / import / backtick path)
- B2 history read test (progressiveness N 회 시나리오)
- integration: core-axis 실행 → signal 감지 → final-output 반영

### Step 5 — Docs
- BLUEPRINT.md: core-axis 설명에 signal 보강
- processes/review/review.md: core-axis 섹션에 signal 동작 추가
- processes/configuration.md: `core_axis_signal_threshold` 설명

### Step 6 — Memory 갱신
- `project_light_review_lens_design.md`: (b)(c) 해소 표시
- 새 memory `project_core_axis_signal_mitigation.md`

## 7. 의사결정 지점 (주체자 승인)

| 결정 항목 | 권장 | 대안 |
|---|---|---|
| **접근 방식** | 옵션 B (signal emit) | A (확장) / C (new mode) / D (auto-include) / E (docs only) |
| **B1 감지 패턴** | md link + code import + backtick path | 더 제한적 (md link only) / 더 광범위 (all path-like strings) |
| **B1 threshold** | 3 참조 이상 감지 시 emit | 1 / 5 / config 로 조정 |
| **B2 N (반복 임계)** | 3 회 연속 | 2 / 5 / config 로 조정 |
| **B2 target group 판정** | review-log progressiveness `target_group_key` 재사용 | 더 엄격 (exact path match) / 더 느슨 (domain 기반) |
| **Suppress flag** | opt-out (`--suppress-*-signal`) | 기본 비활성 (`--enable-*-signal`) |
| **구현 scope** | Step 1~6 단일 PR | B1 PR + B2 PR 분할 |

주체자가 권장과 다른 선택 시 본 proposal 갱신 (revision_history 추가) 후 구현.

## 8. 참조

- **Memory** `project_light_review_lens_design.md` — 본 proposal 의 trigger. (a) 는 PR #127 로 해소, 본 proposal 로 (b)(c) 해소
- **Memory** `project_core_axis_rename_complete.md` — core-axis 의 현재 정의 + rename 경로 전체 기록
- **Rename proposal** `development-records/evolve/20260418-light-to-core-axis-rename-proposal.md` — core-axis 의 "meta-level 4 axes" design intent 근거
- **SSOT** `authority/core-lens-registry.yaml:52-114` — `full_review_lens_ids` (9), `core_axis_lens_ids` (4), `always_include_lens_ids` ([axiology])
- **Resolver** `src/core-runtime/cli/review-invoke.ts:1174-1199` — `resolveLensDefaultsForReviewMode`
- **Dynamic selection** `src/core-runtime/cli/complexity-assessment.ts` `selectLenses` — standalone host 에서만 활성. 본 proposal 은 Claude/codex host 도 커버
- **Progressiveness seat** `src/core-runtime/readers/review-log.ts` — B2 의 반복 사용 tracking 에 활용
- **Legacy policy 참조** `src/core-runtime/review/legacy-mode-policy.ts` (PR #128) — signal seat 의 organization 패턴 참고
