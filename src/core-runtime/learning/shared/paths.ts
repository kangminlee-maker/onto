/**
 * Learning file path resolution — shared by loader (consumption) and extractor (accumulation).
 *
 * C3 해소: 단일 resolveWritePaths(). Dual-write 금지.
 * CONS-4: resolveRawPaths() 내부 헬퍼로 경로 라우팅 단일화.
 * Phase 0 dual-read: canonical (bare) ID 우선, onto_ fallback.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ---------------------------------------------------------------------------
// Internal: ID canonicalization (Phase 0 dual-read)
// ---------------------------------------------------------------------------

/** Strip "onto_" prefix to yield canonical bare form. Idempotent. */
function canonicalizeAgentId(agentId: string): string {
  return agentId.startsWith("onto_") ? agentId.slice(5) : agentId;
}

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

/**
 * Resolve a single file path with dual-read fallback:
 * canonical (bare ID) first, then onto_ legacy.
 * Returns the first existing path, or the canonical path if neither exists.
 */
function resolveWithFallback(dir: string, agentId: string): string {
  const canonicalId = canonicalizeAgentId(agentId);
  const canonicalPath = path.join(dir, `${canonicalId}.md`);
  if (fs.existsSync(canonicalPath)) return canonicalPath;
  const legacyPath = path.join(dir, `onto_${canonicalId}.md`);
  if (fs.existsSync(legacyPath)) return legacyPath;
  return canonicalPath; // canonical preferred even when neither exists
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
 * Phase 0: tries canonical (bare) ID first, then onto_ fallback.
 */
export function resolveLearningFilePaths(
  agentId: string,
  projectRoot: string,
): LearningReadPaths {
  const raw = resolveRawPaths(agentId, projectRoot);
  const userResolved = resolveWithFallback(raw.userDir, agentId);
  const projectResolved = raw.projectDirExists
    ? resolveWithFallback(raw.projectDir, agentId)
    : null;
  return {
    user_path: fs.existsSync(userResolved) ? userResolved : null,
    project_path: projectResolved && fs.existsSync(projectResolved) ? projectResolved : null,
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
 * Project Locality Principle (§2.2): always write to project scope.
 * If `{project}/.onto/learnings/` does not exist, create it.
 * read_paths: both user and project (A-10 dedup). Dual-write 금지.
 * Phase 0: write always uses canonical (bare) ID. Read checks both bare + onto_ fallback.
 */
export function resolveWritePaths(
  agentId: string,
  projectRoot: string,
): LearningWritePaths {
  const canonicalId = canonicalizeAgentId(agentId);
  const raw = resolveRawPaths(canonicalId, projectRoot);

  // Read paths: collect all existing files (canonical + legacy) for dedup
  const readPaths: string[] = [];
  const userResolved = resolveWithFallback(raw.userDir, agentId);
  if (fs.existsSync(userResolved)) readPaths.push(userResolved);
  if (raw.projectDirExists) {
    const projectResolved = resolveWithFallback(raw.projectDir, agentId);
    if (fs.existsSync(projectResolved)) readPaths.push(projectResolved);
  }

  // Write path: always project scope (Project Locality Principle §2.2).
  // Create the directory if it doesn't exist yet.
  if (!raw.projectDirExists) {
    fs.mkdirSync(raw.projectDir, { recursive: true });
  }
  return { write_path: raw.projectPath, write_scope: "project", read_paths: readPaths };
}
