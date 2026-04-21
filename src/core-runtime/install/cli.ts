/**
 * `onto install` orchestrator — ties together pre-flight detection,
 * interactive prompts, and the file writer.
 *
 * # Scope as of PR 2
 *
 * Interactive path only. The `--non-interactive` flag is parsed but
 * exits early with a deferral message; full flag-driven orchestration
 * lands in PR 4 alongside its E2E test matrix. Live provider ping
 * (validation) lands in PR 3.
 *
 * # High-level sequence
 *
 *   1. Parse flags from argv. `--help` / `-h` short-circuits.
 *   2. Resolve project root (for potential project-scope writes).
 *   3. Run pre-flight detection against the current env + filesystem.
 *   4. If an existing config is detected and `--reconfigure` / `--force`
 *      isn't set, halt with instructions pointing at
 *      `--reconfigure` or `onto config edit`.
 *   5. Open a readline-backed PromptIO and run the 6-step interactive
 *      flow, capturing `{ decisions, secrets }`.
 *   6. Resolve the on-disk target paths from the chosen profile scope.
 *   7. Atomic-write config.yml + .env + .env.example via writer.ts.
 *   8. For project scope, ensure `.onto/.env` is in `.gitignore`.
 *   9. Print a completion summary with clear next-step pointers
 *      (`onto onboard`, `onto help`, `onto config edit`).
 */

import { resolveProjectRoot } from "../discovery/project-root.js";
import {
  formatPreflightSummary,
  runPreflight,
} from "./detect.js";
import { ensureGitignoreEntry } from "./gitignore-update.js";
import {
  createReadlineIo,
  runInteractivePrompts,
} from "./prompts.js";
import {
  resolveInstallPaths,
  writeInstallFiles,
  type WriteResult,
} from "./writer.js";
import type {
  InstallFlags,
  LearnProvider,
  ProfileScope,
  ReviewProvider,
} from "./types.js";

// ---------------------------------------------------------------------------
// Flag parsing
// ---------------------------------------------------------------------------

const REVIEW_PROVIDER_VALUES: readonly ReviewProvider[] = [
  "main-native",
  "codex",
  "anthropic",
  "openai",
  "litellm",
];

const LEARN_PROVIDER_VALUES: readonly (LearnProvider | "same")[] = [
  "same",
  "codex",
  "anthropic",
  "openai",
  "litellm",
];

function readFlagValue(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(`--${name}`);
  if (idx < 0 || idx + 1 >= argv.length) return undefined;
  const value = argv[idx + 1];
  if (typeof value !== "string" || value.startsWith("--")) return undefined;
  return value;
}

export function parseInstallFlags(argv: string[]): InstallFlags {
  const flags: InstallFlags = {
    nonInteractive: argv.includes("--non-interactive"),
    reconfigure: argv.includes("--reconfigure") || argv.includes("--force"),
    skipValidation: argv.includes("--skip-validation"),
    dryRun: argv.includes("--dry-run"),
  };

  const profileScope = readFlagValue(argv, "profile-scope");
  if (profileScope === "global" || profileScope === "project") {
    flags.profileScope = profileScope as ProfileScope;
  }

  const reviewProvider = readFlagValue(argv, "review-provider");
  if (
    reviewProvider &&
    (REVIEW_PROVIDER_VALUES as readonly string[]).includes(reviewProvider)
  ) {
    flags.reviewProvider = reviewProvider as ReviewProvider;
  }

  const learnProvider = readFlagValue(argv, "learn-provider");
  if (
    learnProvider &&
    (LEARN_PROVIDER_VALUES as readonly string[]).includes(learnProvider)
  ) {
    flags.learnProvider = learnProvider as LearnProvider | "same";
  }

  const outputLanguage = readFlagValue(argv, "output-language");
  if (outputLanguage === "ko" || outputLanguage === "en") {
    flags.outputLanguage = outputLanguage;
  }

  const litellmBaseUrl = readFlagValue(argv, "litellm-base-url");
  if (litellmBaseUrl) flags.litellmBaseUrl = litellmBaseUrl;

  const envFile = readFlagValue(argv, "env-file");
  if (envFile) flags.envFile = envFile;

  return flags;
}

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

function printHelp(): void {
  console.log(
    [
      "Usage: onto install [options]",
      "",
      "First-run setup wizard for onto. Writes config.yml + .env +",
      ".env.example to ~/.onto/ (global) or <repo>/.onto/ (project).",
      "",
      "Options:",
      "  --profile-scope <global|project>     Where to write config.",
      "  --review-provider <provider>         main-native | codex | anthropic | openai | litellm",
      "  --learn-provider <provider>          same | codex | anthropic | openai | litellm",
      "  --output-language <ko|en>            Principal-facing render language.",
      "  --litellm-base-url <url>             LiteLLM endpoint (for litellm provider).",
      "  --env-file <path>                    Where .env lives (default derived from scope).",
      "  --reconfigure, --force               Allow overwriting existing config.",
      "  --skip-validation                    Skip live provider ping (PR 3 scope).",
      "  --dry-run                            Compute changes without writing.",
      "  --non-interactive                    No prompts — scheduled for PR 4.",
      "  --help, -h                           Show this help.",
      "",
      "Next steps after install:",
      "  onto onboard           Initialize project-specific domains and review axes.",
      "  onto help              List all commands.",
      "  onto config edit       Adjust models and advanced fields.",
    ].join("\n"),
  );
}

// ---------------------------------------------------------------------------
// Completion summary
// ---------------------------------------------------------------------------

function printCompletion(
  result: WriteResult,
  gitignoreResult: ReturnType<typeof ensureGitignoreEntry> | undefined,
  dryRun: boolean,
): void {
  const header = dryRun ? "설치 미리보기 완료 (--dry-run)" : "설치 완료";
  process.stdout.write(`\n${header}\n\n`);
  process.stdout.write(`  config.yml     → ${result.writtenTo.configYml}\n`);
  process.stdout.write(`  .env           → ${result.writtenTo.env}\n`);
  process.stdout.write(
    `  .env.example   → ${result.writtenTo.envExample}\n`,
  );
  if (gitignoreResult) {
    if (gitignoreResult.created) {
      process.stdout.write(
        "  .gitignore     → (생성) .onto/.env 추가됨\n",
      );
    } else if (!gitignoreResult.alreadyPresent) {
      process.stdout.write("  .gitignore     → .onto/.env 추가됨\n");
    } else {
      process.stdout.write(
        "  .gitignore     → .onto/.env 이미 등록됨\n",
      );
    }
  }
  process.stdout.write("\n다음 단계:\n");
  process.stdout.write("  onto onboard           # 프로젝트 도메인/축 초기화\n");
  process.stdout.write("  onto help              # 전체 명령 확인\n");
  process.stdout.write(
    "  onto config edit       # 모델 등 세부 조정\n\n",
  );
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export async function handleInstallCli(
  _ontoHome: string,
  argv: string[],
): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return 0;
  }

  const flags = parseInstallFlags(argv);

  if (flags.nonInteractive) {
    process.stderr.write(
      "[onto] install: --non-interactive는 PR 4에서 지원 예정입니다.\n",
    );
    return 1;
  }

  const projectRoot = resolveProjectRoot();
  const detection = runPreflight(projectRoot);

  if (
    (detection.existingGlobalConfig || detection.existingProjectConfig) &&
    !flags.reconfigure
  ) {
    process.stderr.write(
      [
        "[onto] 기존 config가 감지되어 install을 중단합니다.",
        "",
        formatPreflightSummary(detection),
        "",
        "  덮어쓰려면 `--reconfigure` 를 추가해 다시 실행하세요.",
        "  일부 필드만 편집하려면 `onto config edit` 을 사용하세요.",
        "",
      ].join("\n"),
    );
    return 1;
  }

  const io = createReadlineIo();
  try {
    process.stdout.write("\nonto install — 첫 실행 설정 마법사\n\n");
    process.stdout.write(formatPreflightSummary(detection));
    process.stdout.write("\n\n");

    const { decisions, secrets } = await runInteractivePrompts({
      io,
      flags,
      detection,
    });

    const paths = resolveInstallPaths(decisions.profileScope, projectRoot);
    const result = writeInstallFiles({
      paths,
      decisions,
      secrets,
      dryRun: flags.dryRun,
    });

    let gitignoreResult: ReturnType<typeof ensureGitignoreEntry> | undefined;
    if (paths.gitignorePath) {
      gitignoreResult = ensureGitignoreEntry(paths.gitignorePath, {
        dryRun: flags.dryRun,
      });
    }

    printCompletion(result, gitignoreResult, flags.dryRun);
    return 0;
  } catch (error) {
    process.stderr.write(
      `[onto] install failed: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    );
    return 1;
  } finally {
    io.close();
  }
}
