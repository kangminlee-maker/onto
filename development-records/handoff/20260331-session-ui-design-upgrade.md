# Session Log: ui-design 도메인 문서 업그레이드 (2026-03-31)

이 문서는 세션 간 컨텍스트 연속성을 위해 작성됨. 메모리 내용 + 작업 이력 + 현재 상태 + 미완료 항목을 포함.

---

## 1. 세션 목표

ui-design 도메인 문서를 초기 버전(62,703 bytes)에서 업그레이드된 도메인(SE 192K, ontology 167K) 수준으로 확장.

## 2. 완료된 작업

### 2.1 업그레이드 계획 수립 + 3회 리뷰

| 리뷰 | 세션 ID | 도메인 | 에이전트 | 결과 |
|------|---------|--------|---------|------|
| v1 | 20260331-c5dabb18 | @ontology | 8명 전원 | IA 5건 도출 |
| v2 | 20260331-c0f75639 | @- | 3명 경량 | v1 4건 RESOLVED, 1건 부분 + 신규 IA 2건 |
| v3 | 20260331-baeea27b | @- | 8명 전원 | **7건 전체 RESOLVED**, Recommendations 11건 |

#### v1 IA (5건) — 전체 RESOLVED
1. **IA-1**: L1/L2/L3 네임스페이스 분리 → [Tier-1a/1b/2/3] (규범) + [L1/L2/L3] (추상화)
2. **IA-2**: CQ 접두사 충돌 해소 → CQ-A→CQ-AD, CQ-FB→CQ-FS, 11개 접두사 교차검증 완료
3. **IA-3**: 규범 체계 핵심 속성 → Tier-1a(접근성/법적) > Tier-1b(플랫폼/심사) > Tier-2(디자인시스템) > Tier-3(원칙/경험)
4. **IA-4**: P1/P2/P3 우선순위 정의
5. **IA-5**: 정량 기준 SSOT 경계 → logic_rules(행동), structure_spec(구조), conciseness_rules(간결성)

#### v2 IA (2건) — 전체 RESOLVED
1. **v2-IA-1**: SoT↔Tier 매핑 정정 → **RESOLVED in IA-3**
2. **v2-IA-2**: CQ-CO 처리 방침 → **RESOLVED in** `domain_scope.md` Cross-Cutting Concerns + `competency_qs.md` CQ-CO Synthesis Rule

#### 계획 문서 SSOT 메모
- **규범 체계/Tier 관련 정의**: IA-3 + `domain_scope.md` §Normative System Classification
- **CQ-CO 처리 정의**: v2-IA-2 + `domain_scope.md` §Cross-Cutting Concerns + `competency_qs.md` §CQ-CO Synthesis Rule
- **파일럿 선정 기준 정의**: 이 문서 §4.1.1
- 이후 Wave/리뷰/후속 과제 메모에서는 위 정의를 재서술하지 않고 참조만 사용

### 2.2 3-Wave 실행

#### Wave 1 — 기반 파일 (병렬 3 에이전트)
| 파일 | 이전 | 이후 | 에이전트 |
|------|------|------|---------|
| domain_scope.md | 8,209 | 21,993 | Agent A |
| concepts.md | 10,492 | 23,003 | Agent B |
| logic_rules.md | 8,922 | 33,606 | Agent C |
| structure_spec.md | 7,238 | 20,676 | Agent C |
| dependency_rules.md | 6,523 | 30,676 | Agent C |

#### Wave 2 — 참조 파일 (병렬 3 에이전트)
| 파일 | 이전 | 이후 | 에이전트 |
|------|------|------|---------|
| competency_qs.md | 4,922 | 45,622 | Agent D (91개 CQ) |
| extension_cases.md | 7,006 | 29,300 | Agent E (14개 케이스) |
| conciseness_rules.md | 9,391 | 14,756 | Agent F |

#### Wave 3 — 교차 참조 + 논리적 정합성 (순차 2 에이전트)
- **Agent G** (교차 참조 무결성): 158개 참조 검사, 35건 수정, CQ inference path 72개 전수 확인 (파손 0)
- **Agent H** (논리적 정합성): 85개 규칙 쌍 검사, 4건 모순 수정 (WCAG 버전, 로딩 임계값, 성능 임계값, 일관성 범위), 미결 0건

### 2.3 도메인 정확성 검증

도메인 전문 지식 관점의 정확성 감사 수행. 4건 수정:
1. Norman 6대 원칙 오귀속 → "fundamental property" (2013 개정판)으로 정정
2. IA 귀속 → Morville & Rosenfeld 판수 명확화 (1998→2002→2006)
3. Spotify 텍스트 확장률 자기 모순 → +30–40%로 통일
4. Nielsen 임계값 변형 근거 → 300ms flash prevention 근거 명시

정확도 결과: 표준/규격 100%, Tier 체계 100%, 사례 연구 86%, 출처 귀속 85%, 개념 80%

### 2.4 동기화
- 프로젝트 → 글로벌 (`~/.onto/domains/ui-design/`) 단방향 복사 완료
- MD5 검증 PASS

## 3. 최종 결과

| 파일 | 최종 크기 |
|------|----------|
| domain_scope.md | 21,993 |
| concepts.md | 23,003 |
| logic_rules.md | 33,606 |
| structure_spec.md | 20,676 |
| dependency_rules.md | 30,676 |
| competency_qs.md | 45,622 |
| extension_cases.md | 29,300 |
| conciseness_rules.md | 14,756 |
| **합계** | **219,632** |

**62,703 → 219,632 bytes (3.5배 증가)**

## 4. 진행 중 / 미완료 항목

### 4.1 파일럿 리뷰 (복구 완료)

#### 4.1.1 파일럿 선정 기준 (SSOT)

- **산출물 형태**: `/onto:review @ui-design`에 바로 투입 가능한 마크다운 기반 리뷰 타깃. 최소 2개 화면(또는 상태 변형 포함 1개 흐름)과 화면별 구조/상태 설명을 포함
- **최소 범위**: 현재 `domain_scope.md` Key Sub-Areas 중 **3개 이상**을 포함. 단일 컴포넌트·단일 위젯 수준 산출물은 제외
- **규범 체계 활성 조건**: 최소 1개 화면에서 Tier-1a/1b 규칙 적용 가능성이 보여야 함 (예: 접근성, 플랫폼 제약, 시간 제한, 상태 signifier)
- **교차 관심사 활성 조건**: Consistency를 검증할 수 있도록 복수 패턴·복수 상태·반복 control family가 공존해야 함
- **우선 선호 조건**: 동적 데이터/행동 흐름이 포함되어 loading/error/empty/disabled/locked/overflow 중 1개 이상을 관찰할 수 있을 것

#### 4.1.2 이번 대상 적합성

- **산출물 형태 적합**: `review-target.md`가 2개 모바일 화면의 구조·상태·관찰 포인트를 함께 제공
- **범위 적합**: Navigation, Feedback and Status, Action and Decision, Responsive UI Adaptation, Accessible Interaction이 동시에 걸려 3개 이상 요건 충족
- **규범 체계 적합**: color-only legend, disabled CTA, overflow discoverability, lock semantics로 Tier-1a/1b 및 lower-tier 규칙 적용 가능
- **교차 관심사 적합**: 날짜 strip, 카드 목록, 상태 signifier, 하단 네비게이션의 반복 패턴으로 Consistency 검증 가능

- **세션 ID**: 20260331-62180ee4
- **도메인**: @ui-design
- **원래 실행 모드**: Codex (codex:codex-rescue)
- **리뷰 대상**: 포도스피킹(Podo Speaking) 모바일 앱 UI 2개 화면
  - Screen 1: 레슨 예약 화면 (날짜/시간 선택)
  - Screen 2: 레슨 목록 화면 (카탈로그, 필터, 하단 네비게이션)
- **리뷰 대상 파일**: `/Users/kangmin/cowork/onto/.onto/review/20260331-62180ee4/review-target.md`
- **복구 방식**: 기존 백그라운드 Codex 산출물이 남아 있지 않아, 현재 세션에서 portable reconstruction으로 round1 + philosopher synthesis 재작성
- **상태**: 완료
- **결과 파일 위치**: `.onto/review/20260331-62180ee4/round1/{agent-id}.md`
- **Philosopher 종합**: `.onto/review/20260331-62180ee4/philosopher_synthesis.md`
- **판정 요약**: blocker는 아니지만 concern. 핵심 액션/상태 설명 강화가 우선이며, overflow cue, prerequisite disclosure, state coverage 보강이 필요

**이 세션에서 처리한 것**:
1. 기존 세션 디렉터리에 round1 reviewer 8개 결과 생성
2. philosopher synthesis 작성
3. 사용자에게 결과 전달 가능한 상태로 복구

**남은 후속**:
1. 필요 시 파일럿 리뷰 학습을 project/global learning으로 승격
2. 필요 시 ui-design 파일럿 2차 리뷰를 state-rich 캡처(loading/error/empty 포함)로 수행

#### 4.1.3 2차 파일럿 입력 설계 (review target draft 완료)

- **설계 위치**: `.onto/review/20260331-ui-design-pilot2-input/input-design.md`
- **템플릿 위치**: `.onto/review/20260331-ui-design-pilot2-input/review-target.template.md`
- **실사용 draft 위치**: `.onto/review/20260331-ui-design-pilot2-input/review-target.md`
- **설계 결정**:
  1. 제품/맥락은 1차 파일럿과 동일하게 유지한다 (포도스피킹 모바일 앱)
  2. 범위는 `2개 static 화면`에서 `2개 screen family + 1개 micro-flow`로 확장한다
  3. 최소 required state는 `Catalog: default/loading/no-results/no-permission/locked-reveal`, `Booking: default/selected-time/loading/no-slots/error/no-permission`으로 둔다
  4. 실제 캡처가 없는 상태는 textual state spec으로 보완할 수 있으나, trigger/visible copy/recovery path는 필수로 적는다
- **현재 상태**:
  - 입력 설계 완료
  - current `podo-app` web 구현을 기반으로 한 code-derived `review-target.md` draft 작성 완료
- **주의**:
  - 이 draft는 screenshot bundle이 아니라 implementation-derived textual state spec이다
  - catalog의 locked semantics는 현재 구현상 `prerequisite`보다 `purchase/entitlement gate`에 가깝다
- **다음 단계**:
  1. 필요 시 실제 모바일 캡처로 대체 또는 보강
  2. 현재 draft 그대로 `/onto:review @ui-design`에 투입해 2차 파일럿 리뷰 실행

#### 4.1.4 2차 파일럿 리뷰 실행 (`20260331-d83bcc35`)

- **실행 대상**: `.onto/review/20260331-ui-design-pilot2-input/review-target.md`
- **실행 모드**:
  1. `--codex`는 환경 점검 단계에서 중단
     - `scripts/codex-companion.mjs` 부재
     - `codex:codex-rescue` subagent type 미사용 가능
  2. 실제 리뷰는 `--claude`로 실행
- **산출물 위치**:
  1. 세션 디렉터리: `.onto/review/20260331-d83bcc35/`
  2. round1 리포트: `.onto/review/20260331-d83bcc35/round1/*.md`
  3. 종합 결과: `.onto/review/20260331-d83bcc35/philosopher_synthesis.md`
- **핵심 합의**:
  1. B6 entitlement block은 구매/해소 CTA가 없어 dead-end
  2. B4 empty day와 B5 fetch failure가 시각적으로 분리되지 않음
  3. C3 no-results는 메시지/CTA가 없어 empty state가 사실상 미정의
  4. B3 date-change loading은 feedback이 없어 blank state처럼 보임
  5. C1/B1 수평 스크롤 overflow cue가 없음
  6. CTA `선택한 날짜에 예약`은 실제 시간 선택 행위를 반영하지 않음
  7. C2/B3 비동기 작업의 failure/timeout 상태가 미정의
- **추가 관찰**:
  1. coverage 관점에서 booking success, cancel/change, auth/session 상태가 여전히 비어 있음
  2. 이번 2차 파일럿은 screenshot bundle이 아니라 code-derived textual state spec 기준 리뷰다
  3. learning 승격 직전에는 이 descriptive/prescriptive 경계를 한 번 더 판정할 필요가 있다

### 4.2 v3 리뷰 Recommendations (실제 반영 상태 재판정)

| # | 내용 | 우선순위 | 상태 | 비고 |
|---|------|---------|------|------|
| R-1 | 충돌 해소 cascade 단순화 (Step 1 삭제, Tier 순서 원칙 직접 참조) | 높음 | 반영됨 ✓ | `logic_rules.md` Conflict Resolution Procedure 단순화 |
| R-2 | Tier-1a/1b 파생 구조 전파 (4×3 매트릭스, 결정 트리, 명칭) | 높음 | 반영됨 ✓ | 4×3 매트릭스 기존 존재, 결정 트리 보강 |
| R-3 | Agent G/H 순차 실행 | 중간 | 반영됨 ✓ | Wave 3에 반영됨 |
| R-4 | 파일럿 리뷰 선정 기준 보강 | 중간 | 반영됨 ✓ | 이 문서 §4.1.1에 SSOT화. 3+ sub-areas + Tier-1 적용 가능 + Consistency 검증 가능 + 산출물 형태 명시 |
| R-5 | 계획 문서 구조 개선 (정의 1곳 + 참조) | 낮음 | 반영됨 ✓ | 이 문서 §2.1 계획 문서 SSOT 메모로 정리. v2-IA-1/2는 참조형으로 축약 |
| R-6 | 편향 탐지 기준 범주 명시 | 중간 | 반영됨 ✓ | `domain_scope.md` Bias Detection Criteria 범주화 |
| R-7 | 적용성 마커 복합 조건 처리 규칙 | 낮음 | 반영됨 ✓ | `domain_scope.md` Applicability markers 보강 |
| R-8 | CQ-CO 외부 일관성 경로 권위 분할 | 중간 | 반영됨 ✓ | `dependency_rules.md` external consistency endpoint + `domain_scope.md` 분할 유지 |
| R-9 | 하위 영역 누락 3건 처리 (Data Viz, Onboarding, i18n) | 중간 | 반영됨 ✓ | domain scope + extension cases에 존재 |
| R-10 | "partial dependency" 용어 대체 | 낮음 | 반영됨 ✓ | 현재 ui-design 문서 내 잔존 용례 없음 |
| R-11 | 진화 대비 (CC 진입 기준, 출처 마커, Tier-1 분류 축) | 장기 | 반영됨 ✓ | `domain_scope.md` admission criteria + Tier-1 internal axis, owner files의 WCAG derivation marker 추가 |

### 4.3 후속 과제

1. ~~사용자 도메인 정확성 검증~~ → 완료 (4건 수정)
2. ~~파일럿 리뷰~~ → 완료 (4.1 참조)
3. **파일럿 리뷰 학습 승격 여부** → 보류. 이제 1차 reconstructed 파일럿 + 2차 code-derived 파일럿 결과가 모두 있으므로, 승격 여부를 재판정할 수 있는 상태다. 다만 2차도 textual state spec 기반이므로 capture-backed rerun이 추가로 필요한지 판단해야 함
4. **선택적 capture-backed rerun** → 2차 파일럿 review는 완료. 실제 모바일 캡처를 추가 보강해 같은 target family를 재검증할지 결정
5. ~~글로벌 미러 재동기화~~ → 완료. 프로젝트판 8개 문서를 `~/.onto/domains/ui-design/`에 재복사하고 일치 확인

## 5. 핵심 설계 결정 (메모리 내용)

### 규범 체계 [Tier-1a/1b/2/3]

| Tier | 명칭 | Enforcement | Change Velocity |
|------|------|-------------|-----------------|
| Tier-1a | 접근성 표준 | 법적 의무 + 브라우저/기기 | 느림 (년) |
| Tier-1b | 플랫폼 표준 | OS/앱스토어 심사 + API | 느림 (년) |
| Tier-2 | 디자인 시스템 | 린트/토큰/컴포넌트 | 중간 (분기) |
| Tier-3 | 산업 원칙 | 디자인 리뷰/사용성 테스트 | 빠름 (사례별) |

**순서 원칙**: Tier-1a > Tier-1b > Tier-2 > Tier-3 (구속력 기준)
**기존 SoT 매핑**: Accessibility→Tier-1a, Platform→Tier-1b, Internal→Tier-2
**Tier-1 내부 축**: Tier-1a = 접근성/법적/AT 처리, Tier-1b = 플랫폼 심사/API/기기 제약

### 추상화 레이어 [L1/L2/L3]
- [L1] 플랫폼/표준: 플랫폼/브라우저/OS 제공 기본 요소
- [L2] 패턴/원칙: 관행적 설계 원칙 (기술적 강제력 없음)
- [L3] 도메인/실무: 특정 실무 영역

**Tier×L 관계**: 두 축은 독립 정의되나 모든 조합이 유효하지는 않음 (Tier-1a×L3, Tier-1b×L3, Tier-3×L1 구조적 공백)

### CQ 체계
- 11개 접두사: CQ-N, CQ-FI, CQ-FS, CQ-AD, CQ-MO, CQ-DD, CQ-R, CQ-AC, CQ-CO, CQ-DS, CQ-MI
- 분류 축: UI design concern
- CQ-CO: 교차 관심사, 합성 규칙 포함 (3개 하위 유형 모두 통과 시 PASS)
- 91개 질문, P1/P2/P3 우선순위

### SSOT 경계
- logic_rules.md: 행동 규칙 정량 기준 (피드백 시간, 터치 타겟 등)
- structure_spec.md: 구조적 임계값 (네비게이션 항목 수, 뷰포트 등)
- conciseness_rules.md: 간결성 판단 기준
- domain_scope.md: 외부 표준 버전 정보 SSOT

## 6. 관련 파일 경로

### 프로젝트 도메인 문서
- `/Users/kangmin/cowork/onto/domains/ui-design/` (8개 .md 파일)

### 글로벌 도메인 문서 (동기화됨)
- `~/.onto/domains/ui-design/` (8개 .md 파일, 프로젝트와 동일)

### 리뷰 세션
- v1: `.onto/review/20260331-c5dabb18/`
- v2: `.onto/review/20260331-c0f75639/`
- v3: `.onto/review/20260331-baeea27b/`
- 파일럿: `.onto/review/20260331-62180ee4/` (완료, reconstructed)
- 파일럿 입력 설계: `.onto/review/20260331-ui-design-pilot2-input/`
- 파일럿 2차 리뷰: `.onto/review/20260331-d83bcc35/` (완료, code-derived textual state spec / Agent Teams)

### Wave 3 보고서
- `.onto/review/wave3-crossref-report.md`
- `.onto/review/wave3-consistency-report.md`

### 업그레이드 계획
- `~/.claude-1/plans/reflective-toasting-valley.md` (v3 최종, `.claude-2/plans`는 이 경로를 심볼릭 링크로 참조)

### handoff 문서
- `/Users/kangmin/cowork/onto/dev-docs/handoff/20260331-ui-design-upgrade.md` (`/clear` 이후 재개용 최신 요약)

### 메모리 파일
- `~/.claude-2/projects/-Users-kangmin-cowork-onto/memory/project_ui_design_upgrade.md`
- `~/.claude-2/projects/-Users-kangmin-cowork-onto/memory/project_domain_upgrade_plan.md`
- `~/.claude-2/projects/-Users-kangmin-cowork-onto/memory/MEMORY.md`

## 7. 전체 도메인 업그레이드 진행률

| 도메인 | Before | After | 상태 |
|--------|--------|-------|------|
| accounting-kr | 141,522 | — | 기준 (변경 없음) |
| ontology | 37,988 | 166,986 | 완료 ✓ |
| llm-native-development | 38,501 | 162,661 | 완료 ✓ |
| software-engineering | 33,579 | 167,419 | 완료 ✓ |
| palantir-foundry | 49,918 | 236,748 | 완료 ✓ |
| **ui-design** | **62,703** | **219,632** | **완료 ✓ (이번 세션)** |
| accounting | 44,417 | — | 미착수 |
| business | 58,695 | — | 미착수 |
| finance | 46,147 | — | 미착수 |
| market-intelligence | 42,186 | — | 미착수 |
| visual-design | 57,158 | — | 미착수 |

**완료: 6/11 (기준 포함), 미착수: 5/11**
