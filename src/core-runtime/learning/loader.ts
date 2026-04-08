/**
 * Learning consumption loader — Phase 1.5.
 *
 * Phase 1: C-1 (path), C-2 (parse), C-3a/C-3b (applicability filter), C-4 (sort+cap)
 * Phase 1.5: C-3c (cross-domain rule), C-5a (tier), C-5b (token budget)
 * Common: C-6 (render), C-6b (manifest), C-7 (summary)
 *
 * Design reference: .onto/temp/phase-1.5-design-draft.md
 * Reviews: 20260407-4b64681d (R1), 20260407-bc36fb51 (R2)
 */

import fs from "node:fs";
import path from "node:path";
import {
  ITEM_LINE_RE,
  APPLICABILITY_RE,
  ROLE_RE,
  IMPACT_RE,
} from "./shared/patterns.js";
import { resolveLearningFilePaths } from "./shared/paths.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedLearningItem {
  type: "fact" | "judgment";
  applicability: string[];
  role: "guardrail" | "foundation" | "convention" | null;
  impact: "high" | "normal";
  raw_line: string;
  source_scope: "user" | "project";
  agent_id: string;
  /** Parse order index. Higher = newer. User-scope parsed first (lower index), project-scope after. */
  order_index: number;
  /** True if included by C-3c cross-domain rule. C-2 initializes to false. */
  cross_domain: boolean;
}

export interface TieredLearningItem extends ParsedLearningItem {
  tier: 1 | 2 | 3 | 4;
}

export interface LearningLoadResult {
  agent_id: string;
  items: TieredLearningItem[];
  total_parsed: number;
  skipped_count: number;
  file_paths: string[];
  warnings: string[];
  degraded: boolean;
  cross_domain_included: number;
  cross_domain_excluded: number;
  budget_truncated_count: number;
  tokens_used: number;
}

export interface LearningLoadManifest {
  session_domain: string;
  agents_loaded: number;
  total_items_loaded: number;
  total_items_parsed: number;
  total_items_skipped: number;
  per_agent: {
    agent_id: string;
    loaded: number;
    parsed: number;
    skipped: number;
    truncated: number;
    role_distribution: Record<string, number>;
    tier_distribution: Record<string, number>;
    cross_domain_included: number;
    cross_domain_excluded: number;
    tokens_used: number;
    tokens_budget: number;
    budget_truncated_count: number;
  }[];
  learning_file_paths: string[];
  degraded: boolean;
  degradation_reason: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ITEMS_PER_AGENT = 30; // Phase 1 fallback cap
const TOKEN_BUDGET_PER_AGENT = 4000; // Phase 1.5 token budget (T2+ only)
const T1_TOKEN_WARN_RATIO = 0.5; // Warn if T1 tokens exceed 50% of budget

// ---------------------------------------------------------------------------
// C-2: Best-effort line parser (patterns from shared/patterns.ts)
// ---------------------------------------------------------------------------

function parseLearningLine(
  line: string,
  sourceScope: "user" | "project",
  agentId: string,
  orderIndex: number,
): ParsedLearningItem | null {
  const typeMatch = line.match(ITEM_LINE_RE);
  if (!typeMatch) return null;

  const type = typeMatch[1] as "fact" | "judgment";

  const applicability: string[] = [];
  const appRegex = new RegExp(APPLICABILITY_RE.source, "g");
  let appMatch: RegExpExecArray | null;
  while ((appMatch = appRegex.exec(line)) !== null) {
    applicability.push(appMatch[1]!);
  }

  const roleMatch = line.match(ROLE_RE);
  // [insight] → null (under-classified, Phase 3 promote will re-classify)
  let role: ParsedLearningItem["role"] = null;
  if (roleMatch && roleMatch[1] !== "insight") {
    role = roleMatch[1] as "guardrail" | "foundation" | "convention";
  }

  const impactMatch = line.match(IMPACT_RE);
  const impact: "high" | "normal" = impactMatch?.[1] === "high" ? "high" : "normal";

  return { type, applicability, role, impact, raw_line: line, source_scope: sourceScope, agent_id: agentId, order_index: orderIndex, cross_domain: false };
}

function parseLearningFile(
  filePath: string,
  sourceScope: "user" | "project",
  agentId: string,
  startIndex: number,
): { items: ParsedLearningItem[]; skipped: number; warnings: string[] } {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const items: ParsedLearningItem[] = [];
  const warnings: string[] = [];
  let skipped = 0;
  let orderIndex = startIndex;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line || line.startsWith("#") || line.startsWith("<!--")) continue;
    if (!/^[-*+]\s+\[/.test(line)) continue;

    const item = parseLearningLine(line, sourceScope, agentId, orderIndex);
    if (item) {
      items.push(item);
      orderIndex++;
    } else {
      skipped++;
      warnings.push(`[learn-loader] skip: ${filePath}:${i + 1} — parse failed`);
    }
  }

  return { items, skipped, warnings };
}

// ---------------------------------------------------------------------------
// C-3a / C-3b: Applicability filter (methodology + current domain)
// ---------------------------------------------------------------------------

function filterByApplicability(
  items: ParsedLearningItem[],
  sessionDomain: string | null,
): ParsedLearningItem[] {
  const isNoDomain = !sessionDomain || sessionDomain === "none" || sessionDomain === "@-";

  return items.filter((item) => {
    if (item.applicability.includes("methodology")) return true;
    if (!isNoDomain && item.applicability.includes(`domain/${sessionDomain}`)) return true;
    return false;
  });
}

// ---------------------------------------------------------------------------
// C-3c: Cross-domain rule-based inclusion (Phase 1.5)
//
// Include domain-only items from OTHER domains if they are guardrail or
// high-impact. These are structural/safety learnings likely to be useful
// across domains. Disabled when session_domain=none.
// ---------------------------------------------------------------------------

interface CrossDomainStats {
  included: number;
  excluded: number;
}

function applyCrossDomainFilter(
  existingItems: readonly ParsedLearningItem[],
  allParsedItems: readonly ParsedLearningItem[],
  sessionDomain: string | null,
): { items: ParsedLearningItem[]; stats: CrossDomainStats } {
  const isNoDomain = !sessionDomain || sessionDomain === "none" || sessionDomain === "@-";
  if (isNoDomain) {
    return { items: [...existingItems], stats: { included: 0, excluded: 0 } };
  }

  // Build new array — never mutate input (fail-close snapshot integrity)
  const result = [...existingItems];
  const existingSet = new Set(existingItems);
  let included = 0;
  let excluded = 0;

  for (const item of allParsedItems) {
    if (existingSet.has(item)) continue; // already included by C-3a/C-3b
    if (item.applicability.includes("methodology")) continue; // not domain-only
    const hasDomain = item.applicability.some((a) => a.startsWith("domain/"));
    if (!hasDomain) continue;
    if (item.applicability.includes(`domain/${sessionDomain}`)) continue;

    // This is a cross-domain item
    if (item.role === "guardrail" || item.impact === "high") {
      result.push({ ...item, cross_domain: true });
      included++;
    } else {
      excluded++;
    }
  }

  return { items: result, stats: { included, excluded } };
}

// ---------------------------------------------------------------------------
// C-5a: Tier assignment + sort (Phase 1.5, supersedes C-4)
//
// Tier assignment: first matching from T1 down.
// Intra-tier sort: current-domain first, then newest first.
// ---------------------------------------------------------------------------

function assignTier(item: ParsedLearningItem): 1 | 2 | 3 | 4 {
  if (item.role === "guardrail") return 1;
  if (item.impact === "high") return 2;
  if (item.role === "foundation") return 3;
  return 4; // convention, under-classified, or unknown role
}

function assignTierAndSort(items: ParsedLearningItem[]): TieredLearningItem[] {
  const tiered: TieredLearningItem[] = items.map((item) => ({
    ...item,
    tier: assignTier(item),
  }));

  tiered.sort((a, b) => {
    // 1. tier ascending (T1 first)
    if (a.tier !== b.tier) return a.tier - b.tier;
    // 2. current-domain first within tier
    const aCross = a.cross_domain ? 1 : 0;
    const bCross = b.cross_domain ? 1 : 0;
    if (aCross !== bCross) return aCross - bCross;
    // 3. newest first
    return b.order_index - a.order_index;
  });

  return tiered;
}

// ---------------------------------------------------------------------------
// C-5b: Token budget (Phase 1.5)
//
// T1 items are exempt (always included).
// T2+ items fill budget in tier order until exhausted.
// Last item that crosses budget is included (over-budget allowed).
// ---------------------------------------------------------------------------

function estimateTokens(text: string): number {
  let tokens = 0;
  for (const char of text) {
    // Non-ASCII (CJK, Korean, etc.): ~1 token per character
    // ASCII/Latin: ~4 characters per token
    tokens += char.charCodeAt(0) > 0x7F ? 1 : 0.25;
  }
  return Math.ceil(tokens);
}

interface BudgetResult {
  items: TieredLearningItem[];
  tokens_used: number;
  budget_truncated_count: number;
  t1_tokens: number;
}

function applyTokenBudget(items: TieredLearningItem[]): BudgetResult {
  const kept: TieredLearningItem[] = [];
  let budgetUsed = 0;
  let budgetExhausted = false;
  let truncatedCount = 0;
  let t1Tokens = 0;

  for (const item of items) {
    const tokens = estimateTokens(item.raw_line);

    if (item.tier === 1) {
      // T1: always included, budget exempt
      kept.push(item);
      t1Tokens += tokens;
      continue;
    }

    if (budgetExhausted) {
      truncatedCount++;
      continue;
    }

    kept.push(item);
    budgetUsed += tokens;

    // Allow last item to exceed budget (over-budget)
    if (budgetUsed >= TOKEN_BUDGET_PER_AGENT) {
      budgetExhausted = true;
    }
  }

  return { items: kept, tokens_used: budgetUsed + t1Tokens, budget_truncated_count: truncatedCount, t1_tokens: t1Tokens };
}

// ---------------------------------------------------------------------------
// C-4: Phase 1 fallback (sort + cap 30)
// ---------------------------------------------------------------------------

function prioritySortAndCap(items: ParsedLearningItem[]): TieredLearningItem[] {
  const sorted = [...items].sort((a, b) => {
    const ag = a.role === "guardrail" ? 1 : 0;
    const bg = b.role === "guardrail" ? 1 : 0;
    if (ag !== bg) return bg - ag;
    const ah = a.impact === "high" ? 1 : 0;
    const bh = b.impact === "high" ? 1 : 0;
    if (ah !== bh) return bh - ah;
    const af = a.role === "foundation" ? 1 : 0;
    const bf = b.role === "foundation" ? 1 : 0;
    if (af !== bf) return bf - af;
    return b.order_index - a.order_index;
  });

  const capped = sorted.slice(0, MAX_ITEMS_PER_AGENT);
  return capped.map((item) => ({ ...item, tier: assignTier(item) as 1 | 2 | 3 | 4 }));
}

// ---------------------------------------------------------------------------
// C-7: Distribution helpers
// ---------------------------------------------------------------------------

function computeRoleDistribution(items: ParsedLearningItem[]): Record<string, number> {
  const dist: Record<string, number> = { guardrail: 0, foundation: 0, convention: 0, unclassified: 0 };
  for (const item of items) {
    const key = item.role ?? "unclassified";
    dist[key] = (dist[key] ?? 0) + 1;
  }
  return dist;
}

function computeTierDistribution(items: TieredLearningItem[]): Record<string, number> {
  const dist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0 };
  for (const item of items) {
    dist[String(item.tier)] = (dist[String(item.tier)] ?? 0) + 1;
  }
  return dist;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load, filter, tier, and budget-truncate learnings for a single agent.
 * Phase 1.5 pipeline: C-3a/C-3b → C-3c → C-5a → C-5b
 * Fail-close: falls back to Phase 1 (C-4) on any error.
 */
export function loadLearningsForAgent(
  agentId: string,
  projectRoot: string,
  sessionDomain: string | null,
): LearningLoadResult {
  const paths = resolveLearningFilePaths(agentId, projectRoot);
  const allParsedItems: ParsedLearningItem[] = [];
  let totalSkipped = 0;
  const warnings: string[] = [];
  const filePaths: string[] = [];

  // C-1/C-2: Load and parse — per-file try-catch so one file failure doesn't block the other
  for (const [scope, filePath] of [["user", paths.user_path], ["project", paths.project_path]] as const) {
    if (!filePath) continue;
    filePaths.push(filePath);
    try {
      const r = parseLearningFile(filePath, scope, agentId, allParsedItems.length);
      allParsedItems.push(...r.items);
      totalSkipped += r.skipped;
      warnings.push(...r.warnings);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`[learn-loader] warn: ${agentId} ${scope} file read failed: ${message}`);
    }
  }

  const totalParsed = allParsedItems.length;

  // C-3a/C-3b: applicability filter
  let items = filterByApplicability(allParsedItems, sessionDomain);

  // Phase 1.5 disabled by env var → use Phase 1 fallback
  if (process.env.ONTO_LEARNING_TIER_DISABLED === "1") {
    const fallback = prioritySortAndCap(items);
    const tokensUsed = fallback.reduce((s, i) => s + estimateTokens(i.raw_line), 0);
    return { agent_id: agentId, items: fallback, total_parsed: totalParsed, skipped_count: totalSkipped, file_paths: filePaths, warnings, degraded: false, cross_domain_included: 0, cross_domain_excluded: 0, budget_truncated_count: 0, tokens_used: tokensUsed };
  }

  // IAR-1: Snapshot pre-C-3c items for fail-close fallback
  const phase1Items = [...items];
  let crossStats: CrossDomainStats = { included: 0, excluded: 0 };

  try {
    // C-3c: cross-domain rule-based inclusion
    if (process.env.ONTO_LEARNING_CROSS_DOMAIN_DISABLED !== "1") {
      const result = applyCrossDomainFilter(items, allParsedItems, sessionDomain);
      items = result.items;
      crossStats = result.stats;
    }

    // C-5a: tier assignment + sort
    const tiered = assignTierAndSort(items);

    // C-5b: token budget
    const budgetResult = applyTokenBudget(tiered);

    // T1 token warning
    if (budgetResult.t1_tokens > TOKEN_BUDGET_PER_AGENT * T1_TOKEN_WARN_RATIO) {
      warnings.push(`[learn-loader] warn: ${agentId} T1 tokens (${budgetResult.t1_tokens}) exceed ${T1_TOKEN_WARN_RATIO * 100}% of budget (${TOKEN_BUDGET_PER_AGENT})`);
    }

    return { agent_id: agentId, items: budgetResult.items, total_parsed: totalParsed, skipped_count: totalSkipped, file_paths: filePaths, warnings, degraded: false, cross_domain_included: crossStats.included, cross_domain_excluded: crossStats.excluded, budget_truncated_count: budgetResult.budget_truncated_count, tokens_used: budgetResult.tokens_used };
  } catch (error) {
    // Fail-close: use pre-C-3c snapshot with Phase 1 fallback
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`[learn-loader] Phase 1.5 degraded: ${message}, falling back to Phase 1`);
    const fallback = prioritySortAndCap(phase1Items);
    const tokensUsed = fallback.reduce((s, i) => s + estimateTokens(i.raw_line), 0);
    return { agent_id: agentId, items: fallback, total_parsed: totalParsed, skipped_count: totalSkipped, file_paths: filePaths, warnings, degraded: true, cross_domain_included: 0, cross_domain_excluded: 0, budget_truncated_count: 0, tokens_used: tokensUsed };
  }
}

/**
 * Load learnings for all agents in a session. Returns per-agent results + manifest.
 */
export function loadLearningsForSession(
  agentIds: string[],
  projectRoot: string,
  sessionDomain: string | null,
): { results: LearningLoadResult[]; manifest: LearningLoadManifest } {
  const results: LearningLoadResult[] = [];
  const allPaths: string[] = [];
  let anyDegraded = false;
  let degradationReason: string | null = null;

  for (const agentId of agentIds) {
    const result = loadLearningsForAgent(agentId, projectRoot, sessionDomain);
    results.push(result);
    allPaths.push(...result.file_paths);
    if (result.degraded) {
      anyDegraded = true;
      degradationReason = result.warnings.find((w) => w.includes("degraded")) ?? "unknown";
    }
  }

  // Compute cross-domain stats from results
  const manifest: LearningLoadManifest = {
    session_domain: sessionDomain ?? "none",
    agents_loaded: results.length,
    total_items_loaded: results.reduce((sum, r) => sum + r.items.length, 0),
    total_items_parsed: results.reduce((sum, r) => sum + r.total_parsed, 0),
    total_items_skipped: results.reduce((sum, r) => sum + r.skipped_count, 0),
    per_agent: results.map((r) => ({
      agent_id: r.agent_id,
      loaded: r.items.length,
      parsed: r.total_parsed,
      skipped: r.skipped_count,
      truncated: Math.max(0, r.total_parsed - r.items.length),
      role_distribution: computeRoleDistribution(r.items),
      tier_distribution: computeTierDistribution(r.items),
      cross_domain_included: r.cross_domain_included,
      cross_domain_excluded: r.cross_domain_excluded,
      tokens_used: r.tokens_used,
      tokens_budget: TOKEN_BUDGET_PER_AGENT,
      budget_truncated_count: r.budget_truncated_count,
    })),
    learning_file_paths: [...new Set(allPaths)],
    degraded: anyDegraded,
    degradation_reason: degradationReason,
  };

  return { results, manifest };
}

/**
 * C-6: Render learning section for insertion into a lens prompt packet.
 */
export function renderLearningSection(items: ParsedLearningItem[]): string {
  if (items.length === 0) return "";

  const lines: string[] = [
    "",
    "## Prior Learnings",
    `Items: ${items.length} (priority: T1-guardrail > T2-high-impact > T3-foundation > T4-other)`,
    "Use these learnings as prior knowledge during your review. Report which learnings you applied in your output.",
    "",
  ];

  for (const item of items) {
    lines.push(item.raw_line);
  }

  return lines.join("\n");
}

/**
 * C-7: Format loading summary for console output.
 */
export function formatLoadingSummary(manifest: LearningLoadManifest): string {
  const lines: string[] = [
    `[learn-loader] domain=${manifest.session_domain}, agents=${manifest.agents_loaded}, ` +
    `loaded=${manifest.total_items_loaded}, parsed=${manifest.total_items_parsed}, ` +
    `skipped=${manifest.total_items_skipped}` +
    (manifest.degraded ? ` (degraded: Phase 1 fallback)` : ""),
  ];

  for (const agent of manifest.per_agent) {
    const tierParts = Object.entries(agent.tier_distribution)
      .filter(([, count]) => count > 0)
      .map(([tier, count]) => `T${tier}:${count}`)
      .join(" ");
    const crossPart = agent.cross_domain_included > 0 ? ` cross:${agent.cross_domain_included}` : "";
    const tokenPart = ` tok:${agent.tokens_used}/${agent.tokens_budget}`;
    lines.push(
      `  ${agent.agent_id}: ${agent.loaded}/${agent.parsed}` +
      (agent.truncated > 0 ? ` (truncated ${agent.truncated})` : "") +
      (agent.loaded === 0 ? " (filtered to zero)" : "") +
      (tierParts ? ` [${tierParts}]` : "") +
      crossPart +
      tokenPart,
    );
  }

  return lines.join("\n");
}
