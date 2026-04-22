---
as_of: 2026-04-23
status: open
kind: bug-report
functional_area: review-infrastructure
severity: degraded
affected_pr: "#199 (Activation/Execution Determinism Redesign — transition, da88843)"
first_observed_session: ".onto/review/20260423-df566f97/"
purpose: |
  Review 의 synthesize 단계가 `ONTO_HOME` env var 누락으로 halt 되는 infra
  issue 를 기록. 9 lens 는 전수 성공하지만 synthesize runner 가 child
  process spawn 시 ONTO_HOME 을 propagate 하지 못함. PR #199 가 도입한
  Activation Determinism B4 요구사항과 review-runner 의 현 구현이 아직
  transition 중 비정합 상태.
---

# Review Synthesize Halt — `ONTO_HOME` Propagation Missing

## 1. Symptom

`npm run review:invoke` 실행 시:
1. 9 lens 전수 정상 dispatch + complete (`round1/*.md` 모두 생성)
2. synthesize runner 가 lens executor spawn 시도
3. halt with error:
   ```
   Synthesize execution failed: ONTO_HOME not set when spawning lens executor.
   Activation/Execution Determinism Redesign B4 requires unconditional
   ONTO_HOME propagation so all lens children resolve the same install.
   Set ONTO_HOME at the runtime entry before dispatching executors.
   ```
4. `final-output.md` 생성 시 synthesize output unavailable → Consensus 섹션에 "synthesize output unavailable" 기록
5. `execution-result.yaml` 의 `execution_status: halted_partial`

## 2. Reproduction

```bash
# 현재 repo root 에서
unset ONTO_HOME   # 명시적으로 unset 해도 동일 (기본값이 없음)
npm run review:invoke -- <any-target> "<intent>" --no-domain --codex
```

9 lens 는 정상 완료 → synthesize retry 1/1 실패 → halt.

## 3. Root cause (추정)

PR #199 (da88843) 가 **Activation/Execution Determinism Redesign — transition (dist bridge + ONTO_HOME propagation)** 를 도입하면서 lens/synthesize executor 가 `ONTO_HOME` env var 를 `install 경로 resolution` 의 single source of truth 로 요구하게 됨 (B4 요구사항).

현 review-invoke runner (`src/core-runtime/cli/run-review-prompt-execution.ts` 또는 관련 spawn 로직) 가 child process spawn 시 `ONTO_HOME` 을 **명시적으로 propagate 하지 않음**. transition 이 아직 완결되지 않은 상태 — lens 는 어떻게든 통과했지만 synthesize 는 B4 요구사항을 strict 적용.

## 4. Impact

- review 내용 자체에는 영향 없음 — 9 lens output 은 완전히 보존
- synthesize.md 미생성 → final-output.md 의 consensus 섹션이 비어 있음 → review 소비자가 consensus 를 직접 synthesize 해야 함 (본 세션에서 발생)
- 본 reconstruct v1 flow track 과 orthogonal 이슈 — 설계 의사결정에는 영향 없지만 review 운영 품질 저하

## 5. Workaround (검증 필요)

```bash
export ONTO_HOME=/Users/kangmin/cowork/onto-4
npm run review:invoke -- ...
```

`ONTO_HOME` 을 현 repo root 로 설정. Transition 단계의 dist bridge 가 repo-local install 을 정상 resolve 할 것으로 예상되나 미검증.

## 6. Suggested fix path

1. **review-runner 의 spawn 로직에서 ONTO_HOME 명시 전파**:
   - `spawn(cmd, args, { env: { ...process.env, ONTO_HOME: resolveOntoHome() } })`
   - `resolveOntoHome()` 은 (a) `process.env.ONTO_HOME` 이 있으면 그대로, (b) 없으면 PR #199 의 design doc 이 지정한 default (repo root 또는 `~/.onto` 등) 로 fallback
2. **또는 review:invoke entrypoint 에서 ONTO_HOME 을 early set**:
   - CLI 진입 직후 `process.env.ONTO_HOME = resolveOntoHome()` 로 세팅, child 전부 상속

fix 구현 시 PR #199 의 target-state design doc 을 참조하여 ONTO_HOME default resolution 규칙 확인 필요.

## 7. Related

- PR #199 (`da88843`): Activation/Execution Determinism Redesign — transition
- Session `.onto/review/20260423-df566f97/` — 본 bug 의 첫 실증 사례
- Review 자체 (reconstruct v1 flow r7) 는 9 lens clean pass — 본 bug 와 무관하게 Step 1 decision 진입 가능

## 8. Follow-up

- PR #199 저자에게 notify (gh issue or follow-up commit)
- review-runner spawn 로직 audit
- transition 완료 후 이 bug report 는 closed 상태로 archive
