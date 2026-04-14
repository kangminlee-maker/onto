---
as_of: 2026-04-15T00:45:00+09:00
supersedes: 20260414-execution-session8-startup.md
status: active
functional_area: execution-startup
purpose: 실행 단계 세션 8 완료 후, 세션 9 진입 handoff. done 57/141 (40.4%). 40% 돌파. 세션 9 는 Principal 승인 대기 cluster 해소 또는 supporting 잔여 중 하나로 진입.
---

# 실행 단계 Session 9 Startup Handoff

## 첫 명령

```
/Users/kangmin/cowork/onto-4/development-records/plan/20260415-execution-session9-startup.md 읽고 실행 단계 이어서 진행해줘
```

---

## 1. 현재 상태 (세션 8 완료 후)

### 브랜치 / PR

- 세션 8 `exec/session8-20260414` → **merged (PR #42, squash `87d7cdf`)** — W-A-77
- 세션 8 `exec/session8-w-a-78-20260415` → **merged (PR #43, squash `0e37d07`)** — W-A-78
- 세션 9 브랜치: PR merge 직후 `main` 기준 신규 `exec/session9-20260415` (브랜치명 세션 번호 일관성)

### 진행률 (2026-04-15 세션 8 종료 시점)

| 항목 | 수치 |
|---|---|
| **전체 done** | **57/141 (40.4%)** — 40% 돌파 |
| lifecycle_status=active | 66 |
| canonical-advancing done | 13/17 (76.5%, 유지) |
| 축 A | 24/78 (30.8%) |
| 축 B | 29/51 (57%) |
| 축 C | 0/8 (0%) |
| 축 D | 3/4 (75%) |
| total W-ID | **141** |

### 세션 8 완료 작업 (4 commit, 2 PR)

| # | W-ID | 작업 | PR |
|---|---|---|---|
| 1 | **W-A-77** | build → reconstruct 완전 대체 (파일·slash·CLI·state machine 코드 식별자 전수) | #42 (2 commit, `87d7cdf`) |
| 2 | **W-A-78** | design → evolve entrypoint 전수 전환 — Principal 원칙 (entrypoint 만 evolve, 항상 영문 표기) | #43 (2 commit, `0e37d07`) |

### 세션 8 주요 결정

- **W-A-77 (build → reconstruct)**: 정석 경로로 완전 전환 (1:1 pair `commands/<activity>.md + processes/<activity>.md` convention). `processes/build.md` → `processes/reconstruct.md`, `commands/build.md` 삭제, `commands/reconstruct.md` 가 slash `/onto:reconstruct` 흡수. state-machine 코드 식별자까지 전수 rename (`RECONSTRUCT_*`, `ReconstructState`, `reconstruct_exploring`, `reconstruct_failed`).
- **W-A-78 (design → evolve)**: Principal 원칙 확립 — **entrypoint 로서의 design 만 evolve 로, entrypoint 는 항상 영문으로 언급**. 방법론 term (`design_target`, `design_area`, `design_constraint`, `design_gap`) 은 lexicon entity 로 보존. 한국어 자연어 "설계" 는 보존 (별도 Phase B 검토 대상).
- **신규 W-ID 추가 없음** (세션 8 시작 시점 세션 7 추가분 2건 모두 해소).

### 세션 8 교훈 (memory 기록)

1. **실측이 가정을 이긴다**: W-A-77 초기에 "`BUILD_TRANSITIONS` 등 state machine 식별자 rename 은 scope 폭증" 주장이 있었으나 실측 결과 TS 소비자 2 파일 + persisted state 0건. 폭증 주장은 과장이었음. 다음 rename 작업 시 `git grep` + persisted state 점검이 의사결정의 정석.
2. **Build tool config 우선 점검**: W-A-78 rename 직후 vitest tests 가 1118 → 762 로 떨어지면서 `vitest.config.ts` 의 hardcoded include path (`src/core-runtime/{..,design,..}`) 를 발견. Narrow perl 치환은 이런 config 를 놓침. 다음 rename 에서는 `vitest.config.*`, `tsconfig.*`, `package.json` 의 `bin`/`scripts`, `.eslintrc.*` 등 tooling config 우선 점검.
3. **Entrypoint vs 방법론 term 구분**: activity rename 시 Perl word boundary `\b` 가 `_` 를 word char 로 취급하는 성질을 활용하면, `design_target` 같은 entity term 은 `\bdesign\b` 치환에서 자동 보존됨. 이게 narrow 치환의 안전장치.

---

## 2. 세션 9 진입 옵션

세션 8 에서 rename 두 건 (W-A-77, W-A-78) 이 완결되어 세션 7 에서 지정한 "최우선" 작업은 소진됨. 세션 9 에는 **진입 옵션** 이 여러 개:

### 옵션 A — Principal 승인 대기 cluster 해소 (추천)

수치 진행의 rate-limit 이 이 cluster. Principal 결정이 내려져야 실행 가능한 W-ID 가 **47건** 대기 중:

| Cluster | 건수 | 내용 |
|---|---|---|
| A축 build_review_cycle | 37건 | W-A-11/12 kickoff blocker. Phase 1/2 기동 승인 필요 |
| A축 business_domain_wave | 5건 | business 도메인 업그레이드 Wave 연속. HANDOFF.md 참조 |
| A축 agent_id_rename | 5건 | onto_ prefix 제거, ~100 파일. Phase 0~5 strict sequence |

**Principal 승인 요청 packet 초안 작성** → Principal 검토 → 승인 시 해당 cluster 순차 실행.

### 옵션 B — Supporting 잔여 (blocker 없음)

즉시 집행 가능한 supporting/scaffolding W-ID:

- **A축 supporting 잔여** — W-A-64 (dispatch_to 필드 경량 제안 γ, W-A-77 rename 이후 재확인 권장 — handoff 기준), W-A-65~68 등
- **B축 supporting 잔여** — 약 19건
- **D축 W-D-04** — compound member 1건

### 옵션 C — 메타 작업

- canonical seat refresh-protocol 점검 (M-08 산출물 `20260413-refresh-protocol.md` 에 따라 정기 재검토)
- development-records/evolve/ rename 이후 내부 cross-reference 정합성 점검

### 세션 9 첫 판단

**추천 경로:** 옵션 A (Principal 승인 packet 준비) + 옵션 B (즉시 집행 가능 supporting 1~2건) 병행.

Principal 승인 packet 은 세션 9 초반에 드래프트 → Principal 검토 시간 동안 supporting 작업 병행 → 승인 받으면 cluster 진입. 이 sequencing 이 세션 내 idle time 최소화.

---

## 3. 체크리스트 (세션 9 시작 시)

1. 본 파일 전체 읽기
2. `main` 최신 동기화 확인 (PR #43 merged 확인, 세션 9 handoff PR 도 merged 확인 후 진입)
3. 새 브랜치 생성: `git checkout -b exec/session9-20260415`
4. `npx vitest run` 으로 1118 pass baseline 재확인
5. 옵션 A (Principal packet) 드래프트 or 옵션 B (즉시 supporting) 중 진입 방향 선정
6. W-ID 진행 시 seat `active → done` + `rewrite_trace` 갱신 필수 (세션 5 확립 protocol)

---

## 4. 핵심 입력 파일

```bash
cat development-records/plan/20260415-execution-session9-startup.md      # 본 파일
cat development-records/evolve/20260413-onto-todo.md                     # W-ID canonical seat (141 items, rename 후 경로)
cat development-records/evolve/20260413-onto-direction.md                # §1 정본
cat authority/core-lexicon.yaml                                          # v0.9.5 + activity_enum.legacy_aliases 에 build+design entry 포함
cat development-records/plan/20260413-refresh-protocol.md                # M-08 산출, 정기 재검토 protocol
```

주의 — 세션 8 rename 영향으로 `development-records/design/` 경로는 더 이상 존재하지 않음. 모두 `development-records/evolve/` 로 옮겨졌음.

## 5. 참조 memory

- `project_execution_phase_progress.md` — 세션 8 종료 시점 57/141 + 세션 9 진입 방향
- `project_onto_direction.md` — §1.2 활동 분류 (5 activities: review/reconstruct/learn/govern/evolve)
- `feedback_end_of_session_seat_sync.md` — W-ID 완료 commit 에 seat 갱신 포함 필수

## 6. W-A-78 Phase B 후보 (별도 작업)

세션 8 에서 보존한 자연어 처리는 별도 세션 또는 별도 W-ID 로 처리:

- 한국어 자연어 "설계" 중 **entrypoint 지칭 맥락** 만 영문 "evolve" 로 통일 (Principal 원칙 "entrypoint 는 항상 영문")
  - 예: "설계 프로세스" → "evolve 프로세스", "설계 세션" → "evolve 세션"
  - 보존 대상: "설계 대상" (design_target korean_label), "설계하다" (자연어 동사), "설계 원칙" (design-principles/)
- Scope 실측 필요 — 전수 grep 후 맥락별 분류

Phase B 는 세션 9 우선순위 밖. 필요 시 신규 W-ID 로 승급.

## 7. 세션 8 lesson (memory 후보)

- **Narrow perl 치환의 완전성 점검은 build tool config 가 핵심 blind spot**: `vitest.config.ts`, `tsconfig.json`, `package.json` 의 hardcoded path 는 일반 경로 패턴과 다른 형식 (예: `{a,b,c}` brace expansion) 이라 perl 치환을 놓치기 쉽다. 다음 rename 작업 시 config 우선 스캔.
- **Entrypoint vs term 분리 원칙 (2026-04-15 Principal)**: activity rename 은 entrypoint (파일·slash·CLI·handler·state literal·W-ID field) 만 전수 치환. 방법론 term 과 자연어는 보존. Perl `\bpattern\b` 의 word boundary 성질이 `_` 를 word char 로 취급 → `design_target` 같은 snake_case term 이 자동 제외됨으로써 이 원칙이 기술적으로 자연스럽게 구현됨.
