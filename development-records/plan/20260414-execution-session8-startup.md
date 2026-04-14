---
as_of: 2026-04-14T19:20:00+09:00
supersedes: 20260414-execution-session6-startup.md
status: active
functional_area: execution-startup
purpose: 실행 단계 세션 7 완료 후, 세션 8 진입 handoff. done 55/141 (39.0%). 세션 8 최우선 — W-A-77 build → reconstruct 파일·명령명 rename 집행 (Layer B).
---

# 실행 단계 Session 8 Startup Handoff

## 첫 명령

```
/Users/kangmin/cowork/onto-4/development-records/plan/20260414-execution-session8-startup.md 읽고 실행 단계 이어서 진행해줘
```

---

## 1. 현재 상태 (세션 7 완료 후)

### 브랜치 / PR

- 세션 7 브랜치 `exec/session7-20260414` — **merged (PR #41)**
- 세션 8 브랜치: PR merge 직후 `main` 기준 신규 `exec/session8-20260414`

### 진행률 (2026-04-14 세션 7 종료 시점)

| 항목 | 수치 |
|---|---|
| **전체 done** | **55/141 (39.0%)** |
| canonical-advancing done | 13/17 (76.5%, 유지) |
| 축 A | 22/78 (28%) |
| 축 B | 29/51 (57%) |
| 축 C | 0/8 (0%) |
| 축 D | 3/4 (75%) |
| total W-ID | **141** (M-06 139 + session 7 추가 2: W-A-77, W-A-78) |

### 세션 7 완료 작업 (2 commit)

| # | W-ID / 작업 | 성격 | Commit |
|---|---|---|---|
| 1 | **W-A-61** — lexicon UF-1/UF-2 umbrella 정의 (α) | govern scaffolding | `152f5e7` |
| 2 | **W-A-62** — lens onus probandi 공통 boundary obligation (β) | govern supporting | `a132c01` |

### 세션 7 주요 결정

- **W-A-61** (UF-1/UF-2): 이름 유지 + lexicon definition 확장 + role Perspective blockquote. lexicon 0.9.4 → 0.9.5
- **W-A-62** (onus probandi): lens-prompt-contract §9.2 #6 신설. 입증 책임은 공통 원칙 (axiology/coverage 위임 배제). §8.1 why 섹션 evidence-to-claim derivation 의무 강화
- **신규 W-A-77 — build → reconstruct rename (Layer B)** — session 7 추가, 세션 8 최우선
- **신규 W-A-78 — design → evolve rename** — session 7 추가, W-A-77 후속

### W-A-64 (dispatch target relation) 상태

- **세션 7 에서 scope 분석만 수행, 미실행.** γ 옵션 (경량 dispatch_to 필드) 제안됨 → W-A-77 rename 이후 재확인 권장. rename 이 끝나면 `entrypoint.build` instance 의 legacy 주석 해소되어 context 더 명확해짐

---

## 2. 세션 8 최우선 — W-A-77 build → reconstruct rename (Layer B)

### Why now (local minimum)

- **Layer A (activity taxonomy)**: 이미 2026-04-13 완료. W-ID `activity:` 필드는 이미 `reconstruct` 사용
- **Layer B (파일·명령명)**: 의도적 deferred — BL-121 agent_id_rename 유사 phase 예약 상태. W-ID 미예약이었음 → session 7 에서 W-A-77 신규 도출
- **현재 live 참조 ~35** — `processes/build.md`, `commands/build.md` 에 걸린 refs
- **W-A-11/12** (build_review_cycle Phase 1/2 kickoff) 는 아직 Principal 승인 대기. 이 cluster 가 착수되면 `processes/build.md` 내부 편집 대량 발생 → rename 비용 선형 증가

**현재 local minimum.** 세션 8 최우선 작업으로 집행.

### Rename scope

| 항목 | 세부 |
|---|---|
| 파일 rename | `processes/build.md` → `processes/reconstruct.md`, `commands/build.md` → `commands/reconstruct.md` |
| live refs 치환 | ~35 파일 (process.md, README.md, BLUEPRINT.md, explorers/*.md, src/core-runtime/**, authority/core-lexicon.yaml, 기타) |
| lexicon 갱신 | `activity_enum.legacy_aliases[build].retire_date` 현행 유지 or update, cross-ref 주석 (rename phase 완료) 반영 |
| **rename 제외** | `npm run build:ts-core` 는 TypeScript 컴파일 명령. activity 와 무관. 변경하지 않음 |
| test/fixture | 전체 `npx vitest run` 1118 pass 유지 + golden fixture check |

### 실행 절차 (권장)

1. `git grep -l "processes/build\.md\|commands/build\.md"` 로 정확한 live refs 목록 확정 (.onto/review/ + dist/ 제외)
2. `git mv processes/build.md processes/reconstruct.md`
3. `git mv commands/build.md commands/reconstruct.md`
4. sed/Edit 로 참조 일괄 치환 (`processes/build.md` → `processes/reconstruct.md`, `commands/build.md` → `commands/reconstruct.md`)
5. lexicon `activity_enum.v0.6.1.legacy_aliases.build.context` 의 "rename phase 는 M-06 이후 별도 work item" 문구를 "rename phase W-A-77 완료 (2026-04-14)" 로 갱신
6. `npx vitest run` 1118 pass 확인
7. `npx tsc --noEmit` clean 확인
8. golden fixture (`golden/schema-*.yml` 등) 참조 확인
9. W-A-77 seat active → done, rewrite_trace 기록
10. commit: `feat(reconstruct): W-A-77 완료 — build 파일·명령명 rename 집행 (Layer B)`

### 예상 비용

2~3 시간 1 PR.

---

## 3. 세션 8 후속 — W-A-78 design → evolve rename

W-A-77 merge 후 별도 작업으로 진행.

### Scope (훨씬 큼)

| 항목 | 세부 |
|---|---|
| lexicon | `activity_enum` Layer A 확장: design → evolve legacy_alias (retire_kind=renamed), canonical_replacement="evolve" |
| W-ID activity 필드 | 4건 `activity: design` → `activity: evolve` |
| 파일 rename | `processes/design.md` → `processes/evolve.md`, `commands/design.md` → `commands/evolve.md` |
| **디렉토리 rename** | `src/core-runtime/design/` → `src/core-runtime/evolve/` — **47 파일 + 4 서브디렉토리 (adapters/commands/config/renderers)** |
| **TS import 경로** | 전체 import 경로 일괄 업데이트 (상당량) |
| live refs | ~21 md/yaml + TS imports 전체 |
| **development-records/design/** | Principal 결정 필요 — 활동명 반영 시 rename (대량 경로 참조), 카테고리명 유지 시 불변 |
| test/fixture | 전체 test + golden + TS typecheck |

### 예상 비용

4~6 시간, 별도 PR.

### semantic 재확인 (세션 7 제안)

- 현 `design` 활동 flow (`onto design start → align → draft → apply → close`): **iterative 개선 성격 → evolve 부합**
- greenfield 설계 맥락에서는 다소 어색할 수 있지만 실제 사용은 iterative 가 다수

### Principal 확인 포인트 (실행 전)

1. `development-records/design/` 디렉토리 rename 여부
2. 잔여 고려사항 (git log 의 "design" 토큰, 과거 commit message 는 불변)

---

## 4. 잔여 작업 분류 (active 86건)

- **rename phase 2건** (세션 8 최우선): W-A-77, W-A-78
- **CA 잔여 4건** (blocker 유지): W-C-01/02/03/05
- **A축 build_review_cycle 37건**: W-A-11/12 kickoff blocker (Principal 승인 대기)
- **A축 business_domain_wave 5건**: Principal 승인 대기
- **A축 agent_id_rename 5건**: Principal 승인 대기
- **A축 supporting 잔여** (W-A-64~68 등)
- **B축 supporting 잔여** (~19건)
- **D축 1건**: W-D-04 (compound member)

---

## 5. 체크리스트 (세션 8 시작 시)

1. 본 파일 전체 읽기
2. `main` 최신 동기화 (PR #41 merged 확인)
3. 새 브랜치 확인: `exec/session8-20260414` (이미 생성됨)
4. `npx vitest run` 으로 1118 pass baseline 재확인
5. W-A-77 실행 — §2 절차 1~10 따름
6. merge 후 W-A-78 (별도 세션 또는 동일 세션 내 별도 PR)

---

## 6. 핵심 입력 파일

```bash
cat development-records/plan/20260414-execution-session8-startup.md  # 본 파일
cat development-records/design/20260413-onto-todo.md                 # W-ID canonical seat (141 items)
cat development-records/design/20260413-onto-direction.md            # §1 정본
cat authority/core-lexicon.yaml                                      # v0.9.5 (W-A-61 적용 후)
```

## 7. 참조 memory

- `project_execution_phase_progress.md` — 세션 7 종료 시점 55/141
- `project_onto_direction.md` — §1.2 활동 분류 (5 activities: review/reconstruct/learn/govern/design)
- `feedback_end_of_session_seat_sync.md` — W-ID 완료 commit 에 seat 갱신 포함 필수

## 8. 세션 7 lesson (memory 후보)

- **Rename cost local minimum 발견**: Layer A / Layer B 분리 staging 된 rename 은 파일·명령 편집이 증가하기 전에 Layer B 집행이 최소 비용. W-A-77 의 경우 W-A-11/12 build_review_cycle kickoff 직전이 적합. 일반 원칙: "deferred rename 은 대상 파일 내부 편집이 시작되기 전 집행이 경제적."
