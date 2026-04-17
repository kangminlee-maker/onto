---
as_of: 2026-04-17
status: complete
purpose: Phase 3-4 (A1~A5) 전체 정리 — 방어선 도식, 설계 경로, 미해결 backlog, 다음 Phase 진입 조건
upstream_records:
  - 20260417-9lens-benchmark-design.md
  - 20260417-9lens-benchmark-results.md
  - 20260417-phase-3-2-3-3-lens-runtime-findings.md
---

# Phase 3-4 wrap-up — synthesize·lens 운용 방어선 완결 (2026-04-17)

## 왜 Phase 3-4 가 필요했나

Phase 3-1~3-3 (PR #66/67/68) 머지 직후 실 LLM (Qwen3-30B-A3B via LiteLLM) 운용 검증에서 두 가지 병리가 노출됐다.

1. **Packet boundary 와 native mode 의 정책 우선순위 역전** — axiology lens packet 이 `Filesystem: denied` 를 선언했는데도 executor 의 tool-native mode 가 `read_file` 을 LLM 에 노출. 모델은 12 회 tool 호출 후 `insufficient content within boundary` 로 fallback, 정상 lens output 생성 실패.
2. **Synthesize 출력 포맷 위반** — system prompt 의 "Do not wrap in code fences" 지시를 30B-A3B 가 무시하고 응답 전체를 ` ```yaml ` 으로 감쌈.

A1 은 (1) 을, A2 는 (2) 를 해소하기 위한 단일 PR 로 시작됐다. A3 측정 단계에서 추가 병리 — path-only synthesize packet 에서 **inline mode 가 존재하지 않는 인용문을 fabricate** 하고 Degraded Lens Failures 에 `(none)` 으로 오보 — 를 발견하면서 A4 (사전 차단) 와 A5 (사후 감지) 가 파생됐다.

## A1~A5 작업 경로

각 단계는 측정 기반으로 다음 단계를 **정당화** 했다. 측정 없이 설계를 진행했다면 A4/A5 는 "일어날지도 모르는 문제" 를 방어하는 과잉 설계가 됐을 것이다.

| 단계 | PR | commit | 담당 | 머지일 |
|---|---|---|---|---|
| A1 | #70 | `061442c` | packet Boundary Policy parser (`Filesystem: denied` → native 차단) | 2026-04-17 |
| A2 | #71 | `94c190b` | synthesize output fence strip + prompt "OUTPUT FORMAT — READ FIRST" 강화 | 2026-04-17 |
| A3 | #73 | `6e2f424` | path-only packet variant 측정 → fabrication 발견 기록 | 2026-04-17 |
| A4 | #74 | `4f0f013` | packet `Tools: required` → inline 사전 차단 (A1 대칭) | 2026-04-17 |
| A5 | #75 | `2cc2eba` | synthesize citation audit (fabrication 사후 감지, warning-only) | 2026-04-17 |

## 완성된 방어선 도식

```
packet (authoritative contract)
      │
      ▼  (1) 사전 정합성 체크
┌──────────────────────────────────────────┐
│ A1: Filesystem: denied → native 거부      │
│ A4: Tools: required  → inline 거부        │
│  conflict: denied + required → packet 거부│
└──────────────────────────────────────────┘
      │                 (fail-fast: LLM 호출 전)
      ▼
   executor → LLM
      │
      ▼  (2) 출력 정규화
┌──────────────────────────────────────────┐
│ A2: stripWrappingCodeFence                │
│     (deterministic fence 1회 제거)        │
└──────────────────────────────────────────┘
      │
      ▼  (3) 사후 감지 (warning-only)
┌──────────────────────────────────────────┐
│ A5: citation_audit                        │
│     unmatched quote → STDERR WARNING      │
│     차단하지 않음, JSON signal 노출       │
└──────────────────────────────────────────┘
      │
      ▼
  output file + JSON result
```

### 층 간 책임 분리

- **A1+A4 (사전 계약)**: packet 선언을 executor 가 강제 계약으로 해석. 실행 이전에 조합 모순을 차단.
- **A2 (정규화)**: LLM 의 확률적 포맷 위반을 deterministic post-process 로 흡수. prompt 강화는 확률을 낮추고, strip 은 잔류를 제거.
- **A5 (감지)**: A1+A4 로 차단 못 한 희귀 fabrication 을 사후에 로깅. warning-only 정책으로 false positive 운영 비용 관리.

## 실 LLM 운용 결과 (30B-A3B, path-only packet + `Tools: required`)

A4 이후 권장 실행 (`--tool-mode=auto`):

| 지표 | 값 |
|---|---|
| tool_mode (실행) | native (auto → 승격) |
| input_tokens | 17,989 |
| output_tokens | 1,186 ~ 1,299 |
| tool_calls | 4 (3 개 lens 파일 + 1 관련 참조) |
| packet_policy_promotion | true |
| citation_audit.quotes_checked | 4 |
| citation_audit.quotes_unmatched | 3 (모두 cross-lens 메타 라벨, 실제 fabrication 아님) |
| 8 required sections | ✓ |

Inline 호출은 A4 에 의해 LLM 호출 전 fail-fast:

```
--tool-mode=inline conflicts with packet's Boundary Policy (Tools: required).
... Running inline mode would force the LLM to answer without the cited sources,
which has been shown to produce fabricated citations. ...
```

## 테스트 카버리지

각 PR 이 새로 도입한 단위·통합 테스트:

| PR | 신규 테스트 | 대상 |
|---|---|---|
| #70 (A1) | 기존 executor test 내부 확장 | `parsePacketBoundaryPolicy` + executor A1 block |
| #71 (A2) | `strip-wrapping-code-fence.test.ts` 13 + executor E2E 2 + pre-existing 2 fix | fence strip + prompt 강화 |
| #74 (A4) | `packet-boundary-policy.test.ts` 16 + executor E2E 4 | parser 확장 + A4 precedence |
| #75 (A5) | `citation-audit.test.ts` 15 + `participating-lens-paths.test.ts` 9 + executor E2E 5 | audit 로직 + 파서 + wiring |

누적 신규 테스트: **66 건** (A1 미포함). 0 회귀. baseline 의 3 개 pre-existing failure (`e2e-codex-multi-agent-fixes`, `e2e-start-review-session`, `review-invoke-auto-resolution E7`) 는 A1~A5 scope 밖 이라 유지.

## 미해결 Backlog (별 PR 후보)

### 우선순위 낮음 — 운영 개선

- **Audit 정확도 개선**: A5 의 substring 매칭은 paraphrased quote 에 false positive. Attribution 패턴 (`lens_id: "quote"`) 을 직접 인용으로 식별해 엄격 audit 하고 meta 라벨은 warning 제외하는 방향.
- **`min_quote_length` CLI 노출**: 현재 hardcoded 20. 운영자가 case-by-case tuning 가능하도록 executor flag.
- **Native output `- ---` prefix 정정**: A2/A4 실측에서 30B-A3B 가 첫 줄을 `- ---` (bullet + frontmatter) 로 뽑는 minor 포맷 quirk 잔존. A2 fence strip 은 이를 잡지 않음 (fence 아님). YAML frontmatter normalizer 가 필요하지만 impact 낮음.

### 예상 밖 — 차후 재평가

- **Path-only packet 이 실제 사용되는가?**: A3/A4/A5 는 `/tmp/onto-benchmark/packets/synthesize.path-only.packet.md` 한 파일에서만 검증. 프로덕션 synthesize packet (`coordinator-helpers.ts` 가 생성) 이 `- Tools: required` 를 자동 포함하는지, 아니면 prompt 템플릿을 업데이트해야 하는지 확인 필요.
- **codex provider 와의 상호작용**: A4 는 `Tools: required + codex` 를 fail-fast 하지만, codex CLI 경로는 자체 tool ecosystem 을 가짐. codex 가 사실상 tools 를 제공하는 경우 A4 가 과차단 (over-blocking) 일 가능성.

## 다음 Phase 진입 조건

Phase 3-4 가 종료되면서 다음 작업 후보는 다음과 같다:

1. **Build 8th Review Backlog 재평가** — 메모리 `project_build_8th_review_backlog.md` STALE. `processes/reconstruct.md` (W-A-77 이후) 대조 필요.
2. **Principal Stage 3 Backlog** — 9 건 pending, 대부분 production-phase deferred. 활성 항목 1~2 건 우선.
3. **Phase 4 설계** — onto 상위 목표 §1 의 5 활동 (review/evolve/reconstruct/learn/govern) 중 review 를 제외한 영역의 실행 체계. 별도 설계 세션 필요.

## 파일 참조

- 측정 원본: `development-records/benchmark/20260417-phase-3-2-3-3-lens-runtime-findings.md` (A1~A5 IMPLEMENTED 기록 + 실 LLM 운용 특성)
- 9-lens benchmark baseline: `development-records/benchmark/20260417-9lens-benchmark-results.md`
- path-only packet: `/tmp/onto-benchmark/packets/synthesize.path-only.packet.md` (ephemeral — 로컬 환경)
- 30B 실측 결과: `/tmp/onto-real-llm-test/synthesize-30b-pathonly-{a4-auto,a5-auto}.md` (ephemeral)
- disk lens staging: `.onto/review/2026-04-17-bench-synthesize/round1/{axiology,dependency,structure}.md` (gitignored, A3 단계에서 정정)
