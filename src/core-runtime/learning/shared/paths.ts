/**
 * Learning file path resolution — shared by loader (consumption) and extractor (accumulation).
 *
 * C3 해소: 단일 resolveWritePaths(). Dual-write 금지.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ---------------------------------------------------------------------------
// Read paths (consumption — loader.ts C-1)
// ---------------------------------------------------------------------------

export interface LearningReadPaths {
  user_path: string | null;
  project_path: string | null;
}

/**
 * Resolve existing learning file paths for a single agent.
 * Returns null for paths that don't exist.
 */
export function resolveLearningFilePaths(
  agentId: string,
  projectRoot: string,
): LearningReadPaths {
  const userPath = path.join(os.homedir(), ".onto", "learnings", `${agentId}.md`);
  const projectPath = path.join(projectRoot, ".onto", "learnings", `${agentId}.md`);
  return {
    user_path: fs.existsSync(userPath) ? userPath : null,
    project_path: fs.existsSync(projectPath) ? projectPath : null,
  };
}

// ---------------------------------------------------------------------------
// Write paths (accumulation — extractor.ts A-13)
// ---------------------------------------------------------------------------

export interface LearningWritePaths {
  write_path: string;
  write_scope: "user" | "project";
  read_paths: string[];
}

/**
 * Resolve the single write target for learning accumulation.
 *
 * Routing: project `.onto/learnings/` directory exists → project scope, else → user scope.
 * read_paths: both user and project (A-10 dedup). Dual-write 금지.
 */
export function resolveWritePaths(
  agentId: string,
  projectRoot: string,
): LearningWritePaths {
  const userDir = path.join(os.homedir(), ".onto", "learnings");
  const projectDir = path.join(projectRoot, ".onto", "learnings");
  const userPath = path.join(userDir, `${agentId}.md`);
  const projectPath = path.join(projectDir, `${agentId}.md`);

  // Collect all existing paths for dedup reads
  const readPaths: string[] = [];
  if (fs.existsSync(userPath)) readPaths.push(userPath);
  if (fs.existsSync(projectPath)) readPaths.push(projectPath);

  // Route to project if the project learnings directory exists
  if (fs.existsSync(projectDir)) {
    return { write_path: projectPath, write_scope: "project", read_paths: readPaths };
  }

  return { write_path: userPath, write_scope: "user", read_paths: readPaths };
}
