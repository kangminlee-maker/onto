---
as_of: 2026-04-22
functional_area: smoke-topology
purpose: D-1 smoke-topology 실행 + 발견된 drift 전수 + fix 기록. 2026-04-18 topology-smoke-*-results.md 의 후속.
status: complete
---

# Topology Smoke — Drift Fix (2026-04-22)

## 세션 요약

D-1 smoke-topology 실행 (handoff memory `project_d1_smoke_topology_handoff.md`) → 6 종 drift 발견 → 전수 fix → 재실행 PASS.

주체자 지시 원칙 ("codex 에게 작업 지시할 때 command line 등 최대한 deterministic 한 방식을 활용하고 prompt 는 최대한 실제 작업 내용으로 한정") 이 drift #5 (outer codex prompt) fix 의 본질 guidance 가 됨.

## 전수 실행 결과 (v 최종)

| # | Smoke script | 결과 | 경로 |
|---|---|---|---|
| 1 | cc-main-agent-subagent | ✅ PASS | axis-first resolve |
| 2 | cc-teams-agent-subagent | ✅ PASS | axis-first resolve |
| 3 | cc-teams-codex-subprocess | ✅ PASS | axis-first resolve |
| 4 | cc-teams-lens-agent-deliberation | ✅ PASS | axis-first resolve + lens_agent_teams_mode |
| 5 | cc-teams-litellm-sessions | ⏭ SKIP | LiteLLM endpoint 부재 (환경) |
| 6 | cc-main-codex-subprocess | ✅ PASS | axis-first resolve + env unset |
| 7 | codex-main-subprocess | ✅ PASS (4:17) | single-layer codex |
| 8 | codex-nested-subprocess | ✅ PASS (4:17) | outer + nested codex, literal bash script prompt |
| 9 | watcher-spawn (신규) | 미실행 | script + unit test 완료, integration run 은 주체자 승인 대기 |

## 발견된 drift 6 종 + fix

### 1. Config schema drift (P9.2 retired `execution_topology_priority`)

- **증상**: 모든 smoke 가 `resolver: "review block absent"` 로 main_native degrade fallback
- **원인**: smoke config 가 P9.2 (PR #162, 2026-04-21) 에서 제거된 legacy field `execution_topology_priority` 사용
- **Fix**: 7 개 smoke script 의 config 블록을 `review:` axis block 으로 전수 교체

### 2. CLAUDE env unset 누락

- **증상**: codex-main-subprocess 가 resolver 단계에서 `cc-teams-agent-subagent` 로 잘못 매칭
- **원인**: 스크립트가 `CLAUDECODE` 만 unset, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` 는 상속 — host-detection.ts:105-109 의 CLAUDE_ENV_SIGNALS 가 OR 조건으로 이 필드 하나만 있어도 claudeHost=true
- **Fix**: 4 개 smoke (cc-main-agent-subagent, cc-main-codex-subprocess, codex-main-subprocess, codex-nested-subprocess) 의 `env -u` 에 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` 추가

### 3. Outer codex CLI flag 누락 (effort/model)

- **증상**: `spawnOuterCodex` args 에 `-c model_reasoning_effort=...` / `-m <model>` 없음
- **원인**: `codex-nested-teamlead-executor.ts:spawnOuterCodex` 가 `codex_bin/project_root/timeout_ms` 만 받고 effort/model 을 prompt template 에만 삽입 (inner 용). Outer 자체는 `~/.codex/config.toml` default (xhigh) 로 실행
- **Fix**: `spawnOuterCodex` options 에 `model?` / `reasoning_effort?` 추가 + args 배열에 조건 push. `runCodexNestedTeamlead` 이 input.model/reasoning_effort 를 forward. +2 tests.

### 4. Nested codex spawn config 가 legacy 경로만 읽음

- **증상**: `effort: medium` 을 `review.subagent` 에 넣어도 nested codex 에 전달되지 않음 → xhigh default 로 실행 → 10 분 timeout
- **원인**: `codex-nested-dispatch.ts:173-181` 이 `ontoConfig.codex?.effort` (top-level legacy) 만 읽음. P2 canonical 위치 `review.subagent` 는 ignored
- **Fix**: `resolveCodexSpawnConfig` helper 신규 — `review.subagent → review.teamlead.model → legacy codex.* → top-level model/effort` 우선순위. +4 tests.

### 5. Outer codex prompt 의 descriptive 해석 여지

- **증상**: 1-4 fix 후에도 outer codex 가 `LENS_DISPATCH_SUMMARY` 찍지 않음. `.axiology.stderr.log` 같은 파일에 lens output 이 **diff 형식** 으로 남음 — outer 가 자체 file-edit tool 로 작업 수행
- **원인**: prompt 가 "For each lens, invoke a nested codex exec subprocess..." descriptive instruction — outer 가 자체 tool use 를 "더 효율적" 이라고 판단해 nested 를 실제 spawn 하지 않음
- **Fix**: `buildNestedTeamleadPrompt` 를 literal bash script 로 재작성. 모든 값 (lens id, packet/output path, model, effort, sandbox) 을 TS 에서 interpolation 완료. Outer 는 `bash -s` 로 pipe 만. Outer 해석 자유도 제거.
  - 병렬 spawn (`& wait` 패턴, 실험 5 의 성공 패턴 차용)
  - ENV-BEFORE / ENV-AFTER diagnostic + LENS_DISPATCH_SUMMARY 를 script literal 로 포함
  - +4 tests

### 6. Outer stdout/stderr archive 부재

- **증상**: `nested_raw.outer_stdout` 이 session artifact 로 보존되지 않음 → ENV-BEFORE/AFTER diagnostic 검증 불가
- **원인**: `executeReviewViaCodexNested` 가 nested_raw 를 return 하지만 review-invoke 최종 JSON 에는 포함되지 않음. 세션 종료 후 trace 복구 불가
- **Fix**: `archiveOuterStreams` helper 추가 — `sessionRoot/nested-outer-stdout.log` + `nested-outer-stderr.log` 에 write. Best-effort (write 실패는 dispatch 결과에 영향 없음). +1 test.

## 실측 검증

### codex-nested-subprocess 최종 실행 (v5, 2026-04-22 02:27)

- Wall time: 4:17 (medium effort, 6 lens 병렬)
- 6 lens output (`round1/*.md`) 정상 생성, 각 ~250-550 bytes
- `nested-outer-stdout.log` artifact 에 ENV-BEFORE / ENV-AFTER / SUMMARY 전수 보존

### Manual diagnostic run (2026-04-22 02:35)

ENV-AFTER 보고 size ↔ 실제 파일 size consistency 검증:
```
axiology  555 bytes   ✅  coverage  447 bytes   ✅
evolution 497 bytes   ✅  logic     392 bytes   ✅
semantics 398 bytes   ✅  structure 374 bytes   ✅
```

## 추가 실험 (순차 empirical 검증)

Drift #5 의 root cause 를 좁히기 위한 실험:

| # | 목적 | 결과 |
|---|---|---|
| 1 | codex exec 의 단일 shell command 실행 | ✅ 10초 |
| 2 | codex 안에서 2 개 shell command 병렬 | ✅ ELAPSED=3 (wall 14s) |
| 3 | codex 가 nested codex 2 개 병렬 spawn | ✅ ELAPSED=4 (wall 13s) |
| 4 | Nested 에 model/effort 독립 제어 | ✅ reasoning effort: low / medium 헤더 확인 |
| 5 | 10 개 nested codex 동시 실행 | ✅ 10/10 성공, ELAPSED=7 |

결론: codex 의 기본 병렬 spawn 메커니즘은 건강. Drift 는 **onto 의 prompt 해석 유도** 에 있었음.

## Watcher spawn blind spot (follow-up 마련됨)

기존 8 smoke 가 `--no-watch` 를 전달해 `spawn-watcher.ts` regression 을 catch 하지 못하는 blind spot 식별:

- `spawn-watcher.ts` 에 `ONTO_WATCHER_DRY_RUN=1` env 지원 추가 (detection 만 하고 실제 osascript/tmux spawn skip)
- `spawn-watcher.test.ts` 신규 (9 unit test) — detection priority 순서 + prereq 실패 + darwin platform gate
- `scripts/smoke-topology/watcher-spawn.sh` 신규 — codex-main-subprocess 경로 + dry-run env + "detection via" assertion (dry-run 은 log verb 로 real attach 와 구분, LLM 호출 약 7 call, 주체자 승인 시 실행)

## 다음 세션 (별도 PR)

`project_config_format_unification.md` — ~/.onto/config.yml (P2 신형식) vs project .onto/config.yml (P9.2 이전 legacy) 의 3 세대 drift. Canonical 확정 + migration + deprecation lint 을 별도 PR 로 처리.

## 연관 파일

- `scripts/smoke-topology/*.sh` (8 기존 + 1 신규 + fixture + README)
- `src/core-runtime/cli/codex-nested-teamlead-executor.ts` (spawnOuterCodex + prompt rewrite)
- `src/core-runtime/cli/codex-nested-dispatch.ts` (resolveCodexSpawnConfig + archiveOuterStreams)
- `src/core-runtime/cli/spawn-watcher.ts` (dry-run mode)
- 3 test 파일 (신규 + 확장)
