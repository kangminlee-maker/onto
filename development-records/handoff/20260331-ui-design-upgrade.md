# UI Design Domain Upgrade — Session Handoff

> 작성일: 2026-03-31
> 목적: `/clear` 이후 다음 세션에서 ui-design 작업을 바로 이어받기 위한 최신 상태 문서
> 현재 기준: **문서 업그레이드 완료 + R-11 후속 반영 완료 + 글로벌 미러 재동기화 완료 + 2차 파일럿 리뷰 완료**

---

## 1. 현재 상태

### 완료된 것

1. ui-design 핵심 문서 8개 업그레이드 완료
2. v1/v2/v3 리뷰 반영 완료
3. 파일럿 리뷰 `20260331-62180ee4` 복구 및 philosopher synthesis 완료
4. v3 recommendation 중 `R-1`~`R-11` 반영 상태 재판정 완료
5. 이번 resumed session에서 아래 후속까지 추가 반영 완료
   - `R-4`: 파일럿 선정 기준 SSOT화
   - `R-5`: 계획 문서 구조를 "정의 1곳 + 참조" 패턴으로 정리
   - `R-11`: cross-cutting concern 진입 기준, Tier-1 내부 분류 축, WCAG derivation marker 추가
6. 프로젝트 `domains/ui-design/`와 글로벌 `~/.onto/domains/ui-design/` 8개 파일 일치 확인 완료
7. 2차 파일럿 입력 설계 초안 작성 완료
   - state-rich capture matrix
   - markdown review target template
8. current `podo-app` 구현 기반의 2차 파일럿 `review-target.md` draft 작성 완료
9. 2차 파일럿 리뷰 `20260331-d83bcc35` 실행 완료 (`--claude`)
10. 2차 파일럿 philosopher synthesis 확보 완료

### 아직 열려 있는 것

1. **파일럿 리뷰 학습 승격 여부**
   - 현재는 보류
   - 현재는 1차 reconstructed + 2차 code-derived 결과까지 확보됨
   - 남은 판단은 이 두 파일럿만으로 learning 승격할지, 실제 캡처 기반 rerun까지 볼지 여부
2. **선택적 capture-backed rerun**
   - 2차 파일럿 review는 완료됨
   - 실제 state-rich 캡처를 추가 보강해 동일 family를 다시 검증할지 선택하면 됨
   - 권장 상태: `loading`, `error`, `empty`, `no-permission`, `selected-time`
3. **`/onto:review --codex` 경로 정비 여부**
   - 현 저장소에서는 `scripts/codex-companion.mjs` 부재와 `codex:codex-rescue` 미사용 가능으로 `--codex` 실행이 중단됨
   - 필요 시 별도 infra 작업으로 분리하는 편이 맞음

---

## 2. 다음 세션의 권장 시작점

### 먼저 읽을 문서 3개

1. [dev-docs/handoff/20260331-ui-design-upgrade.md](/Users/kangmin/cowork/onto/dev-docs/handoff/20260331-ui-design-upgrade.md)
2. [dev-docs/handoff/20260331-session-ui-design-upgrade.md](/Users/kangmin/cowork/onto/dev-docs/handoff/20260331-session-ui-design-upgrade.md)
3. [reflective-toasting-valley.md](/Users/kangmin/.claude-1/plans/reflective-toasting-valley.md)

### 파일럿 관련 원문

1. [.onto/review/20260331-62180ee4/review-target.md](/Users/kangmin/cowork/onto/.onto/review/20260331-62180ee4/review-target.md)
2. [.onto/review/20260331-62180ee4/philosopher_synthesis.md](/Users/kangmin/cowork/onto/.onto/review/20260331-62180ee4/philosopher_synthesis.md)
3. [.onto/review/20260331-ui-design-pilot2-input/input-design.md](/Users/kangmin/cowork/onto/.onto/review/20260331-ui-design-pilot2-input/input-design.md)
4. [.onto/review/20260331-ui-design-pilot2-input/review-target.template.md](/Users/kangmin/cowork/onto/.onto/review/20260331-ui-design-pilot2-input/review-target.template.md)
5. [.onto/review/20260331-ui-design-pilot2-input/review-target.md](/Users/kangmin/cowork/onto/.onto/review/20260331-ui-design-pilot2-input/review-target.md)
6. [.onto/review/20260331-d83bcc35/philosopher_synthesis.md](/Users/kangmin/cowork/onto/.onto/review/20260331-d83bcc35/philosopher_synthesis.md)

### 다음 행동 우선순위

1. `20260331-d83bcc35/philosopher_synthesis.md`를 기준으로 learning 승격 여부를 먼저 판정한다
2. 승격 confidence가 부족하면 실제 캡처를 추가해 동일 family로 capture-backed rerun을 수행한다
3. rerun 시에도 최소 2개 screen family + locked reveal micro-flow, required state set을 유지한다
4. `/onto:review --codex` 정비는 review 판단과 분리해서 다룬다

---

## 3. 이번 세션에서 바뀐 핵심 규칙

### 파일럿 선정 기준 SSOT

위치: [dev-docs/handoff/20260331-session-ui-design-upgrade.md](/Users/kangmin/cowork/onto/dev-docs/handoff/20260331-session-ui-design-upgrade.md#L94)

요약:
- markdown 기반 review target
- 최소 2개 화면 또는 상태 변형 포함 1개 흐름
- Key Sub-Areas 3개 이상
- Tier-1a/1b 규칙 적용 가능성 필요
- Consistency 검증 가능해야 함

### R-11 진화 대비 규칙

위치: [domain_scope.md](/Users/kangmin/cowork/onto/domains/ui-design/domain_scope.md#L106), [domain_scope.md](/Users/kangmin/cowork/onto/domains/ui-design/domain_scope.md#L151), [domain_scope.md](/Users/kangmin/cowork/onto/domains/ui-design/domain_scope.md#L229)

요약:
- Tier-1 내부 분류 축 추가
- Cross-cutting concern admission criteria 추가
- 외부 표준 파생 규칙용 `<!-- derived-from: ... -->` 마커 프로토콜 추가

### 실제로 마커가 들어간 파일

1. [logic_rules.md](/Users/kangmin/cowork/onto/domains/ui-design/logic_rules.md#L178)
2. [logic_rules.md](/Users/kangmin/cowork/onto/domains/ui-design/logic_rules.md#L317)
3. [structure_spec.md](/Users/kangmin/cowork/onto/domains/ui-design/structure_spec.md#L24)
4. [structure_spec.md](/Users/kangmin/cowork/onto/domains/ui-design/structure_spec.md#L54)
5. [dependency_rules.md](/Users/kangmin/cowork/onto/domains/ui-design/dependency_rules.md#L206)

---

## 4. 주의사항

1. 계획 원문은 `.claude-1`이 원본이다
   - `.claude-2/plans`는 심볼릭 링크
2. `dev-docs/handoff/20260331-session-ui-design-upgrade.md`는 현재 세션 상태 SSOT로 유지
3. 기존 ui-design 문서들은 이미 사용자(=주체자) 수정과 세션 수정이 섞여 있으므로 되돌리기 금지
4. 다음 세션에서 바로 문서 추가 수정부터 하지 말고, 먼저 **2차 파일럿 결과만으로 학습 승격할지 / capture-backed rerun을 할지**를 정해야 한다

---

## 5. 빠른 재개 프롬프트

다음 세션에서 아래처럼 시작하면 된다:

```text
UI design handoff 기준으로 이어가자.
먼저 dev-docs/handoff/20260331-ui-design-upgrade.md, dev-docs/handoff/20260331-session-ui-design-upgrade.md, 20260331-d83bcc35 philosopher_synthesis를 읽고,
2차 파일럿 결과 기준으로 learning 승격 여부부터 판단하자.
```
