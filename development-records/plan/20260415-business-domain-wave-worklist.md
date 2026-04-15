---
as_of: 2026-04-15
status: deferred_by_principal_2026-04-15
functional_area: business-domain-wave
purpose: business_domain_wave 8 W-ID 미실행 보관. 주체자 결정으로 세션 9 에서 제외, 다음 세션 이후 진행. 본 파일이 진입 시 reference.
---

# business_domain_wave 작업 리스트 (세션 9 보관)

## 보관 경위

세션 9 (2026-04-15) 에서 잔여 supporting + deferred 일괄 해소 시 주체자 지시:
> "business_domain_wave 는 작업리스트에 저장만 해줘. 나중에 진행할께."

본 cluster 는 현 시점 **미실행** 상태를 유지하되, 진입 시점에 본 파일을 참조해 맥락을 즉시 복원할 수 있도록 정리.

## 8 W-ID 구성

### 선행 결정 3건 (Principal 판단 대기)

| W-ID | 제목 | verification_consumer | 쟁점 |
|---|---|---|---|
| **W-B-41** | Business Scale Tier P0 수정 (방향 A — employee count 단일 축, Micro/Small/Mid/Large) | principal | Scale Tier framework 4 Tier 정의 확정 |
| **W-B-42** | Business 실행 계약 즉시 조치 8건 반영 | reviewer | W-B-41 선행 필요 |
| **W-B-43** | Business PO 판단 4건 (FI/RC 통합 + T3/T4 분리 + AB Min CQ + CQ Applicability 범위) | principal | 4 PO 결정 |

### Wave 실행 5건

| W-ID | Phase | depends_on |
|---|---|---|
| W-A-06 | Business domain Wave 1 (5 파일 병렬) | BL-101, W-B-41, W-B-42, W-B-43 |
| W-A-07 | Business domain Wave 2 | W-A-06 |
| W-A-08 | Business domain Wave 3 | W-A-07 |
| W-A-09 | Gate 1 + Gate 2 review checkpoint | W-A-08 |
| W-A-10 | 교차 참조 + 글로벌 동기화 + commit | W-A-09, W-B-26 |

## 관련 memory

- `project_business_domain_upgrade.md` — IN PROGRESS: 리서치 705K, 실행계약 5개, Scale Tier 방향 A. HANDOFF.md 참조

## 진입 시 첫 명령 (복원용)

```
development-records/plan/20260415-business-domain-wave-worklist.md 읽고
business_domain_wave 진입. 주체자 결정 3건 (W-B-41/42/43 선행) 부터.
```

## 예상 진행률 영향

- 현재 (세션 9 종료 시점): 99/141 (70.2%)
- business_domain_wave 완결 시 추가 +8 → 107/141 (75.9%)

## 주의

- 본 cluster 의 onto-todo.md seat 는 `lifecycle_status: active` 로 유지 — 진입 시 바로 집행 가능
- 진입 시점에 `domains/business/` 현 상태 실측 선행 필요 (M-06 seat drift 패턴 반복 가능성)
