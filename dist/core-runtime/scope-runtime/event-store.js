import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
/**
 * Read all events from an ndjson file.
 * Returns an empty array if the file does not exist.
 */
export function readEvents(filePath) {
    if (!existsSync(filePath)) {
        return [];
    }
    const content = readFileSync(filePath, "utf-8").trimEnd();
    if (content === "") {
        return [];
    }
    return content.split("\n").map((line) => JSON.parse(line));
}
/**
 * Append a single event to the ndjson file.
 * Creates the file and parent directories if they don't exist.
 * Returns the event with revision set.
 */
export function appendEvent(filePath, event) {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    appendFileSync(filePath, JSON.stringify(event) + "\n", "utf-8");
    return event;
}
/**
 * Get the next revision number for a scope's event file.
 * Returns 1 if the file is empty or doesn't exist.
 */
export function nextRevision(filePath) {
    const events = readEvents(filePath);
    if (events.length === 0)
        return 1;
    return events[events.length - 1].revision + 1;
}
