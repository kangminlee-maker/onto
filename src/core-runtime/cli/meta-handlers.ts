/**
 * Meta dispatch handlers — `--help` / `--version` 의 named export 거주 (P2-A).
 *
 * Authority context (RFC-1 §4.1.3):
 *   - catalog 의 `help` / `version` MetaEntry 의 `cli_dispatch.handler_module`
 *     이 본 파일을 가리킴 (handler_export = "onHelp" / "onVersion").
 *   - generated preboot-dispatch.ts 의 thin shim 이 `dispatchPrebootCore` 를
 *     통해 본 함수들을 dynamic import + 호출.
 *
 * 달성하는 것 — decomposition:
 *   - meta handler 의 함수 본문이 cli.ts 의 main switch 가 아닌 dedicated
 *     module 에 거주.
 *   - catalog 의 schema 적 명확한 separation: handler_module 이 cli.ts 가 아닌
 *     meta-handlers.ts 를 가리킴.
 *
 * 달성하지 못하는 것 — full preboot authority isolation 은 future seam:
 *   - 본 RFC scope 에서는 `ONTO_HELP_TEXT` 가 cli.ts segment 그대로 — 본
 *     함수는 cli.ts 를 dynamic import 하므로 cli.ts module evaluation 비용
 *     은 여전히 발생.
 *   - Full isolation 의 prerequisite: ONTO_HELP_TEXT 의 cli.ts 외부 dedicated
 *     module 추출 (cli-help-deriver 의 emission_path 변경) — 별 follow-up RFC.
 *
 * argv contract (Contract A — RFC-1 §4.1.2.1):
 *   - bare meta 호출 (`bin/onto --help`, `-v`) 시 argv = `[]` (empty after slice)
 *   - 추가 flag 가 있으면 (`bin/onto --help --global`) argv = `["--global"]`
 *   - bare-onto / default_for routing 도 incoming argv 가 이미 empty.
 *   즉 named export 는 항상 invocation 이 빠진 tail — empty 또는 flag list.
 */

/**
 * Help meta dispatch — prints catalog-derived help text and exits 0.
 * argv 는 사용 안 함 (현재 RFC scope) — extra flag 는 향후 확장.
 */
export async function onHelp(_argv: readonly string[]): Promise<number> {
  // ONTO_HELP_TEXT 의 cli.ts 외부 추출은 future seam (§11) — 본 RFC 에서는
  // cli.ts 의 const 그대로 access. dynamic import 로 cli.ts module evaluation
  // 발생하지만 production seat 의 single authority 는 유지.
  const { ONTO_HELP_TEXT } = await import("../../cli.js");
  console.log(ONTO_HELP_TEXT);
  return 0;
}

/**
 * Version meta dispatch — prints `onto-core <version>` and exits 0.
 */
export async function onVersion(_argv: readonly string[]): Promise<number> {
  const { readOntoVersion } = await import(
    "../release-channel/release-channel.js"
  );
  const version = await readOntoVersion();
  console.log(`onto-core ${version}`);
  return 0;
}
