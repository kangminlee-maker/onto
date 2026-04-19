---
as_of: 2026-04-19
status: canonical
status_note: "2026-04-20 PR C (prose migration + rank 2-5 sync) 에서 lexicon-sync 완결 후 승격 (v0.15.0/v0.16.0 merged + product-locality-principle rename 완료). UF-axiology-upstream-status-drift 해소."
framework_version: v1.0
functional_area: knowledge-framework
purpose: |
  onto 의 지식 항목을 빠짐없이·중복없이 분류·저장·전이하기 위한 framework 정본.
  scope (적용 범위) · 성숙도 · 강제력 세 축 좌표계 + Tier 1/2/3 + 전이 규칙을
  단일 seat 에 고정. 이 문서가 lexicon 갱신과 5 활동 v1 구현의 공통 기반.
related_authorities:
  - "authority/core-lexicon.yaml (갱신 대상 — §8)"
  - "design-principles/product-locality-principle.md (§9 rename 완료 — 2026-04-20 PR C)"
  - "design-principles/productization-charter.md (어휘 경계 한 줄 추가 — §9)"
  - "processes/learn/promote.md (scope value + 저장 경로 갱신)"
  - "processes/learn/health.md (동일)"
  - "processes/govern.md (§11 zone matrix 확장)"
source_refs:
  onto_direction: "development-records/evolve/20260413-onto-direction.md (정본 — 본 framework 의 상위 전제)"
  productization_charter: "design-principles/productization-charter.md (productization 어휘 정의)"
  claude_code_skill_example: "/excel-workbook-editing (medium Tier 2 의 전형 example)"
review_record: "development-records/evolve/reviews/20260419-knowledge-framework-full-review.md (9-lens full review 결과 반영, IA-1~IA-7 + REC-1~REC-8)"
precedes:
  - "lexicon 정합 작업 (본 문서 §8 list)"
  - "product-locality-principle 리네임 (§9)"
  - "Phase 4 Stage 2 (govern↔learn) 설계 복귀 (§11)"
---

# onto 지식 framework — 4 scope × 3 tier 좌표계

## §0 Position

### §0.1 본 문서의 authority 위상

본 문서는 `development-records/evolve/` 의 정본 (canonical) 설계 문서이며, CLAUDE.md authority 위계에 직접 등재되지는 않지만 다음 rank 파일들의 **갱신 input** 으로 작동한다.

| rank | 파일 | 본 문서의 영향 |
|---|---|---|
| 1 | `authority/core-lexicon.yaml` | §8 entity 신설·refine·enum 갱신 |
| 2 | `design-principles/project-locality-principle.md` | rename → `product-locality-principle.md`. 본문 "project" 치환 |
| 3 | `design-principles/productization-charter.md` | §1 "product" 어휘 경계 한 줄 추가 (productization trajectory vs product instance) |
| 5 | `processes/learn/promote.md`, `health.md` | scope enum 갱신, 저장 경로 갱신 |
| 5 | `processes/govern.md` | §11 zone matrix 확장 (Tier 3 강제 영역 명시) |

각 rank 파일의 갱신 PR 이 본 문서를 **근거로 인용** 한다.

**Activation timing 계약** (R2-IA-7, axiology F5 대응): 본 문서의 `status` 는 세 단계 전이:
1. `canonical (pending-lexicon-sync)` (현재) — 문서 자체는 canonical reference 로 승인. 단 rank 1 lexicon 반영 아직 안 됨
2. rank 1 (lexicon) 반영 PR merge 시점 — `status: canonical` 로 승격
3. rank 2-5 전수 반영 완료 시점 — status 변경 없이 §13 lifecycle 의 superseded 조건 충족 여부 재평가

각 단계 전이는 frontmatter `status` 직접 수정 + commit 으로 기록.

### §0.2 선행 전제

본 framework 는 다음 두 정본 문서의 결정을 **전제** 로 한다.

| 선행 문서 | 상속 개념 |
|---|---|
| `development-records/evolve/20260413-onto-direction.md` §1 | product·ontology·domain 정의, 5 활동, 상위 가치 (시간·비용 최소화), 자기적용 (onto = product) |
| `design-principles/productization-charter.md` | onto 자체의 productization trajectory. 본 framework 의 "product instance" 어휘와 구별됨 |

### §0.3 본 문서가 해결하는 구조적 문제

본 세션 (2026-04-19) 의 개념 논의에서 식별된 8 가지 모호·누락을 단일 framework 로 해소한다.

| 문제 | 해결 방식 | 해당 §|
|---|---|---|
| `project` 와 `product` 어휘 혼재, 양자 lexicon 미등재 | `project` retire, `product` 로 통합 | §2.1, §9 |
| `artifact` 어휘의 영어 사전 의미 불일치 | `medium` 으로 rename | §2.2 |
| "domain" 단어의 4 역할 평탄화 (식별자·문서·tag·scope) | `domain` entity 신규 등재 + grain 명확화 | §2.3, §8 |
| Experience / Learning 경계 부재 (둘 다 "learning" 로 혼칭) | Tier 1 내부 maturity 축 분리 | §3.1, §6.1 |
| promoted vs unpromoted 저장 의미 분화 부재 | 4×3 matrix 전 cell 전수 정의 | §4 |
| multi-medium product 의 m:n 관계 미명시 | `implemented_with.yaml` manifest + composition rule | §7 |
| Tier 간 강제력 차이 불분명 | Tier 1/2/3 normative force 명시 | §3 |
| 전이 용어 과다 중복 ("promote" 이 4 역할) | 3 verb 분리 + compound verb 명시 | §6 |

---

## §1 단일 원칙

> **모든 onto 지식 항목은 세 직교 축 (scope · 성숙도 · 강제력) 의 좌표로 식별된다.**

**scope 용어의 동음이의어 해소** (REC-5): 본 framework 의 `scope` 는 기존 `authority/core-lexicon.yaml` 의 `scope` entity (Storage ownership boundary, 저장 경계) 를 **확장·재정의** 하여 "적용 범위" 축으로 재설계한다. 저장 경계는 §5 의 "저장 위치" 로 좌표에서 **도출되는 결과** 이며, 본 축의 primary 의미가 아니다.

**Consumer invariant preservation lemma** (R2-IA-1, axiology F3 대응): 기존 `scope=project/user/domain` 의 모든 소비 경로는 새 좌표계에서 **동일 경로로 도출** 된다. 매핑:

| 기존 소비 경로 | 새 좌표계 도출 | 동일성 보장 근거 |
|---|---|---|
| `scope=project` 저장·소비 | product scope cell (§4.2 cell 8) | `{project}/.onto/` = `{product}/.onto/` (operational 1:1) |
| `scope=user` (promoted learning 소비) | methodology scope cell (§4.2 cell 11 Learn) | `~/.onto/learnings/` 경로 그대로 |
| `scope=domain` 소비 | domain scope cell (§4.2 cell 10 Learn) | `~/.onto/domains/{X}/learnings/` 신설은 기존 tag-based 소비의 structured 승급 |

기존 consumer (code · contract · memory · reference) 의 behavior invariant 는 lexicon 갱신 PR 에서 case-by-case 검증. productization-charter §4.1 single-chain pledge 유지.

| 축 | 값 | 답하는 질문 |
|---|---|---|
| **scope** (적용 범위) | product / medium / domain / methodology | "어디까지 적용되나" |
| **성숙도** (Tier 1 한정) | Experience / Learning | "검증되었나" |
| **강제력** (tier) | Tier 1 (cost-saver) / Tier 2 (reference) / Tier 3 (obligation) | "어떻게 준수되나" |

세 축 모두 **직교**. 한 축이 다른 축을 함의하지 않는다.

### §1.1 좌표로부터의 결정적 도출

| 도출 대상 | 규칙 |
|---|---|
| **저장 위치** | 좌표 → 파일시스템 경로 (§4.2 primary SSOT, §5 디렉토리 트리 projection) |
| **전이** | 좌표 간 이동 (§6). 모든 가능한 전이는 사전 정의됨 |
| **소비 filter** | 세션의 현재 좌표 set 과 매칭되는 항목만 consult pool 진입 (§7.6) |

좌표가 모든 항목을 빠짐없이·중복없이 분류하는 한, 개념적 모호 영역은 0.

### §1.2 YAGNI bypass 원칙

상위 scope (methodology) 와 일부 전이는 실제 instance 가 드물거나 없을 수 있다. 본 framework 는 다음 원칙으로 대응한다.

1. **정의는 지금, 구현은 발생 시**: 모든 좌표·전이·lifecycle 을 lexicon 에 사전 정의
2. **instance 발생 전엔 active 경로 구현 안 함**: 자동 생성 경로 없이 manual 등재만 허용
3. **첫 instance 발생 시 즉시 active 전환**: 좌표가 이미 정의되어 있어 재해석 비용 0

이 원칙으로 framework 는 전 cell 전수 정의하지만, 실제 v1 구현 대상은 §4.2 의 active cell 만 해당 (§8.3).

---

## §2 scope axis — 4 값

### §2.1 `product`

| 질문 | 답 |
|---|---|
| **무엇인가** | Principal 이 시간·비용을 투입해 만들어 **현재 작동하고 있는 실체**. 코드·스프레드시트·문서·도메인 자료 등 **형식 무관** (onto-direction §1 인용) |
| **왜 scope 인가** | 각 product 는 고유한 설계 의도·제약·관행이 있음. 한 product 에 한정된 cost-saver (그 codebase 의 quirk, 그 workbook 의 structure) 가 별도 축적 단위로 필요. 다른 product 에 전이 안 됨 |
| **다른 scope 와의 관계** | medium·domain 과 m:n 또는 직교 (§2.5). methodology 보다 좁음 |

**1:1 with 작업 세션 (project retirement)**: 현 `{project}/.onto/` 는 operationally "한 product 를 작업하는 디렉토리". `project` 어휘는 lexicon entity 로 등재된 적 없음 (scope enum value + prose 사용만 존재) → retire. `product` 단일 어휘로 통합.

**examples**:
- 이 onto repo (code + markdown 등 medium 조합)
- 특정 회계 시스템 Excel workbook (excel medium)
- 특정 팀의 배포 프로세스 문서

### §2.2 `medium`

| 질문 | 답 |
|---|---|
| **무엇인가** | product 가 구현되는 **수단 (means of implementation)**. 코드 (TypeScript, Python, ...), 스프레드시트 (Excel, Google Sheets, ...), 문서 (Markdown, Notion, ...) 등 |
| **왜 scope 인가** | 한 medium 을 다룰 때의 패턴·관용·함정이 product·domain 모두 가로지름. Excel 의 formula 관용은 어떤 product·domain 이든 공통. medium 별 별도 축적 필요 |
| **다른 scope 와의 관계** | product 와 m:n (한 product 는 여러 medium 사용, 한 medium 은 여러 product 에 사용). domain 과 직교 (code-SE, code-accounting, spreadsheet-SE 모두 가능) |

**용어 선택 근거**: 영어 "medium" 이 전달·표현 수단 의미로 arts/communications 영역 정착. `artifact` 는 사전적 "만들어진 것 (instance)" 의미로 정반대여서 부적합.

**Claude Code skill 의 isomorphism**: `/excel-workbook-editing` skill 의 범위 명세 가 medium Tier 2 의 정확한 example. domain·product binding 0, 순수 medium 관용.

**granularity — fine-grained**: `excel ≠ google_sheets`, `typescript ≠ python`. medium 간 작업 cost 가 다르면 별도 scope 로 취급. 공통 패턴은 후속 generalize 로 broader medium 으로 묶기 가능.

**examples**:
- `excel`, `google_sheets`, `airtable`
- `typescript`, `python`, `rust`, `go`
- `markdown`, `notion`, `obsidian`

**잠정 제외 (§1.2 YAGNI bypass 적용, IA-7 반영)**:
- `organizational_process`, `slack_workflow` — product 자체인가 medium 인가 경계 불명. cross-product 반복 관찰 후 §12.1 확장 절차로 정식 등재.

### §2.3 `domain`

| 질문 | 답 |
|---|---|
| **무엇인가** | product 가 속한 **분야 (field of knowledge)**. 같은 domain 의 product 들은 일관된 패턴 (구조적 규약, 관행, 설계 관습) 을 공유 (onto-direction §1 인용) |
| **왜 scope 인가** | 한 분야의 norm·expected practice 가 product·medium 모두 가로지름. SE 분야의 설계 관습은 어떤 language·framework·tool 이든 공통. domain 별 축적은 reconstruct 의 "왜" 추정 근거 (onto-direction §1) |
| **다른 scope 와의 관계** | product 와 belongs_to (한 product 는 한 domain 귀속). medium 과 직교 |

**entity 신규 등재 (§8)**: 현 lexicon 에 `domain` entity 없음. 디렉토리 규약 `~/.onto/domains/{X}/` 과 tag value `[domain/X]`, scope enum value `domain` 이 모두 동일 개념을 가리키지만 본체 entity 가 미등재 상태. 본 framework 에서 정식 entity 등재 → 4 역할 모두 단일 reference 로 통합.

**examples**: `software-engineering`, `llm-native-development`, `accounting-kr`, `business`, `palantir-foundry`, `ui-design`, `visual-design`, `finance`, `market-intelligence`, `ontology`.

### §2.4 `methodology`

| 질문 | 답 |
|---|---|
| **무엇인가** | scope 무관 **cross-everything** — product·medium·domain 어떤 조합에도 적용 가능한 지식 |
| **왜 scope 인가** | 일부 cost-saver 는 진정으로 universal. 특정 분야·수단·instance 와 결합 없이 value 발휘. 이 cross-scope 항목을 별도 저장 단위로 고립 |
| **다른 scope 와의 관계** | 가장 상위. product·medium·domain 로부터 `generalize` (§6.2) 의 도달지 |

**instance 희소성**: 진정한 methodology 는 드물다. 대부분 지식은 최소 한 scope 에 binding. 본 framework 에서 methodology 좌표는 대부분 **definition only** 로 유지 (§4).

**methodology × Tier 2 (미정의 cell) 상태** (CR-4 / coverage C-8 대응): methodology × Tier 2 cell 은 **reserved, 관찰 대상** (구조적 불가능 아님). 의미는 "scope 무관 reference doc" — 현재 instance 0 이며 정의 필요성도 관찰되지 않아 entity 와 저장 경로 모두 미등재. 실제 발생 시 §10.3 deferred 트리거로 평가 후 등재 검토.

### §2.5 scope 간 관계 — specificity ladder + 직교

**specificity (좁음 → 넓음)**:
```
product  <  { medium ,  domain }  <  methodology
```

| 관계 | 의미 |
|---|---|
| product 가 가장 좁음 | 한 specific instance |
| medium 과 domain 은 동급 | 둘 다 category, 서로 직교 |
| methodology 가 가장 넓음 | cross-everything |

**m:n cardinality**:

| 관계 | cardinality | 예시 |
|---|---|---|
| product ↔ medium | m:n | onto product = typescript + markdown 등 mediums; typescript medium 은 onto + 다른 TS product N 개에 사용 |
| product → domain | n:1 | 한 product 는 한 domain 에 귀속 (예: onto → software-engineering) |
| medium ↔ domain | 직교 | code-SE, code-accounting, spreadsheet-SE, spreadsheet-accounting 모두 가능 |

specificity ladder 가 §6.2 `generalize` 의 방향성 + §7.5 conflict 해소의 우선순위를 정한다.

---

## §3 tier axis — 3 값

### §3.1 Tier 1 — 실용 cost-saver

| 질문 | 답 |
|---|---|
| **무엇인가** | "이렇게 하면 빠르다 / 싸다" 는 **경험지식**. 시간·비용 최소화에 기여하는 optional 항목 |
| **왜 존재** | onto 상위 가치 (시간·비용 최소화, onto-direction §1) 의 직접 수단. 이 layer 없으면 매 활동마다 같은 실패·탐색 비용 반복 |
| **강제력 — 적용 (application)** | **soft**. cost-saver 적용 여부는 옵션. 미적용 시 비용 증가 외 결과 없음 |
| **강제력 — 소비 경계 (consumption)** | **hard**. `product-locality-principle.md` §2.2 강제 — **promoted Learning 만** consult pool 진입. seed/candidate/provisional 단계 Experience·Learning 은 consumption 대상 아님 (creation·promotion 의 입력으로만 사용) |
| **entity** | `experience` (unvalidated raw), `learning` (promoted, 검증됨) |

**maturity 축 분화**: Tier 1 내부는 Experience (raw) → Learning (검증됨) 두 단계. 전이 verb 는 `promote` (§6.1).

### §3.2 Tier 2 — 서술적 reference

| 질문 | 답 |
|---|---|
| **무엇인가** | 특정 scope 의 **norm·patterns·conventions 를 서술하는 참조 문서**. "이 분야·수단·instance 는 보통 이렇다" 는 descriptive 지식 |
| **왜 존재** | Tier 1 개별 항목으로 분해 불가능한 체계적 지식이 존재 (예: 한 product 의 전체 ontology, 한 medium 의 패턴 집합). 이 체계적 지식의 저장 layer |
| **강제력** | **soft guardrail**. review lens 가 consult 대상으로 사용. 위반 시 review finding 으로 표면화, 자동 차단 없음 |
| **위반 시 결과** | review lens 가 finding 생성 → Principal 이 수용·반박 판단 |
| **entity (scope 별 다름)** | product → `ontology`, medium → `medium_reference`, domain → `domain_document` (8 유형) |

### §3.3 Tier 3 — 의무 obligation

| 질문 | 답 |
|---|---|
| **무엇인가** | **반드시 지켜야 하는 규범** (Principle) |
| **왜 존재** | 일부 규범은 위반 시 product·framework 정합성이 깨지므로 자동 차단 필요. govern 활동의 enforcement 대상 |
| **강제력** | **hard obligation**. govern 이 자동 차단 (pre-commit / CI / merge gate — W-C-02 v1 이후) |
| **위반 시 결과** | govern 차단. 위반 상태로 commit·merge 불가 |
| **entity** | `principle` |

**declared-only Tier 3 vs enforceable Tier 3 구별** (CR-3 / coverage C-3 대응): 현 v1 기준 Tier 3 cell 의 enforcement 상태는 두 그룹:
- **enforceable Tier 3**: cell (1) product Principle — 일반 product 의 `{product}/.onto/principles/` 및 onto repo self-hosted root 배치. govern 강제 경로 active (Stage 2 설계 후 fully operational)
- **declared-only Tier 3**: cell (2) medium / (3) domain / (4) methodology Principle — `cell_state = definition_only`. 규범 선언은 가능하나 enforcement 경로는 v1 미구현. Principal manual 등재 허용, 자동 차단 없음

두 그룹의 차이는 Phase 4 Stage 2 (§11.3 3 질문) 결정 후 재평가. 현 v1 에서는 Tier 3 "hard obligation" 선언이 cell (1) 에 한해 enforceable, 나머지는 향후 reservation.

### §3.4 세 tier 의 식별 기준 — 정리표

| 축 | Tier 1 (실용) | Tier 2 (reference) | Tier 3 (의무) |
|---|---|---|---|
| **답하는 질문** | "이렇게 하면 빠르다" | "이 scope 는 보통 이렇다" | "반드시 이렇게 해야 한다" |
| **위반의 결과** | 없음 (적용) / 미소비 (consumption 경계 위반) | review finding 표면화 | govern 차단 |
| **작성 주체** | 활동 자동 추출 (Experience) → panel+Principal (Learning) | Principal 직접 또는 Tier 1 → Tier 2 norm_update | Principal canonicalize 만 |
| **저장 이름** | `experiences/`, `learnings/` | `ontology/`, medium reference docs, `domain_document` 8 유형 | `principles/` |

---

## §4 4×3 matrix — 전 cell 전수 정의

### §4.1 matrix 개요 + count

**Matrix grid**: 4 scope × 3 tier = **12 nominal grid position**. 이 중 methodology × Tier 2 (methodology reference) 는 instance·entity 모두 없음 → **11 정의된 cell**. Tier 1 cell 4 개는 Exp/Learn 두 maturity 로 분화되어 **15 저장 단위**.

| count | 의미 |
|---|---|
| **12** | grid position (4 scope × 3 tier) |
| **11** | 정의된 cell (methodology Tier 2 미정의 제외) |
| **15** | 저장 단위 (Tier 1 cell 의 Exp/Learn 분화 반영) |

**§4.2 가 cell-level primary SSOT** (REC-6). §4.1 matrix 개요, §5.1/§5.2 저장 layout, §11.1 zone matrix 는 모두 §4.2 의 projection. 정의·상태의 canonical 값은 §4.2 참조.

**Matrix 축 요약**:

| | **product** | **medium** | **domain** | **methodology** |
|---|---|---|---|---|
| **Tier 3** (의무) | (1) | (2) | (3) | (4) |
| **Tier 2** (reference) | (5) | (6) | (7) | (미정의) |
| **Tier 1** (실용) | (8) | (9) | (10) | (11) |

### §4.2 cell 별 정의·저장·상태 (primary SSOT)

3 독립 축 분리 표기 (REC-6):
- `cell_state` = cell 에 instance 쌓기 가능한가 (active / definition_only)
- `transition_automation` = 이 cell 로 진입하는 주 전이가 자동인가 (automated / manual / n_a)
- `learn_autowrite` = learn 활동이 자동으로 파일 write 가능한가 (yes / no)

**`definition_only` 의미 disambiguation** (R2-IA-3, logic F1/F2 대응): `cell_state = definition_only` 는 **자동 경로 부재** 를 의미하되 **Principal manual 등재는 허용** 된다. manual 등재 시 해당 cell 의 primary verb (standalone `generalize` 또는 manual `canonicalize`) 로 기록. "instance 자체 금지" 가 아님.

**`n_a` 의미** (R-4 대응, S-5 준): `transition_automation = n_a` 는 "이 cell 로 진입하는 자동 전이가 framework 상 정의되지 않음". manual 등재 경로는 cell_state 와 독립적으로 §6 의 해당 verb 에 의해 제공.

| cell | 좌표 | 정의 | 저장 위치 | cell_state | transition_automation | learn_autowrite |
|---|---|---|---|---|---|---|
| (1) | T3, product | 한 product 내 hard obligation | `{product}/.onto/principles/` (onto 는 repo root, §10 deferred) | active | manual (canonicalize) | no |
| (2) | T3, medium | 한 medium 사용 시 hard obligation | `~/.onto/mediums/{X}/principles/` | definition_only | n_a | no |
| (3) | T3, domain | 한 domain 의 hard obligation | `~/.onto/domains/{X}/principles/` | definition_only | n_a | no |
| (4) | T3, methodology | cross-everything hard obligation | `~/.onto/principles/` | definition_only | n_a | no |
| (5) | T2, product | 한 product 의 설계도 (ontology) | `{product}/.onto/ontology/` | active | manual (ontology_update definition_only) | no |
| (6) | T2, medium | 한 medium 의 reference doc (6 유형 또는 자유) | `~/.onto/mediums/{X}/` | active | manual (medium_norm_update definition_only) | no |
| (7) | T2, domain | 한 domain 의 8 norm doc | `~/.onto/domains/{X}/` | active | automated (norm_update — promote.md Step 7 권고) | yes |
| (8) Exp | T1 Exp, product | 한 product 활동의 raw 관찰, 검증 전 | `{product}/.onto/experiences/{agent}.md` | active | automated (활동 자동 추출) | yes |
| (8) Learn | T1 Learn, product | 한 product 내 검증된 cost-saver | `{product}/.onto/learnings/{agent}.md` | active | automated (promote) | yes |
| (9) Exp | T1 Exp, medium | 한 medium 다중 product 에서 반복 관찰된 raw | `~/.onto/mediums/{X}/experiences/{agent}.md` | definition_only | n_a (compound verb 가 중간 skip) | no |
| (9) Learn | T1 Learn, medium | 한 medium 의 cross-product 검증 cost-saver | `~/.onto/mediums/{X}/learnings/{agent}.md` | **active** | automated (promote_and_generalize) | yes |
| (10) Exp | T1 Exp, domain | 한 domain 다중 product 에서 반복 관찰된 raw | `~/.onto/domains/{X}/experiences/{agent}.md` | definition_only | n_a (compound verb 가 중간 skip) | no |
| (10) Learn | T1 Learn, domain | 한 domain 의 cross-product 검증 cost-saver | `~/.onto/domains/{X}/learnings/{agent}.md` | **active** | automated (promote_and_generalize) | yes |
| (11) Exp | T1 Exp, methodology | cross-everything raw 관찰 | `~/.onto/experiences/{agent}.md` | definition_only | n_a | no |
| (11) Learn | T1 Learn, methodology | cross-everything 검증 cost-saver | `~/.onto/learnings/{agent}.md` | definition_only | manual only (standalone generalize) | no |

### §4.3 [삭제됨]

§4.3 의 activation 요약은 §4.2 에 흡수 (REC-6 + DIS-1 resolution). cell 상태의 canonical 은 §4.2. framework 자체의 확장·버전 관리 layer 는 §12 신설로 분리.

---

## §5 저장 layout — §4.2 projection

**본 절은 §4.2 의 저장 위치를 디렉토리 트리로 재표현하는 projection**. 정의·상태의 canonical 값은 §4.2 참조.

### §5.1 product-local (`{product}/.onto/`)

```
{product}/.onto/
  ├── ontology/                         ← cell (5) T2 product 설계도
  ├── implemented_with.yaml             ← §7.2 medium 목록 manifest
  ├── experiences/{agent}.md            ← cell (8) Exp
  ├── learnings/{agent}.md              ← cell (8) Learn
  ├── principles/                       ← cell (1) T3 product Principle
  ├── domains/{X}/ (override)           ← product-locality §2.3 domain override
  ├── review/, sessions/, govern/, ...  ← 기존 runtime data
```

**예외 — onto repo 자체 (§10 deferred)**:
```
{onto repo}/
  ├── authority/                        ← cell (1) T3 product Principle, legacy root 배치
  ├── design-principles/                ← cell (1) T3 product Principle, legacy root 배치
  ├── processes/                        ← cell (1) T3 product Principle, legacy root 배치
  ├── commands/, roles/, src/, ...      ← product 본체
  └── .onto/                            ← 나머지 cell (5)~(8) 은 여기에 정상 배치
```

### §5.2 user-scope (cross-product 자산)

```
~/.onto/
  ├── mediums/{name}/
  │   ├── concepts.md, patterns.md,     ← cell (6) T2 medium reference (6 유형)
  │   │   conventions.md, pitfalls.md,
  │   │   tooling.md, validation.md
  │   ├── principles/                   ← cell (2) T3 medium Principle (definition only)
  │   ├── experiences/{agent}.md        ← cell (9) Exp (definition only)
  │   └── learnings/{agent}.md          ← cell (9) Learn (active)
  ├── domains/{X}/
  │   ├── concepts.md, logic_rules.md,  ← cell (7) T2 domain document (8 유형)
  │   │   dependency_rules.md,
  │   │   structure_spec.md, competency_qs.md,
  │   │   extension_cases.md, conciseness_rules.md, domain_scope.md
  │   ├── principles/                   ← cell (3) T3 domain Principle (definition only)
  │   ├── experiences/{agent}.md        ← cell (10) Exp (definition only)
  │   └── learnings/{agent}.md          ← cell (10) Learn (active)
  ├── principles/                       ← cell (4) T3 methodology Principle (definition only)
  ├── experiences/{agent}.md            ← cell (11) Exp (definition only)
  └── learnings/{agent}.md              ← cell (11) Learn (의미 좁힘 — methodology 한정)
```

**`~/.onto/products/{name}/` 제거**: product 는 always local (`{product}/.onto/`). 글로벌 mirror 불필요. cross-machine 동기화는 product repo 의 git 으로 자연 해결.

### §5.3 migration 1회성 작업

| 순위 | 작업 | 처리 방식 |
|---|---|---|
| 1 | **현 `{project}/.onto/learnings/` entry triage (REC-8)** | 조건 분기: (a) `lifecycle_status: seed` 또는 frontmatter 없음 → `{product}/.onto/experiences/` 로 자동 rename 이동. (b) `lifecycle_status: promoted` 표시 또는 `(-> promoted to global, {date})` 표시 → Principal 승인 후 직접 `{product}/.onto/learnings/` (새 product Learning cell) 등재. 이미 global 로 올라갔으면 project cell 제거. Principal 승인 미실시 시 (b) 보류. |
| 2 | 현 user learnings 분할 | `~/.onto/learnings/*.md` 를 entry tag 기반 split. `[methodology]` → `~/.onto/learnings/` 잔류. `[domain/X]` → `~/.onto/domains/{X}/learnings/`. `[medium/{X}]` → `~/.onto/mediums/{X}/learnings/` (REC-3 신설 행). `[methodology] + [domain/X]` 양쪽 → `~/.onto/domains/{X}/learnings/` 잔류 + `scopes.methodology: true` frontmatter 추가. untagged legacy entry → `~/.onto/learnings/` 잠정 잔류 + Principal 일괄 triage |
| 3 | medium 디렉토리 신설 | `~/.onto/mediums/{name}/` 각각 생성 (initial population 은 활동 중 자연 누적) |
| 4 | tag deprecate | 각 entry 의 `[methodology]`, `[domain/X]`, `[medium/X]` inline tag. 신규 entry 부터 scope frontmatter 사용 (§7.4). 기존 entry tag 는 legacy archive |

---

## §6 전이 (transitions) — 전수 정의

모든 지식 이동은 좌표 간 이동. 세 축 각각에 해당하는 verb 가 정의됨 + 하나의 compound verb.

### §6.1 `promote` — 성숙도 축 이동 (Tier 1 내부)

**정의**: Experience → Learning. 같은 scope 내에서 maturity 상승. 검증 이벤트.

**검증 기준**: "이 raw 관찰이 시간·비용 최소화에 기여하는 cost-saver 인가?" — panel 3-agent 검증 + Principal verdict.

**scope 별 구현 상태**:

| 전이 | 구현 상태 |
|---|---|
| product Exp → product Learn | **active** (v1, `processes/learn/promote.md` 갱신) |
| medium Exp → medium Learn (standalone) | **definition only** (compound 가 주 경로, standalone 은 manual 등재 시에만) |
| domain Exp → domain Learn (standalone) | **definition only** (동일) |
| methodology Exp → methodology Learn | **definition only** |

### §6.2 `generalize` — scope 축 이동 (standalone)

**정의**: Tier 1 Learning at scope_A → Tier 1 Learning at scope_B. specificity ladder 위로 이동. **이미 Learning 인 항목** 의 scope 확장 (Exp → 다른 scope Learn 은 §6.4 compound 경로).

**검증 기준**: "이 cost-saver 가 scope_A 외부에서도 작동하는가?" — panel 재검증 또는 multi-product 누적 후 Principal 판단.

**가능한 이동 경로** (specificity ladder 기준):

| 출발 → 도착 | 의미 |
|---|---|
| product → medium | 한 product 의 Learning 이 그 product 의 medium 에 일반화 |
| product → domain | 한 product 의 Learning 이 그 product 의 domain 에 일반화 |
| product → methodology | 한 product 의 Learning 이 completely universal |
| medium → methodology | medium 결합 없이 universal |
| domain → methodology | domain 결합 없이 universal |

**모든 standalone generalize 전이**: **definition only** (v1 자동 경로 없음, manual 등재만)

### §6.3 `canonicalize` — tier 축 이동 (Tier 1·2 → Tier 3)

**정의**: Tier 1 Learning at scope_X → Tier 3 Principle at same scope_X. 또는 Tier 2 reference → Tier 3 Principle. 의무 격상 이벤트.

**검증 기준**: "이 cost-saver 가 위반 시 차단해야 할 의무인가?" — Principal 직접 판단.

**scope 보존**: canonicalize 는 scope 를 바꾸지 않음. product Learning → product Principle. domain Learning → domain Principle. 등.

**snapshot copy semantics (REC-7)**:
- canonicalize 는 **snapshot copy** — 시점의 Tier 1 Learning content 를 Principle 로 복사.
- Principle rationale 에 `source_commit_sha` + `source_learning_ref` metadata 기록.
- 후속 source Learning 변경·retire 는 Principle 에 **영향 없음**.
- 의미 있는 재반영 필요 시 **신 canonicalize 세션** 으로 신 Principle 생성 또는 기존 Principle retire + replace.

**모든 canonicalize 전이**: **definition only** (W-C-03 현재 기록만 active. 자동 파일 반영은 v1+)

### §6.4 `promote_and_generalize` — compound verb (성숙도 + scope 동시 이동)

**정의**: product Experience → 다른 scope 의 Learning. 중간 단계 (medium Exp, domain Exp 등) 를 **skip** 하고 panel verdict 한 번으로 target scope 의 Learn 직접 생성.

**검증 기준**: panel + Principal 이 판정 시점에 두 질문 동시 해결:
1. "이 관찰이 cost-saver 로 검증되는가?" (promote 측면)
2. "이 cost-saver 의 적용 범위는 어느 scope 인가?" (generalize 측면)

panel verdict schema 확장:
```yaml
verdict:
  transition: promote_and_generalize
  target_scope: medium | domain    # methodology 는 v1 불허 (아래)
  target_scope_value: {medium_name or domain_name}
  rationale: ...
```

**target scope 허용 범위** (v1, IA-1 B + IA-2 결합):

| target_scope | activation | 근거 |
|---|---|---|
| product (same scope) | `promote` (compound 아님) | scope 확장 없음 |
| medium | **active** | cell (9) Learn active, compound 경로로 직접 write |
| domain | **active** | cell (10) Learn active, compound 경로로 직접 write |
| methodology | **definition only** | cell (11) Learn definition only. v1 에서 compound 로 도달 불가. Principal manual 등재만 가능 (standalone generalize 경로) |

### §6.5 기타 전이 (Tier 2·3 갱신 · 재분류 · 폐기)

| 전이 | verb | 의미 | 구현 상태 |
|---|---|---|---|
| Tier 1 domain Learning → Tier 2 domain document 갱신 | `norm_update` | Learning 의 일부를 domain reference doc 에 반영 | **active** (현 `processes/learn/promote.md` Step 7 권고) |
| Tier 1 medium Learning → Tier 2 medium reference 갱신 | `medium_norm_update` | 동일 패턴 medium 버전 | **definition only** |
| Tier 1 product Learning → Tier 2 ontology 갱신 | `ontology_update` | Learning 중 ontology 에 반영되어야 할 구조 지식 | **definition only** |
| medium ↔ domain primary scope 재분류 | `re_classification` | 항목의 primary scope 변경 (§7.3 intersection convention 과 연관) | **definition only** |
| Tier 3 Principle 폐기 | `retire` | lifecycle 종료 | **definition only** (M-08 refresh-protocol 부분 구현) |

### §6.6 전이 요약표 (SSOT)

본 요약표가 전이 activation 의 **canonical SSOT** (IA-2 decision). 다른 seat (§4.2, §11.1) 와 불일치 시 본 표가 참값.

| # | verb | 축 | 활성 상태 | 비고 |
|---|---|---|---|---|
| 1 | `promote` (product) | 성숙도 | **active** v1 | product Exp → product Learn 자동 |
| 2 | `promote` (medium/domain/methodology standalone) | 성숙도 | **definition only** | manual 등재만. compound 가 주 경로 |
| 3 | `generalize` (standalone) | scope | **definition only** | 이미 Learning 인 항목의 scope 확장. manual only |
| 4 | `promote_and_generalize` (target=medium) | compound | **active** v1 | product Exp → medium Learn, panel verdict 한 번으로 |
| 5 | `promote_and_generalize` (target=domain) | compound | **active** v1 | product Exp → domain Learn |
| 6 | `canonicalize` | tier | **definition only** | Tier 1·2 → Tier 3. snapshot copy |
| 7 | `norm_update` (domain) | Tier 1 → Tier 2 | **active** | promote.md Step 7 권고 |
| 8 | `medium_norm_update` | Tier 1 → Tier 2 | **definition only** | — |
| 9 | `ontology_update` | Tier 1 → Tier 2 | **definition only** | — |
| 10 | `re_classification` | scope 내 | **definition only** | medium ↔ domain primary 변경 |
| 11 | `retire` | lifecycle 종료 | **definition only** | M-08 부분 구현 |

_compound verb 의 target=methodology 는 v1 enum 에 정의되지 않는다. compound 경로로 methodology Learn 직접 생성 금지 (standalone `generalize` 로 Principal manual 등재만 가능)._

---

## §7 multi-medium product 대응

### §7.1 m:n relation 의 lexicon 등재

한 product 는 여러 medium 으로 구현, 한 medium 은 여러 product 에 사용. 이 cardinality 를 lexicon relation 에 명시 (§8).

### §7.2 `implemented_with.yaml` manifest

각 product 는 사용하는 medium 목록을 명시. session 시작 시 이 파일을 읽어 해당 medium reference 들을 자동 active 시킨다.

```yaml
# {product}/.onto/implemented_with.yaml
product: onto
mediums:
  - typescript
  - markdown
```

**자동 load 효과**: review / evolve / reconstruct 활동 시 해당 medium 의 Tier 2 doc 들이 lens consult pool 에 자동 진입.

### §7.3 저장 원칙 — single primary + multi-axis frontmatter

각 Tier 1 항목은 **딱 한 곳에만 저장**. 위치 = "narrowest applicable scope" (가장 좁은 적용 범위).

**scope specificity 순서** (§2.5):
```
product < { medium, domain } < methodology
```

**intersection 저장 규칙**:

| 항목의 적용 범위 | 저장 위치 | 항목 frontmatter |
|---|---|---|
| product=onto only | `{product=onto}/.onto/learnings/` | `primary_scope: product` |
| product=onto + medium=typescript | `{product=onto}/.onto/learnings/` | `primary_scope: product, secondary_scopes: {medium: typescript}` |
| product=onto + domain=SE | `{product=onto}/.onto/learnings/` | `primary_scope: product, secondary_scopes: {domain: software-engineering}` |
| product=onto + medium=typescript + domain=SE | `{product=onto}/.onto/learnings/` | `primary_scope: product, secondary_scopes: {medium: typescript, domain: software-engineering}` |
| medium=typescript only (cross-product) | `~/.onto/mediums/typescript/learnings/` | `primary_scope: medium` |
| medium=typescript + domain=SE (cross-product) | `~/.onto/domains/software-engineering/learnings/` (domain 우선 convention) | `primary_scope: domain, secondary_scopes: {medium: typescript}` |

**medium ↔ domain intersection convention — domain 우선**: 둘 다 category 로 동급이나, domain 이 더 stable (분야 안정성 높음, medium 은 도구 변경 빈번) 이므로 **domain 디렉토리에 저장** + medium attribute 로 표시.

### §7.4 frontmatter schema

기존 inline tag (`[methodology]`, `[domain/X]`) deprecate. 각 entry 상단에 structured scope 표기. **frontmatter 필드명은 lexicon attribute 와 동일** (CR-5 / CON-2 대응):

```markdown
- [{type}] [{purpose}] 본문
  primary_scope: product             # 저장 위치 결정 축 — §8.6 learning.attributes.primary_scope 와 동일 어휘
  secondary_scopes:                  # m:n 추가 적용 범위 — §8.6 learning.attributes.secondary_scopes 와 동일
    medium: typescript               # (선택)
    domain: software-engineering     # (선택)
```

**네이밍 매핑 규칙** (CR-5): frontmatter 의 `primary_scope` / `secondary_scopes` 는 §8.6 의 `experience.attributes.primary_scope` / `learning.attributes.primary_scope` / `principle.attributes.primary_scope` 와 **동일 key**. 파서는 frontmatter 를 lexicon attribute 로 1:1 매핑하여 읽는다. 두 seat 중 한쪽만 수정 시 drift 발생 — canonical 은 `§8.6 lexicon attribute schema`, frontmatter 는 이를 storage-side projection 으로 사용.

**deprecate**: `[methodology]`, `[domain/X]`, `[medium/X]` inline tag — 저장 위치 + frontmatter 가 truth source. 기존 entry 는 legacy 유지 (§7.6 fallback), 신규 entry 부터 frontmatter 사용.

### §7.5 Tier 2 composition — specificity 기반 conflict 해소

review / evolve / reconstruct 활동 시 **다중 Tier 2 reference 가 동시 active**.

**load 순서 (onto product 작업 예시)**:
1. product = onto 확인 → `{product}/.onto/ontology/` 로드
2. `{product}/.onto/implemented_with.yaml` 읽음 → mediums: [typescript, markdown]
3. 각 medium reference 로드: `~/.onto/mediums/{typescript,markdown}/`
4. session domain selection → 선택된 domain 의 `~/.onto/domains/{X}/` 로드
5. 모든 Tier 2 → lens consult pool 진입

**conflict 해소 — specificity override**:
```
product (가장 좁음) > { medium, domain } > methodology (가장 넓음)
```

- ontology (product-specific) vs medium reference 충돌 → **ontology 우선**
- medium reference vs domain document 충돌 → case-by-case (양쪽 동급). session 의 주된 작업 성격 에 따라 Principal 판단

### §7.6 Tier 1 소비 filter

review 활동의 promoted Learning consumption:

1. **product Learning**: `{product}/.onto/learnings/` 로드 (현 작업 product 만)
2. **medium Learning**: `implemented_with.yaml` 의 medium 목록 → 각 `~/.onto/mediums/{name}/learnings/` 로드 (여러 medium 동시)
3. **domain Learning**: session 의 선택된 domain → `~/.onto/domains/{X}/learnings/` 로드
4. **methodology Learning**: `~/.onto/learnings/` 로드 (항상)

각 항목의 `scopes:` frontmatter 와 현 session 의 (product, mediums, domains) 매칭 → 일치 항목만 consult pool 진입.

**legacy entry fallback (REC-3)**:
- frontmatter 없는 legacy entry 의 inline tag 를 virtual frontmatter 로 해석:
  - `[methodology]` = `scopes: {methodology: true}`
  - `[domain/X]` = `scopes: {domain: X}`
  - `[medium/X]` = `scopes: {medium: X}`
- tag 도 frontmatter 도 없는 entry → 저장 디렉토리로 scope 추론:
  - `~/.onto/learnings/` 는 methodology
  - `~/.onto/domains/{X}/learnings/` 는 domain/X
  - `~/.onto/mediums/{X}/learnings/` 는 medium/X

---

## §8 lexicon 변경 list

### §8.1 신규 entity (6)

| entity | 정의 요약 | 근거 |
|---|---|---|
| `product` | Principal 이 시간·비용 투입해 만든 작동 실체 | §2.1 |
| `experience` | onto 활동에서 자동 수집된 raw 관찰. Tier 1, maturity=Experience | §3.1 |
| `medium` | product 의 구현 수단 | §2.2 |
| `medium_reference` | 한 medium 의 Tier 2 reference doc 묶음 (6 유형 또는 자유). §6 에서 consult 대상 | §3.2, §4.2 cell (6) (R2-IA-2 신규) |
| `domain` | product 가 속한 분야 frame | §2.3 |
| `methodology` | cross-everything 지식의 귀속 frame. instance 0 (definition only, REC-1) | §2.4 |
| `principle` | Tier 3 의무 규범 | §3.3 |

### §8.2 기존 entity refine (3)

| entity | 변경 |
|---|---|
| `learning` | 정의를 "promoted 검증된 cost-saver" 로 좁힘. Tier 1 Learning 좌표만 지칭. scope 는 attribute `primary_scope` + `secondary_scopes` 에서 표현 (§8.6) |
| `domain_document` | grain 명확화 — "1 file = 1 instance". parent domain reference 추가. doc_type enum local attribute 추가 |
| `ontology` | onto-direction §1 prose 정의를 lexicon entity 로 격상. scope=product 한정. Tier 2 |

### §8.3 신규 enum (3)

```yaml
scope:
  values: ["product", "medium", "domain", "methodology"]
  notes:
    - "과거 [user, project, domain] 의 user 는 methodology 로 rename,
       project 는 product 로 통합 (본 framework §2)"
    - "의미 전환: 기존 'Storage ownership boundary' → 본 framework '적용 범위' 축.
       저장 경계는 §5 에서 좌표로부터 도출되는 결과물 (§1 REC-5 선언)"

transition_kind:
  values:
    - "promote"                      # Tier 1 maturity, same scope
    - "generalize"                   # scope axis, standalone (이미 Learning 인 항목)
    - "promote_and_generalize"       # compound — Exp → 다른 scope 의 Learn, v1 active for target=medium/domain
    - "canonicalize"                 # Tier 1·2 → Tier 3, snapshot copy (§6.3)
    - "norm_update"                  # Tier 1 → Tier 2 (domain)
    - "medium_norm_update"           # Tier 1 → Tier 2 (medium)
    - "ontology_update"              # Tier 1 → Tier 2 (product)
    - "re_classification"            # medium ↔ domain primary scope 변경
    - "retire"                       # lifecycle 종료

normative_tier:
  values: ["1_cost_saver", "2_reference", "3_obligation"]
```

### §8.4 deprecate

| 항목 | 처리 |
|---|---|
| `learning_applicability` enum | deprecate (scope attribute 가 흡수) |
| inline tag `[methodology]`, `[domain/X]`, `[medium/X]` | 신규 entry 부터 미사용. 기존 entry 는 legacy 유지 (§7.6 fallback 해석) |
| `scope.values` 의 기존 `user`, `project` | retire. user → methodology, project → product 로 마이그레이션 |

### §8.5 retire

| 항목 | 이유 |
|---|---|
| 어휘 `project` (전역) | entity 등재된 적 없음. `product` 로 통합 |
| 어휘 `artifact` 의 "수단 (means)" 용법 | 영어 사전 의미 충돌. 본 framework 는 `medium` 사용. 기존 "산출물 instance" 의미 artifact (`produces`, `review_artifact`, `provenance`) 는 보존 (semantics F3 정정) |

### §8.6 relation 신규 등재 (IA-3 + REC-7 반영)

```yaml
product:
  attributes:
    shared: []
    local:
      mediums: {type: "array of medium references", source: "implemented_with.yaml"}
  relations:
    - type: implemented_with
      target: medium
      cardinality: "many-to-many"
    - type: belongs_to
      target: domain
      cardinality: "many-to-one"
    - type: described_by
      target: ontology
      cardinality: "one-to-many"    # 한 product 여러 ontology 가능

medium:
  relations:
    - type: realizes
      target: product
      cardinality: "many-to-many"

domain:
  relations:
    - type: contains
      target: domain_document
      cardinality: "one-to-many"

experience:
  attributes:
    shared: [lifecycle_status]
    local:
      primary_scope: {values: ["product", "medium", "domain", "methodology"]}
      secondary_scopes: {type: "array of {scope_type, scope_value}"}
  relations:
    - type: promoted_to
      target: learning
      note: "promote 또는 promote_and_generalize 전이의 도착지"

learning:
  attributes:
    shared: [lifecycle_status]
    local:
      primary_scope: {values: ["product", "medium", "domain", "methodology"]}
      secondary_scopes: {type: "array of {scope_type, scope_value}"}
      source_experience_ref: {type: "string, historical pointer", note: "promote 시점 source Experience 의 entry marker (CR-6 / CON-3)"}
  relations:
    # CR-6 — experience.promoted_to 의 inverse 추가 (provenance 대칭 확보)
    - type: promoted_from
      target: experience
      cardinality: "many-to-one"
      semantics: "historical pointer to source Experience (snapshot at promote time)"
    - type: generalized_to
      target: learning
      note: "standalone generalize 전이. scope 가 다른 Learning 간 이동"
    - type: canonicalized_to
      target: principle
      note: "canonicalize 전이. snapshot copy 로 Tier 3 생성"

principle:
  attributes:
    shared: [lifecycle_status]
    local:
      primary_scope: {values: ["product", "medium", "domain", "methodology"]}
      secondary_scopes: {type: "array of {scope_type, scope_value}"}
      source_commit_sha: {type: "string", note: "canonicalize 시점 source 의 commit SHA"}
      source_ref: {type: "historical pointer, not live reference"}
  relations:
    # R2-IA-4 — canonicalized_from target 을 Tier 1 (learning) + Tier 2 3종 전체로 확장
    - type: canonicalized_from
      target: [learning, ontology, medium_reference, domain_document]
      cardinality: "many-to-one"
      semantics: "snapshot_reference (historical, not live)"

ontology:
  relations:
    - type: describes
      target: product
      cardinality: "many-to-one"
    - type: canonicalized_to
      target: principle
      note: "Tier 2 → Tier 3 승격. Principal 직접만"

medium_reference:
  relations:
    - type: references
      target: medium
      cardinality: "many-to-one"
    - type: canonicalized_to
      target: principle

domain_document:
  attributes:
    local:
      doc_type: {values: ["concepts", "competency_qs", "conciseness_rules",
                          "dependency_rules", "domain_scope", "extension_cases",
                          "logic_rules", "structure_spec"]}
  relations:
    - type: belongs_to
      target: domain
      cardinality: "many-to-one"
    - type: canonicalized_to
      target: principle
```

---

## §9 rename scope + phasing

### §9.1 rename 대상 전수

| 영역 | 현재 | 정정 | blast radius |
|---|---|---|---|
| lexicon `scope.values` | `[user, project, domain]` | `[product, medium, domain, methodology]` | 1 line + notes |
| `design-principles/project-locality-principle.md` | (파일명 + 본문) | rename → `product-locality-principle.md`. 본문 "project" 전수 "product" 치환 | 1 file rename + content |
| `design-principles/productization-charter.md` | (경계 미명시) | §1 에 한 줄 추가 — "본 charter 의 product 는 productization trajectory. framework 의 product instance 와 구별" | 1 line 추가 |
| `processes/learn/promote.md` | project learning ... | product learning ..., 저장 경로 갱신 | prose 치환 |
| `processes/learn/health.md` | 동일 | 동일 | prose 치환 |
| `processes/learn/promote-domain.md` | 동일 | 동일 | prose 치환 |
| `processes/govern.md` | project-local ... | product-local ... | prose 치환 |
| CLAUDE.md authority 위계 표 | (project-locality 경로 참조) | product-locality 경로로 갱신 | 1 line |
| code 변수명 (`projectRoot`, `project_root` 등) | (수다수) | productRoot 등 | 별도 PR |
| development-records/ 내부 prose | (수다수) | historical 로 잔류 허용 (archive 정책) | 변경 없음 |

### §9.2 phasing — 두 단계

| Phase | 대상 | PR 규모 |
|---|---|---|
| **Phase 1** | lexicon + authority (rank 1-3) + processes (rank 5) + CLAUDE.md | 중간 (~10 파일) |
| **Phase 2** | code 변수명 (projectRoot → productRoot 등) | 큼 (code 전수) |

Phase 1 은 본 framework 합의와 함께 즉시 실행. Phase 2 는 후속 PR 로 분리 (code semantic 변경 없음 — pure rename).

---

## §10 deferred items

### §10.1 onto repo layout migration

**대상**: onto repo 의 `authority/`, `design-principles/`, `processes/` 의 repo root 배치.

**현 상태**: self-hosted framework bootstrapping 으로 legacy 유지. §4.2 cell (1) product Principle 의 onto-specific 배치.

**정착 방향**: 일반 product canonical layout 과 정렬 — `{product}/.onto/authority/`, `{product}/.onto/design-principles/`, `{product}/.onto/processes/` 하위로 이관. framework 자기 일관성 유지.

**예상 착수 trigger**: Phase 4 (5-activity v1) 완료 후 별도 W-ID 발부.

**blast radius 선식별**:

1. CLAUDE.md authority 위계 표의 경로 7+ 항목
2. code import paths: `src/core-runtime/**/*.ts` 의 `../../../authority/`, `../../design-principles/` 등
3. 외부 memory / reference citations 의 경로 인용
4. `bin/onto` 의 `ONTO_HOME` 해석 로직 (installation resource 로 `authority/`, `roles/` 가정)
5. `processes/govern.md` 의 `GOVERNANCE_CORE_PREFIXES` drift-engine 상수

**순서 — symlink 배제 (REC-4 반영)**:
1. 신 prefix `.onto/principles/` (또는 `.onto/authority/` 등) 를 `GOVERNANCE_CORE_PREFIXES` 에 **먼저 추가**
2. **hard copy** (symlink 대신) — legacy 위치와 신 위치 양쪽 존재
3. 경로 참조 일괄 갱신 + CI 검증 — 모든 import · reference 를 신 경로로 전환
4. legacy prefix 제거 + legacy 위치 파일 제거

**REC-4 rationale**: symlink 를 사용하면 drift-engine path 체크 시 realpath 정규화 없이 한 물리 파일이 legacy / 신 prefix 양쪽에 match 가능 → govern 차단 결정론성 붕괴. hard copy + 경로 갱신 순이 중간 상태에서도 명확.

**기록 위치**: 본 framework §10.1 + 메모리 `project_onto_repo_layout_migration.md` (2026-04-19 세션 등록).

### §10.2 product Tier 1 의 실제 instance 발생 관찰

현 design 시 product Learning (cell 8 Learn) 이 v1 신설되지만, 실제 누적 패턴을 관찰하여 Exp vs Learn 분리의 유효성 검증 필요. 6개월 이상 누적 후 재평가.

### §10.3 methodology instance 의 실제 발생 관찰

methodology 좌표 (4)·(11) 가 대부분 definition only 지만, dogfood 누적 시 실제 methodology Learning 이 자연 발생할 수 있음. 첫 instance 발생 시 본 framework §6 의 standalone `generalize` 전이 구현 우선순위 재평가.

### §10.4 `organizational_process` / `slack_workflow` 정식 등재 관찰

현 §2.2 에서 잠정 제외 (IA-7). cross-product 반복 관찰 후 "product 자체인가 medium 인가" 판정되면 §12.1 확장 절차로 정식 등재.

---

## §11 Stage 2 (govern↔learn 순환 의존) 재연결

본 framework 로 Stage 2 의 zone matrix 가 갱신된다.

### §11.1 갱신된 zone matrix (§4.2 projection)

**본 matrix 는 §4.2 projection**. cell 의 cell_state / transition_automation / learn_autowrite 값은 §4.2 가 canonical. 본 seat 은 govern 강제 여부를 중심으로 재배열한 view.

세 컬럼 의미 분리 (Next-IA-6 대응):
- **learn 자동 write**: binary (✅ / ❌). learn 프로세스가 해당 zone 에 자동으로 파일을 생성·수정할 수 있는가.
- **전이 경로**: 자동 또는 수동 write 의 구현 상태 (automated / definition only / patch only). 같은 "❌ 자동 write" 라도 _definition only_ (구현 대기) 와 _patch only_ (canonicalize 를 통해서만 편집 가능) 는 의미가 다름.
- **govern 강제**: Tier 3 canonicalize 경로 필수 여부.

| zone | 좌표 | learn 자동 write | 전이 경로 | govern 강제 |
|---|---|---|---|---|
| `{product}/.onto/experiences/` | T1 Exp, product (cell 8 Exp) | ✅ | automated | ❌ |
| `{product}/.onto/learnings/` | T1 Learn, product (cell 8 Learn) | ✅ | automated (`promote`) | ❌ |
| `~/.onto/mediums/{X}/experiences/` | T1 Exp, medium (cell 9 Exp) | ❌ | definition only | ❌ |
| `~/.onto/mediums/{X}/learnings/` | T1 Learn, medium (cell 9 Learn) | ✅ | automated (`promote_and_generalize`) | ❌ |
| `~/.onto/domains/{X}/experiences/` | T1 Exp, domain (cell 10 Exp) | ❌ | definition only | ❌ |
| `~/.onto/domains/{X}/learnings/` | T1 Learn, domain (cell 10 Learn) | ✅ | automated (`promote_and_generalize`) | ❌ |
| `~/.onto/experiences/`, `~/.onto/learnings/` | T1, methodology (cell 11) | ❌ | definition only | ❌ |
| `{product}/.onto/ontology/` | T2, product (cell 5) | ❌ | definition only (`ontology_update`) | ❌ |
| `~/.onto/mediums/{X}/{6 doc}` | T2, medium (cell 6) | ❌ | definition only (`medium_norm_update`) | ❌ |
| `~/.onto/domains/{X}/{8 doc}` | T2, domain (cell 7) | ✅ | automated (`norm_update` — promote.md Step 7) | ❌ |
| `{product}/.onto/principles/` (일반 product) | T3, product (cell 1) | ❌ | patch only (`canonicalize`) | ✅ 강제 |
| **onto repo root** (authority/, design-principles/, processes/) | T3, product (self-hosted 특수 배치) | ❌ | patch only (`canonicalize`) | ✅ 강제 |
| `~/.onto/mediums/{X}/principles/` | T3, medium (cell 2) | ❌ | patch only (`canonicalize`) | ✅ 강제 (정의만) |
| `~/.onto/domains/{X}/principles/` | T3, domain (cell 3) | ❌ | patch only (`canonicalize`) | ✅ 강제 (정의만) |
| `~/.onto/principles/` | T3, methodology (cell 4) | ❌ | patch only (`canonicalize`) | ✅ 강제 (정의만) |

### §11.2 순환 의존의 본질 분리

**Tier 1 + Tier 2 = learn 자동 zone** (govern 무관). learn 이 단독으로 자동 편집 가능. 이 영역에서는 govern 의 강제 차단 없음.

**Tier 3 = govern 강제 zone**. canonicalize 경로만 이 영역에 진입. 이 영역의 편집은 반드시 govern decide approve 필수.

**Normative artifact 귀속 명시** (R2-IA-6, axiology F4 대응): onto-direction §1.2 의 "normative artifact" 는 본 framework 에서 **Tier 3 Principle 에 한정** 된다. Tier 2 (reference) 는 descriptive soft guardrail 이지 normative artifact 가 아님. 따라서 Tier 2 learn_autowrite 허용은 normative authority 를 부여하지 않는다. 이 귀속이 Stage 2 의 govern 강제 zone (§11.1) 이 Tier 3 에만 적용되는 근거.

**순환 의존의 해소**: Phase 4 Stage 2 의 2-phase commit 계약은 **Tier 3 canonicalize 경로에만** 필요. Tier 1·2 는 learn 자동 zone 안에서 완결 → 순환 없음. canonicalize 가 snapshot copy (§6.3 REC-7) 이므로 **Tier 1 ↔ Tier 3 간 feedback 루프 부재** — 완전 분리 성립. Stage 2 설계 범위가 직전 초안보다 좁아짐.

### §11.3 drift-engine GOVERNANCE_CORE_PREFIXES 확장

⚠ **본 확장은 Phase 4 Stage 2 설계 대상** 이며 현 framework 합의만으로는 적용되지 않는다 (IA-6 반영). Stage 2 진입 전 다음 3 질문을 Principal 이 결정해야 한다:

1. product-local Tier 3 (`{product}/.onto/principles/`) 변경의 소유권은 **product govern** 인가 **user-level govern** 인가?
2. onto-direction §1.3 drift 분기 표의 세 경로 (self_apply / queue / principal_direct) 중 어디에 해당?
3. onto repo (self-hosted 특수 배치) 와 일반 product 의 자율성 경계를 **동일 취급** 할지 **분리** 할지?

현 `src/core-runtime/govern/drift-engine.ts` 의 상수:
```typescript
const GOVERNANCE_CORE_PREFIXES = [
  "authority/",
  "design-principles/",
  "processes/govern.md",
]
```

Stage 2 설계 후 확장 방향 후보 (결정 이전 참고용):
```typescript
const GOVERNANCE_CORE_PREFIXES = [
  // onto repo self-hosted (§10.1 deferred migration 후 제거 예정)
  "authority/",
  "design-principles/",
  "processes/govern.md",

  // 일반 product canonical 위치 (§5.1) — Stage 2 결정 대상
  ".onto/principles/",

  // user-scope Tier 3 (§5.2) — Stage 2 결정 대상
  // (절대 경로 prefix — pre-commit hook 이 적절히 해석)
]
```

### §11.4 Stage 2 설계 진입점 재정리

Phase 4 Stage 2 (govern↔learn 순환 의존) 설계는 본 framework 채택 후 다음 점들만 결정하면 된다:

1. Tier 3 canonicalize 경로의 2-phase commit 계약 (staging area · patch 생성 · rollback)
2. Principal 개입 matrix — Tier 3 진입 시 Principal direct 강제
3. drift probe v1 의 Tier 3 사전 분석
4. §11.3 의 3 질문 결정

Tier 1·2 (learn 자동 영역) 은 Stage 2 scope 밖. 이로써 Stage 2 설계가 훨씬 focused 해짐.

---

## §12 framework 자체의 확장·갱신 protocol (REC-2 신설)

본 framework 가 rank 1 SSOT 갱신 input 으로 작동하므로, 자기 change management 규칙을 명시한다.

### §12.1 scope enum 확장

**원칙**: scope 4 값 (product / medium / domain / methodology) 은 기본 고정. 5번째 값 추가는 다음 조건 모두 충족 시.

| 조건 | 기준 |
|---|---|
| 기존 4 값 중 어느 것으로도 분류 불가한 instance 관찰 | 최소 3 건 multi-source |
| 새 값이 기존 값과 orthogonal 함 증명 | specificity ladder 상 위치 명시 |
| Principal 명시 승인 | lexicon 갱신 PR |
| 본 framework §2 에 신규 sub-section 추가 | entity 격상 여부 동시 결정 |

### §12.2 tier 경계 재조정

**원칙**: Tier 1 (실용) / Tier 2 (reference) / Tier 3 (의무) 3 단계 **고정**. 중간 tier (Tier 1.5) 추가 금지.

**예외 경로**: 3 단계로 표현 불가한 강제력 패턴이 지속 관찰될 때. Principal 이 §3 재설계 PR 발행. framework version major bump.

### §12.3 domain_document 유형 추가

**기본 8 유형**: concepts / competency_qs / conciseness_rules / dependency_rules / domain_scope / extension_cases / logic_rules / structure_spec.

**domain-specific optional 유형 허용**: 특정 domain 이 8 유형으로 표현 불가한 지식 유형 보유 시, 해당 domain 디렉토리 내 추가 파일 생성 가능. 단 `doc_type` attribute 에 `custom:{type_name}` 명시.

**9번째 유형 전역 추가**: 2+ domain 에서 같은 custom type 독립 발생 시 본 framework §3.2 갱신 검토.

### §12.4 medium reference 유형 추가

**base 6 유형**: concepts / patterns / conventions / pitfalls / tooling / validation.

**medium-specific 자유 구성 허용**: 각 medium 은 6 유형 중 일부만 사용하거나 medium-specific 유형 추가 가능 (예: excel 의 `formula_audit`). domain_document 보다 자유도 높음.

### §12.5 framework version 관리

| 필드 | 값 | 의미 |
|---|---|---|
| `framework_version` | `v1.0` (현재) | 본 문서 frontmatter 에 명시 |
| `status` | `canonical (pending-lexicon-sync)` → `canonical` (§0.1 activation timing) | status transition 은 lexicon 반영 gate |
| **breaking change** | scope enum 값 변경, tier 3 단계 변경, 전이 verb 의미 변경 | major bump (v2.0). 기존 항목 전수 migration |
| **non-breaking addition** | scope entity 추가, 전이 verb 추가, reference doc 유형 추가 | minor bump (v1.1). 기존 항목 해석 유지 |
| **clarification** | prose 정정, example 추가 | patch bump (v1.0.1) |

### §12.6 migration authoring 책임

framework 갱신 시:
- lexicon 갱신 PR: Principal 또는 위임 agent
- rank 2-5 authority 갱신 PR: Principal 직접 (Tier 3 canonicalize 경로)
- code 영향 (Phase 2 rename): Principal 명시 승인 + 별도 PR

### §12.7 meta-schema 선언

본 framework 의 세 축은 **classifying dimension** 이다:
- scope: 항목의 적용 범위를 분할 (partition)
- 성숙도: Tier 1 내부의 검증 상태를 분할
- 강제력: 항목의 준수 방식을 분할

각 축의 값 집합은 그 축 위에서의 **mutually exclusive, collectively exhaustive (MECE) partition**.

**좌표 유일성 (재정식화, CR-2 / logic F2 대응)**:
- **강제력 축 (tier)**: 모든 항목에 대해 정확히 한 값 (Tier 1 / 2 / 3)
- **scope 축 (primary_scope)**: 모든 항목에 대해 정확히 한 값 (product / medium / domain / methodology). secondary_scopes 는 m:n 이지만 저장 위치 결정은 primary_scope 만 사용
- **성숙도 축 (maturity)**: **Tier 1 항목에 한정** 하여 정확히 한 값 (Experience / Learning). Tier 2·3 항목은 성숙도 축 값이 없음 (n/a). 이는 축 배치가 conditional — 성숙도 축은 Tier 1 내부 분화 용 (§3.1, §4.2)

즉 "한 항목은 세 축 각각에서 정확히 한 값을 가진다" 는 tier + primary_scope 두 축에 대해 전칭, maturity 는 Tier 1 한정. 저장 위치 결정적 도출은 tier + primary_scope 만으로 성립.

**Storage 도출 규칙** (Next-IA-5): (tier, primary_scope) 쌍이 기본 저장 디렉토리를 결정한다. Tier 1 항목은 추가로 maturity 축에 따라 같은 (tier, primary_scope) 아래에서 `experiences/` 와 `learnings/` 두 디렉토리로 분화된다 (예: T1 product → `{product}/.onto/experiences/` + `{product}/.onto/learnings/`). Tier 2·3 은 maturity 축 값이 없으므로 (tier, primary_scope) 만으로 디렉토리가 유일하다 (예: T3 product → `{product}/.onto/principles/`). 이 규칙이 §4.2 cell grid (12 nominal · 11 정의 · 15 저장 단위) 의 **15** 수치를 산출하는 근거다.

---

## §13 lifecycle

| 상태 | 조건 |
|---|---|
| **Active** | 본 framework 가 lexicon 정합 + product-locality rename + Stage 2 설계에 인용되는 한 |
| **Superseded** | 본 framework 의 결정이 다음 정본 문서에 흡수될 때 — "superseded by <doc>" 표시 |
| **Archive** | Phase 4 전체 완료 시 reference 용 |

## §14 합의 source

본 문서의 결정은 2026-04-19 세션의 chat-level 합의 + 9-lens full review 결과를 축적한 것.

### §14.1 주요 합의 지점 (Round 1, pre-review)
- 단어 rename (`project` → `product`, `artifact` → `medium`)
- 4 scope × 3 tier 격자 채택
- medium Tier 2 신설 (`/excel-workbook-editing` 을 example 로)
- multi-medium product 의 m:n + manifest + composition rule
- YAGNI bypass 로 상위 좌표 사전 정의 (instance 발생 전 구현 defer)
- onto repo layout migration 을 deferred 로 기록

### §14.2 9-lens full review 결과 반영 (Round 1 post-review)

본 문서 v1.0 에는 full review session `20260419-19e88ea1` 의 결과가 반영됨. 주요 결정:

| 결정 | 반영 |
|---|---|
| IA-1 (B) compound verb 격상 | §6.4 `promote_and_generalize` 신설, §8.3 enum 추가 |
| IA-2 medium/domain Learn v1 active | §4.2 cell (9)(10) Learn active, §6.6 SSOT |
| IA-3 scope attributes + Tier 2 canonicalized_to | §8.6 attribute / relation 신설 |
| IA-4 count mismatch | §4.1 disambiguation (12/11/15) |
| IA-5 Tier 1 소비 경계 | §3.1 적용 vs 소비 경계 분리 |
| IA-6 §11.3 Stage 2 대상 명확화 | §11.3 상단 경고 + 3 질문 |
| IA-7 organizational_process 잠정 제거 | §2.2 잠정 제외 + §10.4 관찰 |
| REC-1 methodology entity | §8.1 신규 등재 |
| REC-2 framework 확장 protocol | §12 신설 (7 sub-section) |
| REC-3 legacy migration 보강 | §5.3 행 추가 + §7.6 fallback |
| REC-4 symlink 배제 | §10.1 순서 재정렬 |
| REC-5 scope 동음이의어 해소 | §1 선언 |
| REC-6 primary owner + label 3-축 분리 | §4.2 column 분리, §4.3 삭제 |
| REC-7 canonicalize snapshot copy | §6.3, §8.6, §11.2 반영 |
| REC-8 project learnings Principal-gated | §5.3 첫 행 조건 분기 |
| Q1 compound target scope | medium/domain active, methodology definition only (§6.4) |
| Q2 medium/domain Exp definition only | §4.2 유지 (compound 가 중간 skip) |
| Q3 Tier 2 갱신 전이 비대칭 | §6.5: domain norm_update 만 active, medium/ontology update definition only |
| Q4 compound verb 이름 | `promote_and_generalize` 채택 (§6.4, §8.3) |

review 산출물 위치: `.onto/review/20260419-19e88ea1/` (final-output, synthesis, round1 lens 9 건, review-record).
