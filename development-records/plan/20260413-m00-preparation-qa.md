---
as_of: 2026-04-13T10:15:00+09:00
supersedes: null
status: active
functional_area: planning-preparation
revision: v3
---

# 작업 목록 순서 점검 5문항 답변 (v3)

작성일: 2026-04-13
상태: 6차 9-lens review(`20260413-1af00ea8`, nested spawn) PASS 판정 + Conditional Consensus 1(CC1) 4항 반영
이전 이력:
- v2: 5차 양 review(`20260413-bafeda01` Codex, `20260413-0f67e320` Claude Agent) Immediate + BLOCKING + Claude 추가 지적 반영
- v1: `.onto/temp/m00-order-qa.md` 첫 버전 (삭제됨)
맥락: `20260413-onto-todo-meta.md` v5.1 확정 후 M-00 착수 직전 작업 순서 5개 점검 질문 답변.

## v2 → v3 CC1 반영 매핑

| CC1 항목 | v3 반영 위치 |
|---|---|
| (a) 누락 3건 (codex F3 lifecycle 매트릭스, claude C-7 M-00 source 전수, C-11 M-07 상한 pre-briefing) | "v1 → v2 반영 매핑 보정" 섹션 추가 |
| (b) M-01/M-02 subagent 산출물 seat + M-03 입력 경로 | A2 표 하단에 "Subagent 산출물 seat" subsection 추가 |
| (c) Q6·Q9 최소 골격 | "Q6~Q10 최소 골격" 섹션 신설 (Q6 실패 복구 체크포인트 1줄, Q9 M-03 consistency check 3 item) |
| (d) execution log seat 1줄 | "Execution log seat" subsection 신설 |

## v1 → v2 반영 매핑

### BLOCKING (Claude 고유)
| 지적 | v2 반영 |
|---|---|
| F-AX-01: `development-records/plan/` 기존 디렉토리 미검토, A5가 신규 `planning/` 권장 | A5 재작성: 기존 `plan/` 재사용 우선 평가 (Project Locality Principle 준수) |

### 양 리뷰 공통 Immediate
| 지적 | v2 반영 |
|---|---|
| Phase A contract 미완결 (3항목만) | A1: Phase A contract에 activity vocabulary + canonical seat + binding rule + dependency granularity + M-05 output contract + admission criterion + breaking-change 금지 |
| A3 governance artifact 부재 | A3: pre-briefing → `default rule + escalation trigger + owning artifact + consumers` 형식 canonical checklist + 저장 seat 명시 |
| M-06 4축 병렬 전제 부족 | A2: "4축 완전 독립" → "global invariant fixed → axis별 초안 → central merge gate"로 수정 |
| A5 lineage 규칙 없음 | A5: raw snapshot + consolidated + dedup evidence + current selector + supersedes/as_of/status |
| A2 배분 판정 기준 규칙화 | A2: 3축 판정 규칙 (Principal 실시간 판정 + I/O contract 안정성 + merge cost) |

### Claude 추가 Immediate
| 지적 | v2 반영 |
|---|---|
| A1 "병렬" 용어 오용 | A1: "pipeline with barrier"로 정확화 |
| v5.1 원문 "compatibility" 누락 | A3: "authority/lineage **compatibility** pre-gate"로 복구 |
| A0 축 귀속 homonym (축 A vs 축 B) | A4: direction §1.5 기준 A0는 축 A의 선행으로 확정 |
| MEMORY.md base 미참조 (약 65~70건) | A4: MEMORY.md 기존 backlog를 축별 분포 base로 참조 |

### D3 해소 (v5.1 원문 방향 복원)
| 지적 | v2 반영 |
|---|---|
| A3 pre-briefing이 v5.1 "실행 중 자연 반영" 선언을 근거 없이 뒤집음. 4차 review가 이미 거부한 전환의 재도입 | A3 재구성: v5.1 원칙 준수. pre-briefing은 선택적 사전 표준으로 격하. "실행 중 자연 반영"이 기본 경로 |

### Conciseness 정리
- A1 4중 중복 서술 → 판정문 + 조건부 요약 1회
- A5 3행 옵션 → 2단계 결정(추적 여부 × 서브디렉토리)으로 재구성
- 검토 요청 질문 괄호 라벨 제거

### v1 → v2 반영 매핑 보정 (v3 CC1-a 추가)

v2 시점에 누락된 3건 명시:

| 지적 | v2/v3 반영 |
|---|---|
| codex F3: lifecycle 매트릭스 미커버 (Q4 답변의 2차원 한계) | v2 A4에서 축 × 활동 매트릭스 도입, lifecycle 축은 M-07 lifecycle balance check로 이관 (Q10으로 defer) |
| claude C-7: M-00 source 전수 검사 (development-records/ 하위 8개 디렉토리 전체 inclusion rule) | v3 A5 admission rule로 보강: `development-records/plan/` 명시 포함, `design/` 제외, 나머지 6개 디렉토리(absorptions/audit/bug/handoff/reference/research/tracking)는 M-00 inclusion criteria에 "functional_area tag 또는 주제 키워드 매칭 시 포함"으로 해석 |
| claude C-11: M-07 revise cycle 2회 상한 도달 시 pre-briefing 범주 누락 | v3 A3 DR-M07-01 추가 예정 (M-04 실행 시점에 정식 정의. 지금은 개념만 예약) |

---

## 전제

- Meta task 목록: M-00 ~ M-08 (9건). 경로 β로 v5.1 확정.
- v5.1에서 3건 실행 중 반영 예정 (M-00 dedup timestamp, authority/lineage compatibility pre-gate, M-04 downstream 정렬) — **본 v2 답변도 v5.1 원칙 준수**.
- 본 문서는 실행 순서·배분·개입 시점·규모·저장 seat 5가지 및 coverage 관련 보강 항목에 대한 Principal 판단용 초안.

---

## Q1. M-04 · M-05 병렬이 적절한가

### A1 v2 — pipeline with barrier (용어 수정)

Q1 답은 "병렬"이 아니라 **"pipeline with barrier"**이다. M-04를 Phase A / Phase B로 분할하되, M-05는 Phase A barrier 후 Phase B 전에 실행된다.

**Phase A Contract** (M-05 시작 전 완결 필요):

| 항목 | 내용 |
|---|---|
| **activity vocabulary** | 허용값 5개 (review/design/reconstruct/learn/govern). 상수 하드코딩 대신 Expansion Protocol 경유성으로 파라미터화 |
| **axis token** | `{A, B, C, D}`. Expansion 시 변경 가능 (registry 참조형으로 점진 전환) |
| **canonical seat** | work item ID 형식 `W-{axis}-{nn}` + 할당 책임 주체 |
| **binding rule** | activity 단일/복수 귀속, axis 단일 귀속, activity↔axis 관계 |
| **dependency granularity** | M-05 dep modeling의 의존 끝점 (활동 수준 / work item 수준). 기본 활동 수준, work item 수준 확장 가능 |
| **M-05 output contract** | dep 관계 vocabulary (blocks/follows/softens 등), modality, 복수 귀속 처리 |
| **admission criterion** | "M-05가 canonical로 참조하는 field"만 Phase A에 포함. 그 외 schema는 Phase B |
| **breaking-change 금지** | Phase A 확정 후 Phase B에서 Phase A 요소 수정 불가 |

**조건 미충족 시 M-05 시작 금지.**

**Phase B**: 나머지 M-04 필드 (verification consumer/method/evidence seat/blockers/ownership boundary/canonicality class/완료 기준/lifecycle_status/provenance/continuity 필드) + M-05 산출물 수용 후 정합 조정.

## Q2. 병렬 배분 — Agent Teams vs 메인 세션 순차

### A2 v2 — 판정 규칙 기반

배분은 사례 나열이 아니라 **3축 판정 규칙**으로 결정한다.

**판정 규칙**:
1. **Principal 실시간 판정 필요 여부**: 판단이 Principal 통합 판단이면 메인, 독립 실행 가능이면 subagent 후보
2. **I/O contract 안정성 + 파일 충돌 부재**: 입출력 규약이 안정되고 파일 간 쓰기 충돌 없으면 병렬 후보
3. **Merge cost**: subagent 브리핑 비용 + 산출물 검증 비용이 메인 세션 직렬 실행 비용보다 낮을 때만 병렬 실행

**각 meta task 분류**:

| 단계 | 1. Principal 판정 | 2. Contract 안정 | 3. Merge cost 이득 | 배분 |
|---|---|---|---|---|
| M-00 | 필요 (source 선별) | — | — | 메인 세션 |
| M-01 + M-02 | 불필요 (조사) | 안정 (파일 충돌 없음) | 이득 있음 | **Agent Teams 2 subagent 병렬** |
| M-03 | 필요 (disposition + canonicality) | — | — | 메인 세션 |
| M-04 Phase A | 필요 (짧은 선결정) | — | — | 메인 세션 |
| M-04 Phase B | 필요 (schema 통합) | — | — | 메인 세션 |
| M-05 | 주로 불필요, 간헐적 판정 | 안정 (Phase A 완결 가정) | 낮음 (맥락 비용 큼) | **메인 세션 (단독)** |
| M-06 | 축별 통합 판정 | **조건부**: global invariant fixed → axis별 초안 → central merge gate | 조건 충족 시 이득 | **Agent Teams 4 subagent (조건부)** |
| M-07 | 필요 (체계 검증) | — | — | 메인 세션 또는 codex |
| M-08 | 필요 (짧음) | — | — | 메인 세션 |

**M-06 stronger gate**:
- **Global invariants fixed**: activity vocabulary + axis token + canonicality class rule + Migration Contract + M-04 Phase B 완결
- **Per-axis output schema**: 축별 산출물 포맷 고정
- **Merge owner**: 메인 세션이 단일 merge 주체
- **Central merge gate**: subagent 산출물 → 메인 세션 merge 단계 필수
- **Cross-axis dep rule**: 축 간 교차 work item 처리 절차 (대상 축 owner 지정)
- **Subagent capacity**: subagent 1개당 work item 상한 (예: 30). 초과 시 sub-chunk 분할
- **Fallback**: Agent Teams 불가 시 git worktree 격리로 degraded

**동시 감독 부담 (Claude NP1 축소 반영)**:
- Principal 동시 감독 가능 subagent 최대 4개 (경험치 기준)
- subagent 결과 review 시간이 병렬 절약 시간보다 크면 순차 실행으로 전환

### Subagent 산출물 seat (v3 CC1-b 추가)

M-01/M-02/M-06 subagent가 병렬 실행될 때 산출물 저장 경로 및 merge owner 명시.

| 단계 | Subagent 산출물 seat | Merge owner | M-03/M-07 입력 경로 |
|---|---|---|---|
| **M-01 (활동별 inventory)** | `.onto/temp/m01-activity-inventory/{activity}.md` (예: review.md, design.md, reconstruct.md, learn.md, govern.md 5개 파일) | 메인 세션 | M-03이 5개 파일을 직접 read |
| **M-02 (축 B 인프라 inventory)** | `.onto/temp/m02-infra-inventory/{component}.md` (예: scope-runtime.md, readers.md, middleware.md 등) | 메인 세션 | M-03이 모든 파일을 직접 read |
| **M-06 (축별 work item 초안)** | `.onto/temp/m06-axis-draft/{axis}.md` (A.md, B.md, C.md, D.md 4개 파일) | 메인 세션 (central merge gate) | M-07이 4개 파일을 단일 `development-records/design/20260413-onto-todo.md`로 통합 |

**Merge 절차**:
1. Subagent가 자기 seat에 write
2. 메인 세션이 모든 seat 파일 read + 정합 검증 (cross-axis/cross-activity 중복, schema 준수)
3. 정합 문제 발견 시 해당 subagent reopen (M-07 escalation 경로와 동일 규약)
4. 최종 merged artifact는 `development-records/` 하위 tracked seat로 이동
5. `.onto/temp/` 하위는 작업 후 정리 (M-08 refresh protocol에 포함)

## Q3. 실행 중 결정 3건 Principal 개입 시점

### A3 v2 — v5.1 원칙 준수 (pre-briefing은 선택적 보조)

**기본 경로**: v5.1 원문 "미반영 3건은 실행 중 자연 반영 예정" 유지. 4차 review(`20260413-5f709c73`)가 이 방향을 확정했으므로 반복 거부하지 않음.

**Governance artifact 구조** (각 결정은 다음 형식으로 기록):

| 필드 | 의미 |
|---|---|
| **decision_id** | `DR-{M-*}-{nn}` 형식 |
| **default rule** | 기본 판정 규칙 (Principal 개입 없이 적용) |
| **escalation trigger** | default rule로 처리 불가한 조건 (= Principal 개입 요청) |
| **owning artifact** | 결정 기록 seat (예: `development-records/plan/{date}-m00-decisions.md`) |
| **consumers** | 이 결정을 참조할 downstream (M-04, M-07, Expansion 등) |

**3건 각각**:

**DR-M00-01 — dedup tie-break non-PR timestamp seat**:
- default rule: memory entry는 `updatedAt` field 없으면 파일 mtime 사용. design record는 frontmatter `date` 또는 파일 mtime 순서
- escalation trigger: 동일 mtime이고 memory/design에 date 없는 경우
- owning artifact: `development-records/plan/20260413-m00-decisions.md`
- consumers: M-00 dedup 절차

**DR-M00-02 — authority/lineage compatibility pre-gate** (v5.1 원문 용어 복구):
- default rule: PR과 authority (`design-principles/`, `authority/`) 문서가 같은 주제면 **authority 우선** 유지. PR은 supporting source로 연결
- escalation trigger: authority 문서가 해당 주제를 다루지 않거나, PR이 authority 갱신을 제안하는 경우
- owning artifact: `development-records/plan/20260413-m00-decisions.md`
- consumers: M-00 dedup 절차

**DR-M04-01 — M-06/M-07/Expansion의 `activity` field canonical 참조 정렬**:
- default rule: M-04 Phase B 확정 시 schema에 명시된 `activity` field를 M-06(읽기)/M-07(lifecycle balance 판정)/Expansion Protocol(activity 삭제 시)이 canonical authority로 참조
- escalation trigger: 기존 문서 중 `activity` 외 field로 활동 귀속을 표현하는 곳 발견
- owning artifact: `development-records/plan/20260413-m04-decisions.md`
- consumers: M-06, M-07, Expansion Protocol 실행

**실행 중 review-gate 2단계** (Claude axiology 반영):
1. **Pre-briefing (선택적)**: 각 결정의 default rule에 대해 Principal 사전 컨펌 (5~10분 세션). 생략 가능.
2. **첫 N 케이스 review**: M-00 dedup 처음 3건 실행 후 Principal 검토. default rule의 경계 검증.

pre-briefing은 v5.1 "실행 중 자연 반영" 원칙에 선택적으로 추가되는 보조 장치. 의무 아님.

## Q4. M-06 분량 예상

### A4 v2 — 매트릭스 기반 + MEMORY.md base

**MEMORY.md 기존 backlog base**:
- 현재 MEMORY.md에 기록된 backlog·in-progress 항목 약 65~70건 (roles refactor v3, Build 8th Review, Principal Stage 3, Design Spec v4 잔여 등)
- M-03 disposition 후 `gap` 분류된 항목이 M-06의 work item 초기 seed

**2차원 매트릭스**: 축 × 활동

|  | review | design | reconstruct | learn | govern |
|---|---|---|---|---|---|
| **축 A** | 5~10 | 5~10 | 5~10 | 5~10 | 5~10 |
| **축 B** | A0 + 공통 인프라 5~15 |
| **축 C** | 자율성 진화 착수 단계별 (수준 1 도달) |
| **축 D** | principle·계약·lifecycle·drift 정책 최소 |

**A0 귀속 확정** (Claude F-SEM-5 해소):
- direction §1.5는 "A0 framework 추출은 **축 A의 선행**"으로 명시
- v2 답변은 direction 준수: **A0는 축 A에 속함**. v1 A4의 축 B 귀속 오류 수정.

**추정 수정** (3차원으로 확장, direction 준수):

| 축 | 예상 범위 | 근거 |
|---|---|---|
| **축 A** (5 활동 × A0) | 25~50 | MEMORY.md base + 5 활동 구현 |
| **축 B** (공통 인프라) | 15~30 | scope-runtime, readers, middleware, 저장소 |
| **축 C** (자율성 진화) | 10~15 | 초기 단계. direction §1.5 "C → A, B 1사이클 후"이므로 착수 item만 |
| **축 D** (상시 원칙) | 5~10 | provisional lifecycle 성문화 + 검증 도구 + principle 관리 |

**총 예상: 55~105 work item** (v1의 60~115에서 하향 — A0를 축 A로 이동하여 축 B 축소)

**병렬화 임계치**:
- axis당 work item 수 × 평균 브리핑·검증 비용 > 메인 순차 비용이면 병렬 이득
- 축 A·B는 임계치 초과 가능. 축 C·D는 임계치 미달로 메인 세션 처리 권장
- 즉 M-06 병렬은 **축 A·B에만**, 축 C·D는 메인 세션

**초안 vs revise 구분**:
- 초안: M-06 1회 생성 분량 (위 55~105)
- Revise: M-07 escalation 결과 (예상 revise율 20~30%)
- 총 rework budget 포함 시 work item flux는 70~140 범위

**복수 귀속 카운팅** (activity field 복수 귀속 허용):
- 복수 귀속 item은 1 카운트로 계산. 단 활동별 효과는 해당 활동 수에 반영 (예: [review, learn] item은 review 5~10에도 learn 5~10에도 기여)

## Q5. M-00 산출물 저장 위치

### A5 v2 — 기존 `plan/` 재사용 우선 (Project Locality Principle 준수)

**기존 디렉토리 평가**:
- `development-records/plan/` 이미 존재, 2 파일 보유:
  - `20260404-prototype-to-service-productization-plan.md`
  - `20260404-review-prototype-to-product-mapping.md`
- `development-records/design/`는 설계 결정 (v5.1, §1 등)
- 둘 다 추적 대상, git 관리

**결정: 기존 `plan/` 재사용**

v1 A5의 신규 `planning/` 신설 제안 철회. 이유:
1. **Project Locality Principle**: 기존 seat 재사용이 원칙 (F-AX-01 해소)
2. 이미 "plan" 의미로 사용 중이며, backlog consolidation은 plan 성격
3. 새 디렉토리 생성의 인지 비용 회피

**Admission rule** (design vs plan 분류):
- `plan/`: **실행 준비물**. backlog 수집·분해·우선순위 결정 등 "무엇을 할지" 기록
- `design/`: **설계 결정**. "어떻게 할지" + 방향 결정 + §1 정본

**M-00 산출물 seat**: `development-records/plan/20260413-backlog-consolidated.md`

**Lineage 규칙**:

| Artifact | Seat | 주기 |
|---|---|---|
| **Raw snapshot** (PR/memory/design 원본 캡처) | `.onto/temp/backlog-snapshots/` (untracked) | 수집 시마다 |
| **Consolidated planning artifact** | `development-records/plan/{YYYYMMDD}-backlog-consolidated.md` (tracked) | refresh 주기마다 |
| **Dedup/reconciliation evidence** | consolidated 파일 내 `dedup_evidence:` frontmatter (`dedup_basis`, `supersedes`, `kept_because` 등) | consolidated와 같이 |

**Current selector**:
- `development-records/plan/CURRENT.md` 심볼릭 파일: 최신 consolidated 파일 경로를 명시
- M-08 refresh 시 `CURRENT.md` 업데이트

**Supersedes / as_of / status frontmatter**:
```yaml
as_of: 2026-04-13T00:00:00+09:00
supersedes: null   # 최초본은 null, refresh본은 이전 파일 경로
status: active     # active / superseded / archived
```

**Read path** (M-08 refresh 시):
- **default**: 최신 consolidated 읽기 (CURRENT.md가 가리키는 파일)
- **diff**: 이전 버전과 비교해 신규 backlog entry 추출
- **archive**: `status: archived` 파일은 read path에서 제외

**.onto/temp/ vs plan/ 구분**:
- `.onto/temp/backlog-snapshots/`: 원본 캡처, gitignored (재생산 가능, audit trail 아님)
- `development-records/plan/`: consolidated artifact, tracked, audit trail

**README·policy seed 파일**:
- `development-records/plan/README.md` 신설: `plan/` 디렉토리 admission rule + lineage 규칙 + CURRENT.md 규약 명시

**Downstream 경로 업데이트**:
- M-01/M-02/M-03의 description에서 M-00 산출물 경로를 `development-records/plan/20260413-backlog-consolidated.md`로 업데이트

---

## Coverage 보강 — M-00 전후 누락 관심 범주 (Claude C-1 + v3 CC1-c 최소 골격)

본 5개 Q는 "M-00 실행 경로"를 커버하나, "실행 중/후 안전성" 관심 범주가 부분 누락. Q6~Q10을 아래에 최소 골격으로 선언하고, 상세 규약은 M-08 refresh protocol 또는 M-00 실행 중 경험 축적 후 확정.

### Q6 최소 규약 (실패·복구, v3 필수)

**M-00 세션 crash·네트워크 오류·subagent 실패 시**: Principal 개입으로 복구. 부분 산출(`.onto/temp/backlog-snapshots/` 하위 + `.onto/temp/m01-*`, `m02-*` 등)은 폐기 후 재실행. `development-records/plan/{YYYYMMDD}-m00-decisions.md`에 실패 사유·재개 지점 기록.

### Q7 (모니터링, defer)

진행률·비용·토큰 예산 모니터링 방법. M-08 refresh protocol에서 처리.

### Q8 (개입 trigger 임계값, defer)

Principal 개입 trigger 임계값. M-00 실행 중 `DR-M00-*` escalation trigger 사례 누적 후 확정.

### Q9 최소 규약 (consistency check, v3 필수)

M-00 → M-03 → M-06 간 산출물 정합성 검사 지점 3건:

1. **M-00 → M-03 consistency**: backlog-consolidated.md의 각 entry가 M-03 disposition에서 4분류(gap/already covered/n/a/deferred) 중 하나로 분류되었는가 (entry 수 일치)
2. **M-03 → M-06 consistency**: `gap` + canonicality tag가 있는 disposition entry가 M-06 work item으로 진입했는가 (gap count ≥ work item count, 단 1:N 분할 가능)
3. **M-06 schema consistency**: 각 work item이 M-04 schema 13필드(또는 migration 적용 후 필드 수) 전부 채움. 누락 필드 허용 안 됨

세 check point는 M-07 lifecycle balance check 직전 실행.

### Q10 (lifecycle 분포, defer)

lifecycle 단계별 선제 분포(buildout/migration/validation/maintenance/adoption). M-07 lifecycle balance check에서 처리.

## Execution log seat (v3 CC1-d 추가)

**V1 점진성 측정 기준선**: 각 meta task 실행 시 경과 시간·비용을 다음 경로에 기록.

- **Seat**: `development-records/plan/{YYYYMMDD}-execution-log.md`
- **필수 기록 필드**: `task_id`, `start_time`, `end_time`, `elapsed_minutes`, `commit_hash` (있으면), `subagent_count` (해당 단계)
- **용도**: 이후 같은 종류 작업의 2번째·3번째 실행 시 시간 비율 계산(§1.0 점진성 지표) 기준선

기록 시점: 각 meta task 시작 시점 (entry 생성) + 종료 시점 (end_time·elapsed 채움). 실행 중 자연 수정 대상.

---

## 상호 일관성 확인

| 쌍 | 일관성 확인 |
|---|---|
| A1 ↔ A3 | Phase A pre-briefing과 PB-3(M-04 Phase A 직전)이 겹칠 수 있음. **해소**: pre-briefing은 선택적, default rule로 자동 처리. |
| A2 ↔ A3 | Subagent 사용 시 Principal 개입 경로 명시. **해소**: governance artifact 형식이 subagent에도 적용. |
| A2 ↔ A4 | 축별 부하 편차가 subagent 배분 효율 저해. **해소**: 축 C·D는 병렬 제외, 축 A·B만 병렬. |
| A1 ↔ A5 | Phase A 산출물 seat와 backlog consolidated seat 구분. **해소**: Phase A 산출물은 `development-records/design/` (설계 결정 성격), backlog는 `plan/`. |
| A3 ↔ A5 | governance artifact seat가 `plan/` 하위. **해소**: `development-records/plan/20260413-m00-decisions.md`, `20260413-m04-decisions.md`로 일관. |

---

## 숨은 가정 재검토

v1 숨은 가정: "짧은 선결정과 제한적 vocabulary freeze만으로 downstream contract 정합성 유지" — 지지 안 됨 (양 리뷰 공통 지적).

v2 보정:
- **Phase A contract**: 3항목 → 8항목으로 확장 (breaking-change 금지 명시)
- **Governance artifact**: 모든 결정을 파일로 기록 (구두 의존 제거)
- **Review-gate 2단계**: default rule + 첫 N 케이스 검토

---

## v2 문서 목적

본 v2 답변은 실행 진입 전 **canonical reference** 역할:
- M-00 실행 시 `development-records/plan/20260413-m00-decisions.md`에 각 결정 기록 시작
- M-04 실행 시 `development-records/plan/20260413-m04-decisions.md`에 activity 정렬 결정 기록 시작
- 결정 기록은 M-07 escalation 판정 근거로 활용
- v1과 달리 v2는 실행자가 문서만으로 따라갈 수 있도록 gate·seat·rule 명시

## 다음 단계

v3 확정 완료. Principal 지시한 순서 X (v3 → Claude CLI cleanup → M-00) 진행:

1. ✅ 본 v3 commit + push (CC1 4항 반영)
2. 🔄 Claude CLI cleanup 작업을 `cowork/onto-3`에서 별도 세션으로 준비 (handoff 문서)
3. M-00 착수 (현 onto-4 세션에서)
4. `.onto/review/` 하위 6 review session 모두 reference로 보존
   - `20260413-21695bbe/` (1차)
   - `20260413-12eb28e0/` (2차)
   - `20260413-c0adc0af/` (3차)
   - `20260413-5f709c73/` (4차)
   - `20260413-bafeda01/` (5차 Codex)
   - `20260413-0f67e320/` (5차 Claude Agent)
   - `20260413-1af00ea8/` (6차 nested spawn, v3 근거)
