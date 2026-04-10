# CLAUDE.md

## Authority 위계

| 순위 | 역할 | 위치 |
|---|---|---|
| 1 | 개념 SSOT | authority/core-lexicon.yaml |
| 2 | 개발 원칙: OaC | design-principles/ontology-as-code-guideline.md |
| 2 | 개발 원칙: LLM-Native | design-principles/llm-native-development-guideline.md |
| 2 | 개발 원칙: 비전문가 소통 | design-principles/non-specialist-communication-guideline.md |
| 2 | 개발 원칙: 프로젝트 우선 | design-principles/project-locality-principle.md |
| 3 | 제품 방향 | design-principles/productization-charter.md |
| 4 | 인터페이스 명세 | design-principles/llm-runtime-interface-principles.md |
| 4 | 이름 규칙 | design-principles/ontology-as-code-naming-charter.md |
| 5 | 기능별 계약 | processes/{feature}/*.md (계약 파일) |
| 6 | 타입·구현 | src/core-runtime/ |
| 7 | 운영 인프라 | process.md, learning-rules.md (루트) |
| 8 | 기능 프로세스 | processes/*.md, commands/*.md, roles/*.md |

authority/ 구성: 개념 SSOT + 2개 authority-adjacent data seat (core-lens-registry.yaml: 런타임 전용, translation-reference.yaml: 온보딩용 NON-AUTHORITATIVE)
design-principles/ 구성: rank 2~4 개발 규범 문서 7개 (배포 제외)
위계 밖: development-records/ (이력/참조)

## design/ 구조 (sprint-kit 흡수, 2026-04-10)

```
src/core-runtime/
├── scope-runtime/          ← 이벤트 파이프라인, reducer, state machine, constraint pool
├── readers/                ← 소스 스캔 (scan-local, scan-vault, ontology-index/query/resolve)
├── logger.ts               ← 공용 로거
├── design/
│   ├── cli.ts              ← onto design 진입점
│   ├── commands/           ← start, align, draft, apply, close, stale-check
│   ├── renderers/          ← align-packet, draft-packet, scope-md
│   ├── config/             ← project-config
│   └── adapters/
│       ├── code-product/   ← compile, parsers, validators (코드 제품 설계)
│       └── methodology/    ← perspectives, scope-types (방법론 설계)
```

- **scope-runtime**: sprint-kit kernel 흡수. 상태 머신, 이벤트 소싱, gate guard
- **readers**: sprint-kit scanners essential subset. generators/patterns/ 지연 (260 type errors)
- **design/adapters/methodology**: 신규. authority-consistency perspective + process scope type
- Provenance: `development-records/absorptions/sprint-kit-20260410.md`

동일 순위 충돌 해소: 같은 순위 파일은 규범 내용이 중복되지 않는다. 중복 발견 시, 원칙의 성격에 부합하는 파일이 canonical이며, 나머지는 참조만 한다. 예외: 동일 개념이 서로 다른 소비 목적(구조 규칙 vs 설계 가이드)으로 필요한 경우, 각 파일의 고유 범위를 확정하고 상호 참조를 명기하여 이중 존재를 허용한다.
