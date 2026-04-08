# Optimization 4-Feature Design

> 5차 리뷰(20260330-e7c5cf6e) 기반. 사용자 승인 완료 (2026-03-30).
> 6차 리뷰(20260330-803a4bb1) IA1-IA3 + R4-R13 반영 완료.

---

## Feature 1: Adaptive Light Review (경량 리뷰 자동 판단)

### 목적

리뷰 대상의 복잡도에 비례하여 에이전트 수를 조절. 시스템이 판단하고 사용자가 결정.

### 프로세스 변경: review.md Step 1.5 추가

Step 1(컨텍스트 수집) 후, Step 2(팀 생성) 전에 삽입:

```markdown
### 1.5 Complexity Assessment (performed by team lead)

Step 1에서 수집한 리뷰 대상을 분석하여 복잡도를 평가한다.
3개 질문에 모두 "경량 가능"으로 답해야 경량 리뷰를 제안한다.
하나라도 아니면 전원 리뷰로 진행한다.

**Q1: 관련 검증 차원이 4개 이하 `(= ⌊검증 차원 수 / 2⌋)` 인가?**
리뷰 대상이 8개 검증 차원(논리, 구조, 의존, 의미, 실용, 진화, 커버리지, 간결성) 중
몇 개와 관련되는지 평가.
→ 4개 이하: 경량 가능 / 5개 이상: 전원 필요

**Q2: 에이전트 간 교차 검증이 부차적인가?**
교차 검증이 핵심인 경우: 시스템 전체 설계 변경, 다중 파일 수정, 새 개념 도입
교차 검증이 부차적인 경우: 단일 관점 판단, 기존 설계 내 수정, 문서 정확성 확인
→ 부차적: 경량 가능 / 핵심: 전원 필요

**Q3: 놓칠 수 있는 발견의 위험도가 수용 가능한가?**
위험도 높음: 구현 직전 최종 검증, 안전장치 설계, 기존 사용자 영향 변경
위험도 낮음: 탐색적 질문, 초기 방향, 내부 문서, 이미 리뷰 거친 후속 확인
→ 수용 가능: 경량 가능 / 수용 불가: 전원 필요

**경량 가능 판단 시:**
사용자에게 사유와 함께 선택지를 제시한다.

## Review Complexity Assessment

**대상**: {리뷰 대상 요약}
**판단**: 경량 리뷰 가능
**사유**:
- Q1: {관련 차원과 수}
- Q2: {교차 검증이 부차적인 근거}
- Q3: {놓칠 위험이 수용 가능한 근거}

**권장 구성** ({N}명):
  [a] {agent-id} — {이 대상에서 필요한 이유}
  [b] {agent-id} — {이유}
  [c] {agent-id} — {이유}
  [d] philosopher — 목적 정합 검증 (항상 포함)

**전원 리뷰와의 차이**:
  제외되는 관점: {제외 에이전트 목록}
  놓칠 수 있는 것: {구체적 설명}

[a] 경량 리뷰 ({N}명, ~{토큰}k 토큰)
[b] 전원 리뷰 (9명, ~550k 토큰)

Select [a]:

**전원 필요 판단 시:**
별도 안내 없이 기존 프로세스대로 9명 스폰.
리뷰 시작 시 "9명 전원 리뷰로 진행합니다"를 표시.
```

### 에이전트 선택 규칙

```markdown
1. **philosopher**: 항상 포함
2. **나머지 2-3명**: 리뷰 대상의 성격에 따라 팀 리드가 선택

참고 테이블 (팀 리드 판단 보조):
| 대상 성격 | 권장 3명 |
|-----------|---------|
| 설계 결정/프로세스 | logic + pragmatics + evolution |
| 용어/명명/정의 | semantics + logic + pragmatics |
| 구조/파일 분리 | structure + dependency + conciseness |
| 도메인 커버리지 | coverage + semantics + pragmatics |
| 코드/구현 | logic + structure + evolution |

사용자에게는 선택한 에이전트와 그 이유를 함께 제시한다.
```

### 세션 메타데이터

경량/전원 판단 결과를 세션 메타데이터에 기록하여, 향후 경량 리뷰와 전원 리뷰 간 학습 생성량·품질 차이를 관측할 수 있는 경로를 확보한다.

```yaml
review_mode: light | full
```

### 경량 모드 프로세스 차이

```markdown
| 단계 | 전원 모드 | 경량 모드 |
|------|----------|----------|
| Round 1 | 8명 독립 리뷰 | 2-3명 독립 리뷰 |
| Philosopher 합성 | 8개 결과 | 2-3개 결과 |
| Deliberation | 조건부 실행 | Philosopher에게 'not needed' 지시 |
| 합의 기준 | N/8 | N/{참여 수} |
| Unique Finding Tagging | 8행 | {참여 수}행 |
```

### 최소 에이전트 하한

검증 에이전트가 에러 제외 후 2명 미만이면 process-halting 또는 전원 리뷰 자동 전환.

### 변경 파일

| File | Change |
|------|--------|
| `processes/review.md` | Step 1.5 Complexity Assessment 섹션 추가 |
| `processes/review.md` | Step 2에 경량 모드 분기 (에이전트 수 가변) |
| `processes/review.md` | Step 3: Philosopher 전달 시 참여 에이전트 파일만 나열 (변수화) |
| `processes/review.md` | Step 4(Deliberation)에 경량 모드 스킵 조건 |
| `README.md` | Team Review Flow에 Step 1.5 언급 |
| `BLUEPRINT.md` | §4.1 Flow에 Step 1.5 추가, Core Rules에 경량/전원 분기 |

---

## Feature 9: Agent Error Auto-Recovery (에이전트 에러 자동 복구)

### 목적

에이전트 API 에러 발생 시 사용자 개입 없이 팀 리드가 자동으로 감지하고 재시도.

### 프로세스 변경: process.md SSOT 참조 + 프로세스별 고유 사항만

process.md Error Handling Rules를 SSOT로 유지한다. 각 프로세스 파일에는 참조 포인터 + 프로세스별 고유 사항(감지 시점, irreplaceable role 지정 등)만 기술한다.

review.md Step 2에 추가할 고유 사항:

```markdown
#### Error Recovery (Round 1)

> process.md Error Handling Rules의 Retry Protocol을 적용한다.

Round 1에서 에이전트 에러 발생 시:

1. **감지**: 다른 에이전트가 전원 응답을 완료한 시점에 아직 응답하지 않은 에이전트,
   또는 에러를 보고한 에이전트를 감지한다.

2. **재시도**: 해당 에이전트에 SendMessage로 재실행을 요청한다.
   메시지에 원래 Task Directives + 파일 경로를 포함한다.
   "이전 실행에서 에러가 발생했습니다. Round 1 리뷰를 다시 수행해주세요.
    결과를 {session path}/round1/{agent-id}.md 에 저장하고 파일 경로만 보고해주세요."

3. **종료 조건**: 2회 재시도 후에도 실패하면 process.md Error Handling Rules의
   graceful degradation을 적용한다.
   - 해당 에이전트를 제외하고 합의 분모를 조정
   - Philosopher 전달 시: "※ {agent-id}: 에러로 제외됨" 명시
   - 사용자에게 제외 사실을 알린다

4. **로깅**: 에러 발생 및 재시도 사실을 세션 디렉토리에 기록한다.
   {session path}/error-log.md
   (디버깅 참조용. 자동 소비 경로 없음.)
```

### 변경 파일

| File | Change |
|------|--------|
| `processes/review.md` | Step 2 하단에 Error Recovery 섹션 추가 (process.md SSOT 참조 + review 고유 사항만) |
| `processes/promote.md` | Step 3 하단에 process.md Error Handling Rules 참조 + promote 고유 사항만 기술 |
| `processes/build.md` | process.md Error Handling Rules 참조 + build 고유 사항(Explorer = irreplaceable role) 기술 |

---

## Feature 14: /onto:health (학습 건강도 대시보드)

### 목적

promote 없이 글로벌/프로젝트 학습 풀의 현재 상태를 즉시 조회.

### 커맨드

```
/onto:health           # 글로벌 학습 건강도
/onto:health project   # 프로젝트 학습 건강도
```

### 프로세스: processes/health.md

```markdown
# Learning Health Dashboard

> 학습 풀의 현재 상태를 집계하여 보고한다.
> 에이전트 스폰 불필요 — 팀 리드가 직접 파일을 읽고 집계한다.

### 1. Target Determination

- `$ARGUMENTS` 없음 → 글로벌 학습 (`~/.onto/learnings/*.md`)
- `$ARGUMENTS` = "project" → 프로젝트 학습 (`{project}/.onto/learnings/*.md`)

### 2. Data Collection

각 학습 파일에서 다음을 집계한다:
- 총 항목 수 (grep `^\- \[`)
- 축 태그 분포: methodology-only / domain-only / dual-tag
- 목적 유형 분포: guardrail / foundation / convention / insight
- 타입 분포: fact / judgment
- 파일 행 수
- Event marker 수 (grep `applied-then-found-invalid`)
- Tag-incomplete marker 수 (grep `tag-incomplete`)
- Consolidated marker 수 (grep `consolidated into`)
- Retention-confirmed marker 수 (grep `retention-confirmed`)
- 도메인 목록 (grep `\[domain/` → 고유값 추출)

### 3. Output

## Learning Health Dashboard

### {Global/Project} Learnings ({path})

| Metric | Value |
|--------|-------|
| Total entries | N |
| Files | N |
| Largest file | {agent} ({N} lines) |

### Axis Distribution
| Tag | Count | % |
|-----|-------|---|
| methodology-only | N | N% |
| domain-only | N | N% |
| dual-tag | N | N% |

### Purpose Distribution
| Tag | Count |
|-----|-------|
| guardrail | N |
| foundation | N |
| convention | N |
| insight | N |

### Type Distribution
| Tag | Count | % |
|-----|-------|---|
| fact | N | N% |
| judgment | N | N% |

### Health Indicators
| Indicator | Status | Note | 권장 조치 |
|-----------|--------|------|----------|
| File size | {OK/NOTICE/WARNING} | 최대 {N}행 (100행 = 주의, 200행 = 조치 권고) | `/onto:promote` 실행으로 consolidation/retirement 검토 |
| Event markers | {N} pending | {퇴역 후보 수} | `/onto:promote` 실행 시 퇴역 후보로 표면화됨 |
| Tag-incomplete | {N} | Creation gate 실패 수 | 해당 학습 항목의 태그 수동 보완 |
| Consolidated | {N} | Cross-agent dedup 수행 수 | 정보만 — 조치 불필요 |

### Domains Referenced
{domain1} ({N}), {domain2} ({N}), ...

### 4. No learning storage

이 프로세스는 읽기 전용이다. 학습을 생성하거나 수정하지 않는다.
```

### 변경 파일

| File | Change |
|------|--------|
| `processes/health.md` | 신규 생성 |
| `commands/health.md` | 신규 생성 |
| `process.md` | Process Map 테이블에 행 추가 |
| `process.md` | Per-process domain resolution 테이블에 행 추가 (Not applicable) |
| `process.md` | Touch Point Checklist for Processes에 이미 learning-rules.md 포함 |
| `README.md` | Commands 표 + Directory Structure에 추가 |
| `BLUEPRINT.md` | Processes 섹션에 추가 |

---

## Feature 15: Consumption Feedback Verification (실측 검증 계획)

### 목적

이미 구현된 Consumption Feedback(Applied Learnings, yes/no, event marker)이 실제로 동작하는지 검증.

### 검증 시나리오

| # | 시나리오 | 검증 항목 | 판정 기준 | 비용 |
|---|---------|----------|----------|------|
| V1 | 외부 도메인 리뷰 1회 | Applied Learnings 섹션 출력 여부 | 참여한 모든 에이전트 결과에 섹션 존재 ({N}/{N}) | 리뷰 비용 (자연 발생) |
| V2 | 동일 리뷰 | yes/no 관측 기록 여부 | yes 또는 no 응답 존재 | 0 (V1에 포함) |
| V3 | 자연 발생 대기 (관찰 항목) | event marker 부착 여부 | 마커 존재 확인 (PASS/FAIL 아닌 관찰) | 0 (자연 발생) |
| V4 | promote 실행 | Step 4a Event Marker Review 동작 | 섹션 출력 여부 | promote 비용 |
| V5 | 동일 promote | Step 9 yes/no 집계 포함 여부 | 행 존재 확인 | 0 (V4에 포함) |

### 실행 계획

```
[다음 외부 도메인 리뷰]
  → V1, V2 자동 검증
  → PASS: 데이터 수집 시작
  → FAIL: Task Directives 보강 (마커 부착 지침 명시)

[V1 PASS 후 다음 promote]
  → V4, V5 자동 검증

[V3은 관찰 항목 — 자연 발생 대기]
  → /onto:health로 event marker 수를 주기적 확인 (PASS/FAIL 판정에서 분리)
```

### 변경 파일

없음 (이미 구현됨). 검증만 수행.

### V1 FAIL 시 대응

review.md Task Directives의 Applied Learnings 섹션 설명을 강화:
```markdown
### Applied Learnings
**Required**: List ALL learnings from your learning file that influenced
any part of your review judgment. Do not skip this section.
```

---

## 구현 순서

| 순서 | 기능 | 변경 파일 수 | 예상 토큰 |
|------|------|------------|----------|
| 1 | **#14 /onto:health** | 6 (신규 2 + 수정 4) | 낮음 |
| 2 | **#1 Adaptive Light Review** | 2 (review.md + README) | 중간 |
| 3 | **#9 Error Auto-Recovery** | 3 (review + promote + build) | 낮음 |
| 4 | **#15 Consumption Feedback** | 0 (다음 리뷰에서 검증) | 0 |
