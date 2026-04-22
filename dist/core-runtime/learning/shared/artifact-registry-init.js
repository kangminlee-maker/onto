/**
 * Built-in artifact spec registration — DD-20.
 *
 * Importing this module wires the registrar into REGISTRY. The registrar runs
 * lazily on first REGISTRY use. Other modules import this once at process
 * entry to ensure REGISTRY can resolve canonical kinds.
 *
 * Why a separate module:
 *   - Breaks the import cycle (registry needs init, init imports specs,
 *     specs need registry types).
 *   - Allows tests to swap in alternative spec sets via __resetForTest +
 *     manual register() calls without re-running this module.
 */
import { REGISTRY } from "./artifact-registry.js";
import { PromoteReportSpec } from "./specs/promote-report-spec.js";
import { AuditStateSpec } from "./specs/audit-state-spec.js";
import { EmergencyLogSpec } from "./specs/emergency-log-spec.js";
import { LayoutVersionSpec } from "./specs/layout-version-spec.js";
import { RestoreManifestSpec } from "./specs/restore-manifest-spec.js";
import { PruneLogSpec } from "./specs/prune-log-spec.js";
import { ApplyExecutionStateSpec } from "./specs/apply-execution-state-spec.js";
import { BackupMetadataSpec } from "./specs/backup-metadata-spec.js";
import { PromoteDecisionsSpec } from "./specs/promote-decisions-spec.js";
import { RecoveryResolutionSpec } from "./specs/recovery-resolution-spec.js";
REGISTRY.setBuiltinRegistrar(() => {
    REGISTRY.register(PromoteReportSpec);
    REGISTRY.register(AuditStateSpec);
    REGISTRY.register(EmergencyLogSpec);
    REGISTRY.register(LayoutVersionSpec);
    REGISTRY.register(RestoreManifestSpec);
    REGISTRY.register(PruneLogSpec);
    REGISTRY.register(ApplyExecutionStateSpec);
    REGISTRY.register(BackupMetadataSpec);
    REGISTRY.register(PromoteDecisionsSpec);
    REGISTRY.register(RecoveryResolutionSpec);
});
/**
 * Convenience for tests and explicit init paths. Idempotent: the registrar
 * itself is idempotent inside the registry.
 */
export function ensureRegistryReady() {
    // Touching REGISTRY.listRegistered() forces ensureInitialized() without
    // requiring a real artifact load.
    REGISTRY.listRegistered();
}
