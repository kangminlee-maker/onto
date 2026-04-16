---
as_of: 2026-04-17
status: completed
purpose: 9-lens subagent LLM benchmark 실측 결과
models: [Qwen3-4B, Qwen3-30B-A3B, Qwen3.5-27B-Opus-Distilled, GPT-5.4-high]
---

# 9-Lens Benchmark Results (2026-04-17)

## 실행 환경

- Mac (Apple Silicon), LiteLLM proxy on :8080/:8081
- ts_inline_http executor (Phase 2), inline content mode
- Codex CLI v0.120.0 (ChatGPT OAuth)

## 모델 조합

| ID | 모델 | 실행 경로 | 비용 |
|---|---|---|---|
| 4B | Qwen3-4B-Instruct-2507-4bit | LiteLLM :8081 | $0 (local) |
| 30B-A3B | Qwen3-30B-A3B-Instruct-2507-4bit | LiteLLM :8080 | $0 (local) |
| 27B-Opus | Qwen3.5-27B-Claude-4.6-Opus-Distilled-MLX-4bit | LiteLLM :8081 | $0 (local) |
| GPT-5.4 | GPT-5.4 high effort | Codex CLI | ChatGPT 구독 |

## Expected Findings Detection Rate (3건/lens 기준)

| Lens | 4B | 30B-A3B | 27B-Opus | GPT-5.4 | 난이도 |
|---|---|---|---|---|---|
| dependency | **3/3** | **3/3** | **3/3** | **3/3** | 쉬움 |
| evolution | **3/3** | **3/3** | **3/3** | **3/3** | 쉬움 |
| semantics | **3/3** | **3/3** | **3/3** | 2/3 | 보통 |
| structure | 2/3 | 2/3 | 2/3 | 2/3 | 보통 |
| pragmatics | 2/3 | 2/3 | 1/3 | 2/3 | 어려움 |
| axiology | 2/3 | 2/3 | 1/3 | 2/3 | 어려움 |
| conciseness | 1/3 | 1/3 | 2/3 | 2/3 | 어려움 |
| coverage | 1/3 | 1/3 | 1/3 | 0/3 | 매우 어려움 |
| logic | 1/3 | 1/3 | 1/3 | 1/3 | 매우 어려움 |
| **합계** | **18/27** | **18/27** | **17/27** | **17/27** | — |

## Output Depth (lines)

| Lens | 4B | 30B-A3B | 27B-Opus | GPT-5.4 |
|---|---|---|---|---|
| logic | 46 | 56 | **105** | 67 |
| structure | 54 | **135** | 71 | 63 |
| dependency | 63 | 100 | **148** | 52 |
| semantics | 54 | 50 | **102** | 42 |
| pragmatics | 51 | 61 | 49 | 47 |
| evolution | 45 | 44 | 87 | 65 |
| coverage | 59 | 77 | 95 | 54 |
| conciseness | 55 | 77 | **263** | 32 |
| axiology | 51 | **180** | 119 | 44 |

## 핵심 발견

1. **탐지율은 모델 크기에 비례하지 않음**: 4B(18/27)와 GPT-5.4(17/27)가 거의 동일
2. **dependency와 evolution은 100% 탐지**: 모든 모델이 구조적·패턴 기반 검증에 강함. 벤치마크 난이도 상향 대상
3. **coverage와 logic이 가장 어려운 lens**: "선언-실체화 gap"과 "암묵적 계약 추론"에 모든 모델이 약함
4. **27B-Opus 역설**: 가장 상세한 output이지만 pragmatics/axiology에서 낮은 탐지율 — reasoning overhead가 specific finding보다 general analysis에 소모
5. **4B가 비용 효율 최적**: $0에 GPT-5.4 동등 탐지율. subagent로 4B, synthesize에 강한 모델 조합 전략 유효

## 파일 위치

- 패킷: `/tmp/onto-benchmark/packets/{lens}.packet.md`
- 결과: `/tmp/onto-benchmark/results/{model}/{lens}.md`
- 실행기: `development-records/benchmark/run-9lens-benchmark.sh`
- 설계: `development-records/benchmark/20260417-9lens-benchmark-design.md`

## 후속 작업

- [ ] coverage/logic lens 난이도 보정 (현재 grep 기반 탐지율 → 수동 질적 평가 필요)
- [ ] dependency/evolution 난이도 상향 (현재 100%로 변별력 없음)
- [ ] synthesize 단계 벤치마크 추가 (lens output → synthesize → 최종 리뷰 품질)
- [ ] 9-lens 동시 실행 벤치마크 (개별 lens가 아닌 full review session 측정)
