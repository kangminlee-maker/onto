---
as_of: 2026-04-25
status: design-draft
functional_area: evolve-planning-extension
supersedes_partially:
  - "20260413-onto-direction.md (evolve 의 적용 범위 — 외부 design_target 가정 → onto self-design 포함으로 확장)"
purpose: |
  onto 자체 개발 cycle (plan → develop → review) 의 plan + develop 영역을
  evolve 가 채운다. dogfooding (Task #1 replay) 에서 발견된 15 friction —
  특히 H4 (code-product pipeline 편향) — 을 해소하기 위한 설계안. process
  design / architecture design 같은 design-doc 산출 use case 를 evolve
  의 1급 시나리오로 승격하고, self-target 을 first-class 로 처리한다.
input_artifacts:
  friction_log: development-records/evolve/20260425-dogfood-friction-log-task1.md (PR #215)
  reference_design_doc: development-records/evolve/20260425-review-execution-interactive-selection.md (PR #211)
  current_evolve_command: .onto/commands/evolve.md
  current_evolve_process: .onto/processes/evolve.md
  current_evolve_runtime: src/core-runtime/evolve/
scope_decision:
  in_this_design:
    - "Showstopper friction 5 (F-01, F-07, F-10, F-11, F-15) 차단 해소"
    - "process entry mode 후반부 — design-doc generator path"
    - "self-target first-class 처리"
    - "schema ↔ prose 동기화 메커니즘"
  not_in_this_design:
    - "code-product pipeline 의 별도 정비 (현 동작 유지)"
    - "remaining 10 friction 은 backlog open items 로"
    - "experience entry mode 의 UI mockup pipeline 변경"
---

# Evolve 를 planning + develop 영역으로 확장 — 설계안

## 1. 배경

### 1.1 onto 개발 cycle 의 빈 공간

현재 onto 개발은 **plan → develop → review** 의 반복이지만, 도구 측면에서는 review 만 onto:review 가 자기 영역을 잡고 있고 plan + develop 영역은 비어있다. 결과:

- 새 작업 (예: PR #211 의 review interactive 선택 설계) 은 evolve CLI 를 거치지 않고 **자유 대화 + 수동 design doc 작성** 으로 진행.
- 의사결정 기록·constraint 추적·산출물 검증의 구조가 매번 ad-hoc.
- evolve 가 이론적으로는 이 영역을 위해 만들어졌으나 **실제로는 사용되지 않는 채로 방치**.

### 1.2 Dogfooding 결과 요약

PR #211 작업을 evolve CLI 로 post-hoc replay 한 결과 (PR #215 friction log) 15 개 friction 발견. 도달 상태:

| Scope | 도달 | 차단 사유 |
|---|---|---|
| `source=.` | `align_proposed` | F-11 (self-target 의 source 가 자기 작업 파일 포함) |
| `source=src/core-runtime/review/` | `target_locked` | F-15 (compile 이 code-product pipeline 입력 요구) |

핵심 hypothesis 4 가지 모두 검증 (특히 H4 신규 — **evolve 후반부가 code-product pipeline 전용**).

### 1.3 핵심 설계 근거 (Decision Record)

**왜 evolve 를 다른 도구로 대체하지 않는가**

evolve 의 전반부 (start → propose-align → align) 는 실제 잘 작동했다. align-packet 도 decision surface 로서 fit. 즉 evolve 의 **상태 머신 + 이벤트 + decision-surface 부분은 유지가치 있음**. 이 위에 후반부의 use-case 를 확장하는 것이 새 도구를 만드는 것보다 적절하다.

**왜 entry mode 분기로 가는가**

draft / compile / apply 가 code-product 변경을 가정한 단일 pipeline 으로 작성됨. process design 같은 다른 산출 형식을 단일 pipeline 에 욱여넣기보다는 **entry mode 별로 후반부를 분기**하는 것이 자연스럽다. `experience` / `interface` / `process` enum 자체는 이미 존재 — `process` 의 후반부만 정의하면 됨.

**왜 self-target 을 first-class 로 다루는가**

dogfooding 자체가 onto 를 onto 로 evolve 하는 것. 이 use case 가 막히면 dogfooding 이 불가능 → 도구 개선 cycle 자체가 막힘. self-target 은 부수 케이스가 아니라 onto 개발의 핵심 path.

---

## 2. Dogfooding 발견 4축 (요약)

상세는 PR #215 friction log 참조.

| 축 | 핵심 friction | 시사점 |
|---|---|---|
| **진입점 마찰** | F-01 기동 실패, F-07 비표준 CLI 인자, F-10 schema 미문서화, F-12 새 scope 시작 경로 부재 | 사용 흐름 곳곳에 silent 차단점 |
| **Self-target 미반영** | F-03 sprint-kit 잔존, F-08 perspective classifier 가 TS 0건, F-11 stale 폭발 | onto 자체를 evolve 할 때의 특수 규칙 부재 |
| **Artifact mismatch** | F-13 generate_surface 의미 오인, F-09 title 폭주 | use case 별 산출 형식 적합성 |
| **Code-product 편향 (H4)** | F-15 compile 이 build-spec/delta-set 강제 | **본 설계의 핵심 axis** |

---

## 3. 설계 영역

### 3.1 Entry mode 별 후반부 분기

현 evolve 의 후반부 단일 pipeline 을 entry mode 로 분기.

| Entry mode | Surface (draft 1단계) | Compile (draft 2단계) | Apply | 산출물 |
|---|---|---|---|---|
| `experience` (UI/UX) | UI mockup (`surface/preview/`) | code-product compile | 코드 변경 | build-spec.md, delta-set.json (현행) |
| `interface` (API contract) | contract-diff (`surface/contract-diff/`) | code-product compile | API 변경 | (현행) |
| **`process` (신규)** | **design-doc draft (markdown)** | **n/a (compile 생략)** | **design-doc commit + PR** | **design-doc.md** |

`process` 모드에서:
- `draft generate_surface` → `surface/design-doc-draft.md` 생성. 자유형식 markdown + Task #1 design doc 형식 (frontmatter 포함) 표준화.
- `draft confirm_surface` → `surface_confirmed`. compile 단계 skip.
- `draft compile` → 호출 시 "process mode 에선 compile 생략, apply 로 진행" 안내.
- `apply` → design doc 을 `development-records/evolve/{date}-{slug}.md` 에 commit. 동일 메시지로 git commit 생성. `--push-pr` 옵션 시 PR 까지 자동.

### 3.2 Self-target first-class 처리

**자동 감지 규칙**

`onto evolve start` 가 다음 모두 충족 시 `--self` 모드 자동 활성:
- `<project-root>/.onto/authority/core-lexicon.yaml` 존재
- `<project-root>/.onto/principles/` 디렉토리 존재
- `<project-root>/package.json` 의 `name` 이 `onto-core` 또는 `@onto/*` prefix

**Self 모드의 자동 동작**

1. **소스 스캔 자동 제외**: `scopes/`, `development-records/evolve/`, `dist/`, `node_modules/`, `.git/` 을 자동 ignore.
2. **`.gitignore` 규칙 존중**: scanner 가 .gitignore 파싱하여 적용.
3. **Stale 검사 완화**: 자동 제외된 경로는 stale 감지에서도 빠짐. 작성 중인 friction log / 설계문서가 자기 진행을 막지 않음.
4. **Perspective classifier 보정**: TypeScript / Markdown 비율을 onto 자체 코드베이스 기준 (TS = code, .md = policy/experience 분기) 으로 재정렬.
5. **Default entry mode = `process`**: self-target 의 압도적 다수가 design doc 작업이므로.

### 3.3 Process entry mode 의 산출물 형식

기존 PR #211 design doc 형식을 표준 schema 로 채택. Frontmatter 강제 필드:

```yaml
---
as_of: <date>                  # 필수
status: design-draft|approved  # 필수
functional_area: <slug>        # 필수
purpose: |                     # 필수, multi-line
  ...
supersedes_partially: []       # 선택
input_artifacts: {}            # 선택
scope_decision: {}             # 선택
---
```

본문 구조는 자유롭되 다음 4 섹션 권장:
1. 배경 + Decision Record
2. 설계 영역
3. Phase 계획
4. Success criteria + Open items

`onto evolve draft generate_surface --entry-mode process` 가 위 frontmatter 만 미리 채운 markdown 골격을 surface/design-doc-draft.md 에 생성. 본문은 agent (LLM/사람) 가 채움.

### 3.4 Apply 의 행위 재정의

| Mode | apply 수행 |
|---|---|
| `experience` / `interface` (code-product) | `delta-set.json` 의 변경을 실제 파일에 적용 (현행) |
| `process` | `surface/design-doc-draft.md` 를 `development-records/evolve/{YYYYMMDD}-{slug}.md` 로 이동 + git commit. `--push-pr` 시 push + `gh pr create` |

**`process` 모드 apply 의 추가 옵션**

- `--commit-message <msg>` — git commit 메시지. 기본값: `docs(<area>): <title>`
- `--push-pr` — push + PR 생성 자동
- `--pr-title <title>` / `--pr-body <body>` — PR 메타데이터

### 3.5 진입점 ergonomics + schema 동기화

**Ergonomics (showstopper 5 해소)**

| Friction | 해소안 |
|---|---|
| F-01 기동 실패 | `bin/onto` wrapper 가 `node_modules` 부재 감지 → "`npm install` 후 재실행하세요" 안내 후 exit 1 |
| F-07 `--add-dir` 가 description 내부에서만 동작 | `--add-dir <path>` 를 표준 CLI 플래그로 승격. inline 형태는 deprecation 경고 후 1 minor 후 제거 |
| F-10 propose-align schema enum 미문서화 | `.onto/processes/evolve.md` 에 enum table 추가 + `onto evolve schema <subcommand>` 신규 명령 |
| F-11 self-target stale 폭발 | §3.2 의 자동 제외 규칙 |
| F-15 compile cryptic 예외 | process mode 에선 compile skip; code-product mode 에선 입력 검증 후 친절한 에러 |

**Schema 동기화**

`onto evolve schema <subcommand>` 가 zod schema 를 사람이 읽을 markdown 으로 출력:

```bash
onto evolve schema propose-align
# → constraints[].perspective: experience | code | policy
# → constraints[].severity: required | recommended
# ...
```

prose (`evolve.md`) 빌드 시 이 출력을 inject 하여 prose 와 코드를 자동 동기화 (CI guard).

---

## 4. Phase 계획

### Phase A — Showstopper 해소 (§3.5)
1. `bin/onto` 의 의존성 부재 감지 + 안내
2. `--add-dir` 표준 CLI 플래그화 (inline 호환은 1 minor 유지)
3. `onto evolve schema <subcommand>` 신규 명령
4. propose-align / draft / compile 입력 검증 강화 (cryptic 예외 → 구조화 에러)
5. **새 scope 시작 명시 경로**: `--new-scope` 또는 `evolve restart`

### Phase B — Process entry mode (§3.1, §3.3, §3.4)
1. `entry_mode = "process"` 의 후반부 분기 구현
2. `draft generate_surface` 가 design-doc 골격 생성
3. `apply` 의 process 분기: design doc 이동 + git commit
4. `--push-pr` 옵션
5. `e2e-evolve-full-cycle.test.ts` 에 process mode 시나리오 추가

### Phase C — Self-target first-class (§3.2)
1. self-target 자동 감지 규칙 + `--self` 명시 플래그
2. 자동 제외 path 처리 (scopes/, development-records/evolve/, dist/, node_modules/, .git/)
3. `.gitignore` 파싱 통합
4. Stale 검사에서 자동 제외 path 제외
5. Perspective classifier 의 self-target 변형 (TS = code 분류 보정)
6. Default entry mode = `process` (self-target 시)

### Phase D — Schema ↔ prose 동기화 (§3.5)
1. `onto evolve schema` 명령
2. `.onto/processes/evolve.md` 의 prose 에 schema injection point 마련
3. CI guard: prose 의 schema 표가 코드 schema 와 일치하는지 검증

### Phase E — 문서·UX 다듬기
1. `evolve.md` / `process.md` 의 sprint-kit 잔존 표기 (F-03, F-04, F-06) 정리
2. 에러 메시지의 stale 명령 표기 동적 주입
3. brief.md template 갱신 (sprint-kit 참조 제거 + process mode 안내)
4. README + onto:help 의 evolve 섹션 보강

---

## 5. Success criteria

| # | 기준 | 검증 방법 |
|---|---|---|
| 1 | **Task #1 같은 작업이 evolve 로 처음부터 끝까지 가능** | PR #211 과 동등한 design doc 을 `onto evolve start → ... → apply` 만으로 산출 (수동 markdown 작성 없이). e2e test 1건. |
| 2 | Showstopper 5 친화 해소 | F-01 자동 안내 / F-07 표준 플래그 / F-10 schema 명령 / F-11 self-target 자동 제외 / F-15 process mode skip. 각각 unit test. |
| 3 | self-target 자동 감지 정확도 | onto repo 에서 `onto evolve start` 시 `--self` 모드 활성화 (감지 신호 3개 모두 만족). 다른 repo 에선 비활성. |
| 4 | schema-prose 동기화 | CI 가 `evolve.md` 의 schema 표 ↔ zod schema 차이 발견 시 fail |
| 5 | Process mode e2e | `start → align → draft (process) → apply` 가 design doc commit 으로 종결되는 시나리오 1건 |
| 6 | Backward compat | 기존 `experience` / `interface` 모드 동작 변화 없음 (회귀 테스트) |

---

## 6. Open items

- **15 friction 중 backlog 처리**: F-02 (start 2-step), F-04 (`/start` 표기), F-05 (source vs scope_in 모호), F-06 stale 명령 표기, F-08 (perspective classifier 의 일반 정밀도), F-09 (title 폭주), F-12 (`--new-scope` 의 정확한 의미론), F-13 (generate_surface 메시지), F-14 (lock_target 메시지). 각각의 해소는 별도 PR 로.
- **`--push-pr` 의 PR 본문 자동 생성**: design doc 의 frontmatter + 본문 일부를 PR body 로 변환. 템플릿 형식 미정.
- **Self-target 감지의 false positive**: 다른 ontology 도구 / 비슷한 구조의 repo 가 잘못 감지될 가능성. `package.json:name` 매칭이 충분한지.
- **Architecture design 모드**: process 와 별개로 architecture design (예: Phase 4 dependency graph) 전용 후반부가 필요한지. 미결.
- **Existing scope artifacts 호환**: 이미 존재하는 scopes/ 디렉토리 (예: 이번 dogfooding) 의 마이그레이션 정책. 일단 손대지 않음.
- **Codex / Claude Code interactive 도구 통합**: AskUserQuestion / request_user_input 을 process mode draft 단계에서 활용할지. PR #211 의 §4.0-a 와 같은 host adapter 가 evolve 에도 적용 가능.
