# Onto Design

온톨로지를 기반으로 기존 설계 대상에 새 영역을 설계합니다.

```
design <goal> [@{domain} | @-] [--ontology <path>] [--source <path>] [--prior-design <path>]
```

| 인자 | 의미 | 필수 |
|---|---|---|
| `<goal>` | 설계 목표 (자연어) | 필수 |
| `@{domain}` / `@-` | 도메인 지정 / no-domain | 선택 (생략 시 Domain Selection Flow) |
| `--source <path>` | 설계 대상(design target) 경로. 생략 시 프로젝트 루트 | 선택 |
| `--ontology <path>` | 주체자 지정 ontology 파일 | 선택 |
| `--prior-design <path>` | 반복 설계용 이전 버전 설계 문서 | 선택 |

Read `~/.claude/plugins/onto/process.md` (common definitions),
`~/.claude/plugins/onto/processes/design.md` (process contract), and
`~/.claude/plugins/onto/learning-rules.md` (learning storage rules), then execute.
