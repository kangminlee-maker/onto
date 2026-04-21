#!/usr/bin/env tsx
/**
 * v5 — Halted-session filter + consensus-depth metric.
 *
 * Round1 direct validation (2 external sessions) confirmed synthesize
 * attribution quality is high, but also uncovered that halted_partial
 * sessions pollute the pool: their final-output.md has degraded fallback
 * template (Unique Finding Tagging = lens ID echo, not real attribution).
 *
 * This script:
 *   1. Reads execution-result.yaml per session to filter halted ones.
 *      Valid = execution_status == "completed" AND synthesis_executed == true
 *      AND executed_lens_count >= 2.
 *   2. Parses Consensus/Conditional/Disagreement sections for "Accounted
 *      findings" tags (when present) to measure per-session consensus depth.
 *   3. Recomputes set-cover stats on filtered pool.
 *   4. Computes depth dimension: avg lenses contributing per consensus item,
 *      and estimated depth loss for Option P/Q/R.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as yamlParse } from "yaml";

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

interface ValidSession {
  project: string;
  session_id: string;
  session_dir: string;
  mode: string;
  required: Set<Lens>;
  consensusDepths: number[]; // contributing lens count per consensus item (if Accounted findings present)
}

function readExecStatus(sessionDir: string): { status: string; synth: boolean; lensCount: number } | null {
  const p = path.join(sessionDir, "execution-result.yaml");
  if (!fs.existsSync(p)) return null;
  try {
    const text = fs.readFileSync(p, "utf-8");
    const parsed = yamlParse(text) as Record<string, unknown>;
    return {
      status: String(parsed.execution_status ?? ""),
      synth: Boolean(parsed.synthesis_executed),
      lensCount: Number(parsed.executed_lens_count ?? 0),
    };
  } catch {
    return null;
  }
}

function extractSection(text: string, heading: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let inSection = false;
  for (const line of lines) {
    if (line.startsWith("### " + heading)) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith("### ") && !line.startsWith("### " + heading)) break;
    if (inSection) result.push(line);
  }
  return result.join("\n");
}

function parseAccountedLineLenses(line: string): Lens[] {
  const m = line.match(/Accounted findings:\s*(.+?)(?:\.\s*Evidence|\.\s*$|$)/i);
  if (!m) return [];
  const cleaned = m[1].replace(/`/g, "");
  const tokens = cleaned.split(",").map((t) => t.trim().replace(/\.$/, ""));
  const lenses = new Set<Lens>();
  for (const tok of tokens) {
    const lensM = tok.match(/^([a-z]+)(?:[#-][A-Za-z0-9]+)?/);
    if (lensM && CORE_LENS_SET.has(lensM[1])) lenses.add(lensM[1] as Lens);
  }
  return [...lenses];
}

function countUniqueLensTags(uniqueSection: string, lens: Lens): number {
  const re = new RegExp("`" + lens + "(?:-[A-Za-z0-9]+)?`", "g");
  const matches = uniqueSection.match(re);
  return matches ? matches.length : 0;
}

function processSession(project: string, sessionDir: string): ValidSession | null {
  const exec = readExecStatus(sessionDir);
  if (!exec) return null;
  if (exec.status !== "completed" || !exec.synth || exec.lensCount < 2) return null;

  const finalPath = path.join(sessionDir, "final-output.md");
  if (!fs.existsSync(finalPath)) return null;
  const text = fs.readFileSync(finalPath, "utf-8");
  if (!text.includes("### Unique Finding Tagging")) return null;

  const modeMatch = text.match(/^- Review mode:\s*(\S+)/m);
  const mode = modeMatch ? modeMatch[1] : "unknown";

  // Required lenses (from Unique Finding Tagging)
  const uniqueSection = extractSection(text, "Unique Finding Tagging");
  const required = new Set<Lens>();
  for (const lens of CORE_LENSES) {
    if (countUniqueLensTags(uniqueSection, lens) > 0) required.add(lens);
  }

  // Consensus depths — only measurable if "Accounted findings" pattern exists
  const consensusSection = extractSection(text, "Consensus");
  const condSection = extractSection(text, "Conditional Consensus");
  const disSection = extractSection(text, "Disagreement");
  const depths: number[] = [];
  for (const sec of [consensusSection, condSection, disSection]) {
    const lines = sec.split("\n");
    for (const line of lines) {
      if (/Accounted findings:/i.test(line)) {
        const lenses = parseAccountedLineLenses(line);
        if (lenses.length > 0) depths.push(lenses.length);
      }
    }
  }

  return {
    project,
    session_id: path.basename(sessionDir),
    session_dir: sessionDir,
    mode,
    required,
    consensusDepths: depths,
  };
}

function findReviewRoots(): string[] {
  const home = os.homedir();
  const coworkRoot = path.join(home, "cowork");
  if (!fs.existsSync(coworkRoot)) return [];
  const roots: string[] = [];
  const candidates = fs.readdirSync(coworkRoot).map((p) => path.join(coworkRoot, p));
  for (const c of candidates) {
    try {
      const direct = path.join(c, ".onto", "review");
      if (fs.existsSync(direct) && fs.statSync(direct).isDirectory()) {
        roots.push(direct);
        continue;
      }
      const sub = fs.readdirSync(c);
      for (const s of sub) {
        const nested = path.join(c, s, ".onto", "review");
        if (fs.existsSync(nested) && fs.statSync(nested).isDirectory()) roots.push(nested);
      }
    } catch {
      /* ignore */
    }
  }
  return roots;
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
  const roots = findReviewRoots();
  process.stderr.write(`Scanning ${roots.length} review roots...\n`);

  let total = 0;
  let parsed = 0;
  let rejectedNoExec = 0;
  let rejectedIncomplete = 0;
  const sessions: ValidSession[] = [];

  for (const reviewRoot of roots) {
    const projectRoot = reviewRoot.replace(/\/.onto\/review$/, "");
    const projectName = path.basename(projectRoot);
    let sessionDirs: string[] = [];
    try {
      sessionDirs = fs
        .readdirSync(reviewRoot)
        .filter((name) => /^\d{8}-[0-9a-f]+$/.test(name))
        .map((name) => path.join(reviewRoot, name));
    } catch {
      continue;
    }
    for (const sess of sessionDirs) {
      total++;
      const exec = readExecStatus(sess);
      if (!exec) {
        rejectedNoExec++;
        continue;
      }
      if (exec.status !== "completed" || !exec.synth || exec.lensCount < 2) {
        rejectedIncomplete++;
        continue;
      }
      const s = processSession(projectName, sess);
      if (s) {
        sessions.push(s);
        parsed++;
      }
    }
  }

  console.log(`# v5 — Filtered set-cover + depth metric\n`);
  console.log(`## Data filter\n`);
  console.log(`- Total session dirs: ${total}`);
  console.log(`- Rejected (no execution-result.yaml): ${rejectedNoExec}`);
  console.log(`- Rejected (incomplete/halted/light-mock/<2 lens): ${rejectedIncomplete}`);
  console.log(`- **Valid sessions: ${parsed}**\n`);

  // Mode distribution
  const modeCounts: Record<string, number> = {};
  for (const s of sessions) {
    modeCounts[s.mode] = (modeCounts[s.mode] || 0) + 1;
  }
  console.log(`## Mode distribution\n`);
  for (const mode of Object.keys(modeCounts)) {
    console.log(`- ${mode}: ${modeCounts[mode]}`);
  }
  console.log();

  // Focus on full mode for set-cover
  const fullSessions = sessions.filter((s) => s.mode === "full");
  console.log(`## Set-cover analysis (full mode, n=${fullSessions.length})\n`);

  const noUnique = fullSessions.filter((s) => s.required.size === 0).length;
  const withUnique = fullSessions.length - noUnique;
  console.log(`- No unique finding: ${noUnique}/${fullSessions.length} (${((noUnique / fullSessions.length) * 100).toFixed(1)}%)`);
  console.log(`- With ≥1 unique: ${withUnique}/${fullSessions.length} (${((withUnique / fullSessions.length) * 100).toFixed(1)}%)\n`);

  // Per-lens criticality
  console.log(`## Per-lens criticality (valid full sessions)\n`);
  console.log(`| Lens | Sessions requiring | % |`);
  console.log(`|---|---|---|`);
  const crit: { lens: Lens; count: number }[] = [];
  for (const lens of CORE_LENSES) {
    const cnt = fullSessions.filter((s) => s.required.has(lens)).length;
    crit.push({ lens, count: cnt });
  }
  crit.sort((a, b) => b.count - a.count);
  for (const { lens, count } of crit) {
    console.log(`| ${lens} | ${count}/${fullSessions.length} | ${((count / fullSessions.length) * 100).toFixed(1)}% |`);
  }
  console.log();

  // k-subset optimal (all k from 3 to 9)
  // Pre-compute per-item contributor sets for depth calculation
  const itemContribs: Lens[][] = [];
  const sessionsWithDepthFull = fullSessions.filter((s) => s.consensusDepths.length > 0);
  for (const s of sessionsWithDepthFull) {
    const finalText = fs.readFileSync(path.join(s.session_dir, "final-output.md"), "utf-8");
    for (const sec of [
      extractSection(finalText, "Consensus"),
      extractSection(finalText, "Conditional Consensus"),
      extractSection(finalText, "Disagreement"),
    ]) {
      for (const line of sec.split("\n")) {
        if (/Accounted findings:/i.test(line)) {
          const lenses = parseAccountedLineLenses(line);
          if (lenses.length > 0) itemContribs.push(lenses);
        }
      }
    }
  }
  const totalOrigDepth = itemContribs.reduce((a, c) => a + c.length, 0);
  const avgOrigDepth = itemContribs.length > 0 ? totalOrigDepth / itemContribs.length : 0;

  console.log(`## k-subset comparison (k=3 through 9)\n`);
  console.log(`Best-coverage subset at each k, with depth retention measured on ${itemContribs.length} consensus items.\n`);
  console.log(
    `| k | Best coverage subset | Coverage | Avg depth | Depth retention | Items lost |`,
  );
  console.log(`|---|---|---|---|---|---|`);
  for (const k of [3, 4, 5, 6, 7, 8, 9]) {
    const combos = kCombinations([...CORE_LENSES], k);
    const results: { combo: Lens[]; covered: number }[] = [];
    for (const combo of combos) {
      const set = new Set(combo);
      let covered = 0;
      for (const s of fullSessions) {
        if ([...s.required].every((l) => set.has(l))) covered++;
      }
      results.push({ combo, covered });
    }
    results.sort((a, b) => b.covered - a.covered);
    const best = results[0];
    const bestSet = new Set(best.combo);
    // Depth on this subset
    const reducedDepthSum = itemContribs.reduce(
      (a, c) => a + c.filter((l) => bestSet.has(l)).length,
      0,
    );
    const itemsLost = itemContribs.filter((c) => !c.some((l) => bestSet.has(l))).length;
    const avgDepth = itemContribs.length > 0 ? reducedDepthSum / itemContribs.length : 0;
    const retention =
      totalOrigDepth > 0 ? ((reducedDepthSum / totalOrigDepth) * 100).toFixed(1) : "n/a";
    const cov = ((best.covered / fullSessions.length) * 100).toFixed(1);
    console.log(
      `| ${k} | ${best.combo.sort().join(", ")} | ${best.covered}/${fullSessions.length} (${cov}%) | ${avgDepth.toFixed(2)} | ${retention}% | ${itemsLost}/${itemContribs.length} |`,
    );
  }

  console.log(`\n## k-subset — top-5 subsets per k (detail)\n`);
  for (const k of [3, 4, 5, 6, 7, 8, 9]) {
    console.log(`### k=${k}\n`);
    const combos = kCombinations([...CORE_LENSES], k);
    const results: { combo: Lens[]; covered: number }[] = [];
    for (const combo of combos) {
      const set = new Set(combo);
      let covered = 0;
      for (const s of fullSessions) {
        if ([...s.required].every((l) => set.has(l))) covered++;
      }
      results.push({ combo, covered });
    }
    results.sort((a, b) => b.covered - a.covered);
    console.log(`| Combo | Coverage |`);
    console.log(`|---|---|`);
    const topN = k === 9 ? 1 : 5;
    for (const r of results.slice(0, topN)) {
      console.log(
        `| ${r.combo.sort().join(", ")} | ${r.covered}/${fullSessions.length} (${((r.covered / fullSessions.length) * 100).toFixed(1)}%) |`,
      );
    }
    console.log();
  }

  // v0.2.0 baseline core-axis (pre-recomposition). v0.2.1 배포 이후 SSOT 는
  // .onto/authority/core-lens-registry.yaml 의 6-lens 구성 — 본 비교는 historical
  // baseline 보존 목적으로만 유지.
  const v020BaselineCore = new Set<Lens>(["logic", "pragmatics", "evolution", "axiology"]);
  const v020Covered = fullSessions.filter((s) => [...s.required].every((l) => v020BaselineCore.has(l))).length;
  console.log(
    `## v0.2.0 baseline core-axis {logic, pragmatics, evolution, axiology}: ${v020Covered}/${fullSessions.length} (${((v020Covered / fullSessions.length) * 100).toFixed(1)}%)\n`,
  );

  // Depth analysis — sessions with Accounted findings
  const sessionsWithDepth = fullSessions.filter((s) => s.consensusDepths.length > 0);
  console.log(`## Consensus depth (Accounted findings available)\n`);
  console.log(`- Sessions with depth data: ${sessionsWithDepth.length}/${fullSessions.length}`);
  if (sessionsWithDepth.length === 0) {
    console.log(`- No Accounted findings data available — depth analysis skipped`);
    return;
  }
  const allDepths = sessionsWithDepth.flatMap((s) => s.consensusDepths);
  const avgDepth = allDepths.reduce((a, b) => a + b, 0) / allDepths.length;
  const maxDepth = Math.max(...allDepths);
  const depthDist: Record<number, number> = {};
  for (const d of allDepths) depthDist[d] = (depthDist[d] || 0) + 1;
  console.log(`- Total consensus items: ${allDepths.length}`);
  console.log(`- Avg contributing lenses per item: **${avgDepth.toFixed(2)}**`);
  console.log(`- Max depth observed: ${maxDepth}`);
  console.log(`\n### Depth distribution\n`);
  console.log(`| Depth (# lenses) | Items |`);
  console.log(`|---|---|`);
  for (const k of Object.keys(depthDist).sort((a, b) => +a - +b)) {
    console.log(`| ${k} | ${depthDist[+k]} |`);
  }

  // Depth loss for Option P/Q/R
  console.log(`\n## Depth loss under reduced lens sets\n`);
  const options: { name: string; set: Lens[] }[] = [
    { name: "v0.2.0 baseline (logic, pragmatics, evolution, axiology)", set: ["logic", "pragmatics", "evolution", "axiology"] },
    { name: "Option P (axiology, coverage, evolution, logic, semantics)", set: ["axiology", "coverage", "evolution", "logic", "semantics"] },
    { name: "Option Q (conciseness, coverage, evolution, semantics)", set: ["conciseness", "coverage", "evolution", "semantics"] },
    { name: "Option R (coverage, semantics, logic)", set: ["coverage", "semantics", "logic"] },
  ];
  console.log(`For each consensus item, depth under reduced set = |{item's contributors} ∩ {reduced set}|\n`);
  console.log(`| Option | Lens count | Avg depth | Depth retention vs 9-lens |`);
  console.log(`|---|---|---|---|`);
  for (const opt of options) {
    const optSet = new Set(opt.set);
    const reducedDepths: number[] = [];
    for (const s of sessionsWithDepth) {
      for (const item of s.consensusDepths) {
        // We need the actual contributor sets, not just count — re-extract
      }
    }
    // Re-extract: need per-item contributor sets
    const itemContribs: Lens[][] = [];
    for (const s of sessionsWithDepth) {
      const finalText = fs.readFileSync(path.join(s.session_dir, "final-output.md"), "utf-8");
      for (const sec of [extractSection(finalText, "Consensus"), extractSection(finalText, "Conditional Consensus"), extractSection(finalText, "Disagreement")]) {
        for (const line of sec.split("\n")) {
          if (/Accounted findings:/i.test(line)) {
            const lenses = parseAccountedLineLenses(line);
            if (lenses.length > 0) itemContribs.push(lenses);
          }
        }
      }
    }
    const totalOrig = itemContribs.reduce((a, c) => a + c.length, 0);
    const totalReduced = itemContribs.reduce((a, c) => a + c.filter((l) => optSet.has(l)).length, 0);
    const itemsLost = itemContribs.filter((c) => !c.some((l) => optSet.has(l))).length;
    const avgReduced = totalReduced / itemContribs.length;
    const retention = ((totalReduced / totalOrig) * 100).toFixed(1);
    console.log(
      `| ${opt.name} | ${opt.set.length} | ${avgReduced.toFixed(2)} | ${retention}% (${itemsLost} items lost entirely) |`,
    );
  }
}

main();
