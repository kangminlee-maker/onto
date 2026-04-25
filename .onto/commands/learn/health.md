<!-- GENERATED from src/core-runtime/cli/command-catalog.ts. Edit catalog or template, then run `npm run generate:catalog`. derive-hash=a9edffcbe59603c96afbe3b5b141f51639b2e7d20e9e148264d69803c2e3e026 -->

# /onto:learn:health

Shows learning pool health dashboard. No agent spawning required.

`$ARGUMENTS`:
- (empty): Global learnings health
- "project": Project learnings health

**Deterministic CLI path (preferred)**:
```
onto health          # Global learnings
onto health project  # Project learnings
```
CLI implementation: `src/core-runtime/cli/health.ts`. Rule owner: `.onto/processes/learn/health.md`.

**Prompt-backed fallback**: Plugin install resolves via `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}`. Set `ONTO_PLUGIN_DIR` env var when installed in a custom location. If CLI is unavailable, read `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/.onto/processes/learn/health.md` and execute per spec.
