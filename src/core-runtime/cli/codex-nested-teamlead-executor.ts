/**
 * Codex Nested Teamlead Executor — PR-C (2026-04-18).
 *
 * # What this module is
 *
 * Realizes the topology `codex-nested-subprocess` (sketch v3 §3.1, option
 * codex-A): a single outer `codex exec` subprocess is spawned by the onto
 * TS main as the **teamlead**, and that outer codex itself invokes
 * `codex exec` via shell for each lens packet — one nested codex per
 * lens. The entire lens execution stack therefore runs inside codex
 * space; onto TS only bootstraps the outer codex and parses the
 * consolidated result report.
 *
 * # Why it exists
 *
 * The existing `codex-review-unit-executor.ts` spawns one codex per lens
 * from the TS process (topology `cc-main-codex-subprocess` or
 * `codex-main-subprocess`). The nested variant delegates the per-lens
 * scheduling decisions to an outer codex teamlead — letting the codex
 * model reason about ordering / dependency / retry using its own
 * context, rather than TS-level concurrency primitives alone.
 *
 * Sketch v3 §9 recorded the live validation (2026-04-18, codex
 * v0.120.0): outer+inner session ids are independent, both exit 0,
 * responses pass through. Preconditions confirmed:
 *   - `codex` binary on PATH
 *   - `~/.codex/auth.json` valid
 *   - non-seatbelt sandbox (outer invoked with `--sandbox danger-full-access`
 *     so it can shell out to nested `codex exec`)
 *
 * # How it relates
 *
 * - `resolveExecutionTopology()` selects `codex-nested-subprocess` when
 *   priority lands on codex-A and only `codexAvailable` is satisfied.
 * - `mapTopologyToExecutorConfig()` (PR-B) does NOT map this topology
 *   to a standalone binary — `codex-nested-subprocess` needs this
 *   orchestrator specifically, not a per-lens executor path, because
 *   the per-lens dispatch happens INSIDE the outer codex, not from TS.
 * - `executeReviewPromptExecution()` (run-review-prompt-execution.ts)
 *   will branch on `topology.id === "codex-nested-subprocess"` in PR-E
 *   (or earlier if needed) to route here.
 *
 * # Scope of PR-C
 *
 * This PR provides the **orchestrator seat** and its unit tests.
 * Integration into `executeReviewPromptExecution` (replacing the per-lens
 * loop with one outer-codex invocation for the nested topology) is
 * reserved for PR-E's cleanup when `resolveExecutorConfig` is removed.
 * PR-C deliverables:
 *   - `runCodexNestedTeamlead(args)` function
 *   - Prompt template building
 *   - Outer codex stdout parser
 *   - Error classification (outer failure vs inner-lens failure vs
 *     parse failure)
 *   - Sandbox setup documentation (docs/codex-nested-topology-sandbox.md)
 *
 * # Design reference
 *
 * - Sketch v3 §3.1 codex-A, §9 실측 검증
 * - Handoff §5: development-records/plan/20260418-sketch-v3-implementation-handoff.md
 */

import { spawn } from "node:child_process";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface NestedLensDispatchInput {
  /** Stable lens identifier (e.g. "logic", "pragmatics"). */
  lens_id: string;
  /** Path on disk where the lens packet (prompt input) is stored. */
  packet_path: string;
  /** Path on disk where the lens output should be written. */
  output_path: string;
}

export interface NestedLensDispatchOutcome {
  lens_id: string;
  status: "ok" | "fail";
  /** Populated when status === "fail". */
  error?: string;
}

export interface CodexNestedTeamleadInput {
  /** Lens packets to dispatch, in priority order. */
  lenses: NestedLensDispatchInput[];
  /** Codex model id to pass to inner `codex exec -m`. Empty → codex default. */
  model?: string;
  /**
   * `model_reasoning_effort` value for inner codex invocations
   * (medium | high | xhigh | low). When unset, codex picks its default.
   */
  reasoning_effort?: string;
  /**
   * Project root for the outer codex's cwd. Defaults to `process.cwd()`.
   * Inner codex invocations inherit the outer's cwd; pass an explicit
   * value here to make behaviour independent of the TS process's cwd.
   */
  project_root?: string;
  /**
   * Codex binary path. Defaults to `"codex"` (resolved via PATH). Override
   * for tests (mock executable) or non-standard installations.
   */
  codex_bin?: string;
  /**
   * Per-invocation timeout for the outer codex (ms). The outer process
   * is killed if it exceeds this; the lens outcomes for any incomplete
   * lens are recorded as `fail` with a timeout reason.
   * Defaults to 600_000 (10 minutes) — codex nested stack can be slow.
   */
  timeout_ms?: number;
}

export interface CodexNestedTeamleadResult {
  /** Per-lens outcomes in the same order as `input.lenses`. */
  outcomes: NestedLensDispatchOutcome[];
  /**
   * Raw stdout from the outer codex (for debugging / artifact capture).
   * Intentionally a string — consumers that care about line structure
   * can split as needed.
   */
  outer_stdout: string;
  /** Raw stderr from the outer codex. */
  outer_stderr: string;
  /**
   * Outer codex exit code. `0` for clean completion; non-zero signals
   * outer teamlead failure (distinct from inner-lens failure).
   */
  outer_exit_code: number;
  /**
   * True when the outer codex returned a parse-able final JSON summary.
   * When false, all lens outcomes are `fail` with a parse-failure reason.
   */
  summary_parsed: boolean;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class CodexNestedTeamleadError extends Error {
  constructor(
    message: string,
    public readonly outer_exit_code: number,
    public readonly outer_stderr: string,
  ) {
    super(message);
    this.name = "CodexNestedTeamleadError";
  }
}

// ---------------------------------------------------------------------------
// Prompt template
// ---------------------------------------------------------------------------

const SUMMARY_SENTINEL_PREFIX = "LENS_DISPATCH_SUMMARY:";

/**
 * Build the meta-orchestration prompt the outer codex receives on stdin.
 *
 * Key protocol elements:
 *   1. Declared task (nested dispatch of N lens reviews).
 *   2. Per-lens triple (lens_id, packet_path, output_path).
 *   3. Explicit shell commands the outer codex must execute.
 *   4. Required final stdout line: `LENS_DISPATCH_SUMMARY:{json}` so the
 *      TS parser can find the summary regardless of other stdout noise.
 *
 * The sentinel prefix is load-bearing: codex exec stdout mixes model
 * commentary with any direct printf output, so the parser anchors on
 * the prefix rather than trying to extract "the last line".
 */
export function buildNestedTeamleadPrompt(input: CodexNestedTeamleadInput): string {
  const script = buildNestedDispatchScript(input);
  const modelDiag = input.model ?? "(codex default)";
  const effortDiag = input.reasoning_effort ?? "(codex default)";

  // The prompt deliberately minimizes descriptive instructions. Outer codex's
  // job is to run a literal bash script — not to reason about dispatch
  // strategy. Descriptive prompts ("invoke nested codex for each lens...")
  // led outer to treat the task as a lens-execution assignment and use its
  // own file-edit tools instead of spawning `codex exec` subprocesses. By
  // handing outer a literal script with a single action ("pipe to bash"),
  // the interpretation freedom that caused the earlier 10-minute stall is
  // removed.
  return [
    `Nested-codex dispatch for ${input.lenses.length} lenses ` +
      `(model=${modelDiag}, effort=${effortDiag}).`,
    "",
    "Action: Execute the bash script below by piping it to `bash -s`.",
    "Do not modify it, do not substitute variables, do not use file-edit",
    "tools. After the script finishes, surface its stdout verbatim — the",
    `final line (starting with "${SUMMARY_SENTINEL_PREFIX}") is consumed by`,
    "the parent TS process and must not be elided or reformatted.",
    "",
    "```bash",
    script,
    "```",
  ].join("\n");
}

/**
 * Build the literal bash script that the outer codex is asked to pipe to
 * `bash -s`. Every value (lens id, packet path, output path, model, effort)
 * is interpolated at build time — the outer model does not perform any
 * substitution. This deterministic construction is the contract that keeps
 * outer's behaviour faithful to the requested action.
 *
 * Structure:
 *   1. bash array `LENSES` with `lens_id|packet_path|output_path` entries
 *   2. per-lens background subshell that runs `codex exec` with the packet
 *      on stdin and `-o <OUTPUT_PATH>` for the last-message file, writing
 *      stderr and the ENV-BEFORE/AFTER diagnostic lines to a per-lens log
 *   3. `wait` for all lenses
 *   4. replay each lens's log → stdout (so outer's captured stdout carries
 *      the diagnostic trace even though background subshells wrote them
 *      to per-lens log files)
 *   5. emit the LENS_DISPATCH_SUMMARY:{...} sentinel with per-lens status
 */
function buildNestedDispatchScript(input: CodexNestedTeamleadInput): string {
  const modelOpt = input.model ? ` -m ${shellQuote(input.model)}` : "";
  const effortOpt = input.reasoning_effort
    ? ` -c model_reasoning_effort=${shellQuote(input.reasoning_effort)}`
    : "";
  const lensEntries = input.lenses
    .map((l) => {
      const triple = `${l.lens_id}|${l.packet_path}|${l.output_path}`;
      return `  ${shellQuote(triple)}`;
    })
    .join("\n");

  return [
    "#!/usr/bin/env bash",
    "# Literal nested-codex dispatch script. Generated by onto TS",
    "# (codex-nested-teamlead-executor.ts). All values are interpolated; do",
    "# not edit or re-interpret.",
    "set +e",
    "",
    "LENSES=(",
    lensEntries,
    ")",
    "",
    'TMPDIR="$(mktemp -d -t onto-nested-dispatch-XXXXXX)"',
    "trap 'rm -rf \"$TMPDIR\"' EXIT",
    "",
    "# Launch every lens in parallel. Each subshell:",
    "#   - records ENV-BEFORE / ENV-AFTER diagnostic lines in its per-lens log",
    "#   - pipes the packet contents into `codex exec`",
    "#   - writes the last-message to <output_path> via `-o`",
    "#   - emits a single-line status JSON object to its .status file",
    'for entry in "${LENSES[@]}"; do',
    '  IFS="|" read -r LENS_ID PACKET OUTPUT <<< "$entry"',
    "  (",
    '    LOG="$TMPDIR/$LENS_ID.log"',
    '    STAT="$TMPDIR/$LENS_ID.status"',
    '    echo "ENV-BEFORE lens=$LENS_ID packet=$PACKET output=$OUTPUT" >> "$LOG"',
    `    cat "$PACKET" | codex exec \\`,
    "      --sandbox danger-full-access \\",
    "      --skip-git-repo-check \\",
    "      --ephemeral \\",
    `      -o "$OUTPUT"${modelOpt}${effortOpt} \\`,
    '      - >> "$LOG" 2>&1',
    '    EC=$?',
    '    if [ -f "$OUTPUT" ]; then',
    '      SIZE=$(wc -c < "$OUTPUT" | tr -d " ")',
    "    else",
    '      SIZE=0',
    "    fi",
    '    echo "ENV-AFTER lens=$LENS_ID exit=$EC output_bytes=$SIZE" >> "$LOG"',
    '    if [ "$EC" = "0" ] && [ "$SIZE" -gt 0 ]; then',
    '      printf \'{"lens_id":"%s","status":"ok"}\' "$LENS_ID" > "$STAT"',
    "    else",
    '      printf \'{"lens_id":"%s","status":"fail","error":"exit=%s size=%s"}\' \\',
    '        "$LENS_ID" "$EC" "$SIZE" > "$STAT"',
    "    fi",
    "  ) &",
    "done",
    "wait",
    "",
    "# Replay per-lens diagnostics to stdout so outer's captured stdout",
    "# carries the ENV-BEFORE/AFTER lines (plus any codex output that went",
    "# to the per-lens log).",
    'for entry in "${LENSES[@]}"; do',
    '  IFS="|" read -r LENS_ID _ _ <<< "$entry"',
    '  grep -E "^ENV-" "$TMPDIR/$LENS_ID.log" || true',
    "done",
    "",
    "# Emit the summary sentinel. The array order matches the LENSES array,",
    "# which matches the TS input order — the parser relies on this.",
    "SUMMARY_PARTS=()",
    'for entry in "${LENSES[@]}"; do',
    '  IFS="|" read -r LENS_ID _ _ <<< "$entry"',
    '  SUMMARY_PARTS+=("$(cat "$TMPDIR/$LENS_ID.status")")',
    "done",
    'OLDIFS="$IFS"; IFS=","; JOINED="${SUMMARY_PARTS[*]}"; IFS="$OLDIFS"',
    `echo "${SUMMARY_SENTINEL_PREFIX}{\\"lens_results\\":[$JOINED]}"`,
  ].join("\n");
}

/** POSIX-ish shell quoting for option values. */
function shellQuote(value: string): string {
  if (/^[A-Za-z0-9._:/@+\-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

// ---------------------------------------------------------------------------
// Summary parser
// ---------------------------------------------------------------------------

interface ParsedSummary {
  lens_results: Array<{ lens_id: string; status: "ok" | "fail"; error?: string }>;
}

/**
 * Scan outer codex stdout for the `LENS_DISPATCH_SUMMARY:{...}` line.
 * Tolerates leading/trailing whitespace and multiple summary lines
 * (last-one-wins — the final reported state is what matters).
 */
export function parseNestedTeamleadSummary(
  stdout: string,
): ParsedSummary | null {
  const lines = stdout.split("\n");
  let lastSummary: ParsedSummary | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(SUMMARY_SENTINEL_PREFIX)) continue;
    const jsonPart = trimmed.slice(SUMMARY_SENTINEL_PREFIX.length).trim();
    try {
      const parsed = JSON.parse(jsonPart) as unknown;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "lens_results" in parsed &&
        Array.isArray((parsed as ParsedSummary).lens_results)
      ) {
        lastSummary = parsed as ParsedSummary;
      }
    } catch {
      // Ignore malformed summary lines; continue searching for a later one.
    }
  }
  return lastSummary;
}

/**
 * Produce ordered outcomes from a parsed summary. Lens ids missing from
 * the summary are reported as `fail` with a parse-failure reason — the
 * outer codex is contractually required to report every lens, so absence
 * is treated as teamlead noncompliance, not silent success.
 */
function reconcileOutcomes(
  inputs: NestedLensDispatchInput[],
  summary: ParsedSummary | null,
): NestedLensDispatchOutcome[] {
  if (!summary) {
    return inputs.map((lens) => ({
      lens_id: lens.lens_id,
      status: "fail" as const,
      error: "outer codex did not emit a LENS_DISPATCH_SUMMARY line",
    }));
  }
  const byId = new Map(summary.lens_results.map((r) => [r.lens_id, r]));
  return inputs.map((lens) => {
    const reported = byId.get(lens.lens_id);
    if (!reported) {
      return {
        lens_id: lens.lens_id,
        status: "fail" as const,
        error: `outer codex summary missing lens_id="${lens.lens_id}"`,
      };
    }
    if (reported.status === "ok") {
      return { lens_id: lens.lens_id, status: "ok" as const };
    }
    return {
      lens_id: lens.lens_id,
      status: "fail" as const,
      error: reported.error ?? "no error message reported",
    };
  });
}

// ---------------------------------------------------------------------------
// Main orchestration entrypoint
// ---------------------------------------------------------------------------

interface SpawnOuterCodexResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
}

/**
 * Spawn the outer codex subprocess with the orchestration prompt on
 * stdin. Isolated from `runCodexNestedTeamlead` so tests can stub it.
 */
export async function spawnOuterCodex(
  prompt: string,
  options: {
    codex_bin: string;
    project_root: string;
    timeout_ms: number;
    /** `-m <model>` override. Absent → codex picks ~/.codex/config.toml default. */
    model?: string;
    /** `-c model_reasoning_effort=<value>` override. Absent → TOML default. */
    reasoning_effort?: string;
  },
): Promise<SpawnOuterCodexResult> {
  // Outer codex must respect `.onto/config.yml` overrides (model / effort) —
  // otherwise it inherits `~/.codex/config.toml` defaults (often `xhigh`),
  // which can drastically inflate outer teamlead runtime and hit the
  // orchestration timeout before inner lens dispatch even begins.
  const args = [
    "exec",
    "--sandbox",
    "danger-full-access",
    "--skip-git-repo-check",
    "--ephemeral",
  ];
  if (options.reasoning_effort) {
    args.push("-c", `model_reasoning_effort="${options.reasoning_effort}"`);
  }
  if (options.model) {
    args.push("-m", options.model);
  }
  args.push("-");
  const child = spawn(options.codex_bin, args, {
    cwd: options.project_root,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk: Buffer | string) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk: Buffer | string) => {
    stderr += String(chunk);
  });
  child.stdin.write(prompt);
  child.stdin.end();

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, options.timeout_ms);

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (err.code === "ENOENT") {
        reject(
          new Error(
            `codex binary not found at "${options.codex_bin}". ` +
              "Install codex and run `codex login`, or set a non-default codex_bin.",
          ),
        );
      } else {
        reject(err);
      }
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code ?? 1);
    });
  });

  return { stdout, stderr, exit_code: exitCode, timed_out: timedOut };
}

/**
 * Run the codex-nested-subprocess topology for the given lens packet set.
 *
 * Errors are classified, not thrown:
 *   - Outer codex spawn failure (ENOENT) → throws
 *   - Outer codex timeout             → all lens outcomes `fail` with timeout reason
 *   - Outer codex exit non-zero       → all unsatisfied lenses `fail` with outer stderr
 *   - Summary parse failure           → all lens outcomes `fail` with parse reason
 *   - Per-lens `fail` in summary      → that lens outcome `fail` with its reported reason
 *
 * Returns a `CodexNestedTeamleadResult` regardless of per-lens success.
 */
export async function runCodexNestedTeamlead(
  input: CodexNestedTeamleadInput,
  spawnImpl: typeof spawnOuterCodex = spawnOuterCodex,
): Promise<CodexNestedTeamleadResult> {
  const prompt = buildNestedTeamleadPrompt(input);
  const spawned = await spawnImpl(prompt, {
    codex_bin: input.codex_bin ?? "codex",
    project_root: input.project_root ?? process.cwd(),
    timeout_ms: input.timeout_ms ?? 600_000,
    ...(input.model ? { model: input.model } : {}),
    ...(input.reasoning_effort
      ? { reasoning_effort: input.reasoning_effort }
      : {}),
  });

  if (spawned.timed_out) {
    return {
      outcomes: input.lenses.map((lens) => ({
        lens_id: lens.lens_id,
        status: "fail" as const,
        error: `outer codex timed out after ${input.timeout_ms ?? 600_000} ms`,
      })),
      outer_stdout: spawned.stdout,
      outer_stderr: spawned.stderr,
      outer_exit_code: spawned.exit_code,
      summary_parsed: false,
    };
  }

  const summary = parseNestedTeamleadSummary(spawned.stdout);
  const outcomes = reconcileOutcomes(input.lenses, summary);

  // When outer exit is non-zero but summary was parse-able, trust the
  // per-lens summary — it's more granular than a blanket exit code.
  // When outer exit is non-zero AND summary is null, the reconcile step
  // already marked all lenses as fail.
  return {
    outcomes,
    outer_stdout: spawned.stdout,
    outer_stderr: spawned.stderr,
    outer_exit_code: spawned.exit_code,
    summary_parsed: summary !== null,
  };
}
