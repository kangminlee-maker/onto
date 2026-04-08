/**
 * Shared regex patterns for learning pipeline — Phase 1~3 공용.
 *
 * Extraction patterns (§1.4): TAG_PATTERN, SOURCE_PATTERN, GUARDRAIL_PATTERN, CONTENT_CAPTURE
 * Consumption patterns (loader.ts): ITEM_LINE_RE, APPLICABILITY_RE, ROLE_RE, IMPACT_RE
 */

// ---------------------------------------------------------------------------
// Extraction patterns (§1.4 — Phase 2 extractor, Phase 3 promote)
// ---------------------------------------------------------------------------

/** Full line validation — A-8, P-2, C-2 */
export const TAG_PATTERN =
  /^[-*+]\s+\[(fact|judgment)\](?:\s+\[(?:methodology|domain\/[^\]]+)\])+(?:\s+\[(?:guardrail|foundation|convention)\])?\s+(.+?)\s+\(source:\s*[^,]+,\s*[^,]+,\s*\d{4}-\d{2}-\d{2}\)\s+\[impact:(high|normal)\]\s*$/u;

/** Source metadata extraction — A-8, P-2 */
export const SOURCE_PATTERN =
  /\(source:\s*([^,]+),\s*([^,]+),\s*(\d{4}-\d{2}-\d{2})\)/;

/** Guardrail 3-element check — A-9 (role=guardrail only) */
export const GUARDRAIL_PATTERN =
  /\*\*Situation\*\*:.*\*\*Result\*\*:.*\*\*Corrective action\*\*:/s;

/** Content extraction — A-10/P-3 exact match. Boundary aligned with TAG_PATTERN (CCNS-1). */
export const CONTENT_CAPTURE =
  /\[(?:fact|judgment)\](?:\s+\[[^\]]+\])+\s+(.+?)\s+\(source:\s*[^,]+,\s*[^,]+,\s*\d{4}-\d{2}-\d{2}\)/;

// ---------------------------------------------------------------------------
// Consumption patterns (loader.ts — Phase 1/1.5 reader)
// ---------------------------------------------------------------------------

/** Line-start type detection (best-effort parser) */
export const ITEM_LINE_RE = /^[-*+]\s+\[(fact|judgment)\]\s+/;

/** Applicability tag extraction (global — use with new RegExp or exec loop) */
export const APPLICABILITY_RE = /\[(methodology|domain\/[^\]]+)\]/g;

/** Role extraction (includes insight for legacy compat — loader maps to null) */
export const ROLE_RE = /\[(guardrail|foundation|convention|insight)\]/;

/** Impact extraction */
export const IMPACT_RE = /\[impact:(high|normal)\]/;

// ---------------------------------------------------------------------------
// LLM output patterns (Phase 2 — before source metadata is added)
// ---------------------------------------------------------------------------

/** Raw LLM output line — §1.1 format (no source metadata yet) */
export const RAW_LLM_LINE_RE =
  /^[-*+]\s+\[(fact|judgment)\](?:\s+\[(?:methodology|domain\/[^\]]+)\])+(?:\s+\[(?:guardrail|foundation|convention)\])?\s+(.+?)\s+\[impact:(high|normal)\]\s*$/u;

/** Newly Learned section header */
export const NEWLY_LEARNED_HEADER_RE = /^###\s+Newly\s+Learned\s*$/m;

/** Event Markers section header */
export const EVENT_MARKERS_HEADER_RE =
  /^###\s+Applied\s+Learnings\s+—\s+Event\s+Markers\s*$/m;
