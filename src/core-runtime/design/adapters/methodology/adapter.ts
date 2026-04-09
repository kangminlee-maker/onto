/**
 * Methodology Adapter — registration metadata.
 *
 * This adapter handles design scopes for processes, methodologies,
 * and governance structures (as opposed to code-product).
 *
 * The code-product adapter uses code parsers and brownfield analysis.
 * The methodology adapter uses authority-chain analysis and
 * constraint discovery from document structure.
 */

export interface AdapterMeta {
  name: string;
  version: string;
  scope_types: string[];
  perspectives: string[];
}

export const methodologyAdapter: AdapterMeta = {
  name: "methodology",
  version: "0.1.0",
  scope_types: ["process"],
  perspectives: ["authority-consistency"],
};
