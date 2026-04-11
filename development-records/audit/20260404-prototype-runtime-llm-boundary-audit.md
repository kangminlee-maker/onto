# Prototype Runtime-LLM Boundary Audit

> 상태: Active
> 목적: 현재 `onto` 메인 레포의 프로토타입 구성요소를 `LLM 소유 (LLM-owned)`, `runtime 소유 (runtime-owned)`, `혼합 (mixed)`으로 분류하여 서비스 치환의 기준선을 고정한다.
> 기준 문서:
> - `dev-docs/ontology-as-code-naming-charter.md`
> - `authority/core-lexicon.yaml`

---

## 1. Why This Audit Exists

현재 `onto` 메인 레포는 `commands/`, `processes/`, `roles/` 중심의 프롬프트 실행형 프로토타입이다.

이 레포를 서비스로 치환할 때 가장 중요한 질문은 아래다.

- 어떤 책임이 실제로 `LLM`이 맡아야 하는가?
- 어떤 책임은 runtime이 맡아야 하는가?
- 어떤 책임은 `호출 해석 (InvocationInterpretation)`과 `호출 고정 (InvocationBinding)`처럼 경계가 분리되어야 하는가?

이 문서는 그 질문에 대한 현재 기준선을 제공한다.

---

## 2. Classification Rule

### 2.1 `LLM 소유 (LLM-owned)`

아래 성격을 가지면 `LLM` 소유다.

- 의미 해석이 필요하다
- 비정형 입력을 다룬다
- 복수의 타당한 해석 중 하나를 선택해야 한다
- 판단 근거를 문맥과 목적에 비추어 종합해야 한다

예:

- 사용자(=주체자)의 자연어 요청에서 실제 의도를 해석
- 어떤 관점의 리뷰가 필요한지 판단
- 구조적 모순, 의미적 갭, 정책 리스크를 판단
- `build`에서 delta의 의미를 ontology element로 해석

### 2.2 `runtime 소유 (runtime-owned)`

아래 성격을 가지면 runtime 소유다.

- 명시적 입력을 고정된 규칙으로 처리 가능하다
- path, ref, schema, 파일시스템, persistence 같은 closed-world 작업이다
- 해석이 아니라 검증/고정/기록/보존이 목적이다

예:

- 세션 ID 생성
- 디렉터리 생성
- config 파일 읽기
- backup/restore 수행
- manifest 작성
- artifact 저장

### 2.3 `혼합 (mixed)`

하나의 사용자(=주체자) 기능 안에 `LLM` 단계와 runtime 단계가 함께 있으면 `혼합`이다.

대표 예:

- `도메인 선택`: 추천은 `LLM`, 실제 도메인 목록 수집과 선택값 고정은 runtime
- `검토 (review)`: 관점 판단과 발견은 `LLM`, 세션/결과 기록은 runtime
- `구축 (build)`: 소스 탐색의 의미 해석은 `LLM`, raw artifact 저장은 runtime

---

## 3. Current Prototype Boundary Map

### 3.1 Top-Level Asset Groups

| 자산 그룹 | 현재 역할 | 현재 분류 | 이유 | 대표 파일 |
|---|---|---|---|---|
| `commands/` | host-facing 호출 표면 | 혼합 | 사용자(=주체자)가 보는 진입점이지만, 현재는 프롬프트 지시와 실행 규칙이 뒤섞여 있다 | `commands/review.md`, `commands/build.md` |
| `process.md` | 공통 실행 규칙, 에이전트 정의, 도메인 규칙 | 혼합 | 개념 SSOT와 실행 규칙이 함께 있다. 일부는 runtime화 가능, 일부는 `LLM` 지시다 | `process.md` |
| `processes/` | 실제 작업 절차 정의 | 대부분 혼합 | 절차 안에 의미 판단과 파일시스템 조작이 모두 섞여 있다 | `processes/review.md`, `processes/build.md`, `processes/promote.md` |
| `roles/` | 관점별 전문성 정의 | `LLM` 소유 | 전문 관점과 핵심 질문은 의미 판단 그 자체다 | `roles/onto_logic.md`, `roles/onto_axiology.md`, `roles/onto_synthesize.md` |
| 도메인 문서 및 학습 파일 | 검토/구축의 기준 지식 | 혼합 | 내용은 `LLM`이 읽고 판단하지만, 저장 위치/승격/보존은 runtime화 가능하다 | `~/.onto/domains/*`, `~/.onto/learnings/*` |
| backup/restore/health 류 프로세스 | 운영 보조 기능 | runtime 소유 | 의미 판단보다 파일시스템/집계/보존이 핵심이다 | `processes/backup.md`, `processes/restore.md`, `processes/health.md` |

### 3.2 Entrypoint-by-Entrypoint Classification

| 진입점 (entrypoint) | 현재 분류 | 핵심 `LLM` 책임 | 핵심 runtime 책임 | 비고 |
|---|---|---|---|---|
| `검토 (review)` | 혼합 | 대상 의미 해석, 복잡도 판단, lens별 발견, 종합 | 세션 path, config 읽기, artifact 저장, retry, 결과 고정 | 첫 제품화 대상 |
| `구축 (build)` | 혼합 | source 해석, delta 의미화, label/epsilon 제안, 수렴 판단 | 탐색 세션 관리, raw ontology 저장, schema 파일 관리 | `review` 다음 핵심 대상 |
| `질의 (ask)` | 혼합 | 질문 해석, 단일 관점 판단 | 에이전트 선택 고정, context 수집, 결과 저장 | `review`보다 단순 |
| `학습 (learn)` | 혼합 | 학습 가치 판단, candidate 정리, 중복 해석 | 파일 저장, lineage 연결, 상태 관리 | 현재 프로토타입에서는 `promote`/`feedback`에 흩어져 있음 |
| `운영 결정 (govern)` | 혼합 | 승격 판단, 퇴역 판단, 충돌 해석 | 상태 전이 기록, 승인 이력, backup | 현재 프로토타입에서는 `promote`/`promote-domain`에 흩어져 있음 |

---

## 4. File-Level Audit

### 4.1 Host Surface

| 파일/그룹 | 현재 분류 | 판단 |
|---|---|---|
| `commands/review.md` | 혼합 | 명령 표면은 유지 가치가 있지만, 현재는 `--codex` 해석, config fallback, readiness check, 프로세스 지시가 한 문서에 섞여 있다 |
| `commands/build.md` | 혼합 | 자연어 설명과 process handoff가 함께 있다 |
| `commands/ask-*.md` | 혼합 | 진입점 surface는 유지하되, 에이전트 선택/도메인 해석은 분리 필요 |
| `commands/help.md` | runtime 소유에 가까운 혼합 | 도움말 자체는 runtime/host 표면으로 옮기기 쉽지만, 현재는 prompt 문서 형식이다 |

### 4.2 Common Process Authority

| 파일 | 현재 분류 | 판단 |
|---|---|---|
| `process.md` | 혼합 | process map, 에이전트 표, 도메인 문서 매핑, 세션 규칙, Codex 설정이 함께 있다. 이 중 일부는 ontology authority로, 일부는 runtime contract로, 일부는 prompt contract로 분리돼야 한다 |

`process.md` 안의 세부 책임 분류:

| 책임 | 분류 | 이유 |
|---|---|---|
| 에이전트 역할 정의 테이블 | `LLM` 소유 | 전문 관점의 정의 |
| 도메인 문서 종류와 의미 | 혼합 | 문서 의미는 ontology authority, path 규칙은 runtime |
| `output_language`, `execution_mode` config resolution | runtime 소유 | explicit config resolution |
| 도메인 추천 | `LLM` 소유 | target 의미를 읽어 추천해야 함 |
| 도메인 목록 수집/중복 제거/UI 표시 | runtime 소유 | deterministic |
| `@domain`, `@-`, `--codex`, `--claude` 파싱 | runtime 소유 | explicit token parsing |

### 4.3 Review Prototype

| 파일 | 현재 분류 | 판단 |
|---|---|---|
| `processes/review.md` | 혼합 | 프로토타입의 핵심 mixed flow |
| `roles/onto_*.md` | `LLM` 소유 | 각 검증 관점의 실제 의미 판단 |
| `roles/onto_axiology.md` | `LLM` 소유 | 목적/가치 정합에 대한 독립 관점 판단 |
| `roles/onto_synthesize.md` | `LLM` 소유 | lens finding 종합과 최종 review output 구조화 |

`processes/review.md` 세부 분류:

| 단계 | 현재 분류 | 이유 |
|---|---|---|
| 도메인 추천/seed review default 추천 | `LLM` 소유 | target 의미와 risk를 읽어야 함 |
| 도메인 목록 수집 및 UI 구성 | runtime 소유 | deterministic |
| 복잡도 평가(Q1-Q3) | `LLM` 소유 | 관련 차원 수, 교차 검증 중요도, 놓침 리스크는 의미 판단 |
| 어떤 에이전트를 경량 모드에 넣을지 선택 | `LLM` 소유 | target 성격 해석이 필요 |
| session ID 생성, 디렉터리 생성 | runtime 소유 | deterministic |
| TeamCreate / Agent spawn 실행 | runtime 소유에 가까운 혼합 | spawn 자체는 runtime, 어떤 prompt로 어떤 agent를 부를지는 `LLM`/prompt contract |
| Round 1 lens finding | `LLM` 소유 | 핵심 검토 행위 |
| `onto_synthesize` 종합 | `LLM` 소유 | 의미 종합 |
| retry / error-log 기록 | runtime 소유 | deterministic operation |

### 4.4 Build Prototype

| 파일 | 현재 분류 | 판단 |
|---|---|---|
| `processes/build.md` | 혼합 | source exploration과 ontologyization이 함께 있는 핵심 mixed flow |

`processes/build.md` 세부 분류:

| 단계 | 현재 분류 | 이유 |
|---|---|---|
| schema 추천 | `LLM` 소유 | target/source 의미 해석 필요 |
| schema.yml 저장 | runtime 소유 | deterministic persistence |
| source type ambiguity 해석 | `LLM` 소유 | `.json`, `.csv` 등은 의미 해석 필요 |
| source type explicit tool availability check | runtime 소유 | 도구 설치/설정 확인 |
| context 질문 제시 | 혼합 | 질문 항목 정의는 prompt contract, 질문-응답 구조는 runtime 가능 |
| Explorer delta 생성 | `LLM` 소유 | source facts의 구조적 인식과 보고 |
| verification agent label/epsilon 제안 | `LLM` 소유 | ontology element 해석 |
| Philosopher convergence 판단 | `LLM` 소유 | 의미적 종합 |
| raw/wip/schema artifact 저장 | runtime 소유 | deterministic persistence |

### 4.5 Operational Processes

| 파일 | 현재 분류 | 판단 |
|---|---|---|
| `processes/backup.md` | runtime 소유 | 순수 파일시스템 작업 |
| `processes/restore.md` | runtime 소유 | 순수 파일시스템 작업 + 검증 |
| `processes/health.md` | runtime 소유 | 집계와 보고 |
| `processes/transform.md` | 혼합 | output format negotiation은 `LLM`, 실제 transform rendering은 혼합 |

### 4.6 Learning / Governance-like Prototype Areas

| 파일 | 현재 분류 | 판단 |
|---|---|---|
| `processes/promote.md` | 혼합 | project learning을 global로 승격하는 판단과 파일 반영이 섞여 있다 |
| `processes/feedback.md` | 혼합 | domain feedback suggestion은 `LLM`, 문서 적용과 이력 관리는 runtime |
| `processes/promote-domain.md` | 혼합 | SEED marker scan은 runtime, 승격 판단은 mixed |
| `processes/create-domain.md` | 혼합 | seed draft 생성은 `LLM`, 디렉터리/충돌 검사는 runtime |

---

## 5. What This Means for Productization

### 5.1 Review First

`검토 (review)`는 가장 먼저 제품화해야 한다.

이유:

- 현재 프로토타입의 핵심 경험이 가장 분명하다
- `LLM` 소유와 runtime 소유가 모두 뚜렷하게 섞여 있다
- 이후 `학습 (learn)`과 `운영 결정 (govern)`의 상위 입력이 된다

### 5.2 The Prototype Is Mostly LLM-Owned at the Meaning Layer

현재 프로토타입의 강점은 대부분 아래에 있다.

- 역할 문서 (`roles/`)
- review/build process 안의 다관점 판단
- `onto_synthesize` 종합
- domain seed generation과 feedback suggestion

즉 제품화는 이 의미 판단을 성급히 runtime code로 대체하는 것이 아니라,
먼저 `프롬프트 기반 기준 경로 (PromptBackedReferencePath)`로 그대로 살려서
계약과 artifact를 고정하는 쪽으로 가야 한다.

### 5.3 Runtime First Candidates

가장 먼저 runtime으로 치환하기 쉬운 영역은 아래다.

1. explicit flag / config parsing
2. domain list collection
3. session ID / artifact directory creation
4. backup / restore / health
5. manifest / review record / build artifact persistence
6. schema validation and ref binding

---

## 6. Advanced Concepts Already Learned in `onto-llm-independent`

현재 `onto` 메인 레포의 기준선은 프로토타입 구조를 읽고 분류한 결과다.
하지만 `onto-llm-independent`에서 이미 더 고도화된 개념들이 있으며,
이들은 다음 productization 단계에서 별도로 반영할 가치가 있다.

### 6.1 바로 가져와야 하는 개념

| 개념 | 현재 `onto` 상태 | `onto-llm-independent`에서의 고도화 | 반영 우선도 |
|---|---|---|---|
| `호출 해석 (InvocationInterpretation)` / `호출 고정 (InvocationBinding)` 분리 | 이름만 막 도입됨 | 경계 기준과 drift 사례까지 문서화됨 | 높음 |
| `프롬프트 기반 기준 경로 (PromptBackedReferencePath)` | 방법론에만 선언됨 | 실제 execution loop와 치환 규칙까지 정리됨 | 높음 |
| `리뷰 기록 (ReviewRecord)` | 개념만 도입됨 | per-lens / synthesis / invocation lineage contract까지 발전 | 높음 |
| `fail-close` 기본 원칙 | 방법론 수준에서 암시적 | 실행 상태, unlock 정책, acceptance와 연결됨 | 높음 |
| `단계 상태판 (flow status)` | 없음 | 어떤 단계가 구현/부분 구현/미구현인지 한 문서에서 추적 | 높음 |

### 6.2 개념적으로 유용하지만 바로 이식할 필요는 없는 것

| 개념 | 이유 |
|---|---|
| `worker_fixture`, `worker_model_backed` 같은 execution profile 세분화 | 현재 `onto`는 아직 prototype flow 매핑 전 단계라 이름만 바로 가져오면 과잉 구조가 될 수 있음 |
| `semantic unlock status`, `unlock owner policy` | 유용하지만, 먼저 `review`의 prompt-backed 기준 경로와 `ReviewRecord`가 잡힌 뒤 정의하는 편이 맞음 |
| `ModelInvocationRecord`, `LensStructuredOutputRecord`의 상세 artifact 구조 | 장기적으로 필요하지만, 지금은 먼저 프로토타입 `review` 흐름을 개념적으로 재배치하는 것이 선행 |

### 6.3 현재 바로 반영해야 하는 핵심 교훈

1. 경계 분류는 단순 직감이 아니라 `semantic ambiguity / deterministic binding` 기준으로 해야 한다.
2. runtime 치환은 바로 code replacement로 가면 안 되고, 먼저 `프롬프트 기반 기준 경로 (PromptBackedReferencePath)`를 만들어야 한다.
3. `review`는 최종 결과 텍스트보다 `리뷰 기록 (ReviewRecord)` 중심으로 다시 생각해야 한다.
4. 현재 프로토타입의 `commands/`, `processes/`, `roles/`는 버릴 대상이 아니라, later contract extraction의 source다.

---

## 7. Immediate Replacement Priorities

### Priority 1 — `검토 (review)`

먼저 아래를 분리한다.

1. `호출 해석 (InvocationInterpretation)` — `LLM`
2. `호출 고정 (InvocationBinding)` — runtime
3. per-lens execution — `LLM`
4. `리뷰 기록 (ReviewRecord)` persistence — runtime

### Priority 2 — `구축 (build)`

`review` 다음에는 `build`를 아래처럼 분리한다.

1. source interpretation / label / epsilon — `LLM`
2. source inventory / artifact / convergence record — runtime

### Priority 3 — 운영 보조 프로세스

`backup`, `restore`, `health`는 상대적으로 빠르게 runtime화 가능하다.

---

## 8. Boundary Mistakes to Avoid

아래는 제품화 과정에서 피해야 한다.

1. `LLM`이 하던 의미 판단을 성급히 deterministic rule로 축약하는 것
2. runtime이 recommendation이나 sufficiency judgment를 대신하게 만드는 것
3. prompt path와 implementation path가 서로 다른 artifact truth를 만드는 것
4. `commands/`, `processes/`, `roles/`를 한 번에 전면 폐기하는 것

---

## 9. Next Action

이 audit 이후의 다음 작업은 아래다.

1. `검토 (review)` 프로토타입 흐름을
   - `호출 해석 (InvocationInterpretation)`
   - `호출 고정 (InvocationBinding)`
   - lens execution
   - `리뷰 기록 (ReviewRecord)`
   으로 다시 매핑
2. 그 매핑을 기준으로 `프롬프트 기반 기준 경로 (PromptBackedReferencePath)`를 먼저 만든다
3. 그 다음에 한 책임씩 `구현 치환 단계 (ImplementationReplacementStep)`로 옮긴다
