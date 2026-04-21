/**
 * `onto install` entry point — orchestrates the first-run setup flow.
 *
 * Scope as of PR 2 (this commit series): scaffolding only. The handler
 * returns a "not yet implemented" error until subsequent commits wire
 * in pre-flight detection, interactive prompts, and the file writer.
 *
 * Once complete, this module will:
 *
 *   1. Parse argv/env into `InstallFlags` (types.ts).
 *   2. Run pre-flight detection (detect.ts).
 *   3. Resolve decisions via prompts (prompts.ts) or flags directly.
 *   4. Write config.yml + .env + .env.example atomically (writer.ts).
 *   5. Update project-scope .gitignore (gitignore-update.ts).
 *   6. Print a completion summary pointing at `onto onboard`.
 *
 * Validation (live provider ping) is deferred to PR 3. Non-interactive
 * flag parsing is also complete in this PR but the full flow test
 * matrix lands in PR 4.
 */

export async function handleInstallCli(
  _ontoHome: string,
  _argv: string[],
): Promise<number> {
  console.error(
    [
      "[onto] install: implementation in progress (PR 2 scaffolding).",
      "Subsequent commits on feat/install-command-core will wire in",
      "detection, prompts, and the file writer.",
    ].join("\n"),
  );
  return 1;
}
