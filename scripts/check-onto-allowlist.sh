#!/usr/bin/env bash
# .onto/ allowlist guard — CI lint.
#
# Phase 1 of the repo-layout migration (PR #151) replaced the blanket
# `.onto/` .gitignore rule with an enumerated list of ephemeral subdirs.
# That flip made `.onto/` default-track instead of default-ignore. Without
# a guard, a contributor adding a new runtime-ephemeral directory (for
# example `.onto/cache/`) and forgetting to add it to .gitignore would
# silently start committing session artifacts.
#
# This script catches that case by verifying every tracked path under
# `.onto/` matches one of the structural subdirectory globs in ALLOWED.
# Paths outside the allowlist fail CI and the contributor sees guidance
# on whether to extend the allowlist (structural) or .gitignore (ephemeral).
#
# Usage:
#   bash scripts/check-onto-allowlist.sh
#
# Exit 0 — pass. Exit 1 — allowlist violation(s) found.

set -euo pipefail

# Structural (versioned) subdirectory globs. Each repo-layout migration
# phase (Phase 1 commands, Phase 2 domains, future roles/processes/...)
# appends its top-level directory pattern here.
ALLOWED=(
  ".onto/commands"
  ".onto/domains"
)

# Ephemeral subdirs are ignored via .gitignore (see repo root) and never
# appear in `git ls-files` output. Listed here for documentation:
#   .onto/review/       .onto/builds/       .onto/learnings/
#   .onto/govern/       .onto/reconstruct/  .onto/temp/
#   .onto/config.yml

tracked=$(git ls-files '.onto/' 2>/dev/null || true)

if [ -z "$tracked" ]; then
  echo "[allowlist-guard] PASS — no tracked files under .onto/."
  exit 0
fi

violations=()
while IFS= read -r file; do
  [ -z "$file" ] && continue
  matched=false
  for prefix in "${ALLOWED[@]}"; do
    if [[ "$file" == "$prefix"/* ]]; then
      matched=true
      break
    fi
  done
  if [ "$matched" = "false" ]; then
    violations+=("$file")
  fi
done <<< "$tracked"

total_tracked=$(printf '%s\n' "$tracked" | sed '/^$/d' | wc -l | tr -d ' ')

if [ ${#violations[@]} -gt 0 ]; then
  echo "[allowlist-guard] FAIL — $((${#violations[@]})) violation(s) out of ${total_tracked} tracked .onto/ file(s)."
  echo ""
  echo "Tracked paths outside the allowlist:"
  for v in "${violations[@]}"; do
    echo "  $v"
  done
  echo ""
  echo "Resolution guidance:"
  echo "  - STRUCTURAL (versioned): add the new top-level subdir name to ALLOWED"
  echo "    in scripts/check-onto-allowlist.sh (example: \".onto/roles\")."
  echo "  - EPHEMERAL (session artifact / cache / temp): add a pattern to"
  echo "    .gitignore and untrack the files with 'git rm --cached <path>'."
  echo ""
  echo "Policy context: .gitignore uses an enumerated-ephemeral list so structural"
  echo ".onto/X/ dirs are default-tracked. This guard catches accidental tracking"
  echo "of new ephemeral dirs that weren't listed in .gitignore."
  exit 1
fi

echo "[allowlist-guard] PASS — ${total_tracked} tracked .onto/ file(s) all within allowlist:"
for prefix in "${ALLOWED[@]}"; do
  count=$(printf '%s\n' "$tracked" | grep -c "^${prefix}/" || true)
  echo "  ${prefix}/**  ${count} file(s)"
done
exit 0
