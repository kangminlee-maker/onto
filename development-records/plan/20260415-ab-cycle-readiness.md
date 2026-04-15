---
as_of: 2026-04-15T22:30:00+09:00
status: complete
functional_area: execution-readiness
purpose: A·B 1사이클 readiness 실측 + 발견 defect 수정 기록. W-C-01 진입 trigger 문서.
---

# A·B 1사이클 Readiness 실측 기록

세션 10 초반, W-C-01 (govern runtime 도입) 진입 전제 조건인 **"A·B 1사이클"** 충족을 확인하기 위한 readiness closure exercise 결과.

## 1. 배경

**onto-direction §1.0** 은 onto 가 Principal 의 **reconstruct → review → evolve** 세 활동의 시간·비용을 최소화한다고 정의. "1사이클 경험" 은 W-C 축 (govern runtime) 진입의 전제. 세션 10 startup handoff §8.2 에서 판정 기준 모호를 지적.

## 2. 실측 결과 (실행 전)

| 활동 | E2E 이력 | 증거 |
|---|---|---|
| review | ✅ 충족 | `.onto/review/` 15 세션 + `~/.onto/review/` 23 세션 = **38 세션** |
| reconstruct | ❌ 미충족 | `.onto/reconstruct/` 디렉터리 부재 |
| evolve | ⚠️ 부분 | design-prototype 1건, scope grounded 단계에서 멈춤 |

## 3. Readiness closure 실행

### 3.1 Reconstruct E2E on onto self

- 대상: `src/core-runtime/evolve`
- 의도: "recover canonical activity ontology for evolve commands (align/draft/apply/close)"
- 세션: `.onto/reconstruct/20260415-1010f607/`
- 결과: **start → exploring (2 invocations) → converted** 3-step bounded path 전수 실행. `ontology-draft.md` + `reconstruct-state.json` 생성. `principal_review_status = requested`.
- 주체자 판정: PASS (bounded minimum surface 설계 의도대로 동작)

### 3.2 Evolve E2E: propose-align gap 발견

Evolve CLI 실행 중 **구조적 gap** 발견:

- `grounded → align_proposed` 전이 단계를 수행하는 CLI subcommand 부재
- gate-guard 주석 (src/core-runtime/scope-runtime/gate-guard.ts:264-265) 에만 "Protocol determines when agent should record align.proposed" 명시
- design-prototype 이 `grounded` 에서 멈춘 원인과 일치
- **Principal 시간·비용 최소화** (onto-direction §1.0) 와 **자기 적용** (project-locality-principle) 원칙 위반

### 3.3 Propose-align 도입 결정

설계철학 검토 후 **review CLI 패턴 (prepare-session → materialize-prompt-packets) 을 evolve 에 동형 적용** 하는 것이 세 원칙 (LLM-native, bounded minimum surface, Principal 시간·비용 최소화) 을 모두 만족한다고 판단.

**책임 분리**:
- **CLI**: 상태 기계 + 이벤트 로그 + 패킷 렌더링 (결정적)
- **Agent (Claude Code 세션 / LLM)**: 대화 UX — 선택지 기반 질문, 자연어 fallback, 답변 통합, 수렴 판정 (비결정적)

### 3.4 구현

1. `src/core-runtime/evolve/commands/propose-align.ts` — 신규 handler (zod 기반 입력 검증 + constraint.discovered 이벤트 N개 + align-packet 렌더 + align.proposed 이벤트)
2. `src/core-runtime/evolve/cli.ts` — subcommand 등록 + help 갱신 + UX 계약 명시
3. `src/core-runtime/evolve/renderers/scope-md.ts` — grounded 상태 next_action 문구 갱신 (agent 책임 명시)
4. `commands/evolve.md` — bounded 하위 subcommand 책임 분리 표 + propose-align UX 계약 추가
5. `src/core-runtime/evolve/commands/propose-align.test.ts` — 6 unit tests (happy path + state guard + invalid input)

### 3.5 Evolve E2E on W-C-01 goal

- Scope: `govern-v0-20260416-001`
- Brief: "govern 활동 CLI 진입점 + process 계약 + drift 훅 스펙 v0"
- 대화 4 라운드 (agent-Principal interactive):
  - Q1 (unit): 변경 제안 1개로 통합, origin 기반 tag
  - Q2 (CLI shape): queue 패턴 (submit/list/decide)
  - Q3 (queue 위치): 프로젝트 내부 (.onto/govern/queue.ndjson)
  - Q4 (승인 강제 범위): v0 는 기록만 (차단은 W-C-02)
  - Q5/Q6 (자동 결정): lexicon activity 등재 + event-sourcing 공유 파일 패턴
- 통합 산출물: `scopes/scope-20260415-001/inputs/propose-align-input.json` (6 constraints)
- 상태 전이: **scope.created → grounded → align_proposed → align_locked → surface_iterating → surface_confirmed → constraints_resolved → target_locked → deferred** (21 events)
- `evolve defer` 로 보류. Resume 조건: W-C-01 착수 시점.

### 3.6 발견·수정된 defect

1. **Evolve CLI 의 stale "design" 문자열 10곳** (W-A-78 잔여): help, 에러 메시지, JSDoc. 일괄 "evolve" 로 교체.
2. **Reconstruct ontology-draft.md 템플릿 정보** 은 소스상 이미 `processes/reconstruct.md` 로 교정되어 있었음. 초기 실행 시 본 결함 목격은 stale `dist/cli.js` 때문. `npm run build:ts-core` 로 해소.
3. **§1.4 schema-example-marker** 도입 — audit 집계 왜곡 제거 (별도 commit, 초기 옵션 C).

## 4. 판정

**A·B 1사이클 readiness 충족** — 다음 근거:

1. **Reconstruct**: bounded minimum surface (W-A-74) 가 제공하는 전 주기 CLI 를 실 product 경로에 대해 E2E 실행 완료.
2. **Review**: 38 세션 축적, 별도 실측 불요.
3. **Evolve**: bounded surface 의 gap (propose-align) 을 본 세션에서 메우고, 메운 CLI 를 사용해 실 goal 에 대한 대화 + 6 constraint 등록 + 상태기계 9 단계 전이 E2E 실행.

**부가 성과** — readiness closure 과정이 실제 제품 결함 (propose-align gap, W-A-78 stale 문자열) 2건을 발견·수정하여 readiness 의 본래 목적 (제품 품질 실측) 에 부합.

## 5. W-C-01 에의 함의

본 세션 산출물을 W-C-01 설계의 **1 입력** 으로 참조:

1. **Queue 패턴 vs session 패턴** — govern 의 본질이 queue 임을 확인. W-C-01 CLI 구조의 anchor.
2. **CLI-agent 책임 분리** — propose-align 설계에서 확립한 패턴 (CLI=상태기계, agent=대화 UX) 을 govern 에도 동형 적용. govern 이 내부에서 LLM 호출 시도 금지.
3. **Bounded minimum surface** — v0 는 기록만, 실 enforcement 는 W-C-02. reconstruct 의 W-A-74 선례와 정렬.
4. **Event-sourcing drift 훅** — 별도 API 층 없이 `.onto/govern/queue.ndjson` 공유 파일 append 패턴. scope-runtime 전례.

**편향 제거 조치**: W-C-01 진입 시 본 세션 산출물을 **참조 입력** 으로만 취급. 최종 commands/govern.md + processes/govern.md + lexicon entry 는 별도 9-lens 리뷰로 정화.

## 6. 남은 item

- `scopes/govern-v0-20260416-001/` — deferred, W-C-01 착수 시 재개 (또는 참조만 하고 새 scope 로 진행).
- `scopes/scope-20260415-001/` — align_proposed 까지 진행된 초기 scope. propose-align-input.json 은 재사용 가능.
- `.onto/reconstruct/20260415-1010f607/` — bounded reconstruct 산출물. ontology 실제 내용은 Explorer/lens runtime (후속 W-ID) 에서 채울 영역.

## 7. 참조

- `development-records/evolve/20260413-onto-direction.md §1.0, §1.4` — 상위 가치 + govern 완료 기준
- `development-records/plan/20260415-execution-session10-startup.md §2.1, §8.2` — readiness 판정 기준 모호 제기
- `src/core-runtime/evolve/commands/propose-align.ts` — 도입 handler 정본
- `commands/evolve.md` — CLI-agent 책임 분리 계약
