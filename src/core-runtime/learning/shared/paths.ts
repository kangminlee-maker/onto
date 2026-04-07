/**
 * Learning file path resolution — shared by loader (consumption) and extractor (accumulation).
 *
 * C3 해소: 단일 resolveWritePaths(). Dual-write 금지.
 * CONS-4: resolveRawPaths() 내부 헬퍼로 경로 라우팅 단일화.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ---------------------------------------------------------------------------
// Internal: single path computation (CONS-4 dedup)
// ---------------------------------------------------------------------------

interface RawPaths {
  userDir: string;
  projectDir: string;
  userPath: string;
  projectPath: string;
  projectDirExists: boolean;
}

function resolveRawPaths(agentId: string, projectRoot: string): RawPaths {
  const userDir = path.join(os.homedir(), ".onto", "learnings");
  const projectDir = path.join(projectRoot, ".onto", "learnings");
  const userPath = path.join(userDir, `${agentId}.md`);
  const projectPath = path.join(projectDir, `${agentId}.md`);
  const projectDirExists = fs.existsSync(projectDir);
  return { userDir, projectDir, userPath, projectPath, projectDirExists };
}

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
  const raw = resolveRawPaths(agentId, projectRoot);
  return {
    user_path: fs.existsSync(raw.userPath) ? raw.userPath : null,
    project_path: fs.existsSync(raw.projectPath) ? raw.projectPath : null,
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
  const raw = resolveRawPaths(agentId, projectRoot);

  const readPaths: string[] = [];
  if (fs.existsSync(raw.userPath)) readPaths.push(raw.userPath);
  if (fs.existsSync(raw.projectPath)) readPaths.push(raw.projectPath);

  if (raw.projectDirExists) {
    return { write_path: raw.projectPath, write_scope: "project", read_paths: readPaths };
  }

  return { write_path: raw.userPath, write_scope: "user", read_paths: readPaths };
}
