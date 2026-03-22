# Market Intelligence Domain — 논리 규칙

## 1. 목적

시장 정보 분석 체계 내에서 데이터 신뢰도, 정책 정합성, 추론 유효성을 보장하기 위한 논리 규칙을 정의한다.

## 2. source_tier 허용 집합 정합성 규칙

> **핵심 규칙 — 3지점 일치**
> `onto_logic` 학습: source_tier(데이터 소스 신뢰도 등급)의 허용 집합이
> 수집(Collection), 정책(Policy), 프롬프트(Prompt) 3곳에서 반드시 일치해야 한다.

### 2.1 허용 집합 정의
