---
as_of: 2026-04-14T10:45:00+09:00
supersedes: 20260414-execution-session4-startup.md
status: active
functional_area: execution-startup
purpose: 실행 단계 세션 4 완료 후, 세션 5 진입을 위한 handoff. done 36건, 잔여 103건. CA 76.5% 유지.
---

# 실행 단계 Session 5 Startup Handoff

## 첫 명령

```
/Users/kangmin/cowork/onto-4/development-records/plan/20260414-execution-session5-startup.md 읽고 실행 단계 이어서 진행해줘
```

---

## 1. 현재 상태 (세션 4 완료 후)

### 브랜치 / PR

- 세션 4 브랜치: `exec/session4-20260414`, HEAD `1a8666b`
- **PR #38 OPEN**: https://github.com/kangminlee-maker/onto/pull/38 — 세션 5 시작 전 merge 확인 필요
- 세션 5 브랜치: PR #38 merge 후 `main` 기준으로 새 브랜치 생성 (`exec/session5-YYYYMMDD` 패턴)

### 진행률 (2026-04-14 세션 4 종료 시점)

| 항목 | 수치 |
|---|---|
| **전체 done** | **36/139 (25.9%)** |
| canonical-advancing done | 13/17 (76.5%, 세션 4 변화 없음) |
| 축 A | 15/76 (20%) |
| 축 B | 18/51 (35%) |
| 축 C | 0/8 (0%) |
| 축 D | 3/4 (75%) |

### 세션 4 완료 6건

| # | W-ID | 축 | canonicality | 내용 | BL 해소 | Commit |
|---|---|---|---|---|---|---|
| 31 | W-B-16 | B | supporting | figma-mcp/generic mcp 스켈레톤 (readers/mcp-{figma,generic}.ts + 20 test) | BL-062 | `abf2f77` |
| 32 | W-B-50 | B | supporting | graphify hypothesis v7 verification + authority owner 결정 기록 | BL-117 | `84981cc` |
| 33 | W-A-53 | A | scaffolding | defer CLI 서브커맨드 노출 + defer.ts 분리 (+7 test) | BL-061 | `8706dcb` |
| 34 | W-A-49 | A | supporting | §9.3 domain=none fallback 4요소 self-containedness | BL-038 CONS-1 | `31adf72` |
| 35 | W-A-51 | A | supporting | processes/design.md §8 entrypoint reference surfaces | BL-058 R-3 | `7f2f7c2` |
| 36 | W-A-52 | A | supporting | processes/design.md §9 install-surface authority alignment + lexicon seed | BL-059 R-4 | `1a8666b` |

### 세션 4 주요 산출물

| 파일 | 역할 |
|---|---|
| `src/core-runtime/readers/mcp-figma.ts` | figma-mcp 스켈레톤 (scan + grounding + hash helper) |
| `src/core-runtime/readers/mcp-generic.ts` | generic mcp (type:"mcp") 스켈레톤 |
| `src/core-runtime/design/commands/defer.ts` | executeDefer close.ts 에서 분리 |
| `src/core-runtime/design/commands/defer.test.ts` | executeDefer 단위 + CLI surface integration 7 test |
| `development-records/audit/20260414-graphify-hypothesis-verification-w-b-50.md` | Phase 0 ARCH 6건 + BT-E5/E6 split + Promotion gate presence + authority owner 결정 |
| `processes/review/lens-prompt-contract.md` v2 | §9.3 하위 3 subsection (절차·4요소·role 위임) |
| `processes/design.md` | §8 entrypoint reference surfaces + §9 install-surface alignment 4 불변식 |
| `authority/core-lexicon.yaml` v0.9.4 | +invoke_surface, +install_surface 2 seed |

### 테스트 지표

1091 pass (세션 3) → **1103 pass** (+12 net, 27 신규 - 15 이동/삭제). e2e-promote 1 기존 flaky 유지 (무관). 5 skipped 유지.

---

## 2. 핵심 가치 축 (세션 3 교정 유지)

**주체자 지시 (2026-04-14)**: onto 의 가치 축은 이중. 혼동 금지.

| 관점 | 핵심 가치 | 담당 |
|---|---|---|
| **이용자 관점** | 시간·비용 최소화 | onto 의 **learn** 이 추구 |
| **시스템 제작자 관점** | 결과물의 퀄러티·완성도 | onto 자체 설계·구현·운영의 산출 품질 |

**Progress 판단 원칙**: 제작자 축 (결과물 퀄러티·완성도) 기준. 세션 4 의 6건은 모두 결과물 퀄러티 기준 완결 (contract·test·verification 각 보유).

Memory seat: `feedback_onto_value_axes.md`.

---

## 3. 남은 작업 분류 (103건)

### 3.1 CA 잔여 4건 — **전원 W-C, A·B 1사이클 blocker**

| W-ID | 내용 | Blocker |
|---|---|---|
| W-C-01 | Govern runtime 도입 | A·B 1사이클 운영 데이터 필요 |
| W-C-02 | Drift engine | A·B 1사이클 |
| W-C-03 | knowledge → principle | A·B 1사이클 |
| W-C-05 | Consumption feedback | A·B 1사이클 |

→ **세션 5 에서 직접 착수 불가**.

### 3.2 B축 supporting 미완 33건

| Cluster | W-ID 범위 | 건수 | 성격 | 착수 가능성 |
|---|---|---|---|---|
| **SE 도메인 asset docs** | W-B-18~40 | 23 | domain 문서 작성·재구성 | Principal 검증 없이 1차 산출 가능 |
| **Business Scale Tier** | W-B-41~43 | 3 | Principal 승인 필요 | **현 세션 불가** |
| **기타 supporting** | W-B-07(deferred), 45(deferred), 51(deferred) 제외 후 ~7 | ~7 | 단건 | 규모 조사 후 선별 |

### 3.3 A축 scaffolding 미완 58건

| Cluster | W-ID 범위 | 건수 | 성격 |
|---|---|---|---|
| **build_review_cycle** | W-A-11~48 | 35 | post-PR 결함 수습 compound |
| **business_domain_wave** | W-A-06~10 | 5 | Business domain cycle |
| **agent_id_rename** | W-A-01~05 (+ W-D-04) | 5 | Phase 0/1 dual-read |
| **Self-review IA 수정** | W-A-54~57 | 4 | 구조 보정 |
| **기타** | W-A-39 등 | ~9 | 단건 |

### 3.4 A축 supporting 미완 11건

W-A-50 (CC-1 receiving seat decision 필요), W-A-59 (onto:health), W-A-61 (lexicon rename), W-A-62 (lens 확장), W-A-64/65 (entity/relation 확장) 등.

### 3.5 D축 1건

W-D-04 — agent_id_rename Phase 5. compound member.

---

## 4. 세션 5 권장 진행 방향

### 4.1 추천 경로 A — **W-A-39 단건 → SE 도메인 batch** (권장)

1. **W-A-39** (build §1 D-1 atomic append) — 시작 시 W-A-12/W-A-38 의존 완료 여부 확인. 완료되어 있으면 단건 처리 가능.
2. **SE 도메인 asset batch** — W-B-18~40 중 5~7건. 예: W-B-18 (competency_qs.md Boundary Condition CQ), W-B-19 (§Error Handling Logic), W-B-20 (extension_cases 축소/퇴역 시나리오 2건). Principal 검증은 후속.

세션 내 완결 가능: 1건 scaffolding + 4~6건 SE batch ≈ 5~7 총량.

### 4.2 추천 경로 B — **A 축 scaffolding build_review_cycle anchor 진입**

build_review_cycle 35건 중 **W-A-11~12** 같은 anchor 부터 순차로. compound 의존 순서가 있어 주의. 한 세션 2~3 건.

### 4.3 추천 경로 C — **W-A-50 CC-1 decision 처리**

receiving seat 결정 (lens-navigation-matrix 이력 참조). 3 옵션 제시 → 주체자 확인 → 1건 구현.

- 옵션 α: 매핑 테이블 신규 파일 (이전 리뷰에서 복잡도 거절 이력)
- 옵션 β: role 파일 scope 활용 pointer-only (가장 보수적)
- 옵션 γ: shared-phenomenon-contract §7 narrowed form 확장 (이전 "narrowed form 수용 가능" 명기)

### 4.4 **비추천**: W-A-50/W-B-07/W-B-45/W-B-51

- W-A-50 은 선행 결정 필요 (경로 C 로 별도 처리 가능)
- W-B-07/45/51 은 lifecycle_status=deferred

---

## 5. 첫 명령 실행 시 체크리스트

1. 이 파일 전체 읽기
2. PR #38 merge 확인 (`gh pr view 38 --json state,mergedAt`)
3. `main` 최신 동기화 + 새 세션 브랜치 생성 (`exec/session5-YYYYMMDD`)
4. `authority/core-lexicon.yaml` v0.9.4 확인
5. `npx vitest run` 으로 1103 pass 재확인 (e2e-promote 1 기존 flaky 예상)
6. 진행 경로 (A/B/C) 주체자와 확인 후 착수
7. 작업 완료 시 commit 별 W-ID 명시

---

## 6. 핵심 입력 파일

```bash
cat development-records/plan/20260414-execution-session5-startup.md  # 본 파일
cat development-records/design/20260413-onto-todo.md                  # W-ID canonical seat
cat development-records/design/20260413-onto-todo-dep-graph.md         # 의존 그래프
cat development-records/plan/20260413-refresh-protocol.md              # Refresh protocol
cat development-records/design/20260413-onto-direction.md              # §1 정본 (가치 축 원전)
cat authority/core-lexicon.yaml                                        # v0.9.4
```

## 7. 참조 memory

- `project_execution_phase_progress.md` — 세션 4 완료 요약 (36/139, CA 13/17)
- `feedback_onto_value_axes.md` — 이용자 vs 제작자 가치 축 구분
- `project_onto_direction.md` — §1 정본 맥락
- `project_m05_ready.md` — meta task 9/9 완료 배경
- `project_design_spec_v4_residuals.md` — Spec v4 R 4건 중 R-3/R-4 이제 해소. R-1/R-2 는 W-B 로 등록됨
- `project_roles_refactor_v3_backlog.md` — BL-1 CONS-1 이제 해소 (§9.3 확장)
