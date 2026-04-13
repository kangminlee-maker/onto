---
as_of: 2026-04-13T14:15:00+09:00
supersedes: null
status: active
functional_area: cleanup-handoff
purpose: |
  Review executor policy (2026-04-13) 정책을 끝까지 반영하기 위한 cleanup backlog handoff.
  onto-3 폴더의 Claude Code 세션(1e31b9e2-6fe7-4c7b-aad2-9fab5d246402)에서 이어서 진행.
target_session: 1e31b9e2-6fe7-4c7b-aad2-9fab5d246402
target_working_dir: /Users/kangmin/cowork/onto-3
origin_session: d6e16826-d6e0-4a1b-b4ca-ab2ac175a047 (onto-4, M-03 review 중 발견)
---

# Review Executor Cleanup Handoff

## 맥락

**feedback_review_executor_policy.md (2026-04-13)**: "onto review 실행 방식은 두 가지만 — Claude(Agent Teams nested spawn, CLI flag 없음) + Codex(CLI, `--codex`). Claude CLI executor 경로는 삭제 대상."

**M-03 review 중 발견된 잔존**: `--claude` CLI flag 가 여전히 유효 옵션처럼 노출되어 있으나 실제 실행 시 `No executor realization is available for execution_realization=agent-teams, host_runtime=claude` 에러 throw. 사용자가 그 문제를 실측 경험(2026-04-13, onto-4 M-03 review 시도).

## 확인된 잔존 (cleanup 대상)

### A. 코드 — `src/core-runtime/cli/review-invoke.ts`

- **line 76, 355, 1268, 1324, 1354, 1364, 1421, 1449, 1453, 1480, 1492, 1512, 1537, 1572, 1580, 1616**: `HostRuntime` 타입 + `host_runtime` 필드 + `hostRuntime` 파라미터 전반. codex-only 정책이면 타입·필드·파라미터 자체 제거 가능.
- **line 418~429**: `if (executionRealization === "subagent" && hostRuntime === "codex")` 분기. 나머지는 `No executor realization is available` throw. codex-only 정책이면 `if` 조건 단순화 + 타 조합 throw 로직 삭제.
- **line 1270**: `defaultExecutionRealizationForHostRuntime` — `hostRuntime === "codex" ? "subagent" : "agent-teams"`. codex-only 면 함수 자체 삭제 + 호출부에서 `"subagent"` 상수화.
- **line 1337**: `resolveExecutionRealization` 내부 fallback — 동일 로직 단순화.
- **line 1449~1616**: argv parsing 및 session setup. `--claude` / `--execution-realization` 플래그 accept → removal. 남는 것은 `--codex` (convenience alias) 또는 flag 없음 (codex default).

**검증**: grep으로 `hostRuntime`, `host_runtime`, `--claude`, `HostRuntime` 잔존 0건 확인.

### B. CLI executor 파일 — 이미 삭제됨 (확인 완료)

- `src/core-runtime/cli/subagent-review-unit-executor.ts` — 없음 ✓
- `src/core-runtime/cli/agent-teams-review-unit-executor.ts` — 없음 ✓
- `codex-review-unit-executor.ts` — 유지 (유일한 CLI executor) ✓
- `mock-review-unit-executor.ts` — 테스트용 유지 판단 ✓

### C. Skill/Command 문서 — `commands/review.md`

`.claude-plugin` / `commands/review.md` 또는 plugin 내부 review skill frontmatter 에 `--claude` 옵션이 여전히 명시됨. Cleanup 대상:

- "Execution path selection" 표에서 Claude CLI executor 행 제거, Codex CLI + Nested Spawn Coordinator 두 경로만 남김.
- "CLI executor 경로의 자동 가시성 (live watcher)" 섹션에서 `--claude` 언급 제거, `--codex`만 유지.
- "Agent Teams 필수 규칙" 섹션은 유지 (Claude 경로 = Agent Teams nested spawn 설명).
- "3-Tier Executor Fallback" 섹션 제거 또는 축소 (Tier 1 Claude CLI subagent → 삭제, Tier 2 Agent Teams = 메인 경로로 승격, Tier 3 Codex → 폴백 아닌 선택지).
- "Execution profile" 섹션의 canonical list 에서 `subagent + claude`, `agent-teams + claude` 제거. `subagent + codex` 만 유지. convenience alias `--claude` 삭제.
- "Current productization status" 표 재작성: codex 단일 wired + "Claude 실행은 Nested Spawn Coordinator 전용" 서술.
- Examples 에서 `--claude` 예제 제거.

### D. Process 계약 문서 — `processes/review/*.md`

영향 받는 파일 (grep 필요):
- `processes/review/prompt-execution-runner-contract.md` — Tier 1/2/3 fallback 설명 제거
- `processes/review/nested-spawn-coordinator-contract.md` — CLI executor 관련 섹션 제거 (Nested Spawn 자체 계약은 유지)
- `processes/review/productized-live-path.md` — Claude CLI path 언급 제거
- `processes/review/review.md` — convention 정리

### E. Memory feedback 갱신

- `feedback_review_executor_policy.md` v2 로 갱신 — "Cleanup 2026-04-XX 완료, `--claude` 및 host_runtime 추상화 삭제 commit <hash>" 기록.

## Cleanup 실행 절차 (권장 순서)

1. **Preparation**
   - `git pull origin main` (onto-3 main branch 기준)
   - Feature branch 생성: `chore/review-executor-claude-cleanup`
2. **Code cleanup** (review-invoke.ts)
   - `--claude`, `--execution-realization` flag parser 제거
   - `host_runtime` / `hostRuntime` / `HostRuntime` 전수 삭제
   - `defaultExecutionRealizationForHostRuntime` 함수 삭제
   - 관련 error throw 로직 삭제
3. **Skill 문서 cleanup** (commands/review.md)
   - 위 §C 목록 전수 반영
4. **Process 계약 문서 cleanup** (processes/review/*.md)
   - 위 §D grep 기반 전수 반영
5. **테스트 수정**
   - `e2e-review-invoke.test.sh` 에 --claude 관련 케이스 있으면 제거
   - 단위 테스트 grep 후 `host_runtime` / `--claude` 관련 assertion 제거
6. **Lint + type check**
   - `npm run lint`, `npm run typecheck` (또는 프로젝트 검증 명령)
7. **Self-review** (선택)
   - `/onto:review commands/review.md @- --codex` — cleanup 결과의 logic/structure/dependency 검증
8. **Commit + PR**
   - Commit message: `chore(review): remove --claude CLI executor path (feedback_review_executor_policy 정책 이행)`
   - PR 생성 + main merge
9. **Memory 갱신**
   - `feedback_review_executor_policy.md` v2 — cleanup 완료 commit hash 기록
10. **Verification**
   - `npm run review:invoke -- <target> "<intent>" --claude` → argparse 에서 바로 reject (이전처럼 "No executor realization" 단계까지 가지 않음)
   - `npm run review:invoke -- <target> "<intent>" --codex` → 정상 동작
   - Agent Teams nested spawn 경로: Claude Code 세션에서 플래그 없이 `/onto:review <target>` 호출 시 정상 동작

## 재개 경로

새 Claude Code 세션에서 onto-3 레포 진입 후 첫 명령:

```
/Users/kangmin/cowork/onto-4/development-records/plan/20260413-review-executor-cleanup.md 읽고 review executor cleanup 진행해줘.
```

또는 해당 handoff 파일을 onto-3 레포에 반영한 후 onto-3 상대 경로 사용.

## 주의

- **onto-4 와 onto-3 는 별도 clone, 같은 remote (`github.com/kangminlee-maker/onto.git`)**. onto-4 의 현 작업 branch `docs/onto-direction-20260413` 에 본 handoff 가 commit 됨. onto-3 에서 접근 시 `git fetch + checkout docs/onto-direction-20260413 -- development-records/plan/20260413-review-executor-cleanup.md` 로 파일만 가져올 수 있다.
- cleanup 자체는 onto-3 main branch 기준으로 진행 (onto-4 의 M-* 작업과 독립).
- cleanup PR 은 onto-4 의 `docs/onto-direction-20260413` 브랜치와 독립 — 병렬 merge 가능.

## 참조

- `feedback_review_executor_policy.md` (2026-04-13 policy SSOT)
- `src/core-runtime/cli/review-invoke.ts` (cleanup 주 대상)
- `commands/review.md` / plugin review skill (cleanup 주 대상)
- `processes/review/*.md` (cleanup 보조 대상)
- onto-4 M-03 review 시도 로그: `/tmp/m03-review-invoke2.log` (실패 재현 근거)
- onto-4 M-03 session artifact: `.onto/review/20260413-cf964039/` (Tier 2 전환 기반)
