# Domain Document Creation 설계문서

> 리뷰 2회 (sessions 20260329-dbb80376, 20260329-fbfee09e), 8+1 에이전트 패널 리뷰 완료
> PO 결정: 모델 B (물리적 분리: drafts/ vs domains/)

## 해결하려는 문제

새 도메인을 추가하려면 8개 파일을 수동으로 작성하거나 기존 도메인을 복사 후 수정해야 한다. 이 과정에서 구조 누락, 내용 품질 편차, 파일 간 참조 불일치가 발생하며, onto 프레임워크의 내부 구조를 이해해야 하므로 도메인 확장의 진입 장벽이 된다.

---

## 목적

**도메인 비전문가도 seed를 생성하고, 리뷰 경험이 축적되면서 도메인 문서가 점진적으로 성숙되어 가는 것.**

Seed는 "시작점"이고, 피드백 루프는 "성장 엔진"이다. Seed 없이 루프만 있으면 시작할 수 없고, 루프 없이 Seed만 있으면 초안에서 멈춘다.

---

## 0. Terminology

| Term | Meaning | Example |
|------|---------|---------|
| **seed** | LLM이 최소 입력으로 생성한 도메인 문서 초안. `drafts/`에 배치. 역할과 제약은 Section 1 불변식 참조 | `~/.onto/drafts/palantir-foundry/` |
| **established** | SEED 마커가 0개인 도메인 문서. `domains/`에 배치. 역할과 제약은 Section 1 불변식 참조. 권위는 축적된 리뷰 경험에 비례하는 연속적 속성 | `~/.onto/domains/software-engineering/` |
| **SEED marker** | `<!-- SEED: low-confidence, needs evidence -->` 형태의 HTML 주석. seed 파일 내 저신뢰도 콘텐츠에 부착 | 섹션 헤딩 또는 항목 앞에 배치 |
| **feedback loop** | 축적된 learning을 도메인 문서 개선 제안으로 변환하여 사용자 승인 후 반영하는 순환 경로 | review → learning → compare → suggest → approve → apply |
| **compare** | learning 내용과 현재 도메인 문서 내용을 대조하여 중복/보완/충돌을 판정하는 단계 | LLM 기반 의미적 비교 |
| **promotion (seed → established)** | seed를 `drafts/`에서 `domains/`로 이동하는 행위. 사용자의 명시적 명령으로만 수행 | `/onto:promote-domain {domain}` |
| **config.yml** | 프로젝트별 onto 설정 파일. `{project}/.onto/config.yml`에 위치. `domains:` 선언이 source of truth (디렉토리 존재는 구현, config.yml이 권위). 정의는 `dev-docs/design/20260328-per-session-domain-selection.md` Section 1 참조 | `domains: [SE, ontology]` |

---

## 1. Physical Separation: drafts/ vs domains/

### 구조

```
~/.onto/
├── domains/{domain}/          ← established (에이전트 검증 기준)
│   ├── domain_scope.md
│   ├── concepts.md
│   ├── ... (8 domain document files)
│   └── feedback-log.md        ← 피드백 실행 이력
├── drafts/{domain}/           ← seed (리뷰 대상, 검증 기준 아님)
│   ├── domain_scope.md
│   ├── concepts.md
│   ├── ... (8 domain document files)
│   └── feedback-log.md        ← 피드백 실행 이력
└── learnings/
```

### 불변식

1. `domains/` 내 문서는 미검증 내용을 포함하지 않는다
2. `drafts/` 내 문서는 에이전트의 검증 기준(standard)으로 참조되지 않는다
3. `drafts/` 내 문서는 리뷰 대상(target)으로 참조 가능하다

### seed → established 승격

- **트리거**: 사용자의 명시적 명령만 허용. 자동 승격 없음
- **단위**: 도메인 단위 일괄 이동 (개별 파일 승격 불가)
- **전제조건**:
  1. SEED 마커가 포함된 섹션이 0개 (모든 마커가 제거된 상태)
  2. 8개 필수 파일이 모두 존재 (seed 생성 이후 사용자가 파일을 삭제/변경했을 수 있으므로 재검증)
- **동작**: `drafts/{domain}/` → `domains/{domain}/`로 이동 + config.yml `domains:` 자동 추가 (이미 존재하면 추가하지 않음 — 멱등)
- **역방향**: `domains/` → `drafts/`로의 강등(demotion)은 지원하지 않음. 필요 시 사용자가 직접 이동

---

## 2. Mechanism 1: Seed Generation

### 입력

| 항목 | 필수 | 설명 |
|------|------|------|
| domain name | Yes | 도메인 식별자 (kebab-case) |
| description | Yes | 도메인 대상 설명 (자유 텍스트, 1-2문장) |

예: `"palantir-foundry"` + `"Palantir Foundry 플랫폼 위에서 데이터 파이프라인과 앱을 구축하는 도메인"`

### 출력

`~/.onto/drafts/{domain}/` 아래 8개 파일:

| File | 생성 전략 | SEED 마커 |
|------|----------|-----------|
| `domain_scope.md` | LLM이 대상 설명을 바탕으로 주요 하위 영역 추론. 첫 번째 가설 | 추론 확신도 낮은 하위 영역에 부착 |
| `concepts.md` | LLM이 도메인의 핵심 용어를 추론하여 초안 생성 | 전 항목에 부착 |
| `competency_qs.md` | 빈 골격 (섹션 헤딩만). **의도적 경험 게이트**: 질문은 LLM 추론으로 생성할 수 없고 실제 리뷰 경험에서만 도출됨. 충분한 리뷰 경험 축적 전 도메인 승격을 구조적으로 방지 | 전체 파일이 seed 상태 |
| `logic_rules.md` | LLM이 도메인에서 예상되는 논리 규칙 추론 | 전 항목에 부착 |
| `structure_spec.md` | LLM이 도메인의 구조 규칙 추론 | 전 항목에 부착 |
| `dependency_rules.md` | LLM이 도메인의 의존성 규칙 추론 | 전 항목에 부착 |
| `extension_cases.md` | 빈 골격 (섹션 헤딩만). **의도적 경험 게이트**: 확장 시나리오는 LLM 추론으로 생성할 수 없고 실제 리뷰 경험에서만 도출됨. 충분한 리뷰 경험 축적 전 도메인 승격을 구조적으로 방지 | 전체 파일이 seed 상태 |
| `conciseness_rules.md` | LLM이 도메인의 간결성 규칙 추론 | 전 항목에 부착 |

### 설계 원칙

1. **입력 최소화**: 이름 + 1-2줄이면 시작 가능
2. **불완전 허용, 저신뢰도 허용**: 내용이 불완전하거나 확신도가 낮아도 괜찮음. "incomplete or low-confidence content is acceptable"
3. **구조 완전성 필수**: 8개 파일이 모두 존재하고, 파일 간 `Related Documents` 참조가 정확해야 함
4. **참조 그래프 검증**: 생성 후 8개 파일 간 `Related Documents` 섹션의 참조 유효성을 자동 검증

### SEED 마커 사양

```markdown
<!-- SEED: low-confidence, needs evidence -->
## Some Section Title
- Some LLM-inferred content
<!-- /SEED -->
```

- **부착 조건**: LLM이 생성한 저신뢰도 콘텐츠에 부착
- **제거 조건**: (1) 피드백 루프를 통해 learning 기반 콘텐츠로 대체된 후 사용자 승인, 또는 (2) 사용자가 직접 편집하여 내용을 확정한 경우
- **제거 주체**: 사용자만 가능. 에이전트의 자동 제거 금지
- **승격 차단**: SEED 마커가 1개 이상 남아있으면 seed → established 승격 불가

---

## 3. Seed Review Path (drafts/ → review target)

seed가 `drafts/`에 있으므로 일반적인 도메인 리뷰 시 참조되지 않는다. seed의 점진적 성숙을 위해 별도의 리뷰 경로가 필요하다.

### 리뷰 대상 유형 확장

기존 리뷰 대상 유형(코드, 설계문서, 의사결정)에 "도메인 문서 초안(seed)"을 추가한다.

### 커맨드

```
/onto:review drafts/{domain}                    ← seed 리뷰 (interactive domain selection)
/onto:review drafts/{domain} @-                 ← seed 리뷰 (no-domain mode)
/onto:review drafts/{domain} @{other-domain}    ← seed 리뷰 (다른 established 도메인 기준)
```

### 검증 기준 (seed 리뷰 시)

seed를 리뷰할 때 에이전트가 참조하는 검증 기준:

| 우선순위 | 기준 | 설명 |
|---------|------|------|
| 1 | 에이전트 내재 지식 | 에이전트의 역할 정의(roles/*.md)에 기술된 기본 방법론 |
| 2 | 기존 established 도메인 | `@{other-domain}` 지정 시, 해당 도메인 문서를 참조하여 교차 검증 |
| 3 | 범용 도메인 지식 | LLM의 사전 학습 지식 |

**`@-` (no-domain) 모드가 seed 리뷰의 기본 추천**: seed 자체가 아직 검증되지 않았으므로, 특정 도메인 규칙을 적용하기보다 에이전트 기본 방법론으로 구조적/논리적 건전성을 먼저 검증하는 것이 적합하다.

### Learning 태그 매핑 (seed 리뷰 시)

seed 리뷰에서 생성되는 learning의 태그 처리:

| 조건 | axis tag | 설명 |
|------|----------|------|
| `@-` 모드 | `[methodology]` | 도메인 비특정 방법론 학습 |
| `@{other-domain}` 모드 | `[domain/{other-domain}]` | 해당 도메인 기반 학습 |
| interactive 선택 | 선택된 도메인에 따라 결정 | 일반 리뷰와 동일 |

**seed 도메인 자체에 대한 learning 축적**: seed 리뷰 중 seed 도메인에 특화된 발견이 있으면 `[domain/{seed-domain}]` 태그로 저장한다. 이 학습은 향후 피드백 루프의 입력이 된다.

### seed 리뷰와 일반 리뷰의 차이

| 항목 | 일반 리뷰 | seed 리뷰 |
|------|----------|-----------|
| 대상 위치 | 프로젝트 내 파일/설계 | `~/.onto/drafts/{domain}/` |
| 도메인 문서 참조 | `domains/{session_domain}/` | 에이전트 내재 지식 또는 다른 established 도메인 |
| 리뷰 목적 | 대상의 품질 검증 | seed 내용의 정확성/완전성 검증 + 개선점 도출 |
| learning 저장 | 일반 규칙 | seed 도메인 태그 포함 가능 |
| 피드백 루프 연결 | 간접 (promote 시) | 직접 (seed 도메인의 learning으로 축적) |

---

## 4. Mechanism 2: Experience → Document Feedback Loop

### 전체 흐름

```
[Seed 생성]
    │
    ▼
drafts/{domain}/ (seed v0)
    │
    ▼
[Seed 리뷰] ←─────────────────────────────┐
    │                                       │
    ▼                                       │
learnings 축적 [domain/{seed-domain}]       │
    │                                       │
    ▼                                       │
[피드백 루프] → drafts/{domain}/ v1, v2... ──┘
    │
    ▼ (SEED 마커 전부 제거 + 사용자 승격 명령)
    │
domains/{domain}/ (established)
    │
    ▼
[일반 리뷰에서 도메인 규칙으로 참조] ←─────────┐
    │                                          │
    ▼                                          │
learnings 축적 [domain/{domain}]               │
    │                                          │
    ▼                                          │
[피드백 루프] → domains/{domain}/ 개선 ─────────┘
```

### 4-1. 피드백 매핑: 2축 분리

피드백 라우팅은 두 개의 독립된 축으로 결정된다.

**축 1 — 주제 영역 (대상 파일 선택)**

learning의 내용이 다루는 주제에 따라 대상 파일을 결정한다. 1:N 라우팅을 허용한다 (하나의 learning이 복수 파일에 영향).

| 주제 영역 | 대상 파일 |
|----------|-----------|
| 용어/개념 정의 | `concepts.md` |
| 범위/하위 영역 | `domain_scope.md` |
| 논리 규칙 | `logic_rules.md` |
| 구조 규칙 | `structure_spec.md` |
| 의존성 규칙 | `dependency_rules.md` |
| 질문/쿼리 | `competency_qs.md` |
| 확장 시나리오 | `extension_cases.md` |
| 간결성 규칙 | `conciseness_rules.md` |

**축 2 — 변경 형태 (CRUD 유형)**

| 형식 | 설명 |
|------|------|
| `add` | 새 항목 추가 |
| `modify` | 기존 항목 수정 (하위 영역 경계 조정 포함) |
| `remove` | 기존 항목 제거 제안 |

분류 기준: 변경 형태(CRUD). 두 축은 독립적이다. 예: learning이 "논리 규칙"(축 1) + "modify"(축 2) → `logic_rules.md`의 기존 규칙 수정 제안. `domain_scope.md`의 하위 영역 경계 조정은 "범위/하위 영역"(축 1) + "modify"(축 2)로 표현한다.

### 4-2. 기존 태그 체계 → 라우팅 태그 변환

기존 learning은 `[fact|judgment]` × `[methodology|domain/...]` × `[guardrail|foundation|convention|insight]` 태깅을 사용한다. 피드백 라우팅에는 별도의 "라우팅 태그"를 부여하지 않는다. 대신 **피드백 실행 시점에 LLM이 learning 내용을 분석하여 주제 영역(축 1)과 피드백 형식(축 2)을 판정**한다.

변환 규칙:
- `[domain/{X}]` 태그가 있는 learning → 해당 도메인의 문서에 피드백 대상
- `[methodology]` 태그만 있는 learning → 도메인 문서 피드백 대상이 아님 (도메인 비특정)
- `[fact]`/`[judgment]` 구분 → 피드백 라우팅에 영향 없음 (내용 분석으로 판정)
- `[guardrail]`/`[foundation]`/`[convention]`/`[insight]` → 피드백 라우팅에 영향 없음 (내용 분석으로 판정)

### 4-3. Compare 단계 명세

피드백 루프의 핵심 단계. learning 내용과 현재 도메인 문서를 대조한다.

| 요소 | 정의 |
|------|------|
| **비교 단위** | learning 1건 vs 대상 파일의 항목 단위 |
| **판정 상태** | 3상태, 상호 배타적: |
| | `duplicate` — 기존 항목을 삭제해도 learning의 정보가 완전히 보존되는 경우 |
| | `complement` — learning이 기존 항목에 없는 새 정보를 포함하는 경우 |
| | `conflict` — learning과 기존 항목이 동일 대상에 대해 양립 불가능한 주장을 하는 경우 |
| **판정 주체** | LLM 기반, 근거 포함 출력 |
| **충돌 시 출력** | 충돌의 양측 내용 + 각 선택지의 결과를 제시. 해소 결정은 사용자에게 위임 |

**1:N 라우팅 시의 compare**: 하나의 learning이 복수 파일에 라우팅된 경우, 각 파일에서 독립적으로 compare를 수행한다. 부분 승인 가능 (파일 A 승인, 파일 B 거부). 논리적 모순 없음 — 참조 불완전성은 다음 사이클에서 자연 보완.

### 4-4. 중복 탐지: 비교 기반

`promoted-to-domain-doc` 상태 마커를 **사용하지 않는다**. 대신:

1. **이벤트 기록** (audit trail): 피드백 실행 시 `applied-to-domain-doc-at-{timestamp}` 이벤트를 피드백 실행 로그에 기록
2. **비교 기반 판정** (decision): 피드백 실행 시 learning 내용과 현재 문서 내용의 의미적 비교로 중복 여부를 판정

이유: 사용자 직접 편집은 시스템의 "핵심 행위"이다. 사용자 편집에 의해 진리값이 깨지는 상태 마커는 설계 결함이다. 비교 기반은 항상 문서의 현재 상태를 기준으로 판정하므로 사용자 편집과 자연스럽게 양립한다.

### 4-5. 피드백 실행 로그

피드백 실행의 이력을 추적하기 위한 로그 파일.

저장 위치: `~/.onto/drafts/{domain}/feedback-log.md` 또는 `~/.onto/domains/{domain}/feedback-log.md`

```markdown
## {date} — Feedback Session

| learning_ref | source_file | target_file | action | compare_result | user_decision |
|--------------|-------------|-------------|--------|---------------|---------------|
| "매핑 테이블의 결정 축과..." | onto_logic.md | logic_rules.md | add | complement | approved |
| "허용 범위 선언에서..." | onto_semantics.md | concepts.md | modify | conflict | rejected |

**Phase 0**: `learning_ref`는 learning 내용의 첫 구절(truncated summary)로 식별한다. 안정 식별자(`learning_id`)는 R6에서 설계 후 도입.
```

### 4-6. 피드백 트리거

**Phase 0: manual-only**

사용자가 명시적으로 피드백 명령을 실행할 때만 동작한다.

```
/onto:feedback {domain}                ← drafts/ 또는 domains/ 내 도메인
```

Auto-suggestion(learning 수 기반 자동 알림)은 Phase 0에서 제외한다. 향후 threshold 정의와 함께 Phase 1에서 도입.

### 4-7. 피드백 프로세스

1. **수집**: 해당 도메인의 `[domain/{domain}]` 태그가 있는 learning을 전수 수집
2. **라우팅**: 각 learning의 주제 영역(축 1)과 피드백 형식(축 2)을 LLM이 판정. 1:N 라우팅 허용
3. **비교**: 각 (learning, target file) 쌍에 대해 compare 실행. 판정: duplicate / complement / conflict
4. **제안 생성**: complement 및 conflict 항목에 대해 구체적 변경 제안을 diff 형태로 생성
5. **사용자 제시**: 변경 제안을 사용자에게 제시. conflict 항목은 양측 내용 + 각 선택지의 결과를 포함
6. **사용자 승인**: 건별 승인/거부. 부분 승인 가능
7. **반영**: 승인된 변경을 도메인 문서에 적용
8. **SEED 마커 처리**: 반영된 콘텐츠가 SEED 마커 내용을 대체하면, 사용자에게 마커 제거 여부를 확인
9. **로그 기록**: 피드백 실행 로그에 결과 기록

### 4-8. Learning 원자성 전제

이 설계는 learning이 **원자적**(하나의 독립된 주장)임을 전제한다. 원자성 판정 기준: 하나의 learning 내 복수 주장이 독립적 진리값을 가지면 비원자적이다.

실증 근거: 기존 learning 전수 검토(39건) 결과 비원자적 learning 0건. 현시점 추가 메커니즘 불필요.

비원자적 learning이 관찰될 경우 → 피드백 시점 분해(decomposition) 도입을 재검토한다.

---

## 5. Touch Point Checklist

Seed Generation + Feedback Loop 구현 시 수정이 필요한 파일 목록:

| # | File | Update |
|---|------|--------|
| 1 | `process.md` — Domain Documents | drafts/ 경로, 불변식 3항, feedback-log.md, 피드백 루프 규칙 추가 |
| 2 | `process.md` — Domain Selection Flow | "가용 도메인 수집"에 drafts/ 제외 명시 |
| 3 | `process.md` — Per-process resolution | create-domain, feedback, promote-domain 3행 추가 |
| 4 | `process.md` — Process Map | 3개 프로세스 행 추가 |
| 5 | `process.md` — Teammate Initial Prompt | Context Self-Loading에 drafts/ 제외 주석 |
| 6 | `processes/create-domain.md` | **신규** — Seed 생성 프로세스 |
| 7 | `processes/feedback.md` | **신규** — 피드백 루프 프로세스 (9단계) |
| 8 | `processes/promote-domain.md` | **신규** — 승격 프로세스 |
| 9 | `commands/create-domain.md` | **신규** — 커맨드 정의 |
| 10 | `commands/feedback.md` | **신규** — 커맨드 정의 |
| 11 | `commands/promote-domain.md` | **신규** — 커맨드 정의 |
| 12 | `processes/review.md` | Step 0에 seed 리뷰 시 @- 기본 추천, Step 1에 seed 리뷰 분기 |
| 13 | `commands/review.md` | seed review 구문 예시 추가 |
| 14 | `README.md` | 커맨드 목록, 디렉토리 구조에 drafts/ 추가 |
| 15 | `dev-docs/BLUEPRINT.md` | Terminology, Processes, Seed Documents 섹션 추가 |
| 16 | `setup-domains.sh` | drafts/ 경로 인식 추가 (설치 시 drafts/ 건드리지 않음) |

---

## 6. Recommendations (리뷰에서 도출)

향후 단계 또는 설계 확장 시 반영할 항목:

| # | 항목 | 근거 |
|---|------|------|
| R1 | competency_qs.md seed 생성 전략 분화 | onto_structure S-1 |
| R2 | 교차 도메인 라우팅 (도메인 A 리뷰 중 도메인 B learning 발생 시) | onto_coverage F-2 |
| R3 | 승격 적격 기준 (프로젝트 특수 vs 도메인 보편 learning 구분) | onto_coverage F-4 |
| R4 | 8파일 하드코딩 해소 (파일 목록 메타데이터 외부화) | onto_evolution EVO-06 |
| R5 | 수렴/종료 조건 정의 (언제 established로 충분히 성숙했는가) | onto_coverage C-3 |
| R6 | learning_id 설계 (행 번호 기반 → 안정 식별자) | onto_pragmatics deliberation |
| R7 | 피드백 실행 로그의 경량 참조 링크 (동일 learning의 다중 경로 추적) | D-NP2 |
| R8 | 9번째 도메인 파일 추가 시의 확장 프로토콜 | onto_evolution EVO-06 |
| R9 | `llm-native-development`의 `prompt_interface.md` 같은 도메인 고유 파일 처리 | 기존 사례 |
| R10 | Auto-suggestion threshold 정의 (Phase 1) | C4 |

---

## 7. Review Trace

### Review 1 (설계 초안)

| 항목 | 값 |
|------|---|
| Session ID | 20260329-dbb80376 |
| Domain | ontology |
| Consensus | 10건 (Round 1: 6, Deliberation: 4) |
| Disagreement | 1건 (D-NP3 구현 방식 → PO 결정: 모델 B) |
| Unverified | 3건 (LLM 환각 대응, compare 정확도, SEED 마커 인식 신뢰도) |
| Immediate Actions | 7건 (본 문서에 전부 반영) |
| Recommendations | 10건 (Section 6에 기록) |
| Learnings stored | 28건 (Round 1: 17, Deliberation: 11) |
| Full report | `.onto/review/20260329-dbb80376/philosopher_synthesis.md` |

### Review 2 (목적/설계철학 기반 정당성/무결성 검증)

| 항목 | 값 |
|------|---|
| Session ID | 20260329-fbfee09e |
| Domain | ontology |
| Consensus | 6건 (숙의 불필요) |
| Conditional Consensus | 2건 (경험 게이트 명시 조건, Compare 3상태 충분성 조건) |
| Disagreement | 0건 |
| Unverified | 3건 (LLM 빈약 도메인 실효성, 8파일 충분성, Compare 정확도) |
| Immediate Actions | 8건 (본 문서에 전부 반영) |
| Recommendations | 10건 (Section 6에 병합) |
| Full report | `.onto/review/20260329-fbfee09e/philosopher_synthesis.md` |
