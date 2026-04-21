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
The marker mechanism is a generic code path that runs on every phase,
but the condition under which it is *load-bearing* is narrow: only
when the `--new` prefix contains the `--old` prefix as a substring. A
naive `str.replace(old, new)` under that condition would produce
".onto/authority/.onto/authority/..." on an already-new reference.
The script guards against this by:
  1. Protecting any pre-existing `--new` occurrences with a NUL marker
  2. Replacing `--old` → `--new`
  3. Restoring the marker back to `--new`

Load-bearing vs no-op by phase:
  - Phase 1-4 (commands/, domains/, roles/, processes/): `.onto/<X>/`
    does *not* contain `<X>/` as a substring in the "new → old"
    direction — the guard is a no-op.
  - Phase 5 (design-principles/ → .onto/principles/): the new prefix
    does not contain `design-principles/` — the guard is also a no-op
    here (despite the dir name change).
  - Phase 6 (authority/ → .onto/authority/): the new prefix
    `.onto/authority/` contains the old `authority/` as a substring —
    the guard is **load-bearing**.

Default exclusions
------------------
- .git/, node_modules/, dist/, dist.bak-*/ — not tracked or irrelevant
- development-records/ — historical documents, must remain verbatim
- .onto/review/ — historical audit artifacts from past review
  sessions. Rewriting them would corrupt audit continuity by replacing
  "the truth at the time" with "the truth after the migration".
- Files listed in EXCLUDE_FILES (the script's own infrastructure edits
  are handled separately to avoid self-modification surprises)

Extensionless tracked entrypoints
---------------------------------
`DEFAULT_EXTENSIONS` only covers suffixed files. Executables like
`bin/onto` have no extension but still contain path refs. Pass
`--include-file bin/onto` (repeatable) to force-include such files
regardless of extension. Default runs already include the repo's
known extensionless entrypoints via `DEFAULT_INCLUDE_FILES`.
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

# Path prefixes (root-relative) that are pruned during walk even though
# they are not top-level dirs. `.onto/review/` holds past review session
# artifacts — rewriting them would destroy audit continuity.
DEFAULT_EXCLUDE_PATH_PREFIXES = (
    ".onto/review/",
)

# Files the migration already handles separately (infra, guard). Listed
# here so a bulk run doesn't touch them twice.
DEFAULT_EXCLUDE_FILES = {
    "package.json",
    ".github/workflows/lint-output-language-boundary.yml",
    "scripts/lint-output-language-boundary.ts",
    "scripts/check-onto-allowlist.sh",
    "scripts/repo-layout-migration-replace.py",  # self-modification guard
    # Legacy dir name SSOT — these define the `.onto/<kind>/ ← legacy/`
    # mapping itself. Rewriting the legacy strings here would break the
    # dual-path fallback that lets old projects keep working until Phase 7.
    "src/core-runtime/discovery/installation-paths.ts",
    "src/core-runtime/discovery/installation-paths.test.ts",
    # Path-level alias SSOT for the same reason.
    "src/core-runtime/discovery/path-normalization.ts",
    "src/core-runtime/discovery/path-normalization.test.ts",
}

# Extensionless tracked entrypoints that still hold path refs. Force-
# included regardless of extension so legacy references in them get
# rewritten (e.g., comments in the global CLI wrapper).
DEFAULT_INCLUDE_FILES = {
    "bin/onto",
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


def _is_under_excluded_prefix(rel: str, prefixes: tuple[str, ...]) -> bool:
    rel_posix = rel.replace(os.sep, "/")
    return any(rel_posix.startswith(p) for p in prefixes)


def walk_and_replace(
    old: str,
    new: str,
    extensions: set[str],
    exclude_files: set[str],
    include_files: set[str],
    changelog_rules: dict[str, int],
    exclude_path_prefixes: tuple[str, ...] = DEFAULT_EXCLUDE_PATH_PREFIXES,
    root: str = ".",
) -> tuple[int, int]:
    """Return (files_changed, total_replacements)."""
    if not old.endswith("/"):
        raise ValueError(
            f"--old pattern must end with '/' (substring-safe contract): got {old!r}"
        )

    files_changed = 0
    total_changes = 0
    visited: set[str] = set()

    def _process(rel: str) -> None:
        nonlocal files_changed, total_changes
        if rel in visited:
            return
        visited.add(rel)
        if rel in exclude_files:
            return
        if _is_under_excluded_prefix(rel, exclude_path_prefixes):
            return
        changes = replace_in_file(rel, old, new, changelog_rules)
        if changes > 0:
            files_changed += 1
            total_changes += changes
            print(f"  {rel}  (+{changes})")

    # Pass 1 — force-include files (extensionless entrypoints etc.)
    for rel in sorted(include_files):
        full = os.path.join(root, rel)
        if os.path.isfile(full):
            _process(rel)

    # Pass 2 — extension-based walk
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not should_skip_dir(d)]

        for fname in filenames:
            ext = os.path.splitext(fname)[1]
            if ext not in extensions:
                continue
            rel = os.path.relpath(os.path.join(dirpath, fname), root)
            _process(rel)

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
        "--include-file",
        action="append",
        default=[],
        help="Force-include a file regardless of extension (repeatable). "
        "Use for extensionless tracked entrypoints. Adds to DEFAULT_INCLUDE_FILES.",
    )
    parser.add_argument(
        "--exclude-path-prefix",
        action="append",
        default=[],
        help="Additional root-relative path prefixes to skip (repeatable). "
        "Adds to DEFAULT_EXCLUDE_PATH_PREFIXES (which already includes .onto/review/).",
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

    include_files = set(DEFAULT_INCLUDE_FILES)
    include_files.update(args.include_file)

    exclude_path_prefixes = tuple(DEFAULT_EXCLUDE_PATH_PREFIXES) + tuple(args.exclude_path_prefix)

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
            include_files=include_files,
            changelog_rules=changelog_rules,
            exclude_path_prefixes=exclude_path_prefixes,
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
