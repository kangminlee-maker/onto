---
as_of: 2026-04-17
status: investigation_in_progress
purpose: Phase 3-2/3-3 lens 단계 실 LLM 운용 검증에서 발견한 두 가지 회귀·충돌 기록
upstream_prs: [#67, #68]
follow_up: 20260417-9lens-benchmark-results.md (이전 정상 baseline)
---

# Phase 3-2 / 3-3 — lens 단계 실 LLM 운용 검증 시 발견

## 요약

Phase 3-2 (function-calling tool loop) 와 Phase 3-3 (synthesize 전용 prompt + .onto traversal gate) 머지 직후, LiteLLM 경유 Qwen3-30B-A3B 로 axiology lens 1개를 native 와 inline 두 모드로 실행했다. 양쪽 모두 정상 lens output 을 생성하지 못했다. 이는 두 개의 별도 문제가 동시에 노출된 것으로 보인다.

## 환경

- 모델: `mlx-community/Qwen3-30B-A3B-Instruct-2507-4bit`
- 경로: LiteLLM proxy `http://localhost:8080/v1`
- 패킷: `/tmp/onto-benchmark/packets/axiology.packet.md` (4월 17일 benchmark 와 동일 파일)
- 빌드: PR #68 머지 직후 (commit `474f4c1`)

## 관측

| mode | input_tokens | output_tokens | tool_iterations | tool_calls | output 결과 |
|---|---|---|---|---|---|
| native | 10,659 | 368 | 3 | 12 | `insufficient content within boundary` 1줄 |
| inline | 2,417 | 2,914 | — | — | Review Target 도메인 문서 본문을 그대로 echo (164 줄). lens 평가 구조(Findings/Newly Learned/...) 부재 |

## 원인 가설

### Finding 1 — packet boundary 와 native mode 의 구조적 충돌 (Phase 3-2)

axiology.packet.md 의 `## Boundary Policy` 섹션은 명시적으로 `Filesystem: denied`, `Network: denied` 를 선언한다. 그러나 Phase 3-2 의 `buildSystemPromptToolNative` 는 packet 의 boundary policy 를 파싱하지 않고, 항상 `read_file / list_directory / search_content` 도구를 노출한다.

- 모델이 12 회 tool 호출을 했다 → 모델은 system prompt 의 도구 가용성을 우선시했고 packet 의 정책을 따르지 않았다.
- 도구 호출 결과로도 lens output 형식을 만들지 못했다 → "tools 가 있으니 더 모아야 한다" 는 모델의 행동이 packet 의 self-contained 가정과 어긋났고, 결국 fallback 메시지 ("insufficient content within boundary") 만 출력.

이는 **policy precedence 결함** 이다. packet 의 Boundary Policy 가 system prompt 보다 우선해야 한다.

### Finding 2 — packet 설계 한계 + 모델 비결정성 (Phase 3-2/3-3 회귀 가설 **기각**)

**진단 결과**: PR #67 이전 commit (`901bcf1`) 과 현재 main 의 `buildSystemPrompt` / `buildLensSystemPromptInline` 함수 본문이 **byte-for-byte 동일**함을 diff 로 확인. PR #67 은 wrapper 분기만 추가했고 lens inline prompt 본문은 변경하지 않았다.

추가로 동일 commit (현재 main) 에서 같은 packet · 같은 모델로 3회 반복 실행한 결과:

| run | 결과 |
|---|---|
| pre-PR67 (901bcf1) 1회 | ✅ 정상 lens output (44 lines, 3/3 finding 탐지) |
| post-PR68 v1 | ⚠️ 도메인 문서 본문 echo (164 lines) |
| post-PR68 v2 | ⚠️ packet 자체 echo (134 lines) |
| post-PR68 v3 | ✅ 정상 lens output (### Structural Inspection / Findings / ...) |

**결론**: **PR #67/68 의 회귀가 아니라 packet 설계 + 30B-A3B 모델의 instruction-following 비결정성**. 같은 commit 에서 3회 중 1회만 정상 (실패율 66%). pre-PR67 의 1회 성공은 운좋은 sample 일 가능성이 높다.

**진짜 원인 가설**:
- packet 의 Review Target 본문이 ~100 줄로 길고 Required Output Sections 가 packet 끝에 있어, 작은/중간 모델이 instruction 을 잊고 입력을 echo 한다.
- 해법 후보: sandwich 패턴 (Required Output Sections 를 packet 시작과 끝 양쪽에 명시), 또는 packet 본문 압축, 또는 system prompt 의 "do not echo" 명시.

**Phase 3-2/3-3 코드와 무관 — 두 PR 은 안정적으로 머지 유지 가능**.

## 영향 범위

- **lens 단계 실 LLM 운용**: 현재 native mode 는 packet 정책과 충돌하므로 사실상 사용 불가.
- **synthesize 단계**: 별도 검증 필요. synthesize packet 은 lens output 재참조가 정당한 use case 이므로 native mode 가 가치가 있을 가능성이 높다 (이번 실측 범위 밖).
- **mock 환경**: ONTO_LLM_MOCK=1 경로는 영향 없음 — mock 은 deterministic output 을 만들기 때문.

## 다음 작업

순서:
1. **B (완료)**: synthesize benchmark packet 작성 후 synthesize 단계의 native vs inline 측정. ✅ 양쪽 모두 정상 동작 — 8 sections + YAML frontmatter + cross-lens patterns 식별. Phase 3-3 핵심 가설 검증 성공.
2. **C (다음)**: PR #67 이전 commit (`901bcf1`) 에서 axiology packet 동일 실행 → output 비교. Finding 2 의 회귀 여부 확정.
3. **A**: packet Boundary Policy parser 추가. `Filesystem: denied` 또는 `Filesystem: read-only inside packet` 같은 선언 시 native mode 를 inline 으로 강제 변환. Finding 1 해소.

## B 단계 실측 결과 (synthesize, 30B-A3B, 2026-04-17)

| metric | native | inline |
|---|---|---|
| input_tokens | 16,064 | 3,579 |
| output_tokens | 1,277 | 1,347 |
| 총 tokens | 17,341 | 4,926 |
| tool_calls / iterations | 3 / 2 | — |
| 라인 수 | 47 | 61 |
| deliberation_status | not_needed | **performed** |
| 8 required sections | ✅ | ✅ |
| Expected #1 (declaration without backing) | ✅ | ✅ |
| Expected #2 (W-series temporal indexing) | ✅ | (부분) |
| Expected #4 (promotion path conditional consensus) | ✅ | ✅ (+ verdict) |
| ⚠️ \`\`\`yaml 코드블록 wrap | yes | yes |

### 추가 발견

1. **Inline mode가 lens output inline embed 환경에서 4배 효율** — native의 tool_calls 는 redundant (packet 에 이미 있는 정보 재요청). 이 benchmark packet 은 양쪽 호환성을 위해 inline embed 했지만, 실 운용에서 synthesize packet 의 default 는 path-only — 그 환경에서는 native 가 유일 선택지.
2. **30B 가 코드블록 wrap 지시 위반** — system prompt 의 "Do not wrap the answer in code fences" 지시를 양쪽 모드 모두 따르지 않음. 더 강한 instruction 또는 post-process unwrap 가드 필요.
3. **Phase 3-3 deliberation actor role 작동 확인** — inline mode 가 deliberation_status: performed 로 설정하고 실제 verdict 도출 (Conditional Consensus 의 promotion path 사례). prompt 분기가 모델 행동에 정확히 반영됨.

### 따라오는 검증 거리 (별 PR 후보)

- **A1** (Finding 1 대응): packet Boundary Policy parser — `Filesystem: denied` 시 native mode 자동 inline 강제. Phase 3-2 의 정책 우선순위 결함 해소. **IMPLEMENTED (PR #70, 2026-04-17)**.
- **A2** (synthesize 코드블록 wrap): system prompt 의 "Do not wrap" 지시 강화 + executor 단의 leading/trailing fence 자동 strip. **IMPLEMENTED (2026-04-17)**. 방어선 이중화:
  - Prompt 강화: 두 synthesize variant (inline, tool-native) 상단에 "OUTPUT FORMAT — READ FIRST" 블록 신설. 첫 문자 "-" (YAML frontmatter delimiter) 강제, 외부 wrapping fence 금지, 내부 code block 허용 명시.
  - Post-processor: `stripWrappingCodeFence(text)` 가 trimmed text 의 양 끝 fence pair 를 정확히 1회 strip. 13 unit test 로 경계 동작 (partial fence, inner block, CRLF, 공백) 검증. Executor 가 lens/synthesize 양쪽 경로에서 output 을 쓰기 직전 호출.
  - End-to-end mock: `ONTO_LLM_MOCK_SYNTHESIZE_WRAP_FENCE=1` 환경변수로 mock 에 wrap 행동을 주입하는 negative-path hook. 실 LLM 없이 "wrap 들어와도 strip 이 잡아낸다" 불변식을 결정론적으로 검증.
  - 부수 정리: PR #67 이후 pre-existing 으로 빨간색이던 2 개 provider-override 테스트 (`--tool-mode` default 변경으로 model id 요구) 에 `--tool-mode inline` 추가로 복구.
- **A3** (path-only synthesize 측정): synthesize benchmark packet 의 inline embed 를 제거한 variant 작성 후 native vs inline 재측정. native 가 path-only 에서도 작동하는지 확인.

## 파일 위치

- 패킷: `/tmp/onto-benchmark/packets/{axiology,synthesize}.packet.md`
- 이번 실측 결과: `/tmp/onto-real-llm-test/{axiology,synthesize}-30b-{native,inline}.md`
- 이전 정상 baseline: `/tmp/onto-benchmark/results/30B-A3B/axiology.md`
- synthesize input lens outputs: `.onto/review/2026-04-17-bench-synthesize/round1/{axiology,dependency,structure}.md`
