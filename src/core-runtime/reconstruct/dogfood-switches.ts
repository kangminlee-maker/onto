// runtime-mirror-of: step-4-integration §8.2 §8.3 + govern §14.6
//
// Reconstruct dogfood switches — SDK-like invariant 4점 보존.
//
// SCOPE (PR #232 r2 contract — helper layer, no production runtime effect yet):
//   본 module 은 Step 4 §8.3 의 3 switch 를 helper / loader / invariant
//   check 로 spec mirror 하는 *helper layer*. production Runtime Coordinator
//   가 본 module 을 호출해 `.onto/config.yml` 을 read + Hook 분기를 gate
//   하는 wire 는 **본 PR 에 포함되지 않음** — 별도 commit 필요.
//   현재 caller 는 e2e-smoke.test.ts (Cycle 1-9) 와 dogfood-switches.test.ts
//   만. 실제 reconstruct runtime 의 분기 동작은 wire commit 이전까지
//   본 switch 의 영향을 받지 않는다 (v1 mode 가 unconditional default).
//
// 3 switch (Step 4 §8.3):
//   - v1_inference                  Hook α/γ/δ 전체 enable/disable
//   - phase3_rationale_review       Hook γ (Step 2c review) 만 enable/disable
//   - write_intent_inference_to_raw_yml  raw.yml element-level intent_inference block 기록 여부
//
// 세 switch 가 모두 false 면 reconstruct runtime 은 v0 flow (rationale 없음)
// 와 동일한 wip.yml / raw.yml 을 produce — Step 4 §8.3.
//
// govern §14.6 invariant 4점:
//   1. dogfood off 가능       — switch 로 v0 fallback
//   2. 들어내기 용이          — switch + reconstruct/ 디렉토리 삭제로 v0 복귀
//   3. govern reader 친화     — manifest.yaml + raw.yml.meta atomic write 보존
//   4. 본질 sink ≠ dogfood sink — wip 본질 / raw mirror 분리 (W-A-100)
//
// 본 module 의 dependency invariant (§8.3 의 inter-switch consistency):
//   - phase3_rationale_review.enabled == true 이면 v1_inference.enabled 도 true 필요
//     (Hook γ 는 v1 mode 안에서만 동작)
//   - write_intent_inference_to_raw_yml.enabled == true 이면 v1_inference.enabled 도 true 필요
//     (raw.yml 에 기록할 intent_inference block 이 있으려면 v1 mode 필요)

export interface ReconstructDogfoodSwitches {
  v1_inference: { enabled: boolean };
  phase3_rationale_review: { enabled: boolean };
  write_intent_inference_to_raw_yml: { enabled: boolean };
}

export const RECONSTRUCT_DOGFOOD_DEFAULTS: Readonly<ReconstructDogfoodSwitches> =
  Object.freeze({
    v1_inference: Object.freeze({ enabled: true }),
    phase3_rationale_review: Object.freeze({ enabled: true }),
    write_intent_inference_to_raw_yml: Object.freeze({ enabled: true }),
  });

export type SwitchInvariantViolation =
  | "phase3_rationale_review_requires_v1_inference"
  | "write_intent_inference_to_raw_yml_requires_v1_inference";

export interface SwitchInvariantOk {
  ok: true;
}

export interface SwitchInvariantFailed {
  ok: false;
  violations: SwitchInvariantViolation[];
}

export type SwitchInvariantResult = SwitchInvariantOk | SwitchInvariantFailed;

/**
 * Load dogfood switches from raw `.onto/config.yml` `reconstruct:` block.
 *
 * Behavior contract (review fix-up — logic lens consensus):
 *   - Missing fields (entire block, individual switch entry, or `enabled` sub-key)
 *     fall back to RECONSTRUCT_DOGFOOD_DEFAULTS (v1 mode ON).
 *   - Provided values must be the exact expected shape:
 *       root: object (not array, not scalar) — non-object root throws TypeError.
 *       switch entry: object containing optional `enabled` boolean.
 *       `enabled`: boolean — non-boolean values throw TypeError (NO implicit
 *       coercion). Callers feeding raw YAML must validate the boolean shape
 *       upstream or accept the throw as a config shape error.
 *
 * Wrapper shape rationale (review fix-up — conciseness lens):
 *   - Each switch is `{ enabled: boolean }` rather than plain `boolean` to
 *     reserve the same object as a future-extensible seat for v1.1+ per-switch
 *     metadata (e.g. `allowed_overrides`, `requires_confirmation`, `audit_log_seat`).
 *     Reducing to plain boolean would require a schema break on first such
 *     extension; the wrapper is intentional SDK forward-compat.
 *
 * Silent-default semantic (review fix-up — evolution lens):
 *   - Absent `reconstruct:` config block defaults to v1 mode ON (this loader's
 *     primary fall-through path). v0 products that must avoid v1 should declare
 *     the v0 fallback block explicitly in `.onto/config.yml` rather than rely
 *     on absence. A v1.1 backlog item (`reconstruct.config_required: bool`)
 *     can flip absence to fail-explicit when the migration window closes.
 */
export function loadReconstructDogfoodSwitches(
  raw: unknown,
): ReconstructDogfoodSwitches {
  if (raw === undefined || raw === null) {
    return cloneDefaults();
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError(
      `reconstruct config block must be an object, got ${typeof raw}`,
    );
  }
  const obj = raw as Record<string, unknown>;
  return {
    v1_inference: readSwitch(obj, "v1_inference"),
    phase3_rationale_review: readSwitch(obj, "phase3_rationale_review"),
    write_intent_inference_to_raw_yml: readSwitch(
      obj,
      "write_intent_inference_to_raw_yml",
    ),
  };
}

/**
 * Check inter-switch dependency invariants (§8.3 inter-switch consistency).
 *
 * Returns `{ ok: true }` when all dependencies are coherent. Returns
 * `{ ok: false, violations }` when any sub-switch is enabled while its prerequisite
 * `v1_inference` is disabled.
 */
export function checkSwitchInvariants(
  switches: ReconstructDogfoodSwitches,
): SwitchInvariantResult {
  const violations: SwitchInvariantViolation[] = [];
  const v1Off = !switches.v1_inference.enabled;
  if (v1Off && switches.phase3_rationale_review.enabled) {
    violations.push("phase3_rationale_review_requires_v1_inference");
  }
  if (v1Off && switches.write_intent_inference_to_raw_yml.enabled) {
    violations.push("write_intent_inference_to_raw_yml_requires_v1_inference");
  }
  if (violations.length === 0) {
    return { ok: true };
  }
  return { ok: false, violations };
}

/**
 * Convenience: true iff v1 mode is fully ON (all 3 switches enabled).
 *
 * `inference_mode` resolution at runtime additionally consumes Step 1 §4.7
 * fail-close path; this helper only reflects switch state.
 */
export function isV1ModeFullyOn(switches: ReconstructDogfoodSwitches): boolean {
  return (
    switches.v1_inference.enabled &&
    switches.phase3_rationale_review.enabled &&
    switches.write_intent_inference_to_raw_yml.enabled
  );
}

/**
 * Convenience: true iff all switches are OFF (full v0 fallback).
 */
export function isV0FallbackMode(
  switches: ReconstructDogfoodSwitches,
): boolean {
  return (
    !switches.v1_inference.enabled &&
    !switches.phase3_rationale_review.enabled &&
    !switches.write_intent_inference_to_raw_yml.enabled
  );
}

function cloneDefaults(): ReconstructDogfoodSwitches {
  return {
    v1_inference: { enabled: RECONSTRUCT_DOGFOOD_DEFAULTS.v1_inference.enabled },
    phase3_rationale_review: {
      enabled: RECONSTRUCT_DOGFOOD_DEFAULTS.phase3_rationale_review.enabled,
    },
    write_intent_inference_to_raw_yml: {
      enabled:
        RECONSTRUCT_DOGFOOD_DEFAULTS.write_intent_inference_to_raw_yml.enabled,
    },
  };
}

function readSwitch(
  obj: Record<string, unknown>,
  key: keyof ReconstructDogfoodSwitches,
): { enabled: boolean } {
  const value = obj[key];
  if (value === undefined || value === null) {
    return { enabled: RECONSTRUCT_DOGFOOD_DEFAULTS[key].enabled };
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(
      `reconstruct.${String(key)} must be an object with \`enabled\` field, got ${typeof value}`,
    );
  }
  const enabled = (value as { enabled?: unknown }).enabled;
  if (enabled === undefined || enabled === null) {
    return { enabled: RECONSTRUCT_DOGFOOD_DEFAULTS[key].enabled };
  }
  if (typeof enabled !== "boolean") {
    throw new TypeError(
      `reconstruct.${String(key)}.enabled must be a boolean, got ${typeof enabled}`,
    );
  }
  return { enabled };
}
