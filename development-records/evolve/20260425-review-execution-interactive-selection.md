---
as_of: 2026-04-25
status: design-draft
functional_area: review-execution-ux
supersedes_partially:
  - "20260420-review-execution-ux-redesign.md §5 (onboard flow) — interactive 선택 시점을 onboard 전용에서 review 매 실행 시로 확장"
  - "review-invoke.ts:resolveExecutionRealizationHandoff — CLI host_runtime 자동 결정 ladder를 제거"
purpose: |
  onto:review 실행 시 host / subagent / effort 를 runtime이 자동 판단하는
  현재 로직을 Claude Code 내장 도구 AskUserQuestion 기반 연쇄 3-step 선택 +
  .onto/config.yml persist 로 대체한다. 동시에 .onto/config.yml 을
  machine-local 파일로 재분류하여 협업 시 발생하던 config 충돌을 구조적으로
  제거한다.
source_refs:
  current_resolver: src/core-runtime/review/execution-topology-resolver.ts
  current_handoff: src/core-runtime/cli/review-invoke.ts (resolveExecutionRealizationHandoff ~L450-610)
  axis_block_spec: development-records/evolve/20260420-review-execution-ux-redesign.md
  axis_writer: src/core-runtime/onboard/write-review-block.ts
  legacy_translate: src/core-runtime/review/review-config-legacy-translate.ts
  legacy_mode_policy: src/core-runtime/review/legacy-mode-policy.ts
  current_example: ./config.yml.example (이 설계에서 .onto/config.yml.example 로 이동)
  host_input_tools:
    claude_code: AskUserQuestion (Claude Code 내장)
    codex_cli: request_user_input (Codex v0.106.0+, Plan Mode 권장)
  codex_release_ref: https://github.com/openai/codex/releases/tag/rust-v0.106.0
---

# Review 실행방식 Interactive 선택 — 설계안

## 1. 배경

### 1.1 현재 자동 판단의 구조

실행방식 결정이 두 레이어에 분산되어 있다.

| 레이어 | 위치 | 역할 | 규모 |
|---|---|---|---|
| 상위 (CLI handoff) | `review-invoke.ts` `resolveExecutionRealizationHandoff` | `--codex` / `ONTO_HOST_RUNTIME` / config / 호스트 감지 조합으로 `{execution_realization, host_runtime}` 결정 | ~150 lines |
| 하위 (Topology 유도) | `execution-topology-resolver.ts` `resolveExecutionTopology` | `review:` axis block → shape → TopologyId, 실패 시 `main_native` silent degrade | 765 lines |

결과는 STDERR `[topology]` / `[plan]` 로그에만 노출. 주체자는 runtime이 어떤 선택을 했는지 명시적으로 보지 못하며, 환경 mismatch 시 `buildNoTopologyReason` 의 6-옵션 guidance 로만 실패한다.

### 1.2 문제 3가지

1. **Silent degrade** — `main_native` 자동 강등은 "review가 어떻게든 진행되는 것이 critical path" 라는 의도였으나, 결과적으로 주체자가 인지하지 못한 설정으로 review가 돌아가 재현성·디버깅이 흐려진다.
2. **이중 경로** — legacy host_runtime ladder 와 axis-first resolver 가 공존. P9.x 이후 legacy는 no-op 이지만 코드 자체는 남아있음.
3. **onboard 전용 interactive** — 현재 interactive UX는 `onto onboard` 최초 실행 시에만. 환경이 바뀌거나 선택을 바꾸고 싶은 주체자는 config를 직접 편집해야 한다.

### 1.3 이번 설계의 전환점

- 실행방식 결정을 **매 실행 시 표면화**: config 부재 또는 drift 시 AskUserQuestion 연쇄로 주체자가 능동 선택.
- config를 **machine-local 파일**로 재분류: 저장·덮어쓰기가 협업에 영향 없음.
- Silent degrade 는 **interactive 불가능한 환경에만** 잔존 (Q2 → fail-fast 원칙 적용).

### 1.4 핵심 설계 근거 (Decision Record)

**왜 preset 또는 자동화가 아닌가**

Preset과 자동 선택은 주체자의 명시적 결정을 생략하여 단기 편의를 주지만, "지금 내 review 가 어떤 설정으로 돌고 있는가" 를 인지하는 경로를 약화시킨다. 6 axis × 환경 signal 의 조합을 이름 하나로 압축하는 preset 은 실익 대비 설계·유지 복잡도가 커서 기각.

**대안: axis별 명시 선택 + 지속적 상기**

- 선택은 첫 실행 + drift 시에만 (매번 묻지 않음)
- 평소 실행은 1-줄 reminder 로 "본인의 과거 결정"을 지속 노출
- 자동 적용되는 순간에도 "그건 내가 한 선택" 임을 인지 가능

즉 자동화를 줄여 편의를 낮추는 것이 아니라, **편의와 인지를 모두 확보하기 위해 명시성을 유지**한다. 이 관점이 §2 원칙 전체의 상위 rationale.

---

## 2. 설계 원칙

1. **결정은 명시, 기록은 persist** — 매번 주체자가 선택하는 대신, 한 번 저장된 결정은 재사용하고 1줄 reminder만 출력.
2. **Reversible 먼저** — persist 질문의 선택지는 "이번만 / 저장" 순서 (1번이 reversible).
3. **Interactive는 host-prompt에, deterministic은 script에** — AskUserQuestion 호출은 `.onto/commands/review.md` prose 가 주관. TS 런타임 `onto review` 는 detection signal 을 JSON 으로 노출만.
4. **machine-local config, repo-committed example** — `.onto/config.yml` 은 개인 환경 스냅샷, `.onto/config.yml.example` 이 컨벤션 canonical.
5. **non-interactive 는 fail-fast** — CI/bg 환경에서 axis block 부재 시 자동 강등 없이 즉시 종료 (Q2).

---

## 3. User Flow

### 3.1 First run (review block 부재)

```
/onto:review <target>
 │
 ├─ TS runtime: .onto/config.yml 로드 → review block 부재 감지
 │            + host/codex/teams/litellm detection signals 수집
 │            → JSON emit (stdout)
 │
 ├─ command prose (.onto/commands/review.md):
 │   ├─ AskUserQuestion Q-Teamlead  (§4.1)
 │   ├─ AskUserQuestion Q-Subagent  (§4.2)  — Q-Teamlead 결과에 따라 options filter
 │   ├─ AskUserQuestion Q-Effort    (§4.3)  — Q-Subagent 결과에 따라 domain 결정
 │   └─ AskUserQuestion Q-Persist   (§4.4)  — "1. 이번만 / 2. 저장"
 │
 ├─ Persist=저장: npm run onboard:write-review-block -- .onto/config.yml '<json>'
 │  Persist=이번만: ephemeral JSON 을 환경변수 ONTO_REVIEW_CONFIG_OVERRIDE 로 전달
 │
 └─ onto review <target> (기존 dispatch; 한 줄 reminder 출력)
```

Detection signal JSON 최소 예시 (`onto review --emit-detection-signals` stdout):

```json
{
  "host": "claude-code",
  "teams_env": true,
  "codex": {"binary": true, "auth": true},
  "litellm_endpoint": false,
  "credentials": {"anthropic": true, "openai": false},
  "review_block_present": false,
  "drift_reason": null
}
```

정확한 스키마 고정은 Phase B contract 문서로 분리 (§12).

### 3.2 Subsequent run (review block 유효 + host requirement 통과)

```
/onto:review <target>
 │
 ├─ TS runtime: validateReviewConfig + deriveTopologyShape + checkRequirements → 통과
 │
 ├─ STDERR 한 줄 reminder:
 │   [review] 실행방식: teamlead=main, subagent=codex/gpt-5.4/high.
 │            변경은 `--teamlead/--subagent-provider/--effort` 또는 .onto/config.yml.
 │            자세히: /onto:help
 │
 └─ dispatch
```

`output_language` 별 reminder 예시 (번역 대상은 이 한 줄로 한정):

```
ko: [review] 실행방식: teamlead=main, subagent=codex/gpt-5.4/high.
             변경은 `--teamlead/--subagent-provider/--effort` 또는 .onto/config.yml. 자세히: /onto:help
en: [review] execution: teamlead=main, subagent=codex/gpt-5.4/high.
             Change via `--teamlead/--subagent-provider/--effort` or .onto/config.yml. Details: /onto:help
```

### 3.3 Drift 재선택 (config 유효하지만 현재 환경 미지원)

```
/onto:review <target>
 │
 ├─ TS runtime: validateReviewConfig 통과 → checkRequirements 실패
 │            → drift 사유 (e.g. "codex binary 없음") JSON emit
 │
 ├─ command prose:
 │   ├─ 안내: "저장된 설정 {현재}은 현재 환경에서 실행 불가 (사유: {reason})"
 │   ├─ 연쇄 3-step 재선택 (§4.1~4.3)
 │   └─ Q-Persist-Drift: "1. 이번만 / 2. 저장 (기존 설정 덮어쓰기)"
 │
 └─ dispatch
```

config 가 machine-local 이므로 덮어써도 협업 충돌 없음 → option (a) 자동 재선택을 선택한 근거.

---

## 4. 연쇄 interactive 선택 설계

단일 호출 당 최대 4 question. 여기서는 **3 call (각 call 당 1 question) + 별도 persist call** 로 분리 — 각 답이 다음 question 의 option filter 를 결정해야 하므로 한 번에 묶을 수 없음.

### 4.0-a 호스트별 입력 채널 (Host adapter)

연쇄 interactive 선택의 실제 도구는 호스트에 따라 다르다. 설계문서·prose 에서는 **중립 표현**(e.g. "주체자에게 선택을 요청") 으로 기술하고, 실행 시 호스트 agent 가 자기 도구로 매핑.

| 호스트 | 도구 | 최소 버전 / 조건 | Mode |
|---|---|---|---|
| Claude Code | `AskUserQuestion` | 내장, 상시 가능 | slash command 내부 |
| Codex CLI | `request_user_input` | **v0.106.0+** | **Plan Mode 권장** (기본 구현 경로), Default Mode 는 v0.121.0 까지 silent failure 사례 있음 — 실제 검증 통과 후 opt-in |
| Plain terminal | — | — | non-interactive fail-fast (§9) |

**Skill 포팅 규칙**: Claude Code 용 prose 에 `AskUserQuestion` 을 하드코딩하면 Codex 에서 "알 수 없는 도구" 가 된다. `.onto/commands/review.md` 본문은 도구 이름을 직접 쓰지 말고 중립 지시로 작성하며, 필요 시 빌드/로드 타임 치환 레이어 (또는 host-detect 분기) 를 둔다.

**최소 버전 가드**: `onto onboard` 의 환경 감지 단계에서 `codex --version` 결과를 파싱해 `>= 0.106.0` 확인 → 불충족 시 "codex 를 업그레이드하세요: `npm install -g @openai/codex@latest`" 안내 후 Codex 경로 비활성화.

출처: `https://github.com/openai/codex/releases/tag/rust-v0.106.0` ("Enabled request_user_input in Default collaboration mode (not just Plan mode)").

### 4.0 축 간 의존성 (왜 한 번에 묶을 수 없는가)

한 axis 의 선택이 다음 axis 의 가능한 option 집합을 물리적으로 제한한다. 근거는 `TOPOLOGY_CATALOG` (`src/core-runtime/review/execution-topology-resolver.ts:161`) 의 8 엔트리 — 카탈로그에 없는 조합은 실행 경로가 없음.

**Teamlead → Subagent provider 의존**

| teamlead 선택 | 가능한 subagent provider | 근거 (catalog 엔트리) |
|---|---|---|
| `main` on Claude Code | main-native (= Agent tool), codex, anthropic, openai, litellm | `cc-main-agent-subagent`, `cc-main-codex-subprocess`, `cc-teams-*` (teams env 시) |
| `main` on Codex CLI | main-native (= codex subprocess), litellm | `codex-main-subprocess`, `main_foreign(litellm)` |
| `main` on plain terminal | teamlead=main 자체 불가 → `ext-teamlead_native` 강등 안내 | — |
| `external codex subprocess` | codex subprocess **단 하나** | `codex-nested-subprocess` |

핵심: teamlead 위치가 결정되면 "그 프로세스 안에서 spawn 가능한 것" 만 남는다. External codex subprocess 가 Claude Code 의 Agent tool 이나 TeamCreate 를 호출할 방법은 없음. 카탈로그에 `codex-{X}-anything-else` 형태의 엔트리가 존재하지 않는 이유.

**Subagent provider → Effort domain 의존**

Provider 마다 effort value 의 도메인이 달라서, Q-Subagent 의 답이 확정된 뒤에만 Q-Effort 의 options 를 제시할 수 있다 (상세는 §4.3).

| Provider | Q-Effort options |
|---|---|
| main-native | **질문 skip** (host 가 관리) |
| codex | `minimal` \| `low` \| `medium` \| `high` \| `xhigh` |
| anthropic | thinking budget preset: `off` \| `standard` \| `high` |
| openai | `low` \| `medium` \| `high` |
| litellm | provider pass-through; 모델별 subset |

**Skip 규칙 요약**

- `teamlead = external codex` → Q-Subagent skip (`codex` 로 고정)
- `Q-Subagent = main-native` → Q-Effort skip

### 4.1 Q-Teamlead — "teamlead을 어디에서 실행할까요?"

| Option | 조건 |
|---|---|
| `main` (호스트 메인 세션, 권장) | CLAUDECODE=1 OR Codex CLI 세션 |
| `external codex subprocess` | codex binary + `~/.codex/auth.json` |

- 호스트 없음(plain terminal) + codex 있음 → `external codex subprocess` 만 제시
- 둘 다 불가 → fail-fast 전에 안내: "Claude Code 에서 재실행 또는 codex CLI 설치"

### 4.2 Q-Subagent — "각 lens 를 실행할 provider?"

Q-Teamlead 결과 + detection signal 에 따라 options 가 좁혀진다.

| Option | 조건 |
|---|---|
| `main-native` (호스트의 네이티브 subagent, 권장) | teamlead=main |
| `codex` (codex subprocess) | codex binary + auth |
| `anthropic` | `ANTHROPIC_API_KEY` 존재 |
| `openai` | `OPENAI_API_KEY` 존재 |
| `litellm` | `LITELLM_BASE_URL` 또는 `llm_base_url` 존재 |

Teamlead=external-codex 인 경우 subagent 는 `codex` 로 고정되어 이 질문 skip.

### 4.3 Q-Effort — "reasoning effort 수준?"

Q-Subagent 의 provider 에 따라 domain 결정.

| Provider | Domain |
|---|---|
| main-native | (skip — host 가 관리) |
| codex | `minimal` \| `low` \| `medium` \| `high` (권장) \| `xhigh` |
| anthropic | thinking budget preset: `off` \| `standard` \| `high` (권장) |
| openai | `low` \| `medium` \| `high` (권장) |
| litellm | pass-through; 모델에 따라 subset |

main-native 선택 시 이 질문을 skip 하고 곧바로 Q-Persist.

### 4.4 Q-Persist — "이 선택을 어떻게 할까요?"

- Option 1: **이번만 사용** (config 수정 안 함) — reversible, default
- Option 2: **저장 (기본값으로)** — `.onto/config.yml` 에 write

Drift 재선택 시 Option 2 의 label 은 "저장 (기존 설정 덮어쓰기)" 로 명시.

**취소 경로**: AskUserQuestion 의 기본 `Other → cancel` 선택 시 review 실행 중단, 다음 실행 시 동일 질문부터 재진입. 이미 저장된 config 는 변경되지 않음.

---

## 5. CLI `--` override 표면

Q3 결정에 따라 axis 단위 플래그 제공. 1회성 override 는 config 수정 없음. `--save-choice` 를 동반하면 동일 결정을 persist.

| 플래그 | 대응 axis | 예 |
|---|---|---|
| `--teamlead <main\|codex>` | A. Teamlead | `--teamlead codex` |
| `--subagent-provider <name>` | B. Subagent provider | `--subagent-provider codex` |
| `--subagent-model <id>` | B. model_id | `--subagent-model gpt-5.4` |
| `--effort <value>` | F. Effort (provider-specific domain) | `--effort high` |
| `--max-concurrent-lenses <n>` | C. concurrency | `--max-concurrent-lenses 6` |
| `--lens-deliberation <mode>` | E. deliberation | `--lens-deliberation sendmessage-a2a` |
| `--save-choice` | persist toggle | — |
| `--reselect` | 저장된 config 무시하고 AskUserQuestion 재진입 | — |

기존 `--codex` 는 `--teamlead main --subagent-provider codex` 의 단축으로 재정의 (backward compat 유지).

---

## 6. `.onto/config.yml` machine-local 전환

### 6.1 현 상태

- `package.json:files` 엔 `.onto/config.yml` **미포함** → 배포에서 이미 제외.
- 다른 onto-X consumer repo 는 `.gitignore` 주석 기준으로 이미 ignore 권장.
- **이 dogfooding repo 만** `.onto/config.yml` 을 tracked ("canonical reference", PR #187, 2026-04-22).
- `.env` 는 이미 gitignore 관례 (credentials) — 이 설계에서 변경 없음, 생성 주체만 install→onboard 로 이동 (§6.5).

### 6.2 변경 작업

1. `git rm --cached .onto/config.yml`
2. `.gitignore` 수정:
   - `.onto/config.yml` 명시 추가
   - 기존 "Dogfooding exception" 주석 삭제 및 "Per-machine: generated by `onto install` / `onto onboard`" 로 교체
3. `scripts/check-onto-allowlist.sh` 의 exact-match 리스트에서 `.onto/config.yml` 제거
4. `config.yml.example` 파일을 **root → `.onto/config.yml.example`** 로 이동
5. `package.json:files` 엔트리 `"config.yml.example"` → `".onto/config.yml.example"` 갱신
6. 현재 `config.yml.example` 내부 주석("Copy this file to {project}/.onto/config.yml") 을 상대 경로 기준으로 수정
7. 최신 4-preset 예시를 주석 예시로 추가 (§4.1~4.3 의 선택지와 1:1 대응)

### 6.3 README.md 갱신

Installation 섹션(§L91-129) 또는 인접 위치에 1~2줄:

```
> 프로젝트 config 템플릿은 `.onto/config.yml.example` 에 있습니다.
> `.onto/config.yml` 은 개인 환경에 맞춰 `onto install` / `onto onboard`
> 가 자동 생성하며 gitignore 대상입니다.
```

### 6.4 install / onboard flow 보완

- `onto review` 가 `.onto/config.yml` 부재를 감지하면 first-run 연쇄 선택을 즉시 시작 (§3.1).
- `onto onboard` 는 `.onto/config.yml.example` 을 seed 로 복사 후 review block 만 interactive 로 채우도록 개선.

### 6.5 install → onboard 통합 재구성

현재 3 명령 (`onto install` / `onto onboard` / `onto config`) 의 역할이 review block 부분에서 중복. 이번 설계에서는 다음과 같이 재구성한다.

**통합 원칙**

- **`onto install` 명령 제거**. `--reconfigure` 만 `onto onboard --reconfigure` 의 alias 로 남기고 본체 삭제.
- **`onto onboard` 를 global + project 통합 진입점**으로 승격. Path A (Claude Code plugin) / Path B (npm CLI) 모두 동일 진입점.
- **npm `postinstall` hook 불사용** — Claude Code plugin install 이 `--ignore-scripts` 로 hook 을 skip 하므로 경로 A/B 일관성 유지 불가. 대신 install 단계에서는 안내 메시지만 출력하고 실제 설정은 `onto onboard` 가 담당.

**onboard 진입 시 단계 (자동 감지 기반 분기)**

1. **Global config 존재 여부 감지** (`~/.onto/config.yml`)
2. 없으면 **Global setup stage** (한 번만):
   - profile scope 결정은 제거 — onboard 는 project 컨텍스트에서 실행되므로 global 은 무조건 `~/.onto/`
   - Output language 선택
   - Background LLM provider (learn/govern/promote) 선택 + 자격증명 입력 → `~/.onto/.env` 쓰기
3. **Project setup stage** (매 project 마다 1회):
   - Domains 선택 (기존)
   - Review execution axes 연쇄 선택 (§3.1, §4) → `<repo>/.onto/config.yml` 의 `review:` block
4. **Completion report** + 다음 단계 안내

**Path 별 진입점**

- Path A: `/onto:onboard` (Claude Code slash command)
- Path B: `npm install -g onto-core` 직후 안내 메시지 → 사용자가 `cd <project>` 후 `onto onboard` 실행

**주의사항**

- `onto onboard` 실행 시 `process.stdin.isTTY` 확인 필수. 비-TTY 환경에서는 기존 `--non-interactive` + env var fallback 경로 유지 (`ONTO_ONBOARD_*` env var 로 리네임).
- 기존 사용자 마이그레이션: `~/.onto/config.yml` 이 이미 존재하면 Global setup stage skip.

### 6.6 onto:config UX (슬래시 커맨드 + AskUserQuestion 연쇄)

`/onto:config` 는 현재 상태 확인 + interactive 수정을 담당. Claude Code `/config` 의 시각적 동일성은 추구하지 않고 기능적 동등성만 확보.

**명령 구조**

| 명령 | 역할 | 구현 seat |
|---|---|---|
| `/onto:config show` | 현재 config 요약 출력 (detection signal + derived topology 포함) | 기존 `src/core-runtime/config/onto-config-preview.ts` 재활용 |
| `/onto:config edit` | AskUserQuestion 연쇄 기반 interactive 수정 | 공통 seat `configureReviewAxes()` 호출 (§4.1~4.3 과 동일 flow) |
| `/onto:config set <key> <value>` | 단일 field 명령행 수정 (기존) | 기존 `onto-config-key-path.ts` |
| `/onto:config validate` | 저장된 config 유효성 + host drift 검사 | 기존 validator + `checkRequirements` |

**공통 seat: `configureReviewAxes()`**

동일한 axis 선택 흐름이 다음 3 지점에서 호출된다.

1. `/onto:review` first-run (config 부재)
2. `/onto:review` drift 재선택
3. `/onto:config edit`

→ 하나의 함수로 추출하여 entry 표시만 다르게 처리. 입력 채널은 호스트 adapter 를 통해 선택 (§4.0-a): Claude Code → `AskUserQuestion`, Codex CLI → `request_user_input` (Plan Mode 권장, v0.106.0+).

---

## 7. onto:help 보강

`.onto/commands/help.md` "Execution Path" 섹션(§L67-77) 교체 내용:

1. 첫 실행 시 3-step interactive 선택 + `.onto/config.yml review:` block 에 저장 설명.
2. 실행 시마다 출력되는 1-줄 reminder 예시.
3. Override 방법 2가지: (a) `--teamlead/--subagent-provider/--effort` 등 axis 플래그, (b) `.onto/config.yml` 직접 편집 (`.onto/config.yml.example` 참조).
4. 선택지 × 조건 표 (§4.1-4.3).
5. `--reselect` / `--save-choice` 설명.
6. stale 된 "two canonical execution paths" 테이블 제거.

---

## 8. 제거·축소 가능한 코드 (추정)

| 파일 | 현재 | 축소 후 | 제거/축소 사유 |
|---|---:|---:|---|
| `execution-topology-resolver.ts` | 765 | ~400 | silent degrade pipeline (`attemptMainNativeDegrade`, `describeDerivationIntent`, `buildNoTopologyReason` 의 6-옵션 guidance) 축소. interactive 재선택이 이를 대체 |
| `review-invoke.ts` auto-resolution 블록 | ~150 | ~50 | `resolveExecutionRealizationHandoff` 의 host_runtime 이중 ladder 제거. handoff 결정은 resolved shape 만 보고 분기 |
| `review-config-legacy-translate.ts` | 330 | 0 | P9.x 가 legacy field no-op 처리 완료. interactive 재선택이 legacy 자동 변환을 대체 |
| `legacy-mode-policy.ts` | 97 | 0 | 동일 사유 |
| `topology-shape-derivation.ts` | 250 | ~180 | silent degrade 전용 경로 축소 |
| `shape-to-topology-id.ts` | 192 | ~150 | 유지 (핵심 매핑) |
| `review-config-validator.ts` | 401 | 401 | 유지 (선택 직후 검증) |
| `write-review-block.ts` | 264 | 264 | 유지 (persist 경로) |

순 감소 추정: **~600~750 lines** (axis/topology 런타임 코드 2,035 → 1,300~1,400, **30~35% 축소**). 테스트도 유사 비율 감소 예상.

Q5 결정에 따라 `review-config-legacy-translate.ts` / `legacy-mode-policy.ts` 제거도 이 설계의 일부로 포함. 별도 PR 로 분리하는 것이 리뷰 부담 상 유리하다면 phased rollout (§10).

---

## 9. Non-interactive 동작

`AskUserQuestion` 호출 불가 환경 (CI, bg agent, headless CLI):

- **review block 유효 + drift 없음** → 그대로 실행 (기존과 동일).
- **review block 부재** → fail-fast. 메시지:
  ```
  [review] .onto/config.yml 에 review block 이 없습니다.
           Interactive 환경에서 /onto:review 를 한 번 실행하여 선택/저장하거나,
           axis 플래그(--teamlead ... --subagent-provider ... --effort ...)로 명시하세요.
           Example: .onto/config.yml.example
  ```
- **review block 유효 + drift** → fail-fast. 드리프트 사유 + 재선택 가이드 출력.

Silent `main_native` 강등은 모든 모드에서 제거. 이것이 설계 동기의 핵심.

---

## 10. 마이그레이션 단계

순서는 리뷰 부담 최소화 기준.

### Phase A — machine-local 전환 (§6.1~6.4)
1. `config.yml.example` → `.onto/config.yml.example` 이동 + 내용 갱신 (4 preset 주석 예시 포함)
2. `.gitignore` / `scripts/check-onto-allowlist.sh` / `package.json:files` 수정
3. `git rm --cached .onto/config.yml`
4. README 1~2줄 추가
5. `.onto/config.yml.example` 경로 전수 grep → `.onto/processes/install.md`, `.onto/processes/configuration.md`, `BLUEPRINT.md` 등 내부 참조 경로 업데이트
6. `onto onboard` 가 `.onto/config.yml.example` seed 를 복사하도록 수정

### Phase A2 — install/onboard 통합 (§6.5)
1. `onto install` 명령 본체 삭제, `--reconfigure` 를 `onto onboard --reconfigure` alias 로 축소
2. `onto onboard` 에 Global setup stage (profile scope 제거, output_language + background LLM + 자격증명) 추가
3. `ONTO_INSTALL_*` env var → `ONTO_ONBOARD_*` 로 리네임 (비-TTY fallback)
4. 안내 메시지 갱신: npm install 직후, Claude Code plugin install 직후 모두 `onto onboard` 로 유도
5. Codex 버전 가드: `codex --version >= 0.106.0` 감지. 불충족 시 업그레이드 안내 + Codex 경로 비활성화 (§4.0-a)

### Phase B — interactive 선택 파이프라인 (§3, §4)
1. TS runtime: `onto review --emit-detection-signals` (JSON) 노출
2. `.onto/commands/review.md` prose 에 AskUserQuestion 연쇄 3-step 기입
3. `--reselect` / `--save-choice` + axis 플래그 CLI 추가
4. drift 감지 시 재선택 경로
5. 공통 seat `configureReviewAxes()` 추출 (§6.6 에서 재사용)

**Phase B test surface**:
- Unit: detection signal JSON emit, axis flag parser, reminder 1-줄 포맷, write-review-block 통합
- Integration: config 부재 → first-run flow, config 유효 → reminder 경로, drift 감지 → fail-fast/재선택
- Prose 자동화 불가 부분 (AskUserQuestion 호출 자체) 은 skip — TS seat 함수만 테스트

### Phase C — legacy 제거 (§8)
1. `review-config-legacy-translate.ts` / `legacy-mode-policy.ts` 삭제
2. `resolveExecutionRealizationHandoff` slim down
3. `execution-topology-resolver.ts` silent degrade 경로 제거
4. STDERR `[topology] degraded:` 출력 제거, 대신 1-줄 reminder 로 통일

**Phase C test surface**:
- Regression: `grep -r "attemptMainNativeDegrade\|\[topology\] degraded" src/` 결과 없음
- Regression: axis/topology 런타임 line count 측정 (§11 #5)
- Smoke: 6 shape 각각 resolver → executor end-to-end

### Phase D — onto:config (§6.6)
1. `/onto:config show` / `edit` / `set` / `validate` 슬래시 커맨드 prose 작성
2. `configureReviewAxes()` seat 을 edit 경로에서 호출
3. preview 출력 포맷 확정 (`onto-config-preview.ts` 확장 or 재사용)

### Phase E — 문서 (§7, §6.3)
1. `onto:help` 섹션 교체
2. README 보강
3. `development-records/evolve/20260420-review-execution-ux-redesign.md` 에 supersedes 주석 추가

---

## 11. Success criteria

이 설계가 "완료" 되었다고 판단할 기준. Phase 완료 시 검증.

| # | 기준 | 검증 방법 |
|---|---|---|
| 1 | Silent `main_native` degrade 코드 경로 0 | `grep -r "attemptMainNativeDegrade\|\[topology\] degraded" src/` → 결과 없음 |
| 2 | 6 axis CLI 플래그 + 2 toggle 노출 | `onto review --help` 에 `--teamlead`, `--subagent-provider`, `--subagent-model`, `--effort`, `--max-concurrent-lenses`, `--lens-deliberation`, `--reselect`, `--save-choice` 전부 존재 |
| 3 | 매 실행 1-줄 reminder 출력 | e2e: config 유효 시 STDERR 에 `[review] 실행방식: ...` 정확히 1줄 (`output_language` 반영) |
| 4 | Drift 감지 → 재선택 / fail-fast | e2e: 저장된 codex config + codex binary 제거 → fail-fast (non-interactive) 또는 재선택 prompt (interactive) |
| 5 | Axis/topology 런타임 코드 축소 | 실측 line 수: 2,035 → 1,300~1,400 (±10% 허용) |
| 6 | Legacy 파일 제거 | `review-config-legacy-translate.ts`, `legacy-mode-policy.ts` 존재하지 않음 |
| 7 | install/onboard 통합 | `onto install` 명령 부재, `onto onboard` 가 global+project 통합 진입 |
| 8 | `onto:config` 슬래시 커맨드 가동 | `/onto:config show / edit / set / validate` 4 경로 모두 동작 |
| 9 | Codex Plan Mode e2e | Codex v0.106.0+ 에서 `/onto:review` → `request_user_input` 연쇄 3-step 정상 동작 |
| 10 | Codex 최소 버전 가드 | `onto onboard` 가 codex `< 0.106.0` 감지 시 업그레이드 안내 후 Codex 경로 비활성화 |

---

## 12. Open items

- **Codex Default Mode 사용 여부**: v0.106.0 에서 공식 지원, 그러나 v0.121.0 까지 silent failure 사례 보고(gstack issue #1066, 2026-04-18). Plan Mode 기본 채택, Default Mode 는 실제 검증 pass 후 opt-in 결정.
- **Prose 중립화 전략**: `.onto/commands/review.md` 에서 `AskUserQuestion` / `request_user_input` 도구 이름을 하드코딩할지, 중립 지시문 + 빌드·로드 타임 치환 레이어를 둘지. Phase B 에서 선택.
- **a2a deliberation (E축) 노출 시점**: 연쇄 3-step 에는 빠져있음. 현재 기본은 `synthesizer-only`. a2a 사용을 원하는 주체자는 `--lens-deliberation sendmessage-a2a` 또는 config 직접 편집. 4번째 step 을 추가할지 이후 결정.
- **concurrency (C축) 노출 시점**: 동일 — provider default 를 그대로 사용하고, override 는 플래그/config 로.
- **detection signals JSON 스키마**: Phase B 진입 시 `onto review --emit-detection-signals` 의 정확한 output shape 을 별도 contract 문서로 고정 필요.
- **기존 review block 이 있는 projects 마이그레이션**: `execution_topology_priority` 는 P9.1 부터 no-op. Phase C 에서 legacy 제거 시 추가 경고 필요 여부.
- **onto onboard --non-interactive 의 axis 플래그 범위**: 기존 `--review-provider` 만 존재. teamlead/effort/concurrency 플래그도 추가해야 일관성 유지. Phase A2 에서 범위 확정.
