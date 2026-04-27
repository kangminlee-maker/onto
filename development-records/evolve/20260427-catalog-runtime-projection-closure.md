# Catalog → Runtime Projection Closure (P2 RFC-1)

> **Status**: draft v9 (2026-04-27, v8 review wording residual cleanup)
> **Trigger**: P1-3 review (5 sessions, 2026-04-25) 가 surface 한 6개 architectural finding. `development-records/handoff/20260425-phase-1-4-resume.md` §4 의 P2-1, P2-2, P2-3, P2-4, P2-5, P2-7.
> **Predecessors**:
> - `development-records/evolve/20260423-phase-1-catalog-ssot-design.md` (P1 design authority)
> - `development-records/evolve/20260423-activation-determinism-redesign.md` §3 Command-authoring Authority
>
> **Iteration trail**:
> - v1 (2026-04-27): 6 항목 격차 분석 + 3 sub-PR ladder + 5 결정 사항.
> - v2 (2026-04-27): claude-main-agent teams multi-axis review + cross-cut deliberation 결과 반영.
> - v3 (2026-04-27): `onto review` (codex nested, session `20260427-7e2452df`, 9 lens) 의 5 consensus blocker + 5 immediate actions + 5 unique findings 반영.
> - v4 (2026-04-27): `onto review` (codex nested, session `20260427-db699d17`, 9 lens) 의 3 surviving consensus blocker + 4 immediate actions + 4 unique findings 반영.
> - v5 (2026-04-27): `onto review` (codex nested, session `20260427-ba3b1c2d`, 9 lens — v3 의 3 surviving blocker 모두 9/9 closed 합의, 4 immediate actions 잔존) 반영.
> - v6 (2026-04-27): `onto review` (codex nested, session `20260427-a8029dd4`, 9 lens — v4 의 4 actions 모두 9/9 closed 합의, **disagreement 4 vs 4** — v5 가 §6.1.1 catalogOverride 접근으로 §4.1.2 (static emit) 와 §6.1.1 (runtime build) 의 두 authority seat 모순 도입) 반영. 핵심 변경: (a) **§4.1.2 ↔ §6.1.1 authority seat 단일화** — production seat = generated preboot-dispatch.ts (static emit, §4.1.2 그대로 유지). test seam = 신규 hand-written `src/core-runtime/cli/dispatch-preboot-core.ts` 의 `dispatchPrebootCore(routing, argv, metaTable, publicTable)` pure function. generated preboot-dispatch.ts 는 thin shim — static emitted tables 를 supplied 후 `dispatchPrebootCore` 호출. test 는 core 함수 직접 import + bogus tables 주입. catalogOverride parameter 폐기; (b) **BARE_ONTO_SENTINEL non-leak normative contract** — §4.1.2.4 의 Contract C 명시 + dispatchPrebootCore 안에 assertion 추가, §6.1.2 에 명시적 test row 추가, §7.1 risk row 가 normative contract reference; (c) **structure-only finding 닫음** (UF-STRUCTURE-SENTINEL-LEAK-CONTRACT).
> - v7 (2026-04-27): `onto review` (codex nested, session `20260427-5ec9dc13`, 9 lens — v6 의 §4.1.2 ↔ §6.1.1 단일화 + Contract C promotion 모두 9/9 closed 합의. 2 trivial errors + 4 UF-tagged recommendations 잔존) 반영. 변경: (a) Contract C reference 정정 (§4.1.2.2 → §4.1.2.4 — UF-STRUCTURE-CONTRACT-C-MISREF); (b) §10 wording v6 → version-neutral; (c) `dispatchPrebootCore` 의 "pure function" wording 을 **catalog-independent** 로 narrow — `resolveHandlerModule()` 의 `ONTO_HOME` 의존 명시 (UF-DEPENDENCY-PURE-SEAM-ONTO-HOME); (d) §6.1.2 에 coverage rows 추가 — short-flag, prod-path non-help meta dispatch, bare-onto remap-to-version (UF-COVERAGE-META-GAPS); (e) §11 future seam 추가 — handler_export ↔ argv ABI 분리 (UF-EVOLUTION-HANDLER-EXPORT-ABI-COUPLING); (f) meta-handlers "decomposition only / full isolation = future seam" canonical seat 단일화 — §4.1.3 가 sole, §11 row 가 reference (UF-CONCISENESS-META-HANDLER-SEAM-DUPLICATION).
> - v8 (2026-04-27): `onto review` (codex nested, session `20260427-59ce2a4a`, 9 lens — disagreement None, 1 surviving contradiction + 1 wording recommendation 잔존) 반영. 변경: (a) §6.1.2 에 4번째 coverage row 추가 — prod-path short-flag dispatch (UF-COVERAGE-PROD-SHORT-FLAG-PATH 닫음); (b) §4.1.2.1 의 "flag-only argv" wording broader 화 (UF-SEMANTICS-FLAG-ONLY-ARGV-SCOPE — partial closure).
> - **v9 (2026-04-27)**: `onto review` (codex nested, session `20260427-7028a515`, 9 lens — v7 contradiction 9/9 closed 합의, **disagreement 6 vs 3** — wording two-model reading 잔존: bare `--help`/`-v` 의 named export argv 는 실제로 `[]` (empty after `argv.slice(1)`) 이지만 v8 wording 이 "flag-bearing" example 로 포함시켜 ambiguity) 반영. 변경: §4.1.2.1 의 wording 을 **canonical single mental model** 으로 정리 — bare meta 호출 시 named export argv 는 **empty tail (`[]` after slice)**, "flag-bearing tail" 은 추가 flag 있을 때만 (예: `bin/onto --help --extra-flag` → tail = `["--extra-flag"]`). UF-SEMANTICS-FLAG-ONLY-ARGV-SCOPE full closure.
>
> **Sub-PR ladder**: P2-A (schema-runtime projection 통합 + prod smoke) → P2-B (aliases — schema 이전 + canonical lookup) → P2-C (multi-CLI phase). P2-A 머지 후 P2-B/C 는 main rebase 위에서 **rebase-dependent follow-on** (병렬 진입 가능, dispatcher schema_version 직렬 점유 — §5.3.1).

---

## 1. 한 문장

> **§3 의 6 항목 격차 — schema 가 declared 한 모델 (handler_module **for preboot publics + meta**, default_for, aliases, multi-CLI realization) 을 runtime 이 honor 하도록 dispatcher.ts + preboot-dispatch.ts + getNormalizedInvocationSet 의 hardcoded 분기를 제거.**

본 RFC 의 **closure 범위는 §3 의 6 항목 한정**. closure 외 항목 (future seam):
- **post_boot per-entry handler diversification** — post_boot PublicEntry 의 handler_module 활용 (§3 P2-1 의 보완). 본 RFC P2-A 는 preboot publics + meta 만 cover. post_boot 는 cli.ts main 위임 그대로 유지 (§8, §11)
- **meta-handlers.ts decomposition only / full isolation 미달성** — 자세한 정의 + 달성/미달성 boundary 는 **§4.1.3** 가 canonical seat. cli.ts dual authority 일원화 + ONTO_HELP_TEXT 추출은 §11 의 future seam rows 가 trigger 명시.

---

## 2. 배경 — P1 의 boundary 와 본 RFC 의 위치

P1 의 4 단계 (P1-1 → P1-4) 는 **5 위치 명령 정보의 SSOT 통합 + drift 차단** 을 마감했음 (catalog = full authority). P1 review 5회는 SSOT 통합의 **invariant 검증** 까지 closure 했지만 다음은 boundary 밖으로 분리:

> *Schema 가 declared 한 모델 중 일부를 runtime 이 hardcoded 분기로 처리하여 declared 정보를 무시하는 항목.*

이는 catalog 의 **invariant** 가 아니라 **표현력 (expressiveness)** 의 활용 문제. P1 머지 시점에서 schema 가 충분히 풍부하나 runtime 이 그 일부만 읽음. 본 RFC = catalog → runtime **projection closure** (§3 6 항목 한정 — declared model → runtime behavior 1:1 투영).

---

## 3. 6 항목 — schema 모델 ↔ runtime 격차

### 3.1 한눈 격차 표

| # | schema 모델 (declared) | 현 runtime (as-is) | 격차의 user-facing 결과 |
|---|---|---|---|
| P2-1 (preboot only) | `CliRealization.cli_dispatch.handler_module` / `handler_export` (**preboot publics + meta 한정**) | dispatcher 가 모든 PublicEntry CLI realization 을 **cli.ts main() 으로 일괄 위임** (preboot publics 도 동일 — `preboot-dispatch.ts:91-95`). handler_module 은 phase 무관 미사용 | 새 preboot handler 가 다른 module 에 있어도 catalog 만 수정해서는 라우팅 변경 불가. **post_boot 의 handler_module 활용은 future seam (§11)** — cli.ts main 일괄 위임 그대로 유지 |
| P2-2 | `MetaEntry.cli_dispatch` + `MetaRealization` (long_flag/short_flag) | preboot-dispatch.ts 가 `--help`/`-h`/`--version`/`-v` 4개를 hardcoded if 분기로 처리. cli_dispatch 무시 | 새 meta 추가 시 catalog 만 수정해서는 동작 안 함 — preboot-dispatch.ts 코드 수정 필수 |
| P2-3 | `MetaEntry.default_for: "bare_onto"` (`help` entry 에 declared) | dispatcher.ts 의 `BARE_ONTO_SENTINEL` 분기에 잘못된 주석 (현 catalog 가 declared, dead branch). NORMALIZED 는 honor 하지만 그 다음 단계가 sentinel 자체를 invocation 으로 forward → preboot-dispatch.ts 가 sentinel 을 다시 hardcode `→ print help` 로 매핑 | bare-onto 가 동작은 함 (help 출력) 그러나 우연에 가까움 — schema 변경 시 silent misroute 가능 |
| P2-4 | `Common.aliases?: readonly string[]` (현 schema. v4 결정 — P2-B 에서 PublicEntry 로 이전) | `assertNoAliasCollision` 만 호출. NORMALIZED 에 미투영. cli.ts main / dispatcher / preboot 모두 `argv[0]` 으로 분기하므로 alias 가 들어가도 canonical case 매치 실패 | catalog 에 alias 추가해도 `bin/onto <alias>` 실패 — 첫 alias 도입 시 working state breakage |
| P2-5 | `realizations: readonly PublicRealization[]` 가 다수 `CliRealization` 허용 | `computePhaseMap` 이 `realizations.find(r => r.kind === "cli")` — 첫 cli 만 walk | 한 entry 가 multi-CLI invocation 갖는 future 시점에 두 번째 invocation 의 phase 가 미등록 → silent misroute (`undefined ?? "post_boot"` 로 잘못 라우팅, 에러 없음) |
| P2-7 | `MetaEntry.default_for: "bare_onto"` 의 chosen meta identity 보존 | dispatcher → preboot-dispatch 호출 시 invocation 문자열 (`<<bare>>`) 만 forward. meta name (`help`) 은 lost → preboot-dispatch 가 sentinel hardcode 매칭 | (P2-3 와 동일 표현) chosen meta 이름이 runtime 에 도달 안 하므로 `default_for` 값 변경이 silent ignore — 예: `version` 에 `default_for: bare_onto` 변경 시 여전히 help 가 호출 |

### 3.2 격차의 공통 원인

세 단계의 hardcoded 분기:

1. **dispatcher.ts**:
   - `BARE_ONTO_SENTINEL` 의 dead-code comment ("No default_for...")
   - meta target → `dispatchPreboot(arg, ...)` 호출 시 meta name 이 아닌 invocation 문자열 forward
2. **preboot-dispatch.ts**:
   - `--help`/`-h`/`<<bare>>` → ONTO_HELP_TEXT 출력 hardcoded
   - `--version`/`-v` → readOntoVersion hardcoded
   - PREBOOT_PUBLIC_INVOCATIONS set 후 cli.ts main 일괄 위임
3. **computePhaseMap (dispatcher-deriver.ts)**:
   - `find(r => r.kind === "cli")` 로 첫 cli 만 매핑

**왜 이렇게 됐나**: P1 의 4 단계는 'route through catalog' 까지였고 'every realization field is honored' 는 별 단계로 분리. P1-3 review 가 surface 한 6 항목 중 P1-4 boundary 안에서 흡수 가능한 항목 없음 — 모두 `cli_dispatch` semantics 또는 NORMALIZED projection 변경 필요.

---

## 4. 변경 방향

### 4.1 P2-A: cli_dispatch + MetaEntry 통합 routing (P2-1, 2, 3, 7)

**목적**: dispatcher 와 preboot-dispatch 가 `cli_dispatch.handler_module` + `cli_dispatch.handler_export` 를 통해 routing. hardcoded `--help`/`--version`/`<<bare>>` 분기 제거.

#### 4.1.1 `dispatcher.ts` (catalog-derived)

현재:
```ts
if (target.entry_kind === "meta") {
  const { dispatchPreboot } = await import("./preboot-dispatch.js");
  return dispatchPreboot(arg, arg === BARE_ONTO_SENTINEL ? argv : argv.slice(1));
}
```

변경 후:
```ts
if (target.entry_kind === "meta") {
  const { dispatchPreboot } = await import("./preboot-dispatch.js");
  return dispatchPreboot(
    { meta_name: target.name },                              // ← chosen meta identity 보존
    arg === BARE_ONTO_SENTINEL ? argv : argv.slice(1),
  );
}
```

`BARE_ONTO_SENTINEL` 의 `if (target === undefined) { if (arg === BARE_ONTO_SENTINEL) ... }` dead-code 분기 삭제 — NORMALIZED 가 이미 default_for 를 honor 하므로 unreachable.

#### 4.1.2 `preboot-dispatch.ts` (catalog-derived) — normative pseudocode

**Authority seat split (v6)**:
- **Production seat (single authority)**: generated `src/core-runtime/cli/preboot-dispatch.ts` — catalog-derived, static emitted `META_DISPATCH_TABLE` / `PUBLIC_DISPATCH_TABLE` 가 baked-in. **thin shim** — supplied tables 와 함께 underlying catalog-independent function 호출.
- **Underlying logic seat**: hand-written `src/core-runtime/cli/dispatch-preboot-core.ts` — `dispatchPrebootCore(routing, argv, metaTable, publicTable)`. **catalog-independent** (catalog 의존 없음 — tables 를 parameter 로 받음). 단 fully pure 는 아님 — `resolveHandlerModule()` 가 `ONTO_HOME` env 를 읽으므로 environment 의존. test seam 이 직접 import + bogus tables 주입 (§6.1.1).
- **Boundary**: production 호출 (`bin/onto`) 은 항상 generated preboot-dispatch.ts 통과 → production authority 단일. test seam 은 `dispatchPrebootCore` 직접 호출, non-authoritative (production path 미관여).

generated preboot-dispatch.ts 골격:

```ts
// preboot-dispatch.ts (catalog-derived) — thin shim
import { dispatchPrebootCore, type PrebootRouting, type MetaDispatchTable, type PublicDispatchTable } from "./dispatch-preboot-core.js";

// catalog-derived at emit time
const META_DISPATCH_TABLE: MetaDispatchTable = { /* 각 MetaEntry 의 cli_dispatch */ };
const PUBLIC_DISPATCH_TABLE: PublicDispatchTable = { /* preboot PublicEntry 의 cli_dispatch — canonical invocation 만 (alias 미등록) */ };

export async function dispatchPreboot(
  routing: PrebootRouting,
  argv: readonly string[],
): Promise<number> {
  return dispatchPrebootCore(routing, argv, META_DISPATCH_TABLE, PUBLIC_DISPATCH_TABLE);
}
```

이하 §4.1.2.1 ~ §4.1.2.4 의 normative pseudocode 는 모두 `dispatchPrebootCore` 의 본체 — generated preboot-dispatch.ts 가 호출하는 underlying 함수.

##### 4.1.2.1 Routing argv shape contract (Contract A — normative)

`dispatchPrebootCore` 는 routing object discriminator + argv + tables 를 받는다. **argv shape 은 routing kind 에 따라 다르며 silent-no-op 위험 차단의 핵심 invariant**:

```ts
// dispatch-preboot-core.ts (hand-written, catalog-independent — environment 의존은 resolveHandlerModule 의 ONTO_HOME 만)
export type PrebootRouting =
  | { meta_name: string }            // meta dispatch
  | { public_invocation: string };   // public preboot — invariant: canonical cli invocation, NOT alias

export type MetaDispatchTable = Readonly<Record<string,
  { handler_module: string; handler_export?: string }
>>;
export type PublicDispatchTable = Readonly<Record<string,
  { handler_module: string; handler_export?: string }
>>;

const BARE_ONTO_SENTINEL = "<<bare>>";

export async function dispatchPrebootCore(
  routing: PrebootRouting,
  argv: readonly string[],
  metaTable: MetaDispatchTable,
  publicTable: PublicDispatchTable,
): Promise<number> {
  // **BARE_ONTO_SENTINEL non-leak invariant (Contract C — §4.1.2.4)**: dispatcher 가 sentinel 을
  // strip 한 뒤에만 본 함수에 도달. argv 에 sentinel 이 포함되면 invariant 위반 — fail-fast.
  if (argv.some(a => a === BARE_ONTO_SENTINEL)) {
    throw new Error(
      "[onto] dispatchPrebootCore: BARE_ONTO_SENTINEL leaked into argv — dispatcher invariant 위반.",
    );
  }

  // ... (handler discovery — 4.1.2.2)

  // **argv shape contract**: handler 가 cli.ts:main 인 경우 (handler_export 미지정),
  // main 이 argv[0] 으로 switch 하므로 invocation 을 prepend. named export 는
  // tail argv 를 받는다 — invocation 이 routing 객체로 식별되므로 named export 의 argv 는
  // invocation token 이후의 tail 만. 일반 bare 호출 (`bin/onto --help`, `bin/onto -v`) 의
  // tail = `argv.slice(1) = []` (empty). 추가 flag 가 있으면 (`bin/onto --help --global`) 그 tail
  // (`["--global"]`). bare-onto / default_for routing 도 incoming argv 가 이미 `[]` → empty tail.
  // 즉 named export 는 항상 [] OR ["--extraN", ...] 형태. invocation 자체는 argv 에 포함 안 됨.
  const argvForHandler =
    "public_invocation" in routing
      ? [routing.public_invocation, ...argv]
      : argv;

  return handler(argvForHandler);
}
```

**Invariant — `routing.public_invocation` = canonical CLI invocation**:
- dispatcher.ts 가 NORMALIZED target 의 `canonical_cli_invocation` 필드를 읽어 alias → canonical 변환 (§4.2.1, §4.2.4 — P2-B 에서 도입).
- preboot-dispatch 는 항상 canonical 만 받음 — PUBLIC_DISPATCH_TABLE 도 canonical key 만 보유.
- 즉 cli.ts:main 이 항상 canonical invocation 으로 argv[0] switch.

**왜 contract 가 routing-aware 인가**: cli.ts:main (`src/cli.ts`) 의 switch 가 `argv[0]` 으로 분기 (`case "config":`). public preboot (`config`/`install`/`info`) 가 `main(argv_without_invocation)` 을 받으면 `subcommand=undefined` → default fallthrough (help 출력 + exit 0) → silent no-op. 따라서 public 경로는 `[invocation, ...argv]` 으로 invocation 보존 필수. meta 경로 (named export onHelp/onVersion) 는 routing 객체로 invocation 이 이미 식별 — argv 에서 invocation 은 stripped, tail 만 forward. **canonical model**: bare meta 호출 (`bin/onto --help`, `-v`) 시 tail = `[]` (empty). 추가 flag 가 있는 호출 (`bin/onto --help --global`) 시 tail = `["--global"]`. bare-onto / default_for routing 도 incoming argv 자체가 이미 `[]` → tail = `[]`. 즉 named export 가 받는 argv 는 항상 invocation 이 빠진 tail — empty 또는 flag list.

##### 4.1.2.2 handler_export discovery contract (Contract B — normative)

argv shape 와는 **독립된 contract surface**. handler_export 가 비함수 형 인 경우 fail-fast 보장. 본 logic 도 `dispatchPrebootCore` 안:

```ts
// dispatch-preboot-core.ts 안 — dispatchPrebootCore 본체
const dispatch =
  "meta_name" in routing
    ? metaTable[routing.meta_name]
    : publicTable[routing.public_invocation];
if (dispatch === undefined) {
  process.stderr.write(`[onto] dispatchPrebootCore: no handler for ${JSON.stringify(routing)}.\n`);
  return 1;
}

const moduleSpecifier = resolveHandlerModule(dispatch.handler_module);
const mod = await import(/* @vite-ignore */ moduleSpecifier);
const handler = dispatch.handler_export === undefined
  ? mod.main
  : mod[dispatch.handler_export];
if (typeof handler !== "function") {
  process.stderr.write(
    `[onto] dispatchPrebootCore: handler ${dispatch.handler_module}` +
    `#${dispatch.handler_export ?? "main"} is not a function.\n`,
  );
  return 1;
}
```

`typeof handler !== "function"` guard 는 **defense-in-depth Layer 2** (canonical gate 는 build-time `check:handler-exports`. §6.1).

##### 4.1.2.3 `resolveHandlerModule` — installationRoot 매핑 (normative pseudocode)

catalog 가 declared 한 `handler_module` 은 **installation-internal path** (예: `"src/cli.ts"`). dev (tsx) 와 prod (dist/, compiled) 의 차이:
- dev: `src/cli.ts` 가 그대로 존재, tsx 가 import 시 resolve
- prod: `package.json:files` (line 11-27) 가 `dist/` + `bin/` 만 ship. `src/` 는 published install 에 미존재 → catalog 의 path 를 그대로 import 하면 fail

**`installationRoot` semantic**: `ONTO_HOME` 은 **installation root** — onto-core 가 설치된 directory (`bin/onto` + `src/core-runtime/discovery/onto-home.ts` 에서 그렇게 사용). project root (사용자 프로젝트) 와는 별 개념. catalog 의 handler_module 은 installation-internal 이므로 installationRoot 가 정확:

```ts
import { pathToFileURL } from "node:url";
import path from "node:path";

function resolveHandlerModule(catalogPath: string): string {
  const installationRoot = process.env.ONTO_HOME;
  if (installationRoot === undefined) {
    throw new Error(
      "[onto] resolveHandlerModule: ONTO_HOME unset — bin/onto entry did not initialize. " +
      "Direct invocation of dispatcher.ts is not supported in production paths.",
    );
  }
  // dev↔prod 매핑: 본 모듈의 URL 이 /dist/ 경로에서 evaluate 되면 prod
  const inDist = import.meta.url.includes("/dist/");
  const mapped = inDist
    ? catalogPath.replace(/^src\//, "dist/").replace(/\.tsx?$/, ".js")
    : catalogPath;
  return pathToFileURL(path.join(installationRoot, mapped)).href;
}
```

**Edge cases** (구현 시 검증 필요):
- `.ts` / `.tsx` / `.mts` 확장자 매트릭스 (현재 `.ts` 만 사용)
- handler_module 이 `src/` 외부 (예: `src/core-runtime/cli/meta-handlers.ts` — 동일 prefix 매핑 적용 OK)
- `npm link` symlink 경로 (`bin/onto:48` 가 이미 realpath 처리 — installationRoot 도 realpath 통과)
- Windows path separator 정규화
- ONTO_HOME 미설정 — 명시적 throw (fallback 없음. dispatcher 직접 실행 path 가 production 에 존재 안 함)

##### 4.1.2.4 BARE_ONTO_SENTINEL non-leak contract (Contract C — normative)

**Invariant**: `dispatchPrebootCore` 의 `argv` 에 `BARE_ONTO_SENTINEL` (`"<<bare>>"`) 값이 **절대로 포함되지 않음**. dispatcher.ts 가 sentinel 을 strip 한 뒤에만 본 함수에 도달.

**왜 필요한가**: dispatcher.ts:119 의 `arg === BARE_ONTO_SENTINEL ? argv : argv.slice(1)` 분기는 sentinel 이 invocation 인 경우 argv 를 그대로 forward (sentinel 자체는 argv 에 안 들어감). 그러나 미래 refactor 가 sentinel 을 invocation/argv 에 leak 시키면 → handler 가 sentinel 문자열을 argv element 로 인식 → silent misroute. 본 invariant 가 fail-fast 를 보장.

**구현**: §4.1.2.1 의 `dispatchPrebootCore` 진입점에서 첫 검증 — `argv.some(a => a === BARE_ONTO_SENTINEL)` 시 throw.

**Test surface**: §6.1.2 의 dedicated row — `dispatchPrebootCore` 를 sentinel 포함 argv 로 호출 → throw 검증.

#### 4.1.3 `meta-handlers.ts` 신규 모듈 — decomposition (preboot authority isolation 은 partial)

`onHelp(argv)`, `onVersion(argv)` 는 cli.ts 가 아닌 **dedicated `src/core-runtime/cli/meta-handlers.ts` 모듈** 에 거주.

**달성하는 것 — decomposition**:
- meta handler 의 함수 본문이 cli.ts 의 main switch 가 아닌 dedicated module 에 거주.
- catalog 의 `cli_dispatch.handler_module` 이 cli.ts 가 아닌 meta-handlers.ts 를 가리킴 → schema 적으로 명확한 separation.
- cli.ts:main 의 hardcoded `case "--help"` / `case "--version"` 본문 중복은 그대로 잔존 (cli.ts 직접 실행 호환).

**달성하지 못하는 것 — full isolation 은 future seam**:
- preboot 경로가 meta-handlers.ts 만 로드하고 cli.ts 를 미로드 하는 isolation 은 **본 RFC scope 외**. 본 RFC 의 meta-handlers.ts 는 ONTO_HELP_TEXT 를 cli.ts 에서 dynamic import 하므로 cli.ts module evaluation 은 여전히 발생.
- **Full isolation 의 prerequisite**: ONTO_HELP_TEXT (catalog-derived const, 현재 cli.ts segment) 를 cli.ts 외부 dedicated text module 로 추출. 이는 cli-help-deriver 의 emission_path 변경 → emit-rule change → 별 follow-up RFC.
- 본 RFC 머지 후에도 `bin/onto --help` 는 cli.ts 모듈 evaluation 비용을 그대로 부담. P2-A 의 이득은 **schema-runtime alignment (catalog 가 declared 한 handler_module 이 실 사용)** + **decomposition (meta semantics 가 cli.ts 의 main switch 와 분리된 entry point)** 까지.

**meta-handlers.ts 골격 (현 RFC scope — cli.ts 에서 ONTO_HELP_TEXT dynamic import 그대로)**:
```ts
// src/core-runtime/cli/meta-handlers.ts
export async function onHelp(_argv: readonly string[]): Promise<number> {
  // ONTO_HELP_TEXT 의 cli.ts 외부 추출은 future seam (§11) — 본 RFC 에서는 cli.ts 의 const 그대로 access
  const { ONTO_HELP_TEXT } = await import("../../cli.js");
  console.log(ONTO_HELP_TEXT);
  return 0;
}
export async function onVersion(_argv: readonly string[]): Promise<number> {
  const { readOntoVersion } = await import("../release-channel/release-channel.js");
  const version = await readOntoVersion();
  console.log(`onto-core ${version}`);
  return 0;
}
```

**catalog 갱신**:
```ts
{
  kind: "meta", name: "help", phase: "preboot",
  cli_dispatch: { handler_module: "src/core-runtime/cli/meta-handlers.ts", handler_export: "onHelp" },
  // ...
},
{
  kind: "meta", name: "version", phase: "preboot",
  cli_dispatch: { handler_module: "src/core-runtime/cli/meta-handlers.ts", handler_export: "onVersion" },
  // ...
}
```

#### 4.1.4 `cli.ts` 의 변화

P2-A 에서 cli.ts 변경 최소화:
- main switch 의 `case "--help"` / `case "-h"` / `case "--version"` / `case "-v"` / `case undefined` 본문은 그대로 유지 (cli.ts 직접 실행 호환). 동작은 meta-handlers.ts 와 등가.
- onHelp/onVersion named export 는 cli.ts 가 아닌 meta-handlers.ts 에 거주 (§4.1.3).
- cli.ts case 본문 일원화는 future seam (§11) — full meta-handlers isolation 의 prerequisite.

#### 4.1.5 NORMALIZED → dispatcher 로의 entry.name 보존

`getNormalizedInvocationSet` 은 이미 meta target 에 `name` 포함 (`command-catalog-helpers.ts:102-115`). dispatcher 가 NORMALIZED.get(arg) 결과의 `target.name` 을 routing 객체로 forward (§4.1.1). BARE_ONTO_SENTINEL key 의 target 도 동일 entry.name 을 가리킴 — sentinel 자체가 아닌 chosen meta name 이 runtime 에 도달.

(주의: helpers 의 `addOrThrow(set, BARE_ONTO_SENTINEL, { entry_kind: "meta", name: entry.name })` 는 `realization_kind` 미부여 — sentinel 은 long_flag/short_flag axis 밖의 별 entry. 본 RFC 가 변경하지 않음.)

### 4.2 P2-B: aliases NORMALIZED projection (P2-4)

**목적**: `aliases` 를 NORMALIZED 에 등록 + dispatcher 가 alias → canonical invocation 변환 후 forward. PHASE_MAP 과 PUBLIC_DISPATCH_TABLE 은 alias 미등록 (canonical key 만 보유). `bin/onto <alias>` 가 canonical 처럼 동작.

#### 4.2.0 Schema 변경 — `Common.aliases` → `PublicEntry.aliases` 이전

**v3 review 의 결정**: `aliases` 가 schema 에 Common 에 노출되지만 runtime 은 PublicEntry 만 honor — schema/runtime seat mismatch. v4 에서 schema 변경:

| 위치 | 변경 |
|---|---|
| `src/core-runtime/cli/command-catalog.ts` `type Common` | `aliases?:` 제거 |
| 동일 파일 `type PublicEntry` | `aliases?: readonly string[]` 추가 (Common 에서 이전) |
| 영향 entry | 현 catalog 에 `aliases` 사용 entry 0 — schema 변경 type-only, 데이터 변경 없음 |

**왜 안전**: schema 0 usage. type 정의만 바뀌고 catalog 데이터는 그대로. validateCatalog 의 `assertNoAliasCollision` 도 PublicEntry 한정으로 변경.

P2-B scope 에 schema 변경 포함.

#### 4.2.1 DispatchTarget 확장 + `getNormalizedInvocationSet` (helpers)

**DispatchTarget 확장 — `canonical_cli_invocation` 은 cli realization 한정** (UF-SEMANTICS-CANONICAL-FIELD-SCOPE):

```ts
export type DispatchTarget =
  | {
      entry_kind: "public";
      identity: string;
      realization_kind: "cli";
      canonical_cli_invocation: string;     // ← cli target 한정, 항상 populated. alias key 는 entry 의 canonical cli invocation.
    }
  | {
      entry_kind: "public";
      identity: string;
      realization_kind: "slash" | "patterned_slash";
      // canonical_cli_invocation 미부여 — cli axis 밖의 target
    }
  | {
      entry_kind: "meta";
      name: string;
      realization_kind?: "long_flag" | "short_flag";
    };
```

**Type-level invariant**: `realization_kind === "cli"` 인 target 만 `canonical_cli_invocation` 보유. dispatcher 의 access 가 컴파일 시점에 강제됨.

**`getNormalizedInvocationSet` 변경**:
```ts
for (const entry of catalog.entries) {
  if (entry.kind === "public") {
    const identity = entry.identity;
    const cliRealizations = entry.realizations.filter(
      (r): r is CliRealization => r.kind === "cli",
    );
    const canonicalCliInvocation = cliRealizations[0]?.invocation;

    for (const r of entry.realizations) {
      if (r.kind === "cli") {
        addOrThrow(set, r.invocation, {
          entry_kind: "public",
          identity,
          realization_kind: "cli",
          canonical_cli_invocation: r.invocation,
        });
      } else if (r.kind === "slash") {
        addOrThrow(set, r.invocation, {
          entry_kind: "public",
          identity,
          realization_kind: "slash",
        });
      } else {
        // patterned_slash: 기존 로직 (canonical_cli_invocation 미부여)
      }
    }

    // 신규: PublicEntry 의 aliases 등록 (P2-B 의 schema 이전 후 — entry.aliases)
    if (entry.aliases !== undefined && entry.aliases.length > 0) {
      if (cliRealizations.length === 0) {
        throw new Error(
          `Aliases on PublicEntry "${identity}" require ≥1 CliRealization. ` +
          `Slash-only entries cannot carry aliases.`,
        );
      }
      if (cliRealizations.length > 1) {
        throw new Error(
          `Aliases on multi-CLI PublicEntry "${identity}" not supported in this RFC scope. ` +
          `Canonical resolution requires explicit canonical declaration — future seam (§11).`,
        );
      }
      // cliRealizations.length === 1 — single canonical 명확
      for (const alias of entry.aliases) {
        addOrThrow(set, alias, {
          entry_kind: "public",
          identity,
          realization_kind: "cli",
          canonical_cli_invocation: canonicalCliInvocation!,
        });
      }
    }
  } else if (entry.kind === "meta") {
    // 기존 realization 등록 (helpers.ts:103-115 그대로)
    // meta entry 는 aliases 자체를 schema 에 갖지 않음 (PublicEntry-only 이전 후)
  }
}
```

#### 4.2.2 Aliases 의 boundary 결정

| 결정 점 | 채택 | 근거 |
|---|---|---|
| schema seat | **PublicEntry 전용** (Common 에서 이전) | schema/runtime seat alignment. 현 usage 0 — 변경 안전. dead surface 제거 |
| slash-only entry 의 alias | **거부** (build-time throw via getNormalizedInvocationSet) | alias 의 canonical invocation 정의 불가 |
| meta entry 의 alias | **schema 에서 거부** (Common 에서 이전됐으므로 meta 는 alias 자체 부재). 추가 invocation 은 새 `short_flag`/`long_flag` realization 추가 | schema 분리도 보존 |
| multi-CLI PublicEntry 의 alias | **거부** (build-time throw) | canonical resolution 이 array 순서 의존 — 명시적 canonical field 도입 (future seam) 까지 거부 |
| alias collision with another entry's invocation | 모든 invocation (cli/slash/meta long_flag/short_flag) + alias 가 한 namespace, 충돌 시 throw | 첫 alias 도입 시 silent collision 차단 |

**`assertNoAliasCollision` 확장**:
- 현재: alias ↔ alias 만 비교
- 변경: alias ↔ 전체 invocation namespace cross-check + multi-cli/slash-only entry 의 alias 거부 invariant 강제

#### 4.2.3 P2-B 의 deriver 변경 — dispatcher-deriver 만, preboot-dispatch-deriver 무변경

**alias seat single = canonical lookup only** (v3 review 의 surviving blocker #1 closure):

- **NORMALIZED**: alias key 가 canonical_cli_invocation 보유 (§4.2.1).
- **dispatcher.ts (catalog-derived)**: alias key 도 NORMALIZED 에서 lookup → target.canonical_cli_invocation 으로 PHASE_MAP / PUBLIC_DISPATCH_TABLE 조회 + canonical 보존 forwarding (§4.2.4).
- **PHASE_MAP**: alias key 미등록 (canonical key 만). dispatcher-deriver 의 PHASE_MAP emit 변경 없음 — emit 자체는 동일 catalog snapshot 에서는 byte 동일.
- **PUBLIC_DISPATCH_TABLE**: alias key 미등록 (canonical key 만). preboot-dispatch-deriver emit 변경 없음.

**P2-B 의 deriver 변경 = dispatcher-deriver 의 dispatch logic emit 변경**:
- 현재 (P2-A): `const phase = PHASE_MAP[arg] ?? "post_boot";`
- 변경 (P2-B): canonical lookup
  ```ts
  if (target.entry_kind === "public" && target.realization_kind === "cli") {
    const canonical = target.canonical_cli_invocation;
    const phase = PHASE_MAP[canonical] ?? "post_boot";
    // ... canonical 보존 forwarding
  }
  ```
- preboot-dispatch-deriver 는 미변경 — PUBLIC_DISPATCH_TABLE 도 canonical key 만 (이미 P2-A 에서 그렇게 emit).

**핵심**: P2-B 가 `dispatcher-deriver.ts` 만 변경, `preboot-dispatch-deriver.ts` 무변경. dispatcher schema_version 만 bump (preboot-dispatch unchanged).

#### 4.2.4 dispatcher 의 canonical lookup + boundary

NORMALIZED 가 alias key 를 `realization_kind: "cli"` + `canonical_cli_invocation` 로 등록 → 기존 boundary `target.realization_kind !== "cli"` 거부 분기와 자연 정합. dispatcher.ts 의 본체 변경 (P2-B 에서):

```ts
// dispatcher.ts (P2-B 머지 후)
if (target.entry_kind === "public") {
  if (target.realization_kind !== "cli") {
    // slash → reject (existing boundary, P1-3)
    process.stderr.write(`[onto] "${arg}" is a slash command, ...\n`);
    return 1;
  }
  // cli target — canonical lookup (alias 도 동일 path)
  const canonical = target.canonical_cli_invocation;     // type-level invariant: cli target 항상 populated
  const phase = PHASE_MAP[canonical] ?? "post_boot";
  if (phase === "preboot") {
    const { dispatchPreboot } = await import("./preboot-dispatch.js");
    return dispatchPreboot(
      { public_invocation: canonical },                  // ← canonical 보존
      argv.slice(1),
    );
  }
  // post_boot — cli.ts main 이 argv[0] 으로 switch 하므로 canonical 을 prepend
  const { main } = await import("../../cli.js");
  return main([canonical, ...argv.slice(1)]);            // ← canonical 보존
}
```

**Behavior**: 사용자가 `bin/onto coord` (alias) 입력 → NORMALIZED.get("coord") 가 `canonical_cli_invocation: "coordinator"` target 반환 → dispatcher 가 PHASE_MAP["coordinator"] 로 phase 결정 → cli.ts main 은 `["coordinator", ...]` 받음 (alias 가 아닌 canonical) → switch 매치. silent no-op 회피.

**P2-B = dispatcher.ts 의 dispatch logic emit 변경**: P2-A 의 dispatcher.ts 와 byte 다름 → dispatcher schema_version bump (§5.3.1).

### 4.3 P2-C: multi-CLI realization phase mapping (P2-5)

**목적**: 한 PublicEntry 가 다수 `CliRealization` 갖는 경우 모든 invocation 별 phase 매핑.

#### 4.3.1 `computePhaseMap` (dispatcher-deriver.ts)

현재:
```ts
const cli = pub.realizations.find(r => r.kind === "cli");
if (cli) map[cli.invocation] = pub.phase;
```

변경:
```ts
for (const r of pub.realizations) {
  if (r.kind !== "cli") continue;
  if (map[r.invocation] !== undefined && map[r.invocation] !== pub.phase) {
    throw new Error(
      `Phase collision in computePhaseMap: invocation "${r.invocation}" mapped to ` +
      `both ${map[r.invocation]} and ${pub.phase}`,
    );
  }
  map[r.invocation] = pub.phase;
}
```

**왜 collision throw**: 한 entry 의 모든 cli invocation 은 같은 phase (`PublicEntry.phase` 가 entry-level). 다른 entry 가 같은 invocation 을 가지면 NORMALIZED collision 으로 이미 catch — 이 검사는 deriver-time defense-in-depth.

#### 4.3.2 multi-CLI + alias 의 명시적 거부

P2-B 의 §4.2.1 invariant 가 multi-CLI entry + alias 를 build-time throw. 즉 P2-C 가 multi-CLI 를 allow 해도 그 entry 가 alias 를 갖는 순간 P2-B 의 helpers 가 거부. **multi-CLI + alias 의 canonical 결정은 explicit canonical field 도입 (future seam §11) 까지 unsupported**.

#### 4.3.3 dispatcher.ts 생성 변화

`PHASE_MAP` 가 multi-CLI 도 cover. 현재 catalog 에는 entry 없으므로 generated dispatcher.ts 의 byte 변화 없음. **앞으로 multi-CLI entry 추가 시 silent misroute 차단**.

---

## 5. PR sequencing

### 5.1 권고 순서

```
P2-A (largest)              P2-B               P2-C
↓                            ↓                  ↓
cli_dispatch + meta routing  aliases NORMALIZED multi-CLI computePhaseMap
+ default_for closure +      + schema 이전      + multi-cli build-time
prod-mode smoke              + canonical lookup   throw (alias 충돌)
```

P2-A 머지 후 P2-B / P2-C 는 **rebase-dependent follow-on** — main rebase 위에서 진입. **병렬 진입 가능**, 단 dispatcher schema_version 은 직렬 점유 (둘 다 dispatcher emit 변경, 한 PR 만 다음 version 차지). 머지 순서가 version 번호 결정.

### 5.2 sub-PR 별 변경 영역

| sub-PR | 변경 파일 | LOC 추정 |
|---|---|---|
| P2-A | dispatcher-deriver.ts (template — Contract A/B + meta routing), preboot-dispatch-deriver.ts (template — thin shim emit), **신규 `dispatch-preboot-core.ts` (hand-written, catalog-independent — Contract A/B/C 본체)**, **신규 `dispatch-preboot-core.test.ts` (bogus tables negative + sentinel leak prevention)**, 신규 `meta-handlers.ts`, command-catalog.ts (cli_dispatch.handler_export 갱신), `resolveHandlerModule` 신규 함수, 자동 regen 된 dispatcher.ts/preboot-dispatch.ts, 신규 `dispatcher-prod-smoke.test.ts` (via bin/onto), 신규 `scripts/check-handler-exports.ts` + `package.json:scripts` entry, CI gate (`.github/workflows/determinism-regression.yml` 확장 또는 신규 workflow), 신규/확장 test | **+650 ~ +850** |
| P2-B | command-catalog.ts (schema 이전: Common.aliases → PublicEntry.aliases — type 정의만), command-catalog-helpers.ts (NORMALIZED + DispatchTarget 의 canonical_cli_invocation + alias collision 확장 + multi-cli/slash-only invariant), dispatcher-deriver.ts (dispatch logic 의 canonical lookup), 자동 regen 된 dispatcher.ts, command-catalog-helpers.test.ts | +60 ~ +120 |
| P2-C | dispatcher-deriver.ts (computePhaseMap), 자동 regen 된 dispatcher.ts, dispatcher-deriver.test.ts | +30 ~ +60 |

### 5.3 각 sub-PR 의 머지 전 prerequisite

deriver template 변경이 emit-rule change 에 해당하므로 다음 5-step 필수:

1. `DERIVE_SCHEMA_VERSION` bump (per-sub-PR / per-target — §5.3.1 matrix).
2. `npm run generate:catalog -- --target=<ids>` regen.
3. `npm run check:catalog-drift` PASS (P1-4 CI 가드).
4. `npm run check:handler-exports` PASS (P2-A 도입 — handler_export canonical gate).
5. `dispatcher-smoke.test.ts` + `dispatcher-prod-smoke.test.ts` PASS (P2-A 의 prod smoke 포함).

**왜 schema_version bump 인가**: `computeTargetDeriveHash(targetId, catalog, schemaVersion)` 의 inputs 가 (targetId, catalog, schemaVersion) — catalog 가 같고 deriver template 만 바뀐 상태에서 schema_version 을 그대로 두면 hash 동일 → load-time hash guard 가 stale generated 를 detect 못 함. CI drift workflow 가 byte-compare 라 second line of defense 는 살아있지만, runtime guard 는 schema_version bump 가 first-line.

#### 5.3.1 Per-target schema_version bump matrix + serial re-bump rule

**Baseline (P1-4 머지 시점)**: dispatcher = 1, preboot-dispatch = 1.

**P2-A 머지 후 baseline**: dispatcher = 2, preboot-dispatch = 2 (둘 다 emit-rule 변경).

**P2-B 와 P2-C 의 dispatcher target bump — serial re-bump rule**:

P2-B 와 P2-C 는 **둘 다 dispatcher target 의 emit 변경**:
- P2-B: dispatcher dispatch logic 의 canonical lookup (§4.2.4)
- P2-C: dispatcher-deriver 의 computePhaseMap 의 multi-CLI iteration + collision throw

**병렬 진입 가능, 직렬 점유**. P2-A 머지 후 dispatcher = 2 base 위에서 둘 다 작업 시작 가능. 그러나 dispatcher version 3 은 한 PR 만 점유. 머지 순서:

| 시나리오 | P2-B 머지 시점 | P2-C 머지 시점 |
|---|---|---|
| **시나리오 A**: P2-B 가 P2-C 보다 먼저 머지 | dispatcher = 2 → 3 | (P2-B 머지 후 main rebase) dispatcher = 3 → 4 |
| **시나리오 B**: P2-C 가 P2-B 보다 먼저 머지 | (P2-C 머지 후 main rebase) dispatcher = 3 → 4 | dispatcher = 2 → 3 |

| sub-PR | dispatcher target | preboot-dispatch target | 이유 |
|---|---|---|---|
| P2-A | 1 → 2 | 1 → 2 | dispatcher: dispatchPreboot 호출 shape 변경. preboot-dispatch: PUBLIC/META_DISPATCH_TABLE emit + dynamic resolveHandlerModule call |
| P2-B | 2 → 3 (먼저 머지) OR 3 → 4 (P2-C 후 rebase) | unchanged | dispatcher: canonical lookup. preboot-dispatch: PUBLIC_DISPATCH_TABLE 변경 없음 (canonical key 만, P2-A 와 동일 emit) |
| P2-C | 2 → 3 (먼저 머지) OR 3 → 4 (P2-B 후 rebase) | unchanged | dispatcher: computePhaseMap 변경 — multi-CLI iteration + collision throw |

**핵심 룰**: P2-B 와 P2-C 가 둘 다 dispatcher emit 변경. **CI 가 second-arrival 의 stale schema_version 을 byte-mismatch 로 catch** — 머지 순서 강제. parallel 진입 시 second PR 은 머지 직전 rebase + schema_version bump 필요.

**Dev friction acknowledgment**: 각 sub-PR 머지 직전 + 작업 iteration 마다 위 5-step 강제. 매 commit 마다 regen 비용은 cost-of-correctness — RFC scope 외 mitigation (husky pre-commit, prepare hook 등) 은 별 follow-up.

---

## 6. Test 전략

### 6.1 P2-A 의 test surface — defense stack hierarchy

**Defense stack**:

| 층위 | 종류 | 위치 |
|---|---|---|
| **canonical gate (먼저 fail-close)** | build-time `scripts/check-handler-exports.ts` | `package.json:scripts` 에 `check:handler-exports` entry + CI gate (`determinism-regression.yml` 확장 또는 신규 `handler-exports-check.yml`) |
| **defense-in-depth Layer 1** | unit negative case (`dispatch-preboot-core.test.ts`) — `dispatchPrebootCore` 직접 호출 + bogus tables | non-authoritative test hook — §6.1.1 |
| **defense-in-depth Layer 2** | runtime `typeof handler !== "function"` guard | `dispatchPrebootCore` 안 (§4.1.2.2) |

**왜 hierarchical 인가** (UF-CONCISENESS-DEFENSE-MODELING): canonical gate 가 PR 머지 시점에 fail-close — main 에 land 안 됨. defense-in-depth Layer 1/2 는 canonical gate 누락 (CI 일시 비활성화 등) 시 secondary 차단. 3 가 **co-equal 이 아닌 정확한 우선순위**.

#### 6.1.1 smoke negative fixture mechanism — non-authoritative test hook (UF-DEPENDENCY-NEGATIVE-SMOKE-SEAT)

**Authority seat invariant (v6 — review session 20260427-a8029dd4 의 §4.1.2 ↔ §6.1.1 contradiction 해소)**:
- production seat = generated `preboot-dispatch.ts` (static emit, §4.1.2 그대로). thin shim — supplied static tables 와 함께 underlying catalog-independent function 호출.
- test seam = hand-written `src/core-runtime/cli/dispatch-preboot-core.ts` 의 `dispatchPrebootCore(routing, argv, metaTable, publicTable)`. **catalog-independent** — catalog 의존 없이 tables 를 parameter 로 받음. fully pure 는 아님 — `resolveHandlerModule()` 의 `ONTO_HOME` env 의존 (UF-DEPENDENCY-PURE-SEAM-ONTO-HOME). test 가 직접 import + bogus tables 주입 (test environment 에서 ONTO_HOME 설정 필요).

이 split 으로 (a) production path 는 static-emit single authority, (b) test path 는 catalog-independent unit-test 로 reproducible — review 의 "non-authoritative test hook" 권고 충족.

**Bogus fixture tables (test-only, no catalog)**:

```ts
// src/core-runtime/cli/dispatch-preboot-core.test.ts
import { dispatchPrebootCore, type MetaDispatchTable, type PublicDispatchTable } from "./dispatch-preboot-core.js";

const BOGUS_META_TABLE: MetaDispatchTable = {
  "help": {
    handler_module: "src/core-runtime/cli/meta-handlers.ts",
    handler_export: "doesNotExist",                          // ← 의도적 bogus
  },
};
const EMPTY_PUBLIC_TABLE: PublicDispatchTable = {};
```

**Smoke negative test (defense-in-depth Layer 1) — `dispatchPrebootCore` 직접 호출**:

```ts
it("bogus handler_export → fail-fast with clear stderr", async () => {
  const code = await dispatchPrebootCore(
    { meta_name: "help" },
    [],
    BOGUS_META_TABLE,
    EMPTY_PUBLIC_TABLE,
  );
  expect(code).toBe(1);
  expect(stderrCapture).toContain("is not a function");
});
```

**왜 non-authoritative test hook 인가**:

(a) production 호출 (`bin/onto`) 은 항상 generated preboot-dispatch.ts (static tables) 통과 → production authority 단일.
(b) test 가 dispatchPrebootCore 직접 import → test seam 은 production path 와 분리, 동등 logic 에 bogus tables 주입.
(c) catalog 변경이 generated 의 static tables 만 영향, core 함수 signature 는 stable.
(d) `bin/onto` smoke/prod path 는 fixture catalog 미관여 — production path 와 fixture catalog 는 별 axes.

**P2-A scope 에 추가 파일**:
- `src/core-runtime/cli/dispatch-preboot-core.ts` — hand-written catalog-independent function (BARE_ONTO_SENTINEL non-leak invariant 포함, §4.1.2.4)
- `src/core-runtime/cli/dispatch-preboot-core.test.ts` — bogus table fixtures + smoke negative + sentinel leak prevention test (§6.1.2)

#### 6.1.2 P2-A test surface 전체

| test 종류 | 목적 | 시점 |
|---|---|---|
| `preboot-dispatch-deriver.test.ts` 확장 | META_DISPATCH_TABLE / PUBLIC_DISPATCH_TABLE 의 emission 검증 | unit |
| `dispatcher-smoke.test.ts` 확장 | `bin/onto --help`, `--version`, bare-`onto`, `config`/`install`/`info` 의 exit + output 보존 (regression guard) | smoke (dev/tsx) |
| **신규 `dispatcher-prod-smoke.test.ts` — `bin/onto` 진입 경로** | `npm run build:ts-core && bin/onto --help` (bin/onto 가 ONTO_HOME 설정 후 dist 의 dispatcher 호출 — UF-DEPENDENCY-ONTO-HOME-SMOKE 반영). 직접 `node dist/dispatcher.js` 가 아닌 production 진입 path 검증 | smoke (prod, via bin/onto) |
| 신규 `meta-dispatch-routing.test.ts` | fixture catalog 에서 `cli_dispatch.handler_export` 변경 시 다른 handler 호출 | unit |
| **신규 `default-for-routing.test.ts`** (UF-COVERAGE-DEFAULT-FOR-GENERALITY) | fixture catalog 에서 `default_for: "bare_onto"` 를 `help` → `version` 으로 재배정 → bare-onto 입력 시 version handler (`onVersion`) 가 호출됨을 검증. P2-7 의 chosen meta identity 보존이 `help` 만의 우연이 아닌 일반 invariant 임을 증명 | unit |
| **신규 `preboot-handler-module-dev-prod.test.ts`** (UF-COVERAGE-PREBOOT-HANDLER-DEV-PROD) | preboot PublicEntry (예: `info`) 의 `handler_module` 을 cli.ts 가 아닌 dedicated-module fixture (예: `__fixtures__/info-handler.ts`) 로 변경 → dev (tsx) + prod (build dist 후 bin/onto 경유) 양쪽 path resolution 통과 검증. resolveHandlerModule 의 매핑 룰이 meta (§6.1.2 prod-smoke) 외 public-preboot 도 cover 함을 명시적 증명 | unit + smoke (dev/prod) |
| 신규 `dispatch-preboot-routing.test.ts` | `dispatchPreboot` 의 routing object discriminator + argv shape contract (`[invocation, ...argv]` for public, `argv` for meta) 검증 — silent-no-op 차단 | unit |
| 신규 `scripts/check-handler-exports.ts` + `package.json:scripts:check:handler-exports` + CI gate | **canonical gate** — handler_module fs 존재 + handler_export 함수 형 검증 | build (CI) |
| **신규 `dispatch-preboot-core.test.ts` — bogus tables negative** | **defense-in-depth Layer 1** — `dispatchPrebootCore` 직접 호출 + bogus `MetaDispatchTable` / `PublicDispatchTable` 주입 → bogus handler_export 시 명확한 stderr (§6.1.1). non-authoritative test hook | unit |
| **신규 `dispatch-preboot-core.test.ts` — sentinel leak prevention** (UF-STRUCTURE-SENTINEL-LEAK-CONTRACT) | Contract C (§4.1.2.4) 검증 — `dispatchPrebootCore` 의 argv 에 `BARE_ONTO_SENTINEL` 포함 시 throw. dispatcher 의 sentinel-strip invariant 가 미래 refactor 에서 깨지면 fail-fast 로 catch | unit |
| (existing in §4.1.2.2) `dispatchPrebootCore` typeof guard | **defense-in-depth Layer 2** — 첫 invocation 시 fail-fast | runtime |
| **신규 dev short-flag dispatch test (`-h` / `-v`)** (UF-COVERAGE-META-GAPS) | dispatcher-smoke 안 — `bin/onto -h` 가 help meta routing, `bin/onto -v` 가 version meta routing. long-flag (`--help`/`--version`) 만 cover 하던 v6 의 short-flag 누락 closure | smoke (dev) |
| **신규 prod-path short-flag dispatch test (`-h` / `-v`)** (UF-COVERAGE-PROD-SHORT-FLAG-PATH) | dispatcher-prod-smoke 안 — `npm run build:ts-core && bin/onto -h` + `bin/onto -v`. dev short-flag (위 row) + prod long-flag (아래 row) 만으로는 prod-path 의 short-flag resolution 이 cover 안 됨 — short-flag 가 dev tsx 에서 작동해도 prod dist 에서 silent fail 가능. 명시적 prod-path 검증 | smoke (prod, via bin/onto) |
| **신규 prod-path non-help meta dispatch test** (UF-COVERAGE-META-GAPS) | dispatcher-prod-smoke 안 — `bin/onto --version` 이 prod (build dist 후 bin/onto 경유) 에서 version handler 호출. v6 의 prod-smoke 가 `--help` 만 cover 하던 한계 closure — non-help meta 도 prod path resolution 통과 검증 | smoke (prod, via bin/onto) |
| **신규 bare-onto remap-to-version test** (UF-COVERAGE-META-GAPS) | default-for-routing.test.ts 의 확장 — `default_for: "bare_onto"` 가 `version` 으로 재배정된 fixture 에서 `bin/onto` (인자 없이) 호출 시 `onVersion` 가 호출됨을 prod-path 까지 검증. v6 의 default-for-routing 이 unit-only 였던 한계 — prod path 도 cover | unit + smoke (prod) |

### 6.2 P2-B 의 test surface

| test 종류 | 목적 |
|---|---|
| `command-catalog-helpers.test.ts` 확장 | NORMALIZED 가 alias key 포함, target 의 `canonical_cli_invocation` 정확. type-level invariant: slash target 에는 canonical_cli_invocation 미부여 |
| 신규 alias collision test | alias ↔ invocation, alias ↔ alias 충돌 모두 throw. PublicEntry-only invariant (slash-only / multi-cli alias → throw) |
| **`dispatcher-smoke.test.ts` 확장 — alias smoke phase split** (UF-COVERAGE-ALIAS-PHASE-SPLIT) | (a) **preboot alias case**: preboot PublicEntry (예: `info`) 에 alias 추가 fixture → `bin/onto <alias>` → preboot path → handler 호출 검증; (b) **post_boot alias case**: post_boot PublicEntry (예: `review`) 에 alias 추가 fixture → `bin/onto <alias>` → cli.ts main 의 canonical case 매치 검증. preboot 와 post_boot 의 canonical lookup 경로가 다르므로 둘 다 명시적 cover |

### 6.3 P2-C 의 test surface

| test 종류 | 목적 |
|---|---|
| `dispatcher-deriver.test.ts` 확장 | fixture catalog 에 한 entry 의 다수 CliRealization → 모든 invocation 이 PHASE_MAP 에 동일 phase 로 등록 |
| `computePhaseMap` collision throw test | 동일 invocation 다른 phase mapping (NORMALIZED 가 이미 검출하므로 unreachable in practice 이지만 defense-in-depth) |
| multi-CLI + alias build-time throw test | catalog fixture 에 multi-CLI PublicEntry + aliases → getNormalizedInvocationSet 가 명시적 throw (P2-B 의 §4.2.1 invariant 검증) |

---

## 7. Risks

(Open Questions 섹션은 제거됨 — UF-CONCISENESS-DUAL-CLOSURE-SEAT 닫음. 모든 design 결정은 §9 가 sole decision seat.)

### 7.1 P2-A 의 risk

| risk | 영향 | mitigation |
|---|---|---|
| `resolveHandlerModule` 의 dev↔prod 매핑 누락 / 잘못된 path | preboot-dispatch 가 prod 에서 fail | §4.1.2.3 의 normative pseudocode + 신규 `dispatcher-prod-smoke.test.ts` (via bin/onto, ONTO_HOME 검증) |
| handler_export 가 함수 타입 아닐 때 silent failure | catalog 등록 후 첫 invocation 시 발견 | **defense stack hierarchy** (§6.1): canonical gate (build-time `check:handler-exports` + CI) → smoke negative → runtime typeof guard. 3 층 모두 P2-A scope. validateCatalog 안 검증은 P1-3 dependency invariant 위반 → 채택 안 함 |
| ONTO_HOME 미설정 (예: 직접 `tsx dispatcher.ts` 실행) | dispatcher 가 throw + exit | 의도된 fail-fast — `bin/onto` 진입을 강제. dispatcher.ts 직접 실행은 unsupported |
| meta-handlers.ts decomposition 만 — full isolation 미달성 | preboot path 가 여전히 cli.ts module evaluation 비용 부담 | 의도된 boundary. ONTO_HELP_TEXT 의 cli.ts 외부 추출은 future seam (§11) — full isolation 의 prerequisite |
| argv shape ambiguity → silent no-op | `bin/onto config`/`install`/`info` 가 help 출력 후 exit 0 | §4.1.2.1 normative argv shape contract (Contract A) + 신규 `dispatch-preboot-routing.test.ts` |
| BARE_ONTO_SENTINEL 누출 | 미래 refactor 가 sentinel 을 handler argv 에 노출 → silent misroute | **Contract C (§4.1.2.4) — normative**: `dispatchPrebootCore` 진입에서 `argv.some(a => a === BARE_ONTO_SENTINEL)` 검증, throw. **명시적 test (§6.1.2 row)** — dispatch-preboot-core.test.ts 의 sentinel leak prevention case |
| 매 P2-A iteration 마다 regen 비용 | dev velocity 감소 | cost-of-correctness 로 prose. 별 follow-up: pre-commit hook (out-of-scope) |

### 7.2 P2-B 의 risk

| risk | 영향 | mitigation |
|---|---|---|
| alias collision with existing invocation (catalog 도입 시점) | catalog 검증 실패 | `assertNoAliasCollision` 확장 — alias ↔ 전체 invocation namespace cross-check |
| schema 이전 (Common → PublicEntry) 의 hidden usage | 현 0 usage 가정 위반 시 type error | tsc --noEmit 으로 확인 (build:ts-core PASS 강제). 0 usage 검증은 P2-B PR 의 자동 검사 |
| canonical_cli_invocation invariant 위반 (cli target 인데 missing) | runtime crash | type-level invariant — TypeScript 가 컴파일 시점에 강제. dispatcher.ts 의 access 자체가 type-safe |
| dispatcher-deriver 만 변경 → preboot-dispatch-deriver 의 unchanged 보장 | 누락 시 emit byte 변경 → catalog drift fail | P2-B PR 의 self-check: `npm run generate:catalog -- --target=preboot-dispatch` 후 byte 비교 PASS |

### 7.3 P2-C 의 risk

거의 없음 — 현재 catalog 에 multi-CLI 없으므로 byte 변화 없음. 미래 multi-CLI 도입 시 자동 cover. multi-CLI + alias 의 build-time throw 는 P2-B 가 invariant 보유.

---

## 8. P1 review 의 P2 항목 중 본 RFC 의 boundary

handoff §4 의 11 P2 architectural items 중:

| # | 항목 | 본 RFC 포함? |
|---|---|---|
| P2-1 | cli_dispatch dead schema (preboot 한정) | **포함** (P2-A) — preboot CLI publics 의 handler_module 활용. **post_boot per-entry handler diversification 은 future seam** (§11) |
| P2-2 | MetaEntry hardcoded preboot | **포함** (P2-A) |
| P2-3 | bare/default/meta hardcoded | **포함** (P2-A) |
| P2-4 | aliases dispatch projection | **포함** (P2-B) — schema 이전 + canonical lookup |
| P2-5 | multi-CLI realization phase | **포함** (P2-C). multi-CLI + alias 는 future seam 으로 분리 |
| P2-6 | repair_path runtime closure | **별 RFC** (RFC-2) |
| P2-7 | MetaEntry default_for 모델 | **포함** (P2-A 와 묶임) |
| P2-8 | --global flag help visibility | **별 RFC** (RFC-3) |
| P2-9 | learn/ask cli.ts branches | **별 RFC** (RFC-2) |
| P2-10 | RuntimeScriptEntry args contract | **별 RFC** (RFC-3) |
| P2-11 | dist + local-delegation smoke | **본 RFC light subset (P2-A scope, via bin/onto)** + RFC-3 본체 |

multi-agent review + onto review 가 surface 한 추가 RFC-2 후보 항목:
- `Common.removed_in` runtime enforcement 부재
- slash-only PublicEntry 의 `phase` 필드 decorative 화
- `PublicEntry.contract_ref` 파일 존재 검증 부재

---

## 9. 결정 사항 (sole decision seat)

| Q | 최종 채택 |
|---|---|
| Q1: PR sequencing P2-A → B → C | **확정** (rebase-dependent follow-on, dispatcher schema_version 직렬 점유 — §5.3.1) |
| Q2: meta dispatch 위치 (cli.ts named export vs dedicated module) | **`meta-handlers.ts` 분리** — 자세한 정의 + 달성/미달성 boundary 는 §4.1.3 (canonical seat). future isolation prerequisite 는 §11 |
| Q3: aliases boundary | **PublicEntry 전용 (schema 이전)** + slash-only / multi-cli + meta alias 모두 build-time throw. `-?` 같은 future case 는 새 short_flag realization 으로 |
| Q4: dynamic import path 검증 dev↔prod | **본 RFC P2-A scope 포함 (light subset — `dispatcher-prod-smoke.test.ts` via bin/onto)**. RFC-3 은 P2-11 본체 (matrix) 유지 |
| Q5: alias routing ownership seat | **canonical lookup only** — NORMALIZED 만 canonical_cli_invocation 보유, dispatcher 가 변환. PHASE_MAP / PUBLIC_DISPATCH_TABLE 알리아스 미등록 (§4.2.3, §4.2.4) |
| Q6: RFC-2, RFC-3 stub 마련 시점 | **사용자 결정** — 본 RFC 머지 후 RFC-2, RFC-3 stub 작성 진입 (병렬 OR 순차) |

---

## 10. 다음 단계

본 RFC 검토 완료 후:

1. (옵션) 추가 onto review iteration — idempotent 도달 확인
2. (옵션) Q6 결정 — RFC-2 / RFC-3 stub 동시 마련 여부
3. doc-only commit + (옵션) PR 머지 (RFC = 결정된 design authority)
4. P2-A 구현 branch 생성 (`p2-a-cli-dispatch-meta-routing` 등)
5. P2-A 머지 → P2-B 와 P2-C 진입 (병렬 진입 가능, 머지 순서가 dispatcher schema_version 결정)

---

## 11. Future seams (post-RFC scope)

본 RFC 의 closure boundary 밖 — 별 follow-up RFC 또는 P2 후속 작업으로 분리.

| seam | 트리거 | 영향 |
|---|---|---|
| **post_boot per-entry handler diversification** | post_boot PublicEntry 의 handler_module 이 cli.ts 가 아닌 dedicated 모듈로 분기 (예: `review` → `src/core-runtime/cli/review-handler.ts`) | dispatcher 가 cli.ts main 위임 대신 catalog handler_module 을 직접 dynamic import — 본 RFC P2-A 가 preboot 만 cover |
| **ONTO_HELP_TEXT 의 cli.ts 외부 추출** | cli-help-deriver 의 emission_path 를 `src/cli.ts` segment 에서 dedicated module (예: `src/core-runtime/cli/onto-help-text.ts`) 로 변경 | meta-handlers.ts 가 cli.ts 미로드 — full preboot authority isolation 달성. cli.ts 의 dual authority case 본문도 같은 module import 으로 일원화 가능 |
| **cli.ts dual authority 일원화** | cli.ts main switch 의 `--help`/`--version`/`bare-onto` case 본문이 meta-handlers.ts 호출로 단일화 OR cli.ts 직접 실행 deprecation | meta-handlers.ts 와 cli.ts 의 동일 동작 중복 해소 — full isolation. 위 ONTO_HELP_TEXT 추출이 prerequisite |
| **multi-cli entry 의 명시적 canonical** | 다수 CliRealization 보유 entry 가 alias 도 가질 때 — "first realization = canonical" array 순서 의존 회피 | catalog schema 에 `canonical_cli_invocation` field 추가 또는 별 realization-level 마커. P2-B 의 build-time throw 가 해제됨 |
| **handler_module future location rule** (UF-EVOLUTION-HANDLER-PATH-LAYOUT) | handler_module 이 `src/` 외부 (예: `node_modules/<plugin>/handler.ts`) 또는 다른 prefix | resolveHandlerModule 의 매핑 룰을 catalog schema 에서 explicit |
| **handler_export ↔ argv ABI 분리** (UF-EVOLUTION-HANDLER-EXPORT-ABI-COUPLING) | preboot handler 형이 단일 `(argv) => Promise<number>` 외 다른 ABI 도입 (예: `(argv, ctx) => Promise<R>`, structured args 등) | 현재는 `handler_export === undefined ? mod.main : mod[handler_export]` 가 implicit ABI selector. 명시적 ABI 필드 (`cli_dispatch.handler_abi: "main_argv_v1"` 등) 도입 — argv shape contract (Contract A) 와 export discovery contract (Contract B) 를 ABI contract 와 명시적 분리 |
| **schema-runtime invariant 일반화** | `Common.aliases` 외에 다른 entry-kind-specific field 의 schema seat alignment | validateCatalog 의 invariant 가 schema seat 와 entry kind 의 match 강제 |
| **deprecated entry 의 runtime enforcement** | `removed_in` 도달 entry 호출 시 거부 | RFC-2 (declared-but-unimplemented closure) 와 합류 |
