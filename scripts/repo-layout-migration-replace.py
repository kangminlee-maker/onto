#!/usr/bin/env python3
"""
Repo-layout migration bulk path replacer.

Phase-agnostic helper for the 8-phase onto repo layout migration. Rewrites
repo-source path references from their legacy top-level shape to the
Phase-3+ `.onto/` canonical shape.

Why this tool exists
--------------------
Each migration phase (Phase 1 commands, Phase 2 domains, Phase 3 roles,
Phase 4 processes, Phase 5 design-principles→principles, Phase 6 authority)
rewrites hundreds of path references across 100+ files. Hand-editing is
error-prone and fails to preserve the "scope ≠ intent" invariant that
Codex review keeps flagging. This script encodes the rules once.

Usage
-----
    python3 scripts/repo-layout-migration-replace.py \
        --old 'design-principles/' \
        --new '.onto/principles/' \
        [--changelog-preserve-file authority/core-lexicon.yaml:40] \
        [--extra-extensions .example,.toml,.ini]

The `--old` pattern MUST include the trailing slash — this is the
"substring-safe" contract. It means the pattern only matches directory
references (never raw words like "processes" embedded in prose or
"principles" inside `llm-runtime-interface-principles.md`).

The `--changelog-preserve-file` arg preserves the first N lines of a
file from replacement — used for `authority/core-lexicon.yaml` whose
historical changelog entries at the top must remain verbatim.

Marker-based double-prefix prevention
-------------------------------------
If the `--new` prefix contains the `--old` prefix as a substring (rare
but possible for some rename patterns), a naive `str.replace(old, new)`
would produce ".onto/processes/.onto/processes/..." on an already-new
reference. The script guards against this by:
  1. Protecting any pre-existing `--new` occurrences with a NUL marker
  2. Replacing `--old` → `--new`
  3. Restoring the marker back to `--new`

For simple Phase 1-4 patterns (roles/, processes/, domains/) this guard
is a no-op. For Phase 5 (design-principles/ → .onto/principles/) and
Phase 6 (authority/ → .onto/authority/) the guard is load-bearing.

Default exclusions
------------------
- .git/, node_modules/, dist/, dist.bak-*/ — not tracked or irrelevant
- development-records/ — historical documents, must remain verbatim
- Files listed in EXCLUDE_FILES (the script's own infrastructure edits
  are handled separately to avoid self-modification surprises)
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from typing import Optional


DEFAULT_EXTENSIONS = {
    ".md", ".yaml", ".yml", ".ts", ".sh", ".json",
    ".example", ".toml", ".ini", ".env",
}

DEFAULT_EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "development-records",
}

# Files the migration already handles separately (infra, guard). Listed
# here so a bulk run doesn't touch them twice.
DEFAULT_EXCLUDE_FILES = {
    "package.json",
    ".github/workflows/lint-output-language-boundary.yml",
    "scripts/lint-output-language-boundary.ts",
    "scripts/check-onto-allowlist.sh",
    "scripts/repo-layout-migration-replace.py",  # self-modification guard
}

MARKER = "\x00ONTO_LAYOUT_MIGRATION_MARKER\x00"


@dataclass
class ChangelogRule:
    """Preserve the first `line_count` lines (1-indexed) of `rel_path`."""

    rel_path: str
    line_count: int


def should_skip_dir(name: str) -> bool:
    return name in DEFAULT_EXCLUDE_DIRS or name.startswith("dist.bak-")


def replace_preserving_changelog(
    content: str,
    old: str,
    new: str,
    preserve_lines: int,
) -> tuple[str, int]:
    """Replace `old` with `new` outside the first `preserve_lines` lines.

    Uses the marker technique to prevent double-prefixing when `new`
    contains `old` as a substring.
    """
    lines = content.splitlines(keepends=True)
    if preserve_lines > 0:
        head = "".join(lines[:preserve_lines])
        body = "".join(lines[preserve_lines:])
    else:
        head, body = "", content

    before = body.count(old) - body.count(new)
    # Marker-based substitution
    body = body.replace(new, MARKER)
    body = body.replace(old, new)
    body = body.replace(MARKER, new)
    after = body.count(old) - body.count(new)
    changes = max(0, before - after)

    return head + body, changes


def replace_in_file(
    rel_path: str,
    old: str,
    new: str,
    changelog_rules: dict[str, int],
) -> int:
    """Rewrite one file. Returns the number of replacements performed."""
    try:
        with open(rel_path, "r", encoding="utf-8") as fp:
            content = fp.read()
    except (OSError, UnicodeDecodeError):
        return 0

    # Quick check: if marker is already in content something bad happened.
    if MARKER in content:
        print(
            f"WARN: marker sentinel already present in {rel_path}, skipping",
            file=sys.stderr,
        )
        return 0

    if old not in content:
        return 0

    preserve_lines = changelog_rules.get(rel_path, 0)
    new_content, changes = replace_preserving_changelog(
        content, old, new, preserve_lines,
    )

    if new_content == content:
        return 0

    with open(rel_path, "w", encoding="utf-8") as fp:
        fp.write(new_content)
    return changes


def walk_and_replace(
    old: str,
    new: str,
    extensions: set[str],
    exclude_files: set[str],
    changelog_rules: dict[str, int],
    root: str = ".",
) -> tuple[int, int]:
    """Return (files_changed, total_replacements)."""
    if not old.endswith("/"):
        raise ValueError(
            f"--old pattern must end with '/' (substring-safe contract): got {old!r}"
        )

    files_changed = 0
    total_changes = 0

    for dirpath, dirnames, filenames in os.walk(root):
        # Prune
        dirnames[:] = [d for d in dirnames if not should_skip_dir(d)]

        for fname in filenames:
            ext = os.path.splitext(fname)[1]
            if ext not in extensions:
                continue
            rel = os.path.relpath(os.path.join(dirpath, fname), root)
            if rel in exclude_files:
                continue

            changes = replace_in_file(rel, old, new, changelog_rules)
            if changes > 0:
                files_changed += 1
                total_changes += changes
                print(f"  {rel}  (+{changes})")

    return files_changed, total_changes


def parse_changelog_args(values: list[str]) -> dict[str, int]:
    """Parse `--changelog-preserve-file path:line_count` arguments."""
    rules: dict[str, int] = {}
    for v in values:
        if ":" not in v:
            raise argparse.ArgumentTypeError(
                f"--changelog-preserve-file expects 'path:line_count', got {v!r}"
            )
        path_part, count_part = v.rsplit(":", 1)
        try:
            count = int(count_part)
        except ValueError as exc:
            raise argparse.ArgumentTypeError(
                f"invalid line count in {v!r}: {exc}"
            ) from exc
        rules[path_part] = count
    return rules


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__ or "")
    parser.add_argument(
        "--old",
        required=True,
        help="Legacy path prefix (MUST end with '/'). Example: 'design-principles/'",
    )
    parser.add_argument(
        "--new",
        required=True,
        help="Canonical path prefix. Example: '.onto/principles/'",
    )
    parser.add_argument(
        "--changelog-preserve-file",
        action="append",
        default=[],
        help="Preserve first N lines of FILE (format: FILE:N). "
        "Repeatable. Typical use: authority/core-lexicon.yaml:40",
    )
    parser.add_argument(
        "--extra-extensions",
        default="",
        help="Comma-separated extra extensions to include (e.g., '.mdx,.cfg')",
    )
    parser.add_argument(
        "--exclude-file",
        action="append",
        default=[],
        help="Additional files to exclude (repeatable). Adds to DEFAULT_EXCLUDE_FILES.",
    )
    parser.add_argument(
        "--root",
        default=".",
        help="Root directory to scan (default: current directory)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report changes but do not write files",
    )

    args = parser.parse_args(argv)

    extensions = set(DEFAULT_EXTENSIONS)
    if args.extra_extensions:
        extensions.update(
            s.strip() for s in args.extra_extensions.split(",") if s.strip()
        )

    exclude_files = set(DEFAULT_EXCLUDE_FILES)
    exclude_files.update(args.exclude_file)

    try:
        changelog_rules = parse_changelog_args(args.changelog_preserve_file)
    except argparse.ArgumentTypeError as exc:
        parser.error(str(exc))

    if args.dry_run:
        print("[dry-run] Would scan — no files will be modified.")
        # Fake replace_in_file to avoid writes
        orig = replace_in_file.__code__
        # Simple no-op for dry run
        def _noop(rel_path: str, old: str, new: str, changelog_rules: dict[str, int]) -> int:
            try:
                with open(rel_path, "r", encoding="utf-8") as fp:
                    content = fp.read()
            except (OSError, UnicodeDecodeError):
                return 0
            if old not in content:
                return 0
            preserve_lines = changelog_rules.get(rel_path, 0)
            lines = content.splitlines(keepends=True)
            body = "".join(lines[preserve_lines:]) if preserve_lines else content
            count = body.count(old) - body.count(new)
            return max(0, count)

        globals()["replace_in_file"] = _noop  # type: ignore

    print(f"[replace] '{args.old}' → '{args.new}'")
    print(f"[replace] extensions: {sorted(extensions)}")
    if changelog_rules:
        for k, v in changelog_rules.items():
            print(f"[replace] preserve first {v} lines of {k}")
    print()

    try:
        files, total = walk_and_replace(
            old=args.old,
            new=args.new,
            extensions=extensions,
            exclude_files=exclude_files,
            changelog_rules=changelog_rules,
            root=args.root,
        )
    except ValueError as exc:
        parser.error(str(exc))
        return 2

    verb = "would change" if args.dry_run else "changed"
    print()
    print(f"[replace] {verb}: {files} file(s), {total} occurrence(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
