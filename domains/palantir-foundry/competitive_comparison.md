---
version: 1
last_updated: "2026-03-30"
source: competitive-research
status: draft
---

# Palantir Foundry — Competitive Platform Comparison

플랫폼 설계 결정(Design Decision)을 대안(Alternative)의 맥락에서 이해하기 위한 비교 연구 문서.

비교 대상: **Snowflake**, **Databricks (Unity Catalog)**, **SAP BTP (CAP/CDS)**

---

## 1. 비교 프레임워크

각 플랫폼을 Foundry의 3-Layer 구조에 대응시켜 비교한다.

| Layer | Foundry | Snowflake | Databricks | SAP BTP |
|-------|---------|-----------|------------|---------|
| **Semantic** | Object Type, Link Type, Property | Table, View, Semantic View (YAML) | Table, Unity Catalog Asset, Metric View | CDS Entity, Association, Composition |
| **Kinetic** | Action Type, Function | Stored Procedure, UDF, Task | Notebook Job, Workflow Task, UDF | Action, Function (bound/unbound), Service Task |
| **Dynamic** | Marking, Object Security Policy, Restricted View | Row Access Policy, Dynamic Data Masking, RBAC | Unity Catalog RBAC, Row Filter, Column Mask, ABAC | @restrict/@requires annotation, CDS Access Control, Authorization Object |

---

## 2. Semantic Layer 비교: 엔티티 모델링

### 2.1 모델링 철학의 근본 차이

**[관찰] Foundry는 "Ontology-first" — 데이터가 아닌 비즈니스 개념이 출발점이다.**

Foundry의 Object Type은 RDB 테이블이나 OOP 클래스에 대응하지만, 비즈니스 의미(business meaning)를 의무적으로 포함해야 한다. 테이블에 데이터를 저장하는 것이 아니라, "세계에 무엇이 존재하는가"를 먼저 정의하고 그 위에 데이터를 바인딩한다.

**[관찰→참여] Snowflake/Databricks는 "Data-first" — 테이블이 존재하고, 위에 의미를 입힌다.**

- Snowflake: Semantic View(YAML 정의)로 기존 테이블에 비즈니스 의미를 사후 부여한다. Facts/Dimensions를 논리 테이블로 분류하고, Metric은 SQL expression으로 계산한다.
- Databricks: Metric View(YAML 또는 SQL DDL)로 measure/dimension을 정의한다. Unity Catalog가 메타데이터 거버넌스를 담당하지만, 데이터 모델 자체가 출발점이다.
- 두 플랫폼 모두 2025년에 Semantic Layer를 제품에 내장했지만, 이는 분석용 메트릭 정의에 초점을 맞추며, Foundry처럼 운영 실행(operational execution)까지 포함하지 않는다.

**[관찰→참여] SAP BTP/CAP은 "Domain-first" — DDD 원칙에 따라 비즈니스 도메인 모델을 선언적으로 정의한다.**

- CDS Entity는 "What, not How"를 원칙으로 의도(intent)를 캡처한다.
- Association(독립적 엔티티 간 관계)과 Composition(포함 관계, 예: Order-Items)을 구분한다.
- Business Object는 Root Entity + Child Entity의 트리 구조이며, DDD의 Aggregate에 대응한다.

### 2.2 관계 모델링 비교

| 측면 | Foundry Link Type | Snowflake | Databricks | SAP CDS |
|------|-------------------|-----------|------------|---------|
| **관계 표현** | 명시적 Link Type (방향, 카디널리티, 비즈니스 의미 포함) | FK/JOIN (스키마 수준) | Metric View의 join spec (star schema 관계) | Association (독립 관계) + Composition (포함 관계) |
| **방향성** | 명시적 source → target | 암시적 (JOIN 방향) | 명시적 join specification | 명시적 (managed: 자동 FK, unmanaged: 수동 ON 조건) |
| **비즈니스 의미** | 필수 (관계의 의미를 자연어로 기술) | 없음 (컬럼명에 의존) | 없음 | 없음 (코드 주석으로 대체) |
| **카디널리티** | 1:1, 1:N, M:N 명시 | 스키마에서 추론 | join에서 fan-out 방지 설정 | to-one / to-many 명시 |

**[관찰] Foundry만이 관계에 비즈니스 의미를 필수로 요구한다.** 다른 플랫폼에서 관계는 기술적 연결(FK, JOIN)이지만, Foundry에서 관계는 "Person이 Vehicle을 소유한다"와 같은 비즈니스 사실의 선언이다.

**[참여] SAP CDS의 Association/Composition 구분은 범용적으로 유용한 설계 패턴이다.** Association은 독립 엔티티 간의 참조이고, Composition은 부모-자식의 포함 관계(Document Structure)를 나타낸다. Foundry의 Link Type은 이 구분을 명시적으로 하지 않는다.

### 2.3 Star Schema vs Ontology Graph

**[관찰→참여] Foundry는 Fact-Dimension 패턴을 거부하고 Directed Graph를 채택했다.**

- 전통적 Star Schema(Kimball): 비정규화된 Fact 테이블 + Dimension 테이블. 분석 최적화에 특화.
- Foundry Ontology: 정규화된 Object 노드 + 타입이 지정된 Link 엣지. 모든 테이블이 동등한 노드이며, 분석가가 JOIN 방법을 추측하지 않고 그래프를 탐색한다.

**Trade-off:**
- Star Schema: 구현이 쉽고, 대부분의 데이터 팀이 경험을 갖고 있음. 하지만 비즈니스 변화에 따른 스키마 수정이 어렵다. ("별(star) 패턴에 현실을 끼워 맞춰야 한다")
- Ontology Graph: 비즈니스 변화에 유연하게 대응(노드/엣지 추가로 확장). 하지만 초기 구축 비용이 높고 전문 인력이 필요하다. ("7~8자리 비즈니스 결과를 기대하는 조직에 적합")

### 2.4 메타데이터 관리: Ontology vs Catalog

| 측면 | Foundry Ontology | Databricks Unity Catalog | Snowflake Horizon |
|------|-----------------|--------------------------|-------------------|
| **성격** | 운영 실행 시스템 (읽기+쓰기+실행 통합) | 데이터 거버넌스 레이어 (메타데이터 관리) | 데이터 거버넌스/보안 레이어 |
| **범위** | 엔티티 + 행동 + 권한이 하나의 실행 가능 아티팩트 | 카탈로그(테이블/뷰/모델) + 접근 제어 + 리니지 | 태깅 + 마스킹 + 접근 이력 |
| **의미 모델** | Object/Link/Action이 통합된 비즈니스 모델 | Metric View (분석용 측정 지표 정의) | Semantic View (분석용 논리 테이블) |
| **세계 가정** | 폐쇄 세계 가정 (시스템에 없으면 존재하지 않음) | 개방적 (외부 데이터 연결 가능) | 개방적 |

**[관찰] Foundry의 Ontology는 "메타데이터 레이어"가 아니라 "운영 체제(Operating System) 자체"이다.** Snowflake/Databricks의 Semantic Layer가 "분석을 위한 메트릭 거버넌스"에 집중하는 반면, Foundry의 Ontology는 "운영 워크플로 자동화"까지 포함한다.

**[참여] 2025-2026 시장은 두 진영으로 분화 중이다:**
1. **메트릭 거버넌스 진영** (Snowflake, Databricks, dbt, Looker): 수익, 이탈 등 모든 도구와 AI 에이전트가 동일 정의를 사용하도록 보장
2. **운영 자동화 진영** (Palantir Foundry, Microsoft Fabric): Semantic Layer + 운영 워크플로 자동화를 결합

---

## 3. Kinetic Layer 비교: 행동 모델링

### 3.1 행동(Action/Behavior) 추상화 수준

| 측면 | Foundry Action Type | Snowflake Stored Procedure/UDF | Databricks Notebook Job | SAP CDS Action/Function |
|------|---------------------|-------------------------------|------------------------|------------------------|
| **추상화 수준** | 비즈니스 행동 ("환불 처리") | 기술적 프로시저 (SQL/Python 코드) | 코드 실행 단위 (Notebook Cell) | 엔티티 바운드 행동 (비즈니스 + 기술) |
| **온톨로지 연결** | Object Type에 직접 바인딩 | 테이블에 대해 실행 (간접 연결) | 데이터에 대해 실행 | CDS Entity에 바운드 |
| **원자성** | 트랜잭션 단위 (모든 변경이 함께 커밋) | 프로시저 단위 | Job 단위 | 트랜잭션 단위 (Draft 지원) |
| **Write-back** | Writeback Dataset으로 자동 영속화 | 테이블 DML | Delta Lake Write | CDS Persistence |
| **거버넌스** | Permission gate + Submission criteria + Rules engine | RBAC (EXECUTE 권한) | Job ACL | @restrict annotation |

**[관찰] Foundry의 Action Type은 "비즈니스 행동의 1급 시민(First-class citizen)"이다.**

Action Type의 핵심 설계 결정:
- 정의: "사용자가 한 번에 취할 수 있는 객체, 속성값, 링크에 대한 변경 또는 편집의 집합"
- 모든 변경이 원자적 트랜잭션으로 커밋된다
- Object Data Funnel이라는 마이크로서비스가 write를 오케스트레이션한다
- 각 Action의 compute overhead는 18 compute-second이며, 편집 객체 수에 따라 1 compute-second씩 추가된다

**[관찰→참여] Snowflake/Databricks는 "행동"을 1급 시민으로 모델링하지 않는다.**

- Snowflake: 행동은 SQL Stored Procedure나 Task로 표현된다. 비즈니스 의미 없이 기술적 코드 실행에 초점. Task는 스케줄 기반이거나 Stream 트리거 기반이다.
- Databricks: 행동은 Notebook Job + Workflow로 표현된다. 코드 우선(code-first) 접근으로, 데이터 사이언티스트에 최적화. 의존성은 DAG로 정의된다.
- 두 플랫폼 모두 "환불 처리"라는 비즈니스 행동을 SQL 코드나 Python 스크립트로만 표현할 수 있을 뿐, 비즈니스 행동 자체를 선언적으로 정의하는 메커니즘이 없다.

**[관찰→참여] SAP BTP의 Action/Function 모델은 Foundry에 가장 가까운 대안이다.**

- SAP CDS에서 Action은 엔티티에 바운드되어 비즈니스 행동을 표현한다: `action addRating(stars: Integer)`
- Bound action은 해당 엔티티의 primary key를 암시적 첫 번째 인자로 받는다
- Unbound action은 특정 엔티티에 연결되지 않은 서비스 수준 연산이다
- Function은 읽기 전용 (side-effect 없음), Action은 상태 변경 가능

### 3.2 오케스트레이션 모델 비교

| 측면 | Foundry | Snowflake | Databricks | SAP BTP |
|------|---------|-----------|------------|---------|
| **오케스트레이션 단위** | Dataset 의존성 그래프 | SQL Task (스케줄/트리거) | Notebook Job DAG | Workflow (User/Service/Script/Mail Task) |
| **의존성 정의** | 데이터셋 간 자동 추적 | Task 체이닝 (SQL) | Job 의존성 (DAG) | 프로세스 플로우 (BPMN 기반) |
| **핵심 차이** | "무엇이 변했는가"에 따라 자동 리빌드 | 스케줄 기반 실행 | 코드 기반 DAG 정의 | 선언적 프로세스 정의 |

**[관찰] Foundry의 오케스트레이션은 Task가 아니라 Dataset이 중심이다.** Foundry는 데이터셋 간의 방향 그래프(directed graph)를 구성하며, 상류 데이터가 변경되면 시스템이 자동으로 어떤 데이터셋을 리빌드해야 하는지 결정한다. 이는 전통적 DAG(Airflow, dbt Cloud)의 Task 기반 오케스트레이션과 근본적으로 다르다.

**[참여] SAP BTP의 프로세스 자동화는 가장 넓은 행동 유형을 지원한다.** User Task(승인), Service Task(API 호출), Script Task(경량 로직), Mail Task(알림), RPA(UI 자동화)를 모두 선언적으로 조합할 수 있다. 이는 Foundry보다 더 세분화된 행동 분류 체계이다.

### 3.3 Branching과 데이터 격리

**[관찰] Foundry만이 코드와 데이터를 동시에 브랜치한다.**

| 측면 | Foundry | Snowflake | Databricks | SAP BTP |
|------|---------|-----------|------------|---------|
| **코드 브랜칭** | 지원 (Git 기반) | Git 연동 가능 | Git 기반 | Git 연동 가능 |
| **데이터 브랜칭** | 지원 (브랜치별 데이터 버전 자동 유지) | 미지원 (Time Travel은 별도) | 미지원 (Delta Lake versioning은 별도) | 미지원 |
| **전체 파이프라인 브랜칭** | 지원 (feature branch에서 전체 ETL 실행 가능) | 미지원 | 미지원 | 미지원 |

**[관찰→참여] 데이터 브랜칭은 Foundry의 고유한 설계 결정이다.** 다른 플랫폼에서는 코드만 브랜치되고 데이터는 환경(dev/staging/prod)별로 재계산해야 한다. Foundry에서는 feature branch에서 전체 ETL 파이프라인을 독립적으로 실행하고 데이터 결과를 검증한 후 병합할 수 있다.

---

## 4. Dynamic Layer 비교: 권한 및 거버넌스

### 4.1 접근 제어 모델 비교

| 측면 | Foundry Marking | Snowflake Row Access Policy | Databricks Unity Catalog | SAP CDS Access Control |
|------|----------------|----------------------------|--------------------------|----------------------|
| **접근 제어 유형** | 의무적 접근 제어 (Mandatory Access Control) | 정책 기반 필터 | 특권 기반 (RBAC) + 태그 기반 (ABAC) | 선언적 어노테이션 (@restrict) |
| **평가 논리** | 모든 Marking을 AND로 평가 (전부 충족해야 접근 가능) | Row Access Policy → Column Mask 순서 | GRANT/REVOKE + Row Filter + Column Mask | @restrict 내 privilege들을 OR로 평가, 계층 간은 AND |
| **전파(Propagation)** | 마킹이 파생 리소스로 자동 전파 | 정책은 테이블/뷰에 직접 부착 | 카탈로그 계층 (Catalog→Schema→Table) | 서비스→엔티티→액션 계층 |
| **데이터 독립성** | Object Security Policy는 백킹 데이터소스 권한과 독립 | Row Access Policy는 테이블에 종속 | Unity Catalog 권한은 카탈로그 객체에 종속 | @restrict는 CDS 모델에 선언 |

**[관찰] Foundry의 Marking은 "데이터 중심 보안(Data-centric security)"이다.**

Marking의 핵심 설계 결정:
- 역할(role)이 접근을 확장(expand)하는 반면, Marking은 접근을 제한(restrict)한다
- 이진적(binary): 전부 또는 전무 (all-or-nothing)
- Owner 권한으로도 Marking을 제거할 수 없다 (별도의 Expand Access 권한 필요)
- 데이터가 이동하면 Marking도 함께 이동한다 (파생 데이터에 자동 전파)
- 일반적 용도: PII 접근 제한, 분류(classification) 기반 접근 제어

**[관찰→참여] Snowflake는 계층화된 보안을 제공하지만, 전파 메커니즘이 없다.**

Snowflake의 보안 설계:
- Row Access Policy: 쿼리 시점에 행 단위 필터 적용 (역할, 부서 등 기반)
- Dynamic Data Masking: 열 단위로 민감 값을 변환/숨김
- 두 정책이 동시 적용 시 Row Access Policy가 먼저 평가된다
- Secure View: 데이터 표시를 제한하지만 마스킹을 대체하지 않음 → 두 컨트롤이 함께 작동해야 함
- **제한**: 데이터가 파생되면 보안 정책이 자동으로 따라가지 않는다

**[관찰→참여] Databricks Unity Catalog는 가장 세분화된 거버넌스를 제공한다.**

Unity Catalog의 보안 설계:
- 특권 기반: SELECT, MODIFY, USE SCHEMA 등을 사용자/그룹에 부여
- Row Filter + Column Mask: 테이블에 직접 로직 적용
- ABAC (Attribute-Based Access Control): 태그 기반 정책 프레임워크로 카탈로그/스키마/테이블에 동적 적용
- Native "certified" 플래그: 데이터 자산의 품질 인증
- **강점**: 가장 세분화된 거버넌스 + 네이티브 인증 + 도메인 기반 조직화

**[관찰→참여] SAP CDS의 선언적 보안은 도메인 모델과 보안이 동일 파일에 공존한다.**

SAP CDS Access Control 설계:
- @restrict 어노테이션으로 엔티티/액션별 접근 제어를 CDS 모델에 직접 선언
- where-clause로 인스턴스 수준 필터링 (사용자 속성 + 엔티티 데이터 기반)
- READ 거부 시 403이 아닌 404를 반환 (존재 자체를 숨김)
- CREATE/UPDATE 거부 시 400 Bad Request 반환
- **강점**: 보안 규칙이 비즈니스 모델과 동일 위치에 선언되어 가시성이 높다

### 4.2 Object-level Security 비교

**[관찰] Foundry만이 Object Security Policy를 통해 온톨로지 수준의 행/열/셀 보안을 제공한다.**

- Object Security Policy: 개별 Object 인스턴스에 대한 view 권한 (행 수준 보안)
- Property Security Policy: 특정 속성에 대한 가시성 제어 (열 수준 보안)
- 결합 시 셀 수준 보안 달성
- 백킹 데이터소스의 권한과 독립적으로 운영
- Marking 상속을 선택적으로 중단 가능 (예: PII Marking을 Object 수준에서 해제하고 Property 수준에서만 적용)

**[참여] Databricks와 Snowflake도 행/열 보안을 지원하지만, 온톨로지 수준이 아닌 테이블 수준에서 작동한다.** 데이터 모델과 보안 모델이 별도로 관리된다.

### 4.3 거버넌스 철학 비교

| 플랫폼 | 거버넌스 철학 | 핵심 메커니즘 |
|--------|-------------|-------------|
| **Foundry** | "거버넌스가 설계에 내재(by design)" | Marking 전파 + Object Security + Action Permission |
| **Snowflake** | "분석 데이터에 대한 보호" | RBAC + Row/Column Policy + Secure View |
| **Databricks** | "카탈로그 중심의 통합 거버넌스" | Unity Catalog RBAC + ABAC + Row/Column Filter + Certification |
| **SAP BTP** | "도메인 모델에 선언적으로 내재" | @restrict annotation + CDS Access Control + Authorization Object |

**[참여] 거버넌스의 핵심 설계 결정은 "보안이 데이터와 함께 이동하는가"이다.**
- Foundry: 이동한다 (Marking propagation)
- Snowflake/Databricks: 이동하지 않는다 (정책이 테이블/카탈로그 객체에 부착)
- SAP: 이동하지 않는다 (정책이 CDS 모델에 선언)

---

## 5. 종합 Trade-off 분석

### 5.1 유연성 vs 거버넌스

| 플랫폼 | 유연성 | 거버넌스 | Trade-off |
|--------|-------|---------|-----------|
| **Snowflake** | 높음 (SQL 중심, 어떤 도구든 연결 가능) | 중간 (RBAC + 정책, 수동 적용) | 진입 장벽이 낮지만, 거버넌스가 자동으로 따라오지 않음 |
| **Databricks** | 높음 (코드 우선, 다중 언어, 오픈소스 기반) | 높음 (Unity Catalog 통합 거버넌스) | 엔지니어링 역량이 높은 팀에 최적화, 비기술 사용자 접근성 낮음 |
| **SAP BTP** | 중간 (CDS 모델 내에서 유연, 플랫폼 외부는 제한적) | 높음 (선언적, 모델에 내재) | SAP 에코시스템 안에서 강력하지만, 벤더 종속이 큼 |
| **Foundry** | 낮음 (Foundry 방식을 따라야 함) | 매우 높음 (설계에 내재, 자동 전파) | 초기 투자가 크지만, 규모가 커질수록 거버넌스 비용이 수렴 |

### 5.2 추상화 수준

| 플랫폼 | 추상화 수준 | 대상 사용자 | 결과 |
|--------|-----------|-----------|------|
| **Snowflake** | 낮음 (테이블 + SQL) | 데이터 분석가, SQL 사용자 | 분석에 강하지만, 운영 실행에 약함 |
| **Databricks** | 중간 (테이블 + 코드 + 카탈로그) | 데이터 엔지니어, ML 엔지니어 | 유연하지만, 비즈니스 사용자 직접 접근 어려움 |
| **SAP BTP** | 중간-높음 (CDS 엔티티 + 서비스) | 풀스택 개발자, SAP 전문가 | SAP 에코시스템 내 완결성 높음 |
| **Foundry** | 높음 (비즈니스 객체 + 행동 + 권한 통합) | 비즈니스 사용자 + 기술 사용자 | 비기술 사용자도 운영 워크플로에 참여 가능 |

### 5.3 개발자 경험 (Developer Experience)

| 측면 | Snowflake | Databricks | SAP BTP | Foundry |
|------|-----------|------------|---------|---------|
| **주요 언어** | SQL (Snowpark로 Python/Java 확장) | Python, SQL, R, Scala | CDS, JavaScript/Java (CAP) | Python, Java, SQL + GUI |
| **파이프라인 구축** | SQL Task + Stream | Notebook + Workflow DAG | Pipeline Activity + Trigger | Pipeline Builder (GUI) + Code Repository |
| **코드 vs GUI** | 코드 중심 | 코드 중심 | 코드 중심 (Fiori로 GUI 가능) | 하이브리드 (GUI + 코드 병행) |
| **학습 곡선** | 낮음 (SQL 기반) | 중간 (Spark 지식 필요) | 높음 (SAP 에코시스템 지식 필요) | 높음 (Ontology 개념 + Foundry 특유 패턴) |

**[참여] Foundry는 "코드 우선" 접근을 명시적으로 거부하고 "하이브리드" 접근을 선택했다.** Pipeline Builder(GUI)와 Code Repository(코드)를 동시에 제공하여, 비기술 사용자와 기술 사용자가 동일 플랫폼에서 협업할 수 있도록 설계했다. 이는 Databricks의 순수 코드 접근이나 Snowflake의 순수 SQL 접근과 다른 설계 결정이다.

---

## 6. 플랫폼 간 통합 동향

### 6.1 Databricks + Palantir 파트너십 (2025)

- Unity Catalog와 Palantir Virtual Tables로 제로카피 양방향 데이터 접근 가능
- Databricks의 데이터를 ETL이나 복제 없이 Foundry의 Virtual Table로 등록
- Unity Catalog가 통합 거버넌스 레이어로 기능하며, Foundry가 운영 레이어로 기능
- **의미**: 두 플랫폼이 경쟁이 아닌 보완 관계로 포지셔닝

### 6.2 SAP + Palantir 파트너십

- SAP의 데이터 파편화 문제(레거시 + 모던 시스템 분산)를 Foundry가 해결
- Palantir에게는 세계 최대 기업들의 핵심 운영 데이터에 접근하는 기회
- Foundry가 SAP S/4HANA 위에 운영 인텔리전스 레이어로 기능

**[참여] 데이터 플랫폼 시장의 트렌드는 "경쟁"에서 "보완적 통합"으로 이동 중이다.** Snowflake/Databricks가 "데이터 레이어를 더 스마트하게" 만드는 동안, Foundry는 "데이터 위의 운영 레이어"로 자리를 잡고 있다.

---

## 7. 도메인 문서 업그레이드를 위한 시사점

### 7.1 현재 domain_scope.md에 반영되지 않은 설계 결정

1. **Semantic Layer**: Star Schema 대비 Ontology Graph의 명시적 장단점이 기술되어 있지 않음
2. **Kinetic Layer**: Action Type의 원자성(atomicity), Write-back 아키텍처, Object Data Funnel의 설명이 부족
3. **Dynamic Layer**: Marking의 전파 메커니즘, Object Security Policy의 행/열/셀 수준 보안, 데이터 독립성이 상세히 기술되어 있지 않음
4. **데이터 브랜칭**: 코드+데이터 동시 브랜칭이 Foundry의 고유한 설계 결정임이 명시되어 있지 않음

### 7.2 다른 플랫폼에서 가져올 수 있는 패턴

1. **SAP CDS의 Association vs Composition 구분**: Link Type에 "독립 참조"와 "포함 관계"를 구분하는 속성 추가 가능
2. **SAP CDS의 선언적 보안 (@restrict)**: 도메인 모델과 보안 규칙을 동일 위치에 선언하는 패턴
3. **Databricks ABAC**: 태그 기반 동적 접근 제어는 Marking보다 유연한 대안
4. **SAP BTP의 행동 유형 세분화**: User Task, Service Task, Script Task, Mail Task 등의 분류 체계

---

## Sources

### Foundry 공식 문서
- [Ontology Overview](https://www.palantir.com/docs/foundry/ontology/overview)
- [Why Create an Ontology?](https://www.palantir.com/docs/foundry/ontology/why-ontology)
- [Action Types Overview](https://www.palantir.com/docs/foundry/action-types/overview)
- [Markings](https://www.palantir.com/docs/foundry/security/markings)
- [Object Security Policies](https://www.palantir.com/docs/foundry/object-permissioning/object-security-policies)

### 비교 분석
- [Palantir Foundry vs Snowflake Tasks (Orchestra)](https://www.getorchestra.io/guides/palantir-foundry-vs-snowflake-tasks-key-differences-2024)
- [Databricks Workflows vs Palantir Foundry (Orchestra)](https://www.getorchestra.io/guides/databricks-workflows-vs-palantir-foundry-key-differences-2024)
- [What Is Palantir Foundry? A Translator for Databricks/Snowflake Folks (Medium)](https://medium.com/@sachtekchanda90/im-a-data-engineer-what-is-palantir-foundry-7e7568aed87e)
- [Palantir Foundry Ontology: How It Works (Medium)](https://medium.com/@cloudpankaj/palantir-foundry-ontology-how-it-works-what-problems-it-solves-and-where-it-falls-short-d8b4a1ae4900)
- [Understanding Palantir's Ontology: Semantic, Kinetic, and Dynamic Layers (Medium)](https://pythonebasta.medium.com/understanding-palantirs-ontology-semantic-kinetic-and-dynamic-layers-explained-c1c25b39ea3c)

### Semantic Layer 비교
- [Semantic Layer 2025: MetricFlow vs Snowflake vs Databricks (TypeDef)](https://www.typedef.ai/resources/semantic-layer-metricflow-vs-snowflake-vs-databricks)
- [Semantic Layers in 2025: A Catalog Owner Playbook (Coalesce)](https://coalesce.io/data-insights/semantic-layers-2025-catalog-owner-data-leader-playbook)
- [Kimball Star Schema vs Palantir's Ontology (Medium)](https://medium.com/@AstroBeeai/kimball-star-schema-vs-palantirs-ontology-ab12728ff129)

### SAP BTP
- [SAP CAP Authorization](https://cap.cloud.sap/docs/guides/security/authorization)
- [SAP CDS CDL Reference](https://cap.cloud.sap/docs/cds/cdl)
- [SAP One Domain Model and DDD](https://community.sap.com/t5/technology-blog-posts-by-sap/sap-s-one-domain-model-and-domain-driven-design/ba-p/13464155)

### 보안 비교
- [Snowflake Row Access Policies](https://docs.snowflake.com/en/user-guide/security-row-intro)
- [Snowflake Dynamic Data Masking](https://docs.snowflake.com/en/user-guide/security-column-ddm-intro)
- [Databricks Unity Catalog Access Control](https://docs.databricks.com/aws/en/data-governance/unity-catalog/access-control)
- [Databricks Row Filters and Column Masks](https://docs.databricks.com/aws/en/data-governance/unity-catalog/filters-and-masks)

### 시장 동향
- [Palantir vs Snowflake vs Databricks (i4C)](https://www.i4c.com/palantir-vs-snowflake-vs-databricks-which-one-fits-your-business/)
- [Databricks vs Palantir (LatentView)](https://www.latentview.com/blog/databricks-vs-palantir/)
- [Palantir and SAP Integration (Medium)](https://medium.com/@mario.defelipe/what-i-learnt-this-week-about-palantir-and-sap-integration-e21c4dab1e07)
- [Palantir and Databricks Partnership (StartupHub)](https://www.startuphub.ai/ai-news/ai-video/2026/palantir-and-databricks-forge-seamless-data-architecture-for-operational-ai/)
