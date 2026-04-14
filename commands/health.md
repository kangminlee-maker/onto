# /onto:health

Shows learning pool health dashboard. No agent spawning required.

`$ARGUMENTS`:
- (empty): Global learnings health
- "project": Project learnings health

**Deterministic CLI path (preferred)**:
```
onto health          # Global learnings
onto health project  # Project learnings
```
CLI implementation: `src/core-runtime/cli/health.ts`. Rule owner: `processes/health.md`.

**Prompt-backed fallback**: If CLI is unavailable, read `~/.claude/plugins/onto/processes/health.md` and execute per spec.
