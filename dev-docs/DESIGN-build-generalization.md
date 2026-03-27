# build 범용화 설계안

> buildfromcode → build: 코드뿐 아니라 모든 분석 대상(엑셀, DB, 문서 등)에서 온톨로지를 구축하는 범용 프로세스로 재설계.

---

## 1. Certainty 재정의

build의 본질: 소스에서 관찰 가능한 것(f'(x))과 관찰 불가능한 맥락(C)을 구분하고, 도메인 지식으로 C를 고정하는 과정.

| 현행 | 변경 | 정의 | C와의 관계 |
|---|---|---|---|
| `deterministic` | `observed` | 소스에서 직접 관찰한 사실. 소스 변경 없이는 변하지 않음 | C 없음 |
| `non-deterministic` | `unresolved` | 소스만으로 확정할 수 없는 사실 (Explorer 1차 판정) | C 존재, 미분류 |
| `code-embedded-policy` | `embedded-rationale` | 구현은 소스에 있으나, 그 근거가 소스에 없음 | C 미결 — 구현은 보이나 이유 모름 |
| `inferred` | `inferred` | (유지) 합리적 추론이지만 소스에서 직접 확인되지 않음 | C를 추정한 상태 |
| `not-in-code` | `not-in-source` | 이 소스에서 결정 불가. 다른 소스 또는 사용자 입력 필요 | C 완전 미결정 |

`inferred` 판정 시, 추론의 품질을 자기 평가합니다:
```yaml
abduction_quality:
  explanatory_power: high | medium | low   # 관찰된 구조를 얼마나 잘 설명하는가
  coherence: consistent | partial | conflicting  # 기존 확정 fact들과 모순 없는가
```

---

## 2. 소스 중립 용어

| 현행 (코드 특화) | 변경 (소스 중립) |
|---|---|
| "코드베이스" | "분석 대상" 또는 "소스" |
| "코드를 읽고" | "소스를 탐색하고" |
| "코드 탐색자" | "Explorer" (역할명 유지, 설명만 변경) |
| "코드에서 추출 가능" | "소스에서 직접 관찰 가능" |

---

## 3. 세 렌즈 (Three Lenses)

동일 대상에 동시 적용되는 병렬 관점. "레벨"이 아님 — 위계 없음, 교차 정상.

| 렌즈 | 정의 | 코드 예시 | 엑셀 예시 |
|---|---|---|---|
| **Structure** | 소스 안에 있고, 직접 관찰 가능 | 클래스, 필드, 함수 | 셀 값, 수식, 시트 간 참조 |
| **Rationale** | 구현은 소스 안에 있지만, 근거는 소스 밖 | 하드코딩된 규칙의 이유 | 산출 방식의 근거 |
| **Presentation** | 소스 안에 있지만, 목적은 사람의 인지 | UI, 사용자 동선 | 셀 병합, 색상, 배치 |

하나의 관찰에서 여러 렌즈의 fact가 나올 수 있음.
예: `MIN_PAYMENT = 500` → Structure(값이 500) + Rationale(왜 500인지는 C 미결).

delta에 `lens` 필드를 추가하여 fact가 어떤 렌즈에서 관찰되었는지 태깅:
```yaml
facts:
  - subject: "..."
    statement: "..."
    certainty: observed | unresolved
    lens: [structure]  # 또는 [structure, rationale], [presentation] 등
```

---

## 4. Explorer 재설계

### 4.1 역할 재정의

현행: "코드를 직접 읽고 delta를 생성. 해석 금지."
변경: "소스를 탐색하고 delta를 생성. 온톨로지적 해석은 금지하되, 구조 인식은 수행."

| 행위 | 구조 인식 (Explorer 허용) | 온톨로지적 해석 (Explorer 금지) |
|---|---|---|
| 코드 | "이 클래스는 3개의 필드를 가진다" | "이것은 Aggregate Root이다" |
| 엑셀 | "이 행은 병합 셀, Bold, 배경색이 다르다" | "이것은 테이블의 헤더이다" |
| DB | "이 테이블은 FK 없는 3개 컬럼을 가진다" | "이것은 Lookup 테이블이다" |

핵심: Explorer는 "무엇이 있는가"를 보고. "그것이 무엇을 의미하는가"는 검증 에이전트가 판단. 구조 인식에 해석이 개입될 수밖에 없는 경우(엑셀 서식 등), Explorer는 **관찰 근거를 명시**.

### 4.2 소스 유형별 프로파일

Explorer의 프로세스 로직은 동일. 탐색 도구와 구조 인식 범위만 소스 유형에 따라 다름.

| 소스 유형 | 탐색 도구 | module_inventory 단위 | 구조 인식 범위 |
|---|---|---|---|
| 코드베이스 | Glob, Grep, Read | 디렉토리/패키지 | 파일 구조, import, 클래스/함수 시그니처 |
| 엑셀 | 엑셀 파싱 도구 (MCP 등) | 시트/명명된 범위/테이블 | 셀 값, 수식, 서식, 시트 간 참조 |
| DB | SQL 쿼리 도구 | 테이블/스키마 | 테이블, 컬럼, FK, 인덱스, 저장 프로시저 |
| 문서 | Read, WebFetch | 섹션/챕터 | 제목, 본문, 참조, 구조 |

소스 유형 판별: Phase 0.5에서 $ARGUMENTS와 파일 확장자/내용으로 자동 판별. 복합 소스는 각 유형별로 순차 적용.

---

## 5. Phase별 변경

### Phase 0: Schema Negotiation — 변경 없음
스키마 선택지(A~E)는 소스 포맷에 무관.

### Phase 0.5: Context Gathering — 소스 유형별 분기 추가

context_brief에 소스 유형 정보 추가:
```yaml
context_brief:
  source_type: code | spreadsheet | database | document | mixed
  source_profile:
    type: {소스 유형}
    format: {xlsx | csv | sql | py | java | ...}
  # ... 기존 필드 유지
```

소스 유형별 맥락 질문 추가:
| 소스 유형 | 추가 질문 |
|---|---|
| 코드 | (현행 유지) |
| 엑셀 | "이 파일의 주 용도는?" / "서식에 특별한 의미가 있나요?" |
| DB | "주 소비자는?" / "ORM 사용 여부?" |

### Phase 1: 적분형 탐색 루프 — 구조 유지, 용어/형식 변경

루프 구조(delta → label → epsilon) 유지. 변경:
1. "코드" → "소스" 용어 교체
2. certainty 등급 교체
3. delta에 `source.type`, `lens` 필드 추가
4. label에 `abduction_quality` 필드 추가
5. detail의 위치 표기를 소스 유형별로 (`파일:라인` / `시트:셀범위` / `테이블.컬럼`)

### Phase 2~5: 용어 교체만

---

## 6. Delta/Label 형식 변경 요약

### Delta
```yaml
delta:
  source:
    type: {code | spreadsheet | database | document}  # 신규
    scope: "{탐색 범위}"
    files: [{목록}]
  facts:
    - subject: "..."
      statement: "..."
      certainty: observed | unresolved
      lens: [structure, rationale, presentation]  # 신규
      detail:
        - "{소스 유형별 위치 표기 포함 설명}"
```

### Label
```yaml
labels:
  - certainty_refinement: "{unresolved → embedded-rationale / inferred / not-in-source}"
    abduction_quality:  # 신규, inferred일 때만
      explanatory_power: high | medium | low
      coherence: consistent | partial | conflicting
```

---

## 7. 변경 범위

| 파일 | 변경 유형 |
|---|---|
| `processes/build.md` | **전면 재작성** |
| `process.md` | 부분 수정 (certainty 용어, Teammate prompt) |
| `README.md` | 부분 수정 (명령어, certainty) |
| `BLUEPRINT.md` | 부분 수정 (용어, certainty, Explorer) |
| `commands/onto-build.md` | 완료 |

### 변경하지 않는 것

- 적분형 탐색 루프 구조 (delta → label → epsilon → 수렴 판정)
- 에이전트 구성 (검증 에이전트 N인 + Philosopher)
- Phase 구조 (0 → 0.5 → 1 → 2 → 3 → 4 → 5)
- 학습 체계 (소통/방법론/도메인 3분류)
- 팀 생명주기 (TeamCreate → shutdown → TeamDelete)

---

## 8. 구현 순서

1. **build.md 재작성** — 용어(§2) + 렌즈(§3) + Explorer(§4) + Phase(§5) + 형식(§6)
2. **process.md 수정** — certainty 용어, Teammate prompt 템플릿
3. **README.md / BLUEPRINT.md 동기화**
4. **E2E 검증** — 코드 소스로 기존 기능 동작 확인
