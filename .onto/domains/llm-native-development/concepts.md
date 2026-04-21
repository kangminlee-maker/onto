---
version: 2
last_updated: "2026-03-30"
source: manual
status: established
---

# LLM-Native Development Domain — Concept Dictionary and Interpretation Rules

Classification axis: **normative system** — classification by the standard/protocol/framework layer to which each term belongs.

## Normative System Classification

Standards and frameworks in LLM-powered system development form a layered system. Each layer builds on the one below it.

### Layer 1 — Foundation Protocols

These define how systems communicate with models and with each other.

- HTTP/REST = the transport protocol for model API calls. All commercial LLM providers expose REST endpoints
- MCP (Model Context Protocol) = an open protocol standardizing how agents connect to external tools, data sources, and resources. Three primitives: Tools (executable functions), Resources (read-only data), Prompts (reusable prompt templates)
- A2A (Agent-to-Agent Protocol) = a protocol for inter-agent communication. Complements MCP (agents↔tools) by connecting agents↔agents
- OpenAPI / JSON Schema = specification formats for API contracts and structured data shapes. Used for function calling schemas and MCP tool parameter definitions

### Layer 2 — Framework Abstractions

Reusable libraries and SDKs that wrap Layer 1 protocols into higher-level programming constructs.

- OpenAI SDK / Anthropic SDK = vendor-specific client libraries for model API access. Handle authentication, request formatting, streaming, retry logic
- LangChain = a framework providing abstractions for chains (sequential prompt pipelines), agents (decision loops), and memory (conversation state)
- LlamaIndex = a framework for data ingestion, chunking, indexing, and querying. Specialized for RAG pipeline construction
- LangGraph = a framework for stateful multi-step agent workflows as graphs. Adds explicit state management and cycle support to LangChain
- Other notable SDKs: Semantic Kernel (Microsoft, enterprise .NET/Python), Vercel AI SDK (TypeScript, streaming UI)

### Layer 3 — Application Patterns

Architectural patterns that combine Layer 1 and Layer 2 into recognizable system designs.

- RAG (Retrieval Augmented Generation) = retrieving relevant documents and including them in model context before generation
- Agent = a system where an LLM autonomously decides actions to accomplish a goal, distinguished by the presence of a decision loop
- Chatbot = a conversational interface backed by an LLM, maintaining history across turns
- Code Assistant = an LLM-powered system that reads, generates, and modifies code
- Multi-Agent System = multiple specialized agents collaborating with distinct roles, tools, and instructions

### Layer 4 — Quality and Governance

Frameworks for measuring, controlling, and governing LLM system behavior.

- Evaluation Frameworks = tools for measuring LLM output quality (RAGAS, DeepEval, Promptfoo)
- EU AI Act = EU regulation classifying AI systems by risk level with corresponding obligations
- NIST AI RMF = voluntary framework for managing AI risks. Four functions: Govern, Map, Measure, Manage
- Model Cards / System Cards = standardized documentation for model capabilities, limitations, and evaluation results

### Relationship Between Layers

Layer 1 defines communication. Layer 2 wraps it into developer abstractions. Layer 3 combines abstractions into architectures. Layer 4 governs quality and safety. Skipping Layer 1 understanding makes debugging opaque; ignoring Layer 4 leaves quality and compliance unmanaged.

## Model Integration Terms

- Model = a trained neural network that generates text given input. In this domain, unqualified "model" refers to an LLM
- API Endpoint = a URL that accepts model requests and returns responses
- Model Routing = directing requests to different models based on task complexity, cost, or latency requirements
- Fallback = switching to an alternative model when the primary is unavailable or rate-limited
- Model Version = a specific model release (e.g., `gpt-4-0613`, `claude-3-5-sonnet-20241022`). Version pinning prevents unexpected behavior changes
- Inference = the process of generating output from input. All API-based model usage is inference (vs. training, which updates weights)
- Latency = time between request and complete response. For streaming, Time to First Token (TTFT) measures perceived responsiveness
- Throughput = requests or tokens processed per unit time
- Token = the atomic text unit a model processes. Subword units whose boundaries are model-specific. ~1.3 tokens per English word; non-Latin scripts require more
- Context Window = maximum tokens a model processes per request (input + output). Ranges from 4K to 1M+
- Rate Limit = maximum requests or tokens per time period (RPM, TPM, RPD). Exceeding returns HTTP 429
- Model Capability = what a model can do (text generation, tool use, vision, structured output). Varies by model and version

## Prompt & Context Design Terms

- System Prompt = instructions defining model role, behavior constraints, and output format. Processed before user input
- User Prompt = the end-user's input, combined with system prompt and retrieved context
- Few-Shot Prompting = including example input-output pairs to demonstrate desired behavior. Contrasted with zero-shot (no examples)
- Zero-Shot Prompting = providing instructions without examples, relying on pre-trained knowledge
- Chain-of-Thought (CoT) = instructing the model to show intermediate reasoning steps before the final answer. Variants: zero-shot CoT ("think step by step"), few-shot CoT (with reasoning examples)
- Instruction Hierarchy = precedence order when instructions conflict: system prompt > developer instructions > user prompt
- Structured Output = constraining output to a specific format (JSON, XML). Implemented via JSON mode, response format schemas, or tool call schemas
- JSON Mode = a model feature guaranteeing valid JSON output. Does not guarantee schema conformance
- Tool Call Schema = a JSON Schema describing a tool's name, description, and parameters for the model's function calling
- Token Budget = maximum tokens allocated to a specific prompt component, preventing any single part from consuming the entire context window
- Context Rot = output quality degradation when the context contains too much irrelevant or contradictory information
- Prompt Template = a reusable prompt structure with variable placeholders filled at runtime
- Prompt Injection (as input design concern) = the risk that user input overrides the system prompt. Addressed via input validation, delimiters, and instruction hierarchy

## Retrieval & Knowledge Systems Terms

- RAG (Retrieval Augmented Generation) = augmenting model input with retrieved external information. Three stages: indexing, retrieval, generation. A pattern, not a product — implementation varies widely
- Chunking = splitting documents into segments for indexing. Strategies: fixed-size, semantic, recursive, sentence-level. Chunk size affects retrieval precision and recall
- Embedding = a dense vector representation capturing semantic meaning, generated by embedding models. Similar texts → similar vectors. Model-specific and not interchangeable across models
- Vector Database = a database for storing and querying high-dimensional vectors via approximate nearest neighbor (ANN) search. Examples: Pinecone, Weaviate, Chroma, pgvector
- Semantic Search = finding documents by meaning similarity using embedding distance metrics (cosine similarity, dot product)
- Hybrid Search = combining keyword search (BM25) with semantic search to leverage strengths of both
- Reranking = second-pass scoring of retrieved documents using a cross-encoder model for improved relevance
- Knowledge Base = a structured information collection for LLM retrieval. Distinguished from the model's parametric knowledge (learned during training)
- Knowledge Graph = a structured representation of entities and relationships, providing relational knowledge that complements unstructured retrieval
- File=Concept = each file defines exactly one concept; each concept is defined in exactly one file. Applies to concept files, not meta files
- Frontmatter = YAML metadata block at file top. Source of truth is structure_spec.md
- Navigation Index = a meta file (INDEX.md) summarizing directory contents and each file's role
- System Map = a meta file (ARCHITECTURE.md, llms.txt) representing entire system structure as one document
- llms.txt = a specification for LLM-friendly project information, placed at project root
- CLAUDE.md = a project-level instruction file for Claude-based tools. Analogous to .cursorrules (Cursor), AGENTS.md (general AI agents)
- Persistent Memory = information storage persisting across agent sessions. Distinguished from conversation history (single-session) and model parameters (training-time)

## Agentic Systems Terms

- Agent = an LLM-powered system that autonomously decides actions. Core loop: observe → think → act. Distinguished from prompt-response by iterative decision-making
- Tool = a function an agent invokes to interact with external systems. Defined by schema (name, description, parameters)
- Tool Use = the model generating structured tool call requests (function name + arguments). The model does not execute tools — application code does
- ReAct (Reasoning + Acting) = alternating reasoning steps and action steps, with the reasoning trace in context for self-correction
- Planning = decomposing a complex goal into steps. May be explicit (output a plan) or implicit (decide next step from current state)
- Reflection = the agent evaluating its own outputs and deciding to revise, retry, or proceed
- Workflow = a predefined sequence of LLM calls where control flow is code-determined, not model-determined. Patterns: prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer
- Orchestration = coordinating multiple LLM calls, tool invocations, or agent interactions. Code-driven (workflows) or model-driven (agents)
- Multi-Agent = multiple agents with distinct roles collaborating. Patterns: orchestrator-specialist, peer-to-peer, hierarchical
- MCP Server / MCP Client = server exposes tools/resources/prompts; client discovers and invokes them. One agent can connect to multiple servers
- ACI (Agent-Computer Interface) = designing tools optimized for agent use: clear descriptions, specific parameters, structured results, informative errors
- Agent State = information maintained during execution: goal, completed steps, pending actions, results
- Scratchpad = working memory for intermediate reasoning and partial results, included in model context
- Long-Running Agent = a task spanning multiple sessions. Requires context compaction, progress persistence, and continuity strategies
- Context Compaction = summarizing accumulated context to fit the window. Techniques: summarization, selective retention, structured progress notes
- Sub-Agent = an agent spawned by a parent to handle a delegated sub-task, returning results to the parent

## Evaluation & Testing Terms

- Evaluation (Eval) = systematic measurement of LLM output quality. Non-deterministic outputs require different methods than traditional testing
- Golden Set = curated input-output pairs representing expected behavior, used as a regression suite
- AI-as-Judge = using an LLM to evaluate another LLM's output on criteria like relevance, accuracy, safety
- Comparative Evaluation = evaluating system variants side-by-side on the same inputs. Less susceptible to absolute scoring biases
- A/B Testing = deploying variants to real users and measuring outcomes from actual interactions
- Regression Testing = re-running a golden set after changes to detect quality degradation
- Benchmark = standardized test suite for model capabilities (MMLU, HumanEval, MATH). Useful for model selection, not application-specific quality
- Hallucination = fluent, confident output that is factually incorrect or unsupported by context. Intrinsic (contradicts source) vs extrinsic (unverifiable)
- Faithfulness = degree to which output is supported by provided context. RAG-specific metric
- Relevance = degree to which output addresses the user's question. Distinct from faithfulness
- HITL (Human-in-the-Loop) = incorporating human judgment for evaluation, feedback, or high-stakes approval
- Evaluation Pipeline = automated system for test case management, scoring, result aggregation, and trend tracking

## Safety & Alignment Terms

- Prompt Injection = malicious input causing the model to ignore its system prompt. Direct (attacker input) or indirect (embedded in retrieved documents)
- Jailbreak = bypassing a model's training-time safety constraints. Targets the model itself, not the application's system prompt
- Guardrail = runtime validation of inputs/outputs against rules. Input guardrails filter prompts; output guardrails filter responses
- Content Policy = rules defining what the system should and should not generate
- Output Filtering = post-processing to detect and handle policy-violating content
- Red Teaming = adversarial testing to identify vulnerabilities standard testing misses
- Alignment = degree to which model behavior matches intended purpose and values
- PII (Personally Identifiable Information) = data identifying an individual. Must be detected and handled in both inputs and outputs
- Responsible AI = developing AI that is fair, transparent, accountable, safe, and privacy-preserving
- EU AI Act = EU regulation with risk-tier classification. High-risk systems require conformity assessments, documentation, and human oversight

## Production Operations Terms

- Observability = understanding system state from external outputs. Three pillars: logs, metrics, traces
- Logging = recording LLM call details (prompts, outputs, model version, tokens, latency, errors)
- Tracing = tracking a single request through all processing steps for end-to-end debugging
- Monitoring = real-time observation of latency, error rates, throughput, token consumption, and cost
- Cost Tracking = measuring model usage cost from token consumption × per-token pricing. Often the largest variable cost
- Latency Management = reducing response time via model selection, caching, streaming, prompt optimization, batching
- Quality Drift = gradual output quality degradation from model updates, knowledge staleness, or changing user patterns
- Feedback Loop = collecting user signals (ratings, edits, regenerations) for system improvement
- Incident Response = handling LLM-specific failures (outages, safety violations, quality degradation, cost spikes)
- Deployment Strategy = rolling out changes via blue-green, canary, or shadow deployment with evaluation gates
- Caching = reusing results at two levels: response-level (identical inputs) and KV cache (prompt prefix reuse, exposed as "prompt caching")

## Data & Model Adaptation Terms

- Fine-Tuning = further training a pre-trained model on task-specific data. Modifies weights, unlike prompting
- Full Fine-Tuning = updating all parameters. Highest quality but most compute; risks catastrophic forgetting
- LoRA (Low-Rank Adaptation) = parameter-efficient fine-tuning via low-rank matrices added to frozen model weights
- QLoRA = LoRA on a quantized base model. Enables fine-tuning large models on consumer hardware
- Adapter = a small trainable module inserted into a pre-trained model. Multiple adapters can be swapped at inference time
- RLHF (Reinforcement Learning from Human Feedback) = training via human preference rankings → reward model → policy optimization
- DPO (Direct Preference Optimization) = optimizing directly on preference pairs without a separate reward model
- RLAIF (Reinforcement Learning from AI Feedback) = using AI instead of humans for the feedback signal
- Dataset Engineering = curating, cleaning, and constructing training datasets. Data quality often matters more than model architecture
- Data Curation = selecting training examples by relevance, diversity, accuracy, and representativeness
- Data Augmentation = creating training examples by transforming existing ones (paraphrasing, back-translation, substitution)
- Synthetic Data = training data generated by AI. Scalable and privacy-safe but risks bias amplification
- Distillation = training a smaller "student" model to reproduce a larger "teacher" model's outputs
- Model Compression = reducing model size via quantization, pruning, or distillation

## Cross-Cutting Terms

These span multiple sub-areas and are not attributed to any single area.

- CI/CD for LLM Systems = CI/CD adapted for LLM applications: evaluation gates, prompt regression testing, model version tracking, non-deterministic output validation
- Version Management = tracking prompt versions, tool schema versions, model versions, and agent configuration versions independently
- Experiment Tracking = recording experiment configurations and metrics. Attribution: model parameters → Area 8, output quality → Area 5, infrastructure → Area 7
- Prompt Versioning = managing prompt template evolution with identifiers, changelogs, and rollback capability
- Spec-First Development = defining specifications (tool schemas, prompt templates, evaluation criteria) before implementation

## Domain Inheritance

This domain inherits from `software-engineering/concepts.md`. Inherited terms follow the parent domain's definitions unless explicitly redefined.

| Term | Parent Domain Definition | This Domain Redefinition | Change Scope |
|------|------------------------|-------------------------|-------------|
| model | domain model (business object) | LLM model (trained neural network for text generation) | Default meaning changed — unqualified "model" refers to LLM |
| agent | software agent (generic autonomous program) | LLM agent (autonomous system with LLM-driven decision loop) | Narrowed to LLM-powered agents |
| token | authentication token / API key | LLM token (subword unit processed by a model) | Default meaning changed — unqualified "token" refers to LLM token |
| pipeline | CI/CD pipeline | May refer to CI/CD, RAG, or evaluation pipeline. Qualification required | Ambiguity introduced — context-dependent |
| context | execution context (runtime state) | Context window content (information provided to the model) | Default meaning changed — unqualified "context" refers to model input |
| memory | system memory (RAM) | Agent memory (information persisted across interactions) | Default meaning changed — unqualified "memory" refers to agent memory |

## Homonyms Requiring Attention

- "context": context window (model input capacity) ≠ execution context (runtime state) ≠ bounded context (DDD) ≠ React context
- "model": LLM model (neural network) ≠ domain model (DDD business objects) ≠ data model (schema) ≠ ML model (non-LLM)
- "agent": LLM agent (autonomous, LLM decision loop) ≠ software agent (generic) ≠ user agent (browser HTTP header)
- "embedding": vector embedding (dense semantic vector) ≠ UI embedding (iframe) ≠ word embedding (static, Word2Vec/GloVe)
- "token": LLM token (subword unit) ≠ authentication token (JWT, OAuth) ≠ API token (API key)
- "prompt": system prompt ≠ user prompt ≠ prompt template ≠ MCP prompt primitive
- "memory": agent memory (cross-session) ≠ system memory (RAM) ≠ persistent storage (disk/DB) ≠ conversation history (single-session)
- "tool": MCP tool (agent-invocable function) ≠ development tool (IDE, linter) ≠ CLI tool
- "chain": prompt chain (sequential LLM calls) ≠ blockchain ≠ certificate chain (TLS) ≠ LangChain chain
- "index": navigation index (INDEX.md) ≠ database index (B-tree) ≠ vector index (HNSW, IVF) ≠ array index
- "alignment": model alignment (values/behavior) ≠ text alignment (visual) ≠ ontology alignment (concept mapping)

## Interpretation Principles

These principles apply when interpreting terms and concepts within this domain.

- Model capability descriptions are version-specific. Documentation must specify the model version when describing capabilities
- Prompt engineering patterns are empirical, not universal. A technique effective for one model may degrade performance on another
- "RAG" is a pattern, not a product. Two "RAG systems" may share almost no implementation details
- Agent architecture patterns (ReAct, planning, reflection, tool use) are not mutually exclusive. They are composable design techniques
- Token counts are model-specific because tokenization differs between models. Budget calculations must use the target model's tokenizer
- "Best practices" in LLM development have short half-lives. Treat patterns as empirically validated, not permanent
- The boundary between prompting and fine-tuning is a design decision based on cost, quality, data, and latency — not task nature
- Evaluation results are meaningful only relative to the evaluation methodology
- LLM architecture decisions are interdependent. Changing retrieval (Area 3) affects prompt design (Area 2) and evaluation (Area 5)

## Related Documents
- domain_scope.md — the scope definition where these terms are used, including sub-area membership criteria
- structure_spec.md — source of truth for frontmatter specifications and structural rules
- dependency_rules.md — details of reference chains and direction rules
- prompt_interface.md — prompt/interface design criteria
- competency_qs.md — questions these concepts must be able to answer
