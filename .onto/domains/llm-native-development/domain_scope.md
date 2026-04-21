---
version: 2
last_updated: "2026-03-30"
source: manual
status: established
---

# LLM-Native Development Domain — Domain Scope Definition

The reference document used by coverage when identifying "what should exist but is missing" in an LLM-powered system.

## Application Scope

This domain applies when designing, building, and operating **systems powered by LLMs**. The scope encompasses all design decisions specific to LLM-based systems — from model selection to production operations.

This is a full reclassification from the previous scope ("designing LLM-friendly knowledge structures"). The original scope's content (File=Concept, frontmatter, navigation, system maps) is retained as a sub-concern within Area 3 (Retrieval & Knowledge Systems).

## Classification Axis

**System Construction Concern** — "What distinct aspect of an LLM-powered system must be designed, built, and maintained?"

Each sub-area must satisfy all 3 independence criteria:
1. **Distinct design decisions**: Choices made in this area are not determined by choices in other areas
2. **Distinct failure modes**: A failure in this area does not automatically imply failure in other areas
3. **Distinct evaluation criteria**: Quality in this area is measured by metrics not shared with other areas

## Domain Boundary Criteria

Not all software engineering concerns fall within this domain. The following 2-stage test determines whether a concern is in-scope:

**Stage 1 — Core scope**: "If this concern is removed, does the system lose any LLM-related design decisions?"
- Yes → Core scope. Must be attributed to one of the 8 sub-areas.

**Stage 2 — Conditional scope**: "This is a general SE concern, but does the LLM system introduce design decisions unique to this concern that would not exist in a non-LLM system?"
- Yes → Conditional scope. Only the LLM-unique design decisions are in-scope.
- No → Out of scope.

**Auxiliary criterion** (for ambiguous cases): "Does the LLM system practitioner face trade-offs in this concern that differ from those a general software engineer would face?"

**CE verification implications**:
- Core scope item missing = CE violation (high severity)
- Conditional scope item missing = CE violation candidate (medium severity, requires verification of unique design decision existence)
- Out-of-scope item missing = Not a CE violation

### Technology Assumptions

The following assumptions underlie the current structure. If an assumption becomes invalid, the affected areas require re-evaluation:

| Assumption | Affected Areas | If Invalidated |
|---|---|---|
| Models are accessed primarily via API (Model-as-a-Service) | 1, 7 | Area 7 expands significantly (infrastructure management) |
| Text is the primary modality; multimodal is supplementary | 2, 3 | Area 2 restructures for multi-modal input design |
| Fine-tuning is optional, not mandatory for most applications | 8 | Area 8 becomes required rather than optional |

## Sub-Areas (8)

### 1. Model Integration

**Membership Criterion**: 모델 자체의 선택·연결·교체·라우팅에 관한 설계 결정. 모델에 전달할 입력 설계(→2)나 모델 파라미터 변형(→8)은 포함하지 않는다.

- **Includes**: Model selection criteria, API integration patterns, model routing and fallback strategies, model-specific behavior management, inference optimization (model-level: quantization, batching, caching at model layer), model version pinning, multi-model orchestration (router patterns), model capability assessment
- **Excludes**: Input construction for the model (→2), customizing model weights (→8), system-level cost tracking (→7)

### 2. Prompt & Context Design

**Membership Criterion**: 모델 입력(프롬프트, 컨텍스트, 출력 형식 제약)의 구성·형식·제약에 관한 설계 결정. 입력에 포함할 정보를 확보하는 것(→3)이나 출력의 안전성 제약(→6)은 포함하지 않는다.

- **Includes**: System prompt design, few-shot example design, chain-of-thought patterns, instruction hierarchy, structured output design (JSON mode, tool call schemas), token budget management, context window utilization strategy, context rot mitigation, prompt templates and versioning
- **Excludes**: Retrieving information to include in the prompt (→3), safety-related output constraints (→6), autonomous action decision-making (→4)

### 3. Retrieval & Knowledge Systems

**Membership Criterion**: 모델이 참조할 외부 정보의 저장·검색·구조화에 관한 설계 결정. 검색된 정보의 프롬프트 조립(→2)이나 에이전트 실행 상태 관리(→4)는 포함하지 않는다.

- **Includes**: RAG pipeline design (chunking strategies, embedding model selection, retrieval algorithms, reranking), vector database selection and management, knowledge base design and maintenance, **LLM-favored structure** (File=Concept paradigm, YAML frontmatter metadata, navigation paths, system maps, llms.txt, CLAUDE.md patterns), persistent memory systems (long-term knowledge storage), knowledge graph construction for retrieval, hybrid search (keyword + semantic)
- **Excludes**: Composing retrieved information into prompts (→2), runtime agent state management (→4), model training data preparation (→8)

**Handoff point with Area 2**: Retrieval results returned = Area 3 boundary. Assembling results into prompt = Area 2 boundary.

### 4. Agentic Systems

**Membership Criterion**: 모델을 자율적 행위자로 동작시키는 아키텍처·워크플로우·도구 연결에 관한 설계 결정. 에이전트가 참조하는 지식 저장소(→3)나 에이전트 출력의 안전성(→6)은 포함하지 않는다.

- **Includes**: Agent architecture patterns (ReAct, tool use, planning, reflection), workflow patterns (prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer), multi-agent coordination and communication, MCP (Model Context Protocol) server/client design, tool design (ACI — Agent-Computer Interface), agent state management (in-session state, scratchpads), long-running agent continuity (multi-session persistence, structured progress tracking), agent memory (working memory within execution context), browser/computer use agent patterns
- **Excludes**: Tool internal implementation (→each tool's own domain), persistent knowledge stores the agent reads from (→3), safety constraints on agent actions (→6), agent output quality evaluation (→5)

### 5. Evaluation & Testing

**Membership Criterion**: 시스템 출력의 품질을 측정·검증하는 방법·기준에 관한 설계 결정. 품질 결함의 차단·완화 메커니즘(→6)이나 프로덕션 환경의 실시간 모니터링(→7)은 포함하지 않는다.

- **Includes**: Output quality evaluation metrics, hallucination detection methodology, golden set testing, AI-as-judge evaluation, comparative evaluation, A/B testing for system output quality, regression testing, benchmarking, human evaluation protocols (HITL for quality measurement), evaluation pipeline design, model selection evaluation (comparative performance)
- **Excludes**: Blocking or mitigating quality defects (→6), real-time production monitoring (→7), model training experiment tracking (→8)

### 6. Safety & Alignment

**Membership Criterion**: 시스템 출력의 유해성 차단과 모델 행동의 의도 부합 보장에 관한 설계 결정. 유해성 탐지 방법론 자체(→5)나 모델 파라미터 변경을 통한 행동 교정(→8)은 포함하지 않는다.

- **Includes**: Prompt injection defense, input/output filtering and guardrails, content policy enforcement, red teaming methodology, alignment verification (does the model behave as intended?), jailbreak prevention, PII detection and redaction, responsible AI practices, regulatory compliance design (EU AI Act, etc.)
- **Excludes**: Measuring output quality (→5), modifying model behavior through parameter changes (→8), cost/latency management (→7)

### 7. Production Operations

**Membership Criterion**: LLM 시스템의 배포·실행·관측·비용 관리에 관한 운영 결정. 품질 측정 방법론 설계(→5)나 모델 자체의 선택·교체 결정(→1)은 포함하지 않는다.

- **Includes**: Logging and tracing for LLM calls, monitoring (latency, error rates, throughput), cost tracking and optimization (per-token costs, budget management), quality drift detection (output degradation over time), feedback loops (user feedback collection → system improvement), incident response for LLM-specific failures, deployment strategies (blue-green, canary for model updates), rate limiting and load balancing, system-level caching (response caching, KV cache management)
- **Excludes**: Pre-deployment quality evaluation methodology (→5), model selection and replacement decisions (→1), safety policy design (→6)

### 8. Data & Model Adaptation

**Membership Criterion**: 학습 데이터 준비와 모델 파라미터 변형(fine-tuning, RLHF, LoRA 등)에 관한 설계 결정. 모델을 변형하지 않는 상태에서의 활용(→1,2)이나 검색 대상 데이터의 구조화(→3)는 포함하지 않는다.

- **Includes**: Fine-tuning strategies (when/how, full vs parameter-efficient), dataset engineering (curation, augmentation, synthesis, cleaning), RLHF/DPO/RLAIF alignment training, parameter-efficient techniques (LoRA, QLoRA, adapters), model training experiment tracking, training infrastructure decisions, data quality assessment, distillation and model compression
- **Excludes**: Using existing models via API without modification (→1), behavior adjustment through prompting only (→2), structuring data for retrieval (→3)

## Cross-Cutting Concern: Development Lifecycle

The following concerns span multiple sub-areas and are not attributed to any single area:

- **CI/CD for LLM systems**: Automated testing, deployment pipelines, rollback strategies
- **Version management**: Prompt versions, tool schema versions, agent configuration versions, model version tracking
- **Development methodology**: Spec-first development, LLM-assisted development workflows

Cross-cutting concerns do not have their own Membership Criterion. They are addressed within each area's specific context.

### Experiment Tracking Attribution Rule

"Experiment tracking" is not a cross-cutting concern. Attribution is determined by the experiment's subject:

| Experiment Subject | Attributed Area |
|---|---|
| Model parameters or datasets | Area 8 (Data & Model Adaptation) |
| System output quality (A/B testing) | Area 5 (Evaluation & Testing) |
| Deployment/infrastructure configuration | Area 7 (Production Operations) |

### Cross-Cutting Concern Addition Criteria

A concern qualifies as cross-cutting only if:
1. It requires involvement from 3 or more sub-areas, AND
2. Attributing it to a single area would compromise that area's cohesion

## Membership Criterion Hierarchy

When determining whether a topic belongs to an area:

1. **Exclude list** takes precedence (explicit exclusions override all other rules)
2. **Membership Criterion** determines scope (the topic must satisfy the criterion)
3. **Include list** provides confirmed examples (unlisted topics may still belong if they satisfy the criterion)

## Required Concept Categories

Concept categories that must be addressed in any LLM-powered system:

| Category | Description | Risk if Missing | Primary Area |
|---|---|---|---|
| Model interface | How the system connects to and communicates with LLMs | Cannot send/receive from the model | 1 |
| Input design | Structure and constraints of what is sent to the model | Inconsistent/inefficient model usage | 2 |
| Knowledge source | Where the system obtains information for the model | Hallucination, outdated information | 3 |
| Autonomy design | How and whether the model acts independently | Uncontrolled agent behavior, or inability to automate | 4 |
| Quality measurement | How system output quality is assessed | No feedback on whether the system works | 5 |
| Harm prevention | How harmful outputs are prevented | Safety incidents, compliance violations | 6 |
| Operational visibility | How the system's runtime behavior is observed | Silent failures, cost overruns | 7 |
| Model customization | Whether and how the model is adapted to the use case | Sub-optimal performance, unnecessary API costs | 8 |

## Reference Standards/Frameworks

| Standard/Framework | Application Area | Usage |
|---|---|---|
| Anthropic: Building Effective Agents | 4 (Agentic Systems) | Agent architecture patterns, workflow patterns, ACI design |
| Anthropic: Context Engineering for AI Agents | 2, 3 | Token optimization, context rot, progressive disclosure |
| Anthropic: Effective Harnesses | 4 | Long-running agent continuity, multi-session persistence |
| OpenAI: Practical Guide to Building Agents | 4 | Single/multi-agent patterns, tool design, guardrails |
| OpenAI: Production Best Practices | 1, 5, 7 | Model pinning, evaluation, caching, load balancing |
| MCP (Model Context Protocol) | 4 | Standardized tool/resource interface for agents |
| AGENTS.md (Linux Foundation) | 3 | Coding conventions for AI agents, directory-scoped instructions |
| llms.txt specification | 3 | LLM-friendly system map design |
| Chip Huyen: AI Engineering (O'Reilly 2025) | All | Comprehensive reference across evaluation, prompting, RAG, fine-tuning |
| LangChain/LangGraph | 4 | Chain/graph-based orchestration patterns |
| LlamaIndex | 3 | Data ingestion, indexing, retrieval pipeline patterns |
| Diataxis documentation framework | 3 | Document type classification for knowledge structuring |
| LLM instruction file conventions (CLAUDE.md, .cursorrules, etc.) | 3 | Vendor-specific LLM instruction structure |

## Bias Detection Criteria

- If 4 or more of the 8 sub-areas are not represented at all → **insufficient coverage**
- If only API consumption patterns exist without model adaptation or fine-tuning considerations → **customization perspective absent**
- If only development-time concerns exist without production operations → **operational perspective absent**
- If only single-model/single-agent patterns exist without multi-model routing or multi-agent coordination → **scalability bias**
- If only prompt-based approaches exist without retrieval or fine-tuning alternatives → **technique bias (prompt-only)**
- If only model capabilities are considered without safety/alignment constraints → **safety perspective absent**
- If only automated evaluation exists without human evaluation or feedback loops → **human-in-the-loop absent**
- If LLM-favored knowledge structure design is absent from Area 3 → **knowledge structure perspective absent**

## Related Documents
- concepts.md — Term definitions within this scope
- structure_spec.md — Specific rules for system structure
- competency_qs.md — Questions this scope must be able to answer
- prompt_interface.md — Prompt/interface design criteria (retained from previous version)
