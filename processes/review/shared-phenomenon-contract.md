# Shared Phenomenon Contract

> 상태: Active
> 목적: 여러 lens가 같은 위치를 대상으로 각자의 claim을 내는 상황(overlap-permitted lens claims)을 다루기 위한 co-location rule과 claim 관계 분류를 정의한다.
> 이 문서는 overlap/co-location 규칙의 **유일한 normative seat**이다. 다른 contract 파일은 이 문서를 참조만 한다.

---

## 1. Position

9개 review lens는 각자 독립된 perspective에서 검토 대상을 분석한다.
동일한 현상(phenomenon)에 대해 여러 lens가 각자의 lens-qualified claim을 제기하는 것은
허용된 정상 상태이다 (overlap-permitted lens claims).

이 계약은 그 overlap을 다루는 규칙의 단독 정의 문서이다.

---

## 2. Terminology

이 계약에서 사용하는 핵심 용어:

- **Phenomenon** (현상): 검토 대상에서 관찰 가능한 하나의 사건·상태. lens 독립적 단위.
- **Evidence locus**: 현상을 관찰할 수 있는 대상 내부의 특정 위치. lens 독립적 단위. output schema에서는 `evidence_anchor` 필드로 직렬화된다.
- **Lens-qualified claim**: `{target, evidence_anchor, claim, lens_id}` 4필드로 이루어진 주장 단위.
- **Shared phenomenon**: 둘 이상의 lens-qualified claim이 같은 target + 같은 evidence locus를 대상으로 하는 location-based grouping relation. 의미적 phenomenon identity가 아니라 observation co-location이다. 같은 위치에서 서로 다른 의미의 claim이 관찰될 수 있으며, 이들은 claim relation 분류(§4)로 구분된다.
- **Claim relation**: 같은 shared phenomenon에 속한 두 claim 사이의 관계. co-location 성립 후 claim 내용을 비교하여 분류한다.

---

## 3. Co-location Rule

두 lens-qualified claim이 같은 shared phenomenon에 속하는지 co-location으로 판정하는 규칙.

**판정 기준**: `target`과 `evidence_anchor`가 동일하면 같은 shared phenomenon으로 co-location된다.

- claim 내용(방향·심각도·결론)은 co-location 판정에 **포함되지 않는다**
- 즉 shared phenomenon은 "같은 곳을 같은 대상으로 보고 있다"만 의미한다
- co-location은 의미적 동일성을 함의하지 않는다. 같은 위치의 두 claim이 본질적으로 다른 현상일 수 있으며, 그 구분은 §4 claim relation이 담당한다.
- `evidence_anchor`의 동일성은 정규화된 위치 표기로 판정한다 (예: `§6.1`과 `section 6.1`은 동일)

---

## 4. Claim Relation Classification

같은 shared phenomenon에 속한 claim 쌍에 대해, claim 내용을 비교하여 관계를 분류한다.
co-located claim들은 의미적으로 `corroboration`, `disagreement`, `partial overlap`, `dedup` 중 하나의 관계를 가진다. 이 분류가 곧 의미적 phenomenon 해석이다.

| Claim relation | 조건 | synthesize 처리 |
|---|---|---|
| **corroboration** | claim 방향이 같고 severity가 양립 가능 | 합의(consensus)로 집계 |
| **disagreement** | claim 방향 또는 severity가 충돌 | 명시적 disagreement 항목으로 보존 |
| **partial overlap** | claim이 부분적으로만 겹침 (한 claim이 다른 claim의 부분집합이거나 일부 측면만 공유) | 각 claim을 개별 보존 + shared phenomenon pointer로 연결 |
| **dedup** | 동일 lens가 동일 phenomenon에 대해 중복 보고 | 1건으로 축약 |

4분류는 상호배타적이다. 판정 우선순위:
1. 동일 lens인가? → `dedup`
2. claim 방향이 충돌하는가? → `disagreement`
3. claim이 부분적으로만 겹치는가? → `partial overlap`
4. 그 외 → `corroboration`

**경계 원칙**: claim relation이 불확실하면 **별도 claim으로 분리 보존**이 기본값이다. 암묵적 병합을 금지한다.

**3개 이상 claim의 경우**: N개 claim이 같은 shared phenomenon에 속하면, 모든 pairwise 조합을 분류하는 것이 아니라, per-claim basis로 가장 대표적인 relation을 하나 지정한다. synthesize는 participating lenses 전체를 phenomenon 단위로 묶되, 개별 claim의 severity/direction은 보존한다.

---

## 5. 4-Field Output Requirement

모든 lens-qualified claim은 아래 4필드를 필수로 포함해야 한다.

| 필드 | 설명 | producer | consumer |
|---|---|---|---|
| `target` | 검토 대상의 식별자 | lens output (round1/*.md) | synthesize, ReviewRecord |
| `evidence_anchor` | evidence locus의 직렬화 형식 (파일경로:라인, §번호 등) | lens output | synthesize, ReviewRecord |
| `claim` | what + severity + direction | lens output | synthesize, ReviewRecord |
| `lens_id` | claim을 제기한 lens | lens output (자동 부여) | synthesize, ReviewRecord |

- `lens-prompt-contract.md` §Output Schema가 이 4필드를 lens output 필수 필드로 요구한다
- `synthesize-prompt-contract.md` §Input Expectations가 이 4필드를 수신 필수로 요구한다
- 이 문서는 4필드의 의미와 co-location 판정만 정의한다. 직렬화 형식은 `lens-prompt-contract.md`가 소유한다

---

## 6. Authority

- 이 문서(`shared-phenomenon-contract.md`)가 co-location rule, claim relation 분류, overlap 정책의 **유일한 normative seat**이다
- `lens-prompt-contract.md`는 4필드 직렬화 형식을 소유하되, co-location 규칙은 이 문서를 참조만 한다
- `synthesize-prompt-contract.md`는 claim relation 분류를 출력에 표출하되, 분류 규칙은 이 문서를 참조만 한다
- 동일 규칙이 다른 문서에 normative로 존재하면 authority violation이다
