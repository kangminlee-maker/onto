---
version: 2
last_updated: "2026-03-30"
source: setup-domains
status: established
---

# Software Engineering Domain — Concept Dictionary and Interpretation Rules

Classification axis: **abstraction layer** — classification by the level of abstraction at which each term operates, from language primitives to engineering practices.

## Abstraction Layer Classification

Software engineering terms form a layered system. Each layer builds on the one below it. Understanding which layer a term belongs to determines how it should be applied and what guarantees it provides.

### Layer 1 — Language/Runtime Fundamentals

These are primitives defined by language specifications and runtime environments. They exist regardless of design methodology.

- Type = a classification of data that determines valid operations. The foundation of compile-time and runtime correctness checks
- Interface = a type-level contract specifying method signatures without implementation. Enables polymorphism: code depends on the interface, not on the concrete class
- Generic (Parametric Polymorphism) = a type parameter allowing code to operate on multiple types while preserving type safety. `List<T>` is generic; `List<string>` is a concrete instantiation
- Enum = a type with a fixed, closed set of named values. Enables exhaustive checking at compile time
- Union Type = a type that can be one of several specified types. `string | number` accepts either
- Intersection Type = a type that must satisfy all specified types simultaneously. `A & B` has all members of both A and B
- Thread = an OS-scheduled execution unit sharing memory with other threads in the same process. Requires synchronization (locks, atomics) to prevent data races
- Process = an OS-scheduled execution unit with its own memory space. Isolation prevents data races but requires IPC for coordination
- Coroutine = a function that can suspend and resume execution. The foundation for async/await. Cooperative (voluntarily yields) vs preemptive (OS interrupts)
- Event Loop = a runtime construct that processes a queue of events/callbacks sequentially. The concurrency model for Node.js, browser JavaScript, and Python asyncio
- Garbage Collection (GC) = automatic memory reclamation of unreferenced objects. Strategies: mark-and-sweep, generational, reference counting. Trade-off: convenience vs pause-time unpredictability
- Stack = memory region for function call frames, LIFO allocation. Fixed size per thread
- Heap = memory region for dynamically allocated objects with arbitrary lifetimes. Managed manually (C/C++) or by GC
- Closure = a function that captures variables from its enclosing scope. The captured variables persist beyond the enclosing function's return
- Value Type vs Reference Type = value types are copied on assignment; reference types share the same underlying object. Misunderstanding this causes aliasing bugs

### Layer 2 — Design Pattern/Principle Terms

These encode proven solutions to recurring design problems. They exist as conventions, not language features.

#### SOLID Principles

- SRP (Single Responsibility) = a module should have one reason to change. "Reason to change" means one stakeholder or business concern — not "does one thing"
- OCP (Open/Closed) = open for extension, closed for modification. New behavior via new implementations, not editing existing code
- LSP (Liskov Substitution) = subtypes must be substitutable for their base types without altering correctness. Classic violation: `Square extends Rectangle` breaking independent width/height
- ISP (Interface Segregation) = clients should not depend on methods they do not use. Prefer multiple small interfaces over one large interface
- DIP (Dependency Inversion) = high-level modules depend on abstractions, not low-level modules. The architectural basis for testability and modularity

#### Other Principles

- DRY (Don't Repeat Yourself) = every piece of knowledge has a single representation. Targets knowledge duplication, not code duplication — identical code with different change-reasons should remain separate
- KISS = prefer the simplest solution that meets requirements
- YAGNI = do not implement functionality until actually needed

#### Design Patterns

- Factory = encapsulates object creation logic. Factory Method (subclass decides) vs Abstract Factory (family of related objects)
- Strategy = encapsulates interchangeable algorithms behind a common interface, selected at runtime
- Observer = subject notifies dependents of state changes. Foundation for event-driven architectures. Risk: memory leaks from unregistered observers
- Repository = collection-like interface for accessing domain objects, hiding persistence details from business logic
- Unit of Work = tracks changes during a business transaction and writes them as a single atomic operation. Often paired with Repository
- CQRS (Command Query Responsibility Segregation) = separating read and write into distinct models. Justified when read/write patterns differ significantly; adds complexity otherwise
- Saga = distributed transactions as a sequence of local transactions with compensating actions. Choreography-based (events) or orchestration-based (coordinator)

#### Architecture Patterns

- Hexagonal (Ports and Adapters) = application logic at center, surrounded by ports (interfaces) and adapters (implementations). Domain independent of infrastructure
- Clean Architecture = concentric layers where dependencies point inward. The Dependency Rule: source code dependencies point toward higher-level policies
- Layered Architecture = vertical separation (Presentation, Business, Data Access). Each layer depends only on the layer below
- Microservices = independently deployable services communicating via network. Benefits: independent scaling/deployment. Costs: distributed system complexity
- Monolith = single deployable unit. Not inherently bad — simpler deployment, no network latency, easier debugging
- Modular Monolith = monolith with enforced module boundaries. Monolith simplicity with microservice-like modularity

### Layer 3 — Domain/Practice Terms

These belong to specific engineering practices and sub-disciplines.

#### DevOps

- CI/CD = CI: build and test on every commit. CD: automatically deploy verified builds. The pipeline is the automated sequence of these stages
- Artifact = versioned, immutable build output (JAR, Docker image, npm package). Never modified — only replaced
- Blue-Green Deployment = two identical environments, switch traffic between them. Instant rollback. Cost: double infrastructure
- Canary Deployment = route small traffic percentage to new version, increase gradually if healthy
- Rolling Deployment = replace instances one at a time. Both versions coexist during rollout

#### Security

- CSRF (Cross-Site Request Forgery) = malicious site triggers requests using victim's session. Prevented by CSRF tokens or SameSite cookies
- XSS (Cross-Site Scripting) = malicious scripts injected into pages. Types: stored, reflected, DOM-based. Prevented by output encoding and CSP
- SQL Injection = malicious SQL via unsanitized input. Prevented by parameterized queries, never string concatenation
- CORS (Cross-Origin Resource Sharing) = HTTP mechanism allowing cross-origin access. Not a security feature — it relaxes the same-origin policy
- CSP (Content Security Policy) = HTTP header specifying allowed content sources. Primary defense against XSS
- RBAC (Role-Based Access Control) = permissions assigned to roles, users assigned to roles. Simple but coarse-grained
- ABAC (Attribute-Based Access Control) = access decisions based on user/resource/environment attributes. More flexible than RBAC, harder to audit

#### Testing

- Unit Test = tests a single unit in isolation. Fast, deterministic. If it needs a database, it is not a unit test
- Integration Test = tests interactions between components (DB, API, queues). Catches interface mismatches unit tests cannot
- E2E Test = tests full application path. Slowest, most brittle, highest confidence
- Contract Test = verifies API conformance to a shared contract. Consumer-driven: consumer defines expectations, provider verifies
- Property-Based Test = generates random inputs to verify properties hold universally. Finds edge cases example-based tests miss
- Mutation Test = modifies source code and checks if tests detect it. Surviving mutants = untested behavior
- Test Double = objects replacing real dependencies. Mock (verifies interactions), Stub (canned responses), Fake (simplified implementation), Spy (records calls)

#### Observability

- Logging = recording discrete events with timestamps and structured data. Structured (JSON) for machines; unstructured for humans
- Metrics = numerical measurements over time. Counters (monotonic), gauges (point-in-time), histograms (distributions)
- Tracing = tracking a request across service boundaries via trace ID. Each service adds a span
- SLI (Service Level Indicator) = quantitative measure of service behavior
- SLO (Service Level Objective) = target value for an SLI. Internal engineering target
- SLA (Service Level Agreement) = contract with consequences if SLOs are not met. Always backed by stricter internal SLOs

### Relationship Between Layers

Layer 1 defines what the language/runtime provides. Layer 2 encodes design wisdom on top of Layer 1 primitives. Layer 3 applies both to specific engineering disciplines. A design pattern (Layer 2) may be unnecessary when a language feature (Layer 1) already solves the problem. A practice-specific term (Layer 3) assumes familiarity with patterns (Layer 2) and primitives (Layer 1). See also: structure_spec.md for structural rules across layers.

## Architecture Core Terms

- Module = an independently deployable or replaceable unit of code with a defined public interface
- Dependency = a relationship where one module requires another's functionality. Circular dependencies indicate a design flaw
- Bounded Context (DDD) = the scope within which a specific domain model is consistently applied. Coined by Eric Evans. "Customer" in billing has payment methods; "Customer" in shipping has addresses. Same word, different models
- Anti-corruption Layer = a translation layer between bounded contexts that prevents one model from corrupting another
- Source of Truth = the authoritative data/definition source when inconsistencies arise. Without declared priority, data divergence becomes undetectable
- Adapter = translates between an external interface and the application's internal interface
- Port = an interface defining how the application interacts with outside systems. Driving (used by external actors) vs driven (used by the application)
- Gateway = unified interface to a complex subsystem or external system
- Middleware = component in the request pipeline executing before/after the main handler. Uses: auth, logging, error handling
- Sidecar = co-deployed auxiliary process adding functionality without modifying the service. Common in service mesh architectures

## Data/State Management Terms

- State = current point-in-time system information. Stateful: maintains state between requests. Stateless: derives from each request
- Mutation = an operation that modifies state. Functional programming avoids mutation; imperative programming controls it
- Transaction = atomic operation that succeeds entirely or fails entirely (ACID)
- Migration = applying schema changes to existing data. Must be reversible and idempotent
- Terminal State = a final state with no further transitions. In Event Sourcing: transition event, Projector branch, and allowed subsequent events must all be defined
- Optimistic Locking = reads with version number, checks at write time. Fails on version mismatch. For low-contention scenarios
- Pessimistic Locking = acquires lock before reading. For high-contention scenarios. Risk: deadlocks
- Eventual Consistency = replicas converge to the same value given time. Does not mean "inconsistent" — guarantees convergence
- Strong Consistency = every read returns the most recent write. Cost: higher latency, reduced availability during partitions
- CAP Theorem = distributed systems can guarantee at most two of: Consistency, Availability, Partition tolerance. Since partitions are unavoidable, the practical choice is CP or AP
- Snapshot = point-in-time state copy. In Event Sourcing, avoids replaying all events from the beginning
- Replay = reconstructing state by re-applying events from the log. Core mechanism of Event Sourcing

## Type System Terms

- Discriminated Union = types distinguished by a shared field (discriminant). Enables type-safe branching per variant
- Exhaustive Check = verification that all cases are handled. `default: never` pattern focuses errors at origin when variants are added
- Contract = module agreement specifying both guarantees and non-guarantees. Omitting non-guarantees creates hidden coupling
- Structural vs Nominal Typing = structural (TypeScript, Go): compatible if structure matches. Nominal (Java, C#): requires explicit declaration. Structural enables duck typing; nominal prevents accidental compatibility
- Type Guard = runtime check that narrows a type within a scope. Custom guards use `is` syntax
- Type Narrowing = compiler reducing a broad type to specific type based on control flow analysis
- Branded Type (Opaque Type) = structurally identical but treated as distinct. `type UserId = string & { __brand: 'UserId' }` prevents passing raw strings where UserId is expected
- Variance = how generic subtyping relates to parameter subtyping. Covariant (safe for reading), Contravariant (safe for consuming), Invariant (safe for both)

## Constraint Design Terms

- Hard Constraint = invalidates the system when violated. Enforced by code. Example: "order total must be non-negative"
- Soft Constraint = degrades quality when violated but system continues. Enforced through protocol. Example: "response under 200ms"
- Invariant = condition always true, detectable by structure alone. Enforced by code
- Best-effort = requires semantic interpretation, structural detection impossible. Recommended through protocol
- Precondition = must be true before an operation executes. Caller's responsibility
- Postcondition = guaranteed true after successful operation completion. Implementer's responsibility

## Change Management Terms

- Breaking Change = breaks existing consumers' code or data. Removing a public method, changing a return type, tightening a constraint
- Backward Compatible = existing consumers work without modification. Adding optional parameters, loosening constraints
- Deprecation = maintaining while announcing future removal. Must specify: what, when removed, and replacement
- Semantic Versioning (SemVer) = MAJOR.MINOR.PATCH. MAJOR: breaking. MINOR: backward-compatible features. PATCH: bug fixes. A communication contract — violating it erodes consumer trust
- Feature Toggle = enable/disable features at runtime without deployment. Risk: toggle debt from unremoved toggles
- Trunk-based Development = all developers commit to main with short-lived branches. Requires strong CI and feature toggles
- Branch-by-Abstraction = large changes without long-lived branches: introduce abstraction, implement new version behind it, switch, remove old

## Quality Terms

- Idempotent = same result regardless of repetition count. `DELETE /user/123` is idempotent; `POST /orders` is not. Critical for retry-safe APIs
- Pure Function = no external state dependency, no side effects. Same input → same output. Testable, cacheable, parallelizable
- Deterministic = same output for same input. All pure functions are deterministic, but not all deterministic functions are pure
- Referential Transparency = an expression replaceable with its value without changing behavior. Enables equational reasoning
- Memoization = caching function results for repeated inputs. Only safe for pure/deterministic functions
- Immutability = data cannot be modified after creation. Shallow: top-level immutable, nested mutable. Deep: immutable at all depths
- Thread Safety = correct behavior under concurrent access. Strategies: immutability, synchronization, lock-free (CAS). Lock-free guarantees system-wide progress; wait-free guarantees per-thread progress

## Document Design Terms

- Contract Document = specification with 1:1 code correspondence. Violation is a defect
- Guide Document = describes intent and context. Supplementary judgment material
- Self-contained Spec = includes all execution-necessary information. Required when AI agents are executors
- API-first Design = design the API contract before implementing server or client. Enables parallel development
- Schema-driven Development = deriving code from a single schema definition. Schema is source of truth
- OpenAPI = specification format for REST APIs (endpoints, schemas, auth, errors). De facto REST API standard
- AsyncAPI = specification for event-driven APIs (WebSocket, Kafka, AMQP). Analogous to OpenAPI for async

## Homonyms Requiring Attention

- "service": service class (business logic) != microservice (deployment unit) != domain service (DDD, stateless operation) != OS service (daemon)
- "model": domain model (business object) != ML/LLM model != MVC model != data model (DB schema)
- "controller": MVC controller != hardware controller != Kubernetes controller (reconciliation loop)
- "context": execution context (runtime) != Bounded Context (DDD) != React Context != context window (LLM)
- "migration": DB migration (schema change) != system migration (infrastructure move) != data migration (format transform)
- "validation": input validation (user data) != design validation (architecture review) != schema validation (data vs schema)
- "constraint": data constraint (DB) != design constraint (architecture) != business rule != type constraint (generic bounds)
- "event": domain event (business) != browser event (click) != system event (OS signal) != CloudEvents (format)
- "client": HTTP client != client application (frontend) != client (customer) != OAuth client (registered app)
- "middleware": Express middleware (handler chain) != message middleware (broker) != Redux middleware (interceptor)
- "hook": React hook != git hook != webhook (HTTP callback) != lifecycle hook (framework callback)
- "registry": npm registry != Docker registry != service registry (discovery)

## Interpretation Principles

- Whether current behavior is intentional or a bug cannot be determined from code alone. Cross-check with tests, documentation, and commit history

- "Tests pass" and "works correctly" are not the same. Tests verify what they cover; they say nothing about untested paths. 100% code coverage does not mean 100% behavior coverage

- "Code coverage" and "test quality" are independent axes. High coverage with weak assertions provides false confidence. Low coverage with strong property-based tests may catch more real bugs

- "Working software" and "correct software" are not the same. "Working" is an empirical observation; "correct" is a logical property

- Inter-module contracts must specify both "what is guaranteed" and "what is not guaranteed." Unguaranteed behavior creates hidden coupling

- When a design principle is agreed upon, first verify whether it is already achieved in another form. Literal vs substantive achievement — distinguishing them prevents over-engineering

- "Referential integrity" (does A point to B?) and "semantic consistency" (are A's contents compatible with B's contents?) are separate verification layers

- "Distributed" and "scalable" are independent properties. Distribution is a topology decision; scalability is a capacity property

- "Eventual consistency" does not mean "inconsistent." It guarantees convergence. The term describes convergence behavior, not data quality

- "Microservices" is not a synonym for "good architecture." They solve organizational scaling at the cost of distributed complexity. A monolith that meets requirements is preferable

- "Technical debt" is not "code I don't like." Debt is a deliberate trade-off with known future cost. Accidental complexity or poor design are defects, not debt

- Naming collisions across abstraction layers cause persistent confusion. When a term appears in multiple contexts (see Homonyms), qualify it with the specific context on first use

## Related Documents
- domain_scope.md — definition of the areas where these terms are used
- logic_rules.md — rules related to type system and constraints
- structure_spec.md — rules related to module structure
