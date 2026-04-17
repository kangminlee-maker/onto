# Output Language Boundary

**Authority**: rank 4 (인터페이스 명세). CLAUDE.md §"Authority 위계" 에 등록.

## 1. 원칙

onto 시스템의 모든 텍스트는 두 축으로 분리하여 언어 정책을 적용한다:

| 축 | 언어 정책 | 대상 |
|---|---|---|
| **External output** | `output_language` 설정값에 따라 번역 (en/ko/ja/...) | 개발자·이용자가 읽는 최종 텍스트 |
| **Internal system** | **English 단일 언어 강제** | LLM agent 프롬프트, agent 간 hand-off payload, runtime 상태 artifact, 스크립트·코드 문자열 |

### 판정 기준 (single rule)

> "이 텍스트를 소비하는 **다음 agent 또는 run** 이 존재하는가?"

- **Yes** → Internal → English 고정 (예외 없음)
- **No** (오직 사용자만 읽음) → External 후보 → `authority/external-render-points.yaml` 에 등록된 지점에서만 번역

## 2. Rationale — 왜 이 경계가 필요한가

### 2.1 LLM Semantic Drift

동일 의미의 프롬프트·artifact 를 언어별로 번역하면, 언어마다 동의어·뉘앙스·concept cluster 가 미세하게 달라져 LLM 의 추론이 분기한다. onto 의 여러 agent 가 공유하는 artifact (`wip.yml`, `deltas/`, `session-log.yml` 등) 에 번역된 텍스트가 섞이면:

- downstream agent 가 번역된 텍스트를 해석해 또 다른 편차를 만듦 — 중간 번역층이 누적된다
- 같은 session 을 resume 하거나 여러 run 을 재실행할 때 결정론적 재현성 파괴
- 여러 세션 간 cross-comparison (learning extraction, benchmark, audit) 불가능

### 2.2 UX 본능이 원칙을 덮어쓸 때

"사용자가 한국어 결과를 즉시 보게 하려면 agent 프롬프트에 `Respond in ko` 를 넣는 게 제일 쉽다" — 이 UX 본능이 semantic drift 비용을 가린다. 이런 패턴은 agent 출력이 곧바로 user 에게 노출되는 단순한 case 에서는 동작하지만, agent → agent hand-off 나 artifact 에 번역문이 섞이는 순간 onto 의 multi-agent 아키텍처 전제가 무너진다.

## 3. 경계 정의 — 구체적 케이스

### 3.1 Internal (English 고정)

- LLM agent system prompt / user prompt 본문
- Agent 가 다음 agent·round·artifact 로 전달하는 모든 natural-language payload
- `wip.yml`, `deltas/`, `session-log.yml`, epsilon/conflict 메시지, reasoning log
- 코드 내 상수 문자열·로그 메시지
- Runtime diagnostic (structured JSON/YAML) 의 `message` 필드

### 3.2 External (output_language 적용)

- onto CLI 가 사용자에게 표시하는 최종 리포트 (Phase 5 완료 리포트, review synthesize 최종본)
- Halt 메시지 템플릿 렌더링
- Phase 3 사용자 요약·inquiry (interactive 단계에서 사용자가 직접 읽음)
- `onto help` / `onto onboard` 대화형 출력
- `onto govern submit` 응답 메시지
- 사용자 직접 소비를 전제한 review round1 파일의 "user-visible annotation" 섹션 (단, synthesize 에 넘기는 본문은 English 유지)

### 3.3 경계 판정이 애매한 케이스의 지침

- **Review lens 출력** — "이중 목적" 문제. lens 본문은 synthesize 에 넘어가므로 English 유지 원칙. 단 리포트 최상단의 summary 같은 "사용자 직접 소비 영역" 은 분리해 render_for_user 통과 가능
- **Halt 메시지** — 사용자 직접 소비이므로 번역 대상이되, 템플릿 자체는 English 로 작성해 internal 에 저장하고 **render 시점에만** 번역

## 4. 예외 절차 — 새 external render point 추가

새로 번역이 필요한 지점이 발견되면:

1. `authority/external-render-points.yaml` 에 PR 로 항목 추가
2. `rationale` 필드에 "이 지점 이후 다른 agent 소비 없음" 을 증명
3. 해당 render 로직은 `src/core-runtime/translate/render-for-user.ts` (canonical render 함수) 를 통해서만 호출
4. 리뷰어는 제안된 지점이 §3.1 에 속하지 않는지 확인

## 5. 구현 상태 (2026-04-17 기준)

**확립된 것**:
- 본 원칙 문서 (rank 4)
- `authority/external-render-points.yaml` — 10 개 초기 entries 등록 (halt 6 + phase 3 summary + phase 5 report + onboard + help)
- `CLAUDE.md` Authority 위계 등록
- Canonical render 함수 `src/core-runtime/translate/render-for-user.ts` — 런타임 registry 검증 + passthrough 렌더 (Phase 1). `renderForUser({renderPointId, internalPayload, userLanguage})` 호출 시 미등록 id 는 예외
- `processes/reconstruct.md` 기존 위반 수정 완료: Explorer / Adjudicator / Synthesize 프롬프트에서 `Respond in {output_language}` 제거 → `Respond in English` + render seat 참조

**미확립 — 후속 PR 로 정식화 필요**:
- 실제 번역 로직 (현재는 passthrough). 선택지: (a) 등록 지점별 per-language 템플릿 테이블, (b) LLM 기반 on-demand 번역. 어느 쪽이든 renderForUser 시그니처는 안정
- Agent prompt 상단의 표준 `[Language Policy]` boilerplate (processes/*.md 전수 주입)
- CI lint gate (`scripts/lint-output-language-boundary.ts`) — 등록되지 않은 `{output_language}` 참조 차단. 등록 baseline 고정 후 활성화
- `processes/review/lens-prompt-contract.md:88` 와 `processes/review/synthesize-prompt-contract.md:57` 의 `output_language` context 참조 — review lens 출력의 이중 목적 구조 재설계 필요 (body=English, user-visible summary=렌더)

**현재 상태의 함의**: 원칙 + registry + canonical render seat + reconstruct.md 위반 수정 완료. **번역 자체는 passthrough (no-op)**. 이 PR 이후 기여자는 user-facing 텍스트를 `renderForUser` 통해 출력하면 이미 원칙에 맞는 경로에 있고, Phase 2 가 실제 번역 로직을 추가하면 변경 없이 자동 적용. CI lint 는 baseline 이 깨끗해진 지금 이후 PR 에서 켤 수 있다.

## 6. 관련 문서

- `authority/external-render-points.yaml` — 허용된 render 지점 레지스트리
- `design-principles/llm-runtime-interface-principles.md` — rank 4 동료 문서
- `design-principles/llm-native-development-guideline.md` — rank 2. LLM-native 설계 원칙의 상위 컨텍스트
- 초안 메모: `.onto/temp/output-language-boundary-proposal.md` (2026-04-17 세션의 5-layer 구조 제안. 본 문서는 그 proposal 중 §1 원칙 부분만 정식화한 결과)
