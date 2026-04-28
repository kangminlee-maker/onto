/**
 * TeamCreate Lens Deliberation Executor — Option E (2026-04-29 정정).
 *
 * # What this module is
 *
 * Realizes the protocol side of topology `cc-teams-lens-agent-deliberation`.
 * In this topology, the main session spawns 10 flat-sibling TeamCreate
 * sessions (1 teamlead + 9 lens) — TeamCreate cannot recurse, so every
 * TeamCreate is a direct child of the main session. The teamlead and the
 * 9 lens agents communicate via SendMessage; "team membership" here is
 * a logical collaboration relationship, not a nested-spawn relationship.
 *
 * Communication flow (Option E):
 *
 *   ① main → teamlead       : initial context injection
 *   ② teamlead → lens × 9   : lens-specific prompt fan-out (via SendMessage)
 *   ③ lens × 9 → teamlead   : Round 0 primary outputs
 *   ④ Synthesize 1차 (always): integrates all 9 outputs and emits
 *                              `deliberation_status` + `conflicting_pairs`
 *                              in its frontmatter.
 *   ⑤ (conditional) — only if conflicting_pairs is non-empty:
 *      For each pair (lens-A, lens-B):
 *        lens-A ↔ lens-B    : direct peer-to-peer SendMessage A2A
 *                              (no teamlead in the loop; deliberation
 *                              writes peer-deliberation artifacts)
 *      Once finished, peer artifacts are returned to the teamlead.
 *   ⑥ Synthesize 2차 (conditional, only if step ⑤ ran):
 *      consumes peer-deliberation artifacts + step ④ output → final.
 *
 * Round 0 outputs are always produced. Subsequent deliberation is
 * **conditional** on conflicts being identified by Synthesize 1차, and
 * the deliberation surface is **scoped to the conflicting lens pair**.
 * No unconditional all-lens re-evaluation step.
 *
 * # Why it exists
 *
 * `cc-teams-lens-agent-deliberation` is the only topology in which lens
 * agents can directly cross-talk without ending their sessions —
 * every other topology terminates lens agents after Round 0 so only
 * the synthesize step integrates findings. Deliberation therefore
 * requires the 10 TeamCreate sessions to remain persistent across the
 * full lifecycle (Round 0 → Synthesize 1차 → optional peer round →
 * optional Synthesize 2차). Terminating any TeamCreate after Round 0
 * forecloses the optional peer round.
 *
 * # How it relates
 *
 * - `resolveExecutionTopology()` selects `cc-teams-lens-agent-deliberation`
 *   only when TRIPLE opt-in is satisfied (CLAUDECODE + experimental flag
 *   + `config.lens_agent_teams_mode`). This module re-checks the same
 *   three flags via `requireDeliberationOptIn()` as a defence-in-depth
 *   guard for direct callers.
 * - `TeamCreate` / `SendMessage` themselves are Claude Code tools invoked
 *   by the Claude coordinator agent (not by the TS subprocess). This
 *   module produces PROTOCOL ARTIFACTS — prompts the agent sends,
 *   markdown files it writes, schema the synthesize step consumes —
 *   so the Claude agent has a deterministic script to follow. The
 *   actual A2A message dispatch stays at the Claude tool layer.
 *
 * # Scope of this module (Option E spec lock-in)
 *
 * - Triple opt-in guard (`requireDeliberationOptIn`)
 * - Peer-to-peer prompt template (`buildPeerDeliberationPrompt`)
 * - Artifact read/write helpers (pair-scoped paths)
 * - Conflicting-pair extraction from Synthesize 1차 frontmatter
 *   (`extractConflictingPairsFromSynthesize1`)
 * - Disagreement extraction from peer artifacts for Synthesize 2차
 *   (`extractDisagreementsFromPeerArtifacts`)
 * - Plan orchestration entrypoint (`runLensAgentDeliberation`) — produces
 *   peer-to-peer steps the coordinator agent walks through. Returns
 *   an empty plan when no conflicts were identified.
 *
 * Activation (actual coordinator-driven dispatch of the peer round) is
 * deferred to a follow-up PR; this module is the canonical spec.
 *
 * # Design reference
 *
 * - Option E spec (2026-04-29 — agreed in dialogue: minimal-cost
 *   conditional deliberation; lens orthogonality makes unconditional
 *   cross-pollination low-ROI; flat-sibling TeamCreate is a platform
 *   constraint — TeamCreate cannot recurse).
 * - Predecessor: Sketch v3 §3.1 option 1-0 (round-based unconditional
 *   re-evaluation) — superseded.
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { OntoConfig } from "../discovery/config-chain.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Reference to a single lens's primary (Round 0) output on disk. */
export interface LensPrimaryOutput {
  lens_id: string;
  /** Absolute path to the lens's Round 0 primary output markdown. */
  output_path: string;
}

/**
 * One pair of lenses Synthesize 1차 has identified as conflicting.
 *
 * The pair is unordered (deliberation is symmetric); for filesystem and
 * trace stability, the pair directory name is constructed from
 * lexicographically sorted lens IDs (see `deliberationArtifactPath`).
 */
export interface ConflictingLensPair {
  lens_a: LensPrimaryOutput;
  lens_b: LensPrimaryOutput;
  /**
   * Section / area where the conflict surfaced. Free-form string from
   * Synthesize 1차 frontmatter (e.g. "structure-section-3", "axiology
   * vs conciseness — naming"). Passed verbatim into peer prompts as
   * conflict context.
   */
  target_section: string;
  /**
   * Short summary of the conflict (≤ 240 chars expected). Provides the
   * peer prompt with a one-paragraph orientation so each lens does not
   * have to re-derive the disagreement from primary outputs alone.
   */
  summary: string;
}

export interface LensDeliberationInput {
  /**
   * Pairs of lenses with surfaced disagreements (sourced from Synthesize
   * 1차 frontmatter via `extractConflictingPairsFromSynthesize1`).
   *
   * Empty array → no deliberation needed; `runLensAgentDeliberation`
   * returns an empty plan and the coordinator advances directly to
   * final synthesis (the Synthesize 1차 output is already the final).
   */
  conflicting_pairs: ConflictingLensPair[];
  /**
   * Directory under which peer artifacts are written:
   *   <deliberation_dir>/<lens-A-id>--<lens-B-id>/<authoring-lens>-deliberation.md
   *
   * The pair directory uses lexicographically sorted lens IDs to ensure
   * `(A,B)` and `(B,A)` resolve to the same directory regardless of
   * which lens is listed as `lens_a` in the input.
   */
  deliberation_dir: string;
}

/**
 * One peer deliberation step the coordinator dispatches via SendMessage.
 *
 * For each conflicting pair the plan emits **two** steps — one per lens
 * — so each lens can write its own deliberation reply about the same
 * pair. This is symmetric peer-to-peer; no teamlead-as-arbiter step is
 * inserted.
 */
export interface PeerDeliberationStep {
  /** Lens authoring this deliberation reply. */
  lens_id: string;
  /** The peer lens this reply is responding to. */
  peer_lens_id: string;
  /** Free-form conflict-area label from the originating ConflictingLensPair. */
  target_section: string;
  /** Prompt text the coordinator sends via SendMessage. */
  prompt: string;
  /** Absolute path where the lens agent's deliberation reply must be written. */
  artifact_path: string;
}

export interface DeliberationPlan {
  /**
   * Ordered steps the coordinator walks through. Empty when
   * `conflicting_pairs` is empty (the no-conflict path).
   */
  steps: PeerDeliberationStep[];
  /** Paths the Synthesize 2차 step reads. */
  all_artifact_paths: string[];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class DeliberationOptInError extends Error {
  constructor(public readonly missing: string[]) {
    super(
      [
        "cc-teams-lens-agent-deliberation topology 는 3 중 opt-in 이 모두 필요합니다.",
        "누락된 조건:",
        ...missing.map((m) => `  - ${m}`),
        "",
        "해결:",
        "  1. Claude Code 세션에서 실행 (CLAUDECODE=1 자동)",
        "  2. ~/.claude*/settings.json 에 CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 설정",
        "  3. .onto/config.yml 에 lens_agent_teams_mode: true 명시",
      ].join("\n"),
    );
    this.name = "DeliberationOptInError";
  }
}

// ---------------------------------------------------------------------------
// Triple opt-in guard
// ---------------------------------------------------------------------------

/**
 * Defence-in-depth check. `resolveExecutionTopology` already enforces the
 * same three flags at resolver time, but direct callers of this module
 * (tests, bespoke scripts) also bear the invariant. Called at the top of
 * `runLensAgentDeliberation`.
 */
export function requireDeliberationOptIn(
  ontoConfig: OntoConfig,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const missing: string[] = [];
  if (env.CLAUDECODE !== "1") missing.push("CLAUDECODE=1 (Claude Code 세션 아님)");
  if (env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS !== "1") {
    missing.push("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 (experimental agent teams 미활성)");
  }
  if (ontoConfig.lens_agent_teams_mode !== true) {
    missing.push("config.lens_agent_teams_mode=true (프로젝트 opt-in 미설정)");
  }
  if (missing.length > 0) {
    throw new DeliberationOptInError(missing);
  }
}

// ---------------------------------------------------------------------------
// Prompt templates
// ---------------------------------------------------------------------------

/**
 * Peer deliberation prompt — lens A authors a reply directed at lens B
 * about the specific conflict Synthesize 1차 surfaced.
 *
 * Authoring lens reads its own primary output implicitly (in its session
 * memory). The prompt provides:
 *
 *   - The peer lens's primary output (verbatim)
 *   - The conflict's target_section + summary
 *   - Instructions for an agree / disagree / refine reply shape
 *
 * Communication is direct lens-to-lens via SendMessage A2A. The reply
 * lands in `<deliberation_dir>/<sorted-pair>/<own-lens>-deliberation.md`
 * and is read by Synthesize 2차 (or by the symmetric peer for a
 * follow-up reply, if the coordinator extends the round).
 */
export function buildPeerDeliberationPrompt(args: {
  own_lens_id: string;
  peer_lens_id: string;
  peer_output: string;
  target_section: string;
  conflict_summary: string;
}): string {
  return [
    `# Peer Deliberation — lens "${args.own_lens_id}" replying to "${args.peer_lens_id}"`,
    "",
    `Synthesize 1차 가 두 lens 의 평가에서 **충돌 영역** 을 식별했습니다.`,
    `당신은 이 충돌 영역에서 peer lens 와 직접 deliberation 을 진행합니다.`,
    "",
    "# 충돌 컨텍스트",
    "",
    `- **Target 영역**: ${args.target_section}`,
    `- **충돌 요약**: ${args.conflict_summary}`,
    "",
    `# Peer (${args.peer_lens_id}) 의 primary 출력`,
    "",
    args.peer_output.trim(),
    "",
    "# 당신의 작업",
    "",
    "Peer 의 출력을 읽고 **target 영역 에 한정** 하여 응답하세요:",
    "",
    "1. **합의 가능 지점**: peer 의 어느 판단을 받아들일 수 있는가?",
    "   당신의 lens 관점에서 동의 가능한 영역이 있다면 명시.",
    "2. **지속적 이견**: 합의 불가능한 지점은 무엇이며 why?",
    "   당신의 axis 가 peer 의 axis 와 본질적으로 다른 결론을 요구하는 영역.",
    "3. **합성 제안 (있다면)**: 두 입장이 *서로 다른 axis* 에서 동시에 옳을 수 있는",
    "   합성 표현이 있다면 제안. 없으면 '없음' 명시.",
    "",
    "응답 형식 (markdown, 500 단어 이내):",
    "",
    "```",
    "## 합의 가능 지점",
    "<peer 와 합의 가능한 판단; bullet 또는 짧은 문단>",
    "",
    "## 지속적 이견",
    "- **이견 항목**: <짧은 제목>",
    `  - 본 lens (${args.own_lens_id}) 입장: <...>`,
    `  - peer lens (${args.peer_lens_id}) 입장: <...>`,
    "  - 해소 경로 (있다면): <...>",
    "",
    "## 합성 제안",
    "<두 입장의 합성 가능성, 또는 '없음'>",
    "```",
    "",
    "이 응답을 당신이 담당한 deliberation artifact 파일에 기록하세요.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Artifact path / read / write
// ---------------------------------------------------------------------------

/**
 * Compute the path for a peer deliberation artifact.
 *
 * Pair directory name = lexicographically sorted "<a>--<b>" so the same
 * pair always resolves to the same directory regardless of input order.
 * Pure function — tests can assert without filesystem side effects.
 */
export function deliberationArtifactPath(
  deliberation_dir: string,
  lens_a: string,
  lens_b: string,
  authoring_lens: string,
): string {
  const [first, second] = [lens_a, lens_b].sort();
  return path.join(deliberation_dir, `${first}--${second}`, `${authoring_lens}-deliberation.md`);
}

/**
 * Write a peer deliberation artifact, creating parent directories.
 * Returns the absolute path written.
 */
export async function writeDeliberationArtifact(
  deliberation_dir: string,
  lens_a: string,
  lens_b: string,
  authoring_lens: string,
  content: string,
): Promise<string> {
  const filePath = deliberationArtifactPath(deliberation_dir, lens_a, lens_b, authoring_lens);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

/**
 * Read a peer deliberation artifact written by `writeDeliberationArtifact`.
 */
export async function readDeliberationArtifact(
  deliberation_dir: string,
  lens_a: string,
  lens_b: string,
  authoring_lens: string,
): Promise<string> {
  const filePath = deliberationArtifactPath(deliberation_dir, lens_a, lens_b, authoring_lens);
  return fs.readFile(filePath, "utf8");
}

// ---------------------------------------------------------------------------
// Conflicting-pair extraction (from Synthesize 1차 frontmatter)
// ---------------------------------------------------------------------------

/**
 * Shape of the Synthesize 1차 frontmatter section that carries
 * deliberation triggers.
 *
 * `deliberation_status: needed` ↔ `conflicting_pairs` is non-empty.
 * `deliberation_status: not_needed` ↔ `conflicting_pairs` absent or empty.
 */
export interface Synthesize1FrontmatterDeliberationFields {
  deliberation_status?: "needed" | "not_needed" | "performed" | "required_but_unperformed";
  conflicting_pairs?: Array<{
    lens_a: string;
    lens_b: string;
    target_section: string;
    summary: string;
  }>;
}

/**
 * Resolve the conflicting-pair entries from the Synthesize 1차 frontmatter
 * into `ConflictingLensPair` objects keyed to the actual primary outputs
 * on disk.
 *
 * `primary_outputs_by_lens_id` provides the lookup from lens_id (string)
 * to its primary `LensPrimaryOutput` object. A pair referencing an
 * unknown lens_id is skipped (the caller should treat this as a wiring
 * defect, not a routine no-op).
 *
 * Empty / absent `conflicting_pairs` field → empty array. This is the
 * primary signal "no deliberation needed" — the caller advances directly
 * to final.
 */
export function extractConflictingPairsFromSynthesize1(
  frontmatter: Synthesize1FrontmatterDeliberationFields | null | undefined,
  primary_outputs_by_lens_id: Map<string, LensPrimaryOutput>,
): ConflictingLensPair[] {
  if (!frontmatter || !Array.isArray(frontmatter.conflicting_pairs)) {
    return [];
  }
  const out: ConflictingLensPair[] = [];
  for (const entry of frontmatter.conflicting_pairs) {
    const a = primary_outputs_by_lens_id.get(entry.lens_a);
    const b = primary_outputs_by_lens_id.get(entry.lens_b);
    if (!a || !b) continue;
    out.push({
      lens_a: a,
      lens_b: b,
      target_section: entry.target_section,
      summary: entry.summary,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Disagreement extraction (from peer artifacts → Synthesize 2차 input)
// ---------------------------------------------------------------------------

export interface Disagreement {
  /** Lens whose peer artifact surfaced the disagreement. */
  source_lens_id: string;
  /** The peer lens this disagreement was directed at. */
  peer_lens_id: string;
  /** Conflict-area label carried over from the originating ConflictingLensPair. */
  target_section: string;
  /** Free-form title pulled from the "이견 항목" heading. */
  title: string;
  /** Verbatim body lines (trimmed) associated with this disagreement. */
  body: string;
}

const DISAGREEMENT_HEADING_PATTERNS = [
  /^##\s+지속적\s*이견\s*$/m,
  /^##\s+Persistent\s+Disagreements?\s*$/im,
] as const;

const ITEM_PREFIX = /^-\s+\*\*이견\s*항목\*\*\s*:\s*(.+?)\s*$/;

export interface PeerArtifactEntry {
  source_lens_id: string;
  peer_lens_id: string;
  target_section: string;
  /** Markdown content of the artifact authored by `source_lens_id`. */
  content: string;
}

/**
 * Parse peer-deliberation artifacts for "지속적 이견" sections. Each
 * artifact is authored by one lens replying to one peer about a single
 * conflict; emitted `Disagreement` objects carry the (source, peer,
 * target_section) trio for Synthesize 2차 to consume.
 *
 * Lenient parsing — lens agents may vary punctuation. Missing section
 * → no entries from that artifact.
 */
export function extractDisagreementsFromPeerArtifacts(
  peer_artifacts: PeerArtifactEntry[],
): Disagreement[] {
  const out: Disagreement[] = [];
  for (const artifact of peer_artifacts) {
    const sectionContent = extractSection(artifact.content);
    if (!sectionContent) continue;
    const items = splitDisagreementItems(sectionContent);
    for (const item of items) {
      out.push({
        source_lens_id: artifact.source_lens_id,
        peer_lens_id: artifact.peer_lens_id,
        target_section: artifact.target_section,
        title: item.title,
        body: item.body,
      });
    }
  }
  return out;
}

function extractSection(content: string): string | null {
  for (const pattern of DISAGREEMENT_HEADING_PATTERNS) {
    const match = content.match(pattern);
    if (!match) continue;
    const start = match.index;
    if (typeof start !== "number") continue;
    const after = content.slice(start + match[0].length);
    const nextHeading = after.search(/^##\s+/m);
    const section = nextHeading >= 0 ? after.slice(0, nextHeading) : after;
    return section.trim();
  }
  return null;
}

function splitDisagreementItems(section: string): Array<{ title: string; body: string }> {
  const items: Array<{ title: string; body: string }> = [];
  const lines = section.split("\n");
  let current: { title: string; bodyLines: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(ITEM_PREFIX);
    if (match) {
      if (current) {
        items.push({ title: current.title, body: current.bodyLines.join("\n").trim() });
      }
      current = { title: match[1]!, bodyLines: [] };
      continue;
    }
    if (current) {
      current.bodyLines.push(line);
    }
  }
  if (current) {
    items.push({ title: current.title, body: current.bodyLines.join("\n").trim() });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Plan builder
// ---------------------------------------------------------------------------

/**
 * Construct a peer-to-peer deliberation plan from a list of conflicting
 * pairs. Each pair emits two steps (one per lens), so a single conflict
 * produces a symmetric pair of replies. Step ordering is stable: pairs
 * follow input order, and within a pair `lens_a` precedes `lens_b`.
 *
 * Empty `conflicting_pairs` → empty plan (no-conflict path).
 */
export function buildDeliberationPlan(
  input: LensDeliberationInput,
  promptBuilder: (
    own: LensPrimaryOutput,
    peer: LensPrimaryOutput,
    pair: ConflictingLensPair,
  ) => string,
): DeliberationPlan {
  const steps: PeerDeliberationStep[] = [];
  for (const pair of input.conflicting_pairs) {
    for (const [own, peer] of [
      [pair.lens_a, pair.lens_b],
      [pair.lens_b, pair.lens_a],
    ] as const) {
      steps.push({
        lens_id: own.lens_id,
        peer_lens_id: peer.lens_id,
        target_section: pair.target_section,
        prompt: promptBuilder(own, peer, pair),
        artifact_path: deliberationArtifactPath(
          input.deliberation_dir,
          pair.lens_a.lens_id,
          pair.lens_b.lens_id,
          own.lens_id,
        ),
      });
    }
  }
  return {
    steps,
    all_artifact_paths: steps.map((s) => s.artifact_path),
  };
}

// ---------------------------------------------------------------------------
// Orchestration entrypoint
// ---------------------------------------------------------------------------

export interface RunDeliberationArgs {
  ontoConfig: OntoConfig;
  input: LensDeliberationInput;
  env?: NodeJS.ProcessEnv;
  /**
   * Reads a lens's primary output from disk; injected for tests.
   * Defaults to `fs.readFile(...)`.
   */
  readPrimary?: (output_path: string) => Promise<string>;
}

/**
 * Produce the peer-to-peer deliberation plan after verifying opt-in and
 * reading conflicting lenses' primary outputs. Does NOT invoke
 * `TeamCreate` or `SendMessage` itself — those are Claude tools the
 * coordinator agent invokes. The returned plan contains fully-formed
 * prompts and target artifact paths.
 *
 * Empty `conflicting_pairs` → empty plan (no LLM calls, no artifacts).
 *
 * This separation — TS builds prompts + schema, Claude agent executes
 * tool calls — keeps the TS test harness deterministic without needing
 * Claude Code runtime access.
 */
export async function runLensAgentDeliberation(
  args: RunDeliberationArgs,
): Promise<DeliberationPlan> {
  requireDeliberationOptIn(args.ontoConfig, args.env ?? process.env);

  if (args.input.conflicting_pairs.length === 0) {
    return { steps: [], all_artifact_paths: [] };
  }

  const read = args.readPrimary ?? (async (p: string) => fs.readFile(p, "utf8"));

  const uniquePaths = new Set<string>();
  for (const pair of args.input.conflicting_pairs) {
    uniquePaths.add(pair.lens_a.output_path);
    uniquePaths.add(pair.lens_b.output_path);
  }
  const bodyByPath = new Map<string, string>();
  await Promise.all(
    Array.from(uniquePaths).map(async (p) => {
      bodyByPath.set(p, await read(p));
    }),
  );

  const promptBuilder = (
    own: LensPrimaryOutput,
    peer: LensPrimaryOutput,
    pair: ConflictingLensPair,
  ): string => {
    return buildPeerDeliberationPrompt({
      own_lens_id: own.lens_id,
      peer_lens_id: peer.lens_id,
      peer_output: bodyByPath.get(peer.output_path) ?? "",
      target_section: pair.target_section,
      conflict_summary: pair.summary,
    });
  };

  return buildDeliberationPlan(args.input, promptBuilder);
}
