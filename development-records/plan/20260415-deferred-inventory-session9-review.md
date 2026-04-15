---
as_of: 2026-04-15
status: reviewed
functional_area: deferred-inventory
purpose: 세션 9 종반 "잔여 supporting 및 deferred 모두 해소" 지시에 따른 25 deferred W-ID 전수 재검토. 각 항목별 deferral 유효성 확인 + 재활성 조건 명시.
---

# Deferred W-ID 25건 전수 재검토 (세션 9 2026-04-15)

## 재검토 원칙

1. Deferral 자체가 triage 완료된 결정 상태. "해소" = 현 시점 deferral 이유가 여전히 유효한지 확인.
2. 각 항목 별 (a) deferral 이유 (b) 유효성 (c) 재활성 trigger 를 명시.
3. 유효하지 않은 deferral (예: 의존 W-ID 가 이미 해소됨, 외부 상황 변화) 은 재분류 후보로 명시.

## 분류 결과 (4 cluster)

### Cluster 1 — External Implementation / Scale Trigger (2건)

**[W-A-27] build §2 R-29 Tier 1 tokenization CJK/Unicode**
- Deferral 이유: 구현이 `src/core-runtime/learning/promote/panel-reviewer.ts` 의 `significantTokens` 함수에 위임. reconstruct.md 는 참조만.
- 유효성: **유효**. 본 reconstruct.md 의 schema-level 개념 선언 범위 밖. 실제 구현 개선은 별도 track.
- 재활성 trigger: panel-reviewer.ts 의 CJK/Unicode tokenization 규칙을 reconstruct.md 에 반영하고자 하는 의도가 발생 시.

**[W-A-36] build §1 E-1 Error code registry 확장성**
- Deferral 이유: 현재 error code 12개. N≈20 에 도달 시 `authority/error-codes.yaml` data seat 로 이관.
- 유효성: **유효**. 현재 error code 개수가 threshold 미달.
- 재활성 trigger: error code 개수가 N≈20 도달 시 자동 진입.

### Cluster 2 — SE Domain Stage 3~4 잔여 (12건)

전원 `BL-073~084`, `priority P3 Stage 3/4`. SE 도메인 업그레이드 완료 후 잔여 improvement 항목.

| W-ID | 제목 요약 |
|---|---|
| W-B-29 | SE CQ-T09 Generic Type Handling CQ |
| W-B-30 | SE Constraint Propagation CQ |
| W-B-31 | SE concepts.md topic 주축 전환 + L1/L2/L3 태그 |
| W-B-32 | SE extension_cases change trigger 분류 축 |
| W-B-33 | SE domain_scope Bias Detection "7" 동적 참조 |
| W-B-34 | SE domain_scope Sub-area 귀속 규칙 |
| W-B-35 | SE domain_scope 적용 가능성 마커 |
| W-B-36 | SE domain_scope 외부 표준 버전 단일화 |
| W-B-37 | SE concepts.md Module 동음이의어 등록 |
| W-B-38 | SE domain_scope concern 3 분류축 관계 |
| W-B-39 | SE competency_qs Sub-area × CQ 매핑 테이블 |
| W-B-40 | SE competency_qs CQ 코드 접두사 충돌 |

- Deferral 이유: priority P3 Stage 3/4. SE 도메인 완성도 이미 충분하며, 추가 개선은 선택적.
- 유효성: **유효**. 현 시점 SE 소비자의 불편/오류 보고 없음.
- 재활성 trigger: SE 도메인을 재검토하는 세션 진입 시 (예: SE 도메인 사용 중 결함 발견, 또는 SE 도메인 5차 업그레이드 결정).

참조 memory: `project_se_domain_review_followup.md` — "SE 업그레이드 리뷰 후 Stage 3-4 잔여 20건 + 프로세스 개선 3건"

### Cluster 3 — Domain Upgrade Deferred (5건)

`BL-112~116`, `priority P3`. 현재 4 도메인이 얕은 상태 (Palantir 4차 업그레이드 완료 이후 잔여).

| W-ID | 도메인 | 현 크기 | 목표 |
|---|---|---|---|
| W-B-45 | market-intelligence | 42K | 200K+ 수준 업그레이드 |
| W-B-46 | accounting | 44K | 200K+ (accounting-kr 141K 와 별도) |
| W-B-47 | finance | 46K | 200K+ |
| W-B-48 | visual-design | 57K | 200K+ (ui-design 과 쌍) |
| W-B-49 | Palantir RESEARCH_NOTES §10 | — | 분석가 보고서 수치 반영 여부 (4차 업그레이드 판정) |

- Deferral 이유: 도메인 업그레이드는 세션당 1개 기준 대형 작업. 현재 business 도메인 업그레이드 진행 중 (HANDOFF.md 참조). 순차 진행 원칙.
- 유효성: **유효**. business 도메인 완료 후 다음 도메인 선정 시 재활성.
- 재활성 trigger: business 도메인 업그레이드 완료 + 다음 도메인 선정.

참조 memory: `project_next_domain_upgrade.md`, `project_domain_upgrade_plan.md`, `project_palantir_foundry_upgrade.md`.

### Cluster 4 — Infrastructure / Large Refactor (6건)

| W-ID | 제목 요약 | Deferral 이유 | 재활성 trigger |
|---|---|---|---|
| **W-B-07** | Runtime principal confirmation seat 도입 | v3 설계 완료, code refactor 규모 큼 — 여러 runtime 컴포넌트 영향 | runtime 재설계 세션 진입 |
| **W-B-51** | Adaptive Light Review (리뷰 복잡도 자동 판단) | 대형 feature. Step 1.5 Complexity Assessment 신설 수반 | review 활동 확장 세션 진입 |
| **W-C-04** | DL-017 지속성 seat (eval 인프라) | W-C-01 (Govern runtime) 의존. C 블로커 | W-C-01 해소 이후 |
| **W-C-06** | Harness IA-1 event_marker signal 불일치 | PR #20 CLOSED (no merge). harness self-review 작업 중단 | harness self-review 재개 세션 진입 |
| **W-C-07** | Harness IA-2 creation_gate dead code | PR #20 CLOSED | harness self-review 재개 |
| **W-C-08** | Harness IA-3 health-history canonical 판정 | PR #20 CLOSED. Principal 결정 가능하나 현 시점 소비자 영향 없음 | harness 재개 시 주체자 판단 |

유효성: **전원 유효**. 각 항목 deferral 이유가 구체적 blocker 또는 저우선순위.

## 종합

**25건 전수 deferral 유효**. 재분류 후보 0건.

**재활성 우선순위**:
1. P3 domain upgrade (Cluster 3, 5건) — business 도메인 완료 후 즉시 후속
2. SE Stage 3~4 (Cluster 2, 12건) — SE 도메인 재진입 발생 시
3. Harness IA (Cluster 4, 3건) — harness self-review 재개 시
4. Eval / Adaptive / Runtime refactor (Cluster 4, 3건) — 해당 feature 개발 시

## How to apply

- 본 파일은 deferred W-ID 의 **현 시점 유효성 검증 기록**. 별도 seat 변경은 불필요 (deferral 자체가 결정 상태).
- 각 W-ID 의 rewrite_trace 는 건드리지 않음 — drift 방지.
- 재활성 trigger 발생 시 해당 W-ID 를 `deferred → active` 로 전환하며 본 파일 §해당 cluster 참조.
- 다음 세션에 deferred 관련 질문 발생 시 본 파일 참조가 첫 번째.
