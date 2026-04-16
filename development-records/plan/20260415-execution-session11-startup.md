---
as_of: 2026-04-15T23:30:00+09:00
supersedes: 20260415-execution-session10-startup.md
status: active
functional_area: execution-startup
purpose: 실행 단계 세션 11 startup handoff. 세션 10 종료 후 (105/142 = 73.9%), A·B readiness 충족, W-C-01 진입 준비. 편향 제거용 9-lens 리뷰 선행 권장.
---

# 실행 단계 Session 11 Startup Handoff

## 첫 명령

```
/Users/kangmin/cowork/onto-4/development-records/plan/20260415-execution-session11-startup.md 읽고 실행 단계 이어서 진행해줘
```

---

## 1. 현재 상태 (세션 10 종료 시점)

### 진행률

| 항목 | 수치 |
|---|---|
| **전체 done** | **105/142 (73.9%)** |
| 축 A | 71/79 (89.9%) ← W-A-79 신규 추가 + done |
| 축 B | 29/51 (57%) |
| 축 C | 0/8 (0%) ← 본 세션 진입 대상 |
| 축 D | 4/4 (100%) |

### 브랜치 / PR

- 세션 10 `exec/session10-20260415` → **PR 대기** (3 commit). 세션 11 진입 전 merge 확인 → main 동기화 → 신규 `exec/session11-YYYYMMDD` 생성.

### 세션 10 완결 작업

1. **§1.4 schema-example-marker 도입** (a04cf6f) — audit 집계 왜곡 제거. `grep "^lifecycle_status: active$"` 로 실제 active 만 집계 (12건 실질). 예시 2건은 marker 로 제외.
2. **W-A-79 propose-align subcommand 추가** (4864f1b) — evolve CLI 의 grounded → align_proposed 전이 gap 메움. CLI=상태기계, agent=대화 UX 책임 분리 원칙 확립.
3. **W-A-78 post-merge cleanup** (4864f1b) — stale "design" 문자열 11곳 (cli.ts 10 + defer.ts 1) 일괄 교체. rewrite_trace 추가.
4. **A·B 1사이클 readiness closure 충족** (cd179e6) — reconstruct E2E + evolve E2E + 정본 기록.

---

## 2. 세션 11 진입 대상

### 2.1 실질 남은 active 12건

| 분류 | 건수 | 처리 경로 |
|---|---|---|
| **C 블로커** | 4건 (W-C-01/02/03/05) | **본 세션 최우선** |
| business_domain_wave | 8건 | 주체자 지시 "나중에" 보관 |

### 2.2 C cluster ordering (세션 10 handoff §3.2 유지)

```
DL-021 W-C-01 (govern runtime 도입)    [선행]
       │
       ├─ DL-019 W-C-02 (drift engine + 큐·승인)
       ├─ DL-022 W-C-03 (knowledge → principle 승격)
       └─ BL-120 W-C-05 (Consumption Feedback P1)
```

---

## 3. W-C-01 진입 프로토콜 — **편향 제거 절차 필수**

세션 10 에서 agent-Principal 대화 4 라운드로 W-C-01 설계를 수렴시켰습니다. 이 대화 결과는 readiness closure 를 위한 evolve CLI E2E exercise 의 부산물이므로, **W-C-01 본 구현 직전에 독립 9-lens 리뷰로 정화 필수**.

### 3.1 대화로 수렴된 v0 설계 (참조 입력, canonical 아님)

| 항목 | 결정 | 근거 |
|---|---|---|
| 단위 | 변경 제안 1개로 통합 (tag 로 구분) | Principal 시간·비용 최소화 |
| Tag 기준 | origin (사람=규범_변경, 자동=drift) | 생성 시 모호성 제거 |
| CLI 구조 | queue 패턴 (submit/list/decide) | govern 본질이 큐 관리 |
| 저장 위치 | 프로젝트 내부 `.onto/govern/queue.ndjson` | project-locality-principle |
| v0 승인 강제 | 기록만 (차단은 W-C-02) | bounded minimum surface |
| drift 훅 | 공유 파일 append (event-sourcing) | scope-runtime 패턴 |
| lexicon 등재 | activity (review/reconstruct/evolve 와 동격) | §1.4 다섯 활동 |

전체 propose-align 입력: `development-records/plan/20260415-govern-v0-propose-align-input.json` (6 constraints).
렌더된 align packet: `development-records/plan/20260415-govern-v0-align-packet.md` (200 lines).

### 3.2 9-lens 리뷰 선행 요건

세션 11 W-C-01 착수 시 **코드 한 줄 쓰기 전** 에 9-lens 리뷰를 수행:

- **대상**: 위 §3.1 표 + propose-align-input.json 의 6 constraints + 각 recommendation
- **방법**: review CLI (`onto review`) 또는 수동 9-lens 리뷰 수행. 필요 시 Agent Teams 로 병렬.
- **목적**: 대화 맥락에서 형성된 편향을 제거. 특히 "queue 패턴이 session 패턴보다 낫다" / "프로젝트 로컬이 전역보다 낫다" 같은 대화 중 합의 사항이 독립 관점에서도 성립하는지 검증.
- **산출물**: 리뷰 결과 (BLOCKING / SHOULD-FIX / MINOR) 기록. BLOCKING 있으면 구현 전 해소.

### 3.3 W-C-01 산출물 (handoff §3.3 유지 + 대화 결과 반영)

1. `commands/govern.md` — submit/list/decide 3-command 명세
2. `processes/govern.md` — 계약 정본 §1~§9 (review/reconstruct/evolve 동격 구조)
3. `src/core-runtime/govern/cli.ts` — handler stub (bounded minimum surface). **주의**: evolve/ 하위가 아닌 독립 디렉터리 (W-A-78 rename 이 reconstruct→evolve 같은 통합을 의미하지 않음)
4. `authority/core-lexicon.yaml` v0.11.0 → v0.12.0 — govern activity 등재
5. `src/core-runtime/scope-runtime/types.ts` 또는 신설 파일 — `drift_queue_entry` TypeScript 타입 선언 v0
6. `src/core-runtime/govern/cli.test.ts` 또는 유사 — unit test (queue append + decide 기록 + invalid input guard)
7. 본 handoff 파일의 W-C-01 entry 를 `done` 으로 전환 + rewrite_trace

### 3.4 CLI-agent 책임 분리 원칙 준수

세션 10 에서 evolve CLI 에 확립한 원칙을 govern 에도 동형 적용:
- **CLI 는 상태 기계 + 이벤트 로그 + 렌더링만 소유** (결정적)
- **LLM 호출 CLI 내부 금지**. govern submit/decide 는 pure 함수적.
- 만일 decide 과정에서 판정 근거 정리 등 LLM 작업이 필요하면, agent (Claude Code 세션) 가 수행 후 JSON 으로 수렴시킨 결과를 CLI 에 제출하는 review 패턴.

### 3.5 예상 세션 소요

- 9-lens 리뷰 선행: 0.5 세션
- W-C-01 구현: 1 세션
- 합계: 1~2 세션. BLOCKING 리뷰 결과 있으면 +0.5.

---

## 4. 세션 11 체크리스트

1. 본 파일 전체 읽기
2. `main` 최신 동기화 + 세션 10 PR merge 확인
3. 새 브랜치: `git checkout -b exec/session11-<date>`
4. `npx vitest run` 으로 1136 pass baseline 재확인
5. **§3.2 9-lens 리뷰 선행** — propose-align-input.json 의 6 constraints 에 대해 독립 리뷰. BLOCKING 해소 후 구현 진입.
6. W-C-01 구현 — §3.3 산출물 7종 순차 작성
7. test pass + TS clean 확인
8. commit + seat-sync (W-C-01 active → done + rewrite_trace) + PR 생성

---

## 5. 핵심 입력 파일

```bash
cat development-records/plan/20260415-execution-session11-startup.md        # 본 파일
cat development-records/plan/20260415-ab-cycle-readiness.md                # readiness closure 정본
cat development-records/plan/20260415-govern-v0-propose-align-input.json   # 대화 수렴 입력 (9-lens 리뷰 대상)
cat development-records/plan/20260415-govern-v0-align-packet.md            # 렌더된 align packet
cat development-records/evolve/20260413-onto-todo.md                        # W-ID seat (W-C-01 line)
cat development-records/evolve/20260413-onto-direction.md                   # §1.4 govern 완료 기준
cat commands/evolve.md                                                      # bounded subcommand 책임 분리 참조
cat src/core-runtime/evolve/commands/propose-align.ts                       # CLI-agent 책임 분리 구현 예
```

---

## 6. 참조 memory

- `project_execution_phase_progress.md` — 세션 10 종료 시점 105/142
- `project_onto_direction.md` — §1 정본 canonical
- `feedback_end_of_session_seat_sync.md` — seat 갱신 필수
- `feedback_review_executor_policy.md` — 리뷰 executor (Claude Agent Teams / Codex CLI)
- `feedback_decision_ui_pattern` — sprint-kit align-packet 스타일 결정 UI

---

## 7. 주의 및 잠재 risk

1. **9-lens 리뷰 skip risk 최대**. 대화 맥락이 아직 생생하여 "그냥 구현하면 된다" 로 이어지기 쉬움. **본 handoff 가 skip 을 명시적으로 차단하도록 §3.2 필수 요건으로 기록됨**.

2. **govern 디렉터리 위치 결정**. propose-align 은 `src/core-runtime/evolve/commands/` 에 배치했지만, govern 은 activity 로 lexicon 등재되므로 `src/core-runtime/govern/` 신규 디렉터리가 맞음. 이 구조 결정 자체가 9-lens 리뷰 대상.

3. **lexicon v0.12.0 설계**. activity 등재 시 review/reconstruct/evolve 와 동일 schema 를 따라야 함 — core-lexicon.yaml 의 현행 activity 구조 실측 후 schema 일관성 유지.

4. **scope `scopes/govern-v0-20260416-001/` 처리**. deferred 상태로 보류 중. W-C-01 구현 완료 후 이 scope 를 resume 할지 (compile/apply/close 까지 실행), 새 scope 로 시작할지 결정.

5. **중복된 propose-align-input.json 정리**. `scopes/scope-20260415-001/inputs/propose-align-input.json` 과 `development-records/plan/20260415-govern-v0-propose-align-input.json` 이 동일 내용. scopes/ 가 gitignore 이므로 git 관리는 후자만. 혼선 없음.

---

## 8. 예상 결과

세션 11 완결 시:
- 진행률 105 → 106/142 (74.6%)
- 축 C 0/8 → 1/8 (12.5%)
- canonical-advancing 15/19 → 16/19

C cluster 전원 완결 (세션 11~14) 시:
- 진행률 105 → 109/142 (76.8%)
- 축 C 4/8 (50%)
- 남은 active = business_domain_wave 8건만
