#!/usr/bin/env tsx
/**
 * Parse all .onto/review/<session>/final-output.md files and aggregate
 * per-lens unique finding statistics for empirical lens contribution analysis.
 *
 * Output: TSV to stdout + aggregate summary.
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

interface SessionStats {
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
  // Match `lens` or `lens-XYZ` at backtick boundaries
  const re = new RegExp("`" + lens + "(?:-[A-Za-z0-9]+)?`", "g");
  const matches = uniqueSection.match(re);
  return matches ? matches.length : 0;
}

function parseSession(sessionDir: string): SessionStats | null {
  const finalPath = path.join(sessionDir, "final-output.md");
  if (!fs.existsSync(finalPath)) return null;
  const text = fs.readFileSync(finalPath, "utf-8");

  // Extract review mode from verification context
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
    session_id: path.basename(sessionDir),
    mode,
    consensus_n: countBulletsOrNumbered(consensusSection),
    conditional_n: countBulletsOrNumbered(conditionalSection),
    disagreement_n: countBulletsOrNumbered(disagreementSection),
    per_lens,
  };
}

function main() {
  const reviewRoot = "/Users/kangmin/cowork/onto-4/.onto/review";
  const sessions = fs
    .readdirSync(reviewRoot)
    .filter((name) => /^\d{8}-[0-9a-f]+$/.test(name))
    .map((name) => path.join(reviewRoot, name));

  const stats: SessionStats[] = [];
  for (const sess of sessions) {
    const s = parseSession(sess);
    if (s) stats.push(s);
  }

  // TSV
  const header = [
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
        s.session_id,
        s.mode,
        s.consensus_n,
        s.conditional_n,
        s.disagreement_n,
        ...CORE_LENSES.map((l) => s.per_lens[l]),
      ].join("\t"),
    );
  }

  // Aggregate by mode
  console.error(`\n=== Aggregate ===`);
  const modes = [...new Set(stats.map((s) => s.mode))];
  for (const mode of modes) {
    const subset = stats.filter((s) => s.mode === mode);
    console.error(`\n--- Mode: ${mode} (n=${subset.length}) ---`);
    console.error(
      `avg consensus=${(subset.reduce((a, s) => a + s.consensus_n, 0) / subset.length).toFixed(1)}  ` +
        `conditional=${(subset.reduce((a, s) => a + s.conditional_n, 0) / subset.length).toFixed(1)}  ` +
        `disagreement=${(subset.reduce((a, s) => a + s.disagreement_n, 0) / subset.length).toFixed(1)}`,
    );
    for (const lens of CORE_LENSES) {
      const total = subset.reduce((a, s) => a + s.per_lens[lens], 0);
      const appearances = subset.filter((s) => s.per_lens[lens] > 0).length;
      const appearRate = ((appearances / subset.length) * 100).toFixed(1);
      const avgWhenAppear = appearances > 0 ? (total / appearances).toFixed(2) : "-";
      console.error(
        `  ${lens.padEnd(12)} total_uniq=${String(total).padStart(3)}  ` +
          `session_w_uniq=${appearances}/${subset.length}  ` +
          `appearance_rate=${appearRate.padStart(5)}%  ` +
          `avg_when_appear=${avgWhenAppear}`,
      );
    }
  }
}

main();
