/**
 * govern queue — ndjson I/O + projection.
 *
 * File location: .onto/govern/queue.ndjson (project-local, per project-locality-principle).
 * Format: one JSON event per line. Append-only (event-sourcing pattern, consistent with scope-runtime).
 *
 * Projection rule: group events by id. submit is the base entry.
 * If a later decide event references the same id, status transitions pending → decided.
 * Multiple decide events on the same id are not expected in v0; the latest wins (warning logged).
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  GovernDecideEvent,
  GovernEvent,
  GovernQueueEntry,
  GovernSubmitEvent,
} from "./types.js";

export function resolveQueuePath(projectRoot: string): string {
  return join(projectRoot, ".onto", "govern", "queue.ndjson");
}

export function readQueueEvents(queuePath: string): GovernEvent[] {
  if (!existsSync(queuePath)) return [];
  const raw = readFileSync(queuePath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const events: GovernEvent[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && (parsed.type === "submit" || parsed.type === "decide")) {
        events.push(parsed as GovernEvent);
      }
    } catch {
      // malformed line: skip (v0: no strict halt to preserve progress)
    }
  }
  return events;
}

export function appendQueueEvent(queuePath: string, event: GovernEvent): void {
  const dir = dirname(queuePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(queuePath, JSON.stringify(event) + "\n", "utf-8");
}

export function projectQueue(events: GovernEvent[]): GovernQueueEntry[] {
  const entries = new Map<string, GovernQueueEntry>();
  for (const ev of events) {
    if (ev.type === "submit") {
      const submit = ev as GovernSubmitEvent;
      const entry: GovernQueueEntry = {
        id: submit.id,
        origin: submit.origin,
        tag: submit.tag,
        target: submit.target,
        payload: submit.payload,
        submitted_at: submit.submitted_at,
        submitted_by: submit.submitted_by,
        status: "pending",
      };
      if (submit.prompted_by_drift_id !== undefined) {
        entry.prompted_by_drift_id = submit.prompted_by_drift_id;
      }
      entries.set(submit.id, entry);
    } else if (ev.type === "decide") {
      const decide = ev as GovernDecideEvent;
      const existing = entries.get(decide.id);
      if (!existing) continue;
      existing.status = "decided";
      existing.verdict = {
        verdict: decide.verdict,
        reason: decide.reason,
        decided_at: decide.decided_at,
        decided_by: decide.decided_by,
      };
    }
  }
  return Array.from(entries.values());
}

export function generateGovernId(now: Date = new Date()): string {
  const ts = now.getTime().toString(36);
  const rand = Math.random().toString(16).slice(2, 6).padEnd(4, "0");
  return `g-${ts}-${rand}`;
}
