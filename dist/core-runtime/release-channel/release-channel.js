import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
let cachedChannelInfoPromise;
let noticePrinted = false;
async function findPackageJsonPath(startDir) {
    let currentDir = startDir;
    while (true) {
        const candidatePath = path.join(currentDir, "package.json");
        try {
            await fs.access(candidatePath);
            return candidatePath;
        }
        catch {
            // Keep walking upward until package.json is found or fs root is reached.
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            return undefined;
        }
        currentDir = parentDir;
    }
}
async function loadReleaseChannelInfo() {
    const moduleDir = path.dirname(fileURLToPath(import.meta.url));
    const packageJsonPath = await findPackageJsonPath(moduleDir);
    if (!packageJsonPath) {
        return {
            channel: "stable",
            label: "onto",
        };
    }
    const packageJsonText = await fs.readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonText);
    const channel = packageJson.onto_release_channel === "beta" ? "beta" : "stable";
    const label = typeof packageJson.onto_release_label === "string" &&
        packageJson.onto_release_label.length > 0
        ? packageJson.onto_release_label
        : channel === "beta"
            ? "onto-harness"
            : "onto";
    return { channel, label };
}
export async function readOntoReleaseChannelInfo() {
    if (!cachedChannelInfoPromise) {
        cachedChannelInfoPromise = loadReleaseChannelInfo();
    }
    return cachedChannelInfoPromise;
}
/**
 * Read the installation's `package.json` version (onto-core semver).
 * Walks up from this module's directory — same strategy as release channel info.
 * Returns "unknown" if package.json cannot be located or parsed (non-fatal
 * fallback; callers log the string as-is).
 *
 * Cached once per process to avoid repeated fs reads on hot paths like `onto --version`.
 */
let cachedVersionPromise;
export async function readOntoVersion() {
    if (!cachedVersionPromise) {
        cachedVersionPromise = (async () => {
            const moduleDir = path.dirname(fileURLToPath(import.meta.url));
            const packageJsonPath = await findPackageJsonPath(moduleDir);
            if (!packageJsonPath)
                return "unknown";
            try {
                const text = await fs.readFile(packageJsonPath, "utf8");
                const pkg = JSON.parse(text);
                return typeof pkg.version === "string" && pkg.version.length > 0
                    ? pkg.version
                    : "unknown";
            }
            catch {
                return "unknown";
            }
        })();
    }
    return cachedVersionPromise;
}
export async function printOntoReleaseChannelNotice() {
    if (noticePrinted) {
        return;
    }
    const releaseChannelInfo = await readOntoReleaseChannelInfo();
    if (releaseChannelInfo.channel !== "beta") {
        return;
    }
    console.error(`[onto] ${releaseChannelInfo.label} 베타 채널 사용 중입니다. 안정화 채널은 main 입니다.`);
    noticePrinted = true;
}
