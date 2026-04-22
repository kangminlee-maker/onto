import { parse } from "yaml";
import { getLogger } from "../logger.js";
// ─── Builder ───
/**
 * 3개 YAML 문자열을 받아 인메모리 인덱스를 구성합니다.
 *
 * - 빈 문자열이면 해당 섹션만 빈 Map으로 처리합니다.
 * - YAML 파싱 에러 시 에러를 throw합니다 (빈 결과와 구분).
 */
export function buildOntologyIndex(ontologyYaml, actionsYaml, transitionsYaml) {
    const glossary = parseGlossary(ontologyYaml);
    const actions = parseActions(actionsYaml);
    const transitions = parseTransitions(transitionsYaml);
    return { glossary, actions, transitions };
}
// ─── Internal Parsers ───
function parseGlossary(yaml_str) {
    const map = new Map();
    if (yaml_str.trim() === "")
        return map;
    const doc = parse(yaml_str);
    if (!doc || !Array.isArray(doc.glossary))
        return map;
    for (const item of doc.glossary) {
        const canonical = item.canonical ?? "";
        const key = canonical.toLowerCase();
        if (map.has(key)) {
            getLogger().warn(`[ontology] Duplicate glossary key: "${key}" (canonical: "${canonical}")`);
        }
        map.set(key, {
            canonical,
            meaning: item.meaning ?? "",
            legacy_aliases: Array.isArray(item.legacy_aliases) ? item.legacy_aliases : [],
            code_entity: item.code_entity ?? undefined,
            db_table: item.db_table ?? undefined,
            fk_variants: Array.isArray(item.fk_variants) ? item.fk_variants : [],
            value_filters: Array.isArray(item.value_filters)
                ? item.value_filters.map((vf) => ({
                    column: String(vf.column ?? ""),
                    value: String(vf.value ?? ""),
                    description: String(vf.description ?? ""),
                }))
                : undefined,
        });
    }
    return map;
}
function parseActions(yaml_str) {
    const map = new Map();
    if (yaml_str.trim() === "")
        return map;
    const doc = parse(yaml_str);
    if (!doc)
        return map;
    const actionLists = [];
    // v1: write_actions/read_actions 분리
    if (Array.isArray(doc.write_actions))
        actionLists.push(doc.write_actions);
    if (Array.isArray(doc.read_actions))
        actionLists.push(doc.read_actions);
    // v3: 단일 actions 배열
    if (Array.isArray(doc.actions))
        actionLists.push(doc.actions);
    for (const list of actionLists) {
        for (const raw of list) {
            const item = raw;
            const id = item.id ?? "";
            const targetEntities = Array.isArray(item.target_entities)
                ? item.target_entities.map(String)
                : [];
            map.set(id, {
                id,
                name: item.name ?? "",
                display_name: item.display_name ?? "",
                domain: item.domain ?? "",
                actor: item.actor ?? undefined,
                target_entities: targetEntities,
                source_code: item.source_code ?? "",
                guard_note: item.guard_note ?? undefined,
                // v3 확장 필드
                preconditions: Array.isArray(item.preconditions)
                    ? item.preconditions.map((p) => ({
                        check: String(p.check ?? ""),
                        policy_ref: p.policy_ref ? String(p.policy_ref) : undefined,
                    }))
                    : undefined,
                results: Array.isArray(item.results) ? item.results.map(String) : undefined,
                state_transitions: Array.isArray(item.state_transitions) ? item.state_transitions.map(String) : undefined,
                side_effects: Array.isArray(item.side_effects) ? item.side_effects.map(String) : undefined,
            });
        }
    }
    return map;
}
function parseTransitions(yaml_str) {
    const map = new Map();
    if (yaml_str.trim() === "")
        return map;
    const doc = parse(yaml_str);
    if (!doc || !Array.isArray(doc.entities))
        return map;
    for (const entity of doc.entities) {
        const entityName = entity.name ?? "";
        const key = entityName.toLowerCase();
        // v1: state_fields[].transitions, v3: state_machine[].transitions
        const stateFields = Array.isArray(entity.state_fields) ? entity.state_fields
            : Array.isArray(entity.state_machine) ? entity.state_machine
                : null;
        if (!stateFields)
            continue;
        const entries = [];
        for (const field of stateFields) {
            // v1: field_name, v3: field
            const fieldName = field.field_name ?? field.field ?? "";
            if (!Array.isArray(field.transitions))
                continue;
            for (const t of field.transitions) {
                // v3: from can be array (multi-source transition) — take first or join
                const rawFrom = t.from;
                const fromValue = rawFrom === null || rawFrom === undefined ? "(none)"
                    : Array.isArray(rawFrom) ? rawFrom.join("|")
                        : String(rawFrom);
                const transitionId = t.id ? String(t.id) : undefined;
                entries.push({
                    id: transitionId,
                    entity: entityName,
                    field_name: fieldName,
                    from: fromValue,
                    to: String(t.to ?? ""),
                    trigger: t.trigger ?? "",
                    source_code: t.source_code ?? "",
                    // v3 확장 필드
                    guards: Array.isArray(t.guard)
                        ? t.guard.map((g) => ({
                            check: String(g.check ?? ""),
                            policy_ref: g.policy_ref ? String(g.policy_ref) : undefined,
                        }))
                        : undefined,
                });
            }
        }
        if (entries.length > 0) {
            const existing = map.get(key) ?? [];
            map.set(key, [...existing, ...entries]);
        }
    }
    return map;
}
