/**
 * Phase 3 Promote — Health snapshot time-series accumulator.
 *
 * Design authority:
 *   - Task 2 specification: HealthSnapshot 시계열 누적
 *
 * Responsibility:
 *   - Append each promote session's HealthSnapshot to a JSONL file so
 *     operators can track health trends over time.
 *
 * Scope:
 *   - Single-function module. Appends one line per call.
 *   - Creates the file and parent directory if they don't exist.
 *   - No complex error handling — fs.appendFileSync throws on I/O failure
 *     and the caller decides whether to surface or swallow.
 *
 * File location: {projectRoot}/.onto/health-history.jsonl
 * Line format:   {"session_id":"...","timestamp":"ISO-8601","snapshot":{...}}
 */

import fs from "node:fs";
import path from "node:path";

import type { HealthSnapshot } from "./types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEALTH_HISTORY_FILENAME = "health-history.jsonl";

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Append a single HealthSnapshot entry to the JSONL history file.
 *
 * Each line is a self-contained JSON object:
 *   { "session_id": "...", "timestamp": "ISO-8601", "snapshot": { ... } }
 *
 * The file is created if it does not exist. Parent directories are created
 * with `recursive: true`.
 */
export function appendHealthHistory(
  projectRoot: string,
  sessionId: string,
  snapshot: HealthSnapshot,
): void {
  const ontoDir = path.join(projectRoot, ".onto");
  fs.mkdirSync(ontoDir, { recursive: true });

  const filePath = path.join(ontoDir, HEALTH_HISTORY_FILENAME);

  const entry = {
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    snapshot,
  };

  fs.appendFileSync(filePath, JSON.stringify(entry) + "\n", "utf-8");
}
