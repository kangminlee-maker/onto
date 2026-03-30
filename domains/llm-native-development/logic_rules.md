---
version: 2
last_updated: "2026-03-30"
source: manual
status: established
---

# LLM-Native Development Domain — Logic Rules

Classification axis: **system construction concern** — rules classified by the design concern of the LLM-powered system they govern.

## File–Concept Correspondence Logic (→Area 3)

- One concept must be defined in exactly one concept file. If the same concept is defined in two files, it is a source of truth conflict
- A filename must represent the concept the file defines. A mismatch between filename and content is a self-describing violation
- If a concept file exists, it must define at least one concept. Empty files are not allowed
- Meta files (INDEX.md, ARCHITECTURE.md, etc.) do not define concepts and serve the role of specifying structural relationships among other files. They are excluded from the "File = Concept" correspondence

## Frontmatter Conformance Logic (→Area 3)

- The specification for frontmatter (required fields, format) has structure_spec.md as its source of truth. When other files reference frontmatter, they follow structure_spec.md's definitions
- All references declared in frontmatter (depends_on, related_to, parent) must point to actually existing files
- The type field value in frontmatter must belong to the type list defined in the system. An undefined type is unclassifiable
- If a relationship declared in frontmatter is bidirectional, the reverse relationship must also exist in the target file's frontmatter. In this case, follow the cycle exception clause in dependency_rules.md

## Hierarchy Logic (→Area 3)

- Directory hierarchy represents containment relationships of concepts. A parent directory must be a category encompassing the concepts in its child directories
- Files within the same directory must be concepts at the same abstraction level. If abstraction levels differ, separate into directories
- As directory depth increases, concepts become more specific. Depth reversal (child is more abstract) is a structural contradiction

## Navigation Path Logic (→Area 3)

- A reference chain must exist from the entry point to any concept file. A file that cannot be reached is an isolated document
- If a reference chain has cycles, the LLM may fall into infinite traversal. Circular references must be explicitly marked in frontmatter (see cycle exception clause in dependency_rules.md)
- When A references B and B references C, if understanding C's content from A requires traversing through B, a direct A→C reference should be added (navigation shortcut)

## Change Propagation Logic (→Area 3)

- When concept X's definition changes, all files referencing X are verification targets
- When adding a new concept file, if existing concept files require modification beyond the meta file (INDEX.md), it is a signal of high coupling. Homonym registration (concepts.md) is exceptionally allowed
- When deleting a file, all references to that file must be removed everywhere (referential integrity)

## Model Integration Logic (→Area 1)

- If model routing is used (directing requests to different models based on task type, cost, or complexity), fallback paths must be defined for every route. A route without a fallback is a single point of failure — if the target model is unavailable, the request fails silently or errors out
- Model version pinning: if the model version is not pinned to a specific release (e.g., `gpt-4-0613` rather than `gpt-4`), behavior changes are non-deterministic. Provider-side model updates can alter output quality, format, or latency without notice
- If multiple models are used for different tasks within the same system, capability requirements must be documented per model. Documentation must include: task type, required capabilities (e.g., tool use, structured output, long context), minimum acceptable quality level, and cost constraints
- Model selection must be justified against the task's requirements. Using a more capable (and expensive) model where a simpler model suffices is a cost inefficiency. Using a less capable model where quality is critical is a quality risk
- If inference optimization is applied (quantization, batching, KV cache), the optimization's impact on output quality must be measured, not assumed. Quantization in particular can degrade performance on tasks requiring precise reasoning

## Prompt Design Logic (→Area 2)

- Instruction hierarchy: system prompt > tool definitions > user prompt. When instructions at different levels conflict, higher-priority instructions take precedence. If the system prompt says "always respond in JSON" and the user prompt says "respond in plain text," the system prompt wins
- If structured output is required (JSON, XML, function call schemas), the output schema must be validated before consumption. Trusting model output to conform to a schema without validation is unsafe — models can produce malformed output even when instructed to follow a schema
- Token budget constraint: system prompt tokens + retrieved context tokens + user input tokens ≤ context window size - expected output tokens. Violating this constraint causes truncation (silent data loss) or API errors. The budget must be calculated before the API call, not after
- Context rot: as conversation length grows, the earliest context loses influence on model behavior. Critical information (safety rules, output format requirements, identity constraints) must be re-injected at regular intervals or placed in positions of high attention (beginning and end of the context window)
- Prompt templates must be versioned. A prompt change that alters system behavior is functionally equivalent to a code change. Unversioned prompts make it impossible to reproduce past behavior or diagnose regressions
- Few-shot examples must be representative of the target distribution. Biased examples cause biased outputs. If the task distribution changes, the examples must be updated

## Retrieval Logic (→Area 3)

- RAG pipeline correctness: retrieval relevance must be verified independently of generation quality. If the final output is incorrect, the cause may be (a) irrelevant retrieval, (b) correct retrieval but incorrect generation, or (c) both. Diagnosing the root cause requires evaluating retrieval and generation separately
- Chunking strategy must preserve semantic boundaries. Splitting mid-sentence or mid-paragraph destroys context that the embedding model needs to produce meaningful vectors. Chunk boundaries should align with document structure (paragraphs, sections, logical units)
- If hybrid search is used (combining keyword-based search and semantic/vector search), the combination strategy must be explicit. Options include: score fusion (weighted sum of scores), rank fusion (reciprocal rank fusion), or cascade (keyword filter → semantic rerank). An unspecified combination strategy produces non-reproducible results
- Embedding model selection must match the content domain. General-purpose embeddings may underperform on domain-specific content (medical, legal, code). If retrieval quality is insufficient, evaluate domain-specific or fine-tuned embedding models before increasing chunk count
- Retrieved context must carry provenance metadata (source document, chunk ID, relevance score). Without provenance, it is impossible to debug retrieval failures or trace hallucinations back to their source

## Agentic Systems Logic (→Area 4)

- Tool definitions must be non-overlapping in their described capabilities. If two tools can accomplish the same task, the agent's choice between them is non-deterministic. Either remove the overlap or add explicit routing instructions that disambiguate when to use each tool
- Multi-agent communication must have termination conditions. Without explicit termination (maximum iterations, convergence criteria, timeout), agent loops can run indefinitely, consuming resources and producing no useful output. Every loop must have a defined exit condition
- Agent state must be explicitly managed. Relying on conversation history as implicit state is fragile — context windows are finite, and conversation history can be truncated, summarized, or lost. Critical state (task progress, accumulated results, decision points) must be stored in structured form (scratchpads, databases, state objects)
- MCP tool schemas must be self-describing. The agent must be able to determine a tool's applicability from the schema alone (name, description, parameter descriptions) without external documentation. A tool schema that requires reading separate documentation to understand is poorly designed
- Agent instructions must explicitly list which tools are available and when each should be used. If tools are available but not mentioned in instructions, the agent may discover them through schema inspection but cannot reliably determine appropriate usage context
- For long-running agent tasks (multi-session persistence), structured progress tracking must be maintained. The agent must be able to resume from the last checkpoint without re-executing completed steps. Progress format: completed steps, current step, remaining steps, accumulated artifacts

## Evaluation Logic (→Area 5)

- Evaluation criteria must be defined before system development begins, not retrofitted after (spec-first principle). Defining evaluation criteria after seeing system output introduces confirmation bias — criteria are unconsciously shaped to match existing behavior rather than desired behavior
- AI-as-judge evaluation must disclose: (a) the judge model identity and version, (b) the judge prompt used, and (c) known biases of the judge model (e.g., positional bias, verbosity bias, self-preference). Without disclosure, evaluation results are not reproducible or interpretable
- A/B testing for system output quality requires statistical significance thresholds defined in advance. Without predefined thresholds, there is a temptation to stop testing when results look favorable (peeking), which inflates false positive rates
- Golden set (reference test data) must be maintained separately from training/fine-tuning data. Contamination of the golden set with training data produces artificially inflated evaluation scores
- Evaluation pipelines must be automated and repeatable. Manual evaluation is acceptable for initial exploration but does not scale. If the system is in production, evaluation must run on a regular cadence without human intervention

## Safety Logic (→Area 6)

- Defense-in-depth: no single safety mechanism is sufficient. Minimum layers: input filtering (block malicious prompts before they reach the model) + output filtering (block harmful content before it reaches the user) + monitoring (detect patterns that individual filters miss). Removing any layer increases risk
- Prompt injection defense must not degrade normal user experience. A defense mechanism that blocks 5% of legitimate user requests to prevent 0.1% of injection attempts has an unacceptable false positive rate. Defense mechanisms must be evaluated for both efficacy (true positive rate) and cost (false positive rate)
- Content policy rules must be testable. Each rule must have at least one positive test case (content that should be blocked) and one negative test case (content that should pass). Untestable rules cannot be verified and may silently fail or over-block
- Safety constraints must be applied at the system level, not delegated to the model's built-in safety. Model-level safety is a useful baseline but is not configurable, not auditable, and can change without notice when the provider updates the model
- Red teaming must be performed before deployment and on a regular cadence after deployment. The threat landscape evolves — attack techniques that did not exist during initial red teaming may emerge later

## Operations Logic (→Area 7)

- Cost tracking granularity must match billing granularity. If the provider bills per token, the system must track per-token usage. If the system tracks only per-request, cost attribution to specific features or users is impossible, making cost optimization guesswork
- Quality drift detection requires a baseline. The baseline must be established during the evaluation phase (→Area 5) using the golden set. Without a baseline, there is no reference point to determine whether quality has degraded. Drift detection compares current output quality against the baseline at regular intervals
- Feedback loop: user feedback must be actionable. Feedback without a defined path to system improvement is waste. For each feedback type (thumbs up/down, free-text correction, escalation), there must be a defined process: collection → aggregation → analysis → system change → verification
- Logging must capture sufficient information to reproduce any LLM interaction: input (full prompt), output (full response), model version, latency, token count, and any tool calls. Insufficient logging makes debugging production issues impossible
- Incident response for LLM-specific failures must account for failure modes unique to LLM systems: model provider outage, sudden quality degradation (model update), cost spike (unexpected token usage), safety filter false positives (legitimate requests blocked), and prompt injection in production

## Data & Model Adaptation Logic (→Area 8)

- Fine-tuning decision: fine-tuning is justified only when prompting alone cannot achieve the required quality, latency, or cost targets. Fine-tuning introduces a maintenance burden (dataset management, retraining on model updates) that prompting avoids
- Training data quality has an upper bound on model quality. No amount of training can overcome systematically flawed data. Data quality assessment (accuracy, consistency, completeness, representativeness) must precede training
- If parameter-efficient fine-tuning is used (LoRA, QLoRA, adapters), the base model version must be pinned. A base model update invalidates all existing adapters — adapters trained on version N are not guaranteed to work correctly on version N+1
- Evaluation of fine-tuned models must compare against the base model on the same evaluation set. Without this comparison, there is no evidence that fine-tuning improved performance. Improvement must exceed the cost of fine-tuning to be justified

## Constraint Conflict Checking (Cross-Cutting)

When design constraints from different areas impose contradictory requirements, the conflict must be identified, documented, and resolved. Unresolved conflicts produce systems with unpredictable behavior.

- **Safety vs. Functionality**: When safety constraints conflict with functionality (e.g., output filtering blocks valid responses, input filtering rejects legitimate queries), safety takes precedence. However, the conflict must be documented with: (a) the specific safety rule, (b) the functionality it degrades, (c) the false positive rate, and (d) a plan to reduce the false positive rate without weakening safety
- **Cost vs. Quality**: When cost constraints conflict with quality (e.g., a cheaper model degrades output quality, reduced retrieval scope misses relevant context), the trade-off must be explicit in the system specification. The specification must state: which quality metrics are affected, by how much, and what the cost saving is. Implicit quality degradation (choosing the cheap option without measuring the impact) is prohibited
- **Latency vs. Completeness**: When latency requirements conflict with completeness (e.g., retrieval timeout cuts off relevant results, generation is truncated to meet response time targets), the system must degrade gracefully. Partial results must be clearly marked as partial, and the user must be informed that completeness was sacrificed for speed
- **Privacy vs. Personalization**: When privacy constraints conflict with personalization (e.g., PII redaction removes information needed for personalized responses), privacy takes precedence. The system must provide useful responses without requiring PII, or obtain explicit user consent for PII usage with clear data handling policies

## Related Documents
- concepts.md — Term definitions within this domain
- dependency_rules.md — Cycle exception clause, reference direction rules
- structure_spec.md — Source of truth for frontmatter specifications and structural rules
- domain_scope.md — Scope definition, sub-area membership criteria, and boundary tests
- competency_qs.md — Questions this domain's logic must be able to answer
