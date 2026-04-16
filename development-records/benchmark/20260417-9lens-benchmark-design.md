---
as_of: 2026-04-17
status: active
purpose: 9-lens subagent LLM benchmark — dogfood-quality difficulty
---

# 9-Lens Subagent LLM Benchmark Design

## 목적

onto의 9-lens review에서 각 lens dimension별로 subagent LLM의 탐지 능력을 측정합니다.
Phase 2에서 도입된 `ts_inline_http` executor를 통해 다양한 LLM 조합을 비교합니다.

## 설계 원칙

1. **Dogfood 난이도**: 타겟은 onto 자체 코드와 문서 — 실제 리뷰에서 마주치는 수준의 이슈
2. **각 lens 독립 측정**: 한 lens가 잘하면 다른 lens도 잘하리란 보장 없음 — 모델별 강점/약점 프로파일링
3. **정량 측정 가능**: 각 패킷에 expected findings 포함 — 탐지율 (recall)과 정밀도 (precision) 산출
4. **재현 가능**: 동일 패킷 + 동일 모델 → 동일 환경에서 재현 가능

## 벤치마크 타겟 요약

| Lens | 타겟 소스 | 난이도 축 | Expected Findings |
|---|---|---|---|
| logic | `reconstruct.ts:160-215` | 암묵적 상태 계약 + 경쟁 조건 | 3건 |
| structure | `processes/reconstruct.md:1-100` | 누락된 관계 + 미매핑 개념 | 3건 |
| dependency | `authority/core-lexicon.yaml:1-150` | 권한 순환 + 역방향 승격 | 3건 |
| semantics | reconstruct.md/commands/ts 교차 비교 | 동의어/동음이의어 drift | 3건 |
| pragmatics | `domains/finance/competency_qs.md:40-80` | 도달 불가 inference path | 3건 |
| evolution | `artifact-types.ts:1-60` | enum 취약성 + config cascade | 3건 |
| coverage | `domains/market-intelligence/domain_scope.md:49-100` | 선언-미실체화 gap | 3건 |
| conciseness | `reconstruct.ts:130-148` | 분산 보일러플레이트 | 3건 |
| axiology | `onto-direction.md:1-70` | 목적 drift | 3건 |

## 모델 조합

| ID | 모델 | 경로 | 비용 |
|---|---|---|---|
| 4B | Qwen3-4B-Instruct-2507-4bit | LiteLLM :8081 | $0 (local) |
| 30B-A3B | Qwen3-30B-A3B-Instruct-2507-4bit | LiteLLM :8080 | $0 (local) |
| 27B-Opus | Qwen3.5-27B-Claude-4.6-Opus-Distilled-MLX-4bit | LiteLLM :8081 | $0 (local) |
| Codex-GPT5.4 | GPT 5.4 via codex CLI | codex exec | ChatGPT 구독 |

## 측정 지표

- **Recall**: expected findings 중 탐지된 비율 (N / 3 per lens)
- **Precision**: 보고된 findings 중 실제 유효한 비율
- **Depth**: output 길이 (lines) — 분석 깊이 proxy
- **Latency**: 실행 시간 (초)

## 패킷 위치

`/tmp/onto-benchmark/packets/{lens-id}.packet.md`

## 실행

```bash
bash development-records/benchmark/run-9lens-benchmark.sh
```

## 결과 위치

`/tmp/onto-benchmark/results/{model-id}/{lens-id}.md`
