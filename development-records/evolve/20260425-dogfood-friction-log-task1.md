---
as_of: 2026-04-25
status: live-log
functional_area: evolve-dogfooding
purpose: |
  Task #1 (review 실행방식 interactive 선택 설계) 을 evolve CLI 로 post-hoc
  재실행하면서 관찰되는 friction 을 실시간으로 기록. 이 로그가 Task #2
  (evolve 를 planning 단계에 확장하는 설계안) 의 1차 입력.
method:
  - 이미 결정된 Task #1 의 outcome 을 alignment 재료로 사용
  - evolve 의 7 상태 (start → propose-align → align → draft → apply → close) 를 순서대로 밟음
  - 각 단계에서 걸리는 지점을 4 축으로 태깅:
      ergonomic   — 커맨드·플래그 사용성
      conceptual  — 도구 모델과 실제 작업 모델의 괴리
      artifact    — 생성물 형식 불일치
      self-target — onto 자체를 evolve 할 때의 특수성
  - Severity: high / med / low
scope_under_test:
  goal: "onto review 실행방식을 interactive 선택으로 바꾸고, config 을 개인별 파일로 전환"
  source: "." (repo 전체)
  domain: (추후 결정)
reference_artifact: development-records/evolve/20260425-review-execution-interactive-selection.md (PR #211)
---

# Evolve Dogfooding Friction Log — Task #1 Replay

## 진행 상태 요약 (2026-04-25 최종)

**Scope 1 (`scope-20260425-001`, source=`.`)**:

| 상태 전이 | 결과 | 비고 |
|---|---|---|
| `null → draft → grounded` | ✅ | brief 작성 + 2차 start |
| `grounded → align_proposed` | ✅ | schema enum 수정 후 성공 |
| `align_proposed → align_locked` | ❌ blocked by F-11 | source=`.` 가 self-target 에서 stale 폭발 |

**Scope 2 (`dogfood2-20260425-001`, source=`src/core-runtime/review/`)** — F-11 우회용:

| 상태 전이 | 결과 | 비고 |
|---|---|---|
| `null → draft → grounded` | ✅ | 좁은 source (29 파일) |
| `grounded → align_proposed → align_locked` | ✅ | 빠른 approve |
| `align_locked → surface_iterating → surface_confirmed → constraints_resolved → target_locked` | ✅ | 4 constraint 결정 일괄 + lock |
| `target_locked → compiled` | ❌ blocked by F-15 | `compileInput` 부재로 destructure 예외 — code-product pipeline 입력 미작성 |
| 이하 apply / close | 미시도 | compile 불가로 진입 불능 |

**수집된 friction 수**: **15** (ergonomic 7, conceptual 2, artifact 3, self-target 3)
**가장 치명적**:
- F-01 (기동 실패)
- F-07 (CLI 인자 규약 파격)
- F-10 (schema 미문서화)
- F-11 (self-target single session 불가)
- F-15 (compile 이 code-product pipeline 전용)

## Task #2 로의 핵심 인사이트 (5)

1. **도구가 실제로는 돌아가지 않는 상태로 방치됨** — 설계만 있고 사용 경로 곳곳에 막힘 (F-01, F-07, F-10, F-11 모두 "시도하는 순간 막힘" 유형). Dogfooding 부재의 직접 증거.

2. **Self-target 이 first-class 가 아님** — sprint-kit 시절 외부 대상 가정의 구조가 onto 자체 적용 시 드러남 (F-03, F-04, F-08, F-11). evolve 의 적용 대상 정의에 `self` 케이스가 없음.

3. **Align-packet 은 실제로 유용함 — 하지만 draft 부터 mismatch** (H2 가설 부분 검증):
   - `align-packet.md` = decision surface, Task #1 design doc 과 보완 관계 ✓
   - `draft + compile` = code-product build pipeline (build-spec / brownfield-detail / delta-set / validation-plan), **process/architecture design doc 생성과 fit 하지 않음** ✗

4. **Entry mode 분기가 미완성** — `experience` / `interface` / `process` 가 type 으로 존재하나, 각 mode 별 후반부 (draft / compile / apply) 가 모두 code-product 가정. process/architecture design 전용 후반부 없음.

5. **3 레이어 (prose / TS schema / 에러 메시지) 가 서로 표류** — schema 는 코드, prose 는 수동, 에러는 sprint-kit 시대. 한 곳을 고쳐도 다른 곳은 그대로 (F-03, F-04, F-06, F-10).

## Hypothesis 검증 결과 (회고)

| 가설 | 결과 |
|---|---|
| **H1. 진입점 마찰** | ✅ 강하게 검증 — F-01/F-07/F-12 |
| **H2. Artifact 형식 불일치** | △ 부분 검증 — align-packet 은 fit, draft+compile 은 mismatch |
| **H3. Self-target 특수성 미반영** | ✅ 강하게 검증 — F-03/F-04/F-08/F-11 |
| **H4 (신규). Code-product pipeline 편향** | ✅ 결정적 — F-15 가 핵심 증거 |

---

## F-01 [ergonomic, high] Fresh checkout 에서 CLI 기동 실패

### 증상
Clean checkout 직후 `./bin/onto evolve --help` →
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'yaml'
imported from dist/core-runtime/review/review-artifact-utils.js
```

### 원인
`dist/` 는 commit 되어 있지만 `node_modules/` 는 당연히 없음. Plugin install 경로는 `--ignore-scripts` 라 postinstall 도 안 타고, repo clone 후 직접 CLI 를 실행하는 경로에 대한 안내가 없음.

### 영향
Dogfooding 시도 자체의 **첫 번째 단계에서 중단**. 개발자가 "도구가 고장났다" 고 판단하고 이탈할 가능성.

### 임시 해결
`npm install` 실행.

### Task #2 반영 시사점
- evolve dogfooding 을 공식 개발 흐름으로 채택하려면 **선행 조건 (npm install, 혹은 대체) 이 명시적** 이어야 함.
- `onto` wrapper script 가 의존성 부재 감지 시 친절한 안내 후 중단하는 pattern (e.g. `npm install 후 다시 시도` 메시지) 고려.

---

## F-02 [conceptual, med] `evolve start` 가 2-step — 명령 인자가 증발

### 증상
```bash
./bin/onto evolve start "<goal>" --source .
```
실행 결과: scope 초기화 + `brief.md` 생성 후 `"Scope initialized. Fill in the brief, then run 'onto evolve start' again."` 반환. 즉 **첫 호출은 "brief 만들기" 단계, 두 번째 호출이 실제 start**.

그런데 CLI 에 넘긴 goal 문자열 (`"onto review 실행방식..."`) 은 brief.md 에 **포함되지 않음**. brief.md 는 "변경 목적 (필수)" 등을 빈칸으로 제시하고 직접 채우라고 안내.

### 원인 추정
CLI 인자 goal 은 scope 생성용 description 에만 쓰이고, 구조화된 brief 는 별도 입력. 두 입력 layer 가 병행.

### 영향
- 초심자가 "내가 방금 입력한 목표는 어디 갔나?" 혼란.
- brief.md 를 채우는 건 사실상 "plan 을 종이에 적는 행위" 와 동일. 이미 대화로 결정한 내용을 다시 구조화해 쓰는 중복 작업.

### Task #2 반영 시사점
- **Plan 의 출발점이 2군데 (CLI 인자 + brief.md)** 인 것이 바람직한가? 하나로 통합 또는 목적을 명확 분리 필요.
- CLI 의 goal 을 brief.md "변경 목적" 에 자동 prefill 하는 편이 자연스러움.

---

## F-03 [artifact, high] brief.md 의 stale reference — sprint-kit

### 증상
자동 생성된 brief.md 하단:
```
## 소스
<!-- .sprint-kit.yaml에서 자동 로드됨. 추가 소스를 아래에 기입하세요. -->

### 자동 로드 (환경설정)
- 환경설정 파일(.sprint-kit.yaml)이 없거나 소스가 정의되지 않았습니다.
```

`CLAUDE.md` 기준 sprint-kit 은 **2026-04-10 에 `src/core-runtime/design/` 으로 흡수됐고 더 이상 사용되지 않음**. provenance: `development-records/absorptions/sprint-kit-20260410.md`.

### 영향
- 새 사용자가 `.sprint-kit.yaml` 을 실제로 만들려 시도할 수 있음 (존재하지 않는 설정 도입).
- 도구의 신뢰도 하락 — "과거 흔적이 남아 있는 도구".

### Task #2 반영 시사점
- evolve 의 template 들이 sprint-kit 흡수 이후 갱신되지 않았음. self-target 특수성 (onto 가 자기 흡수 이력을 반영 못 함) 이 이미 실제로 드러남.
- Phase 별 artifact template 의 drift 감지·갱신 메커니즘 필요.

---

## F-04 [ergonomic, low] Brief 의 `/start scope` 표기법 불일치

### 증상
brief.md 주석:
```
<!-- 이 문서는 /start 실행 전에 작성하는 프로젝트 준비 문서입니다. -->
<!-- 필수 항목을 채운 후 /start scope을 다시 실행하면 프로세스가 시작됩니다. -->
```

실제 현 CLI 는 `onto evolve start` 또는 `/onto:evolve start` (Claude Code). `/start scope` 은 **sprint-kit 시대 표기**로 추정.

### 영향
사용자가 `/start scope` 을 실제 명령으로 오해하고 시도하면 실패.

### Task #2 반영 시사점
F-03 과 같은 drift. 한 번 고치는 것보다 **template 내 command 표기를 현재 CLI surface 에서 동적으로 주입**하는 구조가 나음 (string literal 이 아니라 variable resolution).

---

## F-06 [ergonomic, high] `--source .` 제공했는데 "스캔할 소스가 없다"

### 증상
Brief.md 를 모두 채우고 2차 `onto evolve start ... --source .` 실행:
```
[onto] evolve start failed: 스캔할 소스가 없습니다.
  .sprint-kit.yaml에 default_sources를 추가하거나,
  brief.md에 추가 소스를 기입하거나,
  /start 명령에 --add-dir, --github 등 플래그를 사용하세요.
  (step: resolve_sources)
```

brief.md 의 "추가 소스" 섹션에 `- [x] path` 형식으로 9 개 파일 기입했지만 parser 가 읽지 못함. `--source .` 도 무시되는 듯 (또는 다른 의미).

### 원인 추정
`--source` 는 아마도 **design target (apply 대상)** 이고, 스캐너 input 은 **별도의 source list** (`--add-dir`, `--github`, 또는 brief 의 특정 형식). 두 개념의 겹치는 용어.

### 영향
- 동일 단어 "source" 가 두 layer 에 있음 — 초심자에게 혼란.
- brief 의 "추가 소스" 섹션 형식이 문서화되지 않아 기입해도 무시됨.
- 에러 메시지가 여전히 `/start` (sprint-kit 표기) 사용 — F-04 와 같은 drift.

### Task #2 반영 시사점
- Source 개념의 layer 분리 (design target vs scan source) 를 prose/UI 에 명시.
- brief template 에 "추가 소스" 유효 형식 예시 포함.
- Error 메시지 안의 명령 표기도 현 CLI 에서 dynamic 하게 주입.

---

## F-07 [ergonomic, high] `--add-dir` 는 description 문자열 내부에 써야 동작

### 증상
`onto evolve start "<desc>" --add-dir .` ← **동작 안 함** (분리된 CLI 플래그로 처리 안 됨)
`onto evolve start "<desc> --add-dir ."` ← **동작** (description 안에 플래그가 있어야 `parseStartInput` 이 파싱)

### 확인
`src/core-runtime/evolve/config/project-config.test.ts:98`
```ts
parseStartInput("튜터 차단 --add-dir /projects/app/src")
// → { sources: [{ type: "add-dir", path: "/projects/app/src" }] }
```

### 영향
- 표준 CLI 인자 규약에 정면으로 반함 — 모든 CLI 사용자의 muscle memory 와 충돌.
- `--help` 에도 이 특수 규칙 안내 없음.
- `--source .` 처럼 **독립 플래그로 보이는 것은 silent 하게 무시됨** (에러도 없음). 악명 높은 "조용한 실패" 패턴.

### Task #2 반영 시사점
- **CLI 인자 파싱을 표준 방식으로 통일** — description 은 순수 자연어, 소스/옵션은 별도 플래그.
- `parseStartInput` 의 inline flag 파싱 (sprint-kit 시대 유산일 가능성) 폐기 검토.
- 최소한 `--source` 가 무시되는 경우 명시적 에러·경고.

---

## F-08 [self-target, high] Perspective classifier 가 onto repo 자체를 코드로 인식 못함

### 증상
`reality-snapshot.json`:
```json
"perspective_summary": { "experience": 299, "code": 0, "policy": 0 }
```
928 파일 스캔 중 `code: 0`. 이 repo 는 `src/core-runtime/` 밑에 수백 개의 `.ts` 파일을 보유 — 당연히 "code perspective" 분류가 있어야 함.

### 원인 추정
Perspective classifier 의 분류 규칙이 외부 프로젝트(앱/제품 코드베이스)를 전제로 설계됨. onto 자체처럼 "메타 도구 + 설계 문서 heavy" 인 repo 에서는 `.onto/` prose 들이 experience 로, `.ts` 들이 "code 가 아닌 것" 으로 분류되는 듯.

### 영향
- 이후 propose-align 에서 code 관점 질문이 생략될 가능성.
- Dogfooding 의 self-target 특수성이 초기 분류부터 왜곡.

### Task #2 반영 시사점
- Self-target (onto 가 onto 를 evolve) 을 위한 perspective 규칙 추가/override 경로 필요.
- Perspective 분류 기준 자체의 documentation + 재정의 가능성 검토.

---

## F-09 [artifact, med] scope.md title 에 brief 전체 내용이 concat 됨

### 증상
```
# Scope: onto review 실행 시 runtime 이 host/subagent/effort 를 silent 하게 auto-resolve...
```
Scope title 에 CLI 로 넘긴 긴 문장 + brief.md "기대 결과" 5줄까지 통째로 들어감. 약 800자 이상 title.

### 원인 추정
2차 `evolve start` 가 brief.md 내용을 description 에 merge. title/description 분리 seat 이 없음.

### 영향
- scope.md 가 가독성 없음.
- align-packet / draft 로 이 description 이 흘러들어가면 후속 artifact 도 영향.

### Task #2 반영 시사점
- Brief 의 "변경 목적" 을 short title 로, 나머지를 long description 으로 분리.
- CLI description 인자는 scope 식별용 short form, 본문은 brief.md 로 명확히 분리.

---

## F-10 [artifact, high] propose-align schema 의 enum 값이 prose 에 문서화되지 않음

### 증상
`.onto/processes/evolve.md` §propose-align UX contract 에는 `perspective`, `severity`, `decision_owner` 가 필수 필드라고만 기술. 유효 enum 값은 없음.

합리적 자연어 값 (`"interface"`, `"high"`, `"principal"`) 으로 제출 → validator 가 전수 reject:
```
constraints.0.perspective: expected one of "experience"|"code"|"policy"
constraints.0.severity: expected one of "required"|"recommended"
constraints.0.decision_owner: expected one of "product_owner"|"builder"
constraints.0.options.0: expected object, received string
```

실제 유효 값은 `src/core-runtime/evolve/commands/propose-align.ts:28` 의 Zod schema 를 읽어야 알 수 있음.

### 영향
- Agent (LLM / 사람) 가 dialog 수렴 후 JSON 을 작성할 때, **TypeScript 소스 코드를 읽지 않으면 validator 를 통과할 수 없음**.
- 특히 "severity" 의 자연어 기본값 (low/medium/high) 과 실제 enum (required/recommended) 이 완전히 다름 — 실제 사용자가 이를 유추 불가능.
- `options[i]` 가 string 이 아닌 구조화된 object (`{choice, pros, risk}`) 를 요구하지만 이는 schema 만 본다.

### Task #2 반영 시사점
- **Enum 값을 prose (commands/evolve.md 또는 processes/evolve.md) 에 canonical 하게 명시**. 코드 schema 가 source of truth 여도 prose 에 동일 enum 동기화 필요.
- `onto evolve schema propose-align` 같은 **런타임 schema 조회 명령** 추가 (agent 가 즉석에서 참조 가능).
- 또는 CLI 가 "validate against schema" 전용 dry-run 모드 제공.

---

## F-11 [self-target, high] Stale 감지가 dogfooding 중 작성 중인 파일에 폭발

### 증상
`onto evolve align` 호출 → `"소스가 변경되었습니다 (add-dir:.)"` fail. Source 가 `.` (repo 전체) 인데, **친구 로그 파일 (`development-records/evolve/20260425-dogfood-friction-log-task1.md`)** 과 **evolve 자체 artifact (scopes/...)** 가 모두 스캔 대상에 포함되어, evolve 진행 중 그들 자신의 쓰기 동작이 stale 을 트리거.

### 영향
- Self-target dogfooding 에서 **단일 session 안에서도 align 이 불가능** — 계속 재-start 필요.
- scopes/ 은 `.gitignore` 되어 있지만 evolve scanner 는 gitignore 를 존중하지 않음.
- Dogfooding log 파일이 설계 대상 그 자체가 아니어도 source 스캔에 포함됨.

### Task #2 반영 시사점
- Source scanner 가 `.gitignore` 또는 `scope_exclude` 규칙 존중 필요.
- `scopes/` 같은 evolve 자체 artifact 디렉토리는 **기본 제외**.
- Self-target 에서 "설계 문서 작업 중인 폴더" (`development-records/evolve/`) 제외 옵션.
- Stale 정책을 "hash 변경 = 무조건 재-start" → "align/draft/apply 대상 파일만 변경 감지" 로 세분화.

---

## F-12 [ergonomic, high] 새 scope 를 시작할 명시 경로 없음 (`--new-scope` 플래그 부재)

### 증상
`onto evolve start "<새 description>"` 실행 시:
- 기존 scope (`scope-20260425-001`) 가 있고 events.ndjson 이 비어있지 않으면 **무조건 resume**
- 새 description 은 **무시됨** (resume 메시지만 출력)
- `--add-dir` 등 새 source 도 적용 안 됨

새 scope 를 강제하려면 `--project-name` 을 다르게 지정해야 하는데 이는 비직관적 (의도가 "새 작업 시작" 인데 "프로젝트 이름 변경" 으로 우회).

### 영향
- 한 날에 두 개 이상의 evolve session 을 시작하기 어려움 (실수로 resume 되어 의도와 다른 작업).
- F-11 stale 회피를 위해 새 scope 가 필요한 경우 우회 경로가 험난.

### Task #2 반영 시사점
- `--new-scope` 또는 `--force-new` 플래그 추가, 또는 `evolve restart` 별도 subcommand.
- Resume 인지 여부를 명시적으로 출력 (현재는 status 만 보면 헷갈림).

---

## F-13 [artifact, med] `generate_surface` 액션 의미 오인 유발

### 증상
`{"type":"generate_surface"}` 호출 → `surface_iterating` 상태로 전이 + `"Surface가 생성되었습니다. cd surface/preview && npm run dev로 mockup을 확인하세요."` 메시지. 하지만 실제 `surface/` 디렉토리는 비어있음. CLI 는 surface 를 만들지 않음, agent 가 만든 surface 의 path/hash 를 event 로 기록만 하는 책임 분리 구조.

### 원인 (code 확인)
`handleGenerateSurface` 는 `action.surfacePath` / `action.surfaceHash` 를 받지만, 입력 유효성 검사 없이 그대로 event payload 에 기록. 메시지는 "Surface 생성됨" 이라 표현되어 CLI 가 작업한 듯한 인상.

### 영향
- 사용자가 `cd surface/preview` 시도 → 디렉토리 부재 → 또 다른 혼란.
- "experience" entry mode 가 자동으로 "UI mockup with React dev server" 를 가정 — 우리의 review 설계 use case (non-UI 프로세스 설계) 와 맞지 않음.

### Task #2 반영 시사점
- `generate_surface` 의 책임 분리를 메시지에 명확히 (CLI 는 기록만 — 생성은 agent 책임).
- entry mode 와 surface 형식의 매핑이 UI 중심 — 프로세스 설계용 entry mode 추가 필요.

---

## F-14 [ergonomic, low] `lock_target` 의 사전조건 메시지가 제약 ID 부재

### 증상
`lock_target` → `"Target lock 불가: 미결정 4건. 모든 constraint 결정이 완료되어야 합니다."`

미결정 constraint 의 ID 가 안 나옴. 사용자는 `cat constraint-pool.json` 직접 봐야 어떤 것이 미결정인지 알 수 있음.

### Task #2 반영 시사점
- 사전조건 실패 메시지에 차단 사유의 구체적 식별자(예: `"미결정: C-001, C-002"`) 포함.

---

## F-15 [ergonomic, high] `compile` 액션이 cryptic 예외로 종료

### 증상
`{"type":"compile"}` 호출 → `Cannot destructure property 'state' of 'input' as it is undefined.` 예외, JSON 응답이 아닌 raw stderr.

### 원인 (code 확인)
`handleCompile` 가 `action.compileInput` 을 그대로 `compile()` 에 전달. 입력 검증 없음. `compileInput` 은 다음 필드를 요구:
- `state: ScopeState`
- `implementations: ImplementationItem[]`
- `changes: ChangeItem[]`
- `brownfield: BrownfieldContext`
- `brownfieldDetail: BrownfieldDetail`
- `surfaceSummary: string`
- `injectValidations: InjectValidation[]`

이 구조화된 plan 을 agent 가 미리 산출해야 compile 호출 가능.

### 더 큰 시사점 — evolve = code-product pipeline 전제
`compile()` 의 출력물:
- `build-spec.md` (Build Spec)
- `brownfield-detail.md`
- `delta-set.json`
- `validation-plan.md`

이 산출물 세트는 **"코드를 변경하기 위한 build plan"** — 즉 evolve 의 draft/apply/compile 은 처음부터 **code-product 변경** 을 전제로 설계됨. 우리의 Task #1 처럼 **process / architecture design doc** 을 만드는 use case 는 fit 하지 않음.

### Task #2 반영 시사점
- evolve 의 entry mode (`experience` / `interface` / `process`) 별 후반부 분기:
  - code-product use case → 현 compile pipeline
  - process design use case → design-doc-only path (draft = 자유형식 design doc 생성, compile/apply 생략 또는 단순화)
- 각 entry mode 별 expected artifact 와 next action 을 prose 에 명시.
- 입력 검증 누락 시 cryptic 예외 대신 구조화된 에러 응답.

---

## F-05 [conceptual, med] `--source .` 와 brief 의 "포함 범위" 관계 모호

### 증상
- CLI `--source .` 로 지정한 경로 = **설계 대상 (design_target)** — 탐색·apply 의 physical target
- brief.md 의 "포함 범위 / 제외 범위" = **logical scope** — 이번 작업이 건드릴 기능·변경 목록

두 input 이 서로 다른 layer 인 것은 맞지만, 주체자가 처음 도구를 만났을 때 **"source 는 뭘 적고 scope_in 은 뭘 적는가"** 를 구분하기 어려움. 특히 `source=.` (repo 전체) 일 때 scope_in 이 사실상 source 의 "부분집합 설명" 역할을 함.

### Task #2 반영 시사점
- Two-layer 입력 (physical / logical) 의 존재 의의를 prose 에 노출하거나, 하나로 수렴하는 방안 검토.
- self-target dogfooding 에선 source=repo 전체가 자연스러운 default — 이 경우 `--source` 생략 가능하게 하는 것도 방법.

---
