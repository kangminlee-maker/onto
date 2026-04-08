/**
 * Shared helpers for ArtifactSpec implementations.
 *
 * Why: every spec parses/serializes JSON or YAML, performs the pre-v7 detection
 * (UF-COV-01), and validates schema_version. Centralizing the boilerplate keeps
 * each per-artifact spec to its structural validators only.
 */

import * as yaml from "yaml";
import {
  IncompatibleVersionError,
  type ArtifactFormat,
} from "../artifact-registry.js";

export function parseRaw(content: string, format: ArtifactFormat): unknown {
  if (format === "yaml") return yaml.parse(content);
  return JSON.parse(content);
}

export function serializeRaw(data: unknown, format: ArtifactFormat): string {
  if (format === "yaml") return yaml.stringify(data);
  return JSON.stringify(data, null, 2);
}

/**
 * Detect pre-v7 artifacts (no schema_version field) and reject with a clear
 * action message. UF-COV-01 v8.
 */
export function rejectPreV7<T extends { schema_version?: string }>(
  raw: unknown,
  kind: string,
  supportedVersions: readonly string[],
): T {
  if (typeof raw !== "object" || raw === null) {
    throw new IncompatibleVersionError(
      `${kind}: parsed content is not an object`,
    );
  }
  const obj = raw as { schema_version?: string };
  if (obj.schema_version === undefined) {
    throw new IncompatibleVersionError(
      `${kind}: pre-v7 artifact detected (no schema_version field). ` +
        `Phase 3 requires schema_version. Action: discard the legacy file ` +
        `and re-run the producing command to regenerate.`,
    );
  }
  if (!supportedVersions.includes(obj.schema_version)) {
    throw new IncompatibleVersionError(
      `${kind}: schema_version "${obj.schema_version}" not in supported set ` +
        `[${supportedVersions.join(", ")}]`,
    );
  }
  return obj as T;
}

export function checkString(
  obj: Record<string, unknown>,
  field: string,
  errors: string[],
): void {
  if (typeof obj[field] !== "string") {
    errors.push(`${field} must be a string`);
  }
}

export function checkOptionalString(
  obj: Record<string, unknown>,
  field: string,
  errors: string[],
): void {
  if (obj[field] !== undefined && typeof obj[field] !== "string") {
    errors.push(`${field} must be a string when present`);
  }
}

export function checkNumber(
  obj: Record<string, unknown>,
  field: string,
  errors: string[],
): void {
  if (typeof obj[field] !== "number") {
    errors.push(`${field} must be a number`);
  }
}

export function checkArray(
  obj: Record<string, unknown>,
  field: string,
  errors: string[],
): void {
  if (!Array.isArray(obj[field])) {
    errors.push(`${field} must be an array`);
  }
}

export function checkSchemaVersion(
  obj: Record<string, unknown>,
  expected: string,
  errors: string[],
): void {
  if (obj.schema_version !== expected) {
    errors.push(`schema_version must be "${expected}"`);
  }
}
