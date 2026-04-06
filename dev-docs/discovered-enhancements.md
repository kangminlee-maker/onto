# Discovered Enhancements

> 상태: Active
> 목적: 치환 작업 중 발견된 진화 항목을 기록한다. 현재 치환 대상이 작동한 이후에 구현 여부를 판단한다.
> 판별 기준: "이것 없이 다음 실행이 성공할 수 있는가?" — 예이면 여기에 기록만 한다.

---

## 기록 형식

각 항목은 아래 형식으로 기록한다.

- **발견일**: YYYY-MM-DD
- **출처**: 어떤 작업 중 발견했는가
- **개념**: 무엇을 발견했는가
- **현재 상태**: 이미 구현됨 / 기록만 / 미정
- **판단**: blocker인가 enhancement인가
- **비고**: 추가 맥락

---

## 항목

### 1. directory target에 패턴 기반 최소 파일 세트 포함

- **발견일**: 2026-04-05
- **출처**: codex subagent 4-lens 리뷰 결과 비교 분석
- **개념**: directory listing만 제공할 때 LLM이 자율 탐색으로 충분히 파일을 찾아 읽지만, `package.json`, `schema.prisma` 등 결정론적으로 포함 가능한 최소 파일 세트를 미리 embed하면 탐색 비용을 줄일 수 있다
- **현재 상태**: 기록만. kind를 `directory_listing`으로 변경 완료 (조치 A)
- **판단**: enhancement — 4-lens 실행에서 listing만으로도 pragmatics/evolution/axiology가 정상 작동함을 확인
- **비고**: 구현 시 3-질문 프레임의 질문 3 (품질 무해 고정 가능?) 통과하는 패턴만 포함해야 함. semantic selection은 금지

### 2. Claude CLI child process 인증 문제

- **발견일**: 2026-04-05
- **출처**: claude subagent executor 실행 시 "Not logged in" 에러
- **개념**: `spawn("claude", ...)` child process가 macOS Keychain의 OAuth 토큰에 접근 못함. `CLAUDE_CODE_OAUTH_TOKEN` 환경변수도 알려진 버그로 작동 안 함 (anthropics/claude-code#8938)
- **현재 상태**: 7가지 방법 시도 후 전부 실패. codex executor + Agent tool로 우회
- **판단**: blocker (claude host runtime CLI subprocess 사용 시) — codex, Agent tool에서는 우회 가능
- **시도한 방법**: (1) CLAUDE_CODE_OAUTH_TOKEN raw token (2) JSON wrapped (3) CLAUDECODE=1 env 제거 (4) hasAvailableSubscription 수정 (5) .credentials.json 파일 (6) clean env (7) setup-token 파일 기반
- **근본 원인**: Claude CLI v2.1.92 `-p` mode가 child process에서 외부 인증을 수락하지 않음. anthropics/claude-code#8938 미해결. 2026-04-04 서드파티 하니스 차단 정책과 시기 겹침
- **비고**: Claude CLI 측 수정 대기. 현재 codex executor(codex 할당량 사용)와 Agent tool(현재 세션 인증 상속)이 작동하는 경로

### 3. git diff target 지원

- **발견일**: 2026-04-05
- **출처**: 타 세션에서 AI-data-dashboard의 `git diff 56d3a27..83fbbac` 리뷰 시도 → harness가 diff target을 지원하지 않아 prompt-backed fallback으로 전환
- **개념**: 현재 `ReviewTargetScopeKind`는 `file | directory | bundle`만 지원. 실무 코드리뷰의 주요 use case인 "특정 커밋 범위의 diff 리뷰"를 target으로 직접 지원하지 않음
- **현재 상태**: 기록만. workaround로 `git diff > file.txt` 후 `single_text`로 넘기는 것은 가능
- **판단**: enhancement — directory/file target은 이미 작동. 하지만 실무 빈도가 높은 use case이므로 우선순위 높음
- **비고**: 구현 시 `diff` kind 추가, commit range parsing, diff materialization이 필요. 3-질문 프레임: diff를 텍스트로 추출하는 것 = script (질문 3), diff에서 의미를 판단하는 것 = LLM (질문 1)

### 4. cross-project 리뷰 시 onto 레포에서 실행해야 하는 UX 문제

- **발견일**: 2026-04-05
- **출처**: 타 세션에서 AI-data-dashboard 프로젝트 내에서 `cd /Users/kangmin/cowork/onto && npm run review:invoke`로 실행
- **개념**: onto harness의 `review:invoke`가 onto 레포 내에서만 실행 가능. 다른 프로젝트를 리뷰하려면 cd로 이동해야 하고, target은 절대 경로로 지정해야 함. filesystem boundary 승인도 필요
- **현재 상태**: **해결됨** (2026-04-06). 글로벌 CLI `onto review` 구현 완료. `bin/onto` + `src/cli.ts` + discovery 모듈.
- **판단**: ~~enhancement~~ → 해결됨
- **비고**: `npm link`로 글로벌 설치 후 어디서든 `onto review <target> <intent>` 실행 가능. 42/42 E2E ALL PASS.

### 5. Cross-project Trust Boundary: .onto/ 최초 생성 확인

- **발견일**: 2026-04-06
- **출처**: 글로벌 CLI 설계 9-lens full review (session `20260406-b28811ff`). onto_axiology AX-4 제안, Consensus C-3/CC-1 관련.
- **개념**: 외부 프로젝트에 `.onto/` 디렉토리를 처음 생성할 때 사용자 확인이 필요함. 현재는 `--project-root`를 명시적으로 전달하면 silent하게 생성됨. auto-detection(`--project-root` 없이 CWD에서 자동 결정)이 활성화되면 사용자가 의도하지 않은 디렉토리 생성이 발생할 수 있음.
- **현재 상태**: **해결됨** (2026-04-06). `cli.ts`에서 `.onto/` 미존재 시 확인 prompt (TTY) 또는 `--allow-onto-init` 필수 (non-TTY). E2E E43/E44 추가.
- **판단**: ~~blocker~~ → 해결됨
- **비고**: TTY: interactive prompt ("이 프로젝트에 .onto/ 디렉토리를 생성합니다. 계속하시겠습니까?"). non-TTY: `--allow-onto-init` flag 필수. `.gitignore`에 `.onto/review/` 추가 안내. 9-lens review의 Trust Boundary perspective에서 도출.

### 6. Cross-project Domain 해석 정책

- **발견일**: 2026-04-06
- **출처**: 이번 세션 full 9-lens review (session `20260406-6ca3a965`). CC-4, CV-7.
- **개념**: Role 해석은 core/custom/fallback 정책이 구현되었으나, domain 해석은 기존 로직 그대로(`projectRoot/domains/`에서만 탐색). 외부 프로젝트를 리뷰하면서 도메인을 지정하면(`@ontology`), 해당 프로젝트에 `domains/ontology/` 디렉토리가 없어 domain context가 빈 문자열이 됨.
- **현재 상태**: 기록만. onto 레포 내부 리뷰에서는 문제 없음.
- **판단**: blocker (cross-project + domain 지정 리뷰 시)
- **설계 필요**: Role 정책과 동일 패턴 적용 — onto 제공 도메인은 `ontoHome/domains/` only, 프로젝트 정의 도메인은 `projectRoot/domains/` → `ontoHome/domains/` fallback, 디렉토리 단위 all-or-nothing.
- **영향 파일**: `materializers.ts` (domain context path 해석), `materialize-review-prompt-packets.ts` (domain context ref), `prepare-review-session.ts` (context candidate assembly)
