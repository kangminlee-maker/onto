/**
 * Event marker processing — C-11 (Phase 2).
 *
 * Handles applied-then-found-invalid markers only.
 * observed-obsolete → Phase 3 이연.
 * CONS-5: learning_id 기반 대상 특정만. 레거시 항목(learning_id 없음) 부착 금지.
 */

import fs from "node:fs";
import path from "node:path";
import type { MarkerTrace } from "../review/artifact-types.js";
import { EVENT_MARKERS_HEADER_RE } from "./shared/patterns.js";

export interface EventMarker {
  marker_type: "applied-then-found-invalid";
  learning_id: string | null;
  learning_excerpt: string;
  reason: string;
  lens_id: string;
  session_id: string;
  date: string;
}

/** learning_id comment pattern: <!-- learning_id: {hash} --> */
const LEARNING_ID_RE = /<!--\s*learning_id:\s*(\w+)\s*-->/;

/**
 * Parse event markers from a lens output.
 */
export function parseEventMarkers(
  lensOutput: string,
  lensId: string,
  sessionId: string,
  date: string,
): EventMarker[] {
  const headerMatch = lensOutput.match(EVENT_MARKERS_HEADER_RE);
  if (!headerMatch) return [];

  const sectionStart = headerMatch.index! + headerMatch[0].length;
  const rest = lensOutput.slice(sectionStart);

  // Find where the section ends (next ## heading or end of string)
  const nextSectionMatch = rest.match(/\n##\s/);
  const sectionText = nextSectionMatch
    ? rest.slice(0, nextSectionMatch.index)
    : rest;

  const markers: EventMarker[] = [];
  const lines = sectionText.split("\n");

  let currentMarker: Partial<EventMarker> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("##")) continue;

    const markerMatch = trimmed.match(/^-\s*marker:\s*(.+)$/);
    if (markerMatch) {
      if (currentMarker?.marker_type && currentMarker.learning_excerpt) {
        markers.push(finalizeMarker(currentMarker, lensId, sessionId, date));
      }
      currentMarker =
        markerMatch[1]?.trim() === "applied-then-found-invalid"
          ? { marker_type: "applied-then-found-invalid" }
          : null;
      continue;
    }

    if (!currentMarker) continue;

    const excerptMatch = trimmed.match(/^-\s*learning_excerpt:\s*(.+)$/);
    if (excerptMatch) {
      currentMarker.learning_excerpt = excerptMatch[1]!.trim();
      continue;
    }

    const reasonMatch = trimmed.match(/^-\s*reason:\s*(.+)$/);
    if (reasonMatch) {
      currentMarker.reason = reasonMatch[1]!.trim();
      continue;
    }
  }

  // Flush last marker
  if (currentMarker?.marker_type && currentMarker.learning_excerpt) {
    markers.push(finalizeMarker(currentMarker, lensId, sessionId, date));
  }

  return markers;
}

function finalizeMarker(
  partial: Partial<EventMarker>,
  lensId: string,
  sessionId: string,
  date: string,
): EventMarker {
  return {
    marker_type: "applied-then-found-invalid",
    learning_id: null, // resolved later by matchMarkersToLearnings
    learning_excerpt: partial.learning_excerpt ?? "",
    reason: partial.reason ?? "",
    lens_id: lensId,
    session_id: sessionId,
    date,
  };
}

/**
 * Match markers to learning items by searching for excerpts in learning files.
 * Only items with learning_id are eligible (CONS-5: 레거시 부착 금지).
 */
export function matchMarkersToLearnings(
  markers: EventMarker[],
  learningFilePaths: string[],
): MarkerTrace[] {
  // Load all learning lines with learning_ids
  const learningIndex = new Map<
    string,
    { learning_id: string; file_path: string; line: string }
  >();

  for (const filePath of learningFilePaths) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const idMatch = line.match(LEARNING_ID_RE);
      if (idMatch?.[1]) {
        learningIndex.set(idMatch[1], {
          learning_id: idMatch[1],
          file_path: filePath,
          line,
        });
      }
    }
  }

  const traces: MarkerTrace[] = [];

  for (const marker of markers) {
    // Search by excerpt substring match against lines with learning_id
    let matched = false;
    for (const [learningId, entry] of learningIndex) {
      if (entry.line.includes(marker.learning_excerpt)) {
        traces.push({
          lens_id: marker.lens_id,
          marker_type: "applied-then-found-invalid",
          learning_excerpt: marker.learning_excerpt,
          target_learning_id: learningId,
          resolution: "attached",
          target_file: entry.file_path,
        });
        marker.learning_id = learningId;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Check if any line (without learning_id) matches → unresolved_no_id
      let foundInLegacy = false;
      for (const filePath of learningFilePaths) {
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, "utf8");
        if (content.includes(marker.learning_excerpt)) {
          foundInLegacy = true;
          break;
        }
      }

      traces.push({
        lens_id: marker.lens_id,
        marker_type: "applied-then-found-invalid",
        learning_excerpt: marker.learning_excerpt,
        target_learning_id: null,
        resolution: foundInLegacy ? "unresolved_no_id" : "unresolved_not_found",
      });
    }
  }

  return traces;
}

/**
 * Attach event markers to learning files (active mode only).
 * Format: <!-- applied-then-found-invalid: {date}, {session_id}, {reason}, target:{learning_id} -->
 */
export function attachEventMarkers(
  traces: MarkerTrace[],
  mode: "shadow" | "active",
): { attached: number; skipped: number } {
  let attached = 0;
  let skipped = 0;

  for (const trace of traces) {
    if (trace.resolution !== "attached" || !trace.target_learning_id) {
      skipped++;
      continue;
    }

    if (mode === "shadow") {
      trace.resolution = "skipped_shadow";
      skipped++;
      continue;
    }

    if (!trace.target_file || !fs.existsSync(trace.target_file)) {
      skipped++;
      continue;
    }

    const markerComment = `<!-- applied-then-found-invalid: ${new Date().toISOString().slice(0, 10)}, ${trace.learning_excerpt.slice(0, 50)}, target:${trace.target_learning_id} -->`;

    const content = fs.readFileSync(trace.target_file, "utf8");
    const lines = content.split("\n");
    const targetIdPattern = `<!-- learning_id: ${trace.target_learning_id} -->`;
    const targetIdx = lines.findIndex((l) => l.includes(targetIdPattern));

    if (targetIdx === -1) {
      skipped++;
      continue;
    }

    // Insert marker after the learning_id line
    lines.splice(targetIdx + 1, 0, markerComment);
    fs.writeFileSync(trace.target_file, lines.join("\n"), "utf8");
    attached++;
  }

  return { attached, skipped };
}
