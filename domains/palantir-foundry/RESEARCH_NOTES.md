# Palantir Foundry Architecture Research Notes

> 목적: 도메인 문서 업그레이드를 위한 Foundry 설계 원칙 리서치 결과.
> Foundry 사용법이 아니라, 유사한 시스템을 구축할 때 참고할 **설계 접근법**에 초점.
> 날짜: 2026-03-30

---

## 1. Foundry Ontology SDK — 타입 시스템 구조

### 1.1 핵심 엔티티 타입 6종

| 엔티티 | 정의 | 필수 요소 | 설계 역할 |
|--------|------|-----------|-----------|
| **Object Type** | 실세계 엔티티/이벤트의 스키마 정의 | display_name, primary_key, properties, data_source, description | RDB 테이블 + 비즈니스 의미 |
| **Link Type** | 두 Object Type 간 관계의 스키마 정의 | source, target, cardinality (1:1, 1:N, M:N), description | RDB JOIN + 비즈니스 의미 |
| **Action Type** | Object/Property/Link에 대한 변경 집합의 스키마 정의 | parameters, rules (ontology rules + side effect rules), submission criteria | 트랜잭션 정의 (선언적) |
| **Interface** | Object Type의 형태(shape)와 능력(capabilities) 기술 | interface properties, link type constraints, metadata | 다형성(polymorphism) 계약 |
| **Shared Property** | 여러 Object Type에서 재사용되는 속성의 단일 정의 | name, type, description, constraints | 중앙집중적 속성 관리 |
| **Enum** | 허용 값 집합 정의 | values (정적), base type (String/Boolean/Integer 등), case sensitivity | 값 도메인 제약 |

[관찰] Foundry는 이 6개 타입을 ontology의 "언어(Language)"로 정의한다. 모든 것은 이 6개 타입의 조합으로 표현된다.

[관찰→참여] 타입 시스템이 "비즈니스 의미를 강제"한다는 점이 핵심이다. RDB의 테이블/컬럼/FK는 기술적 구조만 정의하지만, Object Type/Property/Link Type은 반드시 비즈니스 설명(description)을 포함해야 한다. 이 차이가 "데이터 구조"와 "온톨로지"를 구분하는 기준이다.

### 1.2 Property 타입 시스템

**Base Types (기본 타입)**:
- 표준 스칼라: String, Integer, Short, Float, Double, Decimal, Boolean, Date, Timestamp, Long, Byte
- 특수 타입: Geopoint, Geoshape, Vector (시맨틱 검색용), Attachment, Time Series, Media Reference, Cipher Text
- 복합 타입: Struct (최대 10 필드, 깊이 1단계, 중첩 불가)
- 배열: Vector와 Time Series를 제외한 모든 base type은 배열로 사용 가능
- 제외: Map, Decimal, Binary는 field type으로만 사용 가능하고 base type으로는 불가

**Value Types (값 타입)** — base type을 감싸는 시맨틱 래퍼:
- 메타데이터 + 검증 제약(constraints)을 추가
- 예: email 주소, URL, UUID 등 도메인 특화 타입
- Space(온톨로지 영역)별로 커스터마이징 가능

**Value Type Constraints (값 타입 제약)**:
| 제약 종류 | 대상 base type | 설명 |
|-----------|---------------|------|
| Enum (one of) | String, Boolean, Integer, Short, Float, Double, Decimal | 정적 허용값 집합, 대소문자 감도 옵션 |
| Range | Decimal, Double, Float, Integer, Short, Date, Timestamp, String, Array | 최소/최대 경계값 |
| Regex | String | 패턴 매칭, 부분 매칭 옵션 |
| RID/UUID | String | 특정 식별자 형식 검증 |
| Uniqueness | Array | 배열 요소 중복 방지 |

[관찰] Struct는 깊이 1단계로 제한된다 (중첩 불가, 최대 10 필드). 이것은 복잡성을 의도적으로 제한하는 설계 결정이다.

[관찰→참여] Value Type은 "base type + 시맨틱 메타데이터 + 검증 제약"의 3중 구조이다. 이 패턴은 도메인 특화 타입을 만들 때 보편적으로 적용 가능하다: 기술적 타입(String)에 비즈니스 의미(email 주소)와 검증 규칙(regex 패턴)을 결합하는 것.

[참여] 제약(constraints)은 애플리케이션 로직이 아닌 스키마 수준에서 선언적으로 정의되어야 한다. 이렇게 하면 제약 규칙이 모든 소비 애플리케이션에 일관되게 적용된다.

### 1.3 Type Classes (메타데이터 확장 레이어)

Type Classes는 properties, link types, action types에 적용되는 메타데이터 어노테이션이다.

| 카테고리 | 역할 | 예시 |
|----------|------|------|
| Analyzer | Lucene 인덱싱 동작 제어 (토큰화, 언어별 분석) | 검색 가능성 결정 |
| Application-Specific | 플랫폼 앱(Object Views, Quiver)이 해석하는 힌트 | hubble, timeseries, vertex |
| Structural | 관계와 계층 정의 | hierarchy.parent, vertex.link_merge |
| Scheduling | 동적 스케줄링 위젯 지원 | schedulable-start-time |
| Geospatial | 지도 기능 활성화 | geo.latitude, geo.longitude |

[관찰→참여] Type Classes는 온톨로지 정의와 소비 애플리케이션 사이의 느슨한 결합(loose coupling)을 가능하게 하는 메타데이터 확장 메커니즘이다. 스키마를 변경하지 않고도 새로운 애플리케이션이 온톨로지 의미를 발견하고 해석할 수 있다.

### 1.4 Interface와 다형성

**Interface의 구조**:
- Interface Properties (로컬 정의 권장) 또는 Shared Properties로 구성
- Link Type Constraints: 관계 규칙 정의
- 메타데이터
- 상속 계층: Interface 확장(extension) 지원

**구체(Concrete) vs 추상(Abstract) 구분**:
| 구분 | Object Type | Interface |
|------|------------|-----------|
| 성격 | 구체적 (인스턴스화 가능) | 추상적 (인스턴스화 불가) |
| 데이터 | Dataset에 의해 백킹됨 | Dataset 백킹 없음 |
| 인스턴스 | 객체(Object)로 인스턴스화 | 구현 Object Type을 통해서만 인스턴스화 |
| 시각적 구분 | 실선 테두리 아이콘 | 점선 테두리 아이콘 |

**다형성 메커니즘**:
- 하나의 Object Type이 여러 Interface를 구현 가능 (다중 구현)
- 하나의 Interface를 여러 Object Type이 구현 가능 (M:N 관계)
- 새로운 구현 타입이 추가되면 기존 워크플로우와 즉시 호환

[관찰→참여] Interface는 "상속"이 아니라 "형태 계약(shape contract)"이다. Java/TypeScript의 interface 개념과 동일하게, 명시적 상속 체인 없이 다형적 동작을 달성한다. 이것이 multi-ontology 환경에서 온톨로지 간 결합도를 최소화하면서 상호 참조를 가능하게 하는 핵심 메커니즘이다.

[참여] 추상 타입(Interface)과 구체 타입(Object Type)의 명확한 분리는 타입 시스템의 범용적 설계 원칙이다. 추상 타입은 데이터를 소유하지 않고 계약만 정의하며, 구체 타입만이 실제 데이터를 보유한다.

---

## 2. 3-Layer Architecture 설계 근거

### 2.1 세 레이어의 정의와 각각이 해결하는 문제

#### Semantic Layer — "세계에 무엇이 존재하는가?"

**정의**: 도메인의 개념 모델을 수립한다. 어떤 엔티티가 존재하고, 어떻게 관계를 맺고, 어떤 속성을 갖는지를 정의한다.

**해결하는 문제**: 팀과 데이터 소스 간의 개념적 파편화. "user", "client", "individual" 같은 파편화된 데이터 개념을 통합된 Person 엔티티로 조정한다.

**구성 요소**: Object Types, Properties, Link Types, Interfaces, Shared Properties, Enums

[관찰→참여] Semantic Layer는 "공유 언어(shared language)"를 만드는 레이어이다. 조직 내 다른 팀, 다른 시스템이 같은 개념을 같은 이름으로 부르게 만드는 것이 핵심 가치이다.

#### Kinetic Layer — "무엇을 할 수 있는가?"

**정의**: 비즈니스 로직을 구현하고 실행한다. Semantic Layer를 실제 데이터 소스에 연결하고, ETL 파이프라인을 통해 운영화(operationalize)한다.

**해결하는 문제**: 이론적 모델과 실제 데이터 시스템 사이의 간극. 정적 모델을 운영 가능한 상태로 만든다.

**구성 요소**: Action Types, Functions

**핵심 기능**:
- Action Types: 사용자 입력을 표준화하고 온톨로지 변경을 트랜잭션으로 묶는다
- Functions: TypeScript/Python으로 구현된 임의 복잡도의 비즈니스 로직
- Writeback: 사용자 편집이 writeback dataset에 기록됨
- Side Effects: 알림, 웹훅 등 외부 시스템과의 통합

[관찰] Palantir는 Kinetic Layer를 "동사(verbs)"로 표현한다. Semantic Layer가 "명사(nouns)"를 정의하면, Kinetic Layer가 "명사에 대해 할 수 있는 동작"을 정의한다.

[관찰→참여] "읽기 전용 온톨로지"는 Semantic Layer만 있는 상태이다. Kinetic Layer가 없으면 의사결정을 시스템에 기록할 수 없고, 따라서 조직 학습(feedback loop)이 불가능하다. 이것이 Foundry가 Kinetic Layer를 필수로 간주하는 이유이다.

#### Dynamic Layer — "누가 무엇을 할 수 있고, 언제 하는가?"

**정의**: 행동, 거버넌스, 적응을 도입한다. 비즈니스 규칙, 정책, 워크플로우, 권한을 통해 온톨로지가 "적응하고, 통제하고, 로직을 강제"하도록 만든다.

**해결하는 문제**: 정적 모델은 실세계 제약을 강제할 수 없다. 접근 제어, 수명주기 관리(Suspect → Investigated → Cleared), 비즈니스 규칙 검증이 필요하다.

**구성 요소**: Workflows, Rules, Permissions

[관찰→참여] Dynamic Layer는 "규모에 따라 필요(scale-dependent)"하다. 소규모에서는 Semantic + Kinetic만으로 충분하지만, 다수의 사용자와 에이전트가 동시에 운영하는 대규모 환경에서는 자동화와 권한 제어가 필수가 된다.

### 2.2 분리의 설계 근거

**세 가지 관심사의 분리**:
- Semantic = 사물이 **무엇인지** (개념적)
- Kinetic = 사물이 **현실에 어떻게 연결되는지** (운영적)
- Dynamic = 사물이 **어떻게 행동하는지** (거버넌스)

**왜 분리하는가?**
1. 서로 다른 이해관계자가 서로 다른 레이어에서 작업한다: 분석가는 Semantic, 엔지니어는 Kinetic, 사용자는 Dynamic
2. 각 레이어는 독립적으로 발전할 수 있다: Semantic 모델을 변경하지 않고도 새로운 Action Type을 추가할 수 있다
3. 대규모 데이터셋에서 "이해와 제어를 확장(scale understanding and control)"할 수 있다

[참여] 관심사의 분리(Separation of Concerns)는 시스템 설계의 범용 원칙이다. "무엇이 있는가(구조)", "무엇을 할 수 있는가(행동)", "누가 할 수 있는가(정책)"를 분리하면, 각각을 독립적으로 변경하고 확장할 수 있다.

### 2.3 Semantic Web와의 차이

Palantir의 온톨로지는 전통적 Semantic Web(OWL/RDFS)과 다른 설계 철학을 따른다:

| 구분 | Semantic Web | Palantir Ontology |
|------|-------------|-------------------|
| 설계 목표 | 지식의 논리적 정확성 | 비즈니스 운영 실행 가능성 |
| 세계 가정 | Open-world (알려지지 않은 것은 가능) | Closed-world (시스템에 없으면 존재하지 않음) |
| 실행 레이어 | 읽기 전용 추론 | 읽기 + 쓰기 + 실행 통합 |
| Kinetic Layer | 없음 | 핵심 레이어 (Action Types, Functions) |

[관찰→참여] Kinetic Layer의 도입이 전통 Semantic Web의 "저장소(repository)"를 "엔진(engine)"으로 전환한 핵심 설계 결정이다. 데이터를 모델링하는 것에 그치지 않고, 데이터에 대한 의사결정을 모델링하고 실행하는 것이 Foundry 온톨로지의 차별점이다.

---

## 3. Ontology-First vs Data-First

### 3.1 핵심 설계 철학

**Ontology-First 접근법**:
- "이 비즈니스 개념을 모델링하고 올바른 데이터를 그것에 연결한다" (올바른 접근)
- "테이블을 엔티티로 노출한다" (잘못된 접근)

**Data-First 접근법이 실패하는 이유**:
1. 시간이 지남에 따라 "어떤 데이터 자산이 존재하는지, 어떤 것을 사용해야 하는지 이해하기 위해 점점 더 많은 노력이 필요"해진다
2. 새로운 프로젝트마다 기존 자산을 활용하는 대신 솔루션을 재발명한다
3. "많은 의사결정자는 코드나 IT 개념에 익숙한 기술 사용자가 아니다"

**Ontology-First가 해결하는 문제**:
- 연결성(Connectivity): 단일 진실 원천(single source of truth)으로 로컬 의사결정을 글로벌 맥락에서 조회 가능
- 규모의 경제: 프로젝트별 데이터 통합 중복 제거
- 의사결정 캡처: 데이터 writeback을 통한 조직 학습
- AI/ML 연동: 별도 어댑터 없이 모델을 운영 프로세스에 직접 바인딩

### 3.2 Ontology의 데이터 매핑 관계

| Ontology 개념 | 데이터 개념 | 관계 |
|--------------|-----------|------|
| Object Type | Dataset | 의미적 추상화 (1 Object Type = 1+ backing datasets) |
| Object | Row | 인스턴스 |
| Property | Column | 속성 |
| Property Value | Field Value | 값 |
| Link Type | JOIN | 관계 (but 비즈니스 의미 강제) |

[관찰] Ontology는 Dataset 위에 올라가는 시맨틱 레이어이다. Dataset을 대체하는 것이 아니라, Dataset에 비즈니스 의미를 부여한다. 하나의 Object Type이 여러 Dataset에 의해 백킹될 수 있다.

[관찰→참여] "엔티티는 장기적이고 의미 있어야 한다(Entities must be long-lived and meaningful)"는 핵심 원칙이다. 테이블을 그대로 엔티티로 노출하는 것이 잘못인 이유는, 테이블 구조는 기술적 결정의 산물이지 비즈니스 개념의 반영이 아니기 때문이다.

[참여] 시맨틱 레이어를 데이터 위에 두는 패턴은 범용적이다. 데이터의 물리적 구조(테이블, 파일, API)와 비즈니스 개념(주문, 고객, 결제)을 분리하면, 물리적 구조가 변경되어도 비즈니스 로직은 영향받지 않는다.

### 3.3 "Digital Twin" 개념

Ontology를 "조직의 디지털 트윈"으로 정의한다. 이것이 의미하는 바:
- 물리적 자산(공장, 장비, 제품)뿐 아니라 개념(고객 주문, 금융 거래)도 포함
- 단순한 데이터 카탈로그나 스키마 설계가 아니라, 운영 가능한 시맨틱 레이어
- 조직의 의사결정을 데이터로 캡처하여 피드백 루프를 통한 지속적 개선

[관찰→참여] "Digital Twin"의 핵심은 읽기와 쓰기를 통합하는 것이다. 읽기만 가능하면 정적 모델이고, 쓰기(writeback)를 통해 의사결정을 기록하면 "살아있는" 모델이 된다. 이것이 Ontology가 단순 데이터 카탈로그와 다른 점이다.

---

## 4. Data Integration Architecture

### 4.1 전체 데이터 흐름

```
Source Systems → Data Connection (Agents) → Sync → Datasets → Transforms (Pipeline) → Ontology
                                                      ↑
                                              Virtual Tables ─────────────────────────┘
```

**5단계 흐름**:
1. **Connection**: 원격 시스템에 안전하게 접근 (Agents, Webhooks, Listeners)
2. **Sync**: 데이터를 Foundry로 이동 (Batch, Streaming, File-based)
3. **Pipeline**: 변환 및 처리 (Pipeline Builder = low-code, Code Repositories = full-code)
4. **Output**: 결과 저장 (Datasets, Virtual Tables, Ontology components)
5. **Ontology Mapping**: Object Types, Link Types로 매핑

### 4.2 Dataset vs Virtual Table

| 관점 | Dataset (Sync) | Virtual Table |
|------|---------------|---------------|
| 저장 | 영구적 복사본 (version history 포함) | 저장하지 않음 (compute-on-demand) |
| 지연 시간 | 배치 지연 발생 | 소스 시스템 직접 접근 |
| 비용 | 저장소 비용 높음 | 컴퓨트 비용 높음 |
| 거버넌스 | 완전한 리니지 추적 | 소스 시스템에 의존 |
| 감사 추적 | 완전한 이력 | 제한적 |
| 변환 | 복잡한 다단계 변환 가능 | 소스 플랫폼 지원 범위로 제한 |

**설계 원칙**: "감사, 성능, 거버넌스 요구사항이 있을 때는 명시적 sync(Dataset)을 선호하라."

[관찰] Dataset은 파일 컬렉션의 래퍼(wrapper)이다. 권한 관리, 스키마 관리, 버전 관리, 시간에 따른 업데이트를 통합 지원한다.

[관찰→참여] "워크플로우별로 적절한 통합 패턴을 결정하라"는 실용적 원칙이다. 모든 데이터를 일괄적으로 sync하거나 일괄적으로 가상화하는 것이 아니라, 각 사용 사례의 요구사항(지연 허용도, 감사 필요성, 변환 복잡도)에 따라 선택한다.

[참여] 데이터 통합에서 "물리적 복사 vs 가상 참조"의 트레이드오프는 범용적이다. 이 선택은 항상 존재하며, 일관된 결정 기준(감사 가능성, 지연 허용도, 거버넌스 요구사항)을 갖는 것이 중요하다.

### 4.3 Backing Dataset과 Writeback Dataset

**Backing Dataset**: Object Type의 데이터 소스. Object Type에 backing datasource를 추가하면 데이터가 Object Storage에 인덱싱된다.

**Writeback Dataset**: 사용자 편집(Action을 통한 변경)이 기록되는 Dataset. 원본 소스 데이터는 변경되지 않고, 편집 결과만 별도 Dataset에 기록된다.

**Link Type의 데이터 백킹**:
- 1:1, 1:N 관계: Object Type의 backing datasource에서 외래키를 통해 매핑
- M:N 관계: Link Type 자체가 별도의 backing datasource를 가짐

[관찰] 원본 데이터(backing)와 변경 데이터(writeback)의 분리는 핵심 설계 결정이다. 소스 시스템의 데이터는 절대 직접 수정하지 않고, 편집 결과를 별도 레이어에 기록한다.

[관찰→참여] "읽기 경로"와 "쓰기 경로"를 분리하는 CQRS(Command Query Responsibility Segregation) 패턴의 변형이다. 소스 데이터의 불변성을 보장하면서 사용자 편집을 추적할 수 있다.

### 4.4 Object Storage V2 Architecture (OSv2)

Phonograph(V1)에서 진화한 새로운 아키텍처:

**핵심 구성 요소**:
- **Object Data Funnel**: 모든 데이터 쓰기를 오케스트레이션하는 마이크로서비스. Datasets + Actions의 편집을 받아 object databases에 인덱싱
- **Object Set Service (OSS)**: 읽기 전담. 쿼리, 필터, 집계, 로딩 처리
- **Spark 기반 쿼리 실행 레이어**: 대규모 Search Arounds와 정확한 집계 지원

**Read/Write 분리**: Funnel(쓰기)과 OSS(읽기)가 독립적으로 스케일링

**성능 수치**:
- 단일 Action당 최대 10,000 객체 편집
- Object Type당 최대 2,000 properties
- 증분 객체 인덱싱 (기본 활성화)
- 스트리밍 datasource를 통한 저지연 인덱싱

[관찰] OSv2는 "first principles에서 재설계"되었다. 인덱싱과 쿼리 서브시스템을 분리(decouple)하여 수평적 스케일링을 가능하게 했다.

[참여] Read/Write 경로의 물리적 분리는 대규모 시스템 설계의 범용 원칙이다. 읽기 패턴과 쓰기 패턴의 부하 특성이 다르므로, 독립적으로 스케일링할 수 있어야 한다.

---

## 5. Action Type — 설계 심화

### 5.1 Rule 시스템

**Ontology Rules (데이터 변경)**:
- Create object
- Modify object(s)
- Create or modify object(s)
- Delete object(s)
- Create link(s)
- Delete link(s)
- Function rule (임의 코드 실행)
- Interface 기반 operations (Interface 구현 타입에 대한 작업)

**Side Effect Rules (외부 효과)**:
- Notification rules (사용자 알림)
- Webhook rules (외부 시스템 연동)

**Rule의 값 소스**:
- From parameter: 기존 Action 매개변수에서 가져옴
- Object parameter property: 객체 참조 매개변수의 속성에서 추출
- Static value: 규칙 정의 시 고정값
- Current User/Time: 컨텍스트 값 (제출 사용자, 제출 시각)

**규칙 평가 순서**: 순차 처리. 동일 속성에 대한 나중 규칙이 앞선 규칙을 오버라이드.

### 5.2 Built-in Rules vs Function-Backed Actions

| 구분 | Built-in Rules | Function-Backed Actions |
|------|---------------|------------------------|
| 패러다임 | 선언적(declarative) | 명령적(imperative) |
| 복잡도 | 단순 CRUD | 임의 복잡도 |
| 사용 사례 | 단일 객체 생성/수정/삭제 | 다수 연결 객체 수정, 복잡한 조건 로직 |
| 제한 | 규칙 정의 옵션 내 | Action Type 제한 + Function 실행 제한의 이중 제약 |

[관찰→참여] 선언적 규칙을 기본으로 하되, 복잡한 경우에 명령적 코드로 확장할 수 있는 2단계 설계가 핵심이다. 대부분의 비즈니스 로직은 선언적으로 표현 가능하고, 선언적 표현은 검증과 감사가 용이하다. 명령적 코드는 "선언적으로 불충분한 경우"에만 사용한다.

### 5.3 Webhook의 트랜잭션 보장

"웹훅이 writeback으로 설정되면, 다른 규칙이 평가되기 전에 웹훅이 먼저 실행된다. 웹훅 실행이 실패하면 다른 변경도 적용되지 않는다."

[관찰→참여] 이것은 외부 시스템과의 트랜잭션 일관성을 보장하는 패턴이다. "외부 시스템 호출 실패 시 온톨로지 변경도 취소"라는 원칙은 분산 시스템에서의 saga 패턴의 단순화된 형태이다.

### 5.4 Writeback 메커니즘

- 사용자가 Action을 실행하면 Object/Property/Link 변경이 Ontology에 커밋된다
- "가장 최신 버전의 object 데이터(사용자 편집 포함)가 object type의 writeback dataset에 캡처된다"
- 원본 소스 dataset은 항상 변경되지 않음

[관찰→참여] Writeback은 "이벤트 소싱(Event Sourcing)"의 변형이다. 원본 상태(backing dataset) + 변경 이벤트(user edits) = 현재 상태(writeback dataset). 이 패턴은 감사 추적과 롤백을 자연스럽게 지원한다.

---

## 6. OSDK — 코드 생성 설계

### 6.1 설계 원칙 5가지

1. **개발 가속화**: 최소 코드로 온톨로지 접근
2. **강력한 타입 안전성**: 온톨로지 엔티티에 매핑된 생성 타입
3. **중앙 집중 유지보수**: Foundry를 권위 있는(authoritative) 백엔드로 취급
4. **보안 내장**: 설계 단계부터 보안 포함
5. **인체공학적 접근**: 대규모 쿼리와 writeback에 대한 편의성

### 6.2 코드 생성 아키텍처

```
Ontology 정의 (메타데이터)
  → Developer Console (엔티티 선택/범위 지정)
    → OSDK 코드 생성
      → TypeScript / Python / Java 타입 (또는 OpenAPI spec → 임의 언어)
        → IDE에서 타입 안전한 온톨로지 접근
```

**핵심 설계 결정**:
- **부분 집합 생성**: "OSDK에 생성되는 함수와 타입은 당신에게 관련된 온톨로지의 부분 집합만을 기반으로 한다"
- **토큰 범위 보안**: "OSDK는 당신의 앱이 접근해야 하는 온톨로지 엔티티에만 범위가 지정된 토큰을 사용하며, 여기에 사용자 자신의 데이터 권한이 추가된다" (이중 레이어)
- **OSDK 2.0 성능**: "온톨로지의 형태(shape)와 메타데이터에 비례하여 선형으로 확장되며, 실제 온톨로지 전체가 아닌" 방식으로 성능 개선

### 6.3 생성 코드의 구조

| Ontology 엔티티 | 생성 코드 |
|----------------|----------|
| Object Type | TypeScript interface |
| Property | readonly field |
| Link Type | reference type |
| Enum | union type |

[관찰→참여] "전체 온톨로지가 아니라 필요한 부분 집합만 생성한다"는 설계 결정은 성능과 보안 모두에 기여한다. 불필요한 타입이 번들에 포함되지 않고, 불필요한 데이터에 대한 접근 권한도 부여되지 않는다.

[참여] 코드 생성(codegen) 파이프라인은 스키마 변경 시 영향 범위를 컴파일 타임에 자동 감지하는 메커니즘이다. 이것은 런타임 오류 대신 컴파일 오류로 변경 영향을 조기 발견하게 해준다. 이 패턴은 온톨로지에 국한되지 않고, 모든 스키마 기반 시스템에 적용 가능하다.

---

## 7. Ontology System Architecture (Engine 레벨)

### 7.1 4차원 통합

Ontology 시스템은 4개 차원을 통합한다:

| 차원 | 내용 |
|------|------|
| **Data** | 파편화된 소스(ERP, CRM, 센서, DB)를 통합 |
| **Logic** | 모듈화된 계산 (비즈니스 규칙, ML 모델, LLM, 오케스트레이션) |
| **Action** | 단순 트랜잭션부터 복잡한 다단계 운영 업데이트까지 |
| **Security** | 모든 레이어에 걸쳐 엮여 있음 (woven throughout) |

### 7.2 시스템 구성: Language / Engine / Toolchain

| 구성 | 역할 |
|------|------|
| **Language** | 시맨틱 objects, links, properties, kinetic actions, logic 정의를 모델링 |
| **Engine** | Read path (SQL 쿼리, 실시간 구독, 물질화) + Write path (원자적 트랜잭션, 배치 뮤테이션, 스트림, CDC) |
| **Toolchain** | 개발자 접근 (OSDK) + DevOps 거버넌스 도구 |

[관찰→참여] "Language - Engine - Toolchain"의 3분법은 온톨로지 시스템의 아키텍처 설계에 유용한 프레임워크이다. Language는 "무엇을 표현할 수 있는가", Engine은 "어떻게 실행하는가", Toolchain은 "어떻게 개발하고 관리하는가"를 분리한다.

[참여] Security가 별도 레이어가 아닌 "모든 레이어에 걸쳐 엮여 있는(woven throughout)" 것으로 설계된 점은 중요한 아키텍처 결정이다. 보안을 별도 레이어로 분리하면, 새로운 기능 추가 시 보안 레이어를 우회하기 쉽다.

---

## 8. 기존 도메인 문서 대비 리서치에서 발견된 갭

기존 `palantir-foundry/` 도메인 문서와 비교하여 리서치에서 새로 발견된 설계 세부사항:

### 8.1 기존 문서에 없거나 약한 영역

| 영역 | 기존 문서 상태 | 리서치 발견 |
|------|--------------|-----------|
| **Value Type & Constraints** | Property type을 6종(String, Integer, Decimal, Date, Boolean, Enum)으로 단순화 | 실제로는 12+ base types + Value Type wrapper + 5종 constraint가 존재 |
| **Struct Type** | 미언급 | 최대 10 필드, 깊이 1단계 제한의 복합 속성 타입 |
| **Type Classes** | 미언급 | 메타데이터 확장 레이어로서 5개 카테고리 존재 |
| **Interface 상세** | 개념만 언급 | Interface Properties vs Shared Properties 구분, Link Type Constraints, 상속 계층 상세 |
| **Action Type 규칙 시스템** | precondition/postcondition만 언급 | Ontology Rules 8종 + Side Effect Rules 2종, 규칙 평가 순서, 값 소스 4종 |
| **Function-Backed Actions** | 미구분 | Built-in Rules(선언적) vs Function-Backed(명령적)의 2단계 설계 |
| **Writeback 메커니즘** | 미상세 | Backing Dataset과 Writeback Dataset 분리, 이벤트 소싱 패턴 |
| **Object Storage V2** | 미언급 | Funnel + OSS의 Read/Write 분리 아키텍처 |
| **Virtual Tables** | 미언급 | Dataset과의 트레이드오프 (저장 vs 컴퓨트, 거버넌스 vs 실시간성) |
| **OSDK 부분 집합 생성** | codegen 파이프라인만 언급 | 부분 집합 선택, 토큰 범위 보안, 성능 스케일링 설계 |
| **Language/Engine/Toolchain 분류** | 미언급 | 온톨로지 시스템의 3분법 프레임워크 |

### 8.2 기존 문서에서 정확하지 않거나 재검토가 필요한 영역

1. **Property 타입 6종 제한**: 기존 문서는 `String, Integer, Decimal, Date, Boolean, Enum`만 나열하지만, Foundry는 Geopoint, Geoshape, Vector, Attachment, Time Series, Media Reference, Cipher Text, Struct, Long, Short, Float, Double, Byte 등 훨씬 풍부한 타입 시스템을 가진다. 도메인 문서의 목적상 6종으로 충분한지 재평가 필요.

2. **Enum을 별도 타입으로 분류**: Foundry에서 Enum은 독립 타입이 아니라 Value Type의 constraint 중 하나이다. 기존 문서는 Enum을 6대 엔티티 중 하나로 분류하고 있는데, 이것이 Foundry의 실제 타입 계층을 정확히 반영하는지 검토 필요.

3. **Action Type의 precondition/postcondition**: 기존 문서에서 강조하는 precondition/postcondition은 Foundry 공식 문서에서는 "submission criteria"와 "permissions"로 구현되며, 명시적 pre/post-condition 아키텍처는 Function-Backed Actions에서 코드로 구현하는 형태이다.

---

## 9. 실제 구현 사례에서 추출한 설계 패턴

### 9.1 Airbus Skywise — 항공 산업 온톨로지

**배경**: 2015년부터 Palantir과 Airbus의 파트너십. Skywise는 Foundry를 항공 산업에 맞게 적용한 플랫폼.

**온톨로지 구조 (추론 가능한 Object Types)**:
- Aircraft (개별 항공기, 인-플라이트 데이터)
- Parts (A350 한 대당 5백만 개 부품)
- Work Orders (생산 일정)
- Defects (품질 결함)
- Maintenance Tasks (정비 작업)
- Shift Assignments (교대 근무)
- Parts Deliveries (부품 배송)

**설계 패턴**:

1. **다중 이해관계자 단일 온톨로지 패턴**: 생산팀, 항공사, 공급업체, 재무팀이 동일한 온톨로지 위에서 각자의 뷰(view)를 사용. 별도 시스템이 아니라 동일한 Object Type에 대해 서로 다른 접근 권한과 관점(perspective)을 제공.

2. **점진적 확장 패턴**:
   - 2015: A350 생산에 초점 (생산 33% 가속)
   - 2016: 스케줄링, 공급망, 재무 워크플로우로 확장
   - 2017: Skywise로 업계 전체 플랫폼으로 확장 (항공사 100개+)
   이 타임라인은 "내부 사용 → 외부 파트너 → 업계 플랫폼"의 3단계 확장 패턴을 보여줌.

3. **규모**: 10,500+ 연결된 항공기, 25,000+ 월간 사용자, 페타바이트 규모 데이터

[관찰] Skywise는 Foundry 플랫폼 자체를 업계 표준으로 변환한 사례. 동일 온톨로지 위에 경쟁 관계인 항공사들이 공존하면서도 데이터 격리가 보장됨.

[관찰→참여] "내부 사용 → 외부 파트너 → 업계 플랫폼"의 점진적 확장 패턴은 온톨로지 설계 시 확장성을 사전에 고려해야 하는 이유를 보여준다. 초기 설계가 단일 조직 전용으로 경직되면, 외부 확장이 불가능해진다.

[참여] 다중 이해관계자가 동일 모델을 공유하되 접근 권한으로 격리하는 패턴은 범용적이다. 이를 위해서는 Security가 별도 레이어가 아니라 Object Type/Property 수준에서 내장되어야 한다.

### 9.2 NHS Federated Data Platform — 의료 온톨로지

**배경**: 2023년 11월, Palantir 주도 컨소시엄(Accenture, PWC, Carnall Farrar, NECS)이 7년 계약(3.3억 파운드)으로 NHS FDP 구축.

**핵심 설계 패턴**:

1. **Federated(연방형) 온톨로지 패턴**: 중앙 집중형이 아닌, 각 병원과 ICB(통합 돌봄 위원회)가 자체 플랫폼 인스턴스를 운영하되 "연방(federation)"으로 연결. 데이터 소유권은 조직 수준에서 유지.

2. **Canonical Data Model(정규 데이터 모델)**: NHS가 IP를 소유하는 "CDM"을 정의. 각 병원의 EPR(Electronic Patient Records)을 이 CDM에 매핑. CDM은 Foundry 온톨로지의 Object Type 구조를 따르되, NHS 고유의 의료 개념(patient, episode, referral 등)으로 구성.

3. **데이터 비식별화 패턴**: 조직 간 공유 시 개인 식별 정보(이름, 주소, 생년월일) 제거. 온톨로지 수준에서 PHI/PII 속성을 분류하고 마스킹 규칙을 적용.

[관찰] NHS FDP는 "플랫폼은 통일하되 데이터 소유권은 분산"하는 연방형 모델. Palantir는 데이터에 대한 IP를 갖지 않으며, 데이터 온톨로지(CDM)의 IP도 NHS가 소유.

[관찰→참여] Federated 온톨로지 패턴은 "다중 조직이 공통 스키마를 공유하되, 각각 자기 데이터를 소유"하는 구조이다. 이를 위한 핵심 설계 요소:
- 공통 CDM(Canonical Data Model)이 있어야 함
- 각 조직이 자체 데이터를 CDM에 매핑하는 변환 파이프라인이 필요
- 조직 간 공유 시 데이터 비식별화 규칙이 온톨로지 수준에서 정의되어야 함

[참여] PHI/PII 분류를 온톨로지 설계 시점(property 정의 시)에 결정하는 것은 범용적 베스트 프랙티스이다. 인덱싱 후 거버넌스 회고 적용은 비용이 크다.

### 9.3 에너지 산업 — 자산 관리 온톨로지

**배경**: 에너지 기업이 유정(well) 관리를 위해 Foundry 온톨로지를 사용.

**핵심 설계 패턴**:

1. **교차 직무 단일 Object Type 패턴**: 석유 엔지니어, 유정 무결성 엔지니어, 유정 관리 스태프가 동일한 "Well" Object Type 위에서 각자의 입력을 공유. 별도의 Well 뷰를 만들지 않고, 하나의 Well에 대해 다양한 관점의 Property를 집약.

2. **의사결정 통합 패턴**: 동일한 Well 객체에서 단기 의사결정(유정 운영 관리)과 장기 의사결정(자산 투자 전략)이 동일한 데이터와 인사이트에서 도출됨.

3. **200+ 커넥터 통합**: 구조화된 데이터, 비구조화된 콘텐츠, 스트리밍 데이터, IoT 센서, 트랜잭션 기록, 지리공간 정보를 하나의 온톨로지에 통합.

[관찰→참여] "교차 직무 단일 Object Type"은 "하나의 실세계 엔티티 = 하나의 Object Type" 원칙의 실제 적용이다. 직무별로 별도의 엔티티를 만들면 데이터 파편화가 발생하고, Property가 동기화되지 않는다.

### 9.4 공급망/물류 — 운영 프로세스 조정 패턴

**배경**: 글로벌 소매업체(재고 부족 50% 감소), 글로벌 물류 기업(수금 $50M 증가), 해운 회사(100개국 2,000명 고객 서비스 에이전트).

**Operational Process Coordination 패턴 (Foundry 공식 사용 사례 패턴)**:

1. **이중 온톨로지 레이어**:
   - Process Ontology: 워크플로우 메커니즘 모델링 (담당자, 생성/할당 시각, 우선순위, 상태)
   - Subject Matter Ontology: 의사결정을 위한 "디지털 트윈" (비즈니스 도메인 데이터)

2. **Action Inbox 패턴**: 사용자에게 작업을 할당하고, 데이터 탐색 → 의사결정 → 의사결정 기록의 흐름을 지원. 의사결정이 하류(downstream) 프로세스와 외부 시스템에 전파됨.

3. **Writeback + Source System 동기화**: 의사결정이 온톨로지에 기록된 후, 외부 시스템(SAP, Salesforce 등)으로 다시 동기화됨.

[관찰] Process Ontology와 Subject Matter Ontology의 분리는 핵심 설계 결정이다. "어떻게 일하는가(workflow)"와 "무엇에 대해 일하는가(domain)"를 분리하면 워크플로우 패턴을 도메인과 독립적으로 재사용할 수 있다.

[관찰→참여] Action Inbox는 "의사결정을 데이터로 캡처하는" 구체적 UI 패턴이다. 사용자가 결정을 내리면 그 결정이 Object의 Property 변경으로 기록되고, 이것이 조직 학습의 기반이 된다.

[참여] Process Ontology(워크플로우) + Subject Matter Ontology(도메인)의 분리는 범용적 설계 원칙이다. 워크플로우 로직(할당, 에스컬레이션, SLA)은 도메인과 무관하게 재사용 가능하므로, 도메인 모델과 분리하면 새로운 도메인에 동일한 워크플로우 패턴을 적용할 수 있다.

### 9.5 제조업 — 디지털화 사례

**배경**: 자동차 조립 라인(카시트 생산) 데이터 디지털화. 2024년 10월 구현, 2주 전후 비교.

**결과**: 생산 통계 16.34% 개선.

**패턴**: Foundry의 모듈화된 플랫폼을 통해 도구 모니터링(유지보수), 물류 관리, 안전 평가를 단일 온톨로지로 통합.

[관찰→참여] 제조업 사례에서 핵심은 "빠른 가치 증명"이다. 2주간의 모니터링으로 16.34% 개선을 정량적으로 입증한 것이 AIP 부트캠프의 "5일 만에 사용 사례 완성" 방법론과 일치한다.

---

## 10. 분석가 보고서에서 추출한 설계 시사점

### 10.1 Forrester TEI (Total Economic Impact)

**핵심 수치**:
- 3년간 혜택: $345M 이상
- 3년간 비용: $83.2M
- NPV: $262M
- ROI: 315%
- 평균 비용 절감: 30%
- 레거시 시스템 제거 절감: 3년 현재가치 약 $24M

**설계 시사점**:

1. **레거시 시스템 대체 패턴**: Foundry 도입의 핵심 가치 중 하나는 다수의 분산된 레거시 시스템을 단일 온톨로지 기반 플랫폼으로 통합하는 것. 이것이 "온톨로지가 통합 레이어"인 이유.

2. **데이터 기반 수익 증가**: 인터뷰 대상 조직들은 "데이터 기반 인사이트와 더 신뢰할 수 있는 예측"을 통해 수익을 증가시킴. 온톨로지 위에서 ML 모델이 운영 최적화를 지원하는 패턴.

[관찰→참여] ROI 315%의 핵심 동인(driver)은 "데이터 통합 + 의사결정 자동화"이다. 온톨로지가 단순한 데이터 모델링 도구가 아니라, 조직의 의사결정 프로세스를 자동화하고 추적하는 시스템으로 작동할 때 이 수준의 ROI가 가능하다.

### 10.2 Gartner 평가

**핵심 내용**:
- Gartner Magic Quadrant for Data Integration Tools (2024년 12월): Palantir 포함
- 2022년 최초 진입 시 "Visionaries" 사분면에 위치
- Gartner Peer Insights에서 별도 평가 제공

[관찰] Gartner는 Palantir를 "Data Integration Tools" 카테고리로 분류하며, 이는 Foundry의 핵심 가치가 "데이터 통합"에 있음을 시사한다.

### 10.3 IDC MarketScape

**핵심 내용**:
- IDC MarketScape: Worldwide Decision Intelligence Platforms 2024에 Palantir Technologies 포함
- "Decision Intelligence"라는 카테고리는 Foundry의 "의사결정 중심 온톨로지" 철학과 직접 연결됨

[관찰→참여] Gartner(Data Integration)와 IDC(Decision Intelligence)가 Palantir를 다른 카테고리로 분류하는 것은 Foundry의 이중적 정체성을 반영한다: 기술적으로는 데이터 통합 플랫폼이지만, 비즈니스 가치는 의사결정 지능에서 나온다.

---

## 11. AIP 부트캠프 방법론

### 11.1 5일 스프린트 구조

**일차별 구조**:
- Day 1: 보안 데이터 통합. 엔지니어가 소스 시스템 연결, 온톨로지 구축, 언어 모델에 라이브 컨텍스트 주입
- Day 2: 운영 워크플로우(물류 최적화, 유지보수 예측 등). 재무/운영/보안 이해관계자가 교차 기능 가치 관찰
- Day 3-4: 반복 개선 및 사용자 테스트
- Day 5: 최소 하나의 프로덕션 레디 워크플로우 완성

**핵심 원칙**:

1. **"의사결정에서 시작하라(Start with the Decision)"**: "방법(method)보다 결과(outcome)가 더 중요하다." 대시보드를 만들겠다고 시작하지 말고, 어떤 의사결정과 결과를 지원할 것인지 먼저 이해하라.

2. **문제 분해(Problem Decomposition)**: 프로젝트를 "작고 논리적인 단계들"로 분해. 결과에서 역으로 필요한 데이터를 식별하고, 각 단계를 적절한 플랫폼 도구에 매핑.

3. **데이터 기반 루프(Data-Driven Loops)**: "데이터로 의사결정 → 의사결정 기록 → 시간에 따른 영향 측정"의 순환 구조를 만든다.

4. **도구 선택과 반복(Tool Selection & Iteration)**: 접근 가능한 도구(Contour으로 프로토타이핑)로 시작하고, 검증 후 프로덕션 솔루션(Code Repositories, 대시보드, Object Views, 커스텀 앱)으로 진행.

### 11.2 사용 사례 전달(Delivering a Use Case) 방법론

**핵심 정의**: 사용 사례 = "전담 팀이 특정 의사결정 과정을 지원하기 위한 시간 한정 노력(time-bound effort)"

**3대 균형 요소**: 원하는 결과(desired outcome), 사용 가능한 데이터(available data), 플랫폼 도구(platform tools)

**구체적 절차**:
1. 결과 정의 (어떤 의사결정을 가능하게 할 것인가?)
2. 역방향 데이터 식별 (그 의사결정에 필요한 데이터는?)
3. 기존 데이터 탐색 (Data Catalog, Object Explorer)
4. 도구 선택 (프로토타이핑 → 프로덕션)
5. 반복 및 개선

[관찰] AIP 부트캠프의 "5일 만에 프로덕션 레디"는 과장이 아니라 방법론의 결과이다. Day 1에 데이터 통합과 온톨로지 구축을 동시에 하고, Day 2부터 바로 운영 워크플로우를 구축하는 것은 "온톨로지를 완성한 후에 앱을 만든다"는 전통적 접근의 정반대.

[관찰→참여] "사용 사례 = 시간 한정 노력"이라는 정의는 핵심적이다. 온톨로지 전체를 한 번에 설계하는 것이 아니라, 하나의 의사결정 과정에 필요한 만큼만 온톨로지를 구축하고, 가치를 증명한 후 확장하는 패턴.

[참여] "의사결정에서 시작하라"는 범용적 설계 원칙이다. 데이터 모델링의 목표는 데이터를 구조화하는 것이 아니라, 더 나은 의사결정을 가능하게 하는 것이다. 이 원칙을 위반하면 "아무도 사용하지 않는 완벽한 모델"이 만들어진다.

---

## 12. OSDK v2 — React 프론트엔드 코드 생성 패턴

### 12.1 OSDK v2의 핵심 개선사항

**v1 → v2 아키텍처 변경**:

| 관점 | v1 | v2 |
|------|----|----|
| 성능 스케일링 | 온톨로지 전체에 비례 | 온톨로지의 형태(shape)와 메타데이터에 비례 (선형) |
| 클라이언트-코드 결합 | 밀접 결합 | 분리 (라이브러리 업데이트 시 SDK 재생성 불필요) |
| 로딩 방식 | 전체 로딩 | Lazy loading (사용 시점에 로딩) |
| 지리 타입 | GeoShape, GeoPoint | GeoJSON |
| 시간 타입 | Timestamp, LocalDate | ISO 8601 문자열 |
| 객체 래핑 | 직접 객체 타입 | `Osdk.Instance<ObjectType>` |
| API 호출 | `client.ontology.objects.myObject.fetchPage()` | `client(myObject).fetchPage()` |

### 12.2 React Hooks 패턴 (실험적)

**useOsdkObjects — 컬렉션 조회**:
```typescript
import { useOsdkObjects } from "@osdk/react/experimental";
import { Todo } from "@my/osdk";

// 기본 조회
const { data, isLoading, error, fetchMore } = useOsdkObjects(Todo);

// 필터 조회
const { data } = useOsdkObjects(Todo, {
  where: { text: { $startsWith: "cool " } },
});

// 실시간 구독
const { data } = useOsdkObjects(Todo, {
  where: { isComplete: false },
  streamUpdates: true,
});

// 자동 페이지네이션 (주의: 대규모 데이터셋에서 성능 문제)
const { data } = useOsdkObjects(Todo, { autoFetchMore: 100, pageSize: 25 });
```

**useOsdkObject — 단일 객체 추적**:
```typescript
// 기존 인스턴스 추적
const { object, isLoading, error } = useOsdkObject(todo);

// Primary Key로 로드
const { object } = useOsdkObject(Todo, todoId);
```

**useLinks — 관계 탐색**:
```typescript
const { links: comments } = useLinks(todo, "comments", {
  orderBy: { createdAt: "desc" },
  dedupeIntervalMs: 10000, // 재요청 제어
});
```

### 12.3 React 애플리케이션 아키텍처 패턴

**구조**:
- OsdkProvider (인증 컨텍스트 제공) → Router → Components
- Custom hooks (useProjects, useTasks 등)로 OSDK 상호작용 캡슐화
- SWR(stale-while-revalidate) 전략으로 캐싱 및 백그라운드 업데이트
- 실시간 구독(subscription)으로 onChange, onError, onOutOfDate 처리

**다형적 컴포넌트 패턴**:
- Base Interface: ITask
- Concrete Types: CodingTask, LearningTask
- `$objectType` 속성 확인 후 적절한 서브컴포넌트 렌더링
- 온톨로지의 Interface 개념이 프론트엔드의 다형적 UI 렌더링으로 자연스럽게 매핑

**상태 관리**: Context 기반 인증(OsdkProvider) + Hook 수준 캐싱(SWR). Redux 같은 글로벌 상태 저장소 불필요.

[관찰] OSDK v2의 핵심 설계 결정은 "온톨로지 전체가 아닌 형태(shape)에 비례하여 스케일링"하는 것이다. 이것은 대규모 온톨로지에서 프론트엔드 빌드 시간을 선형으로 유지하게 한다.

[관찰→참여] 온톨로지의 Interface가 프론트엔드의 다형적 UI 렌더링으로 매핑되는 패턴은 핵심적이다. 온톨로지에서 "Facility" Interface를 정의하면, OSDK가 `$objectType` 필드를 자동 생성하고, React 컴포넌트는 이 필드로 Airport/Plant/Hangar를 구분하여 렌더링한다.

[참여] "온톨로지 정의 → 타입 생성 → 타입 안전한 UI 컴포넌트"의 전체 파이프라인은 범용적 설계 패턴이다. 스키마(ontology)가 변경되면 생성된 타입이 변경되고, 타입이 변경되면 UI 컴포넌트에서 컴파일 오류가 발생한다. 이 "스키마 → 타입 → UI"의 연쇄 변경 감지가 대규모 시스템의 안정성을 보장한다.

---

## 13. CodeStrap 운영 모델 — Ontology North/South 분리

### 13.1 North/South Ontology 개념

**South Ontology Team** (데이터 통합 및 모델링):
- 역할: 데이터 엔지니어, 데이터 분석 전문가
- 기술: Python, PySpark, PipelineBuilder, Jupyter Notebooks
- 산출물: ERD 다이어그램을 "데이터 계약(data contracts)"으로 발행
- Union Views: 다수의 backing datasets를 지원

**North Ontology Team** (애플리케이션 및 비즈니스 가치):
- 역할: 비즈니스 리더십, 도메인 전문가, Python/TypeScript 엔지니어
- 기술: API, AIP(AI 시스템)
- 산출물: 추적/귀속 메커니즘(tracking & attribution mechanics) 정의
- 비즈니스 영향 측정을 위한 트래킹 설계

**Ontology Product Manager (OPM)**: 기술과 비즈니스를 잇는 브릿지 역할. 양 팀에 걸쳐 활동. 사용 사례 시퀀싱, 개선 우선순위, 이해관계자 커뮤니케이션 담당.

### 13.2 DAO 패턴을 통한 플랫폼 추상화

**원칙**: "DAO + Compute Module이 Foundry 고유 사항을 함수 인터페이스 뒤에 격리"

**아키텍처**:
- Foundry: 데이터 모델과 Action을 보유
- GitHub: 모든 애플리케이션 코드(서비스, DAO, 로직, 테스트, CI/CD, API, 컨테이너)
- Docker 컨테이너로 배포하여 클라우드/온프레미스 이식성 보장
- Foundry Mocks로 완전한 E2E 없이도 단위 테스트 가능

**벤더 잠금(lock-in) 방지 패턴**:
- "비즈니스 로직을 플랫폼 특화 인프라에서 분리(decoupling)"
- 의존성 주입(dependency injection)으로 컴포넌트 대체 용이
- 마이그레이션이 "사전에 예측 가능하고 추정 가능"

### 13.3 반(反) 패턴 방지

이 운영 모델이 방지하는 안티패턴:
1. **중앙 IT의 게이트키퍼화**: IT를 "플랫폼 스튜어드(steward)"로 역할 변환
2. **벤더 종속**: 비즈니스 로직과 플랫폼 로직의 명확한 분리로 마이그레이션 경로 보장
3. **고아 데이터 계약**: South 팀이 ERD를 발행하므로 North 팀이 통합 중에도 독립적으로 진행 가능
4. **가치 미측정**: North 팀이 솔루션 구축 전에 추적/귀속 메커니즘을 먼저 정의

[관찰] CodeStrap의 North/South 분리는 Foundry의 "Semantic Layer(South) vs Application Layer(North)"를 조직 구조로 투영한 것이다.

[관찰→참여] DAO 패턴을 통한 플랫폼 추상화는 "인하우스 구현" 시나리오에서 핵심적이다. Foundry 플랫폼 자체를 사용하지 않더라도, 온톨로지 접근을 함수 인터페이스 뒤에 격리하면 향후 플랫폼 변경이나 자체 구현 변경에 대한 영향을 최소화할 수 있다.

[참여] "데이터 계약(data contracts)"을 ERD로 발행하는 패턴은 범용적이다. South 팀이 North 팀에게 안정적인 인터페이스를 제공하면, 양 팀이 독립적으로 진행할 수 있다. 이것은 API 계약(API contract)과 동일한 원리이다.

---

## 14. Semantic Web와의 패러다임 비교 심화

### 14.1 Open World vs Closed World

| 관점 | Semantic Web (OWA) | Palantir Ontology (CWA) |
|------|-------------------|------------------------|
| 누락된 데이터 | "아직 알 수 없음" | "존재하지 않음" 또는 "해당 없음" |
| 운영 영향 | 워크플로우 중단 가능 (판단 보류) | 워크플로우 중단 없이 진행 (명시적 부재) |
| 적합한 용도 | 지식 발견, 연구 | 기업 운영, 자동화 |
| 예시 | "급여 대장에 없음" = "알 수 없음" | "급여 대장에 없음" = "급여를 지급하지 마라" |

### 14.2 Webhook 분리 패턴 (사전/사후 커밋)

- **Write-back webhooks (pre-commit)**: 강한 일관성(strong consistency) 보장. 외부 시스템 성공 시에만 온톨로지 커밋.
- **Side-effect webhooks (post-commit)**: 비핵심적(non-critical) 작업 처리. 온톨로지 커밋 후 실행.

### 14.3 AI 통합 규칙 (OAG)

**핵심 원칙**: "텍스트가 아니라 온톨로지 객체 자체를 LLM 컨텍스트에 주입한다." 이것은 텍스트 해석이 아닌 구조적 바인딩(structural binding)을 통해 할루시네이션을 줄인다.

**보안 상속**: "사용자에게 보이지 않는 데이터는 AIP Logic의 LLM에도 절대 도달하지 않는다." Permission 모델이 AI 에이전트에도 동일하게 적용됨.

**근본 원칙**: "System of Record → System of Action". 기업은 저장소(repository)가 아니라 통합 읽기-쓰기(read-write) 아키텍처가 필요하다.

[관찰] Foundry의 AIP는 LLM에 "텍스트 문서"가 아니라 "온톨로지 객체(구조화된 데이터)"를 주입한다. 이것이 RAG(Retrieval-Augmented Generation)의 일반적 텍스트 기반 접근과 다른 점이다.

[관찰→참여] "온톨로지 객체를 LLM 컨텍스트에 주입"하는 패턴은 할루시네이션 감소의 핵심 메커니즘이다. 텍스트는 해석의 여지가 있지만, 구조화된 객체(Object의 Property와 Link)는 명확한 의미를 갖는다.

[참여] Permission이 AI 에이전트에도 동일하게 적용되는 원칙은 범용적이다. AI가 사용자보다 더 많은 데이터에 접근할 수 있으면 권한 우회(privilege escalation)가 발생한다. "AI 에이전트의 접근 범위 = 그것을 호출한 사용자의 접근 범위"가 원칙이어야 한다.

---

## 15. 온톨로지 설계 안티패턴 종합

리서치에서 발견된 안티패턴을 분류별로 정리:

### 15.1 엔티티 설계 안티패턴

| 안티패턴 | 설명 | 해결 방향 |
|----------|------|-----------|
| 테이블-엔티티 직접 매핑 | DB 테이블을 그대로 Object Type으로 노출 | 비즈니스 개념을 먼저 모델링하고 데이터를 연결 |
| 과적(overloaded) 엔티티 | 하나의 Object Type에 너무 많은 Property | Core + Auxiliary + Secondary로 분할 (Lean Entity 패턴) |
| Many-to-Many 남용 | 모든 관계를 M:N 링크로 모델링 | 1:N vs M:N 구분, 카디널리티 사전 결정 |
| 직무별 중복 엔티티 | 같은 실세계 엔티티를 팀별로 별도 생성 | 교차 직무 단일 Object Type + 접근 권한 분리 |

### 15.2 거버넌스 안티패턴

| 안티패턴 | 설명 | 해결 방향 |
|----------|------|-----------|
| 사후 거버넌스 적용 | 인덱싱 후 PHI/PII 분류 시도 | Property 정의 시점에 거버넌스 결정 완료 |
| Interactive/Indexing-Only 혼합 | 편집 가능과 읽기 전용을 구분 없이 혼합 | Day-1에 편집 가능 여부 결정 |
| 모놀리식 온톨로지 | 모든 도메인을 단일 온톨로지에 | 도메인별 분리 후 Interface/Shared Property로 연결 |
| 코드젠 없는 YAML 관리 | 변경 영향을 수동 추적 | 코드젠 파이프라인으로 컴파일 타임 감지 |

### 15.3 방법론 안티패턴

| 안티패턴 | 설명 | 해결 방향 |
|----------|------|-----------|
| 온톨로지 완성 후 앱 구축 | 모든 엔티티를 사전 정의한 후 앱 개발 시작 | 하나의 사용 사례에 필요한 만큼만 구축하고 확장 |
| 방법에서 시작 | "대시보드를 만들자"로 시작 | "어떤 의사결정을 가능하게 할 것인가?"로 시작 |
| FDE 역할 미정의 | 도메인 번역자 역할 없이 시작 | 도메인 전문가-엔지니어 번역 역할을 명시적으로 정의 |
| 가치 측정 미정의 | 트래킹 메커니즘 없이 솔루션 구축 | 솔루션 전에 추적/귀속 메커니즘 정의 |

---

## 16. 데이터 파이프라인 베스트 프랙티스

### 16.1 레이어 구조 (Raw → Clean → Transform)

Foundry의 데이터 파이프라인은 다음 레이어로 구성됨:

- **Raw(원시)**: 소스 시스템에서 그대로 수집된 데이터
- **Clean(정제)**: 원시 데이터와 유사하지만, 기본 정제가 적용된 상태. "많은 Foundry 활동(분석, 모델링, 파이프라인)의 시작점"
- **Transform(변환)**: Clean에서 특정 사용 사례를 위해 변환된 데이터

**핵심 원칙**: "Clean에서 다운스트림으로 가는 중간 변환 단계는 처음에 형식적으로 느껴지더라도 항상 권장된다."

### 16.2 네이밍 컨벤션

- Column/Dataset 이름: snake_case 사용 (awesome_dataset, not AwesomeDataset)
- 고유 부분(distinctive portion)을 이름 앞에 배치 (드롭다운에서 잘리는 것 방지)
- 약어 사용 금지
- 번호 증분(dataset1, dataset2) 금지

### 16.3 카탈로그 조직 패턴

```
/Domain
  /Subject Area
    /Entity
      - gold_<entity>
      - silver_<entity>
      - ref_<lookups>
```

[관찰→참여] Foundry의 Raw → Clean → Transform은 Medallion Architecture(Bronze → Silver → Gold)의 변형이다. 핵심 원칙은 동일하다: 데이터 품질을 단계적으로 높이고, 각 단계의 목적을 명확히 구분한다.

---

## Sources

### Palantir 공식 문서
- [Ontology Overview](https://www.palantir.com/docs/foundry/ontology/overview)
- [Why Create an Ontology?](https://www.palantir.com/docs/foundry/ontology/why-ontology)
- [Core Concepts](https://www.palantir.com/docs/foundry/ontology/core-concepts)
- [Types Reference](https://www.palantir.com/docs/foundry/object-link-types/type-reference)
- [Object Types Overview](https://www.palantir.com/docs/foundry/object-link-types/object-types-overview)
- [Link Types Overview](https://www.palantir.com/docs/foundry/object-link-types/link-types-overview)
- [Properties: Base Types](https://www.palantir.com/docs/foundry/object-link-types/base-types)
- [Structs Overview](https://www.palantir.com/docs/foundry/object-link-types/structs-overview)
- [Value Type Constraints](https://www.palantir.com/docs/foundry/object-link-types/value-type-constraints)
- [Type Classes](https://www.palantir.com/docs/foundry/object-link-types/metadata-typeclasses)
- [Interface Overview](https://www.palantir.com/docs/foundry/interfaces/interface-overview)
- [Action Types Overview](https://www.palantir.com/docs/foundry/action-types/overview)
- [Action Type Rules](https://www.palantir.com/docs/foundry/action-types/rules)
- [Function-Backed Actions](https://www.palantir.com/docs/foundry/action-types/function-actions-overview)
- [Data Integration Overview](https://www.palantir.com/docs/foundry/data-integration/overview)
- [Datasets](https://www.palantir.com/docs/foundry/data-integration/datasets)
- [Virtual Tables](https://www.palantir.com/docs/foundry/data-integration/virtual-tables)
- [Ontology SDK Overview](https://www.palantir.com/docs/foundry/ontology-sdk/overview)
- [Object Backend Overview (OSv2)](https://www.palantir.com/docs/foundry/object-backend/overview)
- [Ontology System Architecture](https://www.palantir.com/docs/foundry/architecture-center/ontology-system)
- [Object Storage V1 (Phonograph)](https://www.palantir.com/docs/foundry/object-databases/object-storage-v1)

### 분석 자료
- [Understanding Palantir's Ontology: Semantic, Kinetic, and Dynamic Layers Explained (Medium)](https://pythonebasta.medium.com/understanding-palantirs-ontology-semantic-kinetic-and-dynamic-layers-explained-c1c25b39ea3c)
- [Palantir OSDK TypeScript (GitHub)](https://github.com/palantir/osdk-ts)
- [Palantir Foundry Platform TypeScript (GitHub)](https://github.com/palantir/foundry-platform-typescript)

### 구현 사례 및 분석가 보고서 (2026-03-30 추가)
- [Airbus & Skywise Impact](https://www.palantir.com/impact/airbus/)
- [Palantir & Airbus Partnership Overview (PDF)](https://www.palantir.com/assets/xrfr7uokpv1b/7uEHPTEM0MkKtBFcx2zh63/9d75da5b76439717ac95135b5012479e/Palantir-Airbus-Partnership_Overview.pdf)
- [Palantir and the NHS - MetaOps](https://metaops.solutions/blog/palantir-and-the-nhs)
- [NHS England Federated Data Platform FAQs](https://www.england.nhs.uk/digitaltechnology/nhs-federated-data-platform/fdp-faqs/)
- [Understanding The NHS Federated Data Platform - 6B Health](https://6b.health/insight/understanding-the-nhs-federated-data-platform/)
- [Palantir Foundry Ontology for Energy](https://www.palantir.com/explore/platforms/foundry/ontology-energy/)
- [Forrester TEI of Palantir Foundry (PDF)](https://www.palantir.com/assets/xrfr7uokpv1b/7h0zi3GZrU3L7AM2HO1Q6O/1ad26eaa42ad949f8e3c80ea22f96b7a/The_Total_Economic_Impact_of_Palantir_Foundry.pdf)
- [Gartner Peer Insights — Palantir Foundry](https://www.gartner.com/reviews/market/data-integration-tools/vendor/palantir-technologies/product/foundry-2024460406)
- [IDC MarketScape: Decision Intelligence Platforms 2024](https://my.idc.com/getdoc.jsp?containerId=US51047423)
- [Ontology & Catalog Design in Palantir Foundry Part 1 (Medium)](https://medium.com/@sachtekchanda90/ontology-catalog-design-in-palantir-foundry-part-1-21904cebd7d3)
- [Foundational Ontologies in Palantir Foundry (Medium)](https://dorians.medium.com/foundational-ontologies-in-palantir-foundry-a774dd996e3c)
- [Enterprise Ontology Paradigm: From Semantic Web to Palantir (Pebblous)](https://blog.pebblous.ai/project/CURK/ontology/enterprise-ontology-paradigm/en/)
- [CodeStrap Operating Model for Palantir Foundry (Medium)](https://medium.com/codestrap/the-codestrap-operating-model-for-palantir-foundry-c2e230b7f64a)
- [Foundry Developer Foundations (Medium)](https://medium.com/codestrap/foundry-developer-foundations-59afc76b7006)
- [Data Digitization in Manufacturing Factory Using Palantir Foundry (MDPI)](https://www.mdpi.com/2227-9717/12/12/2816)
- [Real World Use Cases of Palantir Foundry - SS Tech](https://sstech.us/real-world-use-cases-of-palantir-foundry/)
- [Empowering Business Decisions: Palantir Foundry Case Studies - Unit8](https://unit8.com/resources/palantir-foundry-case-studies-by-unit8/)

### AIP 및 방법론
- [Palantir AIP Bootcamp](https://www.palantir.com/platforms/aip/bootcamp/)
- [Deploying Full Spectrum AI in Days: How AIP Bootcamps Work (Blog)](https://blog.palantir.com/deploying-full-spectrum-ai-in-days-how-aip-bootcamps-work-21829ec8d560)
- [Palantir Platform Bootcamp Guide - PVM](https://blog.pvmit.com/pvm-blog/palantir-platform-bootcamp-guide)
- [Delivering a Use Case (Foundry Docs)](https://www.palantir.com/docs/foundry/getting-started/delivering-a-use-case)
- [Operational Process Coordination Pattern (Foundry Docs)](https://www.palantir.com/docs/foundry/use-case-patterns/operational-process-coordination)
- [AIP Logic Overview (Foundry Docs)](https://www.palantir.com/docs/foundry/logic/overview)
- [AIP Overview (Foundry Docs)](https://www.palantir.com/docs/foundry/aip/overview)

### OSDK v2 및 React 패턴
- [OSDK Overview (Foundry Docs)](https://www.palantir.com/docs/foundry/ontology-sdk/overview)
- [TypeScript OSDK v2 Migration Guide (Foundry Docs)](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk-migration)
- [OSDK React Applications Overview (Foundry Docs)](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/overview)
- [Advanced Todo Application Architecture (Foundry Docs)](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/advanced-todo-application-architecture)
- [OSDK TypeScript — Querying Data](https://palantir.github.io/osdk-ts/react/querying-data/)
- [TypeScript Subscriptions (Foundry Docs)](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-subscriptions)
- [Development Best Practices (Foundry Docs)](https://www.palantir.com/docs/foundry/building-pipelines/development-best-practices)
