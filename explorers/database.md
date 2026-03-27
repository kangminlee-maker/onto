# Explorer 프로파일: 데이터베이스

## 탐색 도구
SQL 쿼리 도구 (MCP 서버, CLI 등)

## module_inventory 단위
테이블 / 스키마

## 구조 인식 범위
- 테이블, 컬럼, 데이터 타입
- FK (Foreign Key) 제약
- 인덱스
- 저장 프로시저, 함수
- 뷰 (View)
- 트리거
- 제약 조건 (UNIQUE, CHECK, NOT NULL)

## 소스 유형 판별 조건
- $ARGUMENTS가 DB 연결 문자열 또는 SQL 파일
- .sql 확장자
- 사용자가 "데이터베이스" 또는 "DB"를 명시

## 구조 인식 예시

올바른 보고:
> "orders 테이블은 user_id 컬럼이 있으나, users 테이블에 대한 FK 제약이 없다"

> "payment_status 컬럼은 VARCHAR(20)이며, CHECK 제약으로 'PENDING', 'COMPLETED', 'REFUNDED' 3개 값만 허용한다"

해서는 안 되는 보고:
> "orders는 users의 하위 엔티티이다"

> "이 테이블은 Lookup 테이블이다"

## detail 위치 표기
`"{설명} — {스키마}.{테이블}.{컬럼}"`

예: `"FK 제약 — public.orders.user_id → public.users.id"`

## Phase 0.5 맥락 질문
- "이 DB의 주 소비자는 누구인가요? (서비스, 보고서, 분석 도구)"
- "ORM을 사용하나요? 어떤 것인가요?"
- "마이그레이션 도구를 사용하나요? (Flyway, Liquibase 등)"
- "이미 정의된 도메인 용어집이 있나요?"

## Phase 0.5 스캔 대상
- 스키마 목록
- 테이블/뷰 수
- 저장 프로시저/함수 목록
- 트리거 유무
- 마이그레이션 이력 테이블 유무
