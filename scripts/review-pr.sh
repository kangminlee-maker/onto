#!/usr/bin/env bash
#
# review-pr.sh — PR review via codex-nested-subprocess + full 9-lens.
#
# Deterministic wrapper. The purpose is to remove LLM-level ASSEMBLY
# (diff generation, env unset list, config block, executor paths, flag
# choices) that is otherwise error-prone on every run. The principal
# picks a git ref range and an LLM choice; everything else is wired here.
#
# Wrapper-internal vs principal-controllable — boundary clarification
# (2026-04-28 redesign + 2026-04-28 round 2 follow-up):
#   - Wrapper-internal (always wrapper-side): topology selection, env
#     unset list, diff generation, executor path, watcher-spawn flags,
#     workspace setup, authority/principles mount. These have no
#     informational value if user-decided per call; LLM/operator would
#     just re-derive the same value every time.
#   - Principal-controllable: provider, model_id, effort. These affect
#     review behavior along multiple axes — provider rail (capability
#     semantics, billing source, runtime authority, availability),
#     model capability, reasoning depth (effort).
#
# Provider contract (round 2 axiology consensus — provider is governed
# by wrapper-side allowlist; model_id is left flexible per provider).
# Supported providers + their prerequisites + per-provider defaults +
# valid effort vocabulary:
#
#   codex      | binary on PATH + ~/.codex/auth.json (OAuth/ChatGPT)
#              | default model: gpt-5.4
#              | effort: low | medium | high | xhigh
#   anthropic  | ANTHROPIC_API_KEY env
#              | default model: claude-sonnet-4-6
#              | effort: low | medium | high
#   openai     | OPENAI_API_KEY env (or ~/.codex/auth.json OPENAI_API_KEY)
#              | default model: gpt-5.4
#              | effort: low | medium | high | xhigh
#   litellm    | LITELLM_BASE_URL env (or cli/config llm_base_url)
#              | default model: (none — must be specified explicitly)
#              | effort: low | medium | high | xhigh (pass-through to backend)
#
# Out-of-scope providers (rejected by this wrapper):
#   main-native — host session must spawn lenses directly; this wrapper
#                 is a nested subprocess so main-native is incompatible.
#   standalone  — no LLM rail; 9-lens review without LLM is meaningless
#                 here, so the wrapper rejects rather than silently
#                 produces empty findings.
#
# Usage:
#   bash scripts/review-pr.sh [--provider <name>] [--model <id>]
#                              [--effort <level>] [GIT_REF_RANGE]
#
#   GIT_REF_RANGE defaults to `main...HEAD` (three-dot, symmetric).
#   This mirrors GitHub's PR diff semantics.
#
#   Override priority (high → low):
#     1. CLI flag       (--provider <name> / --model <id> / --effort <level>)
#     2. env variable   (REVIEW_PR_PROVIDER / REVIEW_PR_MODEL / REVIEW_PR_EFFORT)
#     3. script default (DEFAULT_PROVIDER below; default model is per-provider)
#
#   Empty values are rejected at every override slot (CLI flag + env)
#   so the principal's empty-string is never silently absorbed by `:-`.
#
#   model_id is intentionally left free-form once provider is resolved —
#   new model_ids in any allowed provider can be tried without wrapper
#   edits. Provider, however, is allowlist-enforced; effort is enforced
#   against the provider-specific vocabulary above.
#
#   Audit trail: INTENT (review-record) + STDERR banner record the
#   resolved provider/model/effort, regardless of override path used.
#
#   Explicit examples:
#     bash scripts/review-pr.sh                                 # all defaults (codex)
#     bash scripts/review-pr.sh --provider anthropic            # anthropic + default model
#     bash scripts/review-pr.sh --provider openai --model gpt-5.5
#     bash scripts/review-pr.sh --effort xhigh                  # codex deeper reasoning
#     bash scripts/review-pr.sh --provider litellm --model gpt-4o-2024-08-06
#     REVIEW_PR_PROVIDER=anthropic bash scripts/review-pr.sh
#     bash scripts/review-pr.sh --model gpt-5.5 main...feat/xyz
#
# Wrapper-internal (NOT overridable here — these are assembly):
#   - Topology:         codex-nested-subprocess for codex provider,
#                       ts_inline_http for anthropic/openai/litellm.
#                       The wrapper's CODEX_THREAD_ID + CLAUDE-unset env
#                       gate the codex-nested path; non-codex providers
#                       route through review-invoke's ts_inline_http
#                       self-execute regardless of those env values.
#   - Review mode:      full (9 lens)
#   - Watcher:          ENABLED (iTerm2 / tmux / Apple Terminal auto-detected)
#   - Project root:     isolated tmp (config.yml + target diff only)
#   - Onto home:        this repo (authority / roles / lens registry)
#   - Session artifact: preserved on success so round1/*.md + synthesis.md
#                       remain inspectable
#
# Why explicit defaults (not host-codex / host-env fall-through):
#   Each provider's host-side default varies across machines (codex's
#   ~/.codex/config.toml; anthropic env different across shells; etc).
#   Falling through silently would produce different review results on
#   different machines. The wrapper writes provider/model/effort
#   EXPLICITLY into the inline config.yml so the chosen values are
#   visible + recorded — regardless of override path used.
#
# Prereqs (provider-dependent — checked after provider resolution):
#   codex     → codex binary on PATH + ~/.codex/auth.json
#   anthropic → ANTHROPIC_API_KEY env
#   openai    → OPENAI_API_KEY env (or ~/.codex/auth.json field)
#   litellm   → LITELLM_BASE_URL env
#   (review-invoke.js is required for all providers — checked unconditionally)
#
# Exit: 0 review completed / non-zero invoke failed (tmp preserved for
# debugging).

set -euo pipefail

# ── Argument parsing ─────────────────────────────────────────────────────────
# Override slots accept CLI flags first; resolution against env + defaults
# happens after the prereq + workspace setup so a single resolution path
# produces all consumed values. Empty CLI values are rejected here; empty
# env values are rejected at the resolution site.
PROVIDER_OVERRIDE=""
MODEL_ID_OVERRIDE=""
EFFORT_OVERRIDE=""
REF=""

print_help() {
  # Print everything from line 2 up to (but not including) the first
  # `set -euo pipefail` line — that line is the body boundary, so the
  # header section is whatever precedes it. Dynamic boundary so help
  # output stays accurate as the header grows.
  awk 'NR==1 {next} /^set -euo/ {exit} {print}' "$0" | sed 's/^#\{0,1\}//'
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --provider)
      [[ $# -ge 2 && -n "$2" ]] || { echo "ERROR: --provider requires a non-empty value" >&2; exit 2; }
      PROVIDER_OVERRIDE="$2"; shift 2;;
    --model)
      [[ $# -ge 2 && -n "$2" ]] || { echo "ERROR: --model requires a non-empty value" >&2; exit 2; }
      MODEL_ID_OVERRIDE="$2"; shift 2;;
    --effort)
      [[ $# -ge 2 && -n "$2" ]] || { echo "ERROR: --effort requires a non-empty value" >&2; exit 2; }
      EFFORT_OVERRIDE="$2"; shift 2;;
    -h|--help) print_help;;
    --)
      # POSIX end-of-flags marker. Optional positional REF may follow;
      # extra positionals beyond REF are an error so callers do not
      # accidentally feed garbage into git ref parsing.
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
if [[ "${REF}" == *...* ]]; then
  RIGHT_REF="${REF##*...}"
elif [[ "${REF}" == *..* ]]; then
  RIGHT_REF="${REF##*..}"
else
  RIGHT_REF="HEAD"
fi
[[ -n "${RIGHT_REF}" ]] || RIGHT_REF="HEAD"

# ── Provider / model / effort resolution + contract enforcement ────────────
# Empty env values are rejected here (matching the CLI-flag empty reject
# at the parser site) so the principal's empty intent is never silently
# absorbed by `:-`.
require_nonempty_env() {
  local var_name="$1"
  local var_value="${!var_name:-}"
  if [[ -z "${!var_name+set}" ]]; then return 0; fi  # unset — fall through
  if [[ -z "${var_value}" ]]; then
    echo "ERROR: ${var_name} is set but empty (use \`unset ${var_name}\` to fall through to defaults)" >&2
    exit 2
  fi
}
require_nonempty_env REVIEW_PR_PROVIDER
require_nonempty_env REVIEW_PR_MODEL
require_nonempty_env REVIEW_PR_EFFORT

DEFAULT_PROVIDER="codex"
DEFAULT_EFFORT="high"

PROVIDER="${PROVIDER_OVERRIDE:-${REVIEW_PR_PROVIDER:-${DEFAULT_PROVIDER}}}"
EFFORT="${EFFORT_OVERRIDE:-${REVIEW_PR_EFFORT:-${DEFAULT_EFFORT}}}"

# Per-provider default model — wrapper-level fallback when --model is
# not specified. User-provided values pass through unchanged (model_id
# remains free-form per round 2 axiology guidance).
default_model_for_provider() {
  case "$1" in
    codex)     echo "gpt-5.4" ;;
    anthropic) echo "claude-sonnet-4-6" ;;
    openai)    echo "gpt-5.4" ;;
    litellm)   echo "" ;;  # litellm requires explicit model — no wrapper default
    *)         echo "" ;;
  esac
}

DEFAULT_MODEL_ID="$(default_model_for_provider "${PROVIDER}")"
MODEL_ID="${MODEL_ID_OVERRIDE:-${REVIEW_PR_MODEL:-${DEFAULT_MODEL_ID}}}"

# Provider allowlist (axiology consensus — contract-governed). Reject
# main-native (host-session-only; incompatible with nested-subprocess
# wrapper) and standalone (no-LLM mode; 9-lens review meaningless here).
case "$PROVIDER" in
  codex|anthropic|openai|litellm) ;;
  main-native|standalone)
    echo "ERROR: provider '$PROVIDER' is incompatible with this wrapper (codex-nested-subprocess topology)." >&2
    echo "       main-native requires a host session (Claude Code / Codex CLI)." >&2
    echo "       standalone has no LLM rail (9-lens review needs at least one)." >&2
    exit 2
    ;;
  *)
    echo "ERROR: unsupported provider '$PROVIDER'" >&2
    echo "       Allowed: codex | anthropic | openai | litellm" >&2
    exit 2
    ;;
esac

# Per-provider effort vocabulary enforcement. codex/openai support
# 4-level (low/medium/high/xhigh); anthropic supports 3-level
# (low/medium/high; thinking budget mapping). litellm passes through
# to the backend so any of the four levels is admitted as input.
case "$PROVIDER" in
  codex|openai)
    case "$EFFORT" in
      low|medium|high|xhigh) ;;
      *)
        echo "ERROR: provider '$PROVIDER' does not accept effort '$EFFORT' (valid: low | medium | high | xhigh)" >&2
        exit 2
        ;;
    esac
    ;;
  anthropic)
    case "$EFFORT" in
      low|medium|high) ;;
      *)
        echo "ERROR: provider 'anthropic' does not accept effort '$EFFORT' (valid: low | medium | high — xhigh is not in the anthropic vocabulary)" >&2
        exit 2
        ;;
    esac
    ;;
  litellm)
    case "$EFFORT" in
      low|medium|high|xhigh) ;;
      *)
        echo "ERROR: invalid effort '$EFFORT' (valid: low | medium | high | xhigh; semantics are pass-through to the litellm backend)" >&2
        exit 2
        ;;
    esac
    ;;
esac

# Model required check — litellm has no wrapper default, so an explicit
# model_id (CLI flag or env) is mandatory.
if [[ -z "${MODEL_ID}" ]]; then
  echo "ERROR: provider '$PROVIDER' requires an explicit --model (no wrapper default for this provider)" >&2
  exit 2
fi

# Per-provider prerequisite check — fail-fast before workspace creation.
case "$PROVIDER" in
  codex)
    command -v codex >/dev/null 2>&1 || {
      echo "ERROR: codex provider requires 'codex' binary on PATH. Install codex CLI and run \`codex login\`." >&2
      exit 2
    }
    [[ -f "${HOME}/.codex/auth.json" ]] || {
      echo "ERROR: codex provider requires ~/.codex/auth.json. Run \`codex login\`." >&2
      exit 2
    }
    ;;
  anthropic)
    [[ -n "${ANTHROPIC_API_KEY:-}" ]] || {
      echo "ERROR: anthropic provider requires ANTHROPIC_API_KEY env (per-token API access)." >&2
      exit 2
    }
    ;;
  openai)
    if [[ -z "${OPENAI_API_KEY:-}" ]] && \
       ! grep -q '"OPENAI_API_KEY"' "${HOME}/.codex/auth.json" 2>/dev/null; then
      echo "ERROR: openai provider requires OPENAI_API_KEY env or ~/.codex/auth.json with OPENAI_API_KEY field." >&2
      exit 2
    fi
    ;;
  litellm)
    [[ -n "${LITELLM_BASE_URL:-}" ]] || {
      echo "ERROR: litellm provider requires LITELLM_BASE_URL env (the proxy endpoint)." >&2
      exit 2
    }
    ;;
esac

# review-invoke.js prerequisite — provider-independent.
CLI="${REPO_ROOT}/dist/core-runtime/cli/review-invoke.js"
if [[ ! -f "${CLI}" ]]; then
  echo "ERROR: review-invoke.js not built at ${CLI}. Run \`npm run build:ts-core\` first." >&2
  exit 2
fi

# ── Workspace ──────────────────────────────────────────────────────────────
REVIEW_DIR="$(mktemp -d -t onto-review-pr-XXXXXX)"
mkdir -p "${REVIEW_DIR}/.onto"
echo "review workspace: ${REVIEW_DIR}" >&2

# Cleanup-on-error trap: if anything below this line fails, the
# workspace remains for inspection. This trap is intentionally NOT
# invoked on normal success so artifacts (synthesis.md / final-output.md)
# stay readable.
# (Removed cleanup trap — keep failure artifacts for inspection.)

# Authority + principles mount (post-PR232 backlog F1, 2026-04-27).
# Axiology lens reads rank 1-3 canonical inputs (lexicon / 원칙 / 헌장)
# from the project root. host repo's authority + principles + CLAUDE.md
# are read-only mounted into the isolated tmp.
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

# YAML-safe scalar emission. Reject control characters (newline, tab,
# null, etc) outright rather than try to escape them — provider/model/
# effort identifiers should never contain control characters, and
# multi-line YAML values would change meaning. Backslash and double-quote
# are escaped for safe interpolation into double-quoted YAML scalars.
yaml_quote_or_reject() {
  local field="$1"
  local v="$2"
  if [[ "$v" =~ [[:cntrl:]] ]]; then
    echo "ERROR: ${field} value contains a control character (newline/tab/etc); refusing YAML emission" >&2
    exit 2
  fi
  v="${v//\\/\\\\}"
  v="${v//\"/\\\"}"
  printf '"%s"' "$v"
}
PROVIDER_Q="$(yaml_quote_or_reject provider "$PROVIDER")"
MODEL_ID_Q="$(yaml_quote_or_reject model_id "$MODEL_ID")"
EFFORT_Q="$(yaml_quote_or_reject effort "$EFFORT")"

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
# right-hand ref actually being reviewed and the resolved (post-override)
# provider/model/effort so the audit trail is accurate regardless of
# override path used.
COMMIT_SHA="$(git -C "${REPO_ROOT}" rev-parse --short "${RIGHT_REF}")"
INTENT="PR review (${REF} @ ${COMMIT_SHA}, ${PROVIDER}/${MODEL_ID}/${EFFORT})"

# STDERR banner — same model/effort visible at invocation time for
# the operator (no need to wait for review-record).
echo "model: ${PROVIDER}/${MODEL_ID}/${EFFORT}" >&2

# ── Execute ────────────────────────────────────────────────────────────────
# NOTE: --no-watch is DELIBERATELY ABSENT so the live watcher pane spawns
# (iTerm2 split / tmux split / Apple Terminal tab, whichever the current
# env supports). For non-codex providers, review-invoke routes through
# ts_inline_http self-execute and the codex-host env values below are
# inert (review-invoke ignores them when host_runtime is not codex).
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
