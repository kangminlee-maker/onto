#!/usr/bin/env bash
#
# review-pr.sh — PR review via codex-main-subprocess + full 9-lens.
#
# Deterministic wrapper. The purpose is to remove LLM-level ASSEMBLY
# (diff generation, env unset list, config block, executor paths, flag
# choices) that is otherwise error-prone on every run (e.g. `--no-watch`
# accidentally inherited from smoke-script copy). The subject principal
# picks a git ref range; everything else is wired here.
#
# Assembly vs choice — boundary clarification (2026-04-28 redesign):
#   - ASSEMBLY (always wrapper-internal): topology selection, env unset
#     list, diff generation, executor path, watcher-spawn flags. These
#     have no informational value if user-decided per call; LLM/operator
#     would just re-derive the same value every time.
#   - CHOICE (user-controllable): model_id, effort, provider. These
#     affect review behavior along multiple axes — model capability,
#     reasoning depth (effort: low/medium/high/xhigh), and provider rail
#     (capability semantics, billing source, runtime authority,
#     availability). The principal's better-outcome / cost / authority
#     judgment SHOULD be respected per call. Reverts PR #188 hard-pin
#     over-correction.
#
# Usage:
#   bash scripts/review-pr.sh [--model <id>] [--effort <level>]
#                              [--provider <name>] [GIT_REF_RANGE]
#
#   GIT_REF_RANGE defaults to `main...HEAD` (three-dot, symmetric).
#   This mirrors GitHub's PR diff semantics: changes on the right-hand
#   side (HEAD) since its merge-base with main, so branches that
#   diverged do not blame each other for mainline drift.
#
#   Override priority (high → low):
#     1. CLI flag       (--model <id> / --effort <level> / --provider <name>)
#     2. env variable   (REVIEW_PR_MODEL / REVIEW_PR_EFFORT / REVIEW_PR_PROVIDER)
#     3. script default (DEFAULT_PROVIDER / DEFAULT_MODEL_ID /
#                        DEFAULT_EFFORT below — script body is the single
#                        source of truth for the actual default values;
#                        consult there rather than this prose to avoid drift)
#
#   Valid --effort values: low | medium | high | xhigh (enforced).
#   --model and --provider are intentionally free-form so future model_ids
#   and provider rails can be tried without wrapper edits — empty values are
#   rejected; YAML emission is escape-safe.
#
#   The actual values used are recorded in INTENT (review-record's
#   intent field, retrospective grep) AND emitted as a STDERR banner
#   (operator-visible at invocation time). Both reflect post-override
#   values so audit is accurate regardless of override path used.
#
#   Explicit examples:
#     bash scripts/review-pr.sh                       # all defaults
#     bash scripts/review-pr.sh main...feat/xyz       # explicit ref
#     bash scripts/review-pr.sh --model gpt-5.5       # better model
#     bash scripts/review-pr.sh --effort xhigh        # deeper reasoning
#     REVIEW_PR_MODEL=gpt-5.5 bash scripts/review-pr.sh
#     bash scripts/review-pr.sh --model gpt-5.5 --effort xhigh main...feat/xyz
#
# Wrapper-internal (NOT overridable here — these are assembly, not choice):
#   - Topology:         codex-nested-subprocess
#                       (teamlead is an external codex spawn, NOT host main.
#                        CODEX_THREAD_ID set, CLAUDE* unset → non-handoff path
#                        so review-invoke reaches the watcher call site too.)
#   - Review mode:      full (9 lens)
#   - Watcher:          ENABLED (iTerm2 / tmux / Apple Terminal auto-detected)
#   - Project root:     isolated tmp (config.yml + target diff only)
#   - Onto home:        this repo (authority / roles / lens registry)
#   - Session artifact: preserved on success so round1/*.md + synthesis.md
#                       remain inspectable
#
# Why explicit defaults (not host-codex fall-through):
#   Host codex CLI's default model varies across machines (~/.codex/config.toml,
#   ChatGPT subscription tier, codex CLI version). Falling through silently
#   would mean reviewer A and reviewer B get different review results without
#   either knowing why. The wrapper writes provider/model/effort EXPLICITLY
#   into the inline config.yml so the chosen values are visible + recorded —
#   regardless of whether they came from CLI flag, env, or script default.
#
# Prereqs:
#   - codex binary on PATH + ~/.codex/auth.json
#   - repo's `dist/core-runtime/cli/review-invoke.js` built
#     (`npm run build:ts-core`)
#
# Exit: 0 review completed / non-zero invoke failed (tmp preserved for
# debugging).

set -euo pipefail

# ── Argument parsing ─────────────────────────────────────────────────────────
# Override slots accept CLI flags first; resolution against env + defaults
# happens after the prereq + workspace setup (line 135 area) so a single
# resolution path produces all consumed values.
MODEL_ID_OVERRIDE=""
EFFORT_OVERRIDE=""
PROVIDER_OVERRIDE=""
REF=""

print_help() {
  # Print everything from line 2 up to (but not including) the first
  # `set -euo pipefail` line — that line is the body boundary, so the
  # header section is whatever precedes it. Dynamic boundary so help
  # output stays accurate as the header grows; PR #243 round 1 review
  # C2 fix replaces a fragile hard-coded `2,49p` range.
  awk 'NR==1 {next} /^set -euo/ {exit} {print}' "$0" | sed 's/^#\{0,1\}//'
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --model)
      [[ $# -ge 2 && -n "$2" ]] || { echo "ERROR: --model requires a non-empty value" >&2; exit 2; }
      MODEL_ID_OVERRIDE="$2"; shift 2;;
    --effort)
      [[ $# -ge 2 && -n "$2" ]] || { echo "ERROR: --effort requires a non-empty value" >&2; exit 2; }
      EFFORT_OVERRIDE="$2"; shift 2;;
    --provider)
      [[ $# -ge 2 && -n "$2" ]] || { echo "ERROR: --provider requires a non-empty value" >&2; exit 2; }
      PROVIDER_OVERRIDE="$2"; shift 2;;
    -h|--help) print_help;;
    --)
      # POSIX end-of-flags marker. Optional positional REF may follow;
      # extra positionals beyond REF are an error so callers do not
      # accidentally feed garbage into git ref parsing. PR #243 round 1
      # review C1 fix (post-`--` arg was previously silently ignored,
      # producing a misleading default REF=main...HEAD).
      shift
      if [[ $# -gt 0 ]]; then
        [[ -z "${REF}" ]] || {
          echo "ERROR: REF already set to '${REF}'; got extra positional after '--': '$1'" >&2
          exit 2
        }
        REF="$1"
        shift
        [[ $# -eq 0 ]] || {
          echo "ERROR: extra positional args after '--': $*" >&2
          exit 2
        }
      fi
      break;;
    -*) echo "ERROR: unknown flag: $1 (see --help)" >&2; exit 2;;
    *)
      [[ -z "${REF}" ]] || { echo "ERROR: REF already set to '${REF}'; got extra positional '$1'" >&2; exit 2; }
      REF="$1"; shift;;
  esac
done
REF="${REF:-main...HEAD}"
REPO_ROOT="$(git rev-parse --show-toplevel)"

# Shared host-environment sanitizer. PR #185 follow-up #5 — keeps the
# env-unset list single-source across review-pr.sh and the smoke launchers.
# shellcheck disable=SC1091
source "${REPO_ROOT}/scripts/host-env.sh"

# Extract the right-hand ref from REF. Branch-separator parsing: try
# three-dot first (`main...HEAD` → `HEAD`), then two-dot (`main..feat/xyz`
# → `feat/xyz`). Literal-dot fallback would corrupt refs containing a `.`
# (e.g. `main...release/1.2` naively splitting on last `.` yields `2`) —
# fixed in 3rd self-review C2.
if [[ "${REF}" == *...* ]]; then
  RIGHT_REF="${REF##*...}"
elif [[ "${REF}" == *..* ]]; then
  RIGHT_REF="${REF##*..}"
else
  RIGHT_REF="HEAD"
fi
if [[ -z "${RIGHT_REF}" ]]; then
  RIGHT_REF="HEAD"
fi

# ── Prereqs ────────────────────────────────────────────────────────────────
if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex binary not found on PATH. Install codex CLI and run \`codex login\`." >&2
  exit 2
fi
if [[ ! -f "${HOME}/.codex/auth.json" ]]; then
  echo "ERROR: ~/.codex/auth.json missing. Run \`codex login\`." >&2
  exit 2
fi
CLI="${REPO_ROOT}/dist/core-runtime/cli/review-invoke.js"
if [[ ! -f "${CLI}" ]]; then
  echo "ERROR: review-invoke.js not built at ${CLI}. Run \`npm run build:ts-core\` first." >&2
  exit 2
fi

# ── Workspace ──────────────────────────────────────────────────────────────
REVIEW_DIR="$(mktemp -d -t onto-review-pr-XXXXXX)"
mkdir -p "${REVIEW_DIR}/.onto"
echo "review workspace: ${REVIEW_DIR}" >&2

# Authority + principles mount (post-PR232 backlog F1, 2026-04-27).
#
# Axiology lens 가 5 round review 동안 모두 indeterminate 였던 원인은
# isolated tmp project root 안에 rank 1-3 canonical authority inputs
# (lexicon / 원칙 / 헌장) 이 부재했기 때문. host repo 의 authority + principles
# + CLAUDE.md 를 isolated tmp 의 .onto/ 와 project root 에 cp 로 mount —
# read-only consume 만이며 host 측 mutation 가능성 없음 (axiology 는 read 만).
if [[ -d "${REPO_ROOT}/.onto/authority" ]]; then
  cp -R "${REPO_ROOT}/.onto/authority" "${REVIEW_DIR}/.onto/authority"
fi
if [[ -d "${REPO_ROOT}/.onto/principles" ]]; then
  cp -R "${REPO_ROOT}/.onto/principles" "${REVIEW_DIR}/.onto/principles"
fi
if [[ -f "${REPO_ROOT}/CLAUDE.md" ]]; then
  cp "${REPO_ROOT}/CLAUDE.md" "${REVIEW_DIR}/CLAUDE.md"
fi

# Generate the diff as the review target. Empty diff → abort so we do
# not burn LLM tokens on a no-op review.
DIFF_FILE="${REVIEW_DIR}/pr.diff"
git -C "${REPO_ROOT}" diff "${REF}" > "${DIFF_FILE}"
if [[ ! -s "${DIFF_FILE}" ]]; then
  echo "ERROR: diff for range '${REF}' is empty. Nothing to review." >&2
  rm -rf "${REVIEW_DIR}"
  exit 2
fi
DIFF_BYTES=$(wc -c < "${DIFF_FILE}" | tr -d " ")
DIFF_LINES=$(wc -l < "${DIFF_FILE}" | tr -d " ")
echo "target diff: ${DIFF_BYTES} bytes, ${DIFF_LINES} lines (${REF})" >&2

# ── Model / effort / provider resolution ───────────────────────────────────
# Defaults are written EXPLICITLY into the inline config.yml so host codex
# defaults (which silently drift across machines / subscription tiers / CLI
# versions) never participate. Override priority: CLI flag > env > default.
# The wrapper records the *resolved* values in INTENT + STDERR banner.
DEFAULT_PROVIDER="codex"
DEFAULT_MODEL_ID="gpt-5.4"
DEFAULT_EFFORT="high"

PROVIDER="${PROVIDER_OVERRIDE:-${REVIEW_PR_PROVIDER:-${DEFAULT_PROVIDER}}}"
MODEL_ID="${MODEL_ID_OVERRIDE:-${REVIEW_PR_MODEL:-${DEFAULT_MODEL_ID}}}"
EFFORT="${EFFORT_OVERRIDE:-${REVIEW_PR_EFFORT:-${DEFAULT_EFFORT}}}"

# Validate effort against the canonical vocabulary (codex CLI accepts
# only this set). model/provider are intentionally free-form so future
# identifiers / provider rails do not require wrapper edits — empty
# values were already rejected at the flag-parsing site (round 1 CC1).
# PR #243 round 1 recommendation — make valid effort levels enforced.
case "$EFFORT" in
  low|medium|high|xhigh) ;;
  *)
    echo "ERROR: invalid effort '$EFFORT' (must be one of: low, medium, high, xhigh)" >&2
    exit 2
    ;;
esac

# YAML-safe scalar emission. PR #243 round 1 review CC1 fix — raw
# interpolation of user-supplied identifiers into inline YAML can break
# parsing if a value contains `:`, `"`, `\`, or whitespace edge-cases.
# Double-quoted scalars + backslash + double-quote escape cover the
# common cases without pulling in a YAML library for a 6-line emit.
yaml_quote() {
  local v="$1"
  v="${v//\\/\\\\}"
  v="${v//\"/\\\"}"
  printf '"%s"' "$v"
}
PROVIDER_Q="$(yaml_quote "$PROVIDER")"
MODEL_ID_Q="$(yaml_quote "$MODEL_ID")"
EFFORT_Q="$(yaml_quote "$EFFORT")"

cat > "${REVIEW_DIR}/.onto/config.yml" <<EOF
review:
  teamlead:
    model:
      provider: ${PROVIDER_Q}
      model_id: ${MODEL_ID_Q}
      effort: ${EFFORT_Q}
  subagent:
    provider: ${PROVIDER_Q}
    model_id: ${MODEL_ID_Q}
    effort: ${EFFORT_Q}
review_mode: full
EOF

# Commit sha / intent for traceability in review-record. Record the
# right-hand ref actually being reviewed (not unconditional HEAD) so
# the metadata is meaningful when REF is e.g. `main...feat/xyz` and
# HEAD is on a different branch. INTENT also embeds the resolved
# model/effort so review-record's intent field carries the model
# identity for retrospective grep / cost analysis — same shape
# regardless of whether the value came from CLI / env / default.
COMMIT_SHA="$(git -C "${REPO_ROOT}" rev-parse --short "${RIGHT_REF}")"
INTENT="PR review (${REF} @ ${COMMIT_SHA}, ${PROVIDER}/${MODEL_ID}/${EFFORT})"

# STDERR banner — same model/effort visible at invocation time for
# the operator (no need to wait for review-record). Independent from
# INTENT (record vs operational visibility serve different consumers).
echo "model: ${PROVIDER}/${MODEL_ID}/${EFFORT}" >&2

# ── Execute ────────────────────────────────────────────────────────────────
# NOTE: --no-watch is DELIBERATELY ABSENT so the live watcher pane spawns
# (iTerm2 split / tmux split / Apple Terminal tab, whichever the current
# env supports). CLAUDE_* unset + CODEX_THREAD_ID set routes through the
# non-handoff dispatch path so the watcher call site is actually reached.
cd "${REVIEW_DIR}"
STDOUT_LOG="${REVIEW_DIR}/review.stdout.log"
STDERR_LOG="${REVIEW_DIR}/review.stderr.log"
set +e
CODEX_THREAD_ID="review-pr-$(date +%s)" \
  onto_env_codex_host \
  node "${CLI}" \
    "$(basename "${DIFF_FILE}")" "${INTENT}" \
    --project-root "${REVIEW_DIR}" \
    --onto-home "${REPO_ROOT}" \
    > "${STDOUT_LOG}" 2> "${STDERR_LOG}"
EC=$?
set -e

SESSION_DIR="$(find "${REVIEW_DIR}/.onto/review" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | head -1 || true)"

if [[ "${EC}" -ne 0 ]]; then
  echo "review failed (exit=${EC}). Workspace preserved: ${REVIEW_DIR}" >&2
  exit "${EC}"
fi

echo "" >&2
echo "review complete." >&2
echo "  workspace:  ${REVIEW_DIR}" >&2
if [[ -n "${SESSION_DIR}" ]]; then
  echo "  session:    ${SESSION_DIR}" >&2
  echo "  synthesis:  ${SESSION_DIR}/synthesis.md" >&2
  echo "  final:      ${SESSION_DIR}/final-output.md" >&2
  echo "  round1:     ${SESSION_DIR}/round1/" >&2
fi
