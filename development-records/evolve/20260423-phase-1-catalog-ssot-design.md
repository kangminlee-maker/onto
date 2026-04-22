# Phase 1 — Catalog SSOT + Dispatcher + Phase Gate Design

> **Status**: fully aligned 9/9 (2026-04-23)
> **Provenance**: 8 iteration 끝에 수렴. v8 가 final approved snapshot.
>
> **Review sessions** (시간순):
> - v1: `.onto/review/20260423-09a151c4/` — partially, initial
> - v2: `.onto/review/20260423-989c491f/` — partially, three-way layer + framing
> - v3: `.onto/review/20260423-c7bb1283/` — partially, identity ↔ realization 분리
> - v4: `.onto/review/20260423-a00f43f6/` — partially, B3/B4/B5 closure
> - v5: `.onto/review/20260423-bb1f2451/` — partially, sentinel + RuntimeScript placement
> - v6: `.onto/review/20260423-ac879e5b/` — partially, A2 + reserved namespace + helper fold
> - v7: `.onto/review/20260423-9042878c/` — partially, A1 honest dual enforcement
> - **v8**: `.onto/review/20260423-de0ea08a/` — **fully aligned 9/9, 0 blocker**
>
> **Trigger**: Activation/Execution Determinism Redesign (`20260423-activation-determinism-redesign.md`) §3 Command-authoring Authority + §5 catalog SSOT 의 implementation Phase 1.
>
> **Sub-PRs**: P1-1 (catalog declaration) → P1-2 (generator) → P1-3 (dispatcher + bin/onto + preboot-dispatch) → P1-4 (CI drift)

---

## 1. 한 문장

> 5 위치 (`.onto/commands/*.md`, `package.json:scripts`, `bin/onto`, `src/cli.ts`, `.claude-plugin/plugin.json`) 에 흩어진 명령 정보를 **`src/core-runtime/cli/command-catalog.ts` migration evidence** 로 흡수한 뒤, generator + dispatcher + CI drift 로 **단계적 authority 전환**.

---

## 2. Survey + drift evidence (2026-04-23)

| 위치 | 항목 수 |
|---|---|
| `.onto/commands/**/*.md` | 15 |
| `package.json:scripts` | 33 |
| `src/cli.ts` switch table | 16 |
| `.claude-plugin/plugin.json` | path-only |

**Drift 4건** (catalog SSOT 가 해소할 대상):
- `info` cli.ts 등록 + markdown 없음
- `feedback / transform / create-domain / backup / restore` markdown 만 (prompt-backed slash commands)
- `reclassify-insights / migrate-session-roots / config / build` cli.ts 만 (markdown 누락 또는 deprecated)
- npm scripts 가 public subcommand 와 같은 namespace 사용

---

## 3. Two axes — Layer taxonomy ↔ Entry kind taxonomy

**두 개의 독립 분류 axis** 를 명시 분리:

### 3.1 Axis A — Layer taxonomy (dispatch 메커니즘)

| layer | 의미 | 예시 |
|---|---|---|
| `cli-backed` | dispatch via `src/cli.ts` handler | `review`, `info`, `install`, `config`, `evolve`, `learn` |
| `prompt-backed` | dispatch via LLM 이 markdown 본문 prompt 실행 | `feedback`, `transform`, `create-domain`, `backup`, `restore`, `onboard` |
| `internal` | runtime 내부 spawn / 개발자 npm run | `review:invoke`, `coordinator:start` |

### 3.2 Axis B — Entry kind taxonomy (catalog schema 의 discriminated union)

| entry kind | 의미 | 보유 가능 realizations |
|---|---|---|
| `PublicEntry` | 사용자 호출 가능 명령 | SlashRealization / CliRealization / PatternedSlashRealization |
| `RuntimeScriptEntry` | npm script | (no realizations — name 자체가 invocation) |
| `MetaEntry` | meta 명령 (`help`, `version`, bare `onto` default) | MetaRealization (long_flag / short_flag) |

### 3.3 두 axis 간 관계

| Layer (Axis A) | Entry kind (Axis B) |
|---|---|
| cli-backed | PublicEntry with at least 1 CliRealization |
| prompt-backed | PublicEntry with SlashRealization or PatternedSlashRealization, no CliRealization |
| internal | RuntimeScriptEntry |
| (meta: layer axis 와 직교) | MetaEntry |

**Layer 는 derived attribute** — entry 의 realization 종류로부터 자동 분류. catalog 에 직접 declare 안 함.

---

## 4. CatalogEntry 스키마

### 4.1 Entry kinds

```typescript
type CatalogEntry = PublicEntry | RuntimeScriptEntry | MetaEntry;

type Common = {
  description: string;
  aliases?: string[];
  deprecated_since?: string;
  removed_in?: string;
  successor?: string;
};

type PublicEntry = Common & {
  kind: "public";
  identity: string;
  phase: "preboot" | "post_boot";
  repair_path?: boolean;
  contract_ref?: string;
  doc_template_id: string;
  realizations: PublicRealization[];
  runtime_scripts?: string[];
};

type PublicRealization = SlashRealization | CliRealization | PatternedSlashRealization;

type SlashRealization = { kind: "slash"; invocation: string; prompt_body_ref: string };
type CliRealization = { kind: "cli"; invocation: string; cli_dispatch: { handler_module: string; handler_export?: string } };
type PatternedSlashRealization = {
  kind: "patterned_slash";
  invocation_pattern: string;
  parameter_name: string;
  parameter_set: string[];
  prompt_body_ref: string;
};

type RuntimeScriptEntry = Common & {
  kind: "runtime_script";
  name: string;
  script_path: string;
  invoker: "tsx" | "node-dist";
};

type MetaEntry = Common & {
  kind: "meta";
  name: string;
  phase: "preboot";
  realizations: MetaRealization[];
  cli_dispatch: { handler_module: string; handler_export?: string };
  default_for?: "bare_onto";
};

type MetaRealization =
  | { kind: "long_flag"; invocation: string }
  | { kind: "short_flag"; invocation: string };

export const META_NAME_REGISTRY = ["help", "version"] as const;

type CommandCatalog = { version: 1; entries: CatalogEntry[] };
```

### 4.2 동명 surface + patterned family 처리

| case | catalog 표현 |
|---|---|
| `review` slash + cli | PublicEntry { realizations: [SlashRealization, CliRealization] } |
| `feedback` slash only | PublicEntry { realizations: [SlashRealization] } |
| `info` cli only | PublicEntry { realizations: [CliRealization] } |
| `ask-{dim}` patterned | PublicEntry { realizations: [PatternedSlashRealization] } |
| `--help` / `-h` | MetaEntry { name: "help", realizations: [long_flag, short_flag] } |
| `--version` / `-v` | MetaEntry { name: "version", realizations: [long_flag, short_flag] } |
| **bare `onto`** | MetaEntry 중 `default_for: "bare_onto"` 인 entry. **normalized invocation set 의 sentinel `"<<bare>>"` single concrete key** |

### 4.3 Type invariants

| invariant | 검증 시점 |
|---|---|
| kind / phase / realization.kind exhaustive | compile-time |
| MetaEntry.realizations / PublicEntry.realizations ≥ 1 | runtime (load) |
| Normalized invocation set 의 모든 key unique (sentinel `"<<bare>>"` 포함) | runtime (load — `getNormalizedInvocationSet` 호출 자체가 검증) |
| 사용자 facing invocation 이 `<<` 또는 `>>` 로 시작하지 않음 | runtime (load — `assertReservedNamespaceUnused`) |
| RuntimeScriptEntry.name 끼리 unique | runtime (load) |
| MetaEntry.name 이 META_NAME_REGISTRY member | runtime (load — `assertMetaNameRegistered`) |
| alias collision (Common.aliases 합집합) | runtime (load) |
| `successor` / `runtime_scripts` reference 존재 | runtime (load) |
| deprecation lifecycle (`removed_in > deprecated_since`) | runtime (load) |
| `repair_path: true` ⇒ `phase: "preboot"` (phase sub-attribute, cross-ref 아님) | runtime (load) |
| handler_module / prompt_body_ref / contract_ref / script_path 파일 존재 | build-time (test) |

### 4.4 Legacy surface disposition

3 legacy entry catalog 등재 (deprecation lifecycle invariant 자동 검증):

| entry | 처리 |
|---|---|
| `reclassify-insights` | PublicEntry { phase: post_boot, deprecated_since: "0.2.0", successor: "promote" } |
| `migrate-session-roots` | PublicEntry { phase: post_boot, deprecated_since: "0.2.0", removed_in: "0.3.0" } |
| legacy `build` | PublicEntry { phase: post_boot, deprecated_since: "0.2.0", successor: "reconstruct" } |

### 4.5 catalog.version migration + load gate

```typescript
export const CATALOG_VERSION_HISTORY = {
  1: {
    introduced_in: "0.3.0",
    description: "Initial catalog with three entry kinds.",
    breaking_changes: [],
  },
} as const;

export const CURRENT_CATALOG_VERSION = 1;

if (catalog.version !== CURRENT_CATALOG_VERSION) {
  throw new Error(
    `Unsupported catalog.version: declared=${catalog.version}, runtime supports=${CURRENT_CATALOG_VERSION}. ` +
    `Resolution: either downgrade the catalog to version ${CURRENT_CATALOG_VERSION}, ` +
    `or upgrade the runtime to a build that supports catalog.version ${catalog.version}.`,
  );
}
```

bump rules:
- patch: optional field 추가, deprecated_since 표시 (schema migration 불필요)
- major: rename / removal / kind 추가 (`breaking_changes` + `migration_path` 명시 필수)

### 4.6 Helper functions

`src/core-runtime/cli/command-catalog-helpers.ts`:
- `getNormalizedInvocationSet(catalog)` — single authoritative surface, addOrThrow 가 invariant 자동 검증
- `assertReservedNamespaceUnused(catalog)` — `<<` `>>` prefix 차단
- `assertNoRuntimeScriptCollision(catalog)`
- `assertMetaNameRegistered(catalog)`
- `assertSuccessorReferenceExists(catalog)`, `assertDeprecationLifecycle(catalog)`, etc.

### 4.7 Normalized invocation set

```typescript
export function getNormalizedInvocationSet(catalog: CommandCatalog): NormalizedInvocationSet {
  const set: NormalizedInvocationSet = new Map();
  for (const entry of catalog.entries) {
    if (entry.kind === "public") {
      for (const r of entry.realizations) {
        if (r.kind === "slash" || r.kind === "cli") {
          addOrThrow(set, r.invocation, target);
        } else if (r.kind === "patterned_slash") {
          for (const param of r.parameter_set) {
            addOrThrow(set, r.invocation_pattern.replace(`{${r.parameter_name}}`, param), target);
          }
        }
      }
    } else if (entry.kind === "meta") {
      for (const r of entry.realizations) {
        addOrThrow(set, r.invocation, target);
      }
      if (entry.default_for === "bare_onto") {
        addOrThrow(set, "<<bare>>", target);  // sentinel
      }
    }
    // RuntimeScriptEntry 는 normalized invocation set 밖
  }
  return set;
}
```

이 함수가 **single source** — collision check + dispatcher lookup 모두 동일 함수 호출 결과 consume.

---

## 5. Phase 모델 + Bootstrap 실패 contract

### 5.1 Phase 정의

| phase | 의미 | descriptor |
|---|---|---|
| `preboot` | bootstrap 진입 전 호출 가능 | 불필요 (또는 optional best-effort) |
| `post_boot` | bootstrap 후 호출 가능 | 필수 |

### 5.2 preboot set

| name | repair_path | 비고 |
|---|---|---|
| `info` | false | introspection only |
| `--help` / `-h` | — | MetaEntry "help" |
| `--version` / `-v` | — | MetaEntry "version" |
| `install` | **true** | recovery-path invariant |
| `config` | **true** | configuration repair |

### 5.3 repair_path 명령 동작

`repair_path: true` 인 명령:
1. preboot 진입 (descriptor 검증 skip)
2. **best-effort bootstrap 시도** (timeout 5s, retry 0)
3. 결과를 handler 로 input 전달
4. handler 가 두 branch:
   - bootstrap success: full functionality
   - bootstrap fail: repair-only branch

### 5.4 Bootstrap 실패 종료 계약

```typescript
type BootstrapResult =
  | { status: "ok"; descriptor: ActivationDescriptor }
  | { status: "timed_out"; elapsed_ms: number }
  | { status: "failed"; failed_field: string; repair_hint: string };
```

- timeout: 5초
- retry: 0회 (silent retry 금지, fail-fast philosophy)
- repair_path 명령: handler 로 BootstrapResult 전달, repair-only branch 진행
- non-repair_path 명령: bootstrap 실패 시 즉시 fail-fast with actionable error

### 5.5 default_for "bare_onto" 의 enforcement (이원, 정직)

| case | enforcement timing | mechanism |
|---|---|---|
| 2+ entry | **load-time** | `addOrThrow` collision throw |
| 0 entry | **dispatch-time** | `"<<bare>>"` lookup miss → actionable error + exit 1 |
| 1 entry | (정상) | normal dispatch |

Single source 는 유지 — `getNormalizedInvocationSet` 함수 하나가 양 enforcement input. enforcement timing 만 분리.

---

## 6. Catalog framing = migration evidence

### 6.1 단계적 authority 전환 (4 단계)

| 단계 | catalog 지위 |
|---|---|
| **P1-1 머지** | **migration evidence** — 기존 5 위치가 authority |
| **P1-2 머지** | catalog + generator coexist, derived = 기존과 diff 0 |
| **P1-3 머지** | **catalog → runtime authority** (dispatcher + preboot-dispatch 가 catalog-derived) |
| **P1-4 머지** | CI drift check 활성화 — full authority + drift regression 차단 |

### 6.2 P1-1 catalog.ts 첫 줄 주석

```
// Catalog migration evidence — Phase 1 P1-1 (2026-04-XX).
// Authority status: evidence only. Existing 5 surfaces remain authoritative
// until P1-3 dispatcher integration + P1-4 CI drift check activation.
```

---

## 7. Generator 설계 (P1-2)

### 7.1 Derive targets

| target | 처리 |
|---|---|
| `.onto/commands/{name}.md` (top-level + nested) | template-based derive |
| `dispatcher.ts` (catalog-derived 코드) | **위치: `src/core-runtime/cli/dispatcher.ts`** (A1 sunset pre-meet) |
| `src/cli.ts` help section | generated marker 로 둘러싸인 segment 만 |
| `package.json:scripts` (RuntimeScriptEntry 만) | generator emit |

### 7.2 Template 2-layer

```
src/core-runtime/cli/
├── command-catalog.ts                  ← 인간 편집 (declaration only)
├── command-catalog-templates/          ← 인간 편집 (long content)
│   ├── feedback.md.template
│   └── ...
└── command-catalog-helpers.ts          ← 인간 편집 (assertions)
```

template 파일은 catalog entry 의 `doc_template_id` 가 참조. 인간 → template 편집 → generator 실행 → derived markdown 갱신.

### 7.3 Generated marker

각 derived 첫 줄:
```
<!-- GENERATED from src/core-runtime/cli/command-catalog.ts. Edit catalog or template, then run `npm run generate:catalog`. -->
```

`src/cli.ts` 의 help section 은 segment marker:
```typescript
// >>> GENERATED FROM CATALOG — do not edit; edit catalog instead
const HELP_TEXT = `... (catalog-derived) ...`;
// <<< END GENERATED
```

### 7.4 Generator 호출

`scripts/generate-command-catalog-derived.ts` (가칭). npm script `generate:catalog`. deterministic.

---

## 8. Dispatcher + Phase Gate

### 8.1 dispatcher.ts (catalog-derived)

```typescript
import { getNormalizedInvocationSet } from "./command-catalog-helpers.js";
import { COMMAND_CATALOG } from "./command-catalog.js";

const NORMALIZED = getNormalizedInvocationSet(COMMAND_CATALOG);

export async function dispatch(argv: string[]) {
  const arg = argv[0] ?? "<<bare>>";  // sentinel
  const target = NORMALIZED.get(arg);
  if (!target) {
    if (arg === "<<bare>>") {
      // 0 case — bare onto 호출됐으나 default 없음
      process.stderr.write(
        `No default command for bare \`onto\`. Specify a subcommand or configure MetaEntry.default_for.\n`,
      );
      return 1;
    }
    return failUnknownCommand(arg);
  }
  // phase 분기 + handler 호출
}
```

### 8.2 bin/onto 변경

기존: `dist/cli.js` 직접 import → cli.ts 가 모든 dispatch
변경: `dispatcher.ts` import → dispatcher 가 phase 분기. bin/onto 책임은 Delegation/Handoff only.

### 8.3 preboot-dispatch.ts

신규 파일. preboot 명령 (info, install, config, --help, --version) handler. descriptor 미요구.

`repair_path: true` 명령은 best-effort bootstrap 시도 후 handler 호출.

### 8.4 Authority transition timing — single fixed at P1-3

| artifact | P1-2 머지 직후 | P1-3 머지 직후 |
|---|---|---|
| dispatcher.ts | catalog 에서 generator emit. bin/onto 는 아직 import 안 함 | bin/onto 가 import 시작 — catalog-derived authority |
| preboot-dispatch.ts | (생성 안 함) | catalog-derived 로 P1-3 PR 에 함께 추가 |

freshness contract: P1-3 머지 후 catalog 변경 시 dispatcher.ts + preboot-dispatch.ts 모두 즉시 regenerate. 누락은 P1-4 CI drift check 가 차단.

---

## 9. CI drift check (P1-4)

### 9.1 check 범위

| target | check |
|---|---|
| `.onto/commands/**/*.md` | catalog hash ↔ marker hash |
| `src/core-runtime/cli/dispatcher.ts` | catalog hash ↔ marker hash |
| `src/core-runtime/cli/preboot-dispatch.ts` | catalog hash ↔ marker hash |
| `src/cli.ts` help segment | catalog hash ↔ segment marker hash |
| `package.json:scripts` (RuntimeScriptEntry) | catalog ↔ scripts 1:1 |

### 9.2 Workflow

`.github/workflows/determinism-regression.yml` (Activation Determinism Redesign §8 의 첫 check 가 본 P1-4):
- trigger: PR + push to main
- 자동 regenerate 안 함 (수동 강제) — 개발자가 catalog 수정 후 `npm run generate:catalog` + 같은 commit 에 derived 변경 포함

---

## 10. PR sequencing → §6.1 pointer

P1-1 ~ P1-4 의 4 단계 transition 은 §6.1 의 4 단계 정의를 따름.

---

## 11. Test 전략

### 11.1 P1-1

- discriminated union exhaustive (compile + runtime)
- helper assertion 음성/양성 케이스 (alias collision, successor, internal_scripts, deprecation lifecycle, file existence, repair_path → preboot)
- 동명 invocation collision (다른 entry 가 같은 slash invocation) → fail
- patterned realization 의 parameter_set expansion 후 collision → fail
- bare onto sentinel `"<<bare>>"` 의 0/1/2+ case
- catalog.version mismatch → load throw + generator 진입 거부

### 11.2 P1-2

- deterministic (동일 catalog + template → 동일 derived)
- 현 파일과 generated 의 diff 0 (조정 후)
- generated marker 위치 정확

### 11.3 P1-3

- preboot 명령 (info, install, config, --help) → bootstrap skip
- post_boot 명령 (review) → bootstrap 진입
- repair_path 명령 (install, config) → best-effort bootstrap 후 handler
- alias routing
- 알 수 없는 명령 → fail-fast with help suggestion
- bare onto: default 0 → actionable error, default 1 → 정상 dispatch

### 11.4 P1-4

- catalog 변경 + generate 미실행 → CI fail
- catalog + generate 실행 → CI pass
- derived 직접 수정 → CI fail (hash mismatch)

---

## 12. Risks + mitigations

| risk | severity | mitigation |
|---|---|---|
| 현 markdown 들과 generated diff 0 안 맞음 | 중 | P1-2 작업 중 template 을 현 파일에 맞게 조정 |
| dispatcher 통합 시 bin/onto 위임 회귀 | 중 | P1-3 e2e test |
| catalog entry 누락 | 높음 | P1-1 test 가 5 위치 전수 enumeration 후 catalog 와 1:1 매칭 |
| internal script invocation pattern 다양 | 중 | invoker field 분기 |
| prompt-backed 가 cli-backed 로 잘못 분류 | 중 | P1-1 test 의 dispatch_kind 분류 검증 (catalog/template upstream 기준, generated markdown 아님) |
| repair_path 명령의 bootstrap 실패 시 fallback 명세 부재 | 중 | P1-3 PR 에서 install/config handler 의 repair-only branch 명시 |
| src/cli.ts segment marker 가 일반 코드 변경과 충돌 | 중 | segment 를 별도 const 블록으로 분리 |
| `"<<bare>>"` 같은 reserved namespace 의 형식 변경 | 낮음 | catalog.version major bump |

---

## 13. 결정된 source decisions (사용자 확정, 2026-04-23)

| Q | 결정 |
|---|---|
| Q1 npm scripts build/check/lint/test cover? | **No** — 별개 layer |
| Q2 feedback/transform dispatch? | **prompt-backed** layer (PublicEntry with SlashRealization only) |
| Q3 markdown manual section? | **No (100% generated + template 2-layer)** |
| Q4 CI drift 자동 regenerate? | **No (수동 강제)** |
| Q5 preboot set 충분? | install/config repair-path 추가 + status 제거 |
| Q6 dispatcher 위치? | **`src/core-runtime/cli/dispatcher.ts`** (A1 sunset pre-meet) |
| AP1 install/config preboot? | **Yes** + optional best-effort bootstrap |
| AP2/C5 catalog framing? | **migration evidence** (단계적 authority 전환) |

---

## 14. Open questions (deferred to P1-1 implementation)

1. `CATALOG_VERSION_HISTORY` 의 정확한 field schema — 후속 version bump 시점 구체화
2. `catalog:check` diagnostic script — Phase 2 이후 별도 작업 (현재 catalog.version error message 는 file path reference 없음)
3. patterned family parameter_set static (catalog 내 hardcoded) vs dynamic (config read) — 현 안: static
4. RuntimeScriptEntry cross-collision (public invocation 과 우연 동명) — 현 안: 검사 안 함 (dispatch 경로 다름)

---

## 15. Iteration trail

8 iteration 의 핵심 진전:

| v | 핵심 closure |
|---|---|
| v1 | initial design (two-layer) |
| v2 | three-way layer + framing + repair_path preboot + bootstrap contract |
| v3 | identity ↔ realization 분리 (동명/patterned/meta) + bootstrap contract 정밀화 |
| v4 | B3 (label) + B4 (axis 분리) + B5 (catalog.version gate) + script_path invariant |
| v5 | sentinel `"<<bare>>"` + RuntimeScript placement + assertNormalizedInvocationSetClosed fold |
| v6 | A2 (MetaEntry.name claim) + reserved namespace formal invariant + helper fold |
| v7 | A1 (default_for enforcement honest dual) |
| **v8** | **A3 (file path reference removed) → fully aligned 9/9** |
