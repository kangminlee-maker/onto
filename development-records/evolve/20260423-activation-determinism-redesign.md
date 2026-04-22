# Activation/Execution Determinism Redesign

> **Status**: fully aligned 9/9 (2026-04-23)
> **Provenance**: 8 iteration 끝에 수렴. v6 v4 가 final approved snapshot.
>
> **Review sessions** (시간순):
> - v1: `.onto/review/20260422-ec8965d3/` — partially aligned, initial
> - v2: `.onto/review/20260422-5230337e/` — partially, authority-first 방향 수립
> - v3: `.onto/review/20260422-b92c936f/` — partially, Three Authorities 실질 해소
> - v4: `.onto/review/20260422-a4125ae1/` — partially, shared-seat split
> - v5: `.onto/review/20260422-0c2bb622/` — partially, B1/B2/UF-SEM closed
> - v6 v1: `.onto/review/20260422-541ea899/` — partially, 3 blocker
> - v6 v2: `.onto/review/20260423-8a6a618b/` — partially, 3 blocker (영역 이동)
> - v6 v3: `.onto/review/20260423-1dba4a52/` — partially, 2 blocker, 4 lens fully aligned
> - **v6 v4**: `.onto/review/20260423-793871ea/` — **fully aligned 9/9, 0 blocker**
>
> **Trigger**: 2026-04-22 plugin install 후 첫 review dispatch 가 전부 degraded 된 현상. `prepare` lifecycle hook 이 Claude Code installer 의 `--ignore-scripts` 로 무시된 것이 1차 원인이고, 그 위에 실행 entry 결정/identity 전파/command surface drift 의 구조적 비결정성이 누적.
>
> **Transition vs target state 분리**:
> - Transition (즉시 실행): A1 (dist commit) + B4 (env unconditional propagation). 사용자 차단 해소.
> - Target state (이 문서): Three Authorities + catalog SSOT + 3-layer compat + producer graph. 점진 implementation.
>
> 이전 v1~v5 시리즈는 `Install/Execution Determinism Redesign` 제목 사용. v6 v3 부터 title 의 bare token 회피 위해 `Activation` 으로 변경 (vocab discipline §8). 의미 차이 없음 — Bootstrap/Activation Authority 가 `install_state` 와 identity 흡수.

> v6 변경 범위: v5 review 의 **6 blocker 전부 closure + 4 recommendations 전부 반영 + 4 unique findings 전부 처리**. 새 reframe 도입 없음. fully aligned targeting.

---

## 1. reconciliation tables

### 1.1 v5 → v6 v1

| v5 finding | v6 처리 위치 | 처리 종류 |
|---|---|---|
| B1' Layer C compatibility closure | §5 | matrix row 추가 + Layer C disposition 규칙 |
| B2' locality terminology drift (§7.1) | §7 | principle layer vocab 과 정렬 재작성 |
| B3' identity payload contract conflict (§4 vs §8 F6) | §4 | `HandoffIdentityPayload` schema 에 `install_mode` 명시 포함, §8 F6 와 통합 |
| B4' profile_scope_active propagation/default gap | §7.3 | propagation + default resolution 규칙 |
| B5' freshness timestamp referent ambiguity | §6 | 3 field 분리 (`last_*_at` = event time, `emitted_at` = emit time, `aggregated_at` = aggregate time) |
| B6' bare `install` self-contradiction | §7 header + §2 + §8 exemption | 치환 + exemption strategy (lint rule 이 자기 이름에 걸리지 않음) |
| Rec 1 HandoffIdentityPayload/ExecutionContext schema block | §4.2 | 2 schema block 명시 |
| Rec 2 install_mode × profile_scope_active truth table + default | §7.4 | 3×3 table + no-flag default |
| Rec 3 info --verify aggregated JSON 예시 (3 timestamp) | §6.3 | 구체 JSON |
| Rec 4 CI/lint 확장 | §8 | 3 regression 자동 차단 |
| UF-LOG-1 bare `install` 자기모순 | = B6' | 동일 (§7/§2/§8 에서 closure) |
| UF-SEM-1 §4 version field canonical | §4.2 | 한 문장 명시 |
| UF-COV-1 dispatcher.js integrity owner | §3.5 | Command-authoring Authority 지명 |
| UF-CONCISE-1 family carrier taxonomy 압축 여지 | §4.3 | payload contract 고정 후 축약 검토 note |

### 1.2 v6 v1 → v6 v2 (review session 20260422-541ea899)

| v6 v1 finding | v6 v2 처리 위치 | 처리 종류 |
|---|---|---|
| C4 §7.1 stale source reference | §7.1 | active authority 기준 재작성 + crosswalk |
| C5 §7 header bare `install` + §8 lint self-trigger | §7 header rename + §8 exemption strategy | rename + exemption |
| §7.4 row count mismatch (3 vs 4) | §7.4 | "4건" 으로 수정 |

### 1.4 v6 v3 → v6 v4 (review session 20260423-1dba4a52)

| v6 v3 finding | v6 v4 처리 위치 | 처리 종류 |
|---|---|---|
| A1 Layer B exclusivity rule 부재 | §5.3a | evaluation order 명시 (deprecated 가 supported 보다 precedence) |
| A2 §5.4 simultaneous abnormal non-fail overlap 미처리 | §5.4 | fail/non-fail 양쪽 처리 규칙 + warn emit 방식 명시 |

### 1.3 v6 v2 → v6 v3 (review session 20260423-8a6a618b)

| v6 v2 finding | v6 v3 처리 위치 | 처리 종류 |
|---|---|---|
| C4' §7.2~§7.4 prose/path-seat 정규화 | §7.2~§7.4 | `{project}` → `{product}`, prose `project` → `product` / `product-local`. field value `"project"` 만 보존 |
| C5' title bare `Install` | doc title | `Install` → `Activation` rename + 설명 note |
| D1' §5.3 ↔ §5.2/§5.4 disposition 충돌 + R10-R12 fold | §5.3 (split into 5.3a/5.3b) + §5.4 inventory unfold | Layer B namespace registry + Layer C runtime compat 분리 + R10/R11/R12 각각 inventory item + simultaneous abnormal case 우선순위 명시 |
| UF-STR-1 Layer B registry seat 고아 | §5.3a | 명시 declaration |

---

## 2. v6 가 유지하는 구조 (변경 없음)

v5 의 다음 구조는 그대로 유지:

- **Three Authorities** (§3~§8): Bootstrap/Activation, Delegation/Handoff, Command-authoring
- **bin/onto 는 Delegation/Handoff only** (v5 §2)
- **catalog-derived dispatcher.js** (v5 §3)
- **shared identity header + spawn-family carrier** (v5 §4)
- **3 compatibility layers** (v5 §5.1)
- **producer graph + read-only aggregation** (v5 §6)
- **locality terminology triplet** (`install_event / install_state / install_mode`, v5 §7)
- **§9 delta-only discipline** (v5 §8)

이하 §3~§8 은 v5 의 잔여 blocker 를 inplace 로 closing 하는 변경만 서술.

---

## 3. Command-authoring Authority 보강

v5 §3 의 catalog derivation pipeline 유지. 추가:

### 3.5 dispatcher.js integrity owner (UF-COV-1)

**owner**: Command-authoring Authority. 구체적으로 §8 의 `catalog drift` CI check 가 `dispatcher.js` 의 catalog-hash 일치를 함께 검증.

**규칙**: dispatcher.js 는 **generated artifact 중 하나** (§3 의 generated list 에 포함). 인간이 직접 편집 금지. 수정 필요 시 catalog 수정 후 regenerate.

**runtime 검증**: dispatcher.js 진입 첫 줄에 `assertCatalogHash()` (generated marker 의 hash 와 현재 catalog hash 비교). mismatch 시 stderr emit + exit 비제로. 이로써 dispatcher.js 의 stale 실행 차단.

---

## 4. Delegation/Handoff Authority 보강

### 4.1 B3' 해소 — `§4` 와 `§8 F6` 통합

v5 의 모순 지점: §4.2 identity header 는 `{ ontoRoot, descriptor.brand, descriptor.version }`, §8 F6 는 "install_mode 만 identity payload" — 세 필드 vs 한 필드 충돌.

**v6 통합**: identity header 에 **`install_mode` 명시 포함**. 네 필드가 canonical.

### 4.2 schema block — 명시 (Recommendation 1)

```
HandoffIdentityPayload {
  ontoRoot: string (absolute path)
  brand: string (verification token emitted by Bootstrap)
  version: int (descriptor envelope schema version)     // §4.4 참조
  install_mode: "user" | "project" | "development"
}

ExecutionContext {
  // 기존 env/cwd inheritance 그대로
  // identity 와 무관한 실행 편의 정보만
  // profile_scope_active 는 여기 속함 (§7.3)
}
```

**UF-SEM-1 응답 — `version` field 의 canonical 의미**:

> `version` 은 Layer A (descriptor envelope schema) 의 version. Layer B (payload semantic) 와 Layer C (runtime code) 의 version 은 **별도 field** 이며 identity header 에 포함되지 않음. identity 는 envelope level 에서만 확정.

### 4.3 worked example × 3 (v5 §4.3 유지, schema 이름만 적용)

v5 의 3 example 은 모두 `HandoffIdentityPayload` schema 를 재사용:

```
# Example 1: top-level delegation
payload: HandoffIdentityPayload = {
  ontoRoot: "/usr/local/.../onto-core",
  brand: "abc123",
  version: 1,
  install_mode: "user"  # delegated to product-local, but sender was "user"
}
carrier: argv "--__handoff <base64>"

# Example 2: executor spawn (review lens)
payload: HandoffIdentityPayload = { ontoRoot, brand, version, install_mode: "user" }
carrier: argv "--__handoff <base64>"  # same format as Example 1

# Example 3: coordinator nested spawn (Agent Teams)
payload: HandoffIdentityPayload = { ontoRoot, brand, version, install_mode: "user" }
carrier: TaskCreate prompt 안 "<handoff>{base64}</handoff>" 블록
```

**UF-CONCISE-1 note**: 3 family 의 carrier 가 Example 1/2 (argv) 와 Example 3 (inline prompt block) 로 2 군집으로 축약 가능. payload contract 이 v6 에서 확정됐으므로 후속 boundary 에서 taxonomy 를 `argv-carrier` / `inline-carrier` 2개로 압축 가능. v6 본문에서는 3-way 유지 (회귀 방지).

### 4.4 version field semantics

`version` = Layer A (envelope schema) version 만. Layer B/C 는 payload 내부 또는 runtime 내부에서 관리. identity header 의 `version` 하나가 Layer A/B/C 를 모두 포괄한다는 과적재 금지.

---

## 5. Bootstrap/Activation Authority — Layer C 포함 compat matrix

### 5.1 3 layer (v5 §5.1 유지)

| layer | field | 소유 |
|---|---|---|
| Layer A | `descriptor.version` | Bootstrap |
| Layer B | `payload_compat.{schema_id, schema_version}` | Bootstrap |
| Layer C | runtime 의 `runtime.code_version` (package.json version 또는 build-embedded) | Runtime 자체 |

### 5.2 disposition matrix — Layer A/B/C 독립 judge (B1' + D1 해소)

**원칙**: 3 layer 는 독립. 각 row 가 A/B/C 세 column 모두 명시적 값. mixed-generation 도 Layer C 를 독립 judge.

| # | 상황 | Layer A | Layer B | Layer C | disposition |
|---|---|---|---|---|---|
| R1 | 모두 일치 | ok | ok | ok | **proceed** |
| R2 | Layer A mismatch | fail | ok | ok | **regenerate** |
| R3 | Layer B schema_id unknown | ok | unknown_id | ok | **regenerate** |
| R4 | Layer B schema_version in supported set | ok | accept | ok | **proceed** |
| R5 | Layer B schema_version out of supported set | ok | fail | ok | **regenerate** |
| R6 | **Layer B namespace deprecation fired** (schema_id 의 `deprecated_since` 도달) | ok | deprecated | ok | **regenerate + warn** (stderr) |
| R7 | Layer C runtime version in accepts range | ok | ok | accept | **proceed** |
| R8 | Layer C runtime version out of accepts range | ok | ok | fail | **regenerate** |
| R9 | **Layer C runtime deprecation fired** (runtime 의 `deprecated_runtime_versions` 도달) | ok | ok | deprecated | **regenerate + warn** (stderr) |
| R10 | Mixed-generation A (new env + known old payload + new runtime) | ok | accept (R4) | accept (R7) | **proceed** — 3 column 모두 독립 통과 |
| R11 | Mixed-generation B (new env + deprecated payload + new runtime) | ok | deprecated (R6) | accept (R7) | **regenerate + warn** — Layer B 판정 우선 |
| R12 | Mixed-generation C (new env + known old payload + deprecated runtime) | ok | accept | deprecated (R9) | **regenerate + warn** |
| R13 | regenerate 시도 후 여전히 mismatch (임의 row) | — | — | — | **fatal — stderr + exit 비제로** |

**R6 ↔ R9 구분**: R6 는 **payload schema** 의 deprecation (Layer B 의 namespace registry 가 소유). R9 는 **runtime code 자체** 의 deprecation (Layer C 의 accepts/deprecated range 가 소유). 두 deprecation 은 다른 registry 에서 관리되며 disposition 은 둘 다 `regenerate + warn` 이지만 warn message 의 referent 가 다름.

### 5.3 Layer B namespace registry + Layer C compat 선언

§5.4 가 reference 하는 두 registry 의 단일 owner location.

#### 5.3a Layer B — payload schema namespace registry

위치: `src/core-runtime/discovery/descriptor-namespace-registry.ts` (가칭)

```
registry.schema_versions = {
  "lens_executor_payload_v1": { supported: [1, 2], deprecated_since: null },
  "coordinator_payload_v1": { supported: [1], deprecated_since: null },
  // future schema_id 등록...
}
```

**evaluation order** (첫 match 적용, 이후 rule 은 평가 skip — A1 exclusivity 해소):
1. 새 schema_id 는 runtime 코드 안에서만 등록 가능 (외부 input 거부) — 등록 미충족 시 registry miss 로 분기
2. registry miss (unknown schema_id) → §5.2 R3 (regenerate)
3. registry hit + `deprecated_since` 도달 → §5.2 R6 (regenerate + warn) — **version 평가 skip** (`supported` 와의 exclusivity: deprecated 가 우선)
4. registry hit + not deprecated + version in `supported` → §5.2 R4 (proceed)
5. registry hit + not deprecated + version not in `supported` → §5.2 R5 (regenerate)

**Layer B exclusivity 원칙**: `supported` 와 `deprecated_since` 는 독립 predicates 지만 **evaluation order 로 precedence 고정** — deprecated_since 가 fired 면 version 이 supported 에 있더라도 R6 만 적용. 같은 payload 가 R4/R5 와 R6 에 동시 매칭되는 ambiguity 제거.

#### 5.3b Layer C — runtime code compatibility

위치: runtime 자기 코드 안 (예: `src/core-runtime/version.ts` 의 export)

```
runtime.code_compat = {
  accepts_descriptor_runtime_versions: ["1.x", "2.x"],   // semver range
  deprecated_runtime_versions: ["1.0"]                    // accept 범위에는 있지만 warn
}
```

규칙 (§5.2 와 alignment 강제):
- descriptor 의 `runtime.code_version` 이 `accepts_descriptor_runtime_versions` 에 포함되고 `deprecated_runtime_versions` 에 미포함 → §5.2 R7 (proceed)
- accepts 에 미포함 → §5.2 R8 (regenerate)
- accepts 에 포함 + deprecated 에 포함 → §5.2 R9 (**regenerate + warn**, 단순 accept 아님)

**§5.2 ↔ §5.3 disposition alignment 보장**: `deprecated_runtime_versions` 에 있는 input 은 §5.2 R9 의 `regenerate + warn` 만 적용. proceed 하지 않음. v6 v2 의 §5.3 ↔ §5.2/§5.4 충돌 (D1') 해소.

### 5.4 deprecation disposition — Layer B/C 분리

**Layer B (payload schema) deprecation** — §5.2 R6:
- trigger: `payload_compat.schema_id` 의 `deprecated_since` fired
- disposition: **regenerate + warn**
- warn message (stderr): `[deprecation:payload_schema] schema_id=X deprecated since Y. regenerating.`
- warn 은 exit 0 — 중단 없이 진행
- owner: Bootstrap/Activation Authority 의 namespace registry (§5.3)

**Layer C (runtime code) deprecation** — §5.2 R9:
- trigger: descriptor 가 참조하는 `runtime.code_version` 이 현재 runtime 의 `deprecated_runtime_versions` 에 포함
- disposition: **regenerate + warn**
- warn message (stderr): `[deprecation:runtime_code] runtime_code_version=X deprecated. regenerating descriptor with current runtime.`
- warn 은 exit 0 — 중단 없이 진행
- owner: Runtime 자체 (§5.3 의 `runtime.code_compat`)

**canonical scenario inventory** (§5.2 matrix 와 1:1 매칭, 13 rows ↔ 13 items):
- R1 = "정상" (일상)
- R2 = "runtime envelope schema 변경"
- R3 = "payload namespace 미등록 (외부 input 또는 구버전)"
- R4 = "payload schema version 수용 범위 내"
- R5 = "payload schema version 범위 밖 (새 schema 도입)"
- R6 = "payload schema deprecation lifecycle 도달"
- R7 = "runtime 업그레이드 수용 가능"
- R8 = "runtime 업그레이드 수용 불가 (breaking)"
- R9 = "runtime deprecation lifecycle 도달"
- R10 = "mixed-generation A — descriptor 가 known old payload + 새 runtime 환경 (Layer B 만 downgrade, Layer C 정상)"
- R11 = "mixed-generation B — descriptor 가 deprecated payload + 정상 runtime (Layer B deprecation 우선)"
- R12 = "mixed-generation C — descriptor 가 known old payload + deprecated runtime (Layer C deprecation 우선)"
- R13 = "regenerate 실패 (fatal)"

**simultaneous abnormal case 처리 원칙** (A2 해소 — fail/non-fail 양쪽 모두 normalize):

1. **평가 순서**: Layer A → Layer B → Layer C (각 layer 의 상태 판정은 독립)
2. **fail 이 존재하면** (§5.2 의 R2/R3/R5/R8 중 하나): Layer A→B→C 중 첫 fail 의 disposition 적용. 이후 layer 검사 skip. 예: A=fail + B=unknown → R2 만 적용
3. **fail 없이 non-fail abnormal 만 존재하면** (deprecated — R6/R9 중 복수):
   - disposition = `regenerate + warn` (R6/R9 동일 outcome)
   - stderr 에 **발동된 각 layer 의 warn message 모두 emit** (예: Layer B deprecated + Layer C deprecated → 두 warn line 순차 emit)
   - exit 0 (R6/R9 와 동일)
4. **모두 ok** → R1 (proceed)

이로써 fail-overlap, fail/non-fail-mixed, non-fail-overlap, all-ok 네 case 모두 결정론적.

누락 case 가 있으면 row 추가 + scenario inventory 동시 갱신 (§8 CI check 의 `compat-matrix-completeness` 가 강제).

---

## 6. producer graph — freshness 명확화

### 6.1 3 timestamp 분리 (B5' 해소)

| field | 의미 | 소유 |
|---|---|---|
| `last_<event>_at` | **도메인 이벤트 발생 시각** (예: `last_repair_at` = 마지막 self-repair 실제 실행 시각) | 각 producer |
| `emitted_at` | **이 status response 가 생성된 시각** (producer 가 응답 emit 한 시점) | 각 producer |
| `aggregated_at` | **aggregator (`info --verify`) 가 4 응답을 하나로 묶은 시각** | aggregator |

**rename 결정**: v5 의 `last_*_at` 이 v6 에서 **도메인 이벤트 시각으로 확정**. emit 시각은 **별도 field** (`emitted_at`). 두 field 가 같은 의미로 읽힐 여지 제거.

### 6.2 producer fn schema

| authority | producer fn | 응답 |
|---|---|---|
| Bootstrap/Activation | `getBootstrapStatus()` | `{ status, descriptor: {...}, last_repair_at: ISO?, emitted_at: ISO }` |
| Delegation/Handoff | `getHandoffStatus()` | `{ status, active_chain: [...], last_handoff_at: ISO?, emitted_at: ISO }` |
| Command-authoring | `getCatalogDriftStatus()` | `{ status, drift: [...], last_check_at: ISO?, emitted_at: ISO }` |
| Business execution | `getLastSessionStatus()` | `{ status, last_session: {...}, last_session_at: ISO?, emitted_at: ISO }` |

`last_*_at` 은 nullable (해당 이벤트 미발생 시 null).

### 6.3 aggregated JSON 예시 (Recommendation 3)

`onto info --verify` 출력:

```json
{
  "aggregated_at": "2026-04-22T14:30:22Z",
  "bootstrap": {
    "status": "ok",
    "descriptor": { "version": 1, "brand": "abc123", "install_mode": "user" },
    "last_repair_at": "2026-04-22T14:25:11Z",
    "emitted_at": "2026-04-22T14:30:21Z"
  },
  "delegation_handoff": {
    "status": "ok",
    "active_chain": ["/usr/.../onto-core", "/proj/.../onto-core"],
    "last_handoff_at": "2026-04-22T14:29:03Z",
    "emitted_at": "2026-04-22T14:30:21Z"
  },
  "command_authoring": {
    "status": "ok",
    "drift": [],
    "last_check_at": "2026-04-22T13:00:00Z",
    "emitted_at": "2026-04-22T14:30:22Z"
  },
  "business_execution": {
    "status": "ok",
    "last_session": { "id": "20260422-0c2bb622", "status": "completed" },
    "last_session_at": "2026-04-22T13:45:00Z",
    "emitted_at": "2026-04-22T14:30:22Z"
  }
}
```

3 시각 모두 동시 표시: 이벤트 발생 (`last_*_at`), 응답 생성 (`emitted_at`), 묶음 (`aggregated_at`).

### 6.4 staleness 판정

- aggregator 는 staleness 판정 안 함. timestamp 만 정확히 emit
- caller (사용자 / script / CI) 가 threshold 설정 후 판단

---

## 7. Locality 와 scope terminology — principle layer 정합 (B2' + B4' 해소)

### 7.1 active authority 와의 crosswalk (C4 해소)

active authority `.onto/principles/product-locality-principle.md` §1 의 canonical vocabulary:

| principle layer (canonical, prose) | code-facing field value (현 코드) | retire 경로 |
|---|---|---|
| `global` | `"user"` | knowledge framework v1.0 §8.5 retire 대상 (runtime migration backlog) |
| `product-local` | `"project"` | 동일 (retire 대상) |
| `development` | `"development"` | 일치 (retire 무관) |

**v6 의 결정**:
- prose 에서 principle layer 를 가리킬 때: `global / product-local / development` 사용
- field value (descriptor, env var, config) 에서: 현 코드 기준 `"user" / "project" / "development"` 유지 (active authority §1 "용어 규칙" 직접 인용)
- 두 layer 사이는 위 표로 단일 crosswalk

**bridge 줄** (future runtime migration 시 retire path 가시화):
- 코드 차원의 `"user"` → principle 차원의 `global` retire 는 별도 boundary (runtime migration backlog) 에서 추적
- `"project"` → `product-local` 도 동일 backlog
- 본 v6 본문의 모든 `install_mode` field value 는 code-facing 값 (`"user"`, `"project"`, `"development"`)

v5 §7.1 의 drift (`user/project/development` 를 principle canon 으로 잘못 승격) 는 v6 에서 위 crosswalk 으로 정정.

### 7.2 profile_scope 축

| `profile_scope` (code-facing field value) | config 파일 위치 (path placeholder = `{product}` per active authority) |
|---|---|
| `"user"` | `~/.onto/config.yml` |
| `"project"` | `{product}/.onto/config.yml` |
| `"development"` | repo 안 `.onto/config.yml` |

**vocab 주석** (§7.1 crosswalk 적용):
- field value `"project"` 는 code-facing 으로만 사용 (active authority §1 "용어 규칙")
- path placeholder `{product}` 는 active authority `.onto/principles/product-locality-principle.md` §1 의 canonical (`{product}/node_modules/onto-core/`, `{product}/.onto/`)
- prose 에서는 "product 의 config", "product-local 위치" 로 서술

축 이름이 `install_mode` 와 동일 labels 집합을 사용하는 것은 **의도적 align** — 사용자가 서로 다른 축임을 이름만으로 구분하기 어려우므로, **항상 field prefix 와 함께 표기** (`install_mode` 또는 `profile_scope_active`, bare scope 금지).

### 7.3 profile_scope_active propagation + default (B4' 해소)

**propagation**:
- `profile_scope_active` 는 **ExecutionContext 에 속함** (§4.2 schema 참조). identity payload 아님.
- delegation 시 env 로 전파: `ONTO_PROFILE_SCOPE_ACTIVE=user|project|development`
- executor spawn / coordinator spawn 시 동일하게 env inherit
- 자식 process 는 env 로 받고, 없으면 default resolution 적용

**default resolution** (`--profile-scope` 미지정 시):
1. `ONTO_PROFILE_SCOPE_ACTIVE` env 가 있으면 그 값 사용
2. env 도 없으면 **`install_mode` 와 동일 값** 을 default 로 선택
3. 단 `install_mode = "user"` (= principle layer 의 `global`) 이고 현재 cwd 가 product-local boundary 안 (`{product}/.onto/` 또는 product root) 이면 `"project"` (= principle layer 의 `product-local`) 로 override (precedent: 최근 fix `e812634` — `--profile-scope project` 가 `~/.onto/` 를 덮어쓰지 않도록)

### 7.4 truth table — `install_mode × profile_scope_active` (Recommendation 2)

9 기본 case + 4 no-flag case:

| install_mode | profile_scope_active (명시) | 유효 config | 비고 |
|---|---|---|---|
| `"user"` | `"user"` | `~/.onto/config.yml` | global binary, global config |
| `"user"` | `"project"` | `{product}/.onto/config.yml` | global binary, product-local config |
| `"user"` | `"development"` | repo 안 `.onto/config.yml` | global binary, dev config (rare) |
| `"project"` | `"user"` | `~/.onto/config.yml` | product-local binary, global config |
| `"project"` | `"project"` | `{product}/.onto/config.yml` | both product-local (common) |
| `"project"` | `"development"` | repo 안 `.onto/config.yml` | product-local binary, dev config (rare) |
| `"development"` | `"user"` | `~/.onto/config.yml` | dev binary, global config |
| `"development"` | `"project"` | `{product}/.onto/config.yml` | dev binary, product-local config |
| `"development"` | `"development"` | repo 안 `.onto/config.yml` | both development |

**no-flag default cases — 4건** (7.3 default resolution 적용):

| install_mode | cwd 위치 | default profile_scope_active | 유효 config |
|---|---|---|---|
| user | product-local boundary 안 | `"project"` (§7.3 step 3 override) | `{product}/.onto/config.yml` |
| user | product-local boundary 밖 | `"user"` (§7.3 step 2) | `~/.onto/config.yml` |
| project | — | `"project"` (§7.3 step 2) | `{product}/.onto/config.yml` |
| development | — | `"development"` (§7.3 step 2) | repo 안 `.onto/config.yml` |

---

## 8. CI/lint 확장 (Recommendation 4)

3 regression 을 CI 가 자동 차단:

| check name | 구현 |
|---|---|
| **catalog-drift** | `command-catalog.ts` hash 와 derived (`.onto/commands/*.md`, `dispatcher.js`, `.claude-plugin/plugin.json`, `package.json scripts`) 의 embedded hash marker 비교 |
| **locality-vocab-discipline** | grep 기반 — `.onto/**/*.md`, `src/**/*.ts` 에서 `\binstall\b` 토큰이 아래 exemption 밖에서 출현하면 fail |
| **compat-matrix-completeness** | v6 §5.2 의 matrix row 수 ≥ §5.4 scenario inventory item 수. row 누락 PR 차단 |

**locality-vocab-discipline 의 exemption strategy** (자기모순 방지):
- 복합 토큰 안: `install_mode`, `install_event`, `install_state`, `HandoffIdentityPayload`, `installation-*` (파일명) → 허용
- backtick / 코드블록 안: ` `install` ` / `\binstall\b` 같은 메타 인용 → 허용 (lint rule 자체를 설명할 수 있어야 함)
- heading text 중 fixed phrase `install terminology` 는 retire 대상, 현재 문서는 `locality terminology` 로 교체
- rule 자체의 이름을 `locality-vocab-discipline` 으로 둬 rule name 이 rule 에 걸리지 않음

위치: `.github/workflows/determinism-regression.yml` (가칭, 파일명에서도 bare token 회피).

---

## 9. user flows — delta-only (v5 §8 유지)

v2 §4 의 F1~F7 적용. v5 → v6 delta:

| flow | v5 → v6 delta |
|---|---|
| F1~F4 | 변경 없음 |
| F5 | aggregated JSON 이 3 timestamp (§6.1) 을 모두 표시 |
| F6 | identity header 에 `install_mode` 포함 (§4.1). profile_scope_active 는 ExecutionContext 로 전파 (§7.3) |
| F7 | Layer C mismatch + deprecation 도 disposition matrix 에서 처리 (§5.2) |

v6 도 시나리오 본문 다시 적지 않음.

---

## 10. v6 가 여전히 defer 하는 것

v5 §9 유지:

1. `descriptor.payload` 의 구체 field 명/의미 (namespace registry 등록은 v5 가 결정)
2. handoff payload 의 wire format 세부 (base64-json 은 v5, 구체 field ordering 등은 implementation)
3. descriptor cache 위치
4. command-catalog.ts 의 exact type schema (v5 가 골자 결정)
5. C1 (no-dist) 채택 시점
6. dispatcher.js 의 정확한 위치

---

## 11. 후속 review 에서 답을 구할 질문

1. Layer C compat matrix (§5.2) 의 각 행이 실제 runtime scenario 와 1:1 매칭되는가, 아니면 누락 case 가 있는가?
2. profile_scope_active default resolution (§7.3 step 3) 의 override 가 다른 install_mode 조합에서도 필요한가?
3. aggregated JSON (§6.3) 의 3 timestamp 분리가 기존 `review-record.yaml` 의 timestamp 체계와 정합하는가?
4. UF-CONCISE-1 의 3-family → 2-family carrier 축약은 어느 iteration 에서 적용이 safe 한가?
5. CI/lint (§8) 의 3 check 가 v6 가 defer 한 6 항목 (§10) 의 evidence 를 대체/보완 가능한가?
