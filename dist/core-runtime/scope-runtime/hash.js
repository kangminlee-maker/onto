import { createHash } from "node:crypto";
export function contentHash(data) {
    return createHash("sha256").update(data).digest("hex");
}
