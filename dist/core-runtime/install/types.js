/**
 * Shared types for `onto install` — the interactive + non-interactive
 * first-run setup command.
 *
 * Design reference: spec v3 laid out in the install command design
 * discussion (2026-04-21 session). Key decisions codified here:
 *
 *   1. Two provider channels: review (for 9-lens execution) and learn
 *      (for background tasks — learn/govern/promote). They may share
 *      a provider or be configured separately.
 *
 *   2. `main-native` is a valid ReviewProvider but NOT a valid
 *      LearnProvider. The background ladder in llm-caller.ts does not
 *      support host main-model delegation (fail-fast on missing
 *      credentials). The type-level exclusion prevents accidentally
 *      writing a learn config that would always fail at runtime.
 *
 *   3. API keys are never captured into typed decision shape — they
 *      flow via environment (env var or `.env` file) only. This keeps
 *      secrets out of logs, serialized state, and command history.
 *
 *   4. Profile scope is atomic (per config-profile.ts adoption rule) —
 *      either global owns the full profile set or project does. The
 *      scope choice is what determines where every file writes.
 */
export {};
