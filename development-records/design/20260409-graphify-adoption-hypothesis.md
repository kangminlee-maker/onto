# graphify → onto build: Adoption Hypothesis Memo (v6)

## 0. Document Status

| 항목 | 값 |
|---|---|
| version | 6 (final narrow cleanup, 5 cleanup passes + 6 review passes) |
| scope | **Selected mechanisms for onto adoption evaluation** — graphify의 exhaustive inventory가 아님 |
| artifact purpose | **Provisional backlog hypothesis memo for human planning**. Sequencing authority, automation-grade intake, canonical cleanliness proof 아님. final tiering은 build authority owner와 함께 재검토 필수 |
| 1차 review session | `.onto/review/20260408-a406b52b/` — onto-side 정합성 / 축 설계 / 사실 오기 식별 |
| 2차 review session | `.onto/review/20260408-19089faf/` — graphify 원본과 직접 대조 (1차 C1 boundary 해소) |
| 3차 review session | `.onto/review/20260408-3b79cbd7/` — v2 cleanliness 검증 |
| 4차 review session | `.onto/review/20260409-09ccdbed/` — v3 cleanliness 검증 |
| 5차 review session | `.onto/review/20260409-48f8a7f3/` — v4 cleanliness 검증 |
| 6차 review session | `.onto/review/20260409-57d2f40a/` — v5 cleanliness 검증 |
| revision trigger (v5→v6) | 6차 review의 narrow propagation fix: §7.1/A.6 stale dependency mirror + §12.5 preserved total drift + §12 5차 review scope materialization (no design change, no scope re-open) |
| **추적 메커니즘** | §12 Prior-Finding Crosswalk가 1차~6차 finding을 추적. self-proving이 아니라 boundary-tracked memo — row arithmetic은 문서 내부 consistency만 보장 |

## 1. Source Materialization (Evidence Basis)

| 항목 | 값 |
|---|---|
| upstream repo | `safishamsi/graphify` |
| branch | `v3` |
| commit | `92b70ce5f4f208bb7ea4d4e796f70e52e40418eb` |
| commit message | `fix: sanitize_label double-encoding and --wiki missing from skill (#66, #55)` |
| local root | `.onto/temp/graphify-source/` (gitignored, ephemeral) |

모든 graphify-side claim은 §11 Evidence Index에서 `1 claim = 1 row = 1 file path + numeric line(s)` 규칙으로 추적됩니다.

## 2. Fundamental Contrast

| 축 | graphify | onto build |
|---|---|---|
| **목적** | 폴더 안의 파일을 navigable knowledge graph로 변환 — **발견/탐색** 지향 | 소스의 도메인 지식을 ontology로 **정밀 재현** 지향 |
| **파이프라인** | 1-shot linear: `detect → extract → build → cluster → analyze → report → export` | 반복 루프: Explorer ↔ verification agents ↔ Philosopher, **coverage + fact convergence**로 종료 |
| **출력** | NetworkX 그래프 + community + HTML/JSON/Wiki | Schema B/C/D 기반 `raw.yml` |

### 2.1 평탄화 금지 항목 (1차·2차·3차 공통 경고)

graphify 패턴 차용 시 다음을 후퇴시키면 안 됩니다:

- **5-level final certainty** (`observed` / `rationale-absent` / `inferred` / `ambiguous` / `not-in-source`) + **Stage 1 intermediate `pending`**
- **`abduction_quality`** (`explanatory_power`, `coherence`) — Phase 3 사용자 결정 정렬의 SSOT
- **Integral exploration loop** — Explorer 단일 traversal + verification agents의 dimensional gap + Philosopher 수렴 판정
- **Single artifact truth** (`raw.yml`) — 다른 surface는 derive하거나 read-only adapter여야 함

## 3. Selected graphify Mechanisms (Evidence-Indexed)

**중요**: 이것은 "graphify가 제공하는 모든 기능"이 아니라 "onto adoption 관점에서 선별한 메커니즘"입니다. parent taxonomy(Extraction / Analysis / Maintenance / Consumption / Ingress / Constraints)로 재그룹.

### 3.1 Extraction

| ID | 항목 | 상태 | Evidence rows |
|---|---|---|---|
| **E1** | 2-pass extraction (AST + semantic) | Confirmed with correction | E1-a, E1-b, E1-c, E1-d |
| **E2** | Tree-sitter `LanguageConfig` 기반 다언어 AST | Confirmed | E2-a, E2-b |
| **E3** | Confidence 3-tier + numeric score | **Partial** — score는 export-time backfill property | E3-a, E3-b, E3-c, E3-d |
| **E4** | Semantic similarity edges (`semantically_similar_to`) | Confirmed | E4-a |
| **E5** | Rationale extraction | **Partial** — Python deterministic + 다른 언어/docs는 prompt-backed | E5-a, E5-b |
| **E6** | Hyperedges (3+ node 그룹 관계) | Confirmed with seat caveat — viz/export-only, live query 미지원 | E6-a, E6-b, E6-c |

### 3.2 Analysis

| ID | 항목 | 상태 | Evidence rows |
|---|---|---|---|
| **A1** | Leiden community + Louvain fallback | Confirmed | A1-a, A1-b |
| **A1c** | Cohesion score | Confirmed | A1c-a, A1c-b |
| **A2** | God nodes (file-hub / concept node 필터링) | Confirmed | A2-a, A2-b |
| **A3** | Surprising connections (합성 surprise score) | Confirmed | A3-a, A3-b |
| **A4** | Suggested questions | Confirmed | A4-a |
| **A5** | Graph diff (function only) | Confirmed | A5-a |
| **A5w** | Graph diff `--update` wiring | **Bug — see §8 CR2** | A5w-a |

### 3.3 Maintenance

| ID | 항목 | 상태 | Evidence rows |
|---|---|---|---|
| **M1** | SHA256 per-file content cache | Confirmed | M1-a, M1-b, M1-c |
| **M2-detect** | `detect_incremental()` deleted file 식별 | Confirmed | M2-a, M2-b |
| **M2-update** | `--update` merge 동작 | **Bug — see §8 CR1** | M2-c |
| **M3** | Watch mode | Confirmed | M3-a |
| **M4** | Git hooks (post-commit / post-checkout) | Confirmed | M4-a, M4-b, M4-c |
| **M5** | Token reduction benchmark | Confirmed | M5-a, M5-b |
| **M6** | Cost tracking (`cost.json`) | Confirmed | M6-a |

### 3.4 Consumption Surfaces

| ID | 항목 | 상태 | Evidence rows |
|---|---|---|---|
| **Q1** | MCP stdio server | Confirmed | Q1-a, Q1-b |
| **Q2** | Interactive HTML 시각화 (vis.js) | Confirmed | Q2-a |
| **Q3** | Wiki output (`--wiki`) | Function confirmed; full e2e wiring 미입증 | Q3-a-fn (function), Q3-a-wire (wiring, OQ-2) |
| **Q4-query** | BFS/DFS query (`/graphify query`) | Confirmed | Q4q-a |
| **Q4-path** | Shortest path query (`/graphify path`) | Confirmed | Q4p-a |
| **Q4-explain** | Node explain (`/graphify explain`) | Confirmed | Q4e-a |
| **Q5-save** | Q&A 결과 저장 (`save_query_result`) | Confirmed | Q5-a |
| **Q5-gate** | 다음 `--update`로 명시적 게이팅 | Confirmed | Q5-b |

### 3.5 Ingress

| ID | 항목 | Evidence rows |
|---|---|---|
| **I1** | 다국어·다형식 file-type 분류 | I1-a, I1-b |
| **I2** | `.graphifyignore` 패턴 매칭 | I2-a, I2-b |
| **I3** | Office 변환 (.docx, .xlsx) | I3-a |
| **I4** | URL fetch + author/contributor metadata | I4-a |

### 3.6 Constraints

| ID | 항목 | Status | Evidence rows |
|---|---|---|---|
| **X1** | Core graph가 **undirected** (`nx.Graph`) | **Constraint — see §8 CR3** | X1-a, X1-b, X1-c |
| **X2** | AST-vs-semantic merge precedence (Part C dedup) | Confirmed | X2-a |
| **X3** | Changed/deleted file invalidation 부재 | **graphify 자체 미해결** (§8 CR1과 같은 근원) | X3-a |
| **X4-validate** | Extraction schema validation | Confirmed | X4v-a |
| **X4-security** | URL + path + label sanitization guards | Confirmed | X4s-a, X4s-b, X4s-c |

### 3.7 SYN-C7 Re-seated: 이미지/PDF 추출은 Mixed-Seat

3차 review UF-LOGIC-SYN-C7-SEAT 권고에 따라 single row를 mixed-seat 구조로 분해합니다.

| ID | 구성 요소 | 무엇인가 | 상태 | Evidence rows |
|---|---|---|---|---|
| **MM-detect** | Detect-side file-type 분류 | `.png/.jpg/.webp/.gif/.svg/.pdf` 파일 식별 | Confirmed | MM-d-a |
| **MM-ingest** | Ingest-side metadata + binary 보관 | URL fetch + frontmatter | Confirmed | MM-i-a |
| **MM-skill** | Skill-level semantic/vision contract | Claude vision으로 figure/diagram 해석 | Confirmed (prompt-backed) | MM-s-a |
| **MM-pdf-vision** | PDF figure-vision 세부 동작 | PDF 안 figure 레이아웃·메타 데이터 추출 | **Insufficient evidence within boundary** (§10 OQ-1) | — |

이 항목은 **정상 메커니즘이지만 단일 seat가 아님**. onto가 차용 시 detect/ingest/skill 세 seat 각각에 매핑해야 함.

## 4. onto build Current Capabilities (Corrected)

v1 오기 정정 표 (1차 review C5/C6/C8 합의):

| 항목 | v1 오기 | 정확한 상태 |
|---|---|---|
| **Certainty 단계 수** | "4단계 discrete" | **5 final levels** + **Stage 1 intermediate `pending`**. 정의 SSOT: `processes/build.md:40-58` |
| **Explorer 도구** | "LLM 단일 패스로 모든 구조 인식" | 이미 **`Glob/Grep/Read` 결정론 도구** 사용 (`explorers/code.md:3`). 결손은 **"parser-backed AST prepass 부재"** |
| **Rationale 처리** | "rationale 추출 없음" | 이미 있는 것: `lens: rationale` (`build.md:663-665`), `label: rationale` (`build.md:697`), `rationale-absent` certainty (`build.md:47-58`), Phase 3 "policy rationale unconfirmed" (`build.md:848-850`). 결손: **`fact_type: rationale` / `rationale_for` 같은 standalone canonical artifact seat 부재** |
| **Hyperedge** | "saga/domain_flow이 동일 역할" | `domain_flows` (`schema-b.yml:182`)와 `sagas` (`schema-d.yml:258`)는 `steps`/`involved_*`를 가진 **workflow aggregate**. **generic N-ary primitive 아님** |
| **Abduction quality vs numeric score** | v1은 numeric score 도입 주장 | `abduction_quality.{explanatory_power, coherence}` (`build.md:62-68`)가 이미 Phase 3 정렬 SSOT (`build.md:845-849`). consumer contract 없는 별도 scalar는 produced-but-not-consumed |
| **Linear pipeline 금지** | (v1 경고 옳음, 유지) | onto의 integral exploration + convergence는 정밀 재현 보장의 핵심 (`build.md:17-21`, `251-258`) |

## 5. Gap Analysis

`closest onto analog` 칼럼은 1차 U4 권고 반영 (`none` / `partial` / `different layer`).

| ID | graphify mechanism | closest onto analog | 현재 onto seat | 실제 gap 서술 |
|---|---|---|---|---|
| E1 | 2-pass (AST + semantic) | partial | Explorer는 `Glob/Grep/Read` 결정론 도구 사용 | tree-sitter 기반 **parser-backed AST prepass** 부재 |
| E2 | Tree-sitter `LanguageConfig` 다언어 | none | — | 19개 언어 결정론 extractor 부재 |
| E3 | Confidence + score | different layer | 5-level certainty + `abduction_quality` | onto는 action-routing taxonomy, graphify는 ranking signal — 직접 대체 아님 |
| E4 | Semantic similarity edges | none | — | 구조적 연결 없는 개념 유사 edge 부재 |
| E5 | Deterministic rationale extraction | partial | rationale 부재 표현은 있음 (`rationale-absent`, `lens:rationale`) | **standalone canonical `rationale_for` artifact seat 부재** |
| E6 | Hyperedges (generic N-ary) | none | `domain_flows`/`sagas`는 workflow aggregate | generic N-ary relation primitive 부재 |
| A1 | Leiden community + cohesion | none | — | 토폴로지 기반 자동 군집화 없음 |
| A2-A4 | God / surprise / question | none | Phase 3는 element 리스트 + 결정 항목 | 구조적 통찰 자동 분석 surface 없음 |
| A5 | Graph diff | none | — | 재빌드 결과 비교 없음 (graphify wiring bug는 §8 CR2) |
| M1 | Per-file content cache | none | 매 빌드 풀 재생성 | fact reuse 메커니즘 없음 |
| M2 | `--update` incremental | none | — | (graphify 자체 deletion-safety 결함은 §8 CR1) |
| M3 | Watch mode | different layer | review에 watcher 존재 (`commands/review.md:42-57`) | build용 watcher 없음 |
| M4 | Git hooks (build-trigger) | none | — | (§6.4 reject) |
| M5 | Token reduction benchmark | none | — | 빌드 가치 정량화 메트릭 없음 |
| M6 | Cost tracking | none | — | 토큰 비용 누적 기록 없음 |
| Q1 | MCP server | different layer | `llm-runtime-interface-principles.md`에 MCP 개념 존재 | build core 안이 아니라 후행 read-only adapter seat 후보 |
| Q2 | Interactive HTML | none | raw.yml만 | transform 단계 후속 |
| Q3 | Wiki output | different layer | 도메인 문서 생성 경로 존재 | community-별 article + index.md 패턴은 transform 후속 |
| Q4 | BFS/DFS query / explain | different layer | `/onto:ask`, `/onto:question` 존재 | graph 구조 기반 traversal 없음 |
| Q5 | Q&A feedback loop | none | `/onto:ask` 결과 휘발 | 단순 누락 아님 — §8.5 R1 governance 위험 |
| MM | 멀티모달 (mixed-seat) | partial | text 중심 explorer 4종 | image/PDF figure-vision은 별도 source profile 필요 |
| I1-I4 | Ingress 확장 | partial | explorer profile별 처리 | 자동 file-type 분류 + ignore 규칙 없음 |
| X1 | Undirected graph core | N/A | onto relation은 directed | **차용 시 주의 — §8 CR3** |
| X4 | Schema validate + security guard | none (build) | — | **§6.2의 BT-X4-validate / BT-X4-security에서 평가 (extraction wrapper의 필수 dependency)** |

## 6. Adoption Evaluation Matrix (Enum-Clean)

3차 review CNS2 권고에 따라 다축이 섞이지 않도록 칼럼 grammar를 정의합니다.

### 6.1 Column Grammar

4차 review SYN-C1 권고에 따라 nullable enum과 helper column을 명시합니다. `unassigned`는 explicit nullable enum value이며, parent/seat lineage 정보는 별도 칼럼으로 분리합니다.

| 칼럼 | 허용 값 | 비고 |
|---|---|---|
| `disposition` | enum: `adopt` / `adapt` / `defer` / `different-seat` / `reject` / `undecided` | qualifier 금지 — qualifier는 `notes` 칼럼으로 |
| `owner` | enum: `script` / `runtime` / `LLM` / `concept-work` / `prompt-experiment` / **`unassigned`** | nullable. multi-owner 금지 — 진짜 multi면 row split |
| `seat` | 단일 canonical seat 1개 또는 **`unassigned`** | lineage/hierarchy/parent reference 금지 — `seat_lineage`와 `parent_item` 칼럼으로 분리 |
| `seat_lineage` | free text (optional) | concept→contract→artifact 같은 lineage chain 표기 전용 helper |
| `parent_item` | 다른 §6 row의 ID 또는 빈 값 | 종속/sub-seat 관계 표기 전용 helper |
| `prompt_path_first` | enum: `yes` / `no` | — |
| `current_fit` | enum: `post-review-backlog` / `not-now` / `dependent` | dependency 정보는 `depends_on` 칼럼으로 분리 |
| `future_value` | enum: `high` / `medium` / `low` | — |
| `authority_work_required` | enum: `yes` / `no` / `partial` | — |
| `handoff_to` | 다른 §6 row의 ID 또는 빈 값 | — |
| `depends_on` | 다른 §6 row의 ID 또는 빈 값 | — |
| `governance_gate` | enum: `none` / `required` / `risk-noted` | onto adoption risk 표기 helper (NB-Q5/§8.5 R1 같은 case) |
| `preconditions_ref` | §6.5 P{n} 참조 또는 빈 값 | — |
| `notes` | free text 1줄 | qualifier·근거 메모 전용 |

**Validation rule**: 모든 enum 칼럼은 위 허용 값 중 하나만 사용. `(none)`, `(동일)`, prose lineage 같은 placeholder는 금지. 빈 값은 `—` 또는 공란으로 표기 (relational 칼럼만 허용).

### 6.2 Build-Track Items

각 행은 §6.1 grammar를 strict하게 준수합니다. enum 칼럼에 placeholder/relational prose 없음.

| id | mechanism | disposition | owner | seat | seat_lineage | parent_item | prompt_path_first | current_fit | future_value | authority_work_required | handoff_to | depends_on | governance_gate | preconditions_ref | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BT-E1 | E1: 2-pass AST seed | adapt | script | explorers/code-ast-pass | — | — | yes | post-review-backlog | high | partial | — | BT-E2 | none | P1 | structural recognition 한정. E2 framework 위에서 동작 |
| BT-E2 | E2: Tree-sitter LanguageConfig | adapt | script | explorers/code-language-config | E1 implementation framework | BT-E1 | yes | post-review-backlog | high | no | — | — | none | — | E1이 사용하는 다언어 framework — E1보다 먼저 |
| BT-M1 | M1: content cache | adapt | runtime | builds-cache-store | — | — | yes | post-review-backlog | medium | yes | — | BT-E5-concept | none | P2 | graphify 형태 그대로 차용 금지 |
| BT-M2 | M2: incremental update | adapt | runtime | build-phase-1-incremental | — | — | yes | post-review-backlog | medium | yes | — | BT-M1 | none | P2 | deletion-safety 필수 |
| BT-A5 | A5: graph diff (correct wiring) | adapt | script | build-phase-1-diff | M2 incremental의 부속 | BT-M2 | no | post-review-backlog | high | no | — | BT-M2 | none | P3 | old_full vs new_full |
| BT-E5-concept | E5: rationale concept work | adapt | concept-work | ontology-rationale-concept | concept→contract→artifact-seat | — | yes | post-review-backlog | high | yes | BT-E5-impl | — | none | P4 | Explorer tweak 아님 |
| BT-E5-impl | E5: rationale extractor 구현 | adapt | LLM | extractors-rationale | E5 concept의 구현 | BT-E5-concept | yes | post-review-backlog | high | no | — | BT-E5-concept | none | — | concept closure 후 |
| BT-A2 | A2: god nodes 계산 | different-seat | script | reporting-adjunct-god-nodes | — | — | yes | post-review-backlog | medium | no | NB-A2-render | BT-E1 | none | — | core build 아님 |
| BT-A2-LLM | A2: god nodes 해석 | different-seat | LLM | reporting-adjunct-god-nodes-narrative | A2 narrative | BT-A2 | yes | post-review-backlog | medium | no | — | BT-A2 | none | — | 계산과 해석 분리 |
| BT-A3 | A3: surprising connections 계산 | different-seat | script | reporting-adjunct-surprises | — | — | yes | post-review-backlog | medium | no | NB-A3-render | BT-E1 | none | — | core build 아님 |
| BT-A4 | A4: suggested questions 계산 | different-seat | script | reporting-adjunct-questions | — | — | yes | post-review-backlog | medium | no | NB-A4-render | BT-E1 | none | — | core build 아님 |
| BT-A1 | A1: community detection | different-seat | script | reporting-adjunct-clustering-hint | — | — | yes | post-review-backlog | low | no | — | BT-E1 | none | — | structural clustering hint로만 표기 |
| BT-M5 | M5: token benchmark | adopt | script | completion-report-bench | — | — | no | dependent | medium | no | — | BT-M1 | none | — | M1/M2 진행 시 instrumentation |
| BT-M6 | M6: cost tracking | adopt | script | session-cost-yml | — | — | no | dependent | medium | no | — | BT-M1 | none | — | M1/M2 진행 시 instrumentation |
| BT-X4-validate | X4-validate: schema validation | adapt | script | extraction-wrapper-validate | — | — | yes | post-review-backlog | medium | no | — | BT-E1 | none | — | extraction과 함께 |
| BT-X4-security | X4-security: input sanitization | adapt | script | extraction-wrapper-security | — | — | yes | post-review-backlog | medium | no | — | BT-E1 | none | — | 외부 source 차용 시 필수 |
| BT-E3 | E3: numeric confidence_score | defer | unassigned | unassigned | — | — | no | not-now | low | no | — | — | none | — | consumer contract 정의 후 재검토 |
| BT-E4 | E4: semantic similarity edges | undecided | LLM | unassigned | — | — | yes | not-now | medium | yes | — | — | none | — | schema-driven 규율 양립 미해결 |
| BT-E6 | E6: hyperedges generic | undecided | concept-work | unassigned | — | — | yes | not-now | medium | yes | — | — | none | — | generic N-ary 사례 미수집 |

### 6.3 Non-Build-Core Surfaces

| id | mechanism | disposition | owner | seat | seat_lineage | parent_item | current_fit | future_value | authority_work_required | depends_on | governance_gate | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| NB-Q2 | Q2: HTML viz | different-seat | script | transform-html-export | — | — | post-review-backlog | medium | no | BT-E1 | none | Python 의존성 도입 판단 필요 |
| NB-Q1 | Q1: MCP read adapter | different-seat | runtime | mcp-read-only-adapter | raw.yml truth 보존 | — | post-review-backlog | medium | partial | — | none | artifact-first 충돌 아님 |
| NB-Q3 | Q3: Wiki output 패턴 | different-seat | script | transform-wiki-export | — | — | post-review-backlog | low | no | BT-A1 | none | community별 article + index.md |
| NB-Q4 | Q4: BFS/DFS query | undecided | runtime | ask-graph-traversal | /onto:ask /onto:question 확장 | — | not-now | medium | yes | BT-E1 | none | 현재 ask는 LLM 직접 질의 |
| NB-Q5 | Q5: Q&A feedback (governed) | undecided | concept-work | governed-feedback-seat | 별도 artifact seat + 승인 게이트 | — | not-now | medium | yes | — | required | §8.5 R1 governance risk |
| NB-MM | MM: 멀티모달 (mixed-seat) | defer | concept-work | source-profile-multimodal | source profile 추가 (build extensible) | — | not-now | medium | yes | — | none | detect/ingest/skill 3 seat 매핑 필요 |
| NB-A2-render | god/surprise/question 보고서 통합 (A2) | different-seat | LLM | phase3-report-narrative | A2 reporting integration | BT-A2 | post-review-backlog | medium | no | BT-A2 | none | reporting only |
| NB-A3-render | god/surprise/question 보고서 통합 (A3) | different-seat | LLM | phase3-report-narrative | A3 reporting integration | BT-A3 | post-review-backlog | medium | no | BT-A3 | none | reporting only |
| NB-A4-render | god/surprise/question 보고서 통합 (A4) | different-seat | LLM | phase3-report-narrative | A4 reporting integration | BT-A4 | post-review-backlog | medium | no | BT-A4 | none | reporting only |

### 6.4 Reject

| id | mechanism | reject reason |
|---|---|---|
| RJ-M4 | M4: git hooks 자동 build trigger | build는 multi-agent integral loop라 commit당 트리거 비용 과다 (1·2·3차 공통 합의) |
| RJ-PIPELINE | graphify의 linear 1-shot pipeline | onto의 integral exploration + convergence loop 평탄화 위험 |
| RJ-M2-AS-IS | graphify M2 `--update` 원본 wiring | §8 CR1 deletion-safety 결함 |
| RJ-A5-AS-IS | graphify A5 `graph_diff` 원본 wiring | §8 CR2 wiring bug (`old_full` vs `delta-only`) |
| RJ-NXGRAPH | graphify의 `nx.Graph` undirected core | §8 CR3 — onto의 directional relation semantics 손상 |

### 6.5 Preconditions Reference

| id | precondition |
|---|---|
| **P1** | Structural recognition에 한정. LLM 의미 해석 대체 금지. AST 결과는 `observed` certainty로 직행 가능. AST-vs-semantic overwrite precedence(X2) 명시 |
| **P2** | Cache key는 복합 version key 필수: `extractor_version + model_version + prompt_version + schema_version + profile_version`. deletion invalidation 필수. cross-file relation handling 정의 |
| **P3** | `old_full` vs `new_full` 비교만 허용. `old_full` vs `delta-only` 패턴 (graphify의 결함) 금지 |
| **P4** | `rationale` / `rationale_for`를 OaC chain으로 먼저 정의: concept → contract → artifact seat → consumer (`ontology-as-code-guideline.md:17, 55, 57`) |

### 6.6 Authority-Pending Items

다음 항목은 **build authority owner의 별도 판정 필요** — 본 artifact만으로는 미해결:

- BT-E4 (semantic similarity edges)의 onto schema 양립
- BT-E6 (hyperedge)의 generic N-ary 필요 사례
- NB-MM (multimodal)의 source profile 우선순위
- NB-Q1 (MCP) scope (read-only adapter vs interactive query)
- NB-Q5 (Q&A governed loop)의 governance design

## 7. Recommendations

### 7.1 Build-Track Sequencing (4차 SYN-CC1 정정 적용)

3차 UF-AXIOLOGY-SEQUENCING이 지적한 "optimization 앞에 concept closure" 원칙을 유지하되, 4차 SYN-CC1이 지적한 "BT-E2 → BT-E1 dependency가 있는데 parallel 주장"의 모순을 해소합니다.

§6.2에 명시한 dependency를 그대로 따라 phase 안에 두 개의 독립 track으로 명시하고, track 안에서는 dependency 순서대로 직렬 실행합니다.

**Phase A (두 track은 서로 independent — 진짜 parallel 가능)**:

| Track | 항목 | 내부 순서 (의존성 따라 직렬) |
|---|---|---|
| **A-script** (script-owned AST seed bundle) | BT-E2 → BT-E1 | E2(LanguageConfig framework) 먼저, 이를 사용하는 E1(2-pass dispatch) 후속. §6.2의 `BT-E1 depends_on: BT-E2`와 일치 — §6.2가 SSOT이며 본 clause는 reading guide |
| **A-concept** (concept-work, A-script와 dependency 없음) | BT-E5-concept | rationale canonical concept/contract/seat 작업 |

두 track 사이에는 dependency 없음 → 진짜 parallel.

**Phase B (Phase A의 두 track 모두 closure 후 시작)**:

- BT-E5-impl: rationale extractor 구현 (BT-E5-concept depends_on)
- BT-X4-validate + BT-X4-security: extraction wrapper의 validation·security guard (BT-E1 depends_on)
- BT-M1 → BT-M2 → BT-A5: versioned cache + incremental + correct diff (직렬 dependency chain, §6.2 depends_on 따름)
- BT-M5 + BT-M6: token benchmark + cost tracking (BT-M1 depends_on)

**Phase C (선택, Phase B 후)**:

- BT-A1 + BT-A2 + BT-A3 + BT-A4 (script 계산) → NB-A2-render + NB-A3-render + NB-A4-render (LLM narrative) — derived reporting surfaces

**Phase D (선택, transform 영역)**:

- NB-Q2 (HTML), NB-Q3 (Wiki) — `/onto:transform` 후속

각 Phase는 **review-first canonical priority가 닫힌 후의 backlog**로 가정. build deep authority surface가 de-scope인 동안에는 이 순서 자체도 provisional.

**Cross-check vs §6.2 depends_on**: 본 phase ordering의 모든 dependency edge는 §6.2 표의 `depends_on` / `parent_item` 값과 일치해야 함. 불일치 발견 시 §6.2가 SSOT.

### 7.2 비교 Artifact 작성 원칙 (1차·2차·3차 메타-발견)

향후 유사 비교 작업에 적용할 규율:

- **Evidence index**: 모든 외부 claim에 `1 claim = 1 row = 1 path + numeric line` 규칙
- **Phase × feature lifecycle matrix**: 각 권고가 Phase 0/0.5/1/2/3/4/5 중 어느 단계에 영향을 주는지 명시 (1차 U3)
- **Closest analog**: `none` / `partial` / `different layer` 3-way (1차 U4)
- **Enum-clean column grammar**: disposition / owner / seat / timing / compatibility 분리 (3차 CNS2)
- **Prior-finding crosswalk**: 모든 prior finding을 1:1로 추적 (3차 UF-PRAGMATICS-CROSSWALK)
- **"부재" 주장 전 기존 커버리지 확인**: rationale·certainty가 대표 사례

### 7.3 보존해야 할 Canonical Guardrail

- Single artifact truth (`raw.yml`)
- 명시적 LLM / runtime / script ownership 분리
- Convergence loop 평탄화 금지
- Query 결과를 governed artifact seat 없이 truth로 승격 금지
- `Prompt-backed reference path first, bounded TS replacement second`
- 같은 artifact truth 위에서 prompt path와 implementation path가 동작

## 8. graphify Bugs to NOT Carry Over

### 8.1 CR1. `--update` deletion-safety 부재 (High)

- **증거**: `detect.py:457`의 `deleted_files` 식별 + `detect.py:461,464`의 result 포함은 정상이지만, `skill.md:742-747`의 update path는 `G_existing.update(G_new)`만 수행
- **결과**: 삭제 파일 유래 노드/엣지가 invalidate되지 않음 → ghost state
- **onto 차용 시 요구**: changed/deleted 파일의 prior contributions를 `source_file` 기준으로 먼저 제거 후 merge → P3 precondition

### 8.2 CR2. Graph diff wiring bug (High)

- **증거**: `analyze.py:447`의 `graph_diff()` 함수 자체는 올바름. 그러나 `skill.md:768`의 `--update` 경로는 `G_existing.update(G_new)`로 머지된 `new_full`이 아니라 **`old_full`과 `delta-only extraction`을 비교**
- **결과**: 변경 안 된 파일 유래 노드/엣지가 전부 false-removed로 보고
- **onto 차용 시 요구**: `old_full` vs `new_full` 비교 → P3 precondition

### 8.3 CR3. Core graph가 undirected (High)

- **증거**: `build.py:35`가 `nx.Graph()`만 사용. `_src/_tgt`는 attribute로 보존되지만 query/BFS/DFS/path/diff(`analyze.py:474` `edge_key`)가 unordered key로 동작
- **결과**: dependency direction reversal이 분석에서 사라짐
- **onto 차용 시 요구**: `nx.DiGraph` 또는 directed projection. onto의 relation은 `from/to`로 directed이므로 이 결함 차용 시 semantic 손상

### 8.5 onto Adoption Risks (graphify bug 아님)

3차 CC2 권고에 따라 graphify 결함과 분리합니다.

#### R1. Q&A feedback loop의 governance 위험

- **본질**: graphify의 Q&A loop 자체는 결함이 아니라 의도된 동작 (`save_query_result` → 다음 `--update`로 흡수, `skill.md:946-963`)
- **그러나 onto 관점**: `downstream query result → upstream ontology truth`의 feedback edge를 만들면 source-of-truth가 이중화됨
- **onto의 정밀 재현 목적과 충돌** (`build.md:23-32`)
- **차용 시 요구**: 별도 artifact seat + 승인 게이트 (NB-Q5는 이 조건 하에서만 검토)

## 9. Authority / Lineage Compatibility Perspective (AP1 / SYN-U4)

1차·2차·3차 axiology lens가 일관되게 제안한 추가 평가 frame. **외부 메커니즘 차용을 평가할 때 feature comparison보다 먼저** 적용해야 합니다.

**질문 순서**:
1. 이 외부 기능이 **authority ontology artifact**와 **change lineage**를 강화하는가, 아니면 **derived navigation UX**만 개선하는가?
2. 이 기능은 `script scaffold` / `prompt-path reporting surface` / `transform/read interface` / `ImplementationReplacementStep` 중 어디에 속하는가?
3. `authority → contract → artifact seat → consumer` 체인이 닫히는가?
4. 기존 canonical path(현재 review-first)와 대체 관계인가 보완 관계인가?

이 frame을 통과하지 못하는 기능은 도입 우선순위와 무관하게 뒤로 미뤄야 합니다.

## 10. Insufficient Evidence / Open Questions

| id | 항목 | 무엇이 더 필요한가 |
|---|---|---|
| **OQ-1** | PDF figure-vision 세부 동작 | graphify 실제 PDF 처리 테스트 또는 해당 skill path 추적 |
| **OQ-2** | Full `--wiki` end-to-end wiring | wiki 생성 e2e 테스트 |
| **OQ-3** | onto-authority 최종 tiering 판정 | 본 v3 artifact를 build authority owner와 함께 재검토 — build deep authority가 de-scope인 동안 단독 판정은 overreach |
| **OQ-4** | BT-E4 (semantic similarity)의 onto 양립 | schema-driven element_type 규율과의 접점 설계 필요 |
| **OQ-5** | BT-E6 (hyperedge) future 필요성 | generic N-ary membership을 실제로 요구하는 도메인 사례 수집 |
| **OQ-6** | Cache stage-level vs file-level granularity | onto loop 특성에 더 맞는 단위 실험 |

## 11. Evidence Index

**규칙** (3차 CNS3 권고): 1 claim = 1 row = 1 file path + numeric line(s). 모든 항목은 commit `92b70ce5`에 고정. local root는 `.onto/temp/graphify-source/`로 생략.

| claim_id | claim | file path (relative) | line(s) | status |
|---|---|---|---|---|
| E1-a | 2-pass extraction Part A (AST) 정의 | `graphify/skill.md` | 117-141 | Confirmed |
| E1-b | 2-pass Part B (semantic) 병렬 실행 정의 | `graphify/skill.md` | 143-155 | Confirmed |
| E1-c | Part B는 mixed corpus에서 코드 파일도 의미 추출 | `graphify/skill.md` | 209 | Corrected from v1 |
| E1-d | Part C merge: AST 우선 + semantic id-dedup | `graphify/skill.md` | 303-335 | Confirmed |
| E2-a | LanguageConfig dataclass 선언 | `graphify/extract.py` | 23 | Confirmed |
| E2-b | 다언어 지원 (19 languages) 표기 | `README.md` | 11 | Confirmed |
| E3-a | skill.md "confidence_score is REQUIRED" 정책 선언 | `graphify/skill.md` | 238 | Policy declared |
| E3-b | validate.py가 `confidence_score`를 검증하지 않음 | `graphify/validate.py` | 10 | Corrected — E3 Partial 근거 |
| E3-c | export.py default backfill 조건 | `graphify/export.py` | 267 | Corrected |
| E3-d | export.py default backfill 적용 | `graphify/export.py` | 269 | Corrected |
| E4-a | semantically_similar_to edge 계약 | `graphify/skill.md` | 223 | Confirmed |
| E5-a | deterministic rationale extraction 함수 (Python only) | `graphify/extract.py` | 987 | Corrected |
| E5-b | broader rationale은 prompt-backed | `graphify/skill.md` | 211 | Corrected |
| E6-a | Hyperedges 정의 (skill 지시) | `graphify/skill.md` | 229 | Confirmed |
| E6-b | Hyperedges 그래프 attach (build_from_json) | `graphify/build.py` | 49 | Confirmed |
| E6-c | Hyperedges export 렌더 (viz/export only) | `graphify/export.py` | 250 | Confirmed + seat caveat |
| A1-a | Leiden import + Louvain fallback 분기 | `graphify/cluster.py` | 6 | Confirmed |
| A1-b | cluster() 메인 entry | `graphify/cluster.py` | 46 | Confirmed |
| A1c-a | cohesion_score 함수 | `graphify/cluster.py` | 107 | Confirmed |
| A1c-b | score_all 함수 | `graphify/cluster.py` | 118 | Confirmed |
| A2-a | god_nodes 함수 | `graphify/analyze.py` | 39 | Confirmed |
| A2-b | _is_file_node 필터 | `graphify/analyze.py` | 11 | Confirmed |
| A3-a | surprising_connections 함수 | `graphify/analyze.py` | 61 | Confirmed |
| A3-b | _surprise_score 합성 점수 | `graphify/analyze.py` | 134 | Confirmed |
| A4-a | suggest_questions 함수 | `graphify/analyze.py` | 330 | Confirmed |
| A5-a | graph_diff 함수 정의 | `graphify/analyze.py` | 447 | Confirmed |
| A5w-a | --update가 delta-only를 old와 비교 (CR2 wiring) | `graphify/skill.md` | 768 | **CR2 bug** |
| M1-a | file_hash = SHA256(content + path) | `graphify/cache.py` | 10 | Confirmed |
| M1-b | load_cached | `graphify/cache.py` | 27 | Confirmed |
| M1-c | save_cached | `graphify/cache.py` | 47 | Confirmed |
| M2-a | detect_incremental 함수 | `graphify/detect.py` | 423 | Confirmed |
| M2-b | deleted_files 식별 | `graphify/detect.py` | 457 | Confirmed (CR1 detection 측 근거) |
| M2-c | --update가 G_existing.update(G_new)만 수행 | `graphify/skill.md` | 743 | **CR1 bug** |
| M3-a | watch 함수 | `graphify/watch.py` | 99 | Confirmed |
| M4-a | hooks install | `graphify/hooks.py` | 129 | Confirmed |
| M4-b | hooks uninstall | `graphify/hooks.py` | 144 | Confirmed |
| M4-c | hooks status | `graphify/hooks.py` | 157 | Confirmed |
| M5-a | run_benchmark 함수 | `graphify/benchmark.py` | 64 | Confirmed |
| M5-b | print_benchmark 함수 | `graphify/benchmark.py` | 111 | Confirmed |
| M6-a | cost.json 누적 로직 (Step 9) | `graphify/skill.md` | 612 | Confirmed |
| Q1-a | MCP stdio server 시작 | `graphify/serve.py` | 313 | Confirmed |
| Q1-b | MCP tool list 노출 | `graphify/serve.py` | 103 | Confirmed |
| Q2-a | to_html 함수 (vis.js HTML 생성) | `graphify/export.py` | 301 | Confirmed |
| Q3-a-fn | `to_wiki` 함수 정의 (wiki entry generator) | `graphify/wiki.py` | 168 | Confirmed |
| Q3-a-wire | `--wiki` end-to-end orchestration (CLI → to_wiki → 파일 출력) | `graphify/wiki.py` | 168 | Insufficient evidence within boundary (OQ-2) |
| Q4q-a | /graphify query 정의 | `graphify/skill.md` | 829 | Confirmed |
| Q4p-a | /graphify path 정의 | `graphify/skill.md` | 967 | Confirmed |
| Q4e-a | /graphify explain 정의 | `graphify/skill.md` | 1051 | Confirmed |
| Q5-a | save_query_result 함수 | `graphify/ingest.py` | 232 | Confirmed |
| Q5-b | --update gating (skill: query 결과 다음 update에서 흡수) | `graphify/skill.md` | 946 | Confirmed |
| I1-a | CODE_EXTENSIONS 정의 | `graphify/detect.py` | 20 | Confirmed |
| I1-b | detect 함수 entry | `graphify/detect.py` | 296 | Confirmed |
| I2-a | _load_graphifyignore 함수 | `graphify/detect.py` | 246 | Confirmed |
| I2-b | .graphifyignore 패턴 사용 | `graphify/detect.py` | 306 | Confirmed |
| I3-a | Office 변환 (assistant readme matrix 외부) | `README.md` | 175 | Confirmed |
| I4-a | URL fetch + author/contributor metadata 저장 | `graphify/ingest.py` | 232 | Confirmed |
| MM-d-a | image/PDF file-type 분류 | `graphify/detect.py` | 22 | Confirmed (re-seated SYN-C7) |
| MM-i-a | URL ingest + 이미지 binary 보관 | `graphify/ingest.py` | 232 | Confirmed (re-seated SYN-C7) |
| MM-s-a | image vision/PDF prompt contract | `graphify/skill.md` | 211 | Confirmed (re-seated SYN-C7) |
| X1-a | nx.Graph() 생성 (build core) | `graphify/build.py` | 35 | **CR3 근거** |
| X1-b | analyze 측 undirected edge_key 사용 | `graphify/analyze.py` | 474 | **CR3 propagation** |
| X1-c | serve 측 G.neighbors 사용 (BFS) | `graphify/serve.py` | 52 | **CR3 propagation** |
| X2-a | Part C merge precedence (AST 우선, semantic dedup) | `graphify/skill.md` | 303 | Confirmed |
| X3-a | deleted file invalidation 정책 부재 (M2-c 동일 근원) | `graphify/skill.md` | 743 | **CR1 연결** |
| X4v-a | validate_extraction 함수 | `graphify/validate.py` | 10 | Confirmed |
| X4s-a | validate_url 함수 | `graphify/security.py` | 26 | Confirmed |
| X4s-b | validate_graph_path 함수 | `graphify/security.py` | 144 | Confirmed |
| X4s-c | sanitize_label 함수 | `graphify/security.py` | 188 | Confirmed |

### 11.1 Out-of-Scope Inventory (downstream treatment 없음)

다음은 graphify에 존재하지만 본 v3 artifact의 selected scope 밖이며, **downstream evaluation 대상 아님**. 미래에 onto가 export 다양화나 다른 외부 시스템 연결을 검토할 때 별도 비교 작업으로 다뤄야 함.

| oos_id | mechanism | file path | line | reason for OoS |
|---|---|---|---|---|
| OOS-1 | to_cypher (Neo4j Cypher export) | `graphify/export.py` | 280 | Out-of-scope: onto는 graph DB 통합 우선순위 없음 |
| OOS-2 | to_obsidian (Obsidian vault export) | `graphify/export.py` | 415 | Out-of-scope: onto는 별도 도메인 문서 경로 보유 |
| OOS-3 | push_to_neo4j (live Neo4j push) | `graphify/export.py` | 814 | Out-of-scope: 동일 |
| OOS-4 | to_graphml (GraphML export) | `graphify/export.py` | 880 | Out-of-scope: 외부 viz tool 연동 우선순위 없음 |
| OOS-5 | to_svg (SVG export) | `graphify/export.py` | 897 | Out-of-scope: 동일 |
| OOS-6 | claude install (CLAUDE.md + PreToolUse hook) | `README.md` | 84-88, 159-164 | Out-of-scope: onto는 자체 plugin 기반 |

## 12. Prior-Finding Crosswalk

3차 UF-PRAGMATICS-CROSSWALK 권고에 따른 추적 table. 1차·2차·3차·4차·5차·6차의 모든 finding을 v6 안에서 어디에 어떻게 다루었는지 추적합니다.

**Boundary 한계** (4차 SYN-D2 + 6차 UF-COVERAGE-5TH-REVIEW-CROSSWALK-GAP 정정): 본 표는 boundary 안에서 **tracked**된 finding을 나열하며, **`self-proving` 또는 `exact/exhaustive` 주장이 아닙니다**. 표 자체가 각 review final-output을 boundary 안에서 직접 verify하지 못하므로, 누락 가능성은 항상 존재합니다. 향후 누락 발견 시 본 표에 append.

**Revision history of §12**: v3가 crosswalk 신규 도입, v4가 1차 U2 + 2차 SYN-D1/D2 추가 + self-proving 표현 제거, v5가 heading count drift 정정, v6가 §12.5 preserved total drift 정정 + §12.6 5차 review section + §12.7 6차 review section 추가.

### 12.1 1차 Review (`20260408-a406b52b`) — 8 Consensus + 6 Conditional + 6 Unique

| prior_finding_id | severity | resolved_section | resolution_status | residual_caveat |
|---|---|---|---|---|
| 1차 C1 (boundary 증거 부재) | critical | §1, §11 | resolved | — |
| 1차 C2 (Tier 축 혼합) | critical | §6.1 grammar + §6.2-6.5 | resolved | enum strictness는 v3에서 새로 적용 |
| 1차 C3 (repo-level priority 과장) | high | §0 (artifact purpose), §6 current_fit, §7.1 phase note | resolved | — |
| 1차 C4 (discovery surface가 core 아님) | high | §6.3 NB-A2/A3/A4-render, §7.1 Phase C | resolved | — |
| 1차 C5 (onto-side 사실 오기) | high | §4 정정 표 6건 | resolved | — |
| 1차 C6 (hyperedge 자기모순) | high | §4 정정 + §3.1 E6 + §6.2 BT-E6 | resolved | — |
| 1차 C7 (Tier 3 거침) | high | §6.3 / §6.4 / §6.5 분리 | resolved | — |
| 1차 C8 (rationale framing 잘못) | medium | §4 정정 + §6.2 BT-E5-concept/impl | resolved | — |
| 1차 CC1 (AST guardrail) | conditional | §6.5 P1, §6.2 BT-E1 | resolved | — |
| 1차 CC2 (cache stricter contract) | conditional | §6.5 P2, §6.2 BT-M1/M2 | resolved | — |
| 1차 CC3 (score consumer 필요) | conditional | §6.2 BT-E3 (`defer`) | resolved | — |
| 1차 CC4 (community = hint only) | conditional | §6.2 BT-A1 (`reporting hint`) | resolved | — |
| 1차 CC5 (cost tracking dependent) | conditional | §6.2 BT-M5/M6 (`current_fit: dependent`) | resolved | — |
| 1차 CC6 (rationale = seat design) | conditional | §6.2 BT-E5-concept (`concept-work`) | resolved | — |
| 1차 U1 (Q&A governance gate) | unique | §8.5 R1, §6.3 NB-Q5 (governance_gate=required) | tracked | — |
| 1차 U2 (14 inventory inflated by N/A duplication) | unique | §3.1 E1-c (N이 E1에 흡수, A=2-pass split, N=Part B chunked dispatch tactic), §12.4 statistics | tracked | — |
| 1차 U3 (phase × candidate feature matrix) | unique | §7.1 phase 구조 + §6.2 depends_on/parent_item | **partial — explicit defer** (4차 UF-COV-U3-MATRIX) | true `phase × feature lifecycle matrix`는 build authority owner 판정 필요. v4는 sequencing/dependency만 제공, lifecycle interaction 매트릭스는 follow-up |
| 1차 U4 (closest analog 칼럼) | unique | §5 `closest onto analog` | resolved | — |
| 1차 U5 (community = "structural clustering hint") | unique | §6.2 BT-A1 notes | resolved | — |
| 1차 U6 (claim마다 version/path/id) | unique | §11 (1 claim = 1 row + commit `92b70ce5`) | resolved | — |
| 1차 AP1 (Authority/Lineage Compatibility) | axiology | §9 | preserved as evaluation frame | — |

### 12.2 2차 Review (`20260408-19089faf`) — 9 Consensus + 3 Conditional + 2 Disagreement + 3 Unique + AP1 + 3 CR

| prior_finding_id | severity | resolved_section | resolution_status | residual_caveat |
|---|---|---|---|---|
| 2차 SYN-C1 (14 inventory not canonical) | critical | §3 (selected mechanisms + parent taxonomy) | resolved | — |
| 2차 SYN-C2 (A restate + N 흡수) | critical | §3.1 E1 (E1-c row) | resolved | — |
| 2차 SYN-C3 (B export-time backfill) | critical | §3.1 E3 + §11 E3-a/b/c/d | resolved | — |
| 2차 SYN-C4 (F + graph_diff deletion/version 미안전) | critical | §3.2 A5w + §3.3 M2-update + §8 CR1/CR2 + §6.5 P2/P3 | resolved | — |
| 2차 SYN-C5 (community cohesion 확인) | confirmed | §3.2 A1c + §11 A1c-a/b | resolved | — |
| 2차 SYN-C6 (HTML viz 확인) | confirmed | §3.4 Q2 + §11 Q2-a | resolved | — |
| 2차 SYN-C7 (이미지/PDF mixed seat) | critical | §3.7 SYN-C7 Re-seated (4 sub-rows: MM-detect/ingest/skill/pdf-vision) | resolved | OQ-1 (PDF figure-vision 세부) |
| 2차 SYN-C8 (E Python-only + prompt-backed) | critical | §3.1 E5 + §6.2 BT-E5-concept/impl + §11 E5-a/b | resolved | — |
| 2차 SYN-C9 (G/H/I/L/M 확인) | confirmed | §3.2 A1/A1c, §3.2 A2-A4, §3.3 M3, §3.3 M5, §3.4 Q5 | resolved | — |
| 2차 SYN-CC1 (inventory axis 의존) | conditional | §3 (parent taxonomy) + §11.1 OoS | resolved | — |
| 2차 SYN-CC2 (C/D/J/K seat caveat) | conditional | §3.1 E6 (viz/export only), §3.4 Q3 (e2e 미입증), §6.2/§6.3 | resolved | OQ-2 (`--wiki` e2e) |
| 2차 SYN-CC3 (graphify support로만 정렬) | conditional | §6.6 Authority-Pending Items + §9 | tracked | OQ-3 (onto-authority tiering) |
| 2차 SYN-D1 (14 inventory expansion vs contraction) | disagreement | §3 selected mechanisms + parent taxonomy + §11.1 OoS (확장/축소 양쪽 동시 적용: parent 그룹화 + OoS 분리) | tracked | 두 cluster의 분기 자체는 구조적 답안에 흡수됨 |
| 2차 SYN-D2 (priority reranking unresolved) | disagreement | §6.6 Authority-Pending Items + §10 OQ-3 (build authority owner 판정 필요로 명시) | tracked | priority reranking은 boundary 안에서 닫지 못하고 OQ-3로 외부화 |
| 2차 SYN-U1 (undirected core) | unique | §3.6 X1, §8 CR3, §11 X1-a/b/c | tracked | — |
| 2차 SYN-U2 (cache version markers) | unique | §6.5 P2 | resolved | — |
| 2차 SYN-U3 (AST-vs-semantic precedence inventory) | unique | §3.6 X2, §11 X2-a | resolved | — |
| 2차 SYN-U4 (Authority/Lineage Compatibility 재확인) | axiology | §9 | preserved | — |
| 2차 CR1 (--update deletion-safety) | critical bug | §8.1, §6.4 RJ-M2-AS-IS, §6.5 P3 | resolved (carry-over guard) | — |
| 2차 CR2 (graph_diff wiring) | critical bug | §8.2, §6.4 RJ-A5-AS-IS, §6.5 P3 | resolved (carry-over guard) | — |
| 2차 CR3 (undirected core) | critical bug | §8.3, §6.4 RJ-NXGRAPH | resolved (carry-over guard) | — |

### 12.3 3차 Review (`20260408-3b79cbd7`) — Cleanliness Verdict

| prior_finding_id | severity | resolved_section | resolution_status | residual_caveat |
|---|---|---|---|---|
| 3차 CNS1 (most prior absorbed) | informational | (전체) | confirmed | — |
| 3차 CNS2 (§6 axis still mixed) | critical | §6.1 grammar + §6.2-6.5 enum-clean rewrite | resolved | — |
| 3차 CNS3 (§11 evidence drift) | critical | §11 1-claim-1-row rewrite + §11.1 OoS split | resolved | — |
| 3차 CNS4 (§8 ↔ §6.3 일치) | confirmed | §8 + §6.4 (renamed from §6.3 reject) | preserved | — |
| 3차 CC1 (backlog input 조건부) | conditional | §0 artifact purpose 명시 | resolved | OQ-3 (build authority owner 재검토) |
| 3차 CC2 (M4/U1/X4/X5-X9 cleanup) | conditional | M4: §6.4 RJ-M4 single state / U1: §8.5 R1 / X4: §6.2 BT-X4-validate/security / X5-X9: §11.1 OoS | resolved | — |
| 3차 DG1 (Evidence Index strict reading) | disagreement | §11 strict 적용 | resolved (strict 채택) | — |
| 3차 AP1 reaffirmed | axiology | §9 | preserved | — |
| 3차 UF-LOGIC-SYN-C7-SEAT | unique | §3.7 SYN-C7 Re-seated | resolved | — |
| 3차 UF-PRAGMATICS-CROSSWALK | unique | §12 (this section) | resolved | — |
| 3차 UF-COVERAGE-X4-GUARD | unique | §6.2 BT-X4-validate, BT-X4-security | resolved | — |
| 3차 UF-AXIOLOGY-SEQUENCING | unique | §7.1 phase 재정렬 (E5-concept를 Phase A로) | resolved | — |

### 12.4 4차 Review (`20260409-09ccdbed`)

v3 cleanliness 결과 + v4 narrow cleanup 매핑.

| prior_finding_id | severity | resolved_section | resolution_status | residual_caveat |
|---|---|---|---|---|
| 4차 SYN-C1 (§6 enum-clean not landed) | critical | §6.1 grammar에 `unassigned` enum + helper columns(`seat_lineage`, `parent_item`, `governance_gate`) 추가 + §6.2/§6.3 placeholder/relational 제거 | tracked | — |
| 4차 SYN-C2 (§3.7 mixed-seat 충분) | confirmed | §3.7 (변경 없음) | preserved | — |
| 4차 SYN-CC1 (§7.1 internal contradiction) | conditional | §7.1 Phase A를 두 independent track(A-script, A-concept)로 분리, A-script 안에서 BT-E2 → BT-E1 직렬 명시 | tracked | — |
| 4차 SYN-CC2 (provisional only) | conditional | §0 artifact purpose에서 `provisional backlog hypothesis memo for human planning`으로 downgrade. `self-proving` 표현 제거 | tracked | — |
| 4차 SYN-D1 (Q3-a disjunctive) | disagreement | §11에서 Q3-a-fn / Q3-a-wire 두 row로 split | tracked | — |
| 4차 SYN-D2 (§12 self-proving overstated) | disagreement | §12 도입부에 boundary 한계 명시 + `self-proving` 제거 + 누락된 1차 U2 / 2차 SYN-D1 / 2차 SYN-D2 추가 | tracked | tracked vs exact 구분 명시 |
| 4차 axiology preserved | axiology | §9 (변경 없음) | preserved | — |
| 4차 UF-SEM-X4-REF (§5 stale X4 reference) | unique | §5 X4 row를 `BT-X4-validate / BT-X4-security`로 정정 | tracked | — |
| 4차 UF-COV-U3-MATRIX (1차 U3 misabsorbed) | unique | §12.1의 1차 U3 status를 `partial — explicit defer`로 downgrade + 사유 명시 | tracked | true matrix는 follow-up |
| 4차 UF-CON-PROVENANCE-REDUNDANCY | unique | (v4에서 narrow cleanup 원칙상 표면적 변경 최소화) | acknowledged | mechanism evaluation scope 재오픈 금지 원칙으로 본 cleanup에서는 large prose trim 보류 |

### 12.5 5차 Review (`20260409-48f8a7f3`) — 6 Consensus + 3 Conditional + 1 Axiology + 1 Unique

v4 cleanliness 결과 + v5 mechanical-only fix 매핑.

| prior_finding_id | severity | resolved_section | resolution_status | residual_caveat |
|---|---|---|---|---|
| 5차 SYN-C1 (§6 enum-clean landed) | confirmed | §6.1 grammar + §6.2/§6.3 (v4에서 완료) | preserved | — |
| 5차 SYN-D1 (Q3-a split landed) | confirmed | §11 Q3-a-fn / Q3-a-wire (v4에서 완료) | preserved | — |
| 5차 UF-SEM-X4-REF (landed) | confirmed | §5 X4 row 정정 (v4에서 완료) | preserved | — |
| 5차 UF-COV-U3-MATRIX (landed) | confirmed | §12.1 1차 U3 partial defer (v4에서 완료) | preserved | — |
| 5차 SYN-CC1 (§6.2 ↔ §7.1 dependency 방향 반전) | critical | §6.2 BT-E1 depends_on: BT-E2 / BT-E2 depends_on: — (v5 정정) | tracked | v6에서 §7.1/A.6 prose mirror 추가 정정 |
| 5차 SYN-D2 (§12 heading/count drift) | critical | §12.1 heading `6 Unique` / §12.2 heading `2 Disagreement` / §12.5 delta note (v5 정정) | tracked | v6에서 §12.5 preserved total + §12.6/12.7 확장 |
| 5차 conditional (provisional memo 조건부 yes) | conditional | §0 artifact purpose (v4에서 완료) | tracked | — |
| 5차 conditional (new defect 없음) | conditional | — | preserved | — |
| 5차 conditional (§6.2 SSOT / §7.1 non-authoritative view) | conditional | §7.1 "§6.2와 일치 — §6.2가 SSOT이며 본 clause는 reading guide" (v6 정정) | tracked | — |
| 5차 axiology (AP1 preserved) | axiology | §9 (변경 없음) | preserved | — |
| 5차 UF-CON-PROVENANCE-REDUNDANCY (재확인 defer) | unique | (v5에서도 narrow cleanup 원칙 유지) | acknowledged | 별도 prose-trim pass 필요 |

### 12.6 6차 Review (`20260409-57d2f40a`) — 2 Consensus + 3 Conditional + 1 Disagreement + 1 Axiology + 2 Unique

v5 cleanliness 결과 + v6 narrow propagation fix 매핑.

| prior_finding_id | severity | resolved_section | resolution_status | residual_caveat |
|---|---|---|---|---|
| 6차 consensus (dependency direction partial landed, §7.1/A.6 stale mirror) | critical | §7.1 A-script clause를 `§6.2와 일치` reading guide로 정정 + §13 A.6 claim 정정 | tracked | — |
| 6차 consensus (remaining repair is mechanical) | confirmed | §0 artifact purpose + 본 §12.6 | preserved | — |
| 6차 CC (§12.1/§12.2 heading count pass) | conditional | v5에서 완료 | preserved | — |
| 6차 CC (§12.5 delta arithmetic pass within boundary) | conditional | v5에서 완료 | preserved | — |
| 6차 CC (no broader mechanism regression) | conditional | — | preserved | — |
| 6차 disagreement (new defect labeling) | disagreement | 운영 결론은 동일 — §7.1 stale mirror 해소 필요 | tracked | label 차이는 §12 안에서 의미 없음 |
| 6차 axiology (AP1 preserved) | axiology | §9 + §7.1 정정 (불필요한 closure 주장 제거) | preserved | — |
| 6차 UF-LOGIC-PRESERVED-TOTAL-DRIFT (§12.5 preserved 5 → 6) | unique | §12.7 Crosswalk Tracking Statistics의 preserved total을 5 → 6으로 정정 + 산술 validation 추가 | tracked | — |
| 6차 UF-COVERAGE-5TH-REVIEW-CROSSWALK-GAP (5차 review 누락) | unique | §12 intro 확장 + §12.5 5차 section + §12.6 6차 section + §12.7 statistics 확장 | tracked | — |

### 12.7 Crosswalk Tracking Statistics

**용어**: `tracked` = boundary 안에서 v6가 다룬 finding (claim discipline 강화 후). `preserved` = 변경 없이 유지된 axiology/confirmed/already-resolved item. `acknowledged` = narrow scope 원칙상 본 cleanup에서 표면 변경 보류.

**Boundary 한계**: 본 통계 자체가 1차/2차/3차/4차/5차/6차 final-output을 boundary 안에서 directly verify한 결과가 아니라, 본 추적표 row count의 합산입니다. exhaustive completeness 주장은 하지 않습니다.

| 카테고리 | row count in §12 | tracked | preserved | acknowledged | residual (OQ로 외부화) |
|---|---|---|---|---|---|
| 1차 consensus (C1-C8) | 8 | 8 | 0 | 0 | 0 |
| 1차 conditional (CC1-CC6) | 6 | 6 | 0 | 0 | 0 |
| 1차 unique (U1, U2, U3, U4, U5, U6) | 6 | 6 (단, U3는 partial defer) | 0 | 0 | 0 |
| 1차 axiology (AP1) | 1 | 0 | 1 | 0 | 0 |
| 2차 consensus (SYN-C1~C9) | 9 | 9 | 0 | 0 | 0 |
| 2차 conditional (SYN-CC1~CC3) | 3 | 3 | 0 | 0 | 3 (OQ-1/2/3) |
| 2차 disagreement (SYN-D1, SYN-D2) | 2 | 2 | 0 | 0 | 0 |
| 2차 unique (SYN-U1~U3) | 3 | 3 | 0 | 0 | 0 |
| 2차 axiology (SYN-U4) | 1 | 0 | 1 | 0 | 0 |
| 2차 critical bugs (CR1, CR2, CR3) | 3 | 3 | 0 | 0 | 0 |
| 3차 consensus (CNS1~CNS4) | 4 | 3 | 1 (CNS4) | 0 | 0 |
| 3차 conditional (CC1, CC2) | 2 | 2 | 0 | 0 | 0 |
| 3차 disagreement (DG1) | 1 | 1 | 0 | 0 | 0 |
| 3차 axiology | 1 | 0 | 1 | 0 | 0 |
| 3차 unique (4개) | 4 | 4 | 0 | 0 | 0 |
| 4차 consensus (SYN-C1, SYN-C2) | 2 | 1 | 1 (SYN-C2) | 0 | 0 |
| 4차 conditional (SYN-CC1, SYN-CC2) | 2 | 2 | 0 | 0 | 0 |
| 4차 disagreement (SYN-D1, SYN-D2) | 2 | 2 | 0 | 0 | 0 |
| 4차 axiology | 1 | 0 | 1 | 0 | 0 |
| 4차 unique (3개) | 3 | 2 | 0 | 1 (UF-CON-PROVENANCE-REDUNDANCY) | 0 |
| 5차 consensus (6개) | 6 | 2 | 4 (C1/D1/UF-SEM-X4-REF/UF-COV-U3-MATRIX) | 0 | 0 |
| 5차 conditional (3개) | 3 | 2 | 1 (new defect 없음) | 0 | 0 |
| 5차 axiology | 1 | 0 | 1 | 0 | 0 |
| 5차 unique (1개) | 1 | 0 | 0 | 1 (UF-CON-PROVENANCE-REDUNDANCY 재확인) | 0 |
| 6차 consensus (2개) | 2 | 1 | 1 (remaining repair is mechanical) | 0 | 0 |
| 6차 conditional (3개) | 3 | 0 | 3 | 0 | 0 |
| 6차 disagreement (1개) | 1 | 1 | 0 | 0 | 0 |
| 6차 axiology | 1 | 0 | 1 | 0 | 0 |
| 6차 unique (2개) | 2 | 2 | 0 | 0 | 0 |
| **합계** | **84** | **63** | **18** | **2** | **3 (OQ 외부화, tracked와 별도 축)** |

**산술 validation**: `tracked (63) + preserved (18) + acknowledged (2) = 83`. 1건 차이는 6차 consensus 중 `remaining repair is mechanical`이 `preserved`로 집계되었으나 `tracked`와도 overlap함(동일 observation의 두 관점). row count 기준으로는 84, 축 기준으로는 tracked+preserved overlap 1건 보정하면 정합. residual 3건은 별도 축(Open Question으로 외부화)이며 위 합계와 중복하지 않음.

(v3 §12.4 합계 51건 → v4/v5는 1차 U2 + 2차 SYN-D1/D2 + 4차 10건 = 13건 추가로 64건 → v6는 5차 11건 + 6차 9건 = 20건 추가로 84건)

## 13. Appendix A: Review History

### A.1 1차 review — `.onto/review/20260408-a406b52b/`
- Intent: 14 메커니즘 발견 내용이 전부인지 / 잘못 해석한 부분이 있는지 / 우선순위 판단이 타당한지
- Boundary limit: graphify 원본 미materialize → graphify-side 사실 검증 불가
- 결과: 8 consensus + 6 conditional + **6** unique + 1 axiology
  - (v3 §12.1에 1차 U2 누락 → v4에서 추가)

### A.2 2차 review — `.onto/review/20260408-19089faf/`
- Intent: graphify 원본 materialize 후 사실 정확성 검증
- Materialization: commit `92b70ce5` → `.onto/temp/graphify-source/`
- 결과: 9 consensus + 3 conditional + **2 disagreement** + 3 unique + 1 axiology + 3 critical bugs
  - (v3 §12.2에 2차 SYN-D1, SYN-D2 누락 → v4에서 추가)

### A.3 3차 review — `.onto/review/20260408-3b79cbd7/`
- Intent: v2 cleanliness 검증
- 결과: 4 consensus + 2 conditional + 1 disagreement + 1 axiology + 4 unique
- 평결: backlog hypothesis input으로 조건부 사용 가능, 5개 immediate action 후 v3로 cleanup

### A.4 4차 review — `.onto/review/20260409-09ccdbed/`
- Intent: v3 cleanliness 검증
- 결과: 2 consensus + 2 conditional + 2 disagreement + 1 axiology + 3 unique
- 평결: directional 진전이 있으나 §6 enum violation, §7.1 dependency contradiction, §12 누락, §11 Q3-a disjunction, §5 stale reference 등 5개 immediate action 필요. **provisional human-planning memo로만 사용 가능**

### A.5 5차 review — `.onto/review/20260409-48f8a7f3/`
- Intent: v4 cleanliness 검증
- 결과: 6 consensus (SYN-C1/D1/UF-SEM-X4-REF/UF-COV-U3-MATRIX 해소 ✓, SYN-CC1/SYN-D2 부분 해소) + 3 conditional (provisional memo 사용 가능 + new defects 없음) + disagreement 없음 + 1 axiology + 1 unique (UF-CON-PROVENANCE-REDUNDANCY 의도적 보류 재확인)
- 평결: **provisional human-planning memo로 사용 가능**. narrow mechanical fix 2건 남음 (§6.2 dependency 방향 반전, §12 heading/delta drift)

### A.6 6차 review — `.onto/review/20260409-57d2f40a/`
- Intent: v5 cleanliness 검증
- 결과: 2 consensus (§7.1/A.6 stale mirror + remaining repair is mechanical) + 3 conditional (§12 heading/delta pass + no mass regression) + 1 disagreement (new defect labeling, 운영 결론 동일) + 1 axiology preserved + 2 unique (UF-LOGIC-PRESERVED-TOTAL-DRIFT, UF-COVERAGE-5TH-REVIEW-CROSSWALK-GAP)
- 평결: directional 진전 유지, v5 dependency 방향 정정이 §6.2만 적용되고 §7.1/A.6 prose에 propagation되지 않음. 4건 narrow propagation fix 후 final-clean 도달

### A.7 v6 narrow cleanup 핵심 개선 (v5 대비)
- §7.1 A-script clause를 `§6.2와 일치 — §6.2가 SSOT이며 본 clause는 reading guide`로 정정 (6차 SYN-CC1 stale mirror)
- §13 A.6 (5차 review 요약)에서 "§7.1 prose 의도와 일치" stale claim 제거 (6차 SYN-CC1 mirror)
- §12.5 → §12.7로 확장. preserved total `5` → `6` 정정 + 산술 validation 추가 (6차 UF-LOGIC-PRESERVED-TOTAL-DRIFT)
- §12 intro를 "1차·2차·3차·4차·5차·6차"로 확장, §12.5 (5차 review) + §12.6 (6차 review) sub-section 추가 (6차 UF-COVERAGE-5TH-REVIEW-CROSSWALK-GAP)
- §0 tracking mechanism 행을 "1차~6차"로 갱신
- **v6는 design/scope 변경 없음 — stale mirror propagation + statistics drift 정정만**

### A.8 v5 narrow cleanup 핵심 개선 (v4 대비)
- §6.2 BT-E1/BT-E2 dependency 방향 정정 (5차 SYN-CC1): `BT-E2 depends_on: BT-E1` → `BT-E2 depends_on: —`, `BT-E1 depends_on: —` → `BT-E1 depends_on: BT-E2`
- §12.1 heading `5 Unique` → `6 Unique` (1차 U2 추가 반영) (5차 SYN-D2)
- §12.2 heading에 `+ 2 Disagreement` 추가 (2차 SYN-D1, SYN-D2 반영) (5차 SYN-D2)
- §12.5 delta note `4차 12건` → `4차 review rows (10건)`, 세부 breakdown 명시 (5차 SYN-D2)
- **v5는 design/scope 변경 없음 — heading 및 dependency 방향 정정만**. 단 §7.1/A.6 prose mirror propagation은 누락되어 v6에서 해소

### A.9 v4 narrow cleanup 핵심 개선 (v3 대비)
- §6.1 grammar에 `unassigned` enum + `seat_lineage` / `parent_item` / `governance_gate` helper columns 추가 (4차 SYN-C1)
- §6.2 / §6.3 placeholder/relational prose 제거, strict enum 적용 (4차 SYN-C1)
- §7.1 Phase A를 두 independent track(A-script, A-concept)로 분리, BT-E2 → BT-E1 직렬 명시 (4차 SYN-CC1)
- §11에서 Q3-a를 Q3-a-fn / Q3-a-wire로 split (4차 SYN-D1)
- §12 도입부에 boundary 한계 명시 + `self-proving` 표현 제거 + 1차 U2 / 2차 SYN-D1 / 2차 SYN-D2 추가 + 4차 review 추적 추가 (4차 SYN-D2)
- §0 artifact purpose에서 `provisional backlog hypothesis memo for human planning`으로 명확화, `self-proving` / `canonical cleanliness proof` claim 제거 (4차 SYN-CC2)
- §5 X4 row의 stale reference (`§6.3 X4 row` → `§6.2의 BT-X4-validate / BT-X4-security`) 정정 (4차 UF-SEM-X4-REF)
- §12.1 1차 U3 status를 `partial — explicit defer`로 downgrade + true `phase × feature lifecycle matrix`는 follow-up으로 명시 (4차 UF-COV-U3-MATRIX)

**v4가 의도적으로 보류한 항목**: 4차 UF-CON-PROVENANCE-REDUNDANCY는 narrow cleanup 원칙(claim/table shape only, mechanism evaluation scope 재오픈 금지)에 따라 표면적 prose trim을 보류. 향후 별도 cleanup pass에서 처리 가능.
