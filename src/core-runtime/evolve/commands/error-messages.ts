/**
 * Gate-guard error wrapping — Principal-facing Korean messages.
 *
 * W-B-08 (BL-044): 기존 문자열 매칭 switch 를 .onto/authority/diagnostic-codes.yaml
 * 기반 code registry 로 전환. 매칭 우선순위는 registry entry 순서를 따른다.
 *
 * Registry seat: .onto/authority/diagnostic-codes.yaml (authority-adjacent data seat).
 * Concept SSOT 아님 — citation check 대상 아님.
 *
 * 보증:
 * - Registry load 시 schema validation (code 유일성 + 최소 1 matcher + matcher 형식).
 *   violation 발견 시 load 실패 → fail-fast.
 * - lookupDiagnosticCode 미매칭 시 console.warn — silent fail 방지.
 *   (영문 reason 원문이 Principal 에 노출되는 UX 버그를 즉시 감지 가능.)
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse as yamlParse } from "yaml";
import { resolveInstallationPath } from "../../discovery/installation-paths.js";

// ─── Types ───

interface Matcher {
  includes?: string;
  includes_all?: string[];
}

export interface DiagnosticCode {
  code: string;
  matchers: Matcher[];
  message_ko?: string;
  passthrough?: boolean;
  category: string;
}

interface Registry {
  version: string;
  diagnostic_codes: DiagnosticCode[];
}

/** wrapGateError / lookupDiagnosticCode 의 공통 매칭 결과 */
export interface DiagnosticMatch {
  code: string;
  category: string;
  message: string;
  passthrough: boolean;
}

// ─── Registry load ───

let cachedRegistry: Registry | null = null;

function resolveRegistryPath(): string {
  // dist / src 양쪽에서 작동:
  //   src: src/core-runtime/evolve/commands/error-messages.ts
  //   dist: dist/core-runtime/evolve/commands/error-messages.js
  // 양쪽 모두 4 단계 위가 repo root. Authority dir 선택 (canonical
  // `.onto/authority/` 우선, legacy `authority/` fallback) 은 Phase 0
  // 공유 resolver 에 위임 — dual-path 지식이 단일 seat 에 존재.
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "..", "..", "..", "..");
  const authorityDir = resolveInstallationPath("authority", repoRoot);
  return join(authorityDir, "diagnostic-codes.yaml");
}

function loadRegistry(): Registry {
  if (cachedRegistry !== null) return cachedRegistry;
  const raw = readFileSync(resolveRegistryPath(), "utf-8");
  const parsed = yamlParse(raw) as Registry;
  if (!parsed || !Array.isArray(parsed.diagnostic_codes)) {
    throw new Error("[diagnostic-codes] invalid registry — diagnostic_codes 배열 없음");
  }
  validateRegistry(parsed);
  cachedRegistry = parsed;
  return parsed;
}

/**
 * Registry schema 검증 — code 유일성 + matcher 형식.
 * loadRegistry 내부에서 호출되며, 테스트 용도로도 export.
 */
export function validateRegistry(registry: Registry): void {
  const seenCodes = new Set<string>();
  for (const entry of registry.diagnostic_codes) {
    if (seenCodes.has(entry.code)) {
      throw new Error(
        `[diagnostic-codes] duplicate code "${entry.code}" — code는 registry 내에서 유일해야 합니다.`,
      );
    }
    seenCodes.add(entry.code);

    if (!Array.isArray(entry.matchers) || entry.matchers.length === 0) {
      throw new Error(
        `[diagnostic-codes] entry "${entry.code}" has no matchers — 최소 1개 matcher가 필요합니다.`,
      );
    }

    for (let i = 0; i < entry.matchers.length; i++) {
      const m = entry.matchers[i]!;
      const hasIncludes = typeof m.includes === "string" && m.includes.length > 0;
      const hasIncludesAll = Array.isArray(m.includes_all) && m.includes_all.length > 0;
      if (!hasIncludes && !hasIncludesAll) {
        throw new Error(
          `[diagnostic-codes] entry "${entry.code}" matcher[${i}] — includes 또는 includes_all 중 하나를 비어있지 않은 값으로 지정해야 합니다.`,
        );
      }
    }
  }
}

/** 테스트용 registry 초기화 */
export function __resetDiagnosticRegistryCache(): void {
  cachedRegistry = null;
}

/** 테스트용 registry 주입 */
export function __setDiagnosticRegistryForTesting(registry: Registry): void {
  cachedRegistry = registry;
}

// ─── Matching ───

function matcherMatches(m: Matcher, reason: string): boolean {
  if (m.includes !== undefined) {
    return reason.includes(m.includes);
  }
  if (Array.isArray(m.includes_all) && m.includes_all.length > 0) {
    return m.includes_all.every((s) => reason.includes(s));
  }
  return false;
}

function entryMatches(entry: DiagnosticCode, reason: string): boolean {
  return entry.matchers.some((m) => matcherMatches(m, reason));
}

/**
 * reason 문자열에 매칭되는 diagnostic entry 를 반환한다.
 * 매칭 없으면 null.
 */
export function lookupDiagnosticCode(reason: string): DiagnosticMatch | null {
  const registry = loadRegistry();
  for (const entry of registry.diagnostic_codes) {
    if (entryMatches(entry, reason)) {
      const message = entry.passthrough ? reason : (entry.message_ko ?? reason);
      return {
        code: entry.code,
        category: entry.category,
        message,
        passthrough: entry.passthrough === true,
      };
    }
  }
  // Silent failure 방지 — 매칭되지 않은 reason 은 영문 원문이 Principal 에 노출된다.
  // 개발자용 경고를 남겨 registry entry 누락 또는 reason 문구 drift 를 즉시 감지 가능하게.
  console.warn(
    `[diagnostic-codes] no matching entry for reason: "${reason}". Registry에 새 entry 추가 또는 기존 matcher 보강이 필요합니다.`,
  );
  return null;
}

/**
 * gate-guard English reason → Principal-facing 한국어 메시지 변환.
 * 매칭 없으면 reason 원문을 그대로 반환.
 */
export function wrapGateError(reason: string): string {
  const hit = lookupDiagnosticCode(reason);
  return hit ? hit.message : reason;
}

/** 등록된 모든 diagnostic code 의 snapshot (telemetry / 문서화용) */
export function listDiagnosticCodes(): DiagnosticCode[] {
  return [...loadRegistry().diagnostic_codes];
}
