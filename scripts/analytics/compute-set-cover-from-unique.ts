#!/usr/bin/env tsx
/**
 * Set-cover simulation using "Unique Finding Tagging" data (v2 parser output).
 *
 * Key insight: the "Unique Finding Tagging" section of final-output.md
 * identifies, per finding, whether it was a unique contribution of a single
 * lens (Primary classification: unique). Therefore:
 *
 *   - For each session, the set of lenses that produced at least one unique
 *     finding = the set of REQUIRED lenses (sole contributors for at least
 *     one finding). Any reduced lens set that omits one of these misses
 *     at least one finding from that session.
 *
 *   - For a candidate lens subset K, session S is "fully covered" iff
 *     required_lenses(S) ⊆ K.
 *
 * This gives a precise lower-bound empirical set-cover analysis across
 * all 479 full sessions without needing LLM attribution of consensus items.
 * (Consensus findings by definition have ≥2 contributing lenses, so they
 * tolerate lens removal; unique findings are the binding constraint.)
 */

import fs from "node:fs";

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

interface SessionRow {
  project: string;
  session_id: string;
  required: Set<Lens>;
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

function main() {
  const tsvPath =
    "/Users/kangmin/cowork/onto-4/.onto/temp/analytics/all-projects-stats.tsv";
  if (!fs.existsSync(tsvPath)) {
    console.error("Run parse-final-outputs.ts first to generate " + tsvPath);
    process.exit(1);
  }
  const lines = fs.readFileSync(tsvPath, "utf-8").split("\n").filter((l) => l.trim());
  const header = lines[0].split("\t");
  const lensIdx: Record<Lens, number> = {} as Record<Lens, number>;
  for (const lens of CORE_LENSES) {
    lensIdx[lens] = header.indexOf(lens);
  }
  const projectIdx = header.indexOf("project");
  const sessionIdx = header.indexOf("session_id");
  const modeIdx = header.indexOf("mode");

  const sessions: SessionRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split("\t");
    if (row[modeIdx] !== "full") continue;
    const required = new Set<Lens>();
    for (const lens of CORE_LENSES) {
      const cnt = parseInt(row[lensIdx[lens]] || "0", 10);
      if (cnt > 0) required.add(lens);
    }
    sessions.push({
      project: row[projectIdx],
      session_id: row[sessionIdx],
      required,
    });
  }

  console.log(`# Set-cover simulation from Unique Finding Tagging data\n`);
  console.log(`Full-mode sessions: ${sessions.length}\n`);

  // Baseline stats
  const noUniqueCount = sessions.filter((s) => s.required.size === 0).length;
  console.log(
    `Sessions with no unique findings: ${noUniqueCount}/${sessions.length} (${((noUniqueCount / sessions.length) * 100).toFixed(1)}%) — trivially covered by ANY subset`,
  );
  const sessionsWithUnique = sessions.filter((s) => s.required.size > 0);
  console.log(
    `Sessions with ≥1 unique: ${sessionsWithUnique.length}/${sessions.length} (${((sessionsWithUnique.length / sessions.length) * 100).toFixed(1)}%) — set-cover constraint applies\n`,
  );

  const reqSizeDist: Record<number, number> = {};
  for (const s of sessionsWithUnique) {
    reqSizeDist[s.required.size] = (reqSizeDist[s.required.size] || 0) + 1;
  }
  console.log(`## Distribution of required-lens count per session`);
  console.log(`| required size | sessions |`);
  console.log(`|---|---|`);
  for (const k of Object.keys(reqSizeDist).sort((a, b) => +a - +b)) {
    console.log(`| ${k} | ${reqSizeDist[+k]} |`);
  }
  console.log();

  // Per-k subset analysis: for each k, find top combinations that cover most sessions
  for (const k of [2, 3, 4, 5, 6]) {
    console.log(`## k=${k} — top subsets by coverage\n`);
    const combos = kCombinations([...CORE_LENSES], k);
    const results: { combo: Lens[]; fullyCovered: number; sessionsLost: number }[] = [];
    for (const combo of combos) {
      const set = new Set(combo);
      let covered = 0;
      for (const s of sessions) {
        if ([...s.required].every((l) => set.has(l))) covered++;
      }
      results.push({ combo, fullyCovered: covered, sessionsLost: sessions.length - covered });
    }
    results.sort((a, b) => b.fullyCovered - a.fullyCovered);
    console.log(`| Combo | Fully covered | % | Sessions lost |`);
    console.log(`|---|---|---|---|`);
    for (const r of results.slice(0, 8)) {
      const pct = ((r.fullyCovered / sessions.length) * 100).toFixed(1);
      console.log(
        `| ${r.combo.sort().join(", ")} | ${r.fullyCovered}/${sessions.length} | ${pct}% | ${r.sessionsLost} |`,
      );
    }
    console.log();
  }

  // How many sessions would current core-axis cover?
  const currentCore = new Set<Lens>(["logic", "pragmatics", "evolution", "axiology"]);
  const currentCovered = sessions.filter((s) =>
    [...s.required].every((l) => currentCore.has(l)),
  ).length;
  console.log(
    `## Current core-axis (logic, pragmatics, evolution, axiology) coverage: ${currentCovered}/${sessions.length} (${((currentCovered / sessions.length) * 100).toFixed(1)}%)`,
  );

  // Per-lens "criticality": for each lens, how many sessions require it?
  console.log(`\n## Per-lens criticality (sessions that strictly require this lens)\n`);
  console.log(`| Lens | Sessions requiring | % |`);
  console.log(`|---|---|---|`);
  const critical: { lens: Lens; count: number }[] = [];
  for (const lens of CORE_LENSES) {
    const cnt = sessions.filter((s) => s.required.has(lens)).length;
    critical.push({ lens, count: cnt });
  }
  critical.sort((a, b) => b.count - a.count);
  for (const { lens, count } of critical) {
    console.log(
      `| ${lens} | ${count}/${sessions.length} | ${((count / sessions.length) * 100).toFixed(1)}% |`,
    );
  }

  // Greedy set cover: smallest set that covers 95% sessions
  console.log(`\n## Greedy minimum sets for coverage targets\n`);
  for (const target of [0.8, 0.9, 0.95, 1.0]) {
    const chosen: Lens[] = [];
    const remaining = new Set(sessions.map((s, i) => i));
    const neededCount = Math.ceil(sessions.length * target);
    while (remaining.size > sessions.length - neededCount) {
      let best: Lens | null = null;
      let bestGain = -1;
      for (const lens of CORE_LENSES) {
        if (chosen.includes(lens)) continue;
        const trySet = new Set([...chosen, lens]);
        let newlyCovered = 0;
        for (const idx of remaining) {
          if ([...sessions[idx].required].every((l) => trySet.has(l))) newlyCovered++;
        }
        if (newlyCovered > bestGain) {
          bestGain = newlyCovered;
          best = lens;
        }
      }
      if (best === null || bestGain === 0) break;
      chosen.push(best);
      const trySet = new Set(chosen);
      for (const idx of [...remaining]) {
        if ([...sessions[idx].required].every((l) => trySet.has(l))) remaining.delete(idx);
      }
      if (chosen.length >= 9) break;
    }
    const actualCovered = sessions.length - remaining.size;
    console.log(
      `- Target ${(target * 100).toFixed(0)}%: {${chosen.join(", ")}} — covers ${actualCovered}/${sessions.length} (${((actualCovered / sessions.length) * 100).toFixed(1)}%)`,
    );
  }
}

main();
