import path from "node:path";
import { fileExists, readYamlDocument } from "../review/review-artifact-utils.js";

export interface OntoConfig {
  /** Conceptual execution model: subagent | agent-teams */
  execution_realization?: string;
  host_runtime?: string;
  /** Legacy alias for execution_realization */
  execution_mode?: string;
  /** Specific executor to use: subagent | agent-teams | codex | api | mock */
  executor_realization?: string;
  /** API provider for api executor: anthropic | openai */
  api_provider?: string;
  /** LLM model to use (e.g. gpt-5.4, claude-sonnet-4-20250514) */
  model?: string;
  /** Review mode: light | full */
  review_mode?: string;
  /** Reasoning effort level passed to executor (e.g. low, medium, high, xhigh) */
  reasoning_effort?: string;
  max_concurrent_lenses?: number | string;
  domain?: string;
  secondary_domains?: string[] | string;
  domains?: string[];
  excluded_names?: string[];
  max_listing_depth?: number | string;
  max_listing_entries?: number | string;
  max_embed_lines?: number | string;
  output_language?: string;
}

async function readConfigAt(dir: string): Promise<OntoConfig> {
  const configPath = path.join(dir, ".onto", "config.yml");
  if (!(await fileExists(configPath))) {
    return {};
  }
  const raw = await readYamlDocument<Record<string, unknown>>(configPath);
  if (raw === null || typeof raw !== "object") {
    return {};
  }
  return raw as OntoConfig;
}

/**
 * 4-tier config merge (last-wins: later application overrides earlier).
 *
 * Application order (each step overrides the previous):
 * 1. Built-in defaults (not in this function — caller provides)
 * 2. {ontoHome}/.onto/config.yml — installation-level defaults
 * 3. {projectRoot}/.onto/config.yml — project-specific overrides (wins over ontoHome)
 * 4. CLI flags — handled upstream by the caller (wins over everything)
 *
 * Merge strategy:
 * - Scalar keys: last-wins (project overrides onto-home)
 * - Array keys: replacement (project replaces onto-home entirely)
 *   Exception: excluded_names uses union (concat + dedup)
 */
export async function resolveConfigChain(
  ontoHome: string,
  projectRoot: string,
): Promise<OntoConfig> {
  const homeConfig = await readConfigAt(ontoHome);
  if (ontoHome === projectRoot) {
    return homeConfig;
  }
  const projectConfig = await readConfigAt(projectRoot);

  const merged: OntoConfig = { ...homeConfig };

  for (const [key, value] of Object.entries(projectConfig)) {
    if (value === undefined || value === null) continue;

    if (key === "excluded_names") {
      // Union merge for excluded_names
      const homeNames = Array.isArray(homeConfig.excluded_names)
        ? homeConfig.excluded_names
        : [];
      const projectNames = Array.isArray(value) ? value : [];
      const union = [...new Set([...homeNames, ...projectNames])];
      (merged as Record<string, unknown>)[key] = union;
    } else {
      // All other keys: last-wins (replacement)
      (merged as Record<string, unknown>)[key] = value;
    }
  }

  return merged;
}
