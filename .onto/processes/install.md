# Install — 첫 실행 설정 마법사

`onto install` 은 onto 의 런타임 설정(`config.yml`, `.env`, `.env.example`)을 생성하는 첫 실행 마법사입니다. npm / Claude Code plugin 어느 경로로 설치됐든 실제 사용 전에 1회 실행이 필요합니다.

**Onboard 와의 차이**: `install` 은 **onto 자체의 런타임 구성**(provider, 자격 증명, 출력 언어)을 담당하고, `onboard` 는 **프로젝트별 초기화**(domains, review 실행 축, `.onto/review/` 생성 동의)를 담당합니다. `install → onboard` 순서로 실행합니다.

## 1. 설치 경로 2가지

| 경로 | 용도 | 최종 명령 |
|---|---|---|
| Claude Code plugin | Claude Code 세션 내에서 slash command 사용 | `/plugin marketplace add ... → /plugin install onto → onto install` |
| npm 글로벌 | 터미널에서 `onto` 명령 직접 사용 | `npm install -g onto-core → onto install` |

두 경로는 상호 배타적이지 않습니다. Claude Code plugin 으로 slash command 를 쓰면서 동시에 npm 으로 터미널 CLI 도 사용할 수 있습니다. `onto install` 은 어느 경로든 한 번만 실행하면 됩니다.

## 2. 실행 모드

### 2.1 Interactive (기본)

```
onto install
```

6-단계 대화형 흐름:

1. **Profile scope** — 설정을 global (`~/.onto/`) 에 심을지 project (`<repo>/.onto/`) 에 심을지.
2. **Review provider** — 9-lens review 실행에 쓸 provider. `main-native | codex | anthropic | openai | litellm` 중 택1.
3. **Review auth** — 선택 provider 에 필요한 자격 증명. API key 는 `.env` 파일에 기록, codex 는 `codex login` 안내.
4. **Learn provider** — learn/govern/promote 같은 background 작업용. review 와 동일하게 쓰거나 별도 선택.
5. **Learn auth** — review 와 다른 provider 선택 시 추가 자격 증명.
6. **Output language** — principal-facing 렌더링 언어 (`ko | en`). agent 간 통신은 영어 고정.

각 단계는 Pre-flight 감지(§4) 결과를 기반으로 스마트 디폴트를 제안합니다. Enter 키로 디폴트 채택 가능.

### 2.2 Non-interactive

```
onto install --non-interactive \
  --profile-scope <global|project> \
  --review-provider <provider> \
  [--learn-provider <same|provider>] \
  [--output-language <ko|en>] \
  [--litellm-base-url <url>] \
  [--env-file <path>]
```

필수 플래그 누락 또는 자격 증명 부재 시 에러로 종료합니다 (프롬프트하지 않음). CI, Docker 이미지, 프로비저닝 스크립트용.

## 3. 플래그 레퍼런스

### 3.1 의사결정 플래그

| 플래그 | 값 | 기본 |
|---|---|---|
| `--profile-scope` | `global \| project` | interactive: project, non-interactive: required |
| `--review-provider` | `main-native \| codex \| anthropic \| openai \| litellm` | interactive: 환경 감지 기반, non-interactive: required |
| `--learn-provider` | `same \| codex \| anthropic \| openai \| litellm` | `same` (review 와 동일). `main-native` 불가 |
| `--output-language` | `ko \| en` | `ko` |
| `--litellm-base-url` | URL | env `LITELLM_BASE_URL` fallback |

### 3.2 동작 제어 플래그

| 플래그 | 의미 |
|---|---|
| `--non-interactive` | 프롬프트 금지. 모든 결정이 argv / env 로부터 resolve 돼야 함 |
| `--reconfigure`, `--force` | 기존 config 덮어쓰기 허용 |
| `--skip-validation` | 설치 직후 provider live ping 생략 |
| `--dry-run` | 파일 쓰지 않고 최종 적용될 내용만 출력 |
| `--env-file <path>` | 설치 실행 직전 지정 `.env` 파일을 `process.env` 에 로드 |
| `--help`, `-h` | 사용법 출력 후 종료 |

### 3.3 환경변수 fallback

모든 플래그는 `ONTO_INSTALL_<UPPERCASE_WITH_UNDERSCORES>` 환경변수로 대체 가능. argv 가 env 를 이깁니다. 불리언은 `1 | true | TRUE | yes | YES` 를 참으로 해석.

```
ONTO_INSTALL_NON_INTERACTIVE=1 \
ONTO_INSTALL_PROFILE_SCOPE=project \
ONTO_INSTALL_REVIEW_PROVIDER=anthropic \
ANTHROPIC_API_KEY=sk-ant-... \
onto install
```

### 3.4 자격 증명 입력

| 변수 | 용도 |
|---|---|
| `ANTHROPIC_API_KEY` | anthropic provider |
| `OPENAI_API_KEY` | openai provider |
| `LITELLM_BASE_URL` | litellm provider endpoint |
| `LITELLM_API_KEY` | litellm provider — endpoint 가 auth 요구 시 |

**자격 증명은 플래그로 입력받지 않습니다**. shell env 또는 `--env-file` 로 지정한 파일에서만 읽습니다 (shell history / CI log 누출 방지).

## 4. Pre-flight 감지

실행 초반에 환경을 1회 스캔합니다. 감지 항목:

- 기존 `~/.onto/config.yml` / `<cwd>/.onto/config.yml`
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `LITELLM_BASE_URL` env
- codex binary on PATH + `~/.codex/auth.json`
- 현재 프로세스가 Claude Code 세션 내부인지 (CLAUDECODE / CLAUDE_PROJECT_DIR / CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS)

감지 결과는 interactive 디폴트에 반영되고, non-interactive 에서는 자격 증명 검증 자료로 쓰입니다.

## 5. 파일 쓰기

profile scope 에 따라 쓰는 위치가 달라집니다.

| Scope | config.yml | .env | .env.example | .gitignore 업데이트 |
|---|---|---|---|---|
| `global` | `~/.onto/config.yml` | `~/.onto/.env` | `~/.onto/.env.example` | — |
| `project` | `<repo>/.onto/config.yml` | `<repo>/.onto/.env` | `<repo>/.onto/.env.example` | `.onto/.env` 를 root `.gitignore` 에 append |

쓰기 동작:

- **Atomic**: temp 파일 → rename. 쓰기 중 크래시는 기존 상태 보존.
- **`.env` mode 0600** (POSIX). Windows 는 best-effort.
- **`.env` merge**: 기존 키 보존. install 이 captured 한 키만 in-place 갱신.
- **`.env.example` overwrite**: 현재 profile 의 템플릿으로 전체 덮어쓰기. Git tracked (secrets 없음).

## 6. Live Provider 검증

쓰기 후 `--skip-validation` / `--dry-run` 이 없으면 각 non-main-native provider 에 최소 reachability ping:

- **anthropic**: `GET https://api.anthropic.com/v1/models`
- **openai**: `GET https://api.openai.com/v1/models`
- **litellm**: `GET {base_url}/models` (OpenAI-compatible)
- **codex**: 로컬 파일시스템만 (binary + auth.json)
- **main-native**: skip

200 → pass. 401/403 → auth 실패 (키 재확인 메시지). 기타 → HTTP 상태 + 네트워크 오류 보고. 실패 시 exit 1. `--skip-validation` 으로 우회 가능.

## 7. 재실행

기존 config 가 감지된 상태에서 다시 실행하면 halt 됩니다. 덮어쓸 때:

```
onto install --reconfigure
```

특정 필드만 수정할 때:

```
onto config edit
```

## 8. Main-native 경로 주의

`main-native` 는 "Claude Code 세션의 Agent tool 이 lens subagent 를 spawn" 하는 경로입니다. **Claude Code 가 아닌 환경에서는 review 가 실패**합니다. Install 은 이 상황을 감지해 경고하지만 선택을 강제 차단하진 않습니다.

`learn-provider` 는 `main-native` 를 **지원하지 않습니다** — background ladder(`src/core-runtime/learning/shared/llm-caller.ts`) 가 host 위임 경로를 포함하지 않기 때문입니다. `review=main-native` 를 선택한 경우 learn 은 별도 provider 를 명시해야 합니다.

## 9. 설치 후 다음 단계

```
onto onboard            # 프로젝트 도메인 / review axes 초기화
onto help               # 전체 명령 목록
onto config edit        # 모델 등 세부 조정
```

## 10. Trouble-shooting

### 10.1 `--env-file 경로를 찾을 수 없습니다`

지정 경로에 파일이 없습니다. 절대 경로 사용을 권장합니다.

### 10.2 `자격 증명 누락: ANTHROPIC_API_KEY`

anthropic/openai provider 선택 시 대응 env var 가 비어 있습니다. shell env 에 설정하거나 `--env-file` 로 파일을 지정하세요. 플래그로는 입력받지 않습니다.

### 10.3 `기존 config 가 감지되어 install 을 중단합니다`

`~/.onto/config.yml` 또는 `<cwd>/.onto/config.yml` 이 이미 존재합니다. 덮어쓰려면 `--reconfigure`, 일부만 수정하려면 `onto config edit`.

### 10.4 Live ping 실패 (`HTTP 401`)

API key 값이 잘못됐거나 비활성화됐습니다. provider 대시보드에서 키를 확인한 뒤 `--reconfigure` 로 재실행하세요.

### 10.5 Live ping 실패 (`연결 실패: fetch failed`)

네트워크 차단 또는 LiteLLM 엔드포인트 미실행. 로컬 LiteLLM 이면 proxy 프로세스를 먼저 띄우세요. 네트워크 제약 환경이면 `--skip-validation` 으로 우회 가능합니다.

### 10.6 Main-native 선택 후 Claude Code 외부에서 review 실패

설계상 동작입니다. `onto config edit` 에서 `review.subagent.provider` 를 다른 provider 로 바꾸거나, Claude Code 세션에서 실행하세요.

## 11. 참조

- 설정 전체 surface: `.onto/processes/configuration.md`
- 구성 타입 소스: `src/core-runtime/discovery/config-chain.ts`
- `llm-caller` ladder: `src/core-runtime/learning/shared/llm-caller.ts`
- Host detection: `src/core-runtime/discovery/host-detection.ts`
