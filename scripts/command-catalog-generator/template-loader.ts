/**
 * Template loader — P1-2a placeholder.
 *
 * Design §7.2 defines a 2-layer authoring surface:
 *   command-catalog.ts        (declaration — human edited)
 *   command-catalog-templates/  (long-form markdown — human edited)
 *
 * P1-2a only prepares the directory-scan + by-id lookup primitives. Actual
 * `.md` template files are added in P1-2b together with the markdown derive
 * logic that consumes them. P1-2a keeps the directory empty (tracked via a
 * README so git retains it); `listAvailableTemplates` therefore returns an
 * empty list against a fresh checkout.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_FILE_SUFFIX = ".md.template";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");

export const DEFAULT_TEMPLATES_DIR = resolve(
  REPO_ROOT,
  "src/core-runtime/cli/command-catalog-templates",
);

export function listAvailableTemplates(
  templatesDir: string = DEFAULT_TEMPLATES_DIR,
): string[] {
  if (!existsSync(templatesDir)) return [];
  if (!statSync(templatesDir).isDirectory()) return [];
  const entries = readdirSync(templatesDir, { withFileTypes: true });
  const ids: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(TEMPLATE_FILE_SUFFIX)) continue;
    ids.push(entry.name.slice(0, -TEMPLATE_FILE_SUFFIX.length));
  }
  return ids.sort();
}

export function templatePath(
  docTemplateId: string,
  templatesDir: string = DEFAULT_TEMPLATES_DIR,
): string {
  return join(templatesDir, `${docTemplateId}${TEMPLATE_FILE_SUFFIX}`);
}

export function readTemplate(
  docTemplateId: string,
  templatesDir: string = DEFAULT_TEMPLATES_DIR,
): string | null {
  const path = templatePath(docTemplateId, templatesDir);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

/**
 * Load every template in the directory into `{docTemplateId → content}`.
 *
 * Keys are inserted in sorted order so iteration over the returned object
 * is deterministic — the markdown deriver relies on this for byte-identical
 * output across runs.
 */
export function loadAllTemplates(
  templatesDir: string = DEFAULT_TEMPLATES_DIR,
): Record<string, string> {
  const ids = listAvailableTemplates(templatesDir); // already sorted
  const out: Record<string, string> = {};
  for (const id of ids) {
    const content = readTemplate(id, templatesDir);
    if (content !== null) out[id] = content;
  }
  return out;
}
