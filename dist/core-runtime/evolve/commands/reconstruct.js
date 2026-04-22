/**
 * reconstruct — CLI handler for the reconstruct activity (3-step bounded path).
 *
 * W-A-74 (DL-020 resolution): review 의 3-step bounded path 수준으로 reconstruct 비대칭 해소.
 *
 * Bounded surface:
 *   start    — session 초기화 + gathering_context 상태 기록
 *   explore  — 탐색 loop bounded invocation (현 단계는 placeholder — 실제 Explorer/lens
 *              loop 는 build runtime 확장과 함께 채운다)
 *   complete — ontology 초안 산출 + converted 상태 기록
 *
 * 본 handler 는 build runtime (.onto/processes/reconstruct.md) 의 public CLI face 다.
 * Bounded state 는 `{session_root}/reconstruct-state.json` 단일 파일로 관리한다 —
 * 이는 build runtime 의 완전한 state machine (RECONSTRUCT_TRANSITIONS) 과 구별되는
 * **CLI 관찰 가능 minimum surface**.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
// ─── Internal helpers ───
function nowIso() {
    return new Date().toISOString();
}
function sessionRoot(sessionsDir, sessionId) {
    return resolve(sessionsDir, sessionId);
}
function stateFile(root) {
    return join(root, "reconstruct-state.json");
}
function writeState(root, state) {
    writeFileSync(stateFile(root), JSON.stringify(state, null, 2) + "\n", "utf-8");
}
function readState(root) {
    const raw = readFileSync(stateFile(root), "utf-8");
    return JSON.parse(raw);
}
function makeSessionId(now) {
    const iso = now();
    const date = iso.slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(16).slice(2, 10);
    return `${date}-${rand}`;
}
// ─── Core API ───
/**
 * Step 1 — start: session 초기화 + gathering_context 상태 진입.
 */
export function executeReconstructStart(options) {
    const now = options.now ?? nowIso;
    const nowStr = now();
    if (options.source.trim() === "") {
        throw new Error("[reconstruct] source is required.");
    }
    if (options.intent.trim() === "") {
        throw new Error("[reconstruct] intent is required.");
    }
    const sessionId = options.sessionId ?? makeSessionId(now);
    const root = sessionRoot(options.sessionsDir, sessionId);
    if (existsSync(root)) {
        throw new Error(`[reconstruct] session already exists: ${sessionId}`);
    }
    mkdirSync(root, { recursive: true });
    const state = {
        session_id: sessionId,
        source: options.source,
        intent: options.intent,
        current_state: "gathering_context",
        created_at: nowStr,
        last_updated_at: nowStr,
        started_at: nowStr,
        explore_invocations: 0,
        ontology_draft_path: null,
        principal_review_status: "pending",
    };
    writeState(root, state);
    return { success: true, session_id: sessionId, session_root: root, state };
}
/**
 * Step 2 — explore: build runtime 의 탐색 loop 1회 호출.
 *
 * 현 단계는 bounded placeholder — state 만 `exploring` 으로 전이하고 invocations 을 증가.
 * 실제 Explorer/lens loop 실행은 후속 W-ID 에서 build runtime 과 연결한다.
 * 이 분리 자체가 W-A-74 의 증분: CLI 관찰 가능 surface 를 build runtime 구현보다 먼저 확보.
 */
export function executeReconstructExplore(options) {
    const root = sessionRoot(options.sessionsDir, options.sessionId);
    if (!existsSync(stateFile(root))) {
        throw new Error(`[reconstruct] session not found: ${options.sessionId}`);
    }
    const state = readState(root);
    if (state.current_state === "converted") {
        throw new Error(`[reconstruct] session already converted. explore is not allowed after completion.`);
    }
    const now = (options.now ?? nowIso)();
    const next = {
        ...state,
        current_state: "exploring",
        last_updated_at: now,
        explore_invocations: state.explore_invocations + 1,
    };
    writeState(root, next);
    return {
        success: true,
        session_id: options.sessionId,
        state: next,
        next_action: "Call `onto reconstruct explore` again to continue or `onto reconstruct complete` to finalize.",
    };
}
/**
 * Step 3 — complete: ontology 초안 산출 + converted 전이 + Principal 검증 요청.
 *
 * 현 단계는 bounded: state 를 converted 로 바꾸고 ontology_draft_path 를 placeholder 로 기록.
 * Principal 검증 경로는 §1.4 reconstruct 완료 기준 축 — 향후 학습 경로와 연결.
 */
export function executeReconstructComplete(options) {
    const root = sessionRoot(options.sessionsDir, options.sessionId);
    if (!existsSync(stateFile(root))) {
        throw new Error(`[reconstruct] session not found: ${options.sessionId}`);
    }
    const state = readState(root);
    if (state.current_state === "gathering_context") {
        throw new Error(`[reconstruct] complete requires at least one explore invocation (current: gathering_context).`);
    }
    if (state.current_state === "converted") {
        throw new Error(`[reconstruct] session already converted: ${options.sessionId}`);
    }
    const now = (options.now ?? nowIso)();
    const draftPath = join(root, "ontology-draft.md");
    // Minimal placeholder artifact — 실제 ontology 는 build runtime 이 채운다.
    writeFileSync(draftPath, [
        `# Ontology draft — ${options.sessionId}`,
        "",
        `- source: ${state.source}`,
        `- intent: ${state.intent}`,
        `- explore invocations: ${state.explore_invocations}`,
        "",
        "> Placeholder draft. build runtime (.onto/processes/reconstruct.md) 이 채울 영역.",
        "> §1.4 reconstruct 완료 기준 충족 판단은 Principal 검증 경로에서 이뤄진다.",
        "",
    ].join("\n"), "utf-8");
    const next = {
        ...state,
        current_state: "converted",
        last_updated_at: now,
        ontology_draft_path: draftPath,
        principal_review_status: "requested",
    };
    writeState(root, next);
    return {
        success: true,
        session_id: options.sessionId,
        state: next,
        next_action: "Present ontology-draft.md to Principal for verification. Update principal_review_status accordingly.",
    };
}
export function executeReconstructConfirm(options) {
    const now = (options.now ?? (() => new Date().toISOString()))();
    const root = resolve(options.sessionsDir, options.sessionId);
    const state = readState(root);
    if (state.current_state !== "converted") {
        throw new Error(`Cannot confirm: session is in "${state.current_state}" state, expected "converted".`);
    }
    if (state.principal_review_status !== "requested") {
        throw new Error(`Cannot confirm: principal_review_status is "${state.principal_review_status}", expected "requested".`);
    }
    const next = {
        ...state,
        last_updated_at: now,
        principal_review_status: options.verdict,
    };
    writeState(root, next);
    return {
        success: true,
        session_id: options.sessionId,
        state: next,
    };
}
// ─── CLI entry ───
function readOption(argv, name) {
    const idx = argv.indexOf(`--${name}`);
    return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1] : undefined;
}
function nonFlagArgs(argv) {
    const out = [];
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith("--")) {
            // skip the flag and (if present) its value
            const next = argv[i + 1];
            if (next !== undefined && !next.startsWith("--"))
                i++;
            continue;
        }
        out.push(a);
    }
    return out;
}
function defaultSessionsDir(projectRoot) {
    return join(projectRoot, ".onto", "reconstruct");
}
export async function handleReconstructCli(_ontoHome, argv) {
    const subcommand = argv[0];
    const subArgv = argv.slice(1);
    const projectRoot = readOption(subArgv, "project-root") ?? process.cwd();
    const sessionsDir = readOption(subArgv, "sessions-dir") ?? defaultSessionsDir(projectRoot);
    if (!existsSync(sessionsDir)) {
        mkdirSync(sessionsDir, { recursive: true });
    }
    switch (subcommand) {
        case "start": {
            const rest = nonFlagArgs(subArgv);
            const source = rest[0];
            const intent = rest.slice(1).join(" ").trim();
            if (!source || !intent) {
                console.error("[onto] reconstruct start requires <source> and <intent>.");
                console.error('Example: onto reconstruct start ./src "recover domain ontology"');
                return 1;
            }
            const sessionIdOpt = readOption(subArgv, "session-id");
            try {
                const result = executeReconstructStart({
                    source,
                    intent,
                    sessionsDir,
                    ...(sessionIdOpt !== undefined ? { sessionId: sessionIdOpt } : {}),
                });
                console.log(JSON.stringify({
                    status: "started",
                    session_id: result.session_id,
                    session_root: result.session_root,
                    current_state: result.state.current_state,
                    next_action: "Call `onto reconstruct explore --session-id <id>` to begin exploration.",
                }, null, 2));
                return 0;
            }
            catch (error) {
                console.error(`[onto] reconstruct start error: ${error instanceof Error ? error.message : String(error)}`);
                return 1;
            }
        }
        case "explore": {
            const sessionId = readOption(subArgv, "session-id");
            if (!sessionId) {
                console.error("[onto] reconstruct explore requires --session-id.");
                return 1;
            }
            try {
                const result = executeReconstructExplore({ sessionsDir, sessionId });
                console.log(JSON.stringify({ status: "explored", ...result }, null, 2));
                return 0;
            }
            catch (error) {
                console.error(`[onto] reconstruct explore error: ${error instanceof Error ? error.message : String(error)}`);
                return 1;
            }
        }
        case "complete": {
            const sessionId = readOption(subArgv, "session-id");
            if (!sessionId) {
                console.error("[onto] reconstruct complete requires --session-id.");
                return 1;
            }
            try {
                const result = executeReconstructComplete({ sessionsDir, sessionId });
                console.log(JSON.stringify({ status: "completed", ...result }, null, 2));
                return 0;
            }
            catch (error) {
                console.error(`[onto] reconstruct complete error: ${error instanceof Error ? error.message : String(error)}`);
                return 1;
            }
        }
        case "confirm": {
            const sessionId = readOption(subArgv, "session-id");
            const verdict = readOption(subArgv, "verdict");
            if (!sessionId || !verdict) {
                console.error("[onto] reconstruct confirm requires --session-id and --verdict (passed|rejected).");
                return 1;
            }
            if (verdict !== "passed" && verdict !== "rejected") {
                console.error(`[onto] Invalid verdict: "${verdict}". Must be "passed" or "rejected".`);
                return 1;
            }
            try {
                const result = executeReconstructConfirm({
                    sessionsDir,
                    sessionId,
                    verdict,
                });
                console.log(JSON.stringify({
                    status: "confirmed",
                    verdict: result.state.principal_review_status,
                    session_id: result.session_id,
                }, null, 2));
                return 0;
            }
            catch (error) {
                console.error(`[onto] reconstruct confirm error: ${error instanceof Error ? error.message : String(error)}`);
                return 1;
            }
        }
        case "--help":
        case "-h":
        case undefined:
            console.log([
                "Usage: onto reconstruct <subcommand> [options]",
                "",
                "Subcommands:",
                "  start <source> <intent>     Initialize a reconstruct session",
                "  explore --session-id <id>    Run one exploration invocation (bounded)",
                "  complete --session-id <id>   Finalize ontology draft + request Principal review",
                "  confirm --session-id <id> --verdict passed|rejected",
                "                               Record Principal verification result",
                "",
                "Options:",
                "  --project-root <path>        Project root (default: cwd)",
                "  --sessions-dir <path>         Sessions directory (default: <project-root>/.onto/reconstruct)",
                "  --session-id <id>            Custom session id (start only)",
                "",
                "Bounded path (review 3-step 대응):",
                "  start → explore (1+ times) → complete → confirm",
                "",
                "State is persisted at {session_root}/reconstruct-state.json.",
                "The process contract is .onto/processes/reconstruct.md (activity=reconstruct, process_name=build).",
            ].join("\n"));
            return 0;
        default:
            console.error(`[onto] Unknown reconstruct subcommand: ${subcommand}`);
            console.error("Run 'onto reconstruct --help' for usage.");
            return 1;
    }
}
