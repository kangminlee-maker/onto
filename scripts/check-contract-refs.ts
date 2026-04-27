/**
 * R2-PR-4 (RFC-2 §4.5.6): standalone CI gate for contract_ref existence.
 *
 * Shared validator owner (`assertContractRefsExist` in command-catalog-helpers)
 * 가 invariant 보유 — 본 script 는 production fs 를 주입하는 invocation path 일 뿐.
 * vitest test (command-catalog.test.ts) 가 mock fsAccessor 로 같은 invariant 호출.
 *
 * Trigger paths (RFC-2 §4.5.3 — 7-path SSOT):
 *   - src/core-runtime/cli/command-catalog.ts (catalog SSOT)
 *   - src/core-runtime/cli/command-catalog-helpers.ts (validator owner)
 *   - src/core-runtime/cli/command-catalog.test.ts (vitest invocation)
 *   - scripts/check-contract-refs.ts (this script)
 *   - package.json (script 정의)
 *   - .onto/processes/** (contract_ref target)
 *   - .github/workflows/determinism-regression.yml (workflow self-trigger)
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { COMMAND_CATALOG } from "../src/core-runtime/cli/command-catalog.js";
import { assertContractRefsExist } from "../src/core-runtime/cli/command-catalog-helpers.js";

function main(): number {
  const projectRoot = process.cwd();
  let count = 0;
  for (const entry of COMMAND_CATALOG.entries) {
    if (entry.kind === "public" && entry.contract_ref !== undefined) count++;
  }
  try {
    assertContractRefsExist(COMMAND_CATALOG, (relPath) =>
      existsSync(resolve(projectRoot, relPath)),
    );
    console.log(`[check-contract-refs] all ${count} contract_ref(s) verified.`);
    return 0;
  } catch (e) {
    console.error(
      `[check-contract-refs] ${e instanceof Error ? e.message : String(e)}`,
    );
    return 1;
  }
}

process.exit(main());
