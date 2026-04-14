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

**Authority seat**: `processes/design.md` (프로세스 계약). scope-runtime 이벤트 모델은 `src/core-runtime/scope-runtime/types.ts`.

**design_target binding**: `--source`가 가리키는 경로가 설계 대상(design_target)이다. 생략 시 프로젝트 루트. 이 경로의 파일이 Phase 2~5의 탐색 범위이며, Phase 1 outcome의 대상이다.

Read `~/.claude/plugins/onto/process.md` (common definitions — overview surface),
`~/.claude/plugins/onto/processes/design.md` (process contract — process surface), and
`~/.claude/plugins/onto/learning-rules.md` (learning storage rules — *not* an entrypoint surface), then execute.

Three entrypoint reference surfaces for the prompt-backed path are defined in `processes/design.md` §8 — command (this file) / process / overview. `learning-rules.md` is a storage-rule pointer, not one of the three surfaces.
