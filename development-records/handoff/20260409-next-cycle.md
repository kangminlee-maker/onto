# Next Cycle Handoff — 2026-04-09 Start

> 상태: **Active (fresh cycle)**
> 이전 cycle: `20260406-current-work.md` (MERGED, historical reference)
> 작업 위치: `/Users/kangmin/cowork/onto`
> 현재 브랜치: `main`

---

## 1. 먼저 읽을 것 (순서대로)

1. **이 문서** — 지금 읽고 있는 파일. 전체 entry point.
2. `CLAUDE.md` — 프로젝트 개발 원칙
3. `AGENTS.md` — agent 정의
4. `authority/ontology-as-code-guideline.md`
5. `authority/llm-native-development-guideline.md`
6. `commands/review.md`, `commands/promote.md` — 주요 workflow command
7. `processes/review/productized-live-path.md`
8. `processes/review/nested-spawn-coordinator-contract.md`
9. `processes/promote.md` — Phase 3 promote 프로세스
10. (참조) `development-records/handoff/20260406-current-work.md` — 직전 cycle (Phase 1~3 구현 + harness productization + production validation) 의 완전한 기록. 새 작업이 과거 맥락을 필요로 할 때만 참고.

**중요**:
- 설치된 plugin/skill copy보다 이 레포의 문서와 코드가 authority.
- `commands/review.md`와 `package.json`이 repo-local canonical execution truth.
- Direct main commit은 documentation/handoff 에 한함. 코드 변경은 feature branch → PR 경유.

---

## 2. 직전 cycle 종결 상태

### 2.1 Merge 완료

| 항목 | 값 |
|---|---|
| PR | [`kangminlee-maker/onto#1`](https://github.com/kangminlee-maker/onto/pull/1) |
| Title | `onto-harness: review harness productization + Learn Phases 1-3 + production validation` |
| Merge commit | `2973589` (2026-04-09) |
| Strategy | `--merge` (merge commit + 전체 history 보존) |
| Source branch | `onto-harness` (merge 후 delete) |
| Commits merged | 46+ (4주분 작업, 33K+ lines changed, 191 files) |
| Backup snapshot | `onto-prototype` branch — main의 pre-merge 상태 보존 |

### 2.2 Merge에 포함된 주요 성과

1. **Review harness productization**: `onto review` 글로벌 CLI, 5 executor types (mock/subagent/agent-teams/codex/api), nested spawn coordinator, deterministic state machine, trust boundary
2. **Learn Phase 1 + 1.5**: loader.ts 학습 소비 파이프라인 (tier + token budget)
3. **Learn Phase 2**: extractor.ts 축적 파이프라인 + feedback markers
4. **Learn Phase 3**: 완전한 promote + retire 파이프라인 (24 modules, ~6000 lines)
5. **Multi-provider LLM**: Anthropic + OpenAI + Codex CLI auth.json
6. **onto_ rename**: canonical bare agent IDs
7. **9번째 lens**: axiology (purpose/value alignment verification)

### 2.3 Production validation 완료

- **B-1 smoke** (synthetic fixture, real Anthropic, ~$0.05) — 전체 LLM call path 작동
- **B-2 small batch** (real repo 5 candidates, ~$0.30) — DD-7 validator under real LLM PASS
- **B-3 full repo** (117 candidates × 3 panel + 4 agent audit, ~$3-5) — 108/117 promote_3_3, 4 duplicate rejects, 1 contract_invalid (validator 정상)
- **B-4 fix** — B-3에서 발견한 philosopher audit chunking bug (37 items → 30s timeout) 수정

### 2.4 Code review 완료

- Self + Codex independent review
- 12건 발견: BLOCKING 2 (resume path, emergency log) + MAJOR 3 (cross_agent_dedup, obligation waive atomicity, panel c4) + MINOR 4 + NIT 3
- 모두 fix, 9개 신규 E2E test 추가
- Final: **52/52 E2E PASS**, tsc clean

---

## 3. 사용자(=주체자) 액션 필요 (이 세션에서 처리 안 됨)

### 3.1 Plugin install update (Claude Code plugin manager 필요)

```
/plugin update onto
```

**왜**: 현재 active install은 commit `1207d86596f7`에 lock되어 있음 (`~/.claude-{1,2}/plugins/cache/onto/onto/1207d86596f7/`). Main이 `2973589`로 53 commits 앞섬. Update 하지 않으면 `/onto:review`, `/onto:promote` 등이 이전 버전 실행.

Bash subprocess로는 update 불가 — Claude Code 내부 plugin manager가 관리.

**영향**: update 후에는 이전 세션에서 적용한 cache hot-patch가 새 cache directory로 대체되며 자동 폐기.

### 3.2 Anthropic API 키 rotation

**왜**: 이전 cycle의 Phase 3 production validation 중 사용자(=주체자)가 API 키를 conversation history에 평문으로 노출. 이후 `/tmp/onto-anthropic-key` 임시 파일을 통해 사용. 파일은 cycle 종료 시 정리됨.

**액션**: https://console.anthropic.com/settings/keys 에서 rotate.

### 3.3 (선택) Marketplace clone drift 정리

**상태**: `~/.claude-2/plugins/marketplaces/onto/` 가 origin/main보다 53 commits 뒤짐 + 수동 modifications 다수 + untracked files.

**액션** (사용자(=주체자) 판단):
- Option A: `cd ~/.claude-2/plugins/marketplaces/onto && git stash && git pull origin main` (수동 modifications 보존)
- Option B: `/plugin marketplace remove onto && /plugin marketplace add https://github.com/kangminlee-maker/onto` (clean re-add)
- Option C: 무시 (marketplace clone이 직접 사용되지 않는다면)

---

## 4. 현재 사용 가능한 기능

### 4.1 Review 실행 경로

| 환경 | 방법 | 상태 |
|---|---|---|
| Claude Code (state machine) | `onto coordinator start` → Agent dispatch → `onto coordinator next` × 2 | **작동 (권장)** |
| Claude Code (prepare + complete) | `onto review --prepare-only` → Agent tool → `onto review --complete-session` | 작동 (하위 호환) |
| CLI (codex) | `onto review <target> <intent> --codex` | 작동 |
| CLI (anthropic API) | `onto review <target> <intent> --executor-realization api` | API 과금 |
| Global CLI (mock) | `onto review ... --executor-realization mock` | 무료, 구조 검증 |

### 4.2 Learn pipeline

| 명령 | 용도 | 상태 |
|---|---|---|
| `onto promote` | Phase 3 Phase A — candidate 수집 + 패널 리뷰 + audit | 작동 (실 LLM, 24.4분/117 candidates) |
| `onto promote --apply <session>` | Phase B — approved decisions 실행 | 작동 |
| `onto promote --resolve-conflict` | DD-23 manual escalation 해소 | 작동 |
| `onto reclassify-insights` | DD-9 — 462 legacy insights 재분류 | 작동 |
| `onto migrate-session-roots` | DD-8 legacy session → review/ 이동 | 작동 |

### 4.3 E2E 테스트

- `npm run test:e2e` — review harness 49 tests (E22까지는 100% PASS 보증, E23 이후는 codex broker contention에 환경 의존)
- `npm run test:e2e:promote` — Phase 3 promote 52 tests (100% PASS)

---

## 5. 알려진 제한 (documented follow-ups)

1. **`ontoHome` path convention mismatch**: `promote-executor`/`promoter` vs `collector`/`panel-reviewer`가 `ontoHome` 변수를 다른 의미로 해석. Production에서는 both default로 invisible. Tests에서만 노출. E-P35는 symlink fixture로 우회. 아키텍처 정리 follow-up.
2. **Cross-agent dedup criterion 6 discovery**: `discoverCrossAgentDedupClusters()`는 현재 stub (`return []`). Applicator는 완전 구현. LLM-driven cluster discovery 추가 필요.
3. **Insight reclassifier apply path**: `runInsightReclassifier`는 report 생성까지. 실제 apply (새 role tag 쓰기)는 TODO — axis_tag_change applicator 재사용 가능.
4. **Phase 3 E2E 138 → 52**: 설계는 138 tests, 구현은 critical path 52. 나머지는 production 안정화 후 커버.
5. **Known Issue 4** (documented): Cross-plugin `${CLAUDE_PLUGIN_ROOT}` 참조 패턴 금지. 상세: `development-records/tracking/20260330-known-issues.md` §4.

---

## 6. 다음 cycle 시작 제안 (우선순위)

### 6.1 즉시 처리 가능 (user 액션 불요)

- 새 feature 작업: feature branch 생성 → 작업 → PR → main
- Documentation 개선 (CLAUDE.md, authority/, README 등)
- E2E 커버리지 확대 (52 → 138 중 고가치 항목)
- Phase 3 follow-up implementation items (§5의 1, 2, 3)

### 6.2 사용자(=주체자) 액션 필요한 선행

- `/plugin update onto` 후 `/onto:review`, `/onto:promote` smoke test — plugin이 새 commit 반영하는지 확인
- 실 `onto promote` 첫 실행 후 발견되는 edge case 대응
- API 키 rotation 후 production validation 재실행 (선택)

### 6.3 열린 질문 (user decision 필요)

- Phase 3의 production 사용 빈도: 매일? 주 단위? 트리거 기준?
- Next big feature: domain doc auto-update, cross-agent dedup 완성, insight reclassifier apply, 또는 전혀 다른 방향?
- Review gate 활성화 여부 (`/codex:setup --enable-review-gate`)
- onto-prototype backup branch 유지 기간 — 몇 cycle 후 정리?

---

## 7. 핵심 파일 맵 (merged main 기준)

| 역할 | 파일 |
|---|---|
| 개발 원칙 | `CLAUDE.md`, `authority/ontology-as-code-guideline.md`, `authority/llm-native-development-guideline.md` |
| Review entrypoint | `commands/review.md` (thin), `src/core-runtime/cli/review-invoke.ts` |
| Review coordinator | `src/core-runtime/cli/coordinator-state-machine.ts`, `processes/review/nested-spawn-coordinator-contract.md` |
| Review executors | `src/core-runtime/cli/{subagent,agent-teams,codex,api,mock}-review-unit-executor.ts` |
| Learn Phase 1/1.5 | `src/core-runtime/learning/loader.ts` |
| Learn Phase 2 | `src/core-runtime/learning/extractor.ts`, `feedback.ts`, `prompt-sections.ts` |
| Learn Phase 3 shared | `src/core-runtime/learning/shared/` (artifact-registry, recovery-context, audit-state, recoverability, llm-caller) |
| Learn Phase 3 promote | `src/core-runtime/learning/promote/` (collector, panel-reviewer, judgment-auditor, retirement, apply-state, promoter, promote-executor, etc.) |
| Global CLI | `src/cli.ts`, `bin/onto` |
| Discovery | `src/core-runtime/discovery/` |
| Phase 3 design | `.onto/temp/learn-phase3-design-v9.md` (final), v8 (DD body) |
| Lessons learned | `development-records/tracking/20260330-known-issues.md` |
| E2E tests | `src/core-runtime/cli/e2e-review-invoke.test.sh`, `src/core-runtime/learning/promote/e2e-promote.test.ts` |
| 직전 cycle 기록 | `development-records/handoff/20260406-current-work.md` |

---

## 8. 환경 스냅샷 (이 handoff 작성 시점)

- **OS**: macOS (Darwin 25.2.0)
- **Node**: v25.6.1
- **npm**: 11.9.0
- **Codex CLI**: 0.118.0 (advanced runtime available, ready)
- **Git user**: kangminlee-maker
- **Active plugin**: onto commit `1207d86596f7` (STALE — update 필요)
- **Session runtime**: direct (no active broker, on-demand)

---

## 9. 이 handoff 작성 이유

직전 cycle이 merge로 종결되어 새 시작점이 필요. 이 파일은 clean slate이며, 과거 세부사항은 `20260406-current-work.md`에 archived. 다음 LLM이 이 파일 하나만 읽고도 작업 재개 가능하도록 구성.

**작업 언어 정책 (CLAUDE.md 참조)**: 존댓말 한국어. 비유/메타포 금지. 기술 용어 있는 그대로 사용 후 설명. 논리 구조 명시.
