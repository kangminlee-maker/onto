---
as_of: 2026-04-14
status: active
functional_area: design-prototype-observation
purpose: |
  W-A-58 Design 프로토타입 실행의 end-to-end 관찰 기록.
  실제 설계 과제 1건(mockup: onto:learn 공개 운영 계약 초안)을 `onto design` CLI 로
  돌린 결과, 관찰된 결함·막힌 지점·R10 승계 포인트를 정리한다.
authority_stance: non-authoritative-observation-record
canonicality: canonical-advancing
source_refs:
  w_id: "W-A-58 (Design 프로토타입 실행)"
  mockup_task: "onto:learn 공개 운영 계약 초안"
  scope_id: "prototype-20260414-002"
  scope_dir: ".onto/review/design-prototype/scopes/prototype-20260414-002/ (sandbox, .gitignore 대상)"
  cli_logs_sandbox:
    - ".onto/review/design-prototype/01-start-output.json"
    - ".onto/review/design-prototype/02-start-resume.json"
    - ".onto/review/design-prototype/03-align.json"
  succession_w_id: "W-B-44 (R10 결함 발현 검증, BL-111)"
  note: |
    원본 evidence(.onto/review/design-prototype/)는 .gitignore 로 커밋 대상 아님.
    본 문서가 관찰 결과의 git-tracked canonical 복사본이다.
---

# Design 프로토타입 실행 관찰 기록 — W-A-58

## 1. 실행 개요

### 1.1 Mockup 설계 과제

**목표**: `onto:learn 공개 운영 계약 초안` 설계 — Learn Phase 3 구현 완료(PR #1) 이후 공개 운영 계약 문서가 부재한 상태를 `onto design` 으로 해소한다는 가상 시나리오.

선정 이유: (a) learn 구현이 완료되어 설계 대상이 실재, (b) 계약 문서 1본 산출로 범위 적정, (c) authority chain rank 1~4 전 계층과 상호작용.

### 1.2 실행 명령 순서

```bash
# step 1: scope 초기화
./bin/onto design start "onto:learn 공개 운영 계약 초안" \
  --scopes-dir .onto/review/design-prototype/scopes \
  --project-name prototype \
  --entry-mode process
# → EXIT=0, prototype-20260414-002 생성, authority-consistency 8 violations 탐지

# step 2: brief 채우기 (manual edit)
# → inputs/brief.md 에 5개 필수 섹션 작성

# step 3: start resume (scope-id 지정)
./bin/onto design start "onto:learn 공개 운영 계약 초안" \
  --scope-id prototype-20260414-002 \
  --scopes-dir .onto/review/design-prototype/scopes \
  --project-name prototype \
  --entry-mode process
# → EXIT=1, FAILED: "scope.created is only allowed as the first event"

# step 4: align 시도
./bin/onto design align --scope-id prototype-20260414-002 \
  --scopes-dir .onto/review/design-prototype/scopes \
  --json '{"type":"approve",...}'
# → EXIT=1, FAILED: "현재 상태가 grounded입니다. /align은 align_proposed 상태에서만 실행할 수 있습니다."
```

### 1.3 도달 지점

| 상태 전이 | 결과 |
|---|---|
| (none) → draft → grounded | ✓ 성공 (step 1) |
| grounded → align_proposed | ✗ **전이 메커니즘 없음** (step 4 에서 발현) |
| align_proposed → align_locked | 미도달 |
| align_locked → surface_* | 미도달 |

프로토타입은 **grounded 상태에서 정지**. 전체 파이프라인의 약 25% (1/4 phase) 만 검증됨.

## 2. 성공적으로 검증된 부분

### 2.1 authority-consistency perspective 는 실작동한다

step 1 에서 authority 8 source (rank 1~4) 를 실제 로드하여 **8건 violation 을 탐지**. 이는 design 의 핵심 가치 가설 (설계 시 authority drift 방지) 의 1차 실증.

| 분류 | 건수 | 대표 |
|---|---|---|
| ghost-axis (high) | 3 | `when`, `term`, `wording` 이 lexicon 에서 retire 됐는데 다른 문서에 operative 사용 |
| self-contradiction (medium) | 5 | "실행" 단어의 negation/affirmation 혼재 |

→ **가치 증명**: self-application 직후 이미 repo 내부에 실제 authority 모순이 8건 있으며, design 이 이를 자동 탐지함. 이는 "프로토타입 자체로도 즉시 효용 제공" 의 증거.

### 2.2 scope 생명주기 기반 파이프라인

`events.ndjson` 에 scope.created → grounding.started → grounding.completed 3 이벤트가 timestamp 순으로 저장됨. 상태 재구성(reducer) 이 정상 작동. source hash 도 정상 기록.

## 3. R10 승계용 관찰 결함 목록

W-B-44 (BL-111) 에서 "R10 잔존 결함 4건 발현 여부 검증" 시 참조할 실제 관찰 결함들. R10 결함 원본 4건은 absorption 과정에서 정리되어 복구 불가하므로, **본 프로토타입 run 에서 실제 발현된 결함** 을 승계 candidate 로 제시한다.

| # | 심각도 | 분류 | 관찰 |
|---|---|---|---|
| **O-1** | high | **State resume 파손** | step 3 에서 `--scope-id` 지정 resume 시도가 "scope.created only first event" 로 실패. `process` entry-mode 에서 start 재실행이 scope 재생성 경로로 흘러감 |
| **O-2** | high | **상태 전이 gap** | step 4 에서 grounded → align_proposed 전이를 일으킬 CLI 명령이 없음. align 이 이미 align_proposed 상태를 요구하므로 **chicken-and-egg** |
| **O-3** | medium | **false-positive SELF** | "실행" 의 negation 이 "runtime infrastructure 는 커지는데 실제 실행은 작동하지 않는다" 같은 **규범적 negation** (affirmation 을 전제로 한 문제 지적). authority-consistency 가 이를 SELF-contradiction 으로 판정 → 5건 모두 의심 |
| **O-4** | medium | **rawInput 혼입** | scope.md title 에 flag 의 value (`.onto/review/design-prototype/scopes`, `prototype`, `process`) 가 혼입. `cli.ts` 의 `argv.filter((arg) => !arg.startsWith("--"))` 이 flag value 를 걸러내지 못함 |
| **O-5** | low | **scan source display bug** | scope.md "스캔 소스" 에 path/description 대신 `undefined` 8건 표시. renderers 의 scan source 표시 로직 결함 |
| **O-6** | low | **중복 scope 생성** | 첫 start 호출 후 brief 가 비면 exit=0 으로 scope 가 만들어지지만, 다시 자연어 description 으로 부르면 새 scope 또 생성 (prototype-001 + prototype-002). resume 로직이 description→scope-id 매칭을 지원하지 않음 |
| **O-7** | low | **entry-mode 불일치** | `--entry-mode process` 지정 시 event payload `entry_mode` 는 `experience` 로 기록. event 로그와 CLI 인자 간 semantic drift |

**O-1 + O-2 + O-6 는 동일 원인군** (state resume 설계 미완). W-B-44 는 이 3건을 1 cluster 로 묶어 검증 가능.

## 4. design 활동 수준 1 진입 seed

§1.2 정의: 수준 1 = "drift 위험 없는 변경 자체 실행 + 보고". 본 프로토타입 run 은 다음 조건을 seed 로 기록한다.

| 조건 | 현재 상태 |
|---|---|
| design 실행이 authority chain 을 실제 로드·검증 | ✓ step 1 에서 확인 |
| 산출물이 drift 를 유발하지 않음 | ✓ 본 scope 는 `.onto/review/design-prototype/scopes/` sandbox 격리 |
| 자체 실행 후 Principal 보고 경로 존재 | 부분 ✓ (본 observations.md 가 보고 문서) |
| end-to-end cycle 완결 | ✗ grounded 이후 phase 미도달 (O-2) |

**판정**: design 은 **수준 1 의 25% 지점** 에 도달. 전체 도달은 O-2 해소 (grounded → align_proposed 전이 메커니즘 구현) 후.

## 5. 후속 work 목록

| 후속 | 연계 | 내용 |
|---|---|---|
| W-B-44 | BL-111 | 본 문서 §3 의 O-1~O-7 을 R10 승계 결함 4건으로 재확정 (7 → 4 축소 또는 유지) + 각 발현 여부 판정 |
| (신규 후보) | — | O-2 (grounded→align_proposed 전이 메커니즘) 구현 — design CLI 에 `align --propose` 혹은 자동 제안 로직. CA 성격 |
| (신규 후보) | — | O-1 (process entry-mode 의 scope resume 파손) 수정 — start handler 가 scope-id 존재 시 scope.created skip |
| (신규 후보) | — | O-3 (SELF false-positive) 개선 — authority-consistency 가 규범적 negation 패턴 인식. false-positive ratio 측정 |

## 6. completion_criterion 체크리스트

| 기준 | 충족 |
|---|---|
| 프로토타입 실행 완료 (end-to-end 1 cycle) | 부분 ✓ (grounded 까지 1/4 phase) — 결함 발견으로 완결은 불가했으나 "실행 시도 + 관찰" 로 운영 정보 획득 |
| design 활동 수준 1 진입 seed | ✓ §4 에 수준 1 조건별 현재 상태 기록 |
| R10 결함 관찰 결과 기록 | ✓ §3 에 O-1~O-7 + 후속 W-B-44 승계 경로 확립 |

→ **W-A-58 closeout 가능**. 남은 surface (align~close) 는 O-2 해소 후 별도 W-ID 로 재실행.
