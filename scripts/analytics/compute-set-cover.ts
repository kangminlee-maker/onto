#!/usr/bin/env tsx
/**
 * Compute minimum lens set-cover per review session.
 *
 * Per user clarification (2026-04-19): the goal is NOT per-lens unique
 * appearance rate. It is "which minimum combination of lenses covers all
 * findings the session produced?" — because each final finding is typically
 * produced by multiple overlapping lenses (redundancy), a smaller lens set
 * can often reproduce the same coverage.
 *
 * Uses the "Accounted findings: lens-N, lens-M" pattern in Consensus /
 * Conditional / Disagreement sections to map each final finding to its
 * contributing lens set, then solves the minimum set cover problem per
 * session and aggregates.
 */

import fs from "node:fs";
import path from "node:path";

const CORE_LENSES = [
  "logic",
  "structure",
  "dependency",
  "semantics",
  "pragmatics",
  "evolution",
  "coverage",
  "conciseness",
  "axiology",
] as const;

type Lens = (typeof CORE_LENSES)[number];
const CORE_LENS_SET = new Set<string>(CORE_LENSES);

interface SessionCover {
  project: string;
  session_id: string;
  findings: { finding_id: number; contributing_lenses: string[] }[];
  total_findings: number;
  min_cover: string[];
  required_lenses: string[]; // lenses that are SOLE contributor to at least one finding
}

function parseAccountedLenses(line: string): string[] {
  // Two formats observed:
  //   - Recent (2026-04-18+): "Accounted findings: axiology-1, structure-2."
  //   - Legacy (onto 2026-04): "Accounted findings: `logic#1`, `semantics#1`"
  const m = line.match(/Accounted findings:\s*(.+?)(?:\.\s*Evidence|$)/i);
  if (!m) return [];
  // Strip backticks and split
  const cleaned = m[1].replace(/`/g, "");
  const tokens = cleaned.split(",").map((t) => t.trim().replace(/\.$/, ""));
  const lenses = new Set<string>();
  for (const tok of tokens) {
    // Accept lens-N, lens#N, or bare lens
    const lensM = tok.match(/^([a-z]+)(?:[#-][A-Za-z0-9]+)?/);
    if (lensM && CORE_LENS_SET.has(lensM[1])) lenses.add(lensM[1]);
  }
  return [...lenses];
}

function extractFindings(text: string): { finding_id: number; contributing_lenses: string[] }[] {
  const findings: { finding_id: number; contributing_lenses: string[] }[] = [];
  const lines = text.split("\n");
  let inRelevantSection = false;
  let currentIdx = 0;
  const relevantSections = ["Consensus", "Conditional Consensus", "Disagreement"];

  for (const line of lines) {
    if (/^### /.test(line)) {
      inRelevantSection = relevantSections.some((s) => line.startsWith("### " + s));
      continue;
    }
    if (!inRelevantSection) continue;
    if (/^(\d+\.|\- )/.test(line) && !line.startsWith("- Accounted")) {
      // start of a new finding item
      currentIdx++;
    }
    if (/Accounted findings:/i.test(line)) {
      const lenses = parseAccountedLenses(line);
      if (lenses.length > 0) {
        findings.push({ finding_id: currentIdx, contributing_lenses: lenses });
      }
    }
  }
  return findings;
}

function findMinCover(
  findings: { contributing_lenses: string[] }[],
): { min_cover: string[]; required: string[] } {
  if (findings.length === 0) return { min_cover: [], required: [] };

  // Greedy min set cover (NP-hard exact; greedy is 9-lens domain, brute-force ok)
  const allLenses = new Set<string>();
  for (const f of findings) for (const l of f.contributing_lenses) allLenses.add(l);
  const lensesArr = [...allLenses];

  // Brute force for small universe (9 lenses max)
  let best: string[] = [...lensesArr];
  const n = lensesArr.length;
  for (let size = 1; size <= n; size++) {
    const combos = kCombinations(lensesArr, size);
    for (const combo of combos) {
      const set = new Set(combo);
      const covers = findings.every((f) => f.contributing_lenses.some((l) => set.has(l)));
      if (covers) {
        if (combo.length < best.length) best = [...combo];
      }
    }
    if (best.length <= size) break; // found minimum
  }

  // Required: lens that is sole contributor for at least one finding
  const required = new Set<string>();
  for (const f of findings) {
    if (f.contributing_lenses.length === 1) required.add(f.contributing_lenses[0]);
  }

  return { min_cover: best, required: [...required] };
}

function kCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  if (k === arr.length) return [arr.slice()];
  const result: T[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const rest = kCombinations(arr.slice(i + 1), k - 1);
    for (const r of rest) result.push([arr[i], ...r]);
  }
  return result;
}

function processSession(project: string, sessionDir: string): SessionCover | null {
  const finalPath = path.join(sessionDir, "final-output.md");
  if (!fs.existsSync(finalPath)) return null;
  const text = fs.readFileSync(finalPath, "utf-8");
  if (!text.includes("Accounted findings")) return null;
  const findings = extractFindings(text);
  if (findings.length === 0) return null;
  const { min_cover, required } = findMinCover(findings);
  return {
    project,
    session_id: path.basename(sessionDir),
    findings,
    total_findings: findings.length,
    min_cover,
    required_lenses: required,
  };
}

function main() {
  const roots = [
    { project: "onto", path: "/Users/kangmin/cowork/onto/.onto/review" },
    { project: "onto-4", path: "/Users/kangmin/cowork/onto-4/.onto/review" },
    { project: "AI-data-dashboard", path: "/Users/kangmin/cowork/AI-data-dashboard/.onto/review" },
    { project: "onto-3", path: "/Users/kangmin/cowork/onto-3/.onto/review" },
  ];

  const covers: SessionCover[] = [];
  for (const { project, path: reviewRoot } of roots) {
    if (!fs.existsSync(reviewRoot)) continue;
    const sessions = fs
      .readdirSync(reviewRoot)
      .filter((name) => /^\d{8}-[0-9a-f]+$/.test(name))
      .map((name) => path.join(reviewRoot, name));
    for (const sess of sessions) {
      const c = processSession(project, sess);
      if (c) covers.push(c);
    }
  }

  console.log(`# Found ${covers.length} sessions with 'Accounted findings'\n`);

  // Per-session detail
  console.log(`## Per-session minimum cover\n`);
  console.log(`| Session | Findings | Min cover | Required (sole) |`);
  console.log(`|---|---|---|---|`);
  for (const c of covers) {
    console.log(
      `| ${c.project}/${c.session_id} | ${c.total_findings} | ${c.min_cover.sort().join(", ")} | ${c.required_lenses.sort().join(", ") || "-"} |`,
    );
  }

  // Aggregate: how often each lens appears in min_cover
  console.log(`\n## Lens appearance in minimum covers\n`);
  const appearance = new Map<Lens, number>();
  const required = new Map<Lens, number>();
  for (const l of CORE_LENSES) {
    appearance.set(l, 0);
    required.set(l, 0);
  }
  for (const c of covers) {
    for (const l of c.min_cover) {
      if (CORE_LENS_SET.has(l)) appearance.set(l as Lens, appearance.get(l as Lens)! + 1);
    }
    for (const l of c.required_lenses) {
      if (CORE_LENS_SET.has(l)) required.set(l as Lens, required.get(l as Lens)! + 1);
    }
  }
  const ranked = [...appearance.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`| Lens | Appears in min_cover | Is required (sole contributor) |`);
  console.log(`|---|---|---|`);
  for (const [lens, cnt] of ranked) {
    console.log(`| ${lens} | ${cnt}/${covers.length} (${((cnt / covers.length) * 100).toFixed(1)}%) | ${required.get(lens)!} |`);
  }

  // Average minimum-cover size
  const avgSize =
    covers.reduce((a, c) => a + c.min_cover.length, 0) / covers.length;
  console.log(`\n## Summary`);
  console.log(`- Total sessions analyzed: ${covers.length}`);
  console.log(`- Avg finding count per session: ${(covers.reduce((a, c) => a + c.total_findings, 0) / covers.length).toFixed(1)}`);
  console.log(`- Avg minimum-cover size: ${avgSize.toFixed(2)} lenses`);
  console.log(`- vs full 9 lens: coverage achieved with ${((avgSize / 9) * 100).toFixed(0)}% of lens count`);

  // Try k-lens universal covers
  console.log(`\n## How many sessions does each k-lens subset fully cover?`);
  for (const k of [3, 4, 5]) {
    console.log(`\n### Top k=${k} subsets (by sessions fully covered)`);
    const combos = kCombinations([...CORE_LENSES], k);
    const results: { combo: string[]; covered: number }[] = [];
    for (const combo of combos) {
      const set = new Set(combo);
      let covered = 0;
      for (const c of covers) {
        if (c.findings.every((f) => f.contributing_lenses.some((l) => set.has(l)))) covered++;
      }
      results.push({ combo, covered });
    }
    results.sort((a, b) => b.covered - a.covered);
    const topN = 8;
    console.log(`| Combo | Sessions covered |`);
    console.log(`|---|---|`);
    for (const r of results.slice(0, topN)) {
      console.log(`| ${r.combo.sort().join(", ")} | ${r.covered}/${covers.length} (${((r.covered / covers.length) * 100).toFixed(0)}%) |`);
    }
  }
}

main();
