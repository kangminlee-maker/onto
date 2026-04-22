/**
 * /close command orchestration.
 *
 * Closes a validated scope:
 * - validated → scope.closed → closed
 *
 * Only allowed when current state is "validated".
 */
import { readEvents } from "../../scope-runtime/event-store.js";
import { reduce } from "../../scope-runtime/reducer.js";
import { appendScopeEvent } from "../../scope-runtime/event-pipeline.js";
import { wrapGateError } from "./error-messages.js";
import { refreshScopeMd } from "./shared.js";
// ─── Main ───
export function executeClose(paths) {
    const events = readEvents(paths.events);
    const state = reduce(events);
    if (state.current_state !== "validated") {
        return {
            success: false,
            reason: `현재 상태가 ${state.current_state}입니다. /close는 validated 상태에서만 실행할 수 있습니다.`,
        };
    }
    const result = appendScopeEvent(paths, {
        type: "scope.closed",
        actor: "user",
        payload: {},
    });
    if (!result.success)
        return { success: false, reason: wrapGateError(result.reason) };
    refreshScopeMd(paths, result.state);
    return {
        success: true,
        nextState: "closed",
        message: "Scope가 종료되었습니다.",
    };
}
// refreshScopeMd is imported from ./shared.ts (UF-CONCISENESS-SCOPE-MD consolidated)
// executeDefer lives in ./defer.ts so that deferral has its own CLI surface.
