import path from "node:path";
/**
 * Walk up from startDir, testing each directory with predicate.
 * Returns the first directory where predicate returns true, or null.
 */
export function walkUpFor(startDir, predicate) {
    let current = path.resolve(startDir);
    const root = path.parse(current).root;
    while (true) {
        if (predicate(current))
            return current;
        const parent = path.dirname(current);
        if (parent === current || current === root)
            return null;
        current = parent;
    }
}
