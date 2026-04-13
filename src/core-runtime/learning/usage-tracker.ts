/**
 * usage-tracker.ts — Learning 활용 히트율 계측 seat
 *
 * W-A-72: DL-017 기제 seat (learn).
 * 세션별 learning-manifest.yaml 에서 공급량(loaded)을 수집하고,
 * extraction manifest 에서 추출량(saved)을, event marker 에서
 * 무효화 건수를 종합하여 learning 기제 신뢰도 proxy 를 산출한다.
 *
 * 측정 대상 (§1.4 측면 3):
 *   - 공급률: parsed → loaded 비율 (필터링 효율)
 *   - 추출률: 세션당 새 learning 추출 건수 (학습 생산성)
 *   - 무효화율: event marker 발생 비율 (기제 신뢰도 역지표)
 *   - 토큰 효율: tokens_used / loaded items (학습 항목당 토큰 비용)
 *
 * 소비자: onto:health (W-A-59), refresh protocol (§4)
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as yamlParse } from "yaml";
import { getLogger } from "../logger.js";

// ─── Public Types ───

/** 세션 1건의 learning 공급 요약 */
export interface LearningUsageEntry {
  session_id: string;
  session_domain: string;
  agents_loaded: number;
  total_items_loaded: number;
  total_items_parsed: number;
  total_items_skipped: number;
  total_tokens_used: number;
  total_budget_truncated: number;
  degraded: boolean;
  /** per-agent tier 분포 합산 */
  tier_distribution: TierDistribution;
  /** per-agent role 분포 합산 */
  role_distribution: RoleDistribution;
}

export interface TierDistribution {
  t1: number;
  t2: number;
  t3: number;
  t4: number;
}

export interface RoleDistribution {
  guardrail: number;
  foundation: number;
  convention: number;
  unclassified: number;
}

/** 전체 learning 활용 metric 요약 */
export interface LearningUsageSummary {
  collected_at: string;
  review_root: string;
  total_sessions: number;
  entries: LearningUsageEntry[];
  aggregate: LearningUsageAggregate;
}

/** 집계 metric */
export interface LearningUsageAggregate {
  /** 전체 세션 평균 loaded items */
  avg_items_loaded: number;
  /** 전체 세션 평균 parsed items */
  avg_items_parsed: number;
  /** 공급률: loaded / parsed (필터링 후 남은 비율, 1.0 = 전부 통과) */
  supply_ratio: number;
  /** 평균 토큰 사용량 */
  avg_tokens_used: number;
  /** 평균 budget truncation 건수 */
  avg_budget_truncated: number;
  /** 저하 세션 비율 */
  degradation_ratio: number;
  /** tier 분포 합산 */
  total_tier_distribution: TierDistribution;
  /** role 분포 합산 */
  total_role_distribution: RoleDistribution;
}

// ─── Internal types ───

interface RawManifest {
  session_domain?: string;
  agents_loaded?: number;
  total_items_loaded?: number;
  total_items_parsed?: number;
  total_items_skipped?: number;
  degraded?: boolean;
  per_agent?: RawPerAgent[];
}

interface RawPerAgent {
  agent_id?: string;
  loaded?: number;
  parsed?: number;
  skipped?: number;
  truncated?: number;
  tokens_used?: number;
  tokens_budget?: number;
  budget_truncated_count?: number;
  tier_distribution?: Record<string, number>;
  role_distribution?: Record<string, number>;
}

// ─── Helpers ───

function parseYamlFile<T>(filePath: string): T | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    return yamlParse(raw) as T;
  } catch {
    getLogger().debug("usage-tracker: failed to parse YAML", { path: filePath });
    return null;
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function emptyTier(): TierDistribution {
  return { t1: 0, t2: 0, t3: 0, t4: 0 };
}

function emptyRole(): RoleDistribution {
  return { guardrail: 0, foundation: 0, convention: 0, unclassified: 0 };
}

function sumTier(a: TierDistribution, b: TierDistribution): TierDistribution {
  return { t1: a.t1 + b.t1, t2: a.t2 + b.t2, t3: a.t3 + b.t3, t4: a.t4 + b.t4 };
}

function sumRole(a: RoleDistribution, b: RoleDistribution): RoleDistribution {
  return {
    guardrail: a.guardrail + b.guardrail,
    foundation: a.foundation + b.foundation,
    convention: a.convention + b.convention,
    unclassified: a.unclassified + b.unclassified,
  };
}

function parseTierDist(raw: Record<string, number> | undefined): TierDistribution {
  if (!raw) return emptyTier();
  return {
    t1: raw["1"] ?? 0,
    t2: raw["2"] ?? 0,
    t3: raw["3"] ?? 0,
    t4: raw["4"] ?? 0,
  };
}

function parseRoleDist(raw: Record<string, number> | undefined): RoleDistribution {
  if (!raw) return emptyRole();
  return {
    guardrail: raw["guardrail"] ?? 0,
    foundation: raw["foundation"] ?? 0,
    convention: raw["convention"] ?? 0,
    unclassified: raw["unclassified"] ?? 0,
  };
}

// ─── Core API ───

/**
 * .onto/review/ 이하 모든 세션의 learning 공급 데이터를 수집한다.
 *
 * @param reviewRoot - .onto/review 디렉터리 경로
 * @returns LearningUsageSummary — 세션별 공급 요약 + 집계 metric
 */
export function collectLearningUsage(reviewRoot: string): LearningUsageSummary {
  const absRoot = resolve(reviewRoot);

  let sessionDirs: string[];
  try {
    sessionDirs = readdirSync(absRoot).filter(
      (name) => /^\d{8}-[0-9a-f]+$/.test(name) && isDirectory(join(absRoot, name)),
    );
  } catch {
    getLogger().warn("usage-tracker: review root not found", { path: absRoot });
    return emptySummary(absRoot);
  }

  const entries: LearningUsageEntry[] = [];

  for (const dirName of sessionDirs) {
    const manifestPath = join(absRoot, dirName, "execution-preparation", "learning-manifest.yaml");
    const manifest = parseYamlFile<RawManifest>(manifestPath);
    if (!manifest) continue;

    const entry = parseManifest(dirName, manifest);
    if (entry) entries.push(entry);
  }

  // session_id 알파벳순 (= 시간순)
  entries.sort((a, b) => a.session_id.localeCompare(b.session_id));

  return {
    collected_at: new Date().toISOString(),
    review_root: absRoot,
    total_sessions: entries.length,
    entries,
    aggregate: computeAggregate(entries),
  };
}

function parseManifest(sessionId: string, raw: RawManifest): LearningUsageEntry | null {
  const loaded = raw.total_items_loaded ?? 0;
  const parsed = raw.total_items_parsed ?? 0;

  let totalTokens = 0;
  let totalTruncated = 0;
  let tierDist = emptyTier();
  let roleDist = emptyRole();

  for (const agent of raw.per_agent ?? []) {
    totalTokens += agent.tokens_used ?? 0;
    totalTruncated += agent.budget_truncated_count ?? 0;
    tierDist = sumTier(tierDist, parseTierDist(agent.tier_distribution));
    roleDist = sumRole(roleDist, parseRoleDist(agent.role_distribution));
  }

  return {
    session_id: sessionId,
    session_domain: raw.session_domain ?? "none",
    agents_loaded: raw.agents_loaded ?? 0,
    total_items_loaded: loaded,
    total_items_parsed: parsed,
    total_items_skipped: raw.total_items_skipped ?? 0,
    total_tokens_used: totalTokens,
    total_budget_truncated: totalTruncated,
    degraded: raw.degraded ?? false,
    tier_distribution: tierDist,
    role_distribution: roleDist,
  };
}

/**
 * 세션 목록에서 집계 metric 을 산출한다.
 */
export function computeAggregate(entries: LearningUsageEntry[]): LearningUsageAggregate {
  if (entries.length === 0) return emptyAggregate();

  const n = entries.length;
  const totalLoaded = entries.reduce((s, e) => s + e.total_items_loaded, 0);
  const totalParsed = entries.reduce((s, e) => s + e.total_items_parsed, 0);
  const totalTokens = entries.reduce((s, e) => s + e.total_tokens_used, 0);
  const totalTruncated = entries.reduce((s, e) => s + e.total_budget_truncated, 0);
  const degradedCount = entries.filter((e) => e.degraded).length;

  let tierTotal = emptyTier();
  let roleTotal = emptyRole();
  for (const e of entries) {
    tierTotal = sumTier(tierTotal, e.tier_distribution);
    roleTotal = sumRole(roleTotal, e.role_distribution);
  }

  return {
    avg_items_loaded: Math.round(totalLoaded / n),
    avg_items_parsed: Math.round(totalParsed / n),
    supply_ratio: totalParsed > 0 ? Math.round((totalLoaded / totalParsed) * 1000) / 1000 : 0,
    avg_tokens_used: Math.round(totalTokens / n),
    avg_budget_truncated: Math.round(totalTruncated / n),
    degradation_ratio: Math.round((degradedCount / n) * 1000) / 1000,
    total_tier_distribution: tierTotal,
    total_role_distribution: roleTotal,
  };
}

function emptySummary(root: string): LearningUsageSummary {
  return {
    collected_at: new Date().toISOString(),
    review_root: root,
    total_sessions: 0,
    entries: [],
    aggregate: emptyAggregate(),
  };
}

function emptyAggregate(): LearningUsageAggregate {
  return {
    avg_items_loaded: 0,
    avg_items_parsed: 0,
    supply_ratio: 0,
    avg_tokens_used: 0,
    avg_budget_truncated: 0,
    degradation_ratio: 0,
    total_tier_distribution: emptyTier(),
    total_role_distribution: emptyRole(),
  };
}
