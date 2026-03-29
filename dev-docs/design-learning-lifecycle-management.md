# Learning Lifecycle Management 설계문서

> 리뷰 5회 (sessions 8d23a6fa, 5ccfc665, eae3c280, 5df5ac85), 8+1 에이전트 패널 리뷰 완료
> 경로 A 확정: 목적 기반 3-Tier + 4유형 + Phase 0.5

## 해결하려는 문제

에이전트의 학습이 누적되면 **context rot**이 발생한다. 에이전트가 학습 파일을 읽을 때 중요하지 않은 학습이 중요한 학습을 밀어내어 리뷰 품질이 저하된다. 이 시스템은 **학습의 목적과 의미에 기반하여** 가장 관련성 높은 learning을 우선 로딩하고 리뷰 품질을 유지한다.

---

## 학습의 목적

학습(Learning)은 리뷰 품질 향상을 위한 **수단**이다. 학습이 존재하는 이유:

1. **기본 지식의 한계 보완** — 에이전트의 기본 지시사항 + 도메인 문서만으로는 해결하지 못하는 구체적인 도메인 레벨의 문제를 더 쉽고 빠르게 해결하기 위함
2. **반복 방지** — 같은 문제를 다시 겪지 않기 위함
3. **누락 방지** — 기본 지시사항으로 잡아내지 못한 문제가 있다면 반드시 저장

### 학습 보호의 목적 근거 (Purpose-Mechanism Mapping)

| 보호 근거 (왜) | 메커니즘 (어떻게) | Tier |
|---------------|------------------|------|
| 자주 참조되는 학습은 활용 가치가 높다 | `citation_count ≥ T` | Tier-2 |
| 영향도가 큰 학습은 빈도 무관 보호 | `impact_severity == high` | Tier-2 |
| 실패를 통해 얻은 학습은 대체 불가능하다 | `purpose_type == guardrail` | Tier-2 |
| 다른 학습의 전제가 되는 기반 지식 보호 | `is_foundation == true` | Tier-1 |
| 사용자가 직접 제공한 학습은 권위 기반 보호 | `source_type ∈ {user, promoted}` | Tier-1 |
| 도메인 문서에 반영 완료 = 목적 달성 (졸업) | `reflected_in_doc` → Tier-3 경쟁 | Tier-3 |

---

## 3개 제약 조건

| # | 제약 | 내용 |
|---|------|------|
| C1 | 재현 가능한 판단 | LLM 의미 해석 허용. 단, 판단 기준이 명시적이고 재현 가능해야 함 |
| C2 | 로딩 우선순위 프레이밍 | 삭제가 아닌 로딩 여부 결정 (가역적) |
| C3 | Snapshot + 배치 재평가 | 로딩 판단 기준이 되는 메타데이터의 런타임 갱신 금지 |

**순환 방지 불변식** (C3에서 도출):
> 배치 재평가의 입력은 파일 시스템 메타데이터와 구조적 연산으로만 산출되어야 한다.

---

## 용어 규칙

| 규칙 | 내용 |
|------|------|
| "loading_priority" 전체 명칭 | "priority" 단독 축약 금지 |
| "impact_severity" 사용 | "surprise factor" 금지 (이전 정의와 동음이의어) |
| "인용 횟수(citation_count)" | "사용 빈도(usage frequency)" 금지 |
| "재현 가능한 판단" | "완화된 결정론" 금지 |
| "선별" vs "재평가" | 선별 = 스냅샷 기반 필터링. 재평가 = 속성 값 재계산 |

---

## 설계 원칙

1. **규칙 기반 접근** — 가중합이 아닌 조건-결과 규칙. 규칙 추가 시 기존 판정 불변
2. **단계적 활성화** — 현재 규모에서 필요한 것만 도입 (Phase 0.5로 데이터 축적)
3. **보호 우선** — 비로딩 면제 대상을 먼저 확보, 나머지 필터링
4. **축 값 독립 저장, 소비 시점 조합**
5. **축 정의와 저장 구현의 분리** — 포맷 변경에도 축 로직 유지
6. **Graceful degradation** — 메타데이터 없는 learning은 전체 로딩으로 fallback
7. **목적 정합성** — 보호 규칙이 학습 목적에 근거해야 한다

---

## 목적 기반 학습 유형 (4유형)

기존 `[fact/judgment]` × `[methodology/domain]`과 **직교하는 별도 축**.

| 유형 | 정의 | 판정 순서 | Tier |
|------|------|----------|------|
| **guardrail** | 실패경험에서 도출된 금지/경고. 3요소 필수 | 1순위 | Tier-2 |
| **foundation** | 다른 learning의 전제가 되는 기반 지식 | 2순위 | Tier-1 |
| **convention** | 용어/표기/절차 합의 또는 충돌 해소 | 3순위 | Tier-1 |
| **insight** | 위 3가지에 해당하지 않는 모든 learning | 기본값 | Tier-3 |

**판정 흐름도** (learning 생성 시):
```
3요소 모두 있음? (실패 상황 + 관찰 결과 + 교정 행동)
  → Yes: guardrail
  → No: 다른 learning의 전제?
    → Yes: foundation
    → No: 용어/표기/절차 합의?
      → Yes: convention
      → No: insight
```

태그 예시: `- [fact] [methodology] [guardrail] 내용... (source: ...)`

---

## Phase 구조

| Phase | 조건 | 내용 |
|-------|------|------|
| **Phase 0** | 에이전트당 100행 미만 (현재) | 전체 로딩. 변경 없음 |
| **Phase 0.5** | **즉시 시작** | 유형 태그 + impact_severity + guardrail 3요소 템플릿을 신규 learning 생성 시 적용. 로딩 로직 변경 없음 |
| **Phase 1** | 에이전트당 100행 초과 | 3-Tier 보호 규칙 활성화 |
| **Phase 2** | Phase 1 + 로딩 과다 + 도메인 3개+ | 추가 규칙 |

---

## Phase 1: 3-Tier 보호 체계

### 처리 순서

```
전체 learning 파일
  → [Step-0] 도메인 필터
      [domain/{current}] 또는 [methodology] → 후보군
      태그 없는 레거시 → [methodology] 취급

  → [Step-1] Tier-1: 무조건 로딩
      source_type ∈ {user, promoted}
      ∨ is_foundation == true
      → 전량 로딩

  → [Step-2] Tier-2: 목적 기반 보호
      impact_severity == high
      ∨ purpose_type == guardrail
      ∨ citation_count ≥ T (초기 T=2)
      → 전량 로딩

  → [Step-3] Tier-3: 잔여 로딩
      created_date 최신순, 상위 N개
      N = max(0, 행 상한 − Tier-1 행수 − Tier-2 행수)
      ※ reflected_in_doc 학습은 여기서 정렬 경쟁에 참여 (졸업)

  → 로딩 (Tier-1 + Tier-2 + Tier-3)
  → [Consumption Rules] 변경 없음
```

### Tier-2 과잉 안전장치

Tier-1 + Tier-2 > 행 상한 시:
1. Tier-1은 절대 삭감하지 않음
2. Tier-2 내: `impact_severity==high` 또는 `purpose_type==guardrail` → 유지. `citation_count ≥ T`만으로 진입한 항목 → citation_count 내림차순으로 삭감
3. 이 상황 자체가 Phase 2 활성화 신호

### Graceful Degradation

- 메타데이터 없는 learning → 전체 로딩 (현재 동작과 동일)
- schema_version 불일치/부재 → 경고 + 전체 로딩으로 fallback

---

## 조작적 정의

### impact_severity (영향도)

| 항목 | 정의 |
|------|------|
| 타입 | enum (high / normal) |
| 판정 시점 | learning 생성 시 1회, 이후 고정 (immutable) |
| 판정 기준 | 다음 중 하나 이상 충족 시 `high`: |
| | (a) "이 learning이 무시되었을 때 데이터 유실, 시스템 장애, 또는 사용자 대면 오류가 발생할 수 있는가?" |
| | (b) "이 learning 없이 동일 결론에 도달하려면 상당한 조사/디버깅이 필요했을 것인가?" |

### is_failure_experience (실패경험) — 폐기

> **폐기됨**: `[guardrail]` 태그가 failure experience를 표현한다.
> `[guardrail]` 태그 존재 = `is_failure_experience == true`.
> 별도 boolean 필드 불필요. 판정 기준은 `[guardrail]` 태그 정의(process.md)를 참조.

### is_foundation (기반 지식)

| 항목 | 정의 |
|------|------|
| 타입 | boolean |
| 판정 시점 | 배치 재평가 시 |
| 판정 기준 | 다음 중 하나 이상 충족 시 `true`: |
| | - 동일 에이전트의 다른 learning에서 참조 2건 이상 |
| | - promote 과정에서 global-level로 승격된 learning |
| | - 해당 learning이 없으면 다른 learning의 맥락이 성립하지 않는 전제 역할 |

---

## 메타데이터

Phase 0.5부터 적용:

| 필드 | 타입 | 생성 시점 | Tier | 상태 |
|------|------|----------|------|------|
| `created_date` | date | 자동 | Tier-3 정렬 | 유지 |
| `source_type` | enum (user/agent/promoted) | 자동 | Tier-1 | 유지 |
| `schema_version` | int | 자동 | — | 유지 |
| `impact_severity` | enum (high/normal) | 생성 시 1회 | Tier-2 | **신규** |
| `is_failure_experience` | boolean | 생성 시 자동 | Tier-2 | **폐기** — `[guardrail]` 태그로 대체 |
| `is_foundation` | boolean | 배치 재평가 | Tier-1 | 유지 |
| `reflected_in_doc` | boolean | 배치 재평가 | Tier-3 (졸업) | **변경** |
| `citation_count` | int (cap 10) | 배치 재평가 | Tier-2 | 승격 |
| `origin` | enum | 자동 | Phase 2 대비 | 유지 |
| 유형 태그 | enum (guardrail/foundation/convention/insight) | 생성 시 | 유형별 | **신규** |

**폐기:** `conflict_resolution` → `is_failure_experience`에 흡수

---

## Phase 2: 추가 규칙

**활성화 판단**: context rot 검출 신호 중 2개 이상 관측 시

| 신호 | 임계값 (초안) |
|------|-------------|
| 에이전트 학습 파일 행 수 | 150행 초과 |
| Step-0 필터 후에도 과다 | 100행 초과 |
| 동일 패턴의 반복 발견 | 3회 이상 |
| 활성 도메인 수 | 3개 이상 |

| 후보 규칙 | 내용 |
|-----------|------|
| P2-2 유형별 최소 보유량 | methodology 15%, 활성 도메인당 fact/judgment 각 1건 |
| P2-3 생성 경로 가중 | `promote_approved` > `review_consensus` > 기타 |
| P2-5 judgment+domain 모니터링 | 과소 대표 유형 모니터링 |

---

## 배치 재평가

- **트리거 1**: promote 완료 후 자동
- **트리거 2**: 수동 명령 (`/onto:curate`)
- **금지**: 세션 진행 중 실행 (순환 위험)
- **입력 제한**: 메타데이터만 읽음, learning 본문 읽지 않음

---

## 설계 검증 렌즈 (인간 기억 구조 참고)

인간 기억 메커니즘은 구현 항목이 아닌 **검증 도구**로 활용한다.

**차용:** 시간축 → created_date, 출처 신뢰도 → source_type, 연결 밀도 → citation_count

**제외:** 재구성(C1 충돌), 상태 의존 활성화(LLM 비대응), 해상도축(런타임 의존), 일관성축(본문 읽기 필요), 응답 결정화(LLM 자기 수렴 부재)

**설계 변경 시 검증 질문:**
- "이 변경이 허브 learning의 접근성을 훼손하지 않는가?"
- "유효한 learning의 접근성을 낮추고 무효한 것을 유지하는 역전이 발생하지 않는가?"

---

## 미결 조치

| # | 조치 | 심각도 |
|---|------|--------|
| IA-1 | "완화된 결정론" → "재현 가능한 판단"으로 재명명 (프로세스 문서) | Critical |
| IA-2 | "선별"과 "재평가"의 조작적 정의 문서화 | High |
| IA-3 | 비로딩 결정 경로를 프로세스 문서에 추가 | High |

## Dependencies

- **Per-session domain selection** 선행 구현 필요 (Step-0이 session_domain에 의존)
- Learnings format review (YAML/JSON 전환)와 연관

## 리뷰 이력

- session 20260328-8d23a6fa: 초기 구상 리뷰 (축 후보 탐색, 3개 선행 결정)
- session 20260328-5ccfc665: zero-base 축/규칙 설계 리뷰 (Rule-0/1/2 도출)
- session 20260328-eae3c280: 인간 기억 구조 참고 개선안 리뷰 (검증 렌즈, C3 정밀화)
- session 20260328-5df5ac85: 목적 기반 재설계 리뷰 (경로 A 확정, 3-Tier + 4유형 + Phase 0.5)
