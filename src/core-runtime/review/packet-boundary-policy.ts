/**
 * Packet Boundary Policy parser — Phase 3-4 (A1).
 *
 * # What this module is
 *
 * Parses the `## Boundary Policy` section of a prompt packet and returns a
 * structured view of the declared filesystem / network access constraints.
 * The executor consults this BEFORE deciding whether to activate tool-native
 * mode, because packet-declared policies must take precedence over
 * caller-supplied tool capabilities.
 *
 * # Why it exists
 *
 * Phase 3-2 (function-calling tool loop, PR #67) exposed `read_file` /
 * `list_directory` / `search_content` to any model the executor routes to,
 * regardless of what the packet itself declared. Real-LLM testing (2026-04-17)
 * found that lens packets declare `Boundary Policy: Filesystem: denied` but
 * tool-native mode still handed the LLM filesystem tools — the LLM then
 * called tools for a task that was supposed to be self-contained, and
 * produced a `insufficient content within boundary` fallback instead of a
 * real lens output.
 *
 * The correct precedence is:
 *   packet Boundary Policy > CLI --tool-mode flag > default
 * because the packet is the authoritative contract for each unit; if it
 * says no filesystem, no filesystem — even if the model is capable of
 * function calling.
 *
 * # How it relates
 *
 * - `inline-http-review-unit-executor.ts` imports `parsePacketBoundaryPolicy`
 *   and calls it on the already-loaded packet text before choosing between
 *   Tier 1 (tool-native) and Tier 2 (inline).
 * - The findings document that motivated this is
 *   `development-records/benchmark/20260417-phase-3-2-3-3-lens-runtime-findings.md`
 *   (Finding 1).
 *
 * # Grammar
 *
 * The parser is deliberately lenient — packet authors write in prose, not
 * structured yaml. We match the `## Boundary Policy` heading case-insensitively
 * and then scan subsequent bullet lines for `- Filesystem: <value>` and
 * `- Network: <value>`. Values are normalized to a small vocabulary so the
 * executor can reason about them without string juggling.
 */

const FILESYSTEM_DENIED_VALUES = new Set([
  "denied",
  "deny",
  "disallowed",
  "disallow",
  "none",
  "no",
  "forbidden",
  "blocked",
]);

const FILESYSTEM_ALLOWED_VALUES = new Set([
  "allowed",
  "allow",
  "yes",
  "permitted",
  "read-only",
  "readonly",
  "ro",
]);

const NETWORK_DENIED_VALUES = new Set([
  "denied",
  "deny",
  "disallowed",
  "disallow",
  "none",
  "no",
  "forbidden",
  "blocked",
]);

const NETWORK_ALLOWED_VALUES = new Set([
  "allowed",
  "allow",
  "yes",
  "permitted",
]);

export type BoundaryFilesystemPolicy = "denied" | "allowed" | "unknown";
export type BoundaryNetworkPolicy = "denied" | "allowed" | "unknown";

export interface PacketBoundaryPolicy {
  /** Raw text of the Boundary Policy section body, or undefined if section absent. */
  sectionBody?: string;
  /** Normalized filesystem declaration; `unknown` when section absent or value unrecognised. */
  filesystem: BoundaryFilesystemPolicy;
  /** Normalized network declaration. */
  network: BoundaryNetworkPolicy;
  /** Raw filesystem value as written in the packet (trimmed); useful for telemetry / notices. */
  filesystemRaw?: string;
  /** Raw network value as written in the packet (trimmed). */
  networkRaw?: string;
}

/**
 * Parse the `## Boundary Policy` section from a packet body. Returns a
 * normalized view; both fields default to `"unknown"` when the section is
 * absent or the values are not in the recognized vocabulary. Callers should
 * treat `"unknown"` as "no packet-level constraint" — i.e. fall back to CLI
 * flags / host defaults.
 *
 * Case-insensitive on the heading. Accepts any number of `#` (## or ###) so
 * downgraded heading nesting still matches.
 */
export function parsePacketBoundaryPolicy(packetBody: string): PacketBoundaryPolicy {
  const section = extractBoundaryPolicySection(packetBody);
  if (section === undefined) {
    return { filesystem: "unknown", network: "unknown" };
  }

  const filesystemRaw = pickBulletValue(section, "filesystem");
  const networkRaw = pickBulletValue(section, "network");

  const result: PacketBoundaryPolicy = {
    sectionBody: section,
    filesystem: classifyFilesystem(filesystemRaw),
    network: classifyNetwork(networkRaw),
  };
  if (filesystemRaw !== undefined) result.filesystemRaw = filesystemRaw;
  if (networkRaw !== undefined) result.networkRaw = networkRaw;
  return result;
}

function extractBoundaryPolicySection(packetBody: string): string | undefined {
  // Match `## Boundary Policy` (case-insensitive) up to the next `## ` or EOF.
  // Allow optional leading spaces and trailing whitespace.
  const headingRe = /^\s*#{1,6}\s*Boundary\s+Policy\s*$/im;
  const m = headingRe.exec(packetBody);
  if (!m) return undefined;

  const startIdx = (m.index ?? 0) + m[0].length;
  // Find the next `## ` (or higher-level heading) or EOF.
  const rest = packetBody.slice(startIdx);
  const nextHeadingRe = /\n\s*#{1,6}\s+\S/;
  const nextMatch = nextHeadingRe.exec(rest);
  const end = nextMatch ? nextMatch.index : rest.length;
  return rest.slice(0, end).trim();
}

function pickBulletValue(section: string, key: "filesystem" | "network"): string | undefined {
  // Match lines like "- Filesystem: denied" (case-insensitive on the key).
  const lineRe = new RegExp(
    `(?:^|\\n)\\s*[-*]\\s*${key}\\s*:\\s*([^\\n]+?)\\s*(?=\\n|$)`,
    "i",
  );
  const m = lineRe.exec(section);
  if (!m || typeof m[1] !== "string") return undefined;
  return m[1].trim();
}

function classifyFilesystem(raw: string | undefined): BoundaryFilesystemPolicy {
  if (raw === undefined) return "unknown";
  const normalized = raw.toLowerCase().trim();
  if (FILESYSTEM_DENIED_VALUES.has(normalized)) return "denied";
  if (FILESYSTEM_ALLOWED_VALUES.has(normalized)) return "allowed";
  // Handle compound declarations like "read-only inside packet" by checking
  // the first token — these are treated as "allowed" (read is permitted).
  const firstToken = normalized.split(/\s+/)[0] ?? "";
  if (FILESYSTEM_ALLOWED_VALUES.has(firstToken)) return "allowed";
  if (FILESYSTEM_DENIED_VALUES.has(firstToken)) return "denied";
  return "unknown";
}

function classifyNetwork(raw: string | undefined): BoundaryNetworkPolicy {
  if (raw === undefined) return "unknown";
  const normalized = raw.toLowerCase().trim();
  if (NETWORK_DENIED_VALUES.has(normalized)) return "denied";
  if (NETWORK_ALLOWED_VALUES.has(normalized)) return "allowed";
  const firstToken = normalized.split(/\s+/)[0] ?? "";
  if (NETWORK_ALLOWED_VALUES.has(firstToken)) return "allowed";
  if (NETWORK_DENIED_VALUES.has(firstToken)) return "denied";
  return "unknown";
}
