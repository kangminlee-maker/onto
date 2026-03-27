# Philosophical Foundations of Ontology: A Synthesis of 25 Fields

A systematic compilation of the philosophical fields involved in building, using, and verifying ontologies.

---

## Table of Contents

1. [Core 7 Fields](#1-core-7-fields)
2. [7 Fields Adjacent to Conceptualization](#2-7-fields-adjacent-to-conceptualization)
3. [11 Extended Fields for Building, Using, and Verifying](#3-11-extended-fields-for-building-using-and-verifying)
4. [Standard Frameworks for Ontology Evaluation](#4-standard-frameworks-for-ontology-evaluation)
5. [Overall Structure Diagram](#5-overall-structure-diagram)

---

## 1. Core 7 Fields

Philosophical fields that directly address conceptualization.

### 1.1 Ontology

- **What it is:** The field that asks "what exists?" It identifies and classifies the categories that constitute the world -- entities, properties, relations, events, processes.
- **Relation to conceptualization:** The most direct. Ontology is the very act of systematically organizing "what kinds of things there are." Software ontologies (OWL, RDF, etc.) are engineering implementations of this philosophical field.
- **Key questions:** Is the distinction between classes and instances real? Do relations exist independently?

### 1.2 Epistemology

- **What it is:** The field that asks "how can we justify what we know?"
- **Relation to conceptualization:** For a concept to form, there must be criteria for judging whether that concept is valid as knowledge. It provides questions such as "is this conceptual distinction justified?" and "is there a basis for this classification criterion?"
- **Key questions:** How can we define concepts that cannot be directly observed (e.g., "system stability")?

### 1.3 Logic

- **What it is:** The field that addresses the formal rules of reasoning. It defines the systems of propositions, predicates, quantifiers (for-all, exists), and connectives (and, or, implies).
- **Relation to conceptualization:** Provides tools for formally expressing and verifying relationships between concepts. It enables determining whether the statement "all X are Y" contradicts other definitions. OWL-DL (Description Logic) is a direct application of this field.
- **Key questions:** What conclusions can be derived within this conceptual system? Are there contradictions?

### 1.4 Philosophy of Language

- **What it is:** The field that explores how language acquires meaning. It addresses the relationships among reference, sense, and context.
- **Relation to conceptualization:** Concepts are expressed through terms. The problem of the same term having different meanings in different contexts (polysemy) and different terms referring to the same object (synonymy) are core topics in philosophy of language. This is why ontologies distinguish between label, synonym, and definition.
- **Key questions:** When the term "server" simultaneously refers to hardware and a software process, is this one concept or two?

### 1.5 Phenomenology

- **What it is:** The field that analyzes the structure of experience as it appears to consciousness. Systematized by Husserl.
- **Relation to conceptualization:** Addresses the stage before concepts form. The position that the way we experience the world precedes conceptual distinctions. It answers the question "why does this distinction feel natural?"
- **Key questions:** What experiential structure underlies a classification system that users find "intuitive"?

### 1.6 Theory of Categories

- **What it is:** A field originating from Aristotle that defines the top-level categories for classifying existence. It is both a subfield of modern ontology and an independent tradition.
- **Relation to conceptualization:** Determines the top-level structure of ontologies -- Substance, Quality, Process, Relation, etc. Upper ontologies such as BFO, DOLCE, and SUMO directly reflect this philosophical theory of categories.
- **Key questions:** Is "event" a category at the same level as "entity," or a subcategory?

### 1.7 Philosophy of Science

- **What it is:** The field that addresses how scientific theories and concepts are formed and change.
- **Relation to conceptualization:** Explains the process by which conceptual systems change and are replaced over time (paradigm shifts, theory-ladenness). Directly corresponds to version management and evolution problems in ontologies.
- **Key questions:** Should the existing conceptual system be extended, or rebuilt from scratch?

---

## 2. 7 Fields Adjacent to Conceptualization

Fields that serve as connective tissue between the core 7 fields.

### 2.1 Semiotics

- **What it is:** The field that studies the structure by which signs convey meaning. Systematized by Peirce and Saussure.
- **Relation to conceptualization:** Concepts are expressed externally through signs. Semiotics decomposes signs into three layers.
  - **Syntactics:** Formal relationships among signs (= ontology structure)
  - **Semantics:** Relationships between signs and objects (= concept definitions)
  - **Pragmatics:** Relationships between signs and users (= actual use of concepts)
- **Difference from philosophy of language:** Philosophy of language focuses on the meaning of natural language. Semiotics encompasses all representational systems including diagrams, code, and icons.

### 2.2 Mereology

- **What it is:** The field that formally addresses the relationship between parts and wholes. Initiated by Lesniewski and actively used in modern formal ontology.
- **Relation to conceptualization:** The "A is part of B (part-of)" relation is as fundamental in ontology as the is-a relation. Part-whole relationships come in various kinds.
  - The heart is a **component** of the body
  - A handle is a **functional part** of a door
  - Chapter 1 is a **portion** of a book
- Without this distinction, different kinds of part-of are conflated, leading to incorrect inferences.

### 2.3 Metaphysics

- **What it is:** The field that explores the fundamental structure of reality. Ontology is one part of metaphysics.
- **Relation to conceptualization:** While ontology asks "what kinds of things exist?", metaphysics addresses broader questions.
  - **Causation:** What does it mean for A to cause B -> the basis for causes, triggers relations in ontology
  - **Modality:** The difference between "possible" and "necessary" -> distinguishing the strength of constraints
  - **Temporality:** Does identity persist when an entity changes over time -> version management, state change modeling

### 2.4 Philosophy of Mind / Cognitive Philosophy

- **What it is:** The field that explores the nature of mind, consciousness, and cognitive processes.
- **Relation to conceptualization:** Addresses the cognitive process of concept formation itself.
  - **Are concepts definitions or prototypes?** -- Classical theory defines concepts by necessary and sufficient conditions. Rosch's prototype theory holds that concepts form around "typical cases."
  - **Embodied Cognition:** The position that concepts are grounded in bodily experience. Spatial concepts like "up/down" also influence abstract concepts (superclass/subclass).
- **Difference from phenomenology:** Phenomenology describes the structure of experience from the first person. Cognitive philosophy seeks to explain that process as a mechanism from a third-person perspective.

### 2.5 Ethics / Axiology

- **What it is:** The field that addresses values, norms, and obligation.
- **Relation to conceptualization:** When building a conceptual system, deciding what to include and what to exclude is a value judgment.
  - How to classify race in a medical ontology
  - Whether to classify disability as "deficiency" or "diversity"
  - Whether AI training data classification systems disadvantage certain groups
- These problems cannot be answered by logical consistency alone and require axiological judgment.

### 2.6 Hermeneutics

- **What it is:** The field that addresses the process of interpreting texts and meaning. Systematized by Gadamer.
- **Relation to conceptualization:** Explains the process of understanding and reinterpreting existing conceptual systems.
  - **Hermeneutic Circle:** Understanding the whole requires knowing the parts, and understanding the parts requires knowing the whole -> explains the difficulty a newcomer faces when first encountering an ontology
  - **Pre-understanding:** Interpreters always approach with existing knowledge -> explains why domain experts and engineers read the same ontology differently

### 2.7 Pragmatism

- **What it is:** The field that judges the meaning of concepts and theories by their practical consequences. Peirce, James, and Dewey are its leading figures.
- **Relation to conceptualization:** Provides the question "does this conceptual distinction actually make a difference?" Even logically possible distinctions are judged unnecessary if they make no difference in actual use. This is the basis for guarding against over-specification in ontologies.

---

## 3. 11 Extended Fields for Building, Using, and Verifying

Additional fields needed at each stage of ontology work.

### Building Stage

#### 3.1 Social Ontology

- **What it is:** Explores how socially constructed entities -- money, law, organizations, institutions -- exist. Searle's "institutional fact" theory is representative.
- **Role in ontology work:** Software domains contain many things that are not physical entities. "Contract," "permission," and "role" exist by collective agreement. Such entities have fundamentally different modes of existence from physical entities. A "contract" can exist even if the paper is destroyed, and effectively ceases to exist if all parties forget it. Ignoring these characteristics and modeling them identically to physical entities results in an inaccurate ontology.

#### 3.2 Process Philosophy

- **What it is:** The position that the fundamental units of the world are "processes" rather than "things." Systematized by Whitehead.
- **Role in ontology work:** Traditional ontology is entity-centric. However, some domains are more naturally modeled as process-centric.
  - Is a "build" an entity or a process?
  - Is a "deployment" a completed artifact or an ongoing activity?
  - BFO (Basic Formal Ontology) reflects this perspective by distinguishing **continuants** and **occurrents** at the top level.

#### 3.3 Philosophy of Mathematics

- **What it is:** Explores the mode of existence of mathematical objects (numbers, sets, functions) and the nature of mathematical truth.
- **Role in ontology work:** Ontology uses mathematical structures such as set theory, graph theory, and lattice theory.
  - Is a class a set? (Set-theoretic interpretation vs. non-set-theoretic interpretation)
  - Does an empty class (a class with 0 instances) exist?
  - Should infinite hierarchies be permitted?
  - This is why OWL-DL follows specific constraints from set theory.

#### 3.4 Topology / Philosophy of Boundaries

- **What it is:** Addresses problems of continuity and discontinuity, boundaries and connections. The work of Barry Smith and Varzi is representative.
- **Role in ontology work:** Where to draw boundaries between concepts is a fundamental problem.
  - Where is the boundary between "server" and "service"?
  - Does the interface between "Module A" and "Module B" belong to one or the other?
  - Where to place boundaries when dividing a continuous spectrum (e.g., performance grades) into discrete categories?

### Usage Stage

#### 3.5 Action Theory

- **What it is:** The field that analyzes the structure of human action -- intention, reason, and consequence.
- **Role in ontology work:** Software ontologies often need to model "user actions."
  - Is a "click" an action or an event?
  - Is "approval" a single action or a series of actions?
  - Should an unintended outcome (data deletion due to a bug) be classified as an action?

#### 3.6 Philosophy of Information

- **What it is:** The field that addresses the nature of information, the relationship between information and meaning, and information ethics. Systematized by Floridi.
- **Role in ontology work:** Ontology itself is "a structure for organizing information."
  - **Levels of Abstraction:** At what level of abstraction should the same object be described
  - **Distinguishing meaningful information from data:** Not all data needs to be included in the ontology. Only "meaningful distinctions" should be included.

#### 3.7 Philosophy of Technology

- **What it is:** Explores the nature of technological artifacts and the impact of technology on humans and society.
- **Role in ontology work:** Many objects handled by software ontologies are artifacts.
  - **Dual Nature:** Artifacts simultaneously possess physical structure and functional purpose. An "API" is both code (physical) and a communication contract (functional).
  - **Design Intent:** "Why was it made" is part of the essence of an artifact. This is a property absent from natural objects.

### Verification Stage

#### 3.8 Dialectics

- **What it is:** A mode of thinking that reaches a better synthesis through the collision of opposing perspectives (thesis-antithesis-synthesis). Systematized by Hegel.
- **Role in ontology work:** Ontology verification requires collision and synthesis of multiple perspectives.
  - When domain expert A defines "deployment" as "code delivery" and B defines it as "including environment configuration," the question is not which is correct but that a synthesis of both perspectives is needed.
  - The 7-Agent Panel Review structure -- independently evaluating from multiple perspectives (structural, semantic, logical, etc.) and then synthesizing -- is a dialectical approach.

#### 3.9 Fallibilism / Theory of Error

- **What it is:** The position that all knowledge is in principle fallible, and that error detection and correction are central to knowledge advancement. Peirce and Popper are its leading figures.
- **Role in ontology work:** Provides the premise that ontologies are not completed but continuously revised.
  - Verification is not "proof of correctness" but "error detection."
  - Definitions must be in a falsifiable form for verification to be possible. "This class is useful" cannot be verified, but "instances matching this class exist in the system" can be.

#### 3.10 Social Epistemology

- **What it is:** Addresses how knowledge is formed and verified through collective processes rather than individual ones.
- **Role in ontology work:** Ontologies are built through consensus among multiple stakeholders, not by a single person.
  - When expert panels disagree, is majority rule the correct method?
  - Which takes priority: authority or evidence?
  - How to prevent groupthink?

#### 3.11 Modal Logic / Possible World Semantics

- **What it is:** A logical system that formalizes modal expressions such as "possible," "necessary," "permitted," and "obligatory."
- **Role in ontology work:** Constraints in ontologies have varying degrees of strength.
  - **Necessary:** "Every order must contain at least one item" (cardinality >= 1)
  - **Possible:** "An order may contain a discount code" (cardinality >= 0)
  - **Deontic:** "Personal information must be encrypted" (normative constraint)
  - Without modal logic, these three are expressed identically, causing confusion between required and optional conditions.

---

## 4. Standard Frameworks for Ontology Evaluation

### 4.1 Gomez-Perez Framework (1995, 2004)

An early framework classifying ontology evaluation along three axes.

| Evaluation Axis | Definition | Verification Target |
|---|---|---|
| **Consistency** | Are there no contradictions within the ontology? | Whether relationships between classes conflict logically |
| **Completeness** | Is all domain knowledge that should be represented included without omission? | Missing concepts, relations, constraints |
| **Conciseness** | Are there no unnecessary or duplicate definitions? | Duplicate classes, unnecessary relations |

### 4.2 Obrst et al.'s 4-Level Framework (2007)

A framework that hierarchizes evaluation into four levels.

| Level | Name | Verification Content |
|---|---|---|
| Level 1 | **Vocabulary** | Are terms named accurately and consistently? |
| Level 2 | **Taxonomy** | Are superclass-subclass relationships (is-a) correct? |
| Level 3 | **Relational** | Are non-hierarchical relations between classes (has-a, depends-on, etc.) accurate? |
| Level 4 | **Axiom/Rule** | Are logical constraints and inference rules valid? |

### 4.3 Brank et al.'s Evaluation Approach Classification (2005)

Classifies evaluation by methodology (how to evaluate).

| Approach | Definition | Specific Methods |
|---|---|---|
| **Gold Standard** | Compare against an already verified reference ontology | Structural similarity measurement (Precision, Recall) |
| **Application-based** | Measure performance by applying to an actual system | Search accuracy, accuracy of inference results |
| **Data-driven** | Compare against actual data (corpus) | How well the ontology explains the data |
| **Human Assessment** | Domain experts judge directly | Surveys, interviews, expert panel reviews |

### 4.4 OntoClean (Guarino & Welty, 2002, 2004)

A methodology that verifies the accuracy of classification systems based on philosophical meta-properties. Four core concepts:

- **Rigidity:** Whether a concept is essential to its instances. Example: "person" is rigid (a person cannot become a non-person)
- **Identity:** Whether there are criteria for distinguishing instances. Example: "person" has identity criteria
- **Unity:** Whether there are criteria for instances being bound together as a whole
- **Dependence:** Whether it can exist without other entities

### 4.5 Relationships Among Frameworks

```
Brank et al. (methodology classification)
 +-- Gold Standard comparison
 +-- Application-based evaluation
 +-- Data-driven evaluation
 +-- Human Assessment
      +-- Gomez-Perez (consistency/completeness/conciseness criteria)
      +-- Obrst 4-Level (level-based verification)
      +-- OntoClean (philosophical verification of classification systems)
```

- **Brank et al.** is the upper framework for deciding "which method to use"
- **Gomez-Perez**, **Obrst**, **OntoClean** are criteria frameworks defining "what basis to judge on"
- In practice, these are used in combination

---

## 5. Overall Structure Diagram

### 5.1 Relationships Among Philosophical Fields

```
Phenomenology (structure of experience)
  | foundation for concept formation
Theory of Categories (top-level classification framework)
  | determines classification system
Ontology (what exists)
  | logical consistency of concepts
Logic (formal verification)
  | linguistic expression of concepts
Philosophy of Language (terms and meaning)
  | justification of concepts
Epistemology (grounds of knowledge)
  | change of conceptual systems
Philosophy of Science (evolution and replacement)
```

### 5.2 Classification by Ontology Work Stage

```
+------------------- Building -------------------+
|                                                 |
|  [Kinds of existence]     [Formal foundations]  |
|   Ontology                 Logic               |
|   Social Ontology          Modal Logic         |
|   Process Philosophy       Phil. of Mathematics|
|   Theory of Categories     Mereology           |
|   Metaphysics              Topology/Boundaries |
|                                                 |
+------------------- Usage ---------------------+
|                                                 |
|  [Expression/Communication] [Cognition/Interp.] |
|   Philosophy of Language    Phenomenology       |
|   Semiotics                 Cognitive Philosophy|
|   Philosophy of Information Hermeneutics        |
|   Action Theory             Pragmatism          |
|   Philosophy of Technology                      |
|                                                 |
+------------------- Verification ---------------+
|                                                 |
|  [Judgment criteria]       [Verification process]|
|   Epistemology              Dialectics          |
|   Ethics/Axiology           Fallibilism         |
|   Philosophy of Science     Social Epistemology |
|                                                 |
+-------------------------------------------------+
```
