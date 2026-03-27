# Business Domain — Domain Scope Definition

This domain applies when **reviewing** business plans, management strategies, and operational designs.
It identifies "what should exist but is missing" based on core management theories and frameworks.

## Major Sub-areas

Classification axis: **management concern** — classified by the management concerns that a business system must address.

### Strategic Management
- **Competitive Analysis** (required): Porter's 5 Forces (industry attractiveness), 3 generic strategies (cost leadership/differentiation/focus)
- **Resource-Based Strategy** (required): VRIO framework (Value/Rarity/Imitability/Organization), core competency identification
- **Growth Strategy** (required): Ansoff Matrix (market penetration/market development/product development/diversification), BCG Matrix (business portfolio)
- **Value Innovation** (when applicable): Blue Ocean Strategy (value innovation, strategy canvas, ERRC grid)
- **Business Development** (when applicable): new market entry, partnerships, M&A strategy

### Marketing
- **Market Strategy** (required): STP (Segmentation-Targeting-Positioning), market segmentation criteria (demographic/psychographic/behavioral)
- **Marketing Mix** (required): 4P (Product/Price/Place/Promotion), 7P extension for services (+People/Process/Physical Evidence)
- **Customer Management** (required): Customer Journey Map, customer acquisition/retention strategies, Brand Equity model
- **Digital Marketing** (when applicable): funnel analysis, growth hacking, data-driven marketing

### Finance
- **Investment Decision-Making** (required): Capital Budgeting — NPV, IRR, payback period, profitability index
- **Capital Structure** (required): Modigliani-Miller theorem, WACC (Weighted Average Cost of Capital), optimal capital structure
- **Working Capital Management** (required): CCC (Cash Conversion Cycle), liquidity management, cash flow forecasting
- **Corporate Valuation** (when applicable): DCF, relative valuation (EV/EBITDA, PER), real options
- **Accounting Standards Reference** (reference): revenue recognition and financial statement consistency are referenced from the accounting domain. Detailed K-IFRS rules are under the accounting domain's jurisdiction

### Operations Management
- **Process Optimization** (required): Lean (7 types of waste), Six Sigma (DMAIC), process design
- **Constraint Management** (required): TOC (Theory of Constraints) — bottleneck identification, Drum-Buffer-Rope
- **Supply Chain Management** (scale-dependent): SCM strategy, procurement, logistics, inventory management (EOQ, JIT), supplier relations
- **Quality Management** (required): TQM, cost of quality (prevention/appraisal/failure costs), productivity measurement
- **Automation** (when applicable): automation scope definition (start/end points), effectiveness measurement vs. manual processes, discrepancy adjudication authority

### Organization & HR
- **Organizational Structure** (required): Mintzberg's 5 organizational structures (simple/machine bureaucracy/professional bureaucracy/divisionalized/adhocracy)
- **Organizational Theory** (required): Agency Theory (principal-agent problem), Stakeholder Theory (stakeholder management)
- **Human Resource Management** (required): Competency Model, performance management system, Talent Pipeline
- **Change Management** (required): Kotter's 8 Steps, ADKAR model (Awareness-Desire-Knowledge-Ability-Reinforcement)
- **Leadership** (when applicable): leadership types, delegation, organizational culture

### Innovation Management
- **Disruptive Innovation** (when applicable): Christensen's Disruptive Innovation Theory, sustaining vs. disruptive innovation
- **Technology Adoption** (when applicable): Technology Adoption Lifecycle (innovators/early adopters/early majority/late majority/laggards), Chasm
- **Design Thinking** (when applicable): Design Thinking 5 stages (Empathize/Define/Ideate/Prototype/Test)
- **R&D Management** (when applicable): technology roadmap, innovation portfolio, open innovation

### Governance & Risk
- **Corporate Governance** (required): board composition, internal controls, auditing, shareholder rights, Corporate Governance codes
- **Risk Management** (required): COSO ERM framework, risk identification/assessment/response (avoid/mitigate/transfer/accept)
- **Business Law** (required): contracts, regulatory compliance, intellectual property, labor law
- **ESG** (when applicable): ESG disclosure frameworks (GRI, SASB, TCFD), stakeholder engagement — separated from governance as an independent concern

### Modern Extensions
- **Platform Business** (when applicable): two-sided/multi-sided markets, network effects (direct/indirect), platform governance
- **Subscription Economy** (when applicable): SaaS/recurring revenue models, LTV/CAC analysis, Churn Rate management, MRR/ARR
- **AI Business** (when applicable): Data Moat, AI ethics/regulation, algorithmic decision-making, AI product design

## Required Concept Categories

These are concept categories that must be addressed in any business system.

| Category | Description | Risk if Missing |
|---|---|---|
| Revenue model | Revenue generation structure and pricing system | No basis for business viability |
| Cost structure | Fixed/variable cost distinction, cost attribution principles | Unable to assess profitability |
| Value proposition | Specific value the customer receives and competitive differentiation | Market fit unverified |
| Competitive strategy | Competitive environment analysis, positioning, sustainable advantage source | No strategic direction |
| Risk management | Identified risks, response strategies, residual risks | Unprotected during disruptions |
| Performance measurement | KPI definitions, measurement methods, targets (leading/lagging indicators) | Unable to determine improvement direction |
| Organization design | Decision-making structure, roles/responsibilities, reporting hierarchy | No execution capability |
| Source of truth | The authoritative reference when data inconsistencies arise (regulations, contracts, financial systems) | Decision basis conflicts |

## Reference Standards/Frameworks

| Standard/Framework | Application Area | Core Content |
|---|---|---|
| Porter's Five Forces | Strategic management | Industry competitive intensity analysis (5 competitive factors) |
| VRIO Framework | Strategic management | Resource/capability-based sustainable competitive advantage assessment |
| Balanced Scorecard | Performance measurement | 4 perspectives: financial/customer/internal process/learning & growth |
| Business Model Canvas | Business development | Business model design based on 9 building blocks |
| COSO ERM | Risk management | Enterprise risk management framework |
| Lean / Six Sigma | Operations management | Waste elimination, process quality improvement |
| Kotter's 8 Steps | Change management | 8-step model for organizational change execution |
| WACC / DCF | Finance | Cost of capital calculation, enterprise/project valuation |

## Bias Detection Criteria

- If 3 or more of the 8 concern areas are not represented at all -> **insufficient coverage**
- If concepts from a specific area account for more than 70% of the total -> **bias warning**
- If only the revenue model is defined with no cost structure -> **revenue-cost imbalance**
- If only strategy is defined with no operational/execution plan -> **execution path absence**
- If only qualitative goals exist without quantitative indicators -> **unmeasurable warning**
- If strategy is established without competitive analysis -> **strategy basis absence**
- If relevant modern extension areas (platform/subscription/AI) are missing for an applicable business -> **modern business model not reflected**
- If there are 2 or more key data items with no designated source of truth -> **undesignated authority**
- If execution plans exist without organization design -> **execution owner unclear**

## Related Documents
- concepts.md — definitions of terms within this scope
- structure_spec.md — structural requirements for business systems
- competency_qs.md — questions this scope must be able to answer
