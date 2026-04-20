/**
 * FrameworkScope — 항목의 적용 범위 축 값 (framework v1.0 §2).
 *
 * Lexicon authority: authority/core-lexicon.yaml
 *   shared_attributes.scope.values: [product, medium, domain, methodology]
 *
 * Legacy mapping (legacy_alias_governance.scope_migration):
 *   "user" → "methodology" (label_rename)
 *   "project" → "product"  (direct rename)
 *
 * 본 type 은 framework §12.6 Phase 2 의 runtime consumer migration
 * anchor. 현재 runtime 은 {product, methodology} 만 populate 하며
 * {medium, domain} 은 forward-compatible slot.
 */
export type FrameworkScope = "product" | "medium" | "domain" | "methodology";
