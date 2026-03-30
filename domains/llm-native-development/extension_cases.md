---
version: 2
last_updated: "2026-03-30"
source: manual
status: established
---

# LLM-Native Development Domain — Extension Scenarios

The onto_evolution agent simulates each scenario to verify whether the existing structure for LLM-powered systems breaks under real-world changes.

**Area key**: 1=Model Integration, 2=Prompt & Context Design, 3=Retrieval & Knowledge Systems, 4=Agentic Systems, 5=Evaluation & Testing, 6=Safety & Alignment, 7=Production Operations, 8=Data & Model Adaptation

---

## Case 1: New Model Generation

### Situation

A new foundation model (GPT-5, Claude 4, Gemini 2) introduces expanded capabilities — larger context, new modalities, improved reasoning, new API features. The system must evaluate, integrate, and potentially restructure without disrupting production.

### Case Study: Claude 3 → Sonnet 4 Migration

Each Anthropic model release changed instruction-following behavior, tool calling format, and system prompt handling. Teams pinned to `claude-3-sonnet-20240229` faced migration requiring: re-evaluation of all prompt templates, restructured tool schemas, and full evaluation suite re-runs. Teams using `-latest` endpoints experienced silent production behavior changes — output format shifts, changed refusal patterns, altered verbosity.

### Impact Analysis

| Area | Impact Level | Key Concern |
|---|---|---|
| 1 (Model) | **Primary** | Selection criteria, API integration, version pinning, routing logic |
| 2 (Prompt) | **High** | System prompt restructuring, token budget shift, structured output |
| 5 (Evaluation) | **High** | Full suite re-run, benchmark recalibration |
| 7 (Operations) | **High** | Canary deployment, cost/latency changes, monitoring thresholds |
| 3, 4, 6, 8 | Low–Medium | Chunk size (3), tool formats (4), refusal patterns (6), fine-tune transfer (8) |

### Verification Checklist

- [ ] Model version pinned → dependency_rules.md §Model API Dependencies
- [ ] Migration plan: affected components → evaluate replacement → run eval → canary deploy
- [ ] All prompt templates tested against new model → domain_scope.md Area 2
- [ ] Evaluation suite run; results compared to baseline → domain_scope.md Area 5
- [ ] Cost/latency impact analyzed → domain_scope.md Area 7
- [ ] Rollback plan defined → dependency_rules.md §Model API Dependencies
- [ ] Safety guardrails verified against new behavior → domain_scope.md Area 6

### Affected Files

| File | Impact | Section |
|---|---|---|
| dependency_rules.md | Modify | §Model API Dependencies |
| domain_scope.md | Verify | §Technology Assumptions |
| structure_spec.md | Verify | Token budget rules |

---

## Case 2: New Retrieval Paradigm

### Situation

A new retrieval architecture (graph RAG, multi-modal RAG, hybrid search) changes how external knowledge is stored, indexed, and retrieved for LLM consumption.

### Case Study: LlamaIndex Knowledge Graph Integration

LlamaIndex added knowledge graph-based retrieval alongside vector search. A healthcare company migrating found: chunking strategy became irrelevant for structured data (entities replaced chunks), embedding model selection became secondary to entity extraction quality, and retrieval evaluation changed from "relevance@k" to "path accuracy." The hybrid approach required a routing layer deciding which backend to query based on query type.

### Impact Analysis

| Area | Impact Level | Key Concern |
|---|---|---|
| 3 (Retrieval) | **Primary** | Chunking, indexing, retrieval algorithms, storage backend all restructured |
| 5 (Evaluation) | **High** | Retrieval metrics change; new golden sets needed |
| 2 (Prompt) | **Medium** | Retrieved content format changes (triples vs. chunks) |
| 7 (Operations) | **Medium** | New infrastructure (graph DB); different latency/cost profile |
| 1, 4, 6, 8 | Low | Model interface unchanged (1), tool interface changes (4) |

### Verification Checklist

- [ ] Handoff point with Area 2 preserved: retrieval results = Area 3 boundary → domain_scope.md §Handoff point
- [ ] Embedding migration plan if changing backend → dependency_rules.md §Embedding Model Dependencies
- [ ] Retrieval evaluation metrics updated → domain_scope.md Area 5
- [ ] Hybrid search strategy defined → domain_scope.md Area 3
- [ ] LLM-favored structure patterns adapted → domain_scope.md Area 3

### Affected Files

| File | Impact | Section |
|---|---|---|
| domain_scope.md | Verify | Area 3, §Handoff point with Area 2 |
| dependency_rules.md | Modify | §Embedding Model Dependencies, §Runtime Data Flow |
| concepts.md | Modify | New terms: knowledge graph retrieval, graph RAG |

---

## Case 3: New Agent Protocol

### Situation

A new standardized protocol for agent-tool interaction (MCP successor, A2A maturation) replaces or supplements existing integration patterns.

### Case Study: MCP — 0 to 97M npm Downloads in 1 Year

MCP standardized how agents discover and invoke tools via JSON-RPC. Before MCP, each framework had proprietary tool patterns. Migration required: tool schema restructuring to JSON Schema-based definitions, stateful server connections replacing stateless calls, connection lifecycle management, and a bridge layer for legacy APIs during transition. A2A emerged as complementary standard for inter-agent communication.

### Impact Analysis

| Area | Impact Level | Key Concern |
|---|---|---|
| 4 (Agentic) | **Primary** | Tool integration restructured; server/client design; discovery mechanisms |
| 6 (Safety) | **High** | New injection surface; tool permission models change |
| 7 (Operations) | **Medium** | Server availability monitoring; connection lifecycle; new failure modes |
| 1, 2, 3, 5, 8 | Low | Tool-calling format (1), tool descriptions (2), MCP resources (3) |

### Verification Checklist

- [ ] MCP server dependencies documented with fallback behavior → dependency_rules.md §MCP Server Dependencies
- [ ] Schema validation at connection time → dependency_rules.md §MCP Server Dependencies
- [ ] Tool permission model defined → domain_scope.md Area 6
- [ ] Backward compatibility plan for existing integrations documented
- [ ] Protocol-specific monitoring added → domain_scope.md Area 7

### Affected Files

| File | Impact | Section |
|---|---|---|
| dependency_rules.md | Modify | §MCP Server Dependencies, §Framework Dependencies |
| domain_scope.md | Verify | Area 4, §Reference Standards/Frameworks |
| concepts.md | Modify | Protocol terms: MCP, A2A, ACI |

---

## Case 4: AI Regulation Compliance

### Situation

New AI regulations (EU AI Act, etc.) impose compliance requirements: audit logging, risk classification, transparency, human oversight.

### Case Study: EU AI Act Risk Classification

An LLM recruitment screening tool was classified "high-risk" (Annex III), requiring: risk management with continuous monitoring, technical documentation including training data provenance, human oversight (no autonomous hiring decisions), automatic decision logging, and documented evaluation methodology. Systems designed with safety and observability from the start required minimal changes; those treating these as afterthoughts required extensive refactoring.

### Impact Analysis

| Area | Impact Level | Key Concern |
|---|---|---|
| 6 (Safety) | **Primary** | Risk classification, content policy, PII handling, regulatory compliance |
| 7 (Operations) | **High** | Mandatory audit logging, compliance monitoring, incident reporting |
| 5 (Evaluation) | **High** | Auditable evaluation methodology required |
| 4 (Agentic) | **High** | Human oversight constrains agent autonomy |
| 1, 2, 3, 8 | Low–Medium | Provider certifications (1), disclosure instructions (2), provenance (3, 8) |

### Verification Checklist

- [ ] System risk classification determined → domain_scope.md Area 6
- [ ] Audit logging covers all LLM interactions → domain_scope.md Area 7
- [ ] Human oversight mechanism for high-risk decisions → domain_scope.md Area 6
- [ ] Evaluation methodology documented and reproducible → domain_scope.md Area 5
- [ ] PII detection and redaction operational → domain_scope.md Area 6
- [ ] All 8 areas audited against regulatory requirements

### Affected Files

| File | Impact | Section |
|---|---|---|
| domain_scope.md | Verify | Area 6, Area 7 |
| dependency_rules.md | Modify | §Truth Source Hierarchy (regulatory priority) |
| concepts.md | Modify | Regulatory terms: risk classification, audit trail |

---

## Case 5: Context Window Expansion

### Situation

Context windows increase by 10x (200K → 2M → 10M tokens), changing fundamental trade-offs. Techniques designed for limited context (chunking, summarization, multi-step retrieval) may become unnecessary.

### Case Study: Gemini 1M Context — Is RAG Still Necessary?

Gemini 1.5 Pro launched with 1M tokens (February 2024). Results showed: "lost in the middle" effects made retrieval still valuable for precision; 1M tokens at $3.50/M made naive "stuff everything" 100x more expensive than targeted retrieval; latency scaled with context length. RAG shifted from "mandatory" to "optimization for cost, latency, and precision" — conditional rather than required.

### Impact Analysis

| Area | Impact Level | Key Concern |
|---|---|---|
| 2 (Prompt) | **Primary** | Token budget restructured; context rot amplified; utilization strategy changed |
| 3 (Retrieval) | **High** | Chunking relevance decreases; RAG becomes conditional |
| 7 (Operations) | **High** | Cost per request increases dramatically; caching for larger payloads |
| 1 (Model) | **Medium** | Context window as selection differentiator |
| 4, 5, 6, 8 | Low–Medium | Longer agent history (4), long-context eval (5), larger injection surface (6) |

### Verification Checklist

- [ ] Technology assumption updated → domain_scope.md §Technology Assumptions
- [ ] Token budget strategy revised → structure_spec.md
- [ ] RAG necessity re-evaluated per use case → domain_scope.md Area 3
- [ ] Cost analysis: long context vs. retrieval → domain_scope.md Area 7
- [ ] "Lost in the middle" effects tested → domain_scope.md Area 5
- [ ] Quantitative criteria re-evaluated → structure_spec.md

### Affected Files

| File | Impact | Section |
|---|---|---|
| domain_scope.md | Modify | §Technology Assumptions, Area 2, Area 3 |
| structure_spec.md | Modify | Token budget rules, quantitative criteria |
| dependency_rules.md | Verify | §Design-Time Constraint Flow |

---

## Case 6: Model-as-a-Service Disruption

### Situation

Deployment shifts from cloud API to on-premise/edge with open-weight models, changing infrastructure, cost structures, and operational responsibilities.

### Case Study: Llama Open-Weight Local Deployment

A financial services company migrated from OpenAI API to self-hosted Llama 3 70B for data residency. Infrastructure responsibility shifted entirely (GPU procurement, model serving via vLLM/TGI, auto-scaling). Cost structure inverted: no per-token costs but $30K+/month GPU cluster. Safety guardrails (content filtering, PII redaction) had to be built from scratch — API providers include these by default. The domain_scope.md assumption "Models accessed via API" was invalidated.

### Impact Analysis

| Area | Impact Level | Key Concern |
|---|---|---|
| 1 (Model) | **Primary** | Model serving replaces API; quantization; batching; version self-management |
| 7 (Operations) | **Primary** | GPU infrastructure, serving, scaling, hardware monitoring — new domain |
| 6 (Safety) | **High** | All guardrails built in-house; no provider-side filtering |
| 8 (Adaptation) | **High** | Direct model access enables fine-tuning |
| 2, 3, 4, 5 | Low–Medium | Chat template differences (2), self-hosted embeddings (3), tool support gaps (4) |

### Verification Checklist

- [ ] Technology assumption invalidation documented → domain_scope.md §Technology Assumptions
- [ ] Area 7 expanded for infrastructure management → domain_scope.md Area 7
- [ ] Model serving infrastructure documented → domain_scope.md Area 1
- [ ] Safety guardrails built for self-hosted model → domain_scope.md Area 6
- [ ] Cost model updated: fixed vs. per-token → domain_scope.md Area 7

### Affected Files

| File | Impact | Section |
|---|---|---|
| domain_scope.md | Modify | §Technology Assumptions, Area 1, Area 7 |
| dependency_rules.md | Modify | §Model API Dependencies (extend to self-hosted) |
| concepts.md | Modify | New terms: model serving, quantization, vLLM |

---

## Case 7: Multi-Modal Native

### Situation

Vision, audio, and other modalities become first-class inputs alongside text, rather than supplementary capabilities.

### Case Study: GPT-4V and Claude 3 Vision

A document processing company migrated from OCR-then-LLM to direct image-to-text: the OCR pipeline was eliminated, prompts referenced visual elements requiring spatial reasoning instructions, knowledge bases needed multi-modal embeddings (CLIP) incompatible with text-only embeddings, evaluation required annotated image golden sets, and token costs increased (1,000-2,000 tokens per page image vs. 200-400 for text). The domain_scope.md assumption "Text is primary modality" was challenged.

### Impact Analysis

| Area | Impact Level | Key Concern |
|---|---|---|
| 2 (Prompt) | **Primary** | Multi-modal input design; spatial/temporal references; token budget for images |
| 3 (Retrieval) | **High** | Multi-modal embeddings; cross-modal search; non-text storage |
| 1 (Model) | **High** | Modality support as selection criterion; multi-modal routing |
| 5 (Evaluation) | **High** | Visual understanding metrics; multi-modal golden sets |
| 4, 6, 7, 8 | Low–Medium | Vision for agents (4), image injection (6), larger payloads (7) |

### Verification Checklist

- [ ] Technology assumption updated → domain_scope.md §Technology Assumptions
- [ ] Multi-modal input design patterns documented → domain_scope.md Area 2
- [ ] Multi-modal embedding model selected → dependency_rules.md §Embedding Model Dependencies
- [ ] Cross-modal search assessed → domain_scope.md Area 3
- [ ] Multi-modal evaluation metrics defined → domain_scope.md Area 5
- [ ] Token budget includes image/audio costs → structure_spec.md

### Affected Files

| File | Impact | Section |
|---|---|---|
| domain_scope.md | Modify | §Technology Assumptions, Area 2, Area 3 |
| dependency_rules.md | Modify | §Embedding Model Dependencies |
| concepts.md | Modify | New terms: multi-modal embedding, cross-modal search |

---

## Case 8: Fine-Tuning Democratization

### Situation

Fine-tuning costs drop 100x through parameter-efficient techniques, making model adaptation a default practice. Area 8 shifts from optional to mandatory.

### Case Study: LoRA/QLoRA Cost Reduction

A startup fine-tuned Llama 2 7B with QLoRA on 10K customer support conversations in 4 hours on a single A100 ($12). The fine-tuned model outperformed GPT-4 with elaborate prompts (92% vs. 87% accuracy). Prompt engineering effort dropped 70% — domain knowledge was in weights, not context. New capabilities needed: dataset curation, experiment tracking, model evaluation before/after, adapter serving. The domain_scope.md assumption "Fine-tuning is optional" was invalidated.

### Impact Analysis

| Area | Impact Level | Key Concern |
|---|---|---|
| 8 (Adaptation) | **Primary** | Becomes mandatory: dataset engineering, training, experiment tracking |
| 5 (Evaluation) | **High** | Pre/post comparison; contamination checks; regression testing |
| 6 (Safety) | **High** | Fine-tuning can remove guardrails; alignment verification post-training |
| 1 (Model) | **High** | Adapter serving; model routing includes fine-tuned variants |
| 2, 3, 4, 7 | Low–Medium | Shorter prompts (2), reduced retrieval needs (3), A/B testing (7) |

### Verification Checklist

- [ ] Technology assumption invalidation documented → domain_scope.md §Technology Assumptions
- [ ] Area 8 elevated to required → domain_scope.md Area 8
- [ ] Dataset engineering pipeline documented → domain_scope.md Area 8
- [ ] Pre/post fine-tuning evaluation → domain_scope.md Area 5
- [ ] Safety alignment verified after training → domain_scope.md Area 6
- [ ] Adapter serving infrastructure → domain_scope.md Area 1, Area 7

### Affected Files

| File | Impact | Section |
|---|---|---|
| domain_scope.md | Modify | §Technology Assumptions, Area 8 |
| dependency_rules.md | Modify | §Feedback Loops (Loop 1 becomes critical path) |
| concepts.md | Modify | New terms: LoRA, QLoRA, adapter, PEFT |

---

## Case 9: Agent Autonomy Expansion

### Situation

Agents gain direct computer interface capabilities — browser control, desktop applications, file systems — extending autonomy beyond structured tool calls to open-ended environment interaction.

### Case Study: Claude Computer Use and Browser Use (78K Stars)

A QA company adopted browser use agents: architecture shifted from predefined tool calls to observe-act loops (screenshot → reason → mouse/keyboard action). Safety boundaries became critical — agents could navigate anywhere, fill any form. Novel failure modes: loops, unintended navigation, interaction with pop-ups. Evaluation shifted from step-based ("correct tool call?") to outcome-based ("goal achieved through any path?").

### Impact Analysis

| Area | Impact Level | Key Concern |
|---|---|---|
| 4 (Agentic) | **Primary** | Observe-act loops; browser/computer control; environment interaction |
| 6 (Safety) | **Primary** | Sandboxing; action permissions; escalation for irreversible actions |
| 5 (Evaluation) | **High** | Outcome-based evaluation; trajectory analysis; reliability metrics |
| 7 (Operations) | **High** | Sandbox infrastructure; session recording; resource limits |
| 1, 2, 3, 8 | Low–Medium | Vision required (1), boundary instructions (2) |

### Verification Checklist

- [ ] Observe-act pattern documented → domain_scope.md Area 4
- [ ] Sandbox environment defined and enforced → domain_scope.md Area 6
- [ ] Action permission model defined → domain_scope.md Area 6
- [ ] Escalation policy for irreversible actions → domain_scope.md Area 6
- [ ] Outcome-based evaluation metrics → domain_scope.md Area 5
- [ ] Stuck/loop detection and termination → domain_scope.md Area 4
- [ ] Resource limits (session duration, allowed domains) → domain_scope.md Area 7

### Affected Files

| File | Impact | Section |
|---|---|---|
| domain_scope.md | Verify | Area 4, Area 6 |
| dependency_rules.md | Verify | §Design-Time Constraint Flow (safety → agent) |
| concepts.md | Modify | New terms: observe-act loop, action permission model |

---

## Case 10: Evaluation Paradigm Shift

### Situation

AI-as-judge (LLM-based evaluation) becomes the primary evaluation method, replacing human annotation and rule-based metrics at scale.

### Case Study: LLM-as-Judge Replacing Human Annotation

A customer support company migrated from human evaluation (500/week at $15 each = $7,500) to LLM-as-judge (50,000/week at $0.03 each = $1,500). Consistency improved, but systematic biases emerged (preference for longer responses, over-rating confident incorrect answers). Meta-evaluation became necessary — "evaluating the evaluator." Self-evaluation bias required separate judge and generation models. The methodology shifted from "collecting human judgments" to "calibrating automated judges."

### Impact Analysis

| Area | Impact Level | Key Concern |
|---|---|---|
| 5 (Evaluation) | **Primary** | AI-judge pipelines, meta-evaluation, judge calibration, bias detection |
| 1 (Model) | **Medium** | Separate judge model needed; judge selection criteria differ |
| 2 (Prompt) | **Medium** | Judge prompt design: rubrics, criteria, output format |
| 7 (Operations) | **Medium** | Evaluation pipeline costs; judge model drift monitoring |
| 3, 4, 6, 8 | Low–Medium | Factual verification (3), safety eval (6), training labels (8) |

### Verification Checklist

- [ ] AI-as-judge methodology documented → domain_scope.md Area 5
- [ ] Judge model ≠ generation model enforced → domain_scope.md Area 5
- [ ] Meta-evaluation: judge validated against human golden set → domain_scope.md Area 5
- [ ] Judge bias detection and calibration procedure defined
- [ ] Human evaluation preserved for calibration maintenance → domain_scope.md Area 5

### Affected Files

| File | Impact | Section |
|---|---|---|
| domain_scope.md | Verify | Area 5 |
| dependency_rules.md | Verify | §Feedback Loops (Loop 1), §Metric Ownership Rules |
| concepts.md | Modify | New terms: AI-as-judge, meta-evaluation, judge calibration |

---

## Case 11: LLM-Favored Structure Adoption

### Situation

Organization-wide adoption of LLM-optimized knowledge patterns — File=Concept, YAML frontmatter, system maps, llms.txt — as the documentation standard.

### Case Study: Onto's Structure and llms.txt Adoption

A 200-person engineering org migrated from Confluence wiki (3,000+ nested, duplicated pages) to File=Concept structure (1,200 files with clear ownership). YAML frontmatter enabled automated knowledge graph generation. LLMs consumed documentation 40% more accurately (RAG retrieval precision). Migration cost: 6 engineer-months. The llms.txt standard, CLAUDE.md, .cursorrules, and AGENTS.md demonstrate vendor-specific implementations of the same principle: structured, machine-readable knowledge surfaces.

### Impact Analysis

| Area | Impact Level | Key Concern |
|---|---|---|
| 3 (Retrieval) | **Primary** | File=Concept; metadata-driven retrieval; navigation paths; system maps |
| 2 (Prompt) | **Medium** | Frontmatter provides context; reduces prompt engineering |
| 4 (Agentic) | **Medium** | CLAUDE.md/AGENTS.md define per-directory agent behavior |
| 5 (Evaluation) | **Medium** | Structure quality measurable: orphan rate, duplication, completeness |
| 1, 6, 7, 8 | Low | Indirect benefits across all areas |

### Verification Checklist

- [ ] File=Concept: one concept per file → domain_scope.md Area 3
- [ ] YAML frontmatter on all knowledge files → structure_spec.md
- [ ] System map provides navigation → domain_scope.md Area 3
- [ ] Duplication eliminated → dependency_rules.md §Duplication Prevention Rules
- [ ] Navigation paths acyclic → dependency_rules.md §Acyclicity
- [ ] Retrieval precision measured before/after → domain_scope.md Area 5
- [ ] Structure validation automated (lint, orphan detection) → domain_scope.md Area 7

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | Frontmatter spec, File=Concept rules |
| dependency_rules.md | Verify | §Duplication Prevention, §Acyclicity, §Referential Integrity |
| domain_scope.md | Verify | Area 3, §Reference Standards/Frameworks |

---

## Scenario Interconnections

| Scenario | Triggers / Interacts With | Reason |
|---|---|---|
| Case 1 (New Model) | → Case 5 (Context), Case 7 (Multi-Modal), Case 10 (Eval) | New models expand context, add modalities, change eval baselines |
| Case 2 (Retrieval) | → Case 5 (Context), Case 11 (Structure) | Larger context changes RAG calculus; structure affects retrieval |
| Case 3 (Protocol) | → Case 9 (Autonomy), Case 4 (Regulation) | Protocols enable new capabilities; standardization aids compliance |
| Case 4 (Regulation) | → Case 9 (Autonomy), Case 10 (Eval) | Regulation constrains agents; mandates auditable evaluation |
| Case 5 (Context) | → Case 2 (Retrieval), Case 11 (Structure) | Reduced RAG necessity; less aggressive structuring needed |
| Case 6 (MaaS Disruption) | → Case 8 (Fine-Tuning), Case 4 (Regulation) | Local deployment enables fine-tuning; data residency drives on-prem |
| Case 7 (Multi-Modal) | → Case 2 (Retrieval), Case 9 (Autonomy) | Multi-modal retrieval is distinct paradigm; vision enables computer use |
| Case 8 (Fine-Tuning) | → Case 6 (MaaS), Case 10 (Eval) | Fine-tuning incentivizes local; more variants need scalable eval |
| Case 9 (Autonomy) | → Case 4 (Regulation), Case 3 (Protocol) | Autonomous agents face stricter scrutiny; need safety protocols |
| Case 10 (Eval Shift) | → Case 8 (Fine-Tuning) | AI judges generate training labels at scale |
| Case 11 (Structure) | → Case 2 (Retrieval) | Better structure improves retrieval across all paradigms |

### Cascade Patterns

**Cascade 1 — Model → Context → Retrieval → Structure**: New model with 10M context (Case 1) → context expansion (Case 5) → reduced RAG necessity (Case 2) → knowledge structure adaptation (Case 11). All 4 cases require coordinated response.

**Cascade 2 — Regulation → Safety → Agent → Protocol**: AI regulation (Case 4) → tightened safety requirements → constrained agent autonomy (Case 9) → standardized safety protocols (Case 3). Compliance becomes root cause for multiple architectural changes.

**Cascade 3 — Local Deployment → Fine-Tuning → Eval Scaling**: Self-hosted models (Case 6) → accessible fine-tuning (Case 8) → many model variants needing evaluation → AI-as-judge for throughput (Case 10). Evaluation pipeline becomes bottleneck.

---

## Related Documents
- domain_scope.md — Sub-area definitions (Areas 1-8), membership criteria, technology assumptions, handoff points
- dependency_rules.md — Inter-area dependencies, model/MCP/embedding dependencies, feedback loops
- structure_spec.md — Token budget rules, quantitative criteria, frontmatter specification
- competency_qs.md — Questions each area must answer; updated when scenarios reveal gaps
- concepts.md — Term definitions; updated when new terms emerge from scenarios
