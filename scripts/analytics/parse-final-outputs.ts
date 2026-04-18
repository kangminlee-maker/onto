#!/usr/bin/env tsx
/**
 * Parse all .onto/review/<session>/final-output.md files across a list of
 * project roots and aggregate per-lens unique finding statistics for empirical
 * lens contribution analysis.
 *
 * Usage:
 *   tsx parse-final-outputs.ts                     (scans ~/cowork/* )
 *   tsx parse-final-outputs.ts <root1> <root2> ... (explicit review roots)
 *
 * Output: TSV to stdout + aggregate summary to stderr.
 */

import fs from "node:fs";
import os from "node:os";
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

interface SessionStats {
  project: string;
  session_id: string;
  mode: string;
  consensus_n: number;
  conditional_n: number;
  disagreement_n: number;
  per_lens: Record<Lens, number>;
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
    if (inSection && line.startsWith("### ") && !line.startsWith("### " + heading)) {
      break;
    }
    if (inSection) result.push(line);
  }
  return result.join("\n");
}

function countBulletsOrNumbered(section: string): number {
  const lines = section.split("\n");
  return lines.filter((l) => /^(\d+\.|\-)\s/.test(l)).length;
}

function countLensTags(uniqueSection: string, lens: Lens): number {
  const re = new RegExp("`" + lens + "(?:-[A-Za-z0-9]+)?`", "g");
  const matches = uniqueSection.match(re);
  return matches ? matches.length : 0;
}

function parseSession(project: string, sessionDir: string): SessionStats | null {
  const finalPath = path.join(sessionDir, "final-output.md");
  if (!fs.existsSync(finalPath)) return null;
  let text: string;
  try {
    text = fs.readFileSync(finalPath, "utf-8");
  } catch {
    return null;
  }
  if (!text.includes("### Unique Finding Tagging")) return null;

  const modeMatch = text.match(/^- Review mode:\s*(\S+)/m);
  const mode = modeMatch ? modeMatch[1] : "unknown";

  const consensusSection = extractSection(text, "Consensus");
  const conditionalSection = extractSection(text, "Conditional Consensus");
  const disagreementSection = extractSection(text, "Disagreement");
  const uniqueSection = extractSection(text, "Unique Finding Tagging");

  const per_lens = {} as Record<Lens, number>;
  for (const lens of CORE_LENSES) {
    per_lens[lens] = countLensTags(uniqueSection, lens);
  }

  return {
    project,
    session_id: path.basename(sessionDir),
    mode,
    consensus_n: countBulletsOrNumbered(consensusSection),
    conditional_n: countBulletsOrNumbered(conditionalSection),
    disagreement_n: countBulletsOrNumbered(disagreementSection),
    per_lens,
  };
}

function findReviewRoots(): string[] {
  const argRoots = process.argv.slice(2);
  if (argRoots.length > 0) return argRoots;
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

function main() {
  const roots = findReviewRoots();
  process.stderr.write(`Scanning ${roots.length} review roots...\n`);

  const stats: SessionStats[] = [];
  for (const reviewRoot of roots) {
    const projectRoot = reviewRoot.replace(/\/.onto\/review$/, "");
    const projectName = path.basename(projectRoot);
    let sessions: string[] = [];
    try {
      sessions = fs
        .readdirSync(reviewRoot)
        .filter((name) => /^\d{8}-[0-9a-f]+$/.test(name))
        .map((name) => path.join(reviewRoot, name));
    } catch {
      continue;
    }
    let parsed = 0;
    for (const sess of sessions) {
      const s = parseSession(projectName, sess);
      if (s) {
        stats.push(s);
        parsed++;
      }
    }
    process.stderr.write(`  ${projectName.padEnd(36)} ${String(sessions.length).padStart(5)} dirs, ${String(parsed).padStart(5)} parsed\n`);
  }

  const header = [
    "project",
    "session_id",
    "mode",
    "consensus_n",
    "conditional_n",
    "disagreement_n",
    ...CORE_LENSES,
  ].join("\t");
  console.log(header);
  for (const s of stats) {
    console.log(
      [
        s.project,
        s.session_id,
        s.mode,
        s.consensus_n,
        s.conditional_n,
        s.disagreement_n,
        ...CORE_LENSES.map((l) => s.per_lens[l]),
      ].join("\t"),
    );
  }

  process.stderr.write(`\n=== Aggregate (total ${stats.length} parsed sessions) ===\n`);
  const modes = [...new Set(stats.map((s) => s.mode))];
  for (const mode of modes) {
    const subset = stats.filter((s) => s.mode === mode);
    process.stderr.write(`\n--- Mode: ${mode} (n=${subset.length}) ---\n`);
    process.stderr.write(
      `avg consensus=${(subset.reduce((a, s) => a + s.consensus_n, 0) / subset.length).toFixed(1)}  ` +
        `conditional=${(subset.reduce((a, s) => a + s.conditional_n, 0) / subset.length).toFixed(1)}  ` +
        `disagreement=${(subset.reduce((a, s) => a + s.disagreement_n, 0) / subset.length).toFixed(1)}\n`,
    );
    const lensStats: { lens: Lens; total: number; appearances: number; rate: number; avg: number }[] = [];
    for (const lens of CORE_LENSES) {
      const total = subset.reduce((a, s) => a + s.per_lens[lens], 0);
      const appearances = subset.filter((s) => s.per_lens[lens] > 0).length;
      const rate = (appearances / subset.length) * 100;
      const avg = appearances > 0 ? total / appearances : 0;
      lensStats.push({ lens, total, appearances, rate, avg });
    }
    lensStats.sort((a, b) => b.rate - a.rate);
    for (const ls of lensStats) {
      process.stderr.write(
        `  ${ls.lens.padEnd(12)} total_uniq=${String(ls.total).padStart(5)}  ` +
          `session_w_uniq=${String(ls.appearances).padStart(5)}/${subset.length}  ` +
          `appearance_rate=${ls.rate.toFixed(1).padStart(6)}%  ` +
          `avg_when_appear=${ls.avg.toFixed(2)}\n`,
      );
    }
  }
}

main();
