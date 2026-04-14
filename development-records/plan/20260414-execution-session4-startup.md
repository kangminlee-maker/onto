---
as_of: 2026-04-14T09:55:00+09:00
supersedes: 20260414-execution-session3-startup.md
status: active
functional_area: execution-startup
purpose: 실행 단계 세션 3 완료 후, 세션 4 진입을 위한 handoff. done 30건, 잔여 109건. CA 대부분 완료, 남은 작업은 hygiene 성격.
---

# 실행 단계 Session 4 Startup Handoff

## 첫 명령

```
/Users/kangmin/cowork/onto-4/development-records/plan/20260414-execution-session4-startup.md 읽고 실행 단계 이어서 진행해줘
```

---

## 1. 현재 상태 (세션 3 완료 후)

### 브랜치
- 작업 브랜치: `docs/onto-direction-20260413`
- HEAD: `3a3c007` (W-B-08 완료)
- origin 동기화: 미push (세션 3 6 commit 로컬)

### 진행률 (2026-04-14)

| 항목 | 수치 |
|---|---|
| **전체 done** | **30/139 (21.6%)** |
| canonical-advancing done | **13/17 (76.5%)** |
| 축 A | 11/76 (14%) |
| 축 B | 16/51 (31%) |
| 축 C | 0/8 (0%) |
| 축 D | 3/4 (75%) |

### 세션 3 완료 6건

| # | W-ID | 축 | canonicality | 내용 | Commit |
|---|---|---|---|---|---|
| 25 | W-A-75 | A | CA | DL-029 review-r+ (ontology-present path) | `7ceeaa4` |
| 26 | W-A-76 | A | CA | DL-029 review-r− (ontology-absent path) | `957d414` |
| 27 | W-A-58 | A | CA | Design 프로토타입 실행 + O-1~O-7 관찰 | `e7ff525` |
| 28 | W-A-74 | A | CA | DL-020 reconstruct CLI 3-step bounded path | `00a2152` |
| 29 | W-B-44 | B | supporting | R10 4 결함 판정 (W-A-58 소급) | `0896181` |
| 30 | W-B-08 | B | supporting | diagnostic code registry | `3a3c007` |

### 세션 3 주요 산출물

| 파일 | 역할 |
|---|---|
| `processes/review/ontology-path.md` | r+ 경로 계약 |
| `processes/review/ontology-absent-path.md` | r− 경로 계약 + r+ 대비 품질 저하 측정 |
| `src/core-runtime/review/ontology-path-classifier.ts` | r+/r− 라벨링 + cohort delta + per-session override hook |
| `commands/reconstruct.md` | reconstruct CLI entry 문서 |
| `src/core-runtime/evolve/commands/reconstruct.ts` | `handleReconstructCli` start/explore/complete |
| `authority/diagnostic-codes.yaml` | 12 diagnostic entry registry |
| `development-records/prototype/20260414-design-prototype-w-a-58.md` | 프로토타입 관찰 기록 |
| `development-records/prototype/20260414-design-prototype-r10-verification-w-b-44.md` | R10 4 카테고리 판정 |
| `authority/core-lexicon.yaml` v0.9.3 | 3 seed terms 추가 (review_ontology_present_path, review_path_label, review_ontology_absent_path, reconstruct_bounded_path) |

### 테스트 지표

1051 pass → **1091 pass** (+40). 5 skipped 유지 (patterns/ deferred). 1 기존 flaky (e2e-promote.test.ts, 무관).

---

## 2. 핵심 가치 축 재확인 (세션 3에서 교정)

**주체자 지시 (2026-04-14)**: onto 의 가치 축은 이중적이다. 혼동 금지.

| 관점 | 핵심 가치 | 담당 |
|---|---|---|
| **이용자 관점** | 시간·비용 최소화 | onto 의 **learn** 이 추구. `§1.0 세 측면` (점진성·지속성·기제) 은 이 축 지표 |
| **시스템 제작자 관점** | 결과물의 퀄러티·완성도 | onto 자체 설계·구현·운영의 산출 품질 (ontology·learning·review 결과) |

**Progress 판단 원칙**: 제작자 축 (결과물 퀄러티·완성도) 기준.

- "CA 76.5% = 시간·비용 최소화 달성" 식 해석 **금지**
- 대신: "CA 76.5% = 이용자에게 가치 전달하는 활동 구현의 canonical 계약 완성도 76.5%"
- scaffolding/supporting 작업도 **결과물 퀄러티** 기준으로 판단 (contract 완결성, test coverage, Principal 검증 통과 여부)

Memory seat: `feedback_onto_value_axes.md`

---

## 3. 남은 작업 분류 (109건)

### 3.1 CA 잔여 4건 — **전원 W-C, A·B 1사이클 blocker**

| W-ID | 내용 | Blocker |
|---|---|---|
| W-C-01 | Govern runtime 도입 | A·B 1사이클 운영 데이터 필요 |
| W-C-02 | Drift engine | A·B 1사이클 |
| W-C-03 | knowledge → principle | A·B 1사이클 |
| W-C-05 | Consumption feedback | A·B 1사이클 |

→ **세션 4 에서 직접 착수 불가**. W-C 는 자율성 진화 단계 (수준 1→2 엔진) 로 실제 운영 경험 축적이 조건.

### 3.2 B축 supporting 미완 35건

대표 cluster:

| Cluster | W-ID 범위 | 건수 | 성격 | 착수 가능성 |
|---|---|---|---|---|
| **SE 도메인 asset docs** | W-B-18~40 | 23 | domain 문서 작성·재구성 | Principal 검증 없이 1차 산출 가능. 승인은 후속 |
| **Business Scale Tier** | W-B-41~43 | 3 | Principal 승인 필요 | **현 세션 불가** (Principal 결정 대기) |
| **기타 supporting** | W-B-07, 16, 45, 50, 51 등 | ~9 | 각기 독립 | 규모 조사 후 선별 |

### 3.3 A축 scaffolding 미완 60건

대표 cluster:

| Cluster | W-ID 범위 | 건수 | 성격 |
|---|---|---|---|
| **build_review_cycle** | W-A-11~48 | 37 | post-PR 결함 수습 compound |
| **business_domain_wave** | W-A-06~10 | 5 | Business domain cycle 실행 |
| **agent_id_rename** | W-A-01~05 (+ W-D-04) | 5 | Phase 0/1 dual-read |
| **Self-review IA 수정** | W-A-54~57 | 4 | 구조 보정 |
| **기타 A scaffolding** | W-A-39, 49~53 등 | ~10 | 단건 |

### 3.4 A축 supporting 미완 13건

W-A-59 (onto:health), W-A-61 (lexicon rename), W-A-62 (lens 확장), W-A-64/65 (entity/relation 확장) 등. 단건 진행 가능.

### 3.5 D축 1건

W-D-04 — agent_id_rename Phase 5. compound member. ordinal=6/total=6.

---

## 4. 세션 4 권장 진행 방향

### 4.1 추천 경로 A — **B축 supporting 단건 진행** (권장)

규모 작고 독립적인 B축 supporting 부터 틈새로 처리. Principal 승인 불요 항목 우선.

후보 순서:
1. **W-B-16** (figma-mcp / generic mcp skeleton) — readers/ 모듈 확장, test 가능
2. **W-B-50** (graphify adoption hypothesis backlog 6건) — development-records 재리뷰
3. **W-B-51** (Adaptive Light Review — 리뷰 복잡도 판단) — processes 증분
4. **W-B-07** (Runtime principal confirmation seat) — 규모 큼, 선택적

한 세션에 2~3 건 처리 가능. 결과물 퀄러티는 개별 계약·테스트로 측정.

### 4.2 추천 경로 B — **SE 도메인 asset batch**

W-B-18~40 중 5~7 건을 batch 로 작성. domain 문서 작성 작업 — Principal 검증은 후속에 묶어서.

한 세션에 5~7 건 처리 가능. 도메인 문서 완성도가 결과물 퀄러티의 주 지표.

### 4.3 추천 경로 C — **A축 scaffolding 단건 진행**

W-A-59 (/onto:health 대시보드) 같은 supporting 단건 먼저. 이후 build_review_cycle cluster 의 첫 단위.

단 build_review_cycle 은 compound 의존 순서가 있어 W-A-11~12 같은 anchor 부터 순차로.

---

## 5. 첫 명령 실행 시 체크리스트

1. 이 파일 전체 읽기
2. `authority/core-lexicon.yaml` v0.9.3 lexicon_version 확인
3. `npx vitest run` 으로 1091 pass 재확인 (기존 e2e-promote flaky 1건 예상)
4. 진행 경로 (A/B/C) 주체자와 확인 후 착수
5. 작업 완료 시 commit 별 W-ID 명시 ("feat(...): W-X-NN 완료 — ...")

---

## 6. 핵심 입력 파일

```bash
cat development-records/plan/20260414-execution-session4-startup.md  # 본 파일
cat development-records/evolve/20260413-onto-todo.md                  # W-ID canonical seat
cat development-records/evolve/20260413-onto-todo-dep-graph.md         # 의존 그래프
cat development-records/plan/20260413-refresh-protocol.md              # Refresh protocol
cat development-records/evolve/20260413-onto-direction.md              # §1 정본 (가치 축 원전)
cat authority/core-lexicon.yaml                                        # v0.9.3 + 6 seed terms
```

## 7. 참조 memory

- `project_execution_phase_progress.md` — 세션 3 진행 요약 (30/139, CA 13/17)
- `feedback_onto_value_axes.md` — 이용자 vs 제작자 가치 축 구분 (세션 3 교정)
- `project_onto_direction.md` — §1 정본 맥락
- `project_m05_ready.md` — meta task 9/9 완료 배경
