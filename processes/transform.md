# 온톨로지 변환 프로세스

> Raw Ontology를 사용자가 원하는 형식으로 변환합니다.
> 관련: `/onto:build`로 구축된 Raw Ontology가 입력. 변환 후 `/onto:review`로 검증 가능.

Raw Ontology(`.onto/builds/{세션 ID}/raw.yml`)를 사용자가 원하는 형식으로 변환합니다.

### 1. 원본 확인

- $ARGUMENTS로 지정된 파일, 또는 `{project}/.onto/builds/{세션 ID}/raw.yml`을 읽습니다.
- 파일이 없으면 안내하고 중단합니다: "`/onto:build`를 먼저 실행하여 Raw Ontology를 구축해 주세요."
- schema.yml도 함께 읽어 온톨로지 구조를 파악합니다.

### 2. 출력 형식 협의

사용자에게 원하는 출력 형식을 질문합니다:

```markdown
## 변환 형식을 알려주세요

Raw Ontology를 어떤 형식으로 변환할까요?

**예시**:
- Markdown (사람이 읽는 문서)
- Mermaid (시각적 다이어그램)
- YAML (구조화 데이터)
- JSON-LD (Linked Data)
- OWL/RDF (표준 온톨로지)
- Markdown with inline YAML (하이브리드)
- 기타 — 원하는 형식을 설명해 주세요

**추가 옵션**:
- 포함 범위: 전체 / 확정 항목만 / 수렴도 N 이상
- 상세 수준: 근거 포함 / 근거 제외
```

### 3. 변환 실행

사용자가 지정한 형식에 맞춰 raw.yml의 내용을 변환합니다.

**변환 원칙**:
- Raw Ontology의 정보를 목적 형식이 허용하는 범위 내에서 최대한 보존합니다.
- 형식이 허용하지 않아 탈락하는 정보가 있으면 사용자에게 알립니다.
- 수렴도/근거 등 메타데이터는 형식이 지원하면 포함하고, 지원하지 않으면 주석/별도 파일로 분리합니다.

### 4. 저장

- 변환 결과를 `{project}/.onto/builds/{세션 ID}/{형식별 파일명}`에 저장합니다.
  - 예: `ontology.md`, `ontology.mermaid`, `ontology.jsonld`, `ontology.owl`
- 파일명이 겹치면 사용자에게 확인합니다.

완료 보고:

```markdown
## 변환 완료

| 항목 | 값 |
|---|---|
| 원본 | {raw.yml 경로} |
| 출력 형식 | {형식} |
| 포함 범위 | {전체 / 확정만 / ...} |
| 탈락 정보 | {있으면 명시 / 없음} |

저장 경로: `.onto/builds/{세션 ID}/{파일명}`
```
