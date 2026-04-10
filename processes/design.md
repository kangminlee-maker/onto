# Design Process

> 온톨로지를 기반으로, 이미 존재하는 설계 대상(design target — 코드, 스프레드시트,
> 문서 등)에 새로운 영역을 추가하는 과정. 새로운 영역은 기존 설계 대상과 공존해야
> 하므로, 현재 시스템의 상태를 제약(constraint)으로 인식하고 그 안에서 설계한다.
> 이 프로세스는 brownfield(기존 대상이 존재하는 상황) 전용이다.
> Related: 설계 산출물 검증은 `/onto:review`, 학습 승격은 `onto promote`

## 0. Domain Selection

`process.md`의 "Domain Determination Rules"에 따라 `{session_domain}` 결정.

---

## 1. Context Acquisition (맥락 수집)

설계자와의 대화 없이, 시스템이 사용 가능한 정보를 수집하는 단계.

수집 대상:

| 입력 | 출처 | 필수 여부 |
|---|---|---|
| 설계 목표 | 사용자 입력 | 필수 |
| 설계 대상 (design target) | 코드/문서/스프레드시트 등 | 필수 — brownfield 전용이므로 대상이 존재해야 함 |
| ontology | `.onto/builds/` 또는 사용자 지정 | 선택 (있으면 constraint discovery 품질 향상) |
| 학습 | `~/.onto/learnings/design.md` (promoted만) | 선택 |
| 도메인 문서 | `~/.onto/domains/{domain}/` | 선택 (사용자 명시 지정) |
| 기존 설계 | 사용자 지정 이전 버전 | 선택 (반복 설계) |

학습 소비 규칙: promoted global 학습만 로드. project-level 학습(promote 전)은
로드하지 않음. 학습의 핵심 가치는 시간/비용 절감이며, 검증 전 소비는
잘못된 사실에 의한 drift risk가 절감 효과를 초과하므로 promote gate를 거쳐야 함.
저장/소비/promote 상세 규칙은 `learning-rules.md`를 따른다.

brownfield 경로 분기:

| 조건 | 경로 | 동작 |
|---|---|---|
| ontology 있음 | brownfield (full) | ontology에서 constraint 추출 가능 |
| ontology 없음 + 대상 소스 있음 | brownfield (ontology 미보유) | build 먼저 안내 (아래 재진입 경로 참조). 사용자가 거부 시 소스 직접 참조로 진행 |

**Build → Design 재진입 경로**: ontology가 없어 build를 선행 안내한 경우, build 완료 후
사용자가 다시 `/onto:design`을 실행하면 Context Acquisition이 `.onto/builds/`에서
생성된 ontology를 자동 감지하여 brownfield (full) 경로로 진입한다.
build를 별도 세션으로 실행하므로 design 세션의 상태는 유지되지 않는다 — 새 design 세션을 시작한다.

수집 결과를 설계자에게 보고하고 확인 후 Phase 1 진입.

---

## 2. Design Inquiry (설계 탐구 — 6 Phase)

설계자의 인지 한계 4가지를 체계적으로 보완하는 구조화된 대화.

인지 한계:
1. 목적/가치를 명확하게 정의하지 못함
2. 자기 결정들 사이의 모순을 인지하지 못함
3. constraint를 명확하게 인지하지 못함
4. 변경 가능 범위와 수용 범위의 경계를 모름

### Phase 1: 목적 정밀화

보완 대상: 인지 한계 #1.

설계자가 어떤 수준에서 시작하든 "달성하려는 결과(outcome)" 수준으로 재정위한다.

| 설계자의 시작점 | 재정위 |
|---|---|
| 결과(outcome) | 이미 결과 수준. 구체화 질문 |
| 해결책(solution) | "그것으로 달성하려는 결과는?" |
| 문제(pain point) | "이 문제가 해결되면 달성하려는 결과는?" |
| 기능 명세(feature) | "이 기능이 달성하려는 결과를 먼저 확인" |
| 지표(metric) | "이 지표가 개선되면 어떤 상태에 도달하는가?" |

전환 기준: 설계자가 결과 목록과 우선순위에 동의.

### Phase 2: 영역 탐색

보완 대상: 인지 한계 #3 (영역 수준).

목표에 어떤 영역(area)이 관련되는지 발견한다. 영역별 격차(gap)를 측정한다.

탐색 방법:
- ontology 있음: 구조/변화 가능성/행위에서 관련 entity를 매칭하여 식별
- ontology 없음: 대상 소스를 탐색하거나 설계자와 대화로 식별

전환 기준: 설계자가 영역 목록에 동의.

### Phase 3: 현재 상태 매핑

보완 대상: 인지 한계 #3 (상세 수준).

각 영역의 현재 상태를 설계자가 이해할 수 있는 언어로 번역한다.

규칙:
- 변경 방향을 제안하지 않음 (Phase 4에서 도출)
- 기술적 난이도를 언급하지 않음
- 설계자가 기술 세부사항을 질문하면 설명하되, 설계 방향을 유도하지 않음

전환 기준: 설계자가 현재 상태 설명에 동의.

### Phase 4: 목표 상태 탐색

보완 대상: 인지 한계 #4.

시나리오 순서: Phase 1 결과 우선순위(높은 것 먼저) × Phase 2 격차 크기(큰 것 먼저).

시나리오당 흐름: 추출 → 제안 → 확정.

1. **추출**: 설계자의 의도를 먼저 확인. "이 영역에서 가장 중요한 변화는 무엇입니까?"
2. **제안**: 설계자 답변 확인 후 대안 제시. 대안 출처를 명시:
   - `[ontology]`: ontology의 구조/변화 가능성/행위에서 도출
   - `[학습]`: promoted 학습에서 도출
   - `[도메인 관행]`: LLM이 해당 도메인의 관행임을 확인할 수 있는 경우에만
   - 세 출처 어디에서도 대안이 없으면 "대안 없음" 안내 후 확정으로 진행
3. **확정**: 설계자의 최종 선택 기록

규칙:
- 대안을 먼저 제시하지 않음 — 설계자가 의도를 말한 후에만
- 대안을 "더 좋은 것"으로 프레이밍하지 않음
- 설계자가 유지를 선택하면 존중

전환 기준: 핵심 시나리오를 모두 다룸.

### Phase 5: 가정·제약 검증

보완 대상: 인지 한계 #2.

Phase 1~4 결정에 깔린 암묵적 가정을 드러내고 교차 대조한다.

검증 방법:
- ontology + 학습 있음: 두 소스 교차 대조
- ontology만 있음: ontology constraint 단독 대조
- 학습만 있음: 학습 단독 대조. ontology 부재 안내
- 둘 다 없음: Phase 1~4 결정 간 내적 모순 발견으로 축소

constraint 분류:

| 분류 | 정의 | 설계자 행동 |
|---|---|---|
| 변경 가능 (changeable) | 이번 설계에서 의도적으로 변경할 수 있는 constraint | 변경할지 유지할지 결정 |
| 수용 필수 (immutable) | 이번 설계에서 변경할 수 없는 constraint | 수용하고 설계에 반영 |
| 확인 필요 (unverified) | 현재 정보로 판별할 수 없는 constraint | 확인 방법과 불가능 시 대안 기록 |

전환 기준: 가정 대조 완료 + 미해소 항목 이관.

### Phase 6: 범위 합의

Phase 1~5 종합.

제시 형식:
- **포함** — 이번에 변경하는 것
- **제외** — 이번에 변경하지 않는 것
- **변경하는 constraint** — changeable로 분류된 것 중 변경 결정
- **수용하는 constraint** — immutable로 분류된 것
- **확인 필요 사항** — unverified + 보류 시나리오 + 미해소 모순

완결 검증 (Specification 전환 전 필수):

| # | 검증 항목 | 통과 기준 | 실패 시 |
|---|---|---|---|
| 1 | outcome 커버리지 | 모든 Phase 1 outcome이 Phase 4 시나리오로 커버됨 | Phase 4 역행 |
| 2 | area 커버리지 | 모든 Phase 2 area가 "포함" 또는 "제외"에 있음 | Phase 6 내 처리 |
| 3 | 가정 처리 완료 | 모든 Phase 5 가정이 확인/수정/이관됨 | Phase 5 역행 |
| 4 | outcome 간 충돌 부재 | outcome A의 시나리오가 outcome B의 **수용 필수** constraint를 위반하지 않음. 변경 가능은 검사 대상 아님. 확인 필요는 등재되어 있으면 통과 | Phase 4 또는 5 역행 |
| 5 | 보류/미해소 등재 | Phase 4 보류 + Phase 5 미해소가 "확인 필요 사항"에 등재됨 | Phase 6 내 추가 |

전체 통과 + 설계자 확인 → Specification 자동 전환.
실패 시: (a) Phase 6 내 조정, (b) 해당 Phase 역행, (c) Phase 1 전체 재시작.

### Phase 전환 공통 규칙

- 단일 발화 블록으로 제시 (누적 요약 + 맥락 구체적 선택지)
- 경량 정합 게이트: 이전 Phase와 현재 결정 사이 구문적 모순 감지
- 선택지: 번호 + 이름 + 다음 동작 설명 + 자연어 fallback
- 열린 질문 최소화: 분석 결과와 결론을 먼저 제시

### 제어 규칙

- **설계자 판단 비대체**: 시스템은 정보 구조화 / constraint 노출 / 모순 명시 / 대안 제시만 수행
- **질문 금기**: 유도 질문, 해결책 쇼핑, 맥락 없는 질문, 기술 프레이밍
- **역행 규칙**: 목적 변경(전체 재시작) / 결정 수정(해당 Phase부터) / Phase 6 내 처리

---

## 3. Specification (설계 명세 생성)

inquiry 완료 후 설계 문서를 생성한다. 최소 구조:

1. **Context** — 목적, 범위, 경로, ontology, lineage
2. **현재 상태 요약** — Phase 3 누적 요약
3. **설계 변경** — 각 변경의 what / why / 변경 방향(add/modify/reduce/migrate)
4. **Constraint 처리** — 변경/수용/확인 필요
5. **구현 상세** — 대상 유형에 따라 달라짐
6. **검증 방법** — 설계가 Phase 1 목표를 달성했는지 확인하는 방법

---

## 4. 반복 설계

review 결과를 반영하여 설계를 개선하는 흐름.

1. review finding → Phase 분류 (목적 불명확→P1, 영역 누락→P2, 상태 오류→P3, 목표 불완전→P4, 가정 미검증→P5, 범위 불일치→P6, 명세 불완전→Spec 재생성)
2. 해당 Phase로 역행 → 재설계
3. 동일 지적 2회 연속 미해소 시 설계자에게 안내 후 미수용/scope 재조정 요청

---

## 5. 대상 중립성

design 프로세스 자체는 설계 대상(design target)의 형태에 의존하지 않는다.
대상 형태에 의존하는 것은 adapter(런타임이 대상 유형별로 분기하는 구성요소)이다.
design은 adapter의 산출물을 소비할 뿐이며, 프로세스 규칙 자체는 대상 중립적이다.

---

## 6. 학습 저장

design은 사용자에게 도메인 지식을 직접 확보하는 과정이므로 높은 가치의 학습이 발생한다.

원칙:
- design 산출물을 review한 결과 → review가 저장. design이 중복 저장하지 않음
- design 프로세스 자체에서 발견한 패턴 → design이 저장

저장/소비/promote 상세 규칙은 `learning-rules.md`가 단일 소유한다.

---

## 7. 현재 구현 상태

### LLM / Runtime / Script 소유 분리

| 소유 | 책임 | 현재 상태 |
|---|---|---|
| LLM | 6-Phase inquiry, constraint discovery, specification 생성 | 실행 가능 (프로세스 문서 기반) |
| Runtime | scope lifecycle, 이벤트 기록, 상태 전이 | code-product 경로 구현 완료 (production 검증) |
| Script | stale check, 해시 계산 | 구현 완료 |

### adapter별 상태

| adapter | scope_kind | 상태 |
|---|---|---|
| code-product | experience, interface | 런타임 경로 구현 완료 |
| methodology | process | 스켈레톤. CLI command에서 분기하지 않음. 런타임 경로 미구현 |
