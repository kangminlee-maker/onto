// runtime-mirror-of: step-4-integration §5.6.3
//
// `domain_manifest_version` 관련 4 canonical failure codes (W-A-98).
// Track B phase 3 의 13/13. PR-γ "integration" 의 마지막 commit.
//
// 4 canonical codes:
//   - manifest_malformed
//   - manifest_version_format_invalid
//   - manifest_version_not_incremented
//   - config_schema_invalid
//
// Each code × origin (interactive | non-interactive) → operator recovery
// guidance per §5.6.3 r13/r14 specific recovery path matrix.
//
// Other failure codes used elsewhere (manifest_identity_mismatch /
// manifest_version_hash_mismatch in W-A-99; raw_yml_meta_invariant_violation
// in W-A-94) are not covered here — those have ad-hoc messages in their
// emitting modules. §5.6.3 strictly defines the 4 above.

export type CanonicalFailureCode =
  | "manifest_malformed"
  | "manifest_version_format_invalid"
  | "manifest_version_not_incremented"
  | "config_schema_invalid";

export type FailureOrigin = "interactive" | "non_interactive";

export interface FailureCodeEntry {
  trigger: string; // primary trigger (§5.6.3 col)
  primarySection: string; // §5.6.3 primary section pointer
  exampleScenario: string;
  /**
   * Operator recovery guidance per origin (§5.6.3 r13/r14).
   * Each origin has a single, deterministic next-step instruction.
   */
  recovery: Record<FailureOrigin, string>;
}

export const CANONICAL_FAILURE_CODES: Record<
  CanonicalFailureCode,
  FailureCodeEntry
> = {
  manifest_malformed: {
    trigger:
      "YAML parse fail or required field missing (manifest_schema_version, domain_name, domain_manifest_version, referenced_files, quality_tier, version_hash)",
    primarySection: "§5.4.2 pre-load gate",
    exampleScenario:
      "Principal edited manifest.yaml, made a YAML syntax error or accidentally deleted a required field",
    recovery: {
      interactive:
        "Run `onto domain init --regenerate {domain}` — §5.4.2 bytes-level backup + fresh interactive flow. Universal fallback (does not depend on parsing the broken manifest).",
      non_interactive:
        "Run `onto domain init --regenerate {domain}` (interactive recovery is the canonical universal fallback for malformed manifests, including in CI environments where the previous --config flow would have written the malformed file).",
    },
  },
  manifest_version_format_invalid: {
    trigger:
      "domain_manifest_version value does not match §5.6.1 semver grammar (`0.3`, `v0.3.0`, `0.03.0`, etc.)",
    primarySection: "§5.6.1 grammar parse",
    exampleScenario:
      "Principal entered `domain_manifest_version: \"v0.3.0\"` in manifest.yaml or in --config YAML",
    recovery: {
      interactive:
        "Re-run `onto domain init --regenerate {domain}` and enter a value matching §5.6.1 semver grammar (MAJOR.MINOR.PATCH, no leading zeros, no v-prefix, no pre-release).",
      non_interactive:
        "Edit the config file (`--config <path>`) so `domain_manifest_version` matches §5.6.1 grammar, then re-run `onto domain init --regenerate {domain} --config <path>`.",
    },
  },
  manifest_version_not_incremented: {
    trigger:
      "On --regenerate, new domain_manifest_version is not strictly greater than the prior value (§5.6.1 comparator)",
    primarySection: "§5.4.1 regenerate flow + §5.6.1 comparator",
    exampleScenario: "0.3.0 → 0.3.0 (no bump) or 0.3.0 → 0.2.9 (downgrade)",
    recovery: {
      interactive:
        "Re-run `onto domain init --regenerate {domain}` and enter a version that is strictly greater than the prior value (e.g. 0.3.0 → 0.3.1 or 0.4.0).",
      non_interactive:
        "Edit the config file so `domain_manifest_version` is strictly greater than the prior value, then re-run `onto domain init --regenerate {domain} --config <path>`.",
    },
  },
  config_schema_invalid: {
    trigger:
      "--config YAML missing required field (name, domain_manifest_version, referenced_files, quality_tier, upgrade_status) or wrong type",
    primarySection: "§5.6 non-interactive path",
    exampleScenario:
      "CI wrote a --config YAML omitting the `domain_manifest_version` field",
    recovery: {
      interactive:
        "config_schema_invalid is non-interactive specific. Switch to `onto domain init --regenerate {domain}` (interactive) to re-author the manifest, OR fix the config and use the non-interactive recovery path below.",
      non_interactive:
        "Edit the config file (`--config <path>` YAML) so the missing/invalid field is corrected, then re-run the same `onto domain init --regenerate {domain} --config <path>` command. --regenerate is required (manifest cannot be re-created without it).",
    },
  },
};

/**
 * Lookup helper for runtime emit. Combines the trigger + origin-specific
 * recovery into a single operator-facing block.
 */
export function formatFailureMessage(
  code: CanonicalFailureCode,
  origin: FailureOrigin,
  context?: { domain?: string; configPath?: string },
): string {
  const entry = CANONICAL_FAILURE_CODES[code];
  let recovery = entry.recovery[origin];
  if (context?.domain) recovery = recovery.replace(/\{domain\}/g, context.domain);
  if (context?.configPath)
    recovery = recovery.replace(/<path>/g, context.configPath);
  return [
    `Error: ${code}`,
    `Trigger: ${entry.trigger}`,
    `Primary section: ${entry.primarySection}`,
    `Recovery: ${recovery}`,
  ].join("\n");
}

/** All canonical codes — useful for invariant test (W-A-98 emit list complete). */
export const ALL_CANONICAL_FAILURE_CODES: readonly CanonicalFailureCode[] = [
  "manifest_malformed",
  "manifest_version_format_invalid",
  "manifest_version_not_incremented",
  "config_schema_invalid",
];
