---
as_of: 2026-04-17
status: design-sketch
functional_area: output-language-boundary-phase-2
purpose: |
  `src/core-runtime/translate/render-for-user.ts` 의 Phase 2 실제 번역 로직 설계 스케치.
  현재 Phase 1 은 passthrough (internal English → 그대로 external 출력). Phase 2 는
  `output_language` 설정값이 `en` 이외일 때 principal 에게 번역된 텍스트를 렌더한다.
authority_stance: non-authoritative-design-surface
canonicality: scaffolding
source_refs:
  principle: "design-principles/output-language-boundary.md"
  render_seat: "src/core-runtime/translate/render-for-user.ts"
  registry: "authority/external-render-points.yaml"
  track_memory: "~/.claude-1/projects/-Users-kangmin-cowork-onto-4/memory/project_output_language_boundary_track.md"
---

# Phase 2 Translation Design Sketch (2026-04-17)

> **Status**: sketch. Implementation deferred until trigger conditions (§3) are met.

## 1. Problem

현재 `renderForUser({renderPointId, internalPayload, userLanguage})` 은 registry 검증 후 **passthrough** — `userLanguage === "en"` 이든 `"ko"` 든 동일 payload 를 그대로 반환한다. Principal 이 `output_language: ko` 로 설정해도 실제로는 English text 만 받는다.

Phase 1 은 "경계 확립" 이 목적이었고 (미등록 render point 차단 + call-site stable), 실제 번역 로직은 trigger 가 도달할 때 추가하기로 의도적으로 이연했다.

## 2. 왜 sketch 로만 남기는가

Phase 2 는 **제품 결정** 이 선행되어야 한다:

- 어느 언어를 지원할 것인가? (선언적 allowlist vs 런타임 제한 없음)
- 번역 품질은 어느 수준으로 보장하는가? (MT 급 vs human-reviewed 급)
- Latency / cost 는 어느 정도까지 허용하는가? (halt 메시지 같이 실시간 필요한 것과 리포트 같이 batched 가능한 것의 분리)
- Fallback 은? (번역 실패 → English 로 폴백 vs error halt)

이 결정들은 실제 use case 가 도달하기 전에는 speculative 이며, 잘못 고정하면 Phase 3 이상에서 뒤집어야 한다. 본 sketch 는 **트리거 도달 시 빠르게 착수할 수 있도록 옵션 공간을 매핑** 하는 것이 목적이다.

## 3. 트리거 조건

다음 중 하나라도 충족되면 Phase 2 착수:

1. Principal 이 `output_language: ko` (또는 non-`en`) 로 실제 운영 중 review / reconstruct 를 실행하고, principal-facing 출력이 English 로 남는 것이 UX 불편으로 명시 보고됨
2. Remote 기여자가 `output_language` 필드를 실사용 하려고 시도하다 "현재 번역 없음" 을 발견하고 이슈 제기
3. 다국어 principal 팀 (예: KR + JP + EN 혼재) 에서 같은 프로젝트에 대해 review 결과를 언어별로 읽을 필요 발생

트리거 전까지는 Phase 1 passthrough 로 유지. passthrough 자체가 **보호 장치** 역할 — internal English 의 정확성이 우선이고 번역은 그 위의 편의 layer.

## 4. 설계 옵션 A — Per-language template table

**구조**: 등록된 render point 마다 언어별 템플릿 파일을 `authority/external-render-translations/{render_point_id}.{lang}.md` 로 유지.

**예시**:
```
authority/external-render-translations/
├── halt_message_config_malformed.en.md
├── halt_message_config_malformed.ko.md
├── phase_5_completion_report.en.md
├── phase_5_completion_report.ko.md
...
```

`renderForUser` 가 registry 에서 점 id → file 매핑 → `{lang}.md` 로드 → slot fill. 각 템플릿은 `{session_id}`, `{round_count}`, `{unresolved_count}` 같은 placeholder 를 공유한다.

**장점**:
- 런타임 번역 호출 없음 (latency 0, cost 0)
- 번역 품질을 **인간이 선제 검수** — principal-facing 리포트에서 어색한 기계 번역 없음
- 기여자가 새 언어 지원을 추가할 때 변경은 add-only (기존 언어 파일 영향 0)

**단점**:
- 템플릿 정적 — 새 render point 추가마다 **모든 지원 언어의 템플릿을 동시 작성** 해야 함 (양측 drift 위험)
- Slot-heavy 콘텐츠 (예: lens output 요약) 는 템플릿화 어려움 — 동적 구조를 강제로 정적 뼈대로 환원하면 정보 손실
- 번역 품질이 기여자의 언어 능력에 의존 — KR 유창한 기여자 없으면 KR 품질 보장 불가

**적합한 use case**: halt 메시지 / 완료 리포트 / help 출력 같이 **구조가 고정된 짧은 텍스트**. 실제로 §L1 registry 의 halt 6 + Phase 5 report + help + onboard 는 전부 이 카테고리.

## 5. 설계 옵션 B — LLM 기반 on-demand 번역

**구조**: `renderForUser` 가 `userLanguage !== "en"` 일 때 LLM 번역 호출. 캐싱은 선택.

**흐름**:
```
internalPayload (English)
  ↓ renderForUser(render_point_id, payload, "ko")
  ↓ LLM translate prompt: "Translate to Korean preserving formatting and technical terms: {payload}"
  ↓ cached? return. not cached? LLM call, store, return.
```

**장점**:
- 동적 콘텐츠에 자연스러움 — Phase 3 user summary 같은 wip.yml-derived 텍스트는 매번 구조가 다름
- 언어 추가의 marginal cost ≈ 0 (새 translation file 불필요)
- 번역 품질은 LLM 역량에 비례 — 현대 frontier model 은 KR / JP / ZH 번역 품질이 매우 높음

**단점**:
- 런타임 LLM 호출 = **latency + cost 증가**. halt 메시지 같이 즉시 표시되어야 하는 경로에는 부적합
- **Semantic drift 재유입 위험** — 이 project 가 처음부터 방어하려던 문제. 번역 과정 자체가 다시 LLM 에 원본을 넘기므로, 번역 모델이 "약간 다른 표현" 을 생성하면 principal 이 본 내용과 wip.yml 내용이 미세하게 divergence. 이 divergence 는 internal-external boundary 의 의도를 약화
- Cache 디자인 복잡 — payload 의 해시 기반? 템플릿 + slot 기반? render_point_id 기반?
- Provider 의존성 — anthropic / openai / codex / local 등 어느 것을 쓸지 결정 필요. Background LLM (`api_provider`) 와 공유할지 별도 provider 를 쓸지도 결정점

**적합한 use case**: 동적으로 조립되는 긴 텍스트 (Phase 3 user summary, review synthesis user-facing section 등). 단 latency-critical 경로는 피해야 함.

## 6. 설계 옵션 C — Hybrid (A + B per render point)

Registry 엔트리마다 번역 mode 를 선언:
```yaml
- id: halt_message_config_malformed
  translation_mode: template      # Option A
  translations:
    en: ...
    ko: ...
- id: phase_3_user_summary
  translation_mode: llm            # Option B
  translation_provider: default   # uses resolved api_provider
```

**장점**:
- 각 render point 의 특성 (정적/동적) 에 맞춤
- Option A 의 정확성 + Option B 의 유연성 결합

**단점**:
- Registry 스키마 복잡도 증가
- 기여자가 모드 선택 결정 책임 보유 — 추가 cognitive load
- 혼용 정책 없으면 template fallback 경계가 모호해짐

## 7. 권장 진입 경로 (트리거 도달 시)

1. **Minimal viable Phase 2**: 먼저 Option A 로 halt 메시지 (6 개) + 완료 리포트만 번역 지원. Slot 구조가 단순하고 교차 검증 용이
2. **Learning**: 몇 주 운영 후 principal 이 실제로 어느 render point 에서 translation 부족을 호소하는지 측정
3. **확장 판정**: 그 다음에만 Option B 도입 결정. 측정 없이 전면 도입 금지

## 8. 구현 시 주의

- `render-for-user.ts` 의 **signature 변경 금지**. 현 `{renderPointId, internalPayload, userLanguage}` 인터페이스가 호출자 전체에 stable. Phase 2 는 내부 구현 변경으로만
- 번역 실패 시 **English 로 폴백** (절대 halt 하지 않음). 번역은 편의 layer, 실행은 English 가 진실
- 번역 품질 regression 을 잡기 위한 **snapshot test** 도입 권장. 각 render point 의 번역 결과가 baseline 대비 급변하면 fail
- Phase 2 와 독립적으로: **lens / synthesize output 의 body vs user-visible summary 구조적 분리** (`20260417-review-output-structural-split-sketch.md`) 가 선행되면 Option A 적용 범위가 넓어짐 (synthesize 의 user-facing 영역도 static template 가능)

## 9. 이 sketch 의 비확정성

본 문서는 **설계 결정이 아니다**. 트리거 도달 시 본 옵션들을 input 으로 받아 정식 설계 세션을 수행하고, 그 결과가 `design-principles/output-language-boundary.md` 또는 별도 설계 artifact 로 승격된다.

변동 가능 요소:
- 옵션 A/B/C 외의 새 접근 (예: 로컬 MT 모델 전용, WebAssembly 기반 오프라인 번역 등)
- 트리거 조건의 재정의
- "Option A 부터" 권장 경로의 수정

**목적**: 트리거 도달 시점에 설계 공백에서 시작하지 않고, 본 sketch 의 옵션 공간에서 진입하도록 돕는 것.
