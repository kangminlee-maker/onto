---
as_of: 2026-04-13T22:30:00+09:00
supersedes: null
status: active
functional_area: execution-startup
purpose: Meta task 9/9 완료 후 실행 단계 진입을 위한 새 세션 handoff. W-ID 구현 착수 안내.
---

# 실행 단계 Startup Handoff

본 문서는 meta task M-00~M-08 전수 완료 후, onto-todo.md v2 (139 W-ID) 의 **실행 단계 진입** 을 새 세션에 안내한다.

## 첫 명령

```
/Users/kangmin/cowork/onto-4/development-records/plan/20260413-execution-phase-startup.md 읽고 실행 단계 착수해줘
```

---

## 1. 현재 상태 (2026-04-13T22:30)

### 브랜치
- 작업 브랜치: `docs/onto-direction-20260413`
- 최신 commit: `a0bdbde` (M-08 완료)
- origin 동기화: 완료

### 계획 단계 완료 요약

| 항목 | 수치 |
|---|---|
| Meta task | 9/9 (M-00~M-08) 전수 완료 |
| Work Items | 139 W-ID (A:76, B:51, C:8, D:4) |
| Lifecycle | active 119 / deferred 20 / done 0 |
| Canonicality | canonical-advancing 17 / supporting 58 / scaffolding 64 (46.0%) |
| Ledger | 31/31 전원 resolved |
| Decision Records | 32건 누적 (DR-M00~M08) |
| Compound | 3개 (agent_id_rename 6, build_review_cycle 2+36, business_domain_wave 5) |
| Cluster | 9 singleton + 2 focused (120+4). `processes/reconstruct.md` 52개 최대 충돌점 |

---

## 2. 실행 순서 (축 의존 순서)

dep graph v1.1 §1.1 기준:

```
  D0 bootstrap (W-D-01~03, 3건)
      │
      ▼
      B (W-B-01~51, 51건 중 active 32)
      │
      ▼
      A (W-A-01~76, 76건 중 active 75)
      │
      ▼
      C (W-C-01~08, 8건 전원 active)
```

**W-D-04** (agent_id_rename Phase 5) 는 W-A-05 완료 후 실행 (compound 의존).

### 2.1 즉시 착수 가능: W-D-01~03 (D0 Bootstrap)

| id | title | files | depends_on |
|---|---|---|---|
| **W-D-01** | lexicon provisional lifecycle 성문화 (4 상태 전이) | `authority/core-lexicon.yaml` | — |
| **W-D-02** | provisional term 인용 금지 검증 도구 | `src/core-runtime/readers/lexicon-citation-check.ts` | W-D-01 |
| **W-D-03** | provisional_terms recording seat 구조 결정 (4 seat) | `authority/core-lexicon.yaml` | W-D-01 |

- W-D-01 이 선행. W-D-02, W-D-03 은 W-D-01 완료 후 병렬 가능 (files 겹침: W-D-01 과 W-D-03 이 core-lexicon.yaml 공유 → 순차 권장).
- 3건 모두 **canonical-advancing** + **govern** 활동.

### 2.2 D0 완료 후: W-B (기반 인프라)

핵심 선행:
- **W-B-01**: scope-runtime framework 추출 (A0). 축 A 전체의 선행. canonical-advancing.
- **W-B-02**: state machine 3중 구현 dedup. canonical-advancing.

W-B 51건 중 active 32건, deferred 19건 (SE Stage 4 + 도메인 P3 + scale-trigger).

---

## 3. 실행 단계 운영 규약

### 3.1 W-ID 완료 절차

1. `verification_method` 에 정의된 검증 수행
2. `evidence_seat` 에 증거 기록
3. onto-todo.md 해당 W-ID `lifecycle_status` → `done` 전환
4. `completion_criterion` 충족 확인

### 3.2 Refresh Protocol (M-08 산출)

`20260413-refresh-protocol.md` §3 기준:
- active W-ID 10건 이상 done 전환 시, 또는 30일 경과 시 refresh cycle 실행
- §10 체크리스트 순서대로 점검

### 3.3 Cluster 규칙

- 같은 cluster 내 W-ID 순차 실행 (동일 파일 동시 수정 금지)
- `processes/reconstruct.md` 수정 시 52개 W-ID 직렬화 필요 — 단일 PR 또는 순차 PR

---

## 4. 핵심 입력 파일

```bash
# 작업 디렉토리 + 브랜치
cd /Users/kangmin/cowork/onto-4
git branch --show-current

# W-ID canonical seat
cat development-records/design/20260413-onto-todo.md

# 의존 그래프
cat development-records/design/20260413-onto-todo-dep-graph.md

# Refresh protocol
cat development-records/plan/20260413-refresh-protocol.md

# §1 정본
cat development-records/design/20260413-onto-direction.md

# core-lexicon (W-D-01~03 대상)
cat authority/core-lexicon.yaml
```

---

## 5. 참조 문서

1. `20260413-onto-todo.md` v2 — 139 W-ID canonical seat
2. `20260413-onto-todo-dep-graph.md` v1.1 — 축·활동 의존 + compound 규약
3. `20260413-refresh-protocol.md` v1 — maintenance protocol
4. `20260413-onto-direction.md` — §1 정본
5. `20260413-m07-decisions.md` — DR-M07-02 cluster 판정 결과
6. `20260413-deferred-ledger.md` v1.13 — 31/31 resolved (참조용)

---

**실행 단계 진입 준비 완료.** W-D-01 (lexicon provisional lifecycle 성문화) 부터 착수.
