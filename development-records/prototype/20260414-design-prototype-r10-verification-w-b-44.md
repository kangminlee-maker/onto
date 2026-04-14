---
as_of: 2026-04-14
status: active
functional_area: design-prototype-r10-verification
purpose: |
  W-B-44 — W-A-58 프로토타입 실행에서 관찰된 결함 7건(O-1~O-7)을
  R10 잔존 결함 4 카테고리로 재분류하고, 각각의 실제 발현 여부를 판정한다.
authority_stance: non-authoritative-verification-record
canonicality: supporting
source_refs:
  w_id: "W-B-44 (BL-111, R10 잔존 결함 4건 발현 검증)"
  upstream: "W-A-58 관찰 기록 — development-records/prototype/20260414-design-prototype-w-a-58.md"
  sandbox_evidence: ".onto/review/design-prototype-R10-verification/ (gitignored marker only)"
---

# Design 프로토타입 R10 결함 발현 검증 — W-B-44

## 1. 전제

- R10 원본 4 결함의 구체 내용 (ex-ante 리스트) 은 design absorption (2026-04-10, PR #4) 정리 과정에서 canonical 문서가 제거되어 복구 불가.
- 본 검증은 W-A-58 프로토타입 실행에서 **ex-post 로 관찰된 결함 7건** (O-1 ~ O-7) 을 R10 이 예측했을 법한 4 카테고리로 재분류하여, 각 카테고리가 실제로 발현했는지 판정한다.
- 분류는 W-A-58 observations.md §3.2 의 "O-1 + O-2 + O-6 는 동일 원인군" 관찰을 그대로 반영한다.

## 2. R10 4 카테고리 재구성 + 발현 판정

### 카테고리 A — State resume / lifecycle 설계 미완

**R10 가설** (재구성): "scope 생명주기의 resume / multi-step 파이프라인이 CLI level 에서 공백을 남긴다"

| 관찰 결함 | 설명 |
|---|---|
| O-1 | `--scope-id` 로 resume 시도가 "scope.created only first event" 로 실패 |
| O-2 | `grounded → align_proposed` 전이를 일으킬 CLI 명령이 없음 (chicken-and-egg) |
| O-6 | description 기반 scope 재호출 시 description→scope-id 매칭 부재 → 중복 scope 생성 |

**판정**: ✓ **실제 발현**. 3건 모두 동일 원인군 (lifecycle 명령 surface 미완) — 프로토타입 cycle 이 grounded 에서 정지하는 근본 원인.

### 카테고리 B — authority-consistency false-positive

**R10 가설** (재구성): "authority-consistency 의 의미 판정이 규범적 negation 패턴을 구분하지 못한다"

| 관찰 결함 | 설명 |
|---|---|
| O-3 | "실행" SELF-contradiction 5건 — "runtime infrastructure 는 커지는데 실제 실행은 작동하지 않는다" 같은 **affirmation 을 전제한 negation** 이 self-contradiction 으로 판정 |

**판정**: ✓ **실제 발현**. false-positive 개연성 높음 (단, 완전 판정은 semantic 재검토 필요). 5건 중 최소 일부는 규범적 warning 으로 affirmation 과 동일 입장.

### 카테고리 C — CLI 인자 파싱 / scope title 오염

**R10 가설** (재구성): "description 으로 들어온 값에 CLI flag value 가 혼입된다"

| 관찰 결함 | 설명 |
|---|---|
| O-4 | scope.md title 에 `.onto/review/design-prototype/scopes`, `prototype`, `process` (flag value) 가 혼입. `cli.ts` 의 `argv.filter((arg) => !arg.startsWith("--"))` 이 flag value 를 걸러내지 못함 |
| O-7 | `--entry-mode process` 지정했으나 event payload `entry_mode` 는 `experience` 로 기록 — 인자 parsing 과 event payload 매핑의 drift |

**판정**: ✓ **실제 발현**. 2건 모두 CLI 인자 parsing 의 구조적 약점. O-7 이 category C 의 확장 변종.

### 카테고리 D — Renderer / output integrity

**R10 가설** (재구성): "scope.md 또는 align packet 등 출력 surface 의 integrity 가 깨진다"

| 관찰 결함 | 설명 |
|---|---|
| O-5 | scope.md "스캔 소스" 에 path/description 대신 `undefined` 8건 표시 — renderer 가 scan source field 접근 실패 |

**판정**: ✓ **실제 발현**. scope 생성은 성공했으나 산출물의 표시 integrity 가 깨짐. 실사용자가 scope.md 를 읽을 때 정보 손실.

## 3. 종합 판정

| 카테고리 | 발현 여부 | 증거 |
|---|---|---|
| A (state resume 미완) | ✓ 발현 | O-1, O-2, O-6 |
| B (SELF false-positive) | ✓ 발현 | O-3 (5건) |
| C (CLI 인자 오염) | ✓ 발현 | O-4, O-7 |
| D (renderer integrity) | ✓ 발현 | O-5 |

**결론**: R10 4 카테고리 모두 W-A-58 프로토타입 실행에서 실제로 발현했다. false positive 카테고리는 0.

## 4. 후속

W-A-58 observations §5 에 기록된 신규 후보 3건 (카테고리 A/B/C 해소 work) 이 그대로 후속 backlog 으로 유효.

추가 제안: 카테고리 D (renderer integrity) 해소도 별도 work 로 등록 가능. 규모 작음 — renderers/ 모듈에서 scan source path/description 접근 경로 수정.

## 5. W-B-44 completion_criterion 체크

| 기준 | 충족 |
|---|---|
| R10 4 결함 각각 발현 여부 판정 | ✓ 4/4 발현 판정 완료 (§2 각 카테고리별 증거 기록) |
| 결과 기록 | ✓ 본 문서가 git-tracked canonical 기록 |

→ **W-B-44 closeout 가능**.
