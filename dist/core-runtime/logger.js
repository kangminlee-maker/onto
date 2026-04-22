// Default implementation using console
export const defaultLogger = {
    debug: (msg, ctx) => { },
    info: (msg, ctx) => console.info(`[sprint-kit] ${msg}`, ctx ?? ""),
    warn: (msg, ctx) => console.warn(`[sprint-kit] ${msg}`, ctx ?? ""),
    error: (msg, ctx) => console.error(`[sprint-kit] ${msg}`, ctx ?? ""),
};
// Silent logger for tests
export const silentLogger = {
    debug: () => { },
    info: () => { },
    warn: () => { },
    error: () => { },
};
// Module-level logger (can be replaced)
let currentLogger = defaultLogger;
export function setLogger(logger) {
    currentLogger = logger;
}
export function getLogger() {
    return currentLogger;
}
