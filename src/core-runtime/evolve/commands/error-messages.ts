/**
 * Gate-guard error wrapping — Principal-facing Korean messages.
 *
 * W-B-08 (BL-044): 기존 문자열 매칭 switch 를 authority/diagnostic-codes.yaml
 * 기반 code registry 로 전환. 매칭 우선순위는 registry entry 순서를 따른다.
 *
 * Registry seat: authority/diagnostic-codes.yaml (authority-adjacent data seat).
 * Concept SSOT 아님 — citation check 대상 아님.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse as yamlParse } from "yaml";

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
  // authority/diagnostic-codes.yaml — dist / src 양쪽에서 작동
  // src: src/core-runtime/evolve/commands/error-messages.ts
  // dist: dist/core-runtime/evolve/commands/error-messages.js
  // 양쪽 모두 4 단계 위가 repo root.
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "..", "..", "..", "..");
  return join(repoRoot, "authority", "diagnostic-codes.yaml");
}

function loadRegistry(): Registry {
  if (cachedRegistry !== null) return cachedRegistry;
  const raw = readFileSync(resolveRegistryPath(), "utf-8");
  const parsed = yamlParse(raw) as Registry;
  if (!parsed || !Array.isArray(parsed.diagnostic_codes)) {
    throw new Error("[diagnostic-codes] invalid registry — diagnostic_codes 배열 없음");
  }
  cachedRegistry = parsed;
  return parsed;
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
