/**
 * Recoverability checkpoint — DD-16.
 *
 * Design authority:
 *   - learn-phase3-design-v9.md DD-16 (transient CheckpointPreparationResult)
 *   - learn-phase3-design-v8.md DD-16 (preparation vs artifact split)
 *   - learn-phase3-design-v7.md DD-16 (manifest_path + protection + retention)
 *
 * Responsibility:
 *   - Snapshot mutable roots (global/project learnings, audit-state) to a
 *     timestamped backup directory before Phase B mutates anything
 *   - Emit a restore-manifest.yaml so recovery has a single canonical seat
 *     for restore commands (RESTORE-MANIFEST-01)
 *   - Track protection state so prune respects active sessions and
 *     unrecoverable failures (BACKUP-PROTECTION-01)
 *   - Apply retention policy (keep_last_n + keep_for_days + storage budget)
 *     and append a prune-log entry per pruned session
 *
 * Transient vs persisted (v9 SYN-DIS-01):
 *   - CheckpointPreparationResult is a transient helper. Caller consumes it
 *     within the same function and discards. Not registry-registered.
 *   - RecoverabilityCheckpoint is the persisted artifact (via restore-manifest
 *     and backup-metadata).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

import { REGISTRY } from "./artifact-registry.js";
import {
  DEFAULT_AUDIT_STATE_PATH,
} from "./audit-state.js";
import type {
  RecoverabilityCheckpoint,
  RestoreManifest,
  BackupEntry,
  BackupMetadata,
  BackupRetentionPolicy,
  PruneLogEntry,
  ProtectionReason,
} from "../promote/types.js";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * PROVISIONAL — see DD-16 v6 RETENTION-POLICY-01. Defaults are calibrated to
 * "small project, regular promote cadence" assumptions. Operators should
 * tune these per environment after the first 1-2 production iterations.
 */
export const DEFAULT_RETENTION: BackupRetentionPolicy = {
  backup_storage_max_bytes: 1073741824, // 1 GiB
  keep_last_n: 10,
  keep_for_days: 30,
};

export const BACKUP_ROOT = path.join(os.homedir(), ".onto", "backups");
export const PRUNE_LOG_PATH = path.join(BACKUP_ROOT, ".prune-log.jsonl");

// ---------------------------------------------------------------------------
// Transient preparation result
// ---------------------------------------------------------------------------

/**
 * Transient helper. NOT persisted, NOT registry-registered.
 *
 * The caller of createRecoverabilityCheckpoint() consumes this within the
 * same function and discards it. For persisted recovery state, use
 * RecoverabilityCheckpoint (DD-16) or RecoveryResolution (DD-23).
 */
export interface CheckpointPreparationResult {
  kind: "created" | "no_target";
  session_id: string;
  attempted_at: string;
  checkpoint: RecoverabilityCheckpoint | null;
  no_target_reason: string | null;
}

// ---------------------------------------------------------------------------
// Checkpoint creation
// ---------------------------------------------------------------------------

interface CheckpointTarget {
  source_kind: BackupEntry["source_kind"];
  source_path: string;
  is_directory: boolean;
}

function enumerateMutableRoots(projectRoot: string): CheckpointTarget[] {
  const targets: CheckpointTarget[] = [];

  const globalLearnings = path.join(os.homedir(), ".onto", "learnings");
  if (fs.existsSync(globalLearnings)) {
    targets.push({
      source_kind: "global_learnings",
      source_path: globalLearnings,
      is_directory: true,
    });
  }

  const projectLearnings = path.join(projectRoot, ".onto", "learnings");
  if (fs.existsSync(projectLearnings)) {
    targets.push({
      source_kind: "project_learnings",
      source_path: projectLearnings,
      is_directory: true,
    });
  }

  if (fs.existsSync(DEFAULT_AUDIT_STATE_PATH)) {
    targets.push({
      source_kind: "audit_state",
      source_path: DEFAULT_AUDIT_STATE_PATH,
      is_directory: false,
    });
  }

  const domainDocsRoot = path.join(os.homedir(), ".onto", "domains");
  if (fs.existsSync(domainDocsRoot)) {
    targets.push({
      source_kind: "domain_docs",
      source_path: domainDocsRoot,
      is_directory: true,
    });
  }

  return targets;
}

function copyDir(src: string, dst: string): { bytes: number; files: number } {
  let bytes = 0;
  let files = 0;
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) {
      const r = copyDir(s, d);
      bytes += r.bytes;
      files += r.files;
    } else if (e.isFile()) {
      fs.copyFileSync(s, d);
      bytes += fs.statSync(s).size;
      files += 1;
    }
  }
  return { bytes, files };
}

function copyFile(src: string, dst: string): { bytes: number; files: number } {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  return { bytes: fs.statSync(src).size, files: 1 };
}

function buildRestoreCommand(target: CheckpointTarget, backupPath: string): string {
  if (target.is_directory) {
    return `rm -rf ${target.source_path} && cp -R ${backupPath} ${target.source_path}`;
  }
  return `cp ${backupPath} ${target.source_path}`;
}

/**
 * Create a checkpoint for a Phase B attempt.
 *
 * Returns CheckpointPreparationResult — transient. The caller is expected to
 * read prep.checkpoint, attach it to ApplyExecutionState, and let prep go out
 * of scope. Do not persist this struct.
 */
export async function createRecoverabilityCheckpoint(
  sessionId: string,
  projectRoot: string,
  attemptId: string,
  generation: number = 0,
): Promise<CheckpointPreparationResult> {
  const attemptedAt = new Date().toISOString();
  const targets = enumerateMutableRoots(projectRoot);

  if (targets.length === 0) {
    return {
      kind: "no_target",
      session_id: sessionId,
      attempted_at: attemptedAt,
      checkpoint: null,
      no_target_reason:
        "No mutable roots exist (fresh user, no learnings yet)",
    };
  }

  const checkpointDir = path.join(BACKUP_ROOT, sessionId);
  fs.mkdirSync(checkpointDir, { recursive: true });

  const backups: BackupEntry[] = [];
  let totalBytes = 0;

  for (const target of targets) {
    const baseName = path.basename(target.source_path);
    const backupName = `${target.source_kind}__${baseName}`;
    const backupPath = path.join(checkpointDir, backupName);
    const result = target.is_directory
      ? copyDir(target.source_path, backupPath)
      : copyFile(target.source_path, backupPath);
    totalBytes += result.bytes;
    backups.push({
      source_kind: target.source_kind,
      source_path: target.source_path,
      backup_path: backupPath,
      bytes: result.bytes,
      file_count: result.files,
      restore_command: buildRestoreCommand(target, backupPath),
    });
  }

  const manifestPath = path.join(checkpointDir, "restore-manifest.yaml");
  const restoreOrder: BackupEntry["source_kind"][] = backups
    .map((b) => b.source_kind)
    .sort(); // alphabetic — v9 §14.3 recommendation
  const manifest: RestoreManifest = {
    schema_version: "1",
    session_id: sessionId,
    attempt_id: attemptId,
    generation,
    created_at: attemptedAt,
    backups,
    restore_order: restoreOrder,
    verification_after_restore: backups.map((b) => ({
      command: `ls ${b.source_path}`,
      expected: `${b.file_count} files`,
    })),
  };
  REGISTRY.saveToFile("restore_manifest", manifestPath, manifest);

  const metadata: BackupMetadata = {
    schema_version: "1",
    session_id: sessionId,
    created_at: attemptedAt,
    total_bytes: totalBytes,
    protected: true,
    protection_reason: "active_session",
    protection_set_at: attemptedAt,
  };
  REGISTRY.saveToFile(
    "backup_metadata",
    path.join(checkpointDir, "backup-metadata.yaml"),
    metadata,
  );

  const checkpoint: RecoverabilityCheckpoint = {
    schema_version: "1",
    session_id: sessionId,
    created_at: attemptedAt,
    manifest_path: manifestPath,
    backups,
    total_bytes: totalBytes,
    protected: true,
    protection_reason: "active_session",
    attempt_id: attemptId,
    generation,
  };

  return {
    kind: "created",
    session_id: sessionId,
    attempted_at: attemptedAt,
    checkpoint,
    no_target_reason: null,
  };
}

// ---------------------------------------------------------------------------
// Protection state transitions
// ---------------------------------------------------------------------------

export function setBackupProtection(
  sessionId: string,
  protectionReason: ProtectionReason | null,
): void {
  const metadataPath = path.join(BACKUP_ROOT, sessionId, "backup-metadata.yaml");
  if (!fs.existsSync(metadataPath)) return;
  const metadata = REGISTRY.loadFromFile<BackupMetadata>(
    "backup_metadata",
    metadataPath,
  );
  metadata.protected = protectionReason !== null;
  metadata.protection_reason = protectionReason;
  metadata.protection_set_at = new Date().toISOString();
  REGISTRY.saveToFile("backup_metadata", metadataPath, metadata);
}

// ---------------------------------------------------------------------------
// Restore command builder
// ---------------------------------------------------------------------------

/**
 * Build the multi-step restore guidance for a checkpoint.
 *
 * SYN-C3 (v8): MUST use checkpoint.manifest_path. Do not derive paths from
 * backup file names.
 */
export function buildMultiBackupRestoreCommands(
  checkpoint: RecoverabilityCheckpoint,
): string[] {
  return [
    `  1. Read restore manifest:`,
    `     cat ${checkpoint.manifest_path}`,
    `  2. Manifest contains restore commands in declared order.`,
    `  3. Execute commands one by one and verify each step.`,
  ];
}

// ---------------------------------------------------------------------------
// Prune
// ---------------------------------------------------------------------------

interface PruneResult {
  pruned: number;
  kept_unprotected: number;
  kept_protected: number;
  bytes_freed: number;
}

interface BackupDirInfo {
  session_id: string;
  path: string;
  metadata: BackupMetadata;
  mtime: Date;
  size_bytes: number;
}

function listBackupDirs(): BackupDirInfo[] {
  if (!fs.existsSync(BACKUP_ROOT)) return [];
  const entries = fs.readdirSync(BACKUP_ROOT, { withFileTypes: true });
  const result: BackupDirInfo[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = path.join(BACKUP_ROOT, e.name);
    const metadataPath = path.join(dir, "backup-metadata.yaml");
    if (!fs.existsSync(metadataPath)) continue;
    try {
      const metadata = REGISTRY.loadFromFile<BackupMetadata>(
        "backup_metadata",
        metadataPath,
      );
      const stat = fs.statSync(dir);
      result.push({
        session_id: e.name,
        path: dir,
        metadata,
        mtime: stat.mtime,
        size_bytes: metadata.total_bytes,
      });
    } catch {
      // Corrupted metadata: skip and let manual cleanup handle it.
    }
  }
  return result;
}

export function appendPruneLog(entry: Omit<PruneLogEntry, "schema_version">): void {
  const fullEntry: PruneLogEntry = { schema_version: "1", ...entry };
  REGISTRY.appendToFile("prune_log_entry", PRUNE_LOG_PATH, fullEntry);
}

export async function pruneBackups(
  policy: BackupRetentionPolicy = DEFAULT_RETENTION,
): Promise<PruneResult> {
  const all = listBackupDirs();
  const protectedBackups = all.filter((b) => b.metadata.protected);
  const candidates = all
    .filter((b) => !b.metadata.protected)
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // newest first

  const now = Date.now();
  const cutoffMs = policy.keep_for_days * 24 * 60 * 60 * 1000;

  // Decide which to keep using keep_last_n + keep_for_days first
  const toKeep: BackupDirInfo[] = [];
  const toPrune: BackupDirInfo[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]!;
    if (i < policy.keep_last_n && now - c.mtime.getTime() < cutoffMs) {
      toKeep.push(c);
    } else {
      toPrune.push(c);
    }
  }

  // Storage-pressure pass: if total bytes still over limit, prune oldest
  // unprotected until under threshold.
  let totalBytes =
    toKeep.reduce((s, c) => s + c.size_bytes, 0) +
    protectedBackups.reduce((s, c) => s + c.size_bytes, 0);
  const keepSorted = toKeep.sort(
    (a, b) => a.mtime.getTime() - b.mtime.getTime(),
  ); // oldest first
  while (totalBytes > policy.backup_storage_max_bytes && keepSorted.length > 0) {
    const victim = keepSorted.shift()!;
    toPrune.push(victim);
    totalBytes -= victim.size_bytes;
  }

  let bytesFreed = 0;
  for (const v of toPrune) {
    fs.rmSync(v.path, { recursive: true, force: true });
    bytesFreed += v.size_bytes;
    appendPruneLog({
      session_id: v.session_id,
      pruned_at: new Date().toISOString(),
      reason:
        now - v.mtime.getTime() >= cutoffMs
          ? "keep_for_days_exceeded"
          : keepSorted.length > 0 || toKeep.length > policy.keep_last_n
            ? "keep_last_n_exceeded"
            : "storage_max_bytes_exceeded",
      bytes_freed: v.size_bytes,
    });
  }

  return {
    pruned: toPrune.length,
    kept_unprotected: keepSorted.length,
    kept_protected: protectedBackups.length,
    bytes_freed: bytesFreed,
  };
}

/**
 * Generate a checkpoint id for cases where a real attempt id is not yet known.
 * Used by tests and dry-run paths.
 */
export function generateCheckpointId(): string {
  return crypto.randomBytes(8).toString("hex");
}
