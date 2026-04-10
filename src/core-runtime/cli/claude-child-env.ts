/**
 * Shared utilities for spawning Claude Code child processes.
 *
 * Used by both subagent-review-unit-executor and agent-teams-review-unit-executor
 * to build a clean environment for child `claude` processes.
 */

import { readFileSync } from "node:fs";

export function resolveSetupToken(): string | undefined {
  const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const candidatePaths = [
    process.env.CLAUDE_CONFIG_DIR
      ? `${process.env.CLAUDE_CONFIG_DIR}/.oauth-token`
      : "",
    `${homeDir}/.claude-1/.oauth-token`,
    `${homeDir}/.claude-2/.oauth-token`,
    `${homeDir}/.claude/.oauth-token`,
  ].filter(Boolean);

  for (const tokenPath of candidatePaths) {
    try {
      const token = readFileSync(tokenPath, "utf8").trim();
      if (token.startsWith("sk-ant-")) {
        return token;
      }
    } catch { /* continue */ }
  }
  return undefined;
}

export function buildClaudeChildEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  delete env.CLAUDE_CODE_EXECPATH;
  if (!env.CLAUDE_CODE_OAUTH_TOKEN) {
    const setupToken = resolveSetupToken();
    if (setupToken) {
      env.CLAUDE_CODE_OAUTH_TOKEN = setupToken;
    }
  }
  return env;
}
