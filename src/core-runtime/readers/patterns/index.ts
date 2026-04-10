import type { DepEdge, ApiPattern, SchemaPattern, ConfigPattern, DocStructure } from "../types.js";

export interface DetectPatternsResult {
  deps: DepEdge[];
  apis: ApiPattern[];
  schemas: SchemaPattern[];
  configs: ConfigPattern[];
  docs: DocStructure[];
}

/**
 * Stub: pattern detection is deferred (code parser infrastructure not yet absorbed).
 * Returns empty results for all categories.
 */
export function detectPatterns(_content: string, _filePath: string): DetectPatternsResult {
  return { deps: [], apis: [], schemas: [], configs: [], docs: [] };
}
