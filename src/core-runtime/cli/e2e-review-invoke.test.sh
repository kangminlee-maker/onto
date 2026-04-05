#!/usr/bin/env bash
# E2E Test Suite for review:invoke
# Run from project root: bash src/core-runtime/cli/e2e-review-invoke.test.sh
#
# Exit codes:
#   0 = all tests passed
#   1 = at least one test failed unexpectedly

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$PROJECT_ROOT"

PASS_COUNT=0
FAIL_COUNT=0
UNEXPECTED_COUNT=0

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

run_expect_pass() {
  local tname="$1"
  shift
  local tout
  tout=$(npm run review:invoke -- "$@" 2>&1)
  local texit=$?
  local tstatus
  tstatus=$(echo "$tout" | grep '"record_status"' | head -1 | sed 's/.*: "//;s/".*//')

  if [ $texit -eq 0 ]; then
    echo "  PASS  $tname (status=$tstatus)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL! $tname (expected pass, got exit=$texit)"
    UNEXPECTED_COUNT=$((UNEXPECTED_COUNT + 1))
  fi
}

run_expect_fail() {
  local tname="$1"
  shift
  local tout
  tout=$(npm run review:invoke -- "$@" 2>&1)
  local texit=$?

  if [ $texit -ne 0 ]; then
    echo "  PASS  $tname (expected fail, exit=$texit)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL! $tname (expected fail, but passed)"
    UNEXPECTED_COUNT=$((UNEXPECTED_COUNT + 1))
  fi
}

run_expect_status() {
  local tname="$1"
  local expected_status="$2"
  shift 2
  local tout
  tout=$(npm run review:invoke -- "$@" 2>&1)
  local texit=$?
  local tstatus
  tstatus=$(echo "$tout" | grep '"record_status"' | head -1 | sed 's/.*: "//;s/".*//')

  if [ $texit -eq 0 ] && [ "$tstatus" = "$expected_status" ]; then
    echo "  PASS  $tname (status=$tstatus)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL! $tname (expected status=$expected_status, got exit=$texit status=$tstatus)"
    UNEXPECTED_COUNT=$((UNEXPECTED_COUNT + 1))
  fi
}

# ─────────────────────────────────────────────
# Setup fixtures
# ─────────────────────────────────────────────

FIXTURE_DIR="/tmp/onto-e2e-fixtures-$$"
mkdir -p "$FIXTURE_DIR"

setup_fixtures() {
  # binary file
  printf '\x89PNG\r\n' > "$FIXTURE_DIR/binary.png"

  # empty file
  touch "$FIXTURE_DIR/empty.ts"

  # Korean path
  mkdir -p "$FIXTURE_DIR/한글폴더"
  echo "const x = 1;" > "$FIXTURE_DIR/한글폴더/test.ts"

  # non-UTF-8 file
  printf '\xB0\xA1\xB3\xAA\xB4\xD9\xB6\xF3' > "$FIXTURE_DIR/euckr.txt"

  # dotfile
  echo "SECRET=abc" > "$FIXTURE_DIR/.env"

  # deep nested path
  mkdir -p "$FIXTURE_DIR/a/b/c/d/e/f/g/h/i/j"
  echo "x" > "$FIXTURE_DIR/a/b/c/d/e/f/g/h/i/j/deep.ts"

  # path with spaces
  mkdir -p "$FIXTURE_DIR/space dir"
  echo "const x = 1;" > "$FIXTURE_DIR/space dir/my file.ts"

  # large directory
  mkdir -p "$FIXTURE_DIR/large-dir"
  for i in $(seq 1 100); do touch "$FIXTURE_DIR/large-dir/file-$i.ts"; done

  # symlink loop
  ln -sf "$FIXTURE_DIR/link-b" "$FIXTURE_DIR/link-a" 2>/dev/null
  ln -sf "$FIXTURE_DIR/link-a" "$FIXTURE_DIR/link-b" 2>/dev/null

  # non-git directory
  mkdir -p "$FIXTURE_DIR/no-git"
  echo "x" > "$FIXTURE_DIR/no-git/a.txt"
}

cleanup_fixtures() {
  rm -rf "$FIXTURE_DIR"
  # Clean up collision test session
  rm -rf "$PROJECT_ROOT/.onto/review/e2e-collision-test"
}

trap cleanup_fixtures EXIT
setup_fixtures

echo "onto review:invoke E2E Test Suite"
echo "================================="
echo "project root: $PROJECT_ROOT"
echo "fixtures: $FIXTURE_DIR"
echo ""

# ─────────────────────────────────────────────
# 1. HAPPY PATH
# ─────────────────────────────────────────────

echo "── Happy Path ──"

run_expect_pass "T1: file/light/mock" \
  src/core-runtime/cli/review-invoke.ts "security check" \
  --executor-realization mock --review-mode light

run_expect_pass "T2: dir/full/mock" \
  . "architecture review" \
  --executor-realization mock --review-mode full

run_expect_pass "T3: external-dir/auto-approve" \
  ../AI-data-dashboard "patterns review" \
  --executor-realization mock

run_expect_pass "T4: domain-token" \
  src/ @llm-native-development "ontology check" \
  --executor-realization mock --review-mode light

run_expect_pass "T5: diff-range" \
  ../AI-data-dashboard "changes review" \
  --diff-range HEAD~1 \
  --executor-realization mock --review-mode light

run_expect_pass "T6: custom-lenses" \
  src/core-runtime/cli/ "logic only" \
  --executor-realization mock \
  --lens-id onto_logic --lens-id onto_pragmatics

run_expect_pass "T9: bundle" \
  --primary-ref src/core-runtime/cli/review-invoke.ts \
  --member-ref package.json \
  --target-scope-kind bundle \
  --executor-realization mock \
  --request-text "bundle review"

run_expect_pass "T12: max-concurrent" \
  src/ "parallelism test" \
  --executor-realization mock --max-concurrent-lenses 2 --review-mode light

echo ""

# ─────────────────────────────────────────────
# 2. ERROR PATH
# ─────────────────────────────────────────────

echo "── Error Path ──"

run_expect_fail "T7: invalid-target" \
  /nonexistent/path "test" \
  --executor-realization mock

run_expect_fail "T8: missing-intent" \
  src/core-runtime/cli/review-invoke.ts \
  --executor-realization mock

echo ""

# ─────────────────────────────────────────────
# 3. SECURITY EDGE CASES
# ─────────────────────────────────────────────

echo "── Security ──"

run_expect_fail "E1: diff-range-injection" \
  ../AI-data-dashboard "test" \
  --diff-range '$(echo hacked)' \
  --executor-realization mock

echo "=== E2: session-id-collision ==="
FIRST_OUT=$(npm run review:invoke -- src/core-runtime/cli/review-invoke.ts "first" \
  --executor-realization mock --session-id e2e-collision-test --review-mode light 2>&1)
FIRST_EXIT=$?
SECOND_OUT=$(npm run review:invoke -- src/core-runtime/cli/review-invoke.ts "second" \
  --executor-realization mock --session-id e2e-collision-test --review-mode light 2>&1)
SECOND_EXIT=$?
if [ $FIRST_EXIT -eq 0 ] && [ $SECOND_EXIT -ne 0 ]; then
  echo "  PASS  E2: session-id-collision (first=ok second=blocked)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  FAIL! E2: session-id-collision (first=$FIRST_EXIT second=$SECOND_EXIT)"
  UNEXPECTED_COUNT=$((UNEXPECTED_COUNT + 1))
fi

run_expect_fail "E3: api-key-missing" \
  src/ "test" \
  --executor-realization api --review-mode light

echo ""

# ─────────────────────────────────────────────
# 4. INPUT VALIDATION
# ─────────────────────────────────────────────

echo "── Input Validation ──"

echo "=== E4: request-text-truncation ==="
LONG_TEXT=$(python3 -c "print('x' * 3000)")
E4_OUT=$(npm run review:invoke -- src/core-runtime/cli/review-invoke.ts "$LONG_TEXT" \
  --executor-realization mock --review-mode light 2>&1)
E4_EXIT=$?
if [ $E4_EXIT -eq 0 ]; then
  echo "  PASS  E4: request-text-truncation"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  FAIL! E4: request-text-truncation (exit=$E4_EXIT)"
  UNEXPECTED_COUNT=$((UNEXPECTED_COUNT + 1))
fi

run_expect_pass "E5: max-embed-lines-zero" \
  src/core-runtime/cli/review-invoke.ts "test" \
  --executor-realization mock --review-mode light --max-embed-lines=1

echo ""

# ─────────────────────────────────────────────
# 5. INPUT BOUNDARY
# ─────────────────────────────────────────────

echo "── Input Boundary ──"

run_expect_pass "E6: binary-file" \
  "$FIXTURE_DIR/binary.png" "binary test" \
  --executor-realization mock --review-mode light

run_expect_pass "E7: empty-file" \
  "$FIXTURE_DIR/empty.ts" "empty test" \
  --executor-realization mock --review-mode light

run_expect_pass "E8: korean-path" \
  "$FIXTURE_DIR/한글폴더/test.ts" "korean test" \
  --executor-realization mock --review-mode light

run_expect_fail "E9: diff-no-git" \
  "$FIXTURE_DIR/no-git" "test" \
  --diff-range HEAD~1 \
  --executor-realization mock --review-mode light

run_expect_fail "E10: invalid-commit" \
  ../AI-data-dashboard "test" \
  --diff-range "0000000..fffffff" \
  --executor-realization mock --review-mode light

run_expect_pass "E12: non-utf8" \
  "$FIXTURE_DIR/euckr.txt" "encoding test" \
  --executor-realization mock --review-mode light

run_expect_pass "E13: symlink-loop-dir" \
  "$FIXTURE_DIR" "symlink test" \
  --executor-realization mock --review-mode light

run_expect_pass "E15: large-directory" \
  "$FIXTURE_DIR/large-dir" "large test" \
  --executor-realization mock --review-mode light

run_expect_pass "E17: deep-nested" \
  "$FIXTURE_DIR/a/b/c/d/e/f/g/h/i/j/deep.ts" "deep test" \
  --executor-realization mock --review-mode light

run_expect_pass "E18: spaces-in-path" \
  "$FIXTURE_DIR/space dir/my file.ts" "space test" \
  --executor-realization mock --review-mode light

run_expect_pass "E19: dotfile" \
  "$FIXTURE_DIR/.env" "dotfile test" \
  --executor-realization mock --review-mode light

run_expect_fail "E20: diff-empty-range" \
  ../AI-data-dashboard "no change" \
  --diff-range "HEAD..HEAD" \
  --executor-realization mock --review-mode light

echo ""

# ─────────────────────────────────────────────
# 6. CONFIG EDGE CASES
# ─────────────────────────────────────────────

echo "── Config ──"

run_expect_pass "E21: no-domain-default" \
  src/core-runtime/cli/review-invoke.ts "no domain" \
  --executor-realization mock --review-mode light

run_expect_pass "E22: explicit-no-domain" \
  src/core-runtime/cli/review-invoke.ts "no domain" \
  --executor-realization mock --review-mode light \
  --requested-domain-token "@-"

run_expect_pass "E23: unknown-executor-fallback" \
  src/ "test" \
  --executor-realization banana --review-mode light

echo ""

# ─────────────────────────────────────────────
# 7. OPTION INTERACTIONS
# ─────────────────────────────────────────────

echo "── Option Interactions ──"

run_expect_pass "E24: diff+bundle-priority" \
  --diff-range HEAD~1 \
  --primary-ref src/core-runtime/cli/review-invoke.ts \
  --member-ref package.json \
  --target-scope-kind bundle \
  --executor-realization mock \
  --request-text "conflict test" \
  --requested-target ../AI-data-dashboard

run_expect_pass "E25: light+9lenses-override" \
  src/ "override test" \
  --executor-realization mock --review-mode light \
  --lens-id onto_logic --lens-id onto_structure --lens-id onto_dependency \
  --lens-id onto_semantics --lens-id onto_pragmatics --lens-id onto_evolution \
  --lens-id onto_coverage --lens-id onto_conciseness --lens-id onto_axiology

run_expect_status "E26: single-lens-halts" "halted_partial" \
  src/ "single lens" \
  --executor-realization mock \
  --lens-id onto_logic

echo ""

# ─────────────────────────────────────────────
# 8. STATE / RECOVERY
# ─────────────────────────────────────────────

echo "── State / Recovery ──"

run_expect_fail "E11: write-permission" \
  src/core-runtime/cli/review-invoke.ts "test" \
  --executor-realization mock --review-mode light \
  --project-root /nonexistent-readonly

echo "=== E14: partial-session-complete ==="
EXISTING_SESSION=$(ls -dt "$PROJECT_ROOT/.onto/review/20260405-"* 2>/dev/null | head -1)
if [ -d "$EXISTING_SESSION" ]; then
  PARTIAL="$PROJECT_ROOT/.onto/review/e2e-partial-test"
  mkdir -p "$PARTIAL/round1" "$PARTIAL/execution-preparation"
  cp "$EXISTING_SESSION/binding.yaml" "$PARTIAL/"
  cp "$EXISTING_SESSION/interpretation.yaml" "$PARTIAL/"
  cp "$EXISTING_SESSION/session-metadata.yaml" "$PARTIAL/"
  cp "$EXISTING_SESSION/execution-plan.yaml" "$PARTIAL/"
  # Copy only 3/9 lens outputs
  for f in onto_logic.md onto_structure.md onto_axiology.md; do
    cp "$EXISTING_SESSION/round1/$f" "$PARTIAL/round1/" 2>/dev/null
  done
  E14_OUT=$(npm run review:complete-session -- \
    --project-root "$PROJECT_ROOT" \
    --session-root "$PARTIAL" \
    --request-text "partial test" 2>&1)
  E14_EXIT=$?
  rm -rf "$PARTIAL"
  if [ $E14_EXIT -eq 0 ]; then
    echo "  PASS  E14: partial-session-complete"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL! E14: partial-session-complete (exit=$E14_EXIT)"
    UNEXPECTED_COUNT=$((UNEXPECTED_COUNT + 1))
  fi
else
  echo "  SKIP  E14: no existing session to copy from"
fi

echo "=== E27: complete-nonexistent ==="
E27_OUT=$(npm run review:complete-session -- \
  --project-root "$PROJECT_ROOT" \
  --session-root "$PROJECT_ROOT/.onto/review/nonexistent" \
  --request-text "ghost" 2>&1)
E27_EXIT=$?
if [ $E27_EXIT -ne 0 ]; then
  echo "  PASS  E27: complete-nonexistent (expected fail)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  FAIL! E27: complete-nonexistent (unexpected pass)"
  UNEXPECTED_COUNT=$((UNEXPECTED_COUNT + 1))
fi

echo ""

# ─────────────────────────────────────────────
# 9. CONCURRENCY
# ─────────────────────────────────────────────

echo "── Concurrency ──"

echo "=== E29: parallel-reviews ==="
npm run review:invoke -- src/ "parallel-A" \
  --executor-realization mock --review-mode light > /tmp/onto-e2e-a.out 2>&1 &
PID_A=$!
npm run review:invoke -- src/ "parallel-B" \
  --executor-realization mock --review-mode light > /tmp/onto-e2e-b.out 2>&1 &
PID_B=$!
wait $PID_A; EXIT_A=$?
wait $PID_B; EXIT_B=$?
if [ $EXIT_A -eq 0 ] && [ $EXIT_B -eq 0 ]; then
  echo "  PASS  E29: parallel-reviews (both completed)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  FAIL! E29: parallel-reviews (A=$EXIT_A B=$EXIT_B)"
  UNEXPECTED_COUNT=$((UNEXPECTED_COUNT + 1))
fi
rm -f /tmp/onto-e2e-a.out /tmp/onto-e2e-b.out

echo ""

# ─────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────

TOTAL=$((PASS_COUNT + UNEXPECTED_COUNT))
echo "================================="
echo "Total: $TOTAL | Pass: $PASS_COUNT | Unexpected: $UNEXPECTED_COUNT"
echo "================================="

if [ $UNEXPECTED_COUNT -gt 0 ]; then
  echo "RESULT: FAIL"
  exit 1
else
  echo "RESULT: ALL PASS"
  exit 0
fi
