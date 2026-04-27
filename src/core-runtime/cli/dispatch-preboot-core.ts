/**
 * Preboot dispatch core — hand-written catalog-independent function (P2-A).
 *
 * Authority seat (RFC-1 §4.1.2):
 *   - **Production seat (single authority)**: generated `preboot-dispatch.ts`
 *     thin shim — supplies the catalog-derived static `META_DISPATCH_TABLE` /
 *     `PUBLIC_DISPATCH_TABLE` and forwards to `dispatchPrebootCore`.
 *   - **Underlying logic seat (this file)**: `dispatchPrebootCore` is
 *     hand-written and **catalog-independent** — accepts the dispatch tables
 *     as parameters. test seam imports this directly with bogus tables
 *     (non-authoritative test hook). environment 의존은 `resolveHandlerModule`
 *     의 `ONTO_HOME` 만 — fully pure 는 아님.
 *
 * Contracts (RFC-1 §4.1.2.1 ~ §4.1.2.4):
 *   - Contract A — Routing argv shape: `routing` discriminator 가 argv shape 결정.
 *     `public_invocation` 경로는 `[invocation, ...argv]` 으로 invocation 을
 *     prepend 하여 cli.ts:main 의 argv[0] switch 와 호환. `meta_name` 경로는
 *     argv tail 만 (invocation 은 routing 객체로 식별).
 *   - Contract B — handler_export discovery: `metaTable` / `publicTable` 에서
 *     dispatch entry lookup → `resolveHandlerModule` + dynamic `import()` →
 *     named export (`mod[handler_export]`) 또는 default `mod.main`. typeof
 *     guard 가 fail-fast (defense-in-depth Layer 2; canonical gate 는 build-time
 *     `check:handler-exports`).
 *   - Contract C — BARE_ONTO_SENTINEL non-leak: dispatcher 가 sentinel 을 strip
 *     한 뒤에만 본 함수 도달. argv 에 sentinel 포함 시 throw — 미래 refactor
 *     가 sentinel 을 leak 시키면 fail-fast.
 *
 * dev↔prod path resolution (RFC-1 §4.1.2.3):
 *   catalog 의 `handler_module` 은 installation-internal path (예: `"src/cli.ts"`).
 *   - dev (tsx): path 그대로 import (tsx 가 .ts resolve)
 *   - prod (dist/): `src/`→`dist/` + `.tsx?`→`.js` 매핑 후 import
 *   `import.meta.url` 의 `/dist/` substring 으로 dev/prod 판별.
 */

import { pathToFileURL } from "node:url";
import path from "node:path";

// ---------------------------------------------------------------------------
// Types — exported so generated preboot-dispatch.ts (thin shim) imports them.
// ---------------------------------------------------------------------------

/** Routing discriminator (RFC-1 §4.1.2.1 Contract A). */
export type PrebootRouting =
  | { meta_name: string }
  | { public_invocation: string };

/** Single dispatch entry (mirrors `cli_dispatch` in catalog schema). */
export type DispatchEntry = {
  handler_module: string;
  handler_export?: string;
};

/** Static dispatch tables — generated thin shim emits these from catalog. */
export type MetaDispatchTable = Readonly<Record<string, DispatchEntry>>;
export type PublicDispatchTable = Readonly<Record<string, DispatchEntry>>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BARE_ONTO_SENTINEL = "<<bare>>" as const;

// ---------------------------------------------------------------------------
// resolveHandlerModule — installationRoot 매핑 (Contract B 의 일부)
// ---------------------------------------------------------------------------

/**
 * Resolve a catalog `handler_module` path to a `file://` URL ready for
 * dynamic `import()`. Exported so `check-handler-exports.ts` (build-time
 * canonical gate) can reuse the same mapping.
 *
 * `ONTO_HOME` env semantic: **installation root** (onto-core 가 설치된
 * directory). `bin/onto` entry script 가 항상 set. unset 이면 throw —
 * dispatcher.ts 직접 실행 path 가 production 에 존재 안 함.
 */
export function resolveHandlerModule(catalogPath: string): string {
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

// ---------------------------------------------------------------------------
// dispatchPrebootCore — Contracts A + B + C
// ---------------------------------------------------------------------------

/**
 * Pure-ish dispatch logic for preboot routing. Accepts dispatch tables as
 * parameters (catalog-independent). Generated `preboot-dispatch.ts` thin shim
 * supplies static tables baked from the catalog at emit time. Tests inject
 * bogus tables directly (non-authoritative test hook).
 *
 * Returns the handler's exit code (0 for success, non-zero for failure).
 * Internal contract violations (Contract C) throw rather than return — those
 * are programmer errors, not user-facing failures.
 */
export async function dispatchPrebootCore(
  routing: PrebootRouting,
  argv: readonly string[],
  metaTable: MetaDispatchTable,
  publicTable: PublicDispatchTable,
): Promise<number> {
  // Contract C — BARE_ONTO_SENTINEL non-leak invariant.
  // dispatcher 가 sentinel 을 invocation 으로 인식하고 strip 한 뒤 본 함수에
  // 도달하므로, argv 에 sentinel 이 다시 들어오는 일은 없어야 한다.
  if (argv.some((a) => a === BARE_ONTO_SENTINEL)) {
    throw new Error(
      "[onto] dispatchPrebootCore: BARE_ONTO_SENTINEL leaked into argv — dispatcher invariant 위반.",
    );
  }

  // Contract B — handler discovery.
  const dispatch =
    "meta_name" in routing
      ? metaTable[routing.meta_name]
      : publicTable[routing.public_invocation];
  if (dispatch === undefined) {
    process.stderr.write(
      `[onto] dispatchPrebootCore: no handler for ${JSON.stringify(routing)}.\n`,
    );
    return 1;
  }

  const moduleSpecifier = resolveHandlerModule(dispatch.handler_module);
  const mod = (await import(/* @vite-ignore */ moduleSpecifier)) as Record<
    string,
    unknown
  >;
  const exportName = dispatch.handler_export ?? "main";
  const handler = mod[exportName];
  if (typeof handler !== "function") {
    process.stderr.write(
      `[onto] dispatchPrebootCore: handler ${dispatch.handler_module}` +
        `#${exportName} is not a function.\n`,
    );
    return 1;
  }

  // Contract A — argv shape.
  // public_invocation 경로: cli.ts:main 의 argv[0] switch 와 호환하도록
  // invocation 을 prepend. meta_name 경로: routing 객체로 invocation 식별,
  // tail argv 만 forward (bare meta 호출 시 empty, 추가 flag 시 flag list).
  const argvForHandler =
    "public_invocation" in routing
      ? [routing.public_invocation, ...argv]
      : argv;

  return (await (handler as (a: readonly string[]) => Promise<number>)(
    argvForHandler,
  )) as number;
}
