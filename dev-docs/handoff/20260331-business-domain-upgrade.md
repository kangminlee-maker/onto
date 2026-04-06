# Business Domain Upgrade — Session Handoff Document

> 작성일: 2026-03-31
> 목적: `/clear` 이후 다음 세션에서 business 도메인 업그레이드를 정확히 이어받기 위한 최신 상태 문서
> 현재 기준: **교차 참조 무결성 점검 완료 + 프로젝트/글로벌 동기화 완료**

---

## 1. 프로젝트 개요

### 목표
business 도메인 핵심 문서 8개를 기존 59K 수준에서, accounting-kr / software-engineering / palantir-foundry 수준의 밀도와 검증 가능성을 가진 구조로 업그레이드.

### 이번 세션에서 적용한 원칙
1. domain 문서(`domains/business/*.md`)는 **모두 영문**으로 작성
2. 리서치와 작성 분리 유지
3. Scale Tier는 방향 A로 확정: employee count 단일 축 + `Micro/Small/Mid/Large`
4. CQ는 추상 질문 목록이 아니라 `ID + Applicability + Inference path + Verification criteria` 형식으로 재작성
5. 내용 추가보다 교차 참조와 계약 정합성을 먼저 안정화한 뒤 마감한다

---

## 2. 현재 진행 상태

```
[완료] 기존 파일 분석 (59K, 8개 파일)
[완료] 갭 분석
[완료] 리서치 수집 — 1차: 사례·데이터 (191K, 4개 파일)
[완료] 리서치 수집 — 2차: 이론·산업 (514K, 6개 파일)
[완료] 업그레이드 계획 수립 + 리뷰 1차
[완료] 실행 계약 5개 설계 + 리뷰 2차
[완료] Scale Tier 설계 + 리뷰 3차
[완료] Scale Tier P0 수정 (방향 A 반영)
[완료] 실행 계약 즉시 조치 반영
[완료] Wave 1 실행 — 5개 기반 파일 작성
[완료] Wave 2 실행 — competency_qs + extension_cases 작성
[완료] Wave 3 실행 — conciseness_rules 작성
[완료] 교차 참조 무결성 점검 (엄밀 모드)
[완료] section-level reference / Rule Ownership / Related Documents 정리
[완료] execution-contracts.md 와 실제 문서 상태 동기화
[완료] 프로젝트 → 글로벌 (`~/.onto/domains/business/`) 단방향 복사
[완료] 프로젝트/글로벌 MD5 검증
[완료] focused commit 준비 검증
━━━━━━━━━━ ← 세션 종료 상태
```

### 현 상태 요약
- business 핵심 문서 8개 초안 업그레이드 완료
- 핵심 문서 총 크기: **136,594 bytes**
- `competency_qs.md` CQ 개수: **46**
- 핵심 문서 8개에 대해 한글 제거 확인 완료
- `git diff --check` 통과 완료
- explicit `§` section reference 재검증 완료
- `extension_cases.md`의 `Related CQs` / `Primary Owner File` 앵커 무결성 확인 완료
- tier-sensitive `Applicability`와 `domain_scope.md §Scale Tier Definitions` 정합성 확인 완료
- 글로벌 `~/.onto/domains/business/` 8개 core 문서와 프로젝트본 동기화 완료

---

## 3. 이번 세션 산출물

### 3.1 핵심 도메인 문서 (8개, 136,594 bytes)

경로: `/Users/kangmin/cowork/onto/domains/business/`

| 파일 | 크기(bytes) | 상태 | 핵심 반영 사항 |
|------|-------------|------|----------------|
| `domain_scope.md` | 20,921 | 완료 | scale tiers, applicability markers, bias 18개, inter-document contract, ownership sync |
| `concepts.md` | 17,983 | 완료 | canonical terms, benchmark registry, homonyms, interpretation principles |
| `logic_rules.md` | 14,511 | 완료 | platform/subscription/AI/transfer logic 포함한 규칙 레이어, section-level related refs |
| `structure_spec.md` | 9,419 | 완료 | digital business structure, authority separation, organization fit |
| `dependency_rules.md` | 9,662 | 완료 | platform dependency chains, AI/data dependency, source-of-truth dependencies |
| `competency_qs.md` | 36,157 | 완료 | 46 CQ, applicability, inference paths, PASS/FAIL/SKIP, related-doc sync |
| `extension_cases.md` | 18,342 | 완료 | 11 cases, related CQs, impact matrix template, related-doc sync |
| `conciseness_rules.md` | 9,599 | 완료 | business-specific redundancy rules + quantitative criteria, related-doc sync |

### 3.2 리서치 노트 (10개, 705K)

경로: `/Users/kangmin/cowork/onto/domains/business/`

이미 수집 완료. 이번 세션에서는 추가 리서치 없이 기존 노트를 사용해 본문 8개 파일을 작성함.

### 3.3 계약/설계 문서

| 문서 | 경로 | 이번 세션 반영 |
|------|------|----------------|
| Execution Contracts | `/Users/kangmin/cowork/onto/.onto/review/20260331-1101bc80/execution-contracts.md` | 즉시 조치, CQ-SC-03, scale/skip semantics, mapping 보강, Gate 2 extension-case wording sync |
| Scale Tier Review Target | `/Users/kangmin/cowork/onto/.onto/review/20260331-93dcf27e/review-target.md` | 방향 A 기준으로 재작성, 추가 수정 없이 유지 가능 상태 확인 |

### 3.4 글로벌 도메인 문서 동기화

- 대상 경로: `/Users/kangmin/.onto/domains/business/`
- 동기화 방식: 프로젝트 `domains/business/`의 8개 core `.md` 파일을 글로벌 established domain으로 단방향 복사
- 제외 범위: research notes 10개는 글로벌 verification standard에 포함하지 않음
- 검증 방식: 프로젝트본과 글로벌본의 MD5 비교로 동기화 확인

---

## 4. 무결성 점검 결과

이번 세션의 우선순위였던 교차 참조 무결성 점검은 완료되었다. 현재 business domain 문서 세트에는 **블로킹 레벨의 앵커/매핑 결함이 남아 있지 않다**.

1. **Section existence**
   - 핵심 문서 8개의 explicit `§Section Name` 참조가 실제 H2/H3 섹션으로 재검증됨
   - `Related Documents`의 section-level reference 정밀화 완료

2. **CQ inference path validity**
   - `competency_qs.md`의 46개 CQ inference path가 실제 섹션을 가리키는지 재검증 완료
   - reasoning step의 연결어(AND/trigger/compare/reconcile)는 현재 구조상 충분한 수준으로 판단

3. **Extension case anchor validity**
   - `extension_cases.md`의 `Related CQs`가 모두 실제 CQ ID에 매핑됨
   - Impact Matrix의 `Primary Owner File` section reference가 실제 존재하는 섹션을 가리키는지 확인 완료

4. **Inter-document contract consistency**
   - `domain_scope.md §Rule Ownership`에 누락되었던 automation scope ownership을 보강함
   - `execution-contracts.md` Gate 2의 extension-case wording을 현재 템플릿(`Related CQs`, `Primary Owner File`) 기준으로 동기화함

5. **Scale/applicability consistency**
   - tier-sensitive CQ의 `Applicability`가 `domain_scope.md §Scale Tier Definitions`와 충돌하지 않음
   - `SKIP-scale`, `SKIP-scale-unknown`, `N/A-pattern`, `SKIP-benchmark` 사용은 현재 의미론과 충돌하지 않음

6. **Benchmark reference integrity**
   - 숫자 SSOT는 `concepts.md §Benchmark Registry`로 유지됨
   - 중복 숫자 재정의는 발견되지 않았고, 외부 파일에서는 registry reference 방식으로 유지됨

### 4.2 후속 상태

필수 후속 작업은 더 이상 남아 있지 않다. 이후 세션에서 business domain 작업을 재개한다면, 출발점은 **새 요구사항**이어야 하며 동일 범위의 전수 무결성 점검을 다시 최우선으로 둘 필요는 없다.

---

## 5. 이후 세션 시작 절차

추가 business-domain 작업이 다시 필요해지면 아래 순서로 시작하면 된다.

1. **이 문서와 계약 문서만 먼저 읽기**
   - `cat /Users/kangmin/cowork/onto/dev-docs/handoff/20260331-business-domain-upgrade.md`
   - `cat /Users/kangmin/cowork/onto/.onto/review/20260331-1101bc80/execution-contracts.md`
   - `cat /Users/kangmin/cowork/onto/.onto/review/20260331-93dcf27e/review-target.md`

2. **새 요구사항이 기존 계약을 깨는지 먼저 판단**
   - scale axis
   - benchmark SSOT
   - CQ 46개 구조
   - English-only domain docs

3. **필요할 때만 부분 점검 실행**
   - `rg -n "§" /Users/kangmin/cowork/onto/domains/business/{domain_scope,concepts,logic_rules,structure_spec,dependency_rules,competency_qs,extension_cases,conciseness_rules}.md`
   - `git diff --check -- /Users/kangmin/cowork/onto/domains/business/*.md`
   - `rg -n "[가-힣]" /Users/kangmin/cowork/onto/domains/business/{domain_scope,concepts,logic_rules,structure_spec,dependency_rules,competency_qs,extension_cases,conciseness_rules}.md`

4. **무결성 재전수 점검은 조건부로만 재실행**
   - CQ 구조 자체를 다시 바꾸는 경우
   - section 이름을 바꾸는 경우
   - extension case template를 바꾸는 경우
   - benchmark authority placement를 바꾸는 경우

---

## 6. 포커스된 마감 범위

### 수정된 핵심 문서
- `domains/business/domain_scope.md`
- `domains/business/concepts.md`
- `domains/business/logic_rules.md`
- `domains/business/structure_spec.md`
- `domains/business/dependency_rules.md`
- `domains/business/competency_qs.md`
- `domains/business/extension_cases.md`
- `domains/business/conciseness_rules.md`

### 수정된 설계/계약 문서
- `.onto/review/20260331-1101bc80/execution-contracts.md`
- `dev-docs/handoff/20260331-business-domain-upgrade.md`

### 참조 상태 확인만 한 설계 문서
- `.onto/review/20260331-93dcf27e/review-target.md`

### 참고
- research notes 10개는 이번 focused close-out의 커밋 대상에서 제외해도 됨
- ui-design 등 unrelated worktree 변경과 섞지 않는 것이 안전함
- business domain 후속 작업도 기본적으로 위 파일 집합 안에서 닫는 것이 안전함
- 글로벌 verification standard는 `~/.onto/domains/business/` 기준으로도 현재 프로젝트본과 동기화된 상태임

---

## 7. 핵심 설계 결정 이력 (최신본)

| 일시 | 결정 | 근거 |
|------|------|------|
| 2026-03-31 | 리서치-작성 분리 유지 | PF 교훈 재사용 |
| 2026-03-31 | Scale Tier 방향 A 확정 | employee count 단일 축 + lifecycle 분리 |
| 2026-03-31 | domain 문서는 모두 영문으로 작성 | 사용자 지시 |
| 2026-03-31 | benchmark 수치 SSOT는 `concepts.md §Benchmark Registry` | 계약 정합성 |
| 2026-03-31 | CQ는 46개 구조로 확장 | 기존 36개 정규화 + modern / transfer coverage 보강 |
| 2026-03-31 | commit 전 교차 참조 무결성 점검을 우선 수행 | 현재 리스크가 내용 부족보다 정합성 쪽에 더 큼 |
| 2026-03-31 | cross-reference integrity audit 완료 후 section-level sync로 마감 | Rule Ownership / Related Documents / extension-case anchor 리스크 해소 |

---

## 8. 이후 세션에서 하지 말아야 할 것

- 바로 새 내용을 덧쓰기부터 하지 말 것
- 계약을 깨는 변경이면 먼저 교차 참조와 mapping 정합성 영향을 계산할 것
- domain 문서에 한글을 다시 넣지 말 것
- benchmark 숫자를 `concepts.md §Benchmark Registry` 밖에서 재정의하지 말 것
- CQ 개수를 늘리기 전에, 현재 46개 CQ 구조를 실제로 깨는 요구인지 먼저 검증할 것
