---
as_of: 2026-04-16
status: active
functional_area: domain-upgrade-handoff
purpose: visual-design / finance / accounting / market-intelligence 4개 도메인 업그레이드 + W-B-49 palantir 판정. 세션 18 이후 진입용.
---

# Domain Upgrade Handoff (세션 18 → 19+)

## 첫 명령

```
development-records/plan/20260416-domain-upgrade-handoff.md 읽고 도메인 업그레이드 진행해줘
```

## 1. 진행 순서 (주체자 확정, 2026-04-16)

| 순서 | W-ID | 도메인 | 현재 크기 | 참조 대상 | Gap |
|---|---|---|---|---|---|
| 1 | W-B-48 | visual-design | 57K (8 files) | ui-design 224K (완료된 쌍) | 113K |
| 2 | W-B-47 | finance | 46K | business 137K, SE 195K | 124K |
| 3 | W-B-46 | accounting | 44K (accounting-kr 141K 별도) | business 137K | 126K |
| 4 | W-B-45 | market-intelligence | 42K | business 137K | 128K |
| 5 | W-B-49 | palantir-foundry (4차 판정만) | 152K | — | 판정 결정만 |

## 2. 각 도메인 업그레이드 패턴 (이전 세션 선례)

### 선례

- UI Design: 62.7K → 219K, 3회 리뷰, 3-Wave 실행 (2026-03-31)
- Palantir Foundry: 49K → 237K, 4차 (2026-03-31~04-01)
- Business: 59K → 137K, Wave 1/2/3 + Gate + sync (2026-03-31)

### 표준 흐름

1. **Gap 분석**: 현재 8개 파일 읽기 → 파일별 gap 목록 작성
2. **리서치**: 도메인 지식 수집 (WebSearch + 기존 자료 참조)
3. **Wave 실행**: 파일별 확장 (3 Wave — 기반 파일 → 심화 파일 → 정리 파일)
4. **교차 참조 무결성**: section-level reference + Rule Ownership 점검
5. **글로벌 동기화**: 프로젝트 → `~/.onto/domains/{domain}/` 복사
6. **seat 갱신**: onto-todo.md deferred → done

### dogfood 적용 (§14)

각 도메인 업그레이드에서:
- `onto review` 로 완성된 도메인 문서 자체 리뷰 (dogfood exercise)
- 마찰 발견 시 `onto govern submit --origin human --json '{"kind":"dogfood",...}'`
- 학습 자동 축적

## 3. 파일별 확장 우선순위 (visual-design 기준)

| 파일 | 현재 | 확장 배율 | 우선순위 |
|---|---|---|---|
| competency_qs.md | 4K | 10x | 최고 (현재 84 lines → 400+ lines 필요) |
| dependency_rules.md | 5K | 6x | 높음 |
| logic_rules.md | 8K | 4x | 높음 |
| extension_cases.md | 7K | 4x | 높음 |
| domain_scope.md | 7K | 3.7x | 중 |
| structure_spec.md | 6K | 3.5x | 중 |
| concepts.md | 10K | 2.3x | 낮음 (이미 상대적 양호) |
| conciseness_rules.md | 9K | 1.7x | 최저 |

## 4. visual-design 도메인 지식 범위

ui-design (224K, 완료된 쌍) 참조 시 visual-design 이 다루는 영역:
- Typography (typeface selection, font pairing, hierarchy, readability)
- Color theory (color systems, contrast, accessibility WCAG)
- Layout systems (grid, spacing, alignment, responsive)
- Visual hierarchy (size, weight, position, contrast)
- Iconography + illustration (icon systems, metaphor consistency)
- Design systems (component library, token-based design)
- Motion/animation (transition, micro-interaction)
- Brand identity (logo, visual language, consistency)

## 5. 세션 11~18 전체 성과 (본 대화)

| 지표 | 시작 | 종료 |
|---|---|---|
| 진행률 | 105/143 (73.4%) | 135/143 (94.4%) |
| done | 105 | 135 (+30) |
| active | 37 | **0** |
| 축 C | 0/8 | **8/8 (100%)** |
| 축 D | 4/5 | **5/5 (100%)** |
| PR merged | — | #48~#57 (10건) |

### 주요 성과

- W-C-01~08 축 C 전수 완결 (govern runtime, drift engine, lifecycle 재정의, knowledge→principle, consumption feedback, harness IA)
- W-D-05 lifecycle 통합 재정의 (principle entity, promoted 용어 3분리, 3 계층 authoring path)
- Dogfood protocol 성문화 + 첫 exercise (§1.0 기제 baseline 확립)
- learn 하위 구조 재배치 (health/promote → learn/)
- Table/YAML 36건 대규모 동기화
- Business domain 8건 실측 확인 done
- SE domain Stage 4 완결 (12건)

### 확립된 원칙

1. "bounded minimum surface 는 깨끗한 기반 위에서만 유효"
2. "authority vs principle 메타 층위 구분"
3. "drift 확인 프로토콜" (새 개념 도입 전 기존 유사 개념 전수 조사)
4. "dogfood 3단계 루프" (도구 적용 → 마찰 수집 → 과제 전환)

## 6. 참조 memory

- `project_execution_phase_progress.md` — 진행률 추적
- `project_business_domain_upgrade.md` — business 업그레이드 참조 패턴
- `project_ui_design_upgrade.md` — UI Design 업그레이드 참조 패턴
- `project_palantir_foundry_upgrade.md` — Palantir 업그레이드 참조 패턴
- `feedback_context_contamination.md` — 도메인 문서 작업 시 타 도메인 컨텍스트 오염 주의
