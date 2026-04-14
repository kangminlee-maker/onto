---
as_of: 2026-04-14T17:00:00+09:00
supersedes: 20260414-execution-session5-startup.md
status: active
functional_area: execution-startup
purpose: 실행 단계 세션 5 완료 후, 세션 6 진입을 위한 handoff. done 47건, 잔여 92건. Seat 누락 해소 (sync v1+v2) + A 축 role IA 3건 완결.
---

# 실행 단계 Session 6 Startup Handoff

## 첫 명령

```
/Users/kangmin/cowork/onto-4/development-records/plan/20260414-execution-session6-startup.md 읽고 실행 단계 이어서 진행해줘
```

---

## 1. 현재 상태 (세션 5 완료 후)

### 브랜치 / PR

- 세션 5 브랜치: `exec/session5-20260414`, HEAD `c4049a2`
- **PR 미생성**: 세션 6 시작 전 push + PR 생성 + merge 필요
- 세션 6 브랜치: PR merge 후 `main` 기준 신규 브랜치 (`exec/session6-YYYYMMDD` 패턴)

### 진행률 (2026-04-14 세션 5 종료 시점)

| 항목 | 수치 |
|---|---|
| **전체 done** | **47/139 (33.8%)** |
| canonical-advancing done | 13/17 (76.5%, 세션 5 변화 없음) |
| 축 A | 18/76 (24%) |
| 축 B | 26/51 (51%) |
| 축 C | 0/8 (0%) |
| 축 D | 3/4 (75%) |
| lifecycle_status=deferred | 20 |
| lifecycle_status=active 잔여 | 74 |

### 세션 5 완료 작업 (5 commit, 11 W-ID 실질 + 27 retrospective)

| # | W-ID(s) / 작업 | 성격 | Commit |
|---|---|---|---|
| 1 | **sync v1** — W-B-18~25 8건 retrospective (SE 도메인 Stage 3) | 회귀 동기화 | `d05144a` |
| 2 | **sync v2** — Sessions 1·3·4 완료 27건 retrospective (W-B-03~15, W-A-49~53/58~76, W-B-08/16/44/50) | 회귀 동기화 | `d9e9109` |
| 3 | W-A-54 — roles/logic.md 4 IA 적용 | A scaffolding | `cd6bf52` |
| 4 | W-A-55 — roles/axiology.md 4 IA 적용 | A scaffolding | `82f6edf` |
| 5 | W-A-56 — roles/synthesize.md + contract §5 5 IA 적용 | A scaffolding (scope 확장) | `c4049a2` |

### 세션 5 주요 산출물

| 파일 | 역할 |
|---|---|
| `development-records/audit/20260414-se-domain-retrospective-sync-w-b-18-25.md` | sync v1 evidence (R-1~R-8 ↔ 파일 대조) |
| `development-records/audit/20260414-sessions-1-4-retrospective-sync.md` | sync v2 evidence (27 W-ID ↔ commit hash 매핑) |
| `roles/logic.md` (34 → 104 lines) | Verdict schema + Boundary routing + Lens reciprocity |
| `roles/axiology.md` (46 → 81 lines) | Authoritative alignment input + Finding evidence requirements |
| `roles/synthesize.md` (37 → 92 lines) | Adjudication boundary + Participation completeness + Provenance obligation + Axiology preservation slot |
| `processes/review/synthesize-prompt-contract.md` §5 (+60 lines) | Participation frontmatter + Canonical taxonomy + Alias map + Per-item provenance + Immediate actions priority |

### 테스트 지표

1103 pass / 5 skipped (baseline 유지). e2e-promote 1 기존 flaky (무관).

---

## 2. 세션 5 에서 확립된 protocol 개선 (세션 6 이후 준수)

### 2.1 End-of-session seat-sync 필수화

**문제**: 세션 1~4 에서 36 W-ID 완료 후 개별 commit 까지 생성했으나 seat `lifecycle_status` 갱신은 일괄 누락. 세션 5 에서 sync v2 로 27건 회귀 처리.

**규칙 (세션 6 이후)**:
- 세션 내 W-ID 완료 시 해당 commit 에서 seat yaml 블록 `active` → `done` + `rewrite_trace` 갱신을 **같이** 수행
- 세션 마감 전 `grep -c "lifecycle_status: done"` 으로 count 확인
- handoff "완료 X건" 수치와 seat done count 가 일치해야 세션 종료

### 2.2 Retrospective sync 참조

이미 작성된 2개 audit 가 향후 유사 발견 시 template.

- `development-records/audit/20260414-se-domain-retrospective-sync-w-b-18-25.md` — semantic verification (review synthesis ↔ 파일 대조)
- `development-records/audit/20260414-sessions-1-4-retrospective-sync.md` — commit attribution (git reflog ↔ handoff 매핑)

---

## 3. 핵심 가치 축 (유지)

| 관점 | 핵심 가치 | 담당 |
|---|---|---|
| **이용자 관점** | 시간·비용 최소화 | onto 의 **learn** 이 추구 |
| **시스템 제작자 관점** | 결과물 퀄러티·완성도 | onto 자체 설계·구현·운영 |

**Progress 판단 원칙**: 제작자 축 (결과물 퀄러티·완성도). 세션 5 의 5 commit 은 모두 결과물 품질 기준 완결.

Memory seat: `feedback_onto_value_axes.md`.

---

## 4. 잔여 작업 분류 (active 74건)

### 4.1 CA 잔여 4건 — W-C, A·B 1사이클 blocker (변화 없음)

| W-ID | 내용 | Blocker |
|---|---|---|
| W-C-01 | Govern runtime 도입 | A·B 1사이클 필요 |
| W-C-02 | Drift engine | A·B 1사이클 |
| W-C-03 | knowledge → principle | A·B 1사이클 |
| W-C-05 | Consumption feedback | A·B 1사이클 |

→ **세션 6 에서 직접 착수 불가**.

### 4.2 A축 scaffolding — Self-review IA 잔여 1건

| W-ID | 내용 | 리스크 |
|---|---|---|
| W-A-57 | Self-review IA 수정 — `processes/review/lens-prompt-contract.md` (4 IA) | **synthesis 본문 부재** (`.onto/review/20260412-8829dc72/` 는 `binding.yaml` 만 존재). 4 IA 재구성 또는 round1 개별 파일 참조 필요 |

참고: W-A-49 (session 4 완료) 가 이미 §9.3 domain=none fallback 4요소 self-containedness 처리. 중복 범위 점검 필수.

### 4.3 A축 scaffolding — build_review_cycle cluster (37건)

| 축 | W-ID 범위 | 건수 | 성격 | 착수 가능성 |
|---|---|---|---|---|
| Kickoff | W-A-11 (Phase 1), W-A-12 (Phase 2) | 2 | `verification_consumer: principal`. `.onto/temp/build-review-cycle/phase-{1,2}/` artifact 준비 + Principal 승인 필요 | **Principal 결정 세션 필요** |
| Phase 1 sub-item | W-A-13~33 | 21 | W-A-11 dep (hard) | Kickoff 해소 후 |
| Phase 2 sub-item | W-A-34~48 | 15 | W-A-12 dep (hard) | Kickoff 해소 후 |

W-A-12 는 `blockers: ["Phase 1 completion"]` — Phase 1 전원 done 후에만 해소.

### 4.4 A축 scaffolding — business_domain_wave (5건)

| W-ID | 내용 | Blocker |
|---|---|---|
| W-A-06~10 | Business domain wave 실행 (Wave 1~3 + Gate + commit) | Principal 승인 (Scale Tier 방향A 확정 필요) |

### 4.5 A축 scaffolding — agent_id_rename (5건)

| W-ID | 내용 | Blocker |
|---|---|---|
| W-A-01~05, W-D-04 | Phase 0~5 dual-read + rename + verification | Principal 승인 |

### 4.6 A축 scaffolding — 기타 단건 (~10건)

| W-ID | 내용 | 특기 |
|---|---|---|
| W-A-38, W-A-39 | build §1 S-2 + D-1 single-writer / atomic append | W-A-12 dep (kickoff blocker) |
| W-A-50 | roles CC-1 receiving seat 결정 | **3 옵션 제시 → Principal 확인 → 구현**. 세션 6 착수 가능 path |

### 4.7 A축 supporting (~11건)

| W-ID | 내용 | 규모 |
|---|---|---|
| W-A-59 | `/onto:health` CLI 구현 | 중~대 (신규 CLI + module + test, 1~2h) |
| W-A-61 | lexicon rename | 중 |
| W-A-62 | lens 확장 | 중 |
| W-A-64, W-A-65 | entity/relation 확장 | 중 |
| 기타 | - | - |

### 4.8 B축 supporting 잔여 (~25건, Business Scale Tier 3건 포함)

| Cluster | W-ID 범위 | 건수 | 성격 |
|---|---|---|---|
| SE 도메인 잔여 | W-B-26~28 (P-1/P-2/P-3 process rule) | 3 | processes/build.md 편집. 22b0904 이 해당 파일도 touch 했는지 검증 선행 |
| Business Scale Tier | W-B-41~43 | 3 | Principal 승인 필요 |
| 기타 | W-B-07/45/51 (deferred) 제외 | ~19 | 단건 |

### 4.9 D축 1건 — W-D-04 (agent_id_rename compound member, Phase 5)

---

## 5. 세션 6 권장 진행 방향

### 5.1 추천 경로 A — **W-A-50 CC-1 decision 처리** (권장)

**이유**:
- 3 옵션이 이미 정리되어 있음 (session 5 handoff §4.3 경로 C)
- Principal 확인 1회 → 1건 구현 → 완결
- session 6 에서 Principal 과의 실제 협업을 전제 시 가장 sequential 하게 맞물림

**옵션 (session 5 handoff 에 기술됨)**:
- α: 매핑 테이블 신규 파일 (이전 거절 이력)
- β: role 파일 scope 활용 pointer-only (가장 보수적)
- γ: shared-phenomenon-contract §7 narrowed form 확장 (이전 "narrowed form 수용 가능" 명기)

### 5.2 추천 경로 B — **W-A-57 (lens-prompt-contract.md 4 IA)**

**이유**:
- A축 Self-review IA 클러스터 완결 (3/4 이미 done, 1건 남음)

**리스크**:
- synthesis 본문 부재. `.onto/review/20260412-8829dc72/round1/` 개별 lens 파일에서 IA 재구성 필요
- W-A-49 이 §9.3 일부 처리. 중복 범위 사전 점검 필수 (`git show 31adf72 -- processes/review/lens-prompt-contract.md`)

**진행 전 점검 단계 (예상 20~30분)**:
1. `.onto/review/20260412-8829dc72/round1/*.md` 전수 확인, 4 IA 재구성
2. 현 lens-prompt-contract.md 읽기 (W-A-49 반영 후 상태)
3. 4 IA 와 현 파일 gap 식별 → 작업 scope 확정

점검 완결 후 실제 적용은 session 6 budget 내 가능.

### 5.3 추천 경로 C — **W-A-59 `/onto:health` 신규 CLI 구현**

**이유**:
- 신규 feature, supporting 이지만 학습 dashboard 효용 큼
- test-driven 가능

**리스크**:
- 1~2h 소요. 세션 6 budget 대부분 소모
- `commands/onto-health.md` + `src/core-runtime/design/commands/health.ts` + test 3 파일 신규

### 5.4 **비추천 세션 6**:

- W-A-11/12 kickoff: Principal 승인 + artifact 준비 필요. 별도 세션
- W-A-38/39: W-A-12 kickoff blocker
- W-A-06~10, W-A-01~05: Principal 승인 대기
- W-B-41~43: Principal 승인 대기

---

## 6. 첫 명령 실행 시 체크리스트

1. 이 파일 전체 읽기
2. **세션 5 브랜치 push + PR 생성 + merge**:
   - `git push -u origin exec/session5-20260414`
   - `gh pr create ...`
   - merge 후 main 동기화
3. `main` 최신 동기화 + 새 세션 브랜치 생성 (`exec/session6-YYYYMMDD`)
4. `authority/core-lexicon.yaml` v0.9.4 확인 (세션 5 변경 없음)
5. `npx vitest run` 으로 1103 pass 재확인
6. 진행 경로 (A/B/C) 주체자와 확인 후 착수
7. **§2.1 End-of-session seat-sync protocol 준수** — W-ID 완료 commit 에 seat 갱신 포함

---

## 7. 핵심 입력 파일

```bash
cat development-records/plan/20260414-execution-session6-startup.md  # 본 파일
cat development-records/design/20260413-onto-todo.md                  # W-ID canonical seat
cat development-records/design/20260413-onto-todo-dep-graph.md         # 의존 그래프
cat development-records/plan/20260413-refresh-protocol.md              # Refresh protocol
cat development-records/design/20260413-onto-direction.md              # §1 정본 (가치 축 원전)
cat authority/core-lexicon.yaml                                        # v0.9.4
cat development-records/audit/20260414-se-domain-retrospective-sync-w-b-18-25.md  # sync v1
cat development-records/audit/20260414-sessions-1-4-retrospective-sync.md          # sync v2
```

## 8. 참조 memory

- `project_execution_phase_progress.md` — 본 세션 종료 시 47/139, CA 13/17 으로 갱신 필요
- `feedback_onto_value_axes.md` — 이용자 vs 제작자 가치 축
- `project_harness_self_review.md` — W-A-57 맥락 (4파일 self-review IA 수정 중 3 완료)
- `project_roles_refactor_v3_backlog.md` — BL-1 CONS-1 해소됨 (session 4 W-A-49)
- `project_design_spec_v4_residuals.md` — Spec v4 R 4건 중 R-3/R-4 해소됨 (session 4)
- `project_onto_direction.md` — §1 정본 맥락
- `project_m05_ready.md` — meta task 9/9 완료 배경

## 9. 세션 5 lesson (memory 후보)

- **Seat staleness 탐지 시 semantic-vs-attribution verification 분리**: semantic (review synthesis ↔ 파일 대조, session 5 sync v1) 은 건당 2~3분 소요. attribution (commit hash 매핑, sync v2) 은 건당 30초. 동일 sync 처리가 아닌 다른 검증 비용. 발견 시 카테고리 우선 판별.
- **canonical seat 원칙의 scope 확장 신호**: W-A-56 이 role 파일만 수정 범위였으나, IA-2/3/4 가 "output schema" 성격이라 `synthesize-prompt-contract §5` (단독 canonical seat) 수정 불가피. 향후 role IA 작업 시 "IA 가 schema 성격인가 behavior 성격인가" 를 scope 분해 기준으로 채택.
