---
as_of: 2026-04-17
status: design-sketch
functional_area: output-language-boundary-review-dual-purpose
purpose: |
  Review lens / synthesize output 의 "이중 목적" 구조 분리 설계 스케치.
  현재 lens 본문은 synthesize 가 다시 읽고, synthesize 본문은 principal 이
  읽는 동시에 `ReviewRecord` / learning extraction / audit 의 input 이 된다.
  Internal (agent hand-off) 과 external (principal display) 을 **구조적으로
  분리** 해야 `output_language` 번역이 "agent 간 공유 artifact 오염 없이"
  principal 부분에만 적용될 수 있다.
authority_stance: non-authoritative-design-surface
canonicality: scaffolding
source_refs:
  principle: "design-principles/output-language-boundary.md"
  lens_contract: "processes/review/lens-prompt-contract.md"
  synthesize_contract: "processes/review/synthesize-prompt-contract.md"
  record_contract: "processes/review/record-contract.md"
  materializer: "src/core-runtime/cli/materialize-review-prompt-packets.ts"
  track_memory: "~/.claude-1/projects/-Users-kangmin-cowork-onto-4/memory/project_output_language_boundary_track.md"
---

# Review Output Structural Split Sketch (2026-04-17)

> **Status**: sketch. Implementation deferred — depends on Phase 2 translation adoption AND a principal-reported UX need for reviewed results in non-English.

## 1. 이중 목적의 정체

### 1.1 Lens output

`{session_root}/round1/{lens_id}.md` 파일 하나가 다음 세 주체에게 모두 소비된다:

| 소비자 | 역할 | 원하는 형태 |
|---|---|---|
| **Synthesize** (다음 agent) | consensus 정리, deliberation, claim adjudication | 구조화된 finding, 4-field claim, `upstream_evidence_required` 등 field-level 정확도 |
| **Principal** (인간) | "이 review 가 무엇을 찾았는가" 파악 | 읽기 쉬운 prose, 핵심 요점, 근거 링크 |
| **Learning extraction / audit** (향후 session) | cross-session pattern 인식, 품질 지표 | **결정론적 재현성** — 같은 input 에 같은 lens 가 같은 output 을 내는가 |

같은 파일이 세 역할을 다 하려면:
- "agent + audit" 관점: English 고정 + 구조화된 field + 안정된 포맷
- "principal" 관점: `output_language` 번역 + prose 친화

현재는 전자를 선택 (lens body = English 고정). principal 이 round1 을 읽어도 English. 이것이 boundary 원칙 §3.3 "이중 목적 case" 의 현재 해법.

### 1.2 Synthesize output

`{session_root}/synthesis.md` 도 세 주체:

| 소비자 | 역할 |
|---|---|
| **Principal** | review 최종 리포트. 리뷰 결과 직접 소비 |
| **ReviewRecord assembler** | machine-readable record 를 위한 source |
| **Learning extraction** | consensus / disagreement 패턴 추출 |

여기서는 principal 이 **primary 소비자** 인 것이 명확하지만, 구조 (frontmatter + canonical sections + per-item provenance) 는 ReviewRecord 를 위해 고정 — 순수 prose 로 쓸 수 없다.

## 2. 문제 진술

Phase 2 번역 로직 (`20260417-phase-2-translation-design-sketch.md`) 을 도입해도, 현재 구조에서는 번역이 곤란하다:

- Lens body 전체를 번역 → synthesize 도 번역된 body 를 읽어야 함 → 다시 semantic drift 재진입 (본래 방어하려던 문제)
- Synthesis body 전체를 번역 → ReviewRecord / learning extraction 도 번역된 내용 기반 → cross-session 비교가 언어별로 fragment

**구조적 해결**: 각 output 파일 안에 **agent-consumed body (English 고정)** + **principal-visible summary (번역 가능)** 섹션을 명시적으로 분리. 번역은 summary section 에만 적용.

## 3. 트리거 조건

다음 모두 충족되어야 본 작업 착수:

1. **Phase 2 번역 로직이 deployed** — translation 인프라 없이 split 만 해도 이득 불명
2. **Principal 이 review 결과를 비영어로 소비하려는 명시적 요구** 보고됨 — 현재는 모두 English 로 읽고 있어 split 가치 측정 불가
3. **측정 근거**: Phase 2 미니멀 deployment (halt / 완료 리포트 번역) 운영 결과, review output 까지 번역 확장이 principal 효용을 증가시킬 것이라는 signal

트리거 3 개 중 하나라도 미충족 시 **구조 유지** 가 기본값. 이유: split 작업의 blast radius 가 크고 (lens contract + synthesize contract + ReviewRecord + materializer + runtime coordinator + 다수 test), 반환 가치가 trigger 부재 상태에선 speculative.

## 4. 설계 옵션 A — Frontmatter-delimited sections

Lens / synthesize output 에 canonical user-visible section 을 frontmatter 로 선언:

```markdown
---
user_visible_sections:
  - "## User Summary"
  - "## Key Findings For Principal"
internal_sections:
  - "## Structural Inspection"
  - "## Finding Details"
  - "## Applied Learnings"
  - "## Domain Constraints Used"
---

## User Summary
(principal 에게 번역되어 표시될 prose. renderForUser 통과)

## Key Findings For Principal
(핵심 3-5 건 요약 — 번역 대상)

## Structural Inspection
(agent hand-off — English 고정)

## Finding Details
(4-field claim, evidence anchor, ...  — English 고정)
...
```

**장점**:
- 변경 범위가 상대적으로 작음 (contract + materializer + runtime render path)
- Agent 는 여전히 하나의 파일만 생성 (분할 복잡도 없음)
- Frontmatter 선언으로 어느 섹션이 번역되는지 deterministic

**단점**:
- Lens LLM 이 "user summary" 섹션을 얼마나 유효하게 쓸 수 있는가 — prompt 엔지니어링 필요
- Principal 이 한 파일 안에서 English + 번역 혼재를 볼 때의 UX 갈등 — English section 을 숨길지 보일지 결정 필요
- `ReviewRecord` 스키마가 양쪽 섹션을 어떻게 표현할지 스키마 확장 필요

## 5. 설계 옵션 B — Separate user-facing derivative file

Lens / synthesize body 는 현행 그대로 English. 별도 파생 파일을 Runtime Coordinator 가 생성:

```
{session_root}/round1/{lens_id}.md          # English, agent-consumed (unchanged)
{session_root}/round1/{lens_id}.user.md     # 번역됨, principal-visible (new)
{session_root}/synthesis.md                 # English, ReviewRecord source (unchanged)
{session_root}/synthesis.user.md            # 번역됨, principal-facing (new)
```

생성 방법:
- Runtime Coordinator 가 synthesize 완료 후 `synthesis.md` 를 Phase 2 translation layer 에 통과시켜 `synthesis.user.md` 로 렌더
- Lens 는 lens body 가 완성되면 동일 처리

**장점**:
- 기존 파일 구조 **불변** — ReviewRecord / audit / learning extraction 은 전혀 영향 없음
- Principal 은 `*.user.md` 만 읽으면 됨 — UX 간단
- LLM 프롬프트에 "user summary 를 특별히 생성하라" 는 부담 없음 — 기존 agent 본문을 그대로 번역

**단점**:
- 파일 수 2 배 증가 (round1 9 개 lens → 18 개 파일)
- 번역 비용 2 배 — full body 번역은 크다 (lens output 은 종종 1-3KB)
- 중복 정보 혼란 — principal 이 `*.md` 와 `*.user.md` 중 어느 것이 canonical 인지 혼동 가능

## 6. 설계 옵션 C — On-demand render without derived file

파일은 분리하지 않음. Principal 이 review 결과를 요청하는 시점 (CLI 에서 `onto review show` 같은 명령) 에 Runtime Coordinator 가 원본을 render-for-user 통과시켜 **stdout 으로 번역본 출력**.

**장점**:
- 디스크 상 파일 중복 없음 — 단일 source of truth (English)
- 번역 비용은 principal 이 명시적으로 요청할 때만 발생 (lazy)
- ReviewRecord / learning extraction 에 0 영향

**단점**:
- Principal 이 session 디렉토리를 직접 탐색 (`.onto/review/.../synthesis.md`) 할 때는 English 노출 — editor 에서 파일을 여는 일반적인 워크플로우와 충돌
- "즉시 번역 렌더" 를 위한 CLI 명령을 새로 정의해야 함
- 번역 결과를 cache 할지 여부 설계 필요

## 7. 권장 진입 경로 (트리거 도달 시)

트리거 충족을 전제로:

1. **Option B (Separate user-facing derivative) 가 기본 후보**. 기존 file structure 를 안 건드려 implementation blast radius 최소. Trigger 1 + 2 만 충족된 상태에서 가장 safe.
2. 운영 후 파일 2 배가 실제 문제가 되면 Option C (on-demand) 로 migration 고려
3. Option A (frontmatter split) 는 **가장 structurally invasive** — lens/synthesize contract, ReviewRecord, materializer, runtime 다수 파일을 동시 수정. Trigger 1 + 2 + 3 모두 충족 + 장기적 방향이 명확할 때만.

## 8. 선결 과제

본 split 이전에 완료되어야 하는 것들:

- `20260417-phase-2-translation-design-sketch.md` 의 옵션 확정 + 기본 구현 (Option A/B/C 중 선택)
- `authority/external-render-points.yaml` 에 "review/lens_user_summary" "review/synthesis_user_report" 같은 신규 registry entry 추가 (split 된 user-visible 영역이 새 render point 가 됨)
- CI lint gate 의 "translation directive" 금지 rule (scripts/lint-output-language-boundary.ts 의 R1) 이 유지되는 동안 split-side prompt 가 lint fail 하지 않는지 검증

## 9. Non-goal

본 스케치가 다루지 않는 것:

- **Reconstruct 의 Phase 3 user summary** 는 이미 Runtime Coordinator 가 wip.yml 로부터 별도 렌더 — split 이 이미 구조적으로 존재. 본 스케치는 review 경로만 다룸
- **halt 메시지, 완료 리포트, help, onboard** 는 이미 principal-only output — split 불필요
- **Agent 내부 chain-of-thought** — §1 원칙 상 English 고정 유지. 본 split 은 agent 의 "최종 output" 만 대상

## 10. 이 sketch 의 비확정성

본 문서는 **설계 결정이 아니다**. 트리거 도달 시 본 옵션들을 input 으로 받아 정식 설계 세션을 수행한다. 세션 산출물이 `processes/review/*-prompt-contract.md` + `processes/review/record-contract.md` 수정 PR 로 이어진다.

변동 가능 요소:
- 옵션 A/B/C 외의 hybrid 접근 (예: lens 는 B, synthesize 는 A)
- 번역 scope 축소 — "final review result" 만 번역 (lens body 는 그냥 English 유지) 이 실용적 타협일 가능성
- ReviewRecord 스키마 영향의 scope 재정의
