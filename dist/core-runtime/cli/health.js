/**
 * /onto:health CLI entry.
 *
 * Design authority: .onto/processes/learn/health.md (rule owner)
 *
 * Responsibility:
 *   - Parse target (global | project) from argv
 *   - Load learning items via collector (reads files)
 *   - Delegate aggregation + rendering to learning/health-report.ts
 *   - Write markdown dashboard to stdout
 *
 * Scope: read-only. Does not mutate learning files.
 */
import { resolveProjectRoot } from "../discovery/project-root.js";
import { collect } from "../learning/promote/collector.js";
import { buildHealthReport, renderHealthReport, } from "../learning/health-report.js";
function parseTarget(argv) {
    for (const arg of argv) {
        if (arg === "project" || arg === "--project")
            return "project";
        if (arg === "global" || arg === "--global")
            return "global";
    }
    return "global";
}
function resolveProjectRootFromArgv(argv) {
    const idx = argv.indexOf("--project-root");
    if (idx >= 0 && idx + 1 < argv.length) {
        const value = argv[idx + 1];
        if (typeof value === "string" && value.length > 0)
            return value;
    }
    return resolveProjectRoot();
}
export async function handleHealth(ontoHome, argv) {
    void ontoHome;
    const target = parseTarget(argv);
    const projectRoot = resolveProjectRootFromArgv(argv);
    const result = collect({ mode: "promote", projectRoot });
    const items = target === "project" ? result.project_items : result.global_items;
    const report = buildHealthReport(items, target);
    console.log(renderHealthReport(report));
    return 0;
}
