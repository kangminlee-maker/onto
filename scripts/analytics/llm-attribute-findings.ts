#!/usr/bin/env tsx
/**
 * Phase B — LLM-based finding-lens attribution for legacy review sessions.
 *
 * For each session, extract finding items from final-output.md's consensus /
 * conditional / disagreement sections, and ask an LLM to classify which of the
 * 9 lenses contributed to each finding (using each lens's round1/*.md output).
 *
 * Output: JSON lines file with per-session attribution, consumable by
 * compute-set-cover.ts (or its Phase-B variant).
 *
 * Usage:
 *   tsx llm-attribute-findings.ts --sample 20
 *   tsx llm-attribute-findings.ts --all
 */

import fs from "node:fs";
import path from "node:path";
import { callLlm } from "../../src/core-runtime/learning/shared/llm-caller.js";

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

interface SessionCandidate {
  project: string;
  session_dir: string;
  session_id: string;
}

interface Finding {
  id: string;
  text: string;
  section: "Consensus" | "Conditional" | "Disagreement";
}

interface SessionAttribution {
  project: string;
  session_id: string;
  findings: Finding[];
  attributions: { finding_id: string; contributing_lenses: string[] }[];
  error?: string;
  tokens?: { input?: number; output?: number };
}

const SYSTEM_PROMPT = `You are a review lens capability analyst. Given a list of findings from a 9-lens code/document review, determine which lenses are CAPABLE of detecting each finding based on the lens verification dimensions.

NOTE: This is a capability/taxonomy judgment (which lenses COULD detect this defect), not a historical claim of who actually found it. Round1 outputs are not available in this mode.

The 9 lenses and their verification dimensions:
- logic: Contradictions, type conflicts, constraint conflicts, inference failures
- structure: Isolated elements, broken paths, missing relations, ME/CE violations
- dependency: Cycles, reverse direction, diamond dependencies, broken references
- semantics: Name-meaning alignment, synonyms/homonyms, terminology drift, label/concept mismatch
- pragmatics: Queryability, competency question testing, usability, mental model drift
- evolution: Breakage when adding new data/domains, migration risk, schema instability
- coverage: Missing sub-areas, concept bias, gaps against standards, unmodeled territory
- conciseness: Duplicate definitions, over-specification, redundant surfaces, noise
- axiology: Purpose drift, value conflict, mission misalignment, policy gap

For each finding in the "Findings" list:
1. Read the finding text carefully.
2. Determine which of the 9 verification dimensions the finding falls under (a finding can span multiple dimensions).
3. Include all lenses whose dimension matches. Be inclusive — if the finding clearly fits a lens's dimension, include it.
4. Include a lens ONLY IF there is substantive dimension match, not tangential relevance.
5. A finding typically has 1 to 4 detectable_by lenses.

Respond in strict JSON, no prose:
{
  "attributions": [
    {"finding_id": "C1", "contributing_lenses": ["logic", "structure"]},
    {"finding_id": "C2", "contributing_lenses": ["axiology"]},
    ...
  ]
}

"contributing_lenses" here means "detectable_by". Preserve the order of finding_ids.`;

function extractFindings(finalOutputText: string): Finding[] {
  const findings: Finding[] = [];
  const lines = finalOutputText.split("\n");
  let section: Finding["section"] | null = null;
  const sectionMap: Record<string, Finding["section"]> = {
    Consensus: "Consensus",
    "Conditional Consensus": "Conditional",
    Disagreement: "Disagreement",
  };
  const idPrefix: Record<Finding["section"], string> = {
    Consensus: "C",
    Conditional: "CC",
    Disagreement: "D",
  };
  const idxPerSection: Record<Finding["section"], number> = {
    Consensus: 0,
    Conditional: 0,
    Disagreement: 0,
  };
  for (const line of lines) {
    const headingMatch = line.match(/^### (.+?)(?:\s+\(|$)/);
    if (headingMatch) {
      const headingKey = headingMatch[1].trim();
      section =
        Object.keys(sectionMap).find((k) =>
          headingKey.startsWith(k),
        ) as Finding["section"] | undefined || null;
      if (section) section = sectionMap[section];
      continue;
    }
    if (!section) continue;
    const bulletMatch = line.match(/^(\d+\.|\-)\s+(.+)/);
    if (bulletMatch && !line.startsWith("- Accounted") && !line.startsWith("- Preserved") && !line.startsWith("- Condition") && !line.startsWith("- Status") && !line.startsWith("- Synthesis")) {
      idxPerSection[section]++;
      const id = idPrefix[section] + idxPerSection[section];
      // Take first 400 chars as the finding signature
      const text = bulletMatch[2].slice(0, 400).trim();
      findings.push({ id, text, section });
    }
  }
  return findings;
}

function readRound1(sessionDir: string, lens: string, maxChars = 3500): string {
  const p = path.join(sessionDir, "round1", `${lens}.md`);
  if (!fs.existsSync(p)) return `(round1/${lens}.md not found)`;
  try {
    const text = fs.readFileSync(p, "utf-8");
    if (text.length <= maxChars) return text;
    // Take first 60% + last 40% to preserve both header context and conclusions
    const head = text.slice(0, Math.floor(maxChars * 0.6));
    const tail = text.slice(text.length - Math.floor(maxChars * 0.4));
    return head + "\n\n... [TRUNCATED] ...\n\n" + tail;
  } catch {
    return `(round1/${lens}.md read error)`;
  }
}

async function attributeSession(c: SessionCandidate): Promise<SessionAttribution> {
  const finalPath = path.join(c.session_dir, "final-output.md");
  if (!fs.existsSync(finalPath)) {
    return {
      project: c.project,
      session_id: c.session_id,
      findings: [],
      attributions: [],
      error: "no final-output.md",
    };
  }
  const finalText = fs.readFileSync(finalPath, "utf-8");
  const findings = extractFindings(finalText);
  if (findings.length === 0) {
    return {
      project: c.project,
      session_id: c.session_id,
      findings: [],
      attributions: [],
      error: "no findings extracted",
    };
  }

  const findingBlock = findings
    .map((f) => `${f.id} [${f.section}]: ${f.text}`)
    .join("\n\n");

  const userPrompt = `# Session context
project: ${c.project}
session_id: ${c.session_id}

# Findings
${findingBlock}

# Task
For each finding listed above, determine which lenses' verification dimensions match. Output the JSON as specified in the system prompt.`;

  try {
    const result = await callLlm(SYSTEM_PROMPT, userPrompt, {
      max_tokens: 1500,
    });
    // Parse JSON
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        project: c.project,
        session_id: c.session_id,
        findings,
        attributions: [],
        error: "LLM response did not contain JSON",
      };
    }
    const parsed = JSON.parse(jsonMatch[0]) as {
      attributions?: { finding_id: string; contributing_lenses: string[] }[];
    };
    const attributions = (parsed.attributions ?? [])
      .map((a) => ({
        finding_id: a.finding_id,
        contributing_lenses: (a.contributing_lenses ?? []).filter((l) =>
          (CORE_LENSES as readonly string[]).includes(l),
        ),
      }))
      .filter((a) => findings.some((f) => f.id === a.finding_id));
    return {
      project: c.project,
      session_id: c.session_id,
      findings,
      attributions,
    };
  } catch (err) {
    return {
      project: c.project,
      session_id: c.session_id,
      findings,
      attributions: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function pickSample(candidates: SessionCandidate[], n: number): SessionCandidate[] {
  // Stratified by project, then date-spread
  const byProject: Record<string, SessionCandidate[]> = {};
  for (const c of candidates) {
    byProject[c.project] ??= [];
    byProject[c.project].push(c);
  }
  const projects = Object.keys(byProject).sort(
    (a, b) => byProject[b].length - byProject[a].length,
  );
  const sample: SessionCandidate[] = [];
  let remaining = n;
  for (const p of projects) {
    const share = Math.max(
      1,
      Math.round((byProject[p].length / candidates.length) * n),
    );
    const take = Math.min(share, byProject[p].length, remaining);
    // Spread across time: sort by session_id (date prefix) and take every k-th
    const sorted = byProject[p].slice().sort((a, b) => a.session_id.localeCompare(b.session_id));
    const step = Math.max(1, Math.floor(sorted.length / take));
    for (let i = 0; i < take; i++) {
      sample.push(sorted[Math.min(i * step, sorted.length - 1)]);
    }
    remaining -= take;
    if (remaining <= 0) break;
  }
  return sample.slice(0, n);
}

async function main() {
  const args = process.argv.slice(2);
  const sampleSize = (() => {
    const i = args.indexOf("--sample");
    if (i >= 0 && args[i + 1]) return parseInt(args[i + 1], 10);
    if (args.includes("--all")) return Infinity;
    return 20;
  })();

  // Load TSV to find full-mode sessions
  const tsvPath =
    "/Users/kangmin/cowork/onto-4/.onto/temp/analytics/all-projects-stats.tsv";
  if (!fs.existsSync(tsvPath)) {
    console.error(
      "Expected TSV at " +
        tsvPath +
        ". Run parse-final-outputs.ts first to generate it.",
    );
    process.exit(1);
  }
  const tsv = fs.readFileSync(tsvPath, "utf-8").split("\n");
  const header = tsv[0].split("\t");
  const projectIdx = header.indexOf("project");
  const sessionIdx = header.indexOf("session_id");
  const modeIdx = header.indexOf("mode");
  const candidates: SessionCandidate[] = [];
  for (let i = 1; i < tsv.length; i++) {
    const row = tsv[i].split("\t");
    if (row.length < 3) continue;
    if (row[modeIdx] !== "full") continue;
    const project = row[projectIdx];
    const session_id = row[sessionIdx];
    const projectPath =
      project === "day1co-ontology"
        ? `/Users/kangmin/cowork/fc-repo/${project}`
        : `/Users/kangmin/cowork/${project}`;
    const session_dir = path.join(projectPath, ".onto/review", session_id);
    if (!fs.existsSync(session_dir)) continue;
    candidates.push({ project, session_id, session_dir });
  }

  const picked =
    sampleSize === Infinity ? candidates : pickSample(candidates, sampleSize);
  process.stderr.write(`Processing ${picked.length}/${candidates.length} sessions...\n`);

  // Concurrency limit
  const CONCURRENCY = 5;
  const results: SessionAttribution[] = [];
  let idx = 0;
  async function worker() {
    while (true) {
      const myIdx = idx++;
      if (myIdx >= picked.length) break;
      const c = picked[myIdx];
      process.stderr.write(`[${myIdx + 1}/${picked.length}] ${c.project}/${c.session_id}...\n`);
      const r = await attributeSession(c);
      results.push(r);
      const status = r.error ? `ERROR(${r.error.slice(0, 40)})` : `OK (${r.findings.length} findings)`;
      process.stderr.write(`    ${status}\n`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Output: JSONL
  const outPath =
    "/Users/kangmin/cowork/onto-4/.onto/temp/analytics/phase-b-attributions.jsonl";
  fs.writeFileSync(
    outPath,
    results.map((r) => JSON.stringify(r)).join("\n") + "\n",
  );
  process.stderr.write(`\nWrote ${results.length} results to ${outPath}\n`);

  // Summary
  const ok = results.filter((r) => !r.error);
  const err = results.filter((r) => r.error);
  process.stderr.write(`\nSuccess: ${ok.length}, Errors: ${err.length}\n`);
  if (err.length > 0) {
    process.stderr.write(`\nError samples:\n`);
    for (const e of err.slice(0, 3))
      process.stderr.write(`  ${e.project}/${e.session_id}: ${e.error}\n`);
  }
  // Sample attribution
  if (ok.length > 0) {
    const s = ok[0];
    process.stderr.write(`\nSample attribution (${s.project}/${s.session_id}):\n`);
    for (const a of s.attributions.slice(0, 5)) {
      process.stderr.write(
        `  ${a.finding_id}: [${a.contributing_lenses.join(", ")}]\n`,
      );
    }
  }
}

main();
