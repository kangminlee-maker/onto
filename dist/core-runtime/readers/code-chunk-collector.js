/**
 * 6관점 통합 코드 청크 수집 오케스트레이션.
 *
 * viewpoint-collectors.ts의 6개 수집 함수를 호출하고,
 * 결과를 RelevantCodeChunks 구조로 조합한다.
 */
import { collectSemantics, collectDependency, collectLogic, collectStructure, collectPragmatics, collectEvolution, } from "./viewpoint-collectors.js";
// ─── Main ───
export function collectRelevantChunks(resolved, ontologyResult, scanResult, keywords, options) {
    const defaultMax = options?.maxChunksPerViewpoint ?? 10;
    function getMax(vp) {
        const override = options?.viewpointOverrides?.[vp];
        if (override?.enabled === false)
            return 0;
        return override?.maxChunks ?? defaultMax;
    }
    const by_viewpoint = {
        semantics: collectSemantics(resolved, getMax("semantics")),
        dependency: collectDependency(resolved, scanResult.dependency_graph, getMax("dependency")),
        logic: collectLogic(ontologyResult, resolved, getMax("logic")),
        structure: collectStructure(resolved, scanResult.files, scanResult.schema_patterns, scanResult.config_patterns, getMax("structure")),
        pragmatics: collectPragmatics(ontologyResult.matched_entities, scanResult.api_patterns, resolved, getMax("pragmatics")),
        evolution: collectEvolution(resolved, scanResult.files, scanResult.schema_patterns, getMax("evolution")),
    };
    // 중복 파일은 토큰 추정에서 1회만 카운트
    const uniqueFiles = new Set();
    let totalChunks = 0;
    const viewpoint_counts = {};
    for (const [vp, chunks] of Object.entries(by_viewpoint)) {
        viewpoint_counts[vp] = chunks.length;
        totalChunks += chunks.length;
        for (const c of chunks) {
            if (c.file_path)
                uniqueFiles.add(c.file_path);
        }
    }
    const unresolvedCount = resolved.filter((r) => r.resolution_method === "unresolved").length;
    return {
        by_viewpoint,
        coverage_gaps: [], // 에이전트가 채움
        ontology_result: ontologyResult,
        total_chunks: totalChunks,
        total_tokens_estimate: uniqueFiles.size * 500, // 파일당 ~500 토큰 추정
        search_confidence: {
            method: "ontology",
            ontology_match_count: ontologyResult.matched_entities.length,
            unresolved_count: unresolvedCount,
            keywords_used: keywords,
            viewpoint_counts,
            ...(unresolvedCount > 0 ? { warning: `${unresolvedCount}건의 source_code가 파일로 해석되지 않았습니다` } : {}),
        },
    };
}
