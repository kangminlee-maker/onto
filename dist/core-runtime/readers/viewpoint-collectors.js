/**
 * 6관점별 코드 청크 수집 함수.
 *
 * 각 함수는 ScanResult + OntologyQueryResult의 구조 정보에서
 * 관점별로 관련 코드를 필터링한다. 결정론적이다.
 */
// ─── Semantics ───
export function collectSemantics(resolved, max) {
    const chunks = [];
    for (const loc of resolved) {
        if (loc.resolution_method === "unresolved")
            continue;
        for (const filePath of loc.resolved_files) {
            chunks.push({
                file_path: filePath,
                viewpoint: "semantics",
                context: `온톨로지 매칭: ${loc.reference}`,
            });
            if (chunks.length >= max)
                return chunks;
        }
    }
    return chunks;
}
// ─── Dependency ───
export function collectDependency(resolved, depGraph, max) {
    const resolvedPaths = new Set();
    for (const loc of resolved) {
        for (const fp of loc.resolved_files)
            resolvedPaths.add(fp);
    }
    const chunks = [];
    // 1-hop: resolved 파일을 import하는 파일 (caller)
    for (const edge of depGraph) {
        if (resolvedPaths.has(edge.to)) {
            chunks.push({
                file_path: edge.from,
                viewpoint: "dependency",
                context: `${edge.to}를 import하는 파일 (caller, hop 1)`,
            });
        }
        if (chunks.length >= max)
            return chunks;
    }
    // 1-hop: resolved 파일이 import하는 파일 (callee)
    for (const edge of depGraph) {
        if (resolvedPaths.has(edge.from) && !resolvedPaths.has(edge.to)) {
            chunks.push({
                file_path: edge.to,
                viewpoint: "dependency",
                context: `${edge.from}이 import하는 파일 (callee, hop 1)`,
            });
        }
        if (chunks.length >= max)
            return chunks;
    }
    return chunks;
}
// ─── Logic ───
export function collectLogic(ontologyResult, resolved, max) {
    const chunks = [];
    // guard_note/preconditions가 있는 action의 source_code 파일
    for (const action of ontologyResult.related_actions) {
        if (!action.guard_note && (!action.preconditions || action.preconditions.length === 0))
            continue;
        const parts = [];
        if (action.guard_note)
            parts.push(`guard: ${action.guard_note}`);
        if (action.preconditions && action.preconditions.length > 0) {
            parts.push(`preconditions: ${action.preconditions.map((p) => p.check).join(", ")}`);
        }
        // action의 source_code에서 파일 경로를 resolved에서 찾기
        const matchedFiles = resolved
            .filter((r) => r.resolution_method === "filename" && r.reference === action.source_code)
            .flatMap((r) => r.resolved_files);
        for (const fp of matchedFiles.length > 0 ? matchedFiles : []) {
            chunks.push({
                file_path: fp,
                viewpoint: "logic",
                context: `⚠️ 비즈니스 규칙: ${action.display_name} (${action.id}). ${parts.join("; ")}`,
            });
            if (chunks.length >= max)
                return chunks;
        }
    }
    // value_filters로 찾을 수 있는 코드 (값 수준 매핑 단서)
    for (const vf of ontologyResult.value_filters) {
        chunks.push({
            viewpoint: "logic",
            context: `⚠️ 값 수준 매핑: ${vf.entity}는 ${vf.column}='${vf.value}'로 식별됨. 이 값을 사용하는 코드를 확인하세요.`,
            search_hint: `grep:${vf.value}`,
        });
        if (chunks.length >= max)
            return chunks;
    }
    // resolved 파일 중 validation/guard 패턴이 있을 수 있는 파일
    for (const loc of resolved) {
        for (const fp of loc.resolved_files) {
            if (fp.toLowerCase().includes("gateway") || fp.toLowerCase().includes("validator") || fp.toLowerCase().includes("guard")) {
                chunks.push({
                    file_path: fp,
                    viewpoint: "logic",
                    context: `⚠️ 검증/게이트웨이 코드: ${loc.reference}. 비즈니스 규칙 조건이 포함될 가능성이 높습니다.`,
                });
                if (chunks.length >= max)
                    return chunks;
            }
        }
    }
    return chunks;
}
// ─── Structure ───
export function collectStructure(resolved, files, schemas, configs, max) {
    const chunks = [];
    const resolvedNames = new Set();
    for (const loc of resolved) {
        const className = loc.reference.match(/^([A-Z][A-Za-z0-9]+)/)?.[1];
        if (className)
            resolvedNames.add(className.toLowerCase());
    }
    // 테스트 파일
    for (const f of files) {
        if (f.category !== "test")
            continue;
        const pathLower = f.path.toLowerCase();
        if ([...resolvedNames].some((name) => pathLower.includes(name))) {
            chunks.push({
                file_path: f.path,
                viewpoint: "structure",
                context: `테스트 파일: 기대 동작이 명시되어 있을 수 있습니다`,
            });
            if (chunks.length >= max)
                return chunks;
        }
    }
    // 스키마 파일
    for (const f of files) {
        if (f.category !== "schema")
            continue;
        chunks.push({
            file_path: f.path,
            viewpoint: "structure",
            context: `스키마 파일: DB 구조와 제약조건 확인`,
        });
        if (chunks.length >= max)
            return chunks;
    }
    // 설정/환경변수 파일
    for (const config of configs) {
        chunks.push({
            file_path: config.file,
            viewpoint: "structure",
            context: `설정: ${config.key} (환경변수/설정 파일)`,
        });
        if (chunks.length >= max)
            return chunks;
    }
    return chunks;
}
// ─── Pragmatics ───
export function collectPragmatics(matchedEntities, apiPatterns, resolved, max) {
    const chunks = [];
    const resolvedPaths = new Set();
    for (const loc of resolved) {
        for (const fp of loc.resolved_files)
            resolvedPaths.add(fp);
    }
    // resolved 파일에 위치한 API 엔드포인트
    for (const api of apiPatterns) {
        if (resolvedPaths.has(api.file) || [...resolvedPaths].some((p) => api.file.includes(p.split("/").pop().replace(/\.\w+$/, "")))) {
            chunks.push({
                file_path: api.file,
                viewpoint: "pragmatics",
                context: `${api.method} ${api.path} — 사용자 접점 API 엔드포인트 (${api.line}행)`,
            });
            if (chunks.length >= max)
                return chunks;
        }
    }
    // entity 이름이 경로에 포함된 API
    const entityLower = matchedEntities.map((e) => e.toLowerCase());
    for (const api of apiPatterns) {
        if (entityLower.some((e) => api.path.toLowerCase().includes(e))) {
            if (!chunks.some((c) => c.file_path === api.file && c.context.includes(api.path))) {
                chunks.push({
                    file_path: api.file,
                    viewpoint: "pragmatics",
                    context: `${api.method} ${api.path} — 엔티티명이 경로에 포함된 API`,
                });
                if (chunks.length >= max)
                    return chunks;
            }
        }
    }
    return chunks;
}
// ─── Evolution ───
export function collectEvolution(resolved, files, schemas, max) {
    const chunks = [];
    // DB 접두사 세대 혼재 탐지
    const legacyTables = schemas.filter((s) => s.table.startsWith("GT_") || s.table.startsWith("gt_"));
    const newTables = schemas.filter((s) => s.table.startsWith("le_") || s.table.startsWith("LE_"));
    if (legacyTables.length > 0 && newTables.length > 0) {
        for (const lt of legacyTables.slice(0, 3)) {
            chunks.push({
                file_path: lt.file,
                viewpoint: "evolution",
                context: `세대 혼재: ${lt.table} (GT_ 레거시 접두사). 신규 le_ 테이블과 공존`,
            });
            if (chunks.length >= max)
                return chunks;
        }
    }
    // resolved 파일 중 v2/Impl 등 버전 패턴
    for (const loc of resolved) {
        for (const fp of loc.resolved_files) {
            if (/[Vv]2|[Vv]3|Impl2|Legacy|Deprecated/i.test(fp)) {
                chunks.push({
                    file_path: fp,
                    viewpoint: "evolution",
                    context: `버전 패턴: ${fp.split("/").pop()} — 이전 버전과의 호환성 확인 필요`,
                });
                if (chunks.length >= max)
                    return chunks;
            }
        }
    }
    return chunks;
}
