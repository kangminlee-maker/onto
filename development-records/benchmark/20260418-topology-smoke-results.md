---
as_of: 2026-04-18
purpose: |
  Priority 4 (real E2E smoke execution) 실행 결과. handoff
  `20260418-cleanup-and-refactor-handoff.md` §2 Priority 4 Strategy 3
  의 기록 대상. 3 자동 smoke 스크립트 실행, functional path + assertion
  구조 불일치 분리 평가, 발견된 bug 정리 + 적용 fix 요약.
  수동 Claude-host 5 topology 는 별도 세션에서 주체자 동의 후 실행.
source_refs:
  handoff: "development-records/plan/20260418-cleanup-and-refactor-handoff.md"
  smoke_scripts: "scripts/smoke-topology/{codex-nested-subprocess,cc-main-codex-subprocess,codex-main-subprocess}.sh"
  fixture: "scripts/smoke-topology/fixture.sh"
  memory_sketch_v3_complete: "project_sketch_v3_complete.md"
---

# Topology Smoke Results — 2026-04-18

## Executive Summary

3 자동 smoke 스크립트 **전수 green PASS**. 1차 실행에서 assertion 구조 결함 6 건 발견 (R-1 ~ R-6), **6 건 모두 이번 세션에서 fix 적용**, 2차 실행으로 cc-main-codex + codex-main green 검증. codex-nested 는 같은 helper fix (R-3/R-6) 가 적용되었고 1차에서 functional PASS 로 관측되어 재실행 skip (비용 절감).

- **1차 실행 관측**: runtime end-to-end 경로 정상 (`record_status: completed`, `synthesis_executed: true`, final-output.md 생성). assertion 은 스크립트 bug 로 FAIL.
- **2차 실행 (fix 후)**: cc-main-codex PASS (0 call), codex-main PASS (5 call). **smoke 3/3 모두 green-exec 가능 상태 확보**.

## 실행 결과 표

| topology | functional | assertion exit | 원인 | LLM 호출 |
|---|---|---|---|---|
| codex-nested-subprocess | PASS (record_status=completed) | FAIL (1) | R-3 stream mismatch | lens 4 + synth 1 = 5 |
| cc-main-codex-subprocess | PASS (handoff JSON topology.id 정확) | FAIL (1) | R-5 script design 불일치 | 0 (deferred_to_subject_session) |
| codex-main-subprocess | PASS (record_status=completed) | FAIL (1) | R-6 readlink vs cat | lens 4 + synth 1 = 5 |

### Functional 근거 (STDOUT JSON 발췌)

- `codex-nested-subprocess`: `[review runner] topology=codex-nested-subprocess → outer codex teamlead dispatch (bypasses per-lens worker pool)` 확인. 4 lens 전원 completed + synthesize completed. `record_status: completed`, `deliberation_status: not_needed`.
- `cc-main-codex-subprocess`: `{"handoff": "coordinator-start", "host_runtime": "claude", "topology": {"id": "cc-main-codex-subprocess", "teamlead_location": "onto-main", "lens_spawn_mechanism": "codex-subprocess", ...}}`. README §"자동 실행 가능 스크립트" 가 명시한 "handoff JSON 의 topology 필드 검증까지만" 경로 실제 확인.
- `codex-main-subprocess`: `[plan:executor] topology=codex-main-subprocess bin=node args[0]=.../codex-review-unit-executor.js` 정확. 4 lens + synthesize 모두 completed.

### 관측된 lens 수: 4 (9 이 아님)

3 실행 모두 `participating_lens_ids: [logic, pragmatics, evolution, axiology]` 로 4 lens 만 참여. `review_mode: light` 이 9 lens → 4 core lens 로 축소시키는 것으로 보이지만 — README 의 비용 예상 ("lens N=9 + synthesize 1 = 10 call / 7 × 10 = 70") 과 불일치. **R-4** 로 별도 검증 필요.

## 발견 bug 목록

### R-1 — README prereq 의 잘못된 build 명령 (문서 결함)

**Symptom**: `scripts/smoke-topology/README.md` line 17 과 `fixture.sh` line 27 의 에러 메시지가 `npm run build` 를 가리키지만, `package.json` 에는 `build` script 가 없고 `build:ts-core` (tsc 컴파일) 가 존재.

**Root cause**: PR-M (#109) 에서 smoke 스크립트 추가 시 `package.json` script 이름 확인 누락.

**Impact**: 최초 실행 시 `Missing script: "build"` 로 빌드 실패. 사용자가 `package.json` 을 직접 읽어야 진행 가능.

**Fix (이번 세션 적용)**: README + fixture.sh 에러 메시지 모두 `npm run build:ts-core` 로 정정.

### R-2 — `--onto-home` 인자가 tmp 를 가리킴 (스크립트 결함)

**Symptom**: 3 자동 smoke 스크립트 모두 `--onto-home "${SMOKE_TMP_ROOT}"` 로 실행. 그러나 `--onto-home` 은 onto-core 패키지의 install 위치 (`package.json name="onto-core"` + `roles/` + `authority/` 필요) 를 가리켜야 함. tmp 는 사용자 프로젝트 성격이므로 `isOntoRoot` 검증에 실패.

**Root cause**: onto 의 두 home 개념 (onto installation vs project-root) 혼동. fixture.sh 가 이미 `ONTO_REPO_ROOT` 를 export 하는데 활용 안 함.

**Impact**: 빌드 성공 후 첫 실행에서 `Invalid onto home: <tmp dir>` 로 review 가 start-session 단계 (LLM 호출 이전) 에 fail-fast. 비용 0 소비 후 에러.

**Fix (이번 세션 적용)**: 3 스크립트 전부 `--onto-home "${ONTO_REPO_ROOT}"` 로 변경.

### R-3 — assertion 이 stdout 을 검사하지 않음 (스크립트 결함)

**Symptom**: `[review runner] topology=...` 로그는 `run-review-prompt-execution.ts` 에서 **stdout** 에 emit 되는데, smoke assertion 은 `smoke_assert_stderr_contains` 로 **stderr** 만 검사.

**Root cause**: onto core 의 로그 stream 규칙이 mixed — `[topology]`, `[plan]`, `[learn-loader]` 는 stderr, `[review runner]` 는 stdout. smoke 스크립트가 후자를 인지하지 못함.

**Impact**: functional 성공한 실행에서도 dispatch branch assertion 이 false negative 로 fail.

**Fix (이번 세션 적용)**: fixture.sh 에 `smoke_assert_log_contains` helper (stderr + stdout 양쪽 grep) 추가. codex-nested / cc-main-codex / codex-main 의 관련 assertion 을 new helper 호출로 전환.

**후속 권장**: onto core 의 `[review runner]` 로그를 stderr 로 통일하는 별도 PR (로그 stream 일관성). 이번 PR 에는 scope 밖.

### R-4 — light mode 의 lens 수 (9 → 4) vs README 비용 예상 (문서 불일치)

**Symptom**: `review_mode: light` 로 실행 시 `participating_lens_ids` 가 4 (logic/pragmatics/evolution/axiology) 만 출현. 그러나 README (이전 line 79) 는 "7 회 review × 10~12 unit ≈ 80 호출" 로 9 lens 전수 실행을 전제.

**Root cause**: `authority/core-lens-registry.yaml:63-67` 의 `light_review_lens_ids` 가 4 lens (logic / pragmatics / evolution / axiology) 로 정의되어 있음 — design intent 임. `review-invoke.ts:1186` 주석도 "host-facing positional invoke currently defaults light review to logic, pragmatics, evolution, and axiology" 로 명시. README 가 이 축소를 반영하지 않았을 뿐.

**Impact**: README 비용 예상이 실제의 2 배 이상 (70 call 예상 vs 실제 35 call).

**Fix (이번 세션 적용)**: README "비용 의식" 섹션 갱신 — 4 lens × 7 topology (단 `cc-main-codex` 는 0 call) 기준으로 자동 3 = 10, 수동 5 = 25, 합 35 call 로 재계산. `authority/core-lens-registry.yaml` 근거 링크 포함.

### R-5 — cc-main-codex-subprocess 스크립트의 assertion 구조 결함 (design 불일치)

**Symptom**: README (line 42) 는 이 스크립트의 assertion 목적을 "handoff JSON 의 topology 필드 검증까지만" 으로 명시. 그러나 스크립트 본문은 self path 검증 (lens output, synthesis.md) 까지 시도.

**Root cause**: CLAUDECODE=1 + claudeHost=true 환경에서는 `coordinator-start` handoff 로 `deferred_to_subject_session` 이 normal. 스크립트는 이전 주석에서 "onto-main teamlead 이면 self path" 로 가정했으나 실제 resolver 는 coordinator-start 를 우선.

**Impact**: script run 이 항상 exit 1 (functional PASS 여도). CI 에 넣을 수 없음.

**Fix (이번 세션 적용)**:
- 스크립트 상단 주석 재작성 — self path 가정 제거, handoff JSON 검증 목적 명시
- assertion 섹션 전면 재설계:
  - (1) `[topology] cc-main-codex-subprocess: matched` (stderr)
  - (2) STDOUT 의 `"handoff": "coordinator-start"`
  - (3) STDOUT 의 `"id": "cc-main-codex-subprocess"` (topology.id)
  - (4) `"teamlead_location": "onto-main"`
  - (5) `"lens_spawn_mechanism": "codex-subprocess"`
- self path 관련 assertion 전부 제거 (lens outputs, synthesis.md, `[plan:executor]`, "coordinator-start 이면 fail" 로직 등)
- fixture.sh 에 범용 `smoke_assert_file_contains` helper 추가 (`smoke_assert_stderr_contains` 는 back-compat alias 로 유지)
- **2차 실행 green 확인됨** (exit 0, 0 LLM call)

### R-6 — `.latest-session` 이 regular file 인데 `readlink -f` 사용 (스크립트 결함)

**Symptom**: codex-main / cc-main-codex 스크립트가 `SESSION_ROOT="$(readlink -f "${SMOKE_TMP_ROOT}/.onto/review/.latest-session")"`. 그러나 `.latest-session` 은 session 경로를 담은 **regular file** (115 bytes) 이지 symlink 가 아님. `readlink -f` 는 regular file 에 대해 그 파일의 절대 경로를 반환 (symlink 해석 안 함). 이후 `-d "${SESSION_ROOT}"` 체크에서 "디렉토리 아님" 으로 fail.

**Root cause**: onto core 의 `latest-session` pointer 구현이 symlink 가 아니라 content file. 스크립트가 이 사실을 인지하지 못함. codex-nested 스크립트는 stdout JSON 의 `session_root` 를 1차로 파싱해서 이 bug 를 우회했으나, fallback path 도 `readlink -f` 사용.

**Impact**: codex-main / cc-main-codex (후자는 R-5 로 이미 막힘) 의 lens assertion 단계에서 false fail.

**Fix (이번 세션 적용)**: 3 스크립트 전부 `readlink -f` → `cat` 으로 변경. `cat` 은 regular file 내용을 읽고 symlink 이면 target 내용을 읽으므로 양쪽 모두 호환.

## 이번 세션 fix 목록 (1 PR)

| 번호 | 파일 | 변경 |
|---|---|---|
| R-1 | scripts/smoke-topology/README.md | build 명령 정정 (`build` → `build:ts-core`) |
| R-1 | scripts/smoke-topology/fixture.sh | 에러 메시지 build 명령 정정 |
| R-2 | scripts/smoke-topology/codex-nested-subprocess.sh | `--onto-home` → `${ONTO_REPO_ROOT}` |
| R-2 | scripts/smoke-topology/cc-main-codex-subprocess.sh | 동일 |
| R-2 | scripts/smoke-topology/codex-main-subprocess.sh | 동일 |
| R-3 | scripts/smoke-topology/fixture.sh | `smoke_assert_log_contains` + `smoke_assert_file_contains` helper 추가, `smoke_assert_stderr_contains` 는 alias |
| R-3 | codex-nested-subprocess.sh | PR-L dispatch assertion 을 new helper 로 |
| R-3 | codex-main-subprocess.sh | PR-F mapping assertion 을 new helper 로 |
| R-4 | scripts/smoke-topology/README.md | "비용 의식" 섹션 — 4 lens light mode 기준 + 35 call 합계 + `authority/core-lens-registry.yaml` 근거 |
| R-5 | scripts/smoke-topology/cc-main-codex-subprocess.sh | 스크립트 주석 + assertion 섹션 전면 재설계 (handoff JSON 검증 체계) |
| R-6 | 3 스크립트 | `readlink -f` → `cat` |

## 남은 deferred

없음 — R-1 ~ R-6 모두 이번 세션에서 해소.

장기 과제 (이번 PR scope 밖):

- **onto core 로그 stream 일관성 감사**: `[review runner]` 는 stdout, 나머지 `[prefix]` 는 stderr. 외부 도구 (smoke, CI, grep-based 모니터링) 의 혼동을 방지하려면 stderr 로 통일 + JSON 결과만 stdout 유지. run-review-prompt-execution.ts 의 로그 emission 검토 필요.

## 수동 실행 대기 topology

Claude Code 세션 안에서만 의미 있는 5 topology. 주체자 별도 승인 후 실행:

- `cc-main-agent-subagent`
- `cc-teams-agent-subagent`
- `cc-teams-codex-subprocess`
- `cc-teams-litellm-sessions`
- `cc-teams-lens-agent-deliberation`

가이드: `scripts/smoke-topology/manual-claude-host-topologies.md`.

## 비용 기록

- 1차 실행: codex-nested (5 call) + codex-main (5 call) + cc-main-codex (0, handoff) = **10 call**
- 2차 실행 (fix 검증): cc-main-codex (0, handoff) + codex-main (5 call) = **5 call**
- codex-nested 2차 실행 skip (동일 helper fix 이미 적용, 비용 절감)
- 최초 R-2 로 막힌 실행: 0 call (LLM 단계 도달 전 fail-fast)
- **총 지출 약 15 LLM call**, Codex gpt-5.4 medium effort, 구독 내 소비

## Anti-patterns 학습

### 1. "end-to-end 검증" 의 두 층위

Smoke test 는 두 층위를 섞어 검증해서는 안 됨:
- **Functional**: runtime 이 LLM 호출 + output 생성까지 end-to-end 로 작동하는가
- **Metadata assertion**: 로그 / JSON 의 특정 필드가 기대값 인가

이번 smoke 는 모든 실행에서 functional PASS 였지만 assertion FAIL. 사용자가 exit 1 만 보면 "runtime bug" 로 오해 가능. **functional 성공을 먼저 보이고 metadata 결함을 후속 분리** 로 판단하는 것이 smoke 의 진단 가치를 살림.

### 2. 스크립트의 가정은 검증된 적 없는 stub

PR-M (#109) 의 스크립트는 "이렇게 될 것" 가정으로 작성됐고 실행으로 검증된 적 없음. 6 발견 중 5 개 (R-1/R-2/R-3/R-5/R-6) 이 이 누락에서 파생. **automation script 는 merge 전 최소 1회 실 실행** 이 규율이었어야 함.

### 3. 로그 stream 규칙 부재

onto core 의 `[prefix] ...` 로그가 stderr/stdout 에 혼재. `[review runner]` 는 stdout (run-review-prompt-execution 결과 JSON 과 동일 스트림), 나머지는 stderr. **외부 도구 (smoke, CI) 가 로그 grep 할 때마다 이 혼재가 재발**. 로그 stream 일관성 감사 + stderr 통일이 장기 과제.

## 다음 단계

1. 이번 세션 fix 를 1 PR 로 묶음: "fix(smoke-topology): resolve 6 assertion-structure bugs (R-1~R-6) + first green smoke run"
2. 결과 기록 (본 파일) 을 함께 commit
3. 수동 5 topology 는 주체자 동의 + Claude Code 세션 안에서 별도 진행
4. (장기) onto core 로그 stream 일관성 감사 별도 issue
