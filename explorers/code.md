# Explorer 프로파일: 코드베이스

## 탐색 도구
Glob, Grep, Read

## module_inventory 단위
디렉토리 / 패키지

## 구조 인식 범위
- 파일 구조, import/require/include
- 클래스 / 함수 시그니처
- 타입 정의, 인터페이스
- 설정 파일 (package.json, build.gradle, Makefile 등)

## 소스 유형 판별 조건
- 디렉토리에 소스 코드 파일(.py, .java, .ts, .go 등)이 존재
- package.json, pom.xml, Cargo.toml 등 빌드 설정 존재

## 구조 인식 예시

올바른 보고:
> "Payment 클래스는 status, amount, createdAt 필드를 가지며, PaymentGateway에서 status를 문자열 비교로 분기한다"

해서는 안 되는 보고:
> "Payment는 Aggregate Root이며, PaymentGateway는 Domain Service이다"

## detail 위치 표기
`"{설명} — {파일}:{라인}"`

예: `"status 필드 정의 — Payment.java:42"`

## Phase 0.5 맥락 질문
- "이 시스템의 핵심 비즈니스 흐름을 한 문장으로 설명해 주실 수 있나요?"
- "레거시 마이그레이션 이력이 있나요?"
- "관련 레포지토리(프론트엔드, 문서 등)가 있나요?"
- "이미 정의된 도메인 용어집이 있나요?"

## Phase 0.5 스캔 대상
- 디렉토리 구조
- README.md, CLAUDE.md
- 테스트 (`test/`, `__tests__/`, `spec/`)
- CI/CD (`.github/workflows/`)
- API 명세 (`openapi.yml`, `swagger.json`)
- 인프라 (`Dockerfile`, `k8s/`, `terraform/`)
