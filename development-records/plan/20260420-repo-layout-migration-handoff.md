---
as_of: 2026-04-20
status: active-handoff
functional_area: repo-layout-migration
purpose: |
  onto repo 의 top-level directories (authority/, design-principles/, processes/,
  roles/, commands/, domains/) 를 framework v1.0 정합 레이아웃 `{product}/.onto/`
  하위로 이관하는 8-phase migration 의 handoff. 다음 세션은 Phase 0 부터 착수.
authority_stance: non-authoritative-design-surface
canonicality: scaffolding
source_refs:
  origin_memory: "project_onto_repo_layout_migration.md"
  current_memory: "project_remaining_backlog_snapshot.md §E-2"
  framework: "development-records/evolve/20260419-knowledge-framework.md §12.7 storage derivation"
  lexicon: "authority/core-lexicon.yaml — execution_rules_ref 경로 참조"
---

# onto Repo Layout Migration — Handoff (2026-04-20)

다음 세션 즉시 실행 가능한 spec. `/clear` 후 한 줄 명령으로 Phase 0 착수.

## 1. 전체 8-phase 계획

| Phase | 내용 | 파일 이동 | Risk | 세션 |
|---|---|---|---|---|
| **0** | Infrastructure — path resolver indirection + dual-path fallback | **0** | 낮 | 세션 1 (다음) |
| 1 | `commands/` → `.onto/commands/` | 14 | 낮 | 세션 2 |
| 2 | `domains/` → `.onto/domains/` | 91 | 중 | 세션 2 |
| 3 | `roles/` → `.onto/roles/` | 10 | 중 | 세션 2 |
| 4 | `processes/` → `.onto/processes/` | 30 | 높 | 세션 3 |
| 5 | `design-principles/` → **`.onto/principles/`** (rename) | 8 | 높 | 세션 4 |
| 6 | `authority/` → `.onto/authority/` (installation marker 최종 이동) | 6 | 최고 | 세션 5 |
| 7 | Cleanup — fallback 제거 + CI lint 확장 | 0 | 낮 | 세션 6 |

## 2. 단계별 안정성 mechanism (3 layer)

1. **Path resolver indirection**: `resolveInstallationPath(kind)` 단일 seat. 소스 코드가 하드코딩 경로 대신 이 함수 호출. 해석 로직만 바뀌면 소스 무변경으로 이관 가능.
2. **Dual-path fallback (전환 기간)**: resolver 가 `.onto/X/` 존재 확인 후 legacy `X/` fallback. 어느 단계에서 멈춰도 main healthy.
3. **Directory-by-directory atomicity**: 각 phase 는 **한 디렉토리만** 이동. PR 단위 revert 가능.

## 3. Phase 0 상세 spec

### 3.1 목표

실제 파일 이동 0건. 모든 test 그대로 pass. 이후 phase 들의 indirection scaffolding 마련.

### 3.2 파일 변경

#### 신규: `src/core-runtime/discovery/installation-paths.ts`

```typescript
/**
 * Installation resource path resolver — dual-path migration support.
 *
 * Phase 0 of repo layout migration (2026-04-20). During the transition
 * from top-level directories (authority/, design-principles/, ...) to
 * `.onto/` layout, this module centralizes path resolution so consumers
 * don't hardcode either path shape.
 *
 * Resolution order:
 *   1. `{installRoot}/.onto/{kind}/` — if exists, return
 *   2. `{installRoot}/{kind}/` — legacy fallback
 *   3. Throw — neither location exists (installation corrupted)
 *
 * Phase 7 removes the legacy fallback.
 */
import fs from "node:fs";
import path from "node:path";

export type InstallationResourceKind =
  | "authority"
  | "design-principles"
  | "processes"
  | "roles"
  | "commands"
  | "domains";

const NEW_LAYOUT_ROOT = ".onto";

const cache = new Map<string, string>();

export function resolveInstallationPath(
  kind: InstallationResourceKind,
  installRoot: string,
): string {
  const cacheKey = `${installRoot}::${kind}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const newPath = path.join(installRoot, NEW_LAYOUT_ROOT, kind);
  if (fs.existsSync(newPath)) {
    cache.set(cacheKey, newPath);
    return newPath;
  }

  const legacyPath = path.join(installRoot, kind);
  if (fs.existsSync(legacyPath)) {
    cache.set(cacheKey, legacyPath);
    return legacyPath;
  }

  throw new Error(
    `[installation-paths] Neither .onto/${kind}/ nor ${kind}/ exists under ${installRoot}. ` +
      `Installation may be corrupted or the kind is unknown.`,
  );
}

/** Test helper — clears the cache so tests can swap fixture installations. */
export function __resetInstallationPathCacheForTesting(): void {
  cache.clear();
}
```

#### 신규 test: `src/core-runtime/discovery/installation-paths.test.ts`

4 cases:
1. `.onto/{kind}/` 존재 + legacy 부재 → `.onto/` path 반환
2. `.onto/` 부재 + legacy 존재 → legacy path 반환
3. 둘 다 존재 → `.onto/` 우선
4. 둘 다 부재 → Error throw

`tmp dir + fs.mkdirSync` 로 각 case fixture 구성.

#### 수정: `src/core-runtime/discovery/onto-home.ts`

현재 installation marker 탐지 로직:
```typescript
const pkgPath = path.join(dir, "package.json");
// existsSync check for authority/ and roles/ at top-level
```

Phase 0 변경: marker 탐지에 `.onto/authority/` + `.onto/roles/` 도 인식. 즉:

```typescript
function hasInstallationMarkers(dir: string): boolean {
  const pkgExists = fs.existsSync(path.join(dir, "package.json"));
  if (!pkgExists) return false;
  // Legacy: authority/ and roles/ at top-level
  const legacyAuthority = fs.existsSync(path.join(dir, "authority"));
  const legacyRoles = fs.existsSync(path.join(dir, "roles"));
  if (legacyAuthority && legacyRoles) return true;
  // New layout: .onto/authority/ and .onto/roles/
  const newAuthority = fs.existsSync(path.join(dir, ".onto", "authority"));
  const newRoles = fs.existsSync(path.join(dir, ".onto", "roles"));
  return newAuthority && newRoles;
}
```

(현 `isValidOntoHome` 또는 유사 함수 내부 로직 수정. 실제 함수명은 Phase 0 착수 시 `onto-home.ts` 확인)

#### 수정: 주요 consumer 치환 (조사 후 결정)

Phase 0 의 목적은 scaffolding. 모든 consumer 를 치환할 필요는 없지만, **설계 검증용 1-2 곳** 치환 권장:

- `src/core-runtime/cli/materialize-review-prompt-packets.ts` 의 roles/domains 경로 resolve 지점
- `src/core-runtime/readers/lexicon-citation-check.ts` 의 authority path

나머지 consumer 는 Phase 1-6 에서 각 dir 이동 시점에 자연 치환.

### 3.3 Validation gates (Phase 0 종료 조건)

모든 충족 시 PR merge 자격:

- [ ] `npx tsc -p tsconfig.json --noEmit` clean
- [ ] `npx vitest run src/core-runtime/discovery/installation-paths.test.ts` — 4/4 PASS
- [ ] `npx vitest run src/core-runtime/discovery` — 전체 discovery 모듈 회귀 0
- [ ] `npx vitest run src/core-runtime/readers/lexicon-citation-check.test.ts` — 7/7 PASS (치환 대상이면 반영)
- [ ] `npx vitest run` — 전체 test suite 회귀 0
- [ ] `npm run lint:output-language-boundary` — 422 files clean
- [ ] `onto --version` → `onto-core 0.2.1` (또는 bump)
- [ ] `onto info` → version + paths 정상
- [ ] grep sweep: 신규 `resolveInstallationPath` 호출이 최소 1 곳 이상
- [ ] 파일 실제 이동 0건 확인 (`git diff --stat` 에 `authority/`, `design-principles/` 등 이동 없음)

### 3.4 lexicon version

v0.21.0 → v0.22.0 (corrective, scaffolding 추가).

Changelog entry (authority/core-lexicon.yaml notes):
> "v0.22.0 corrective (repo layout migration Phase 0 — infrastructure, 2026-04-??): installation resource 경로 해석에 dual-path indirection 도입. `src/core-runtime/discovery/installation-paths.ts` seat 신설. Phase 1-7 은 후속. layout 변경 없음, scaffolding only."

### 3.5 PR 제목/내용 템플릿

```
feat(infrastructure): Phase 0 repo layout migration — path resolver scaffolding

## Summary
8-phase repo layout migration 의 Phase 0. 실제 파일 이동 0건. Phase 1-6 이 의존할 path resolver indirection 마련.

## 변경
- 신규 `src/core-runtime/discovery/installation-paths.ts` — `resolveInstallationPath(kind, installRoot)` + dual-path fallback
- 신규 test — 4 cases
- `onto-home.ts` marker 탐지에 `.onto/` 인식 추가
- 주요 consumer 1-2 곳 치환 (scaffolding 검증)

## Validation
- (checklist 위 §3.3)

## Context
- Handoff: development-records/plan/20260420-repo-layout-migration-handoff.md §3
- Origin memory: project_onto_repo_layout_migration.md
- Framework: §12.7 storage derivation
```

## 4. 다음 세션 즉시 착수 명령

`/clear` 직후 아래 한 줄만 입력:

```
repo layout migration Phase 0 착수. handoff: development-records/plan/20260420-repo-layout-migration-handoff.md §3
```

이 명령을 받으면 Claude 가:
1. Handoff §3 (Phase 0 상세 spec) 를 읽고
2. `src/core-runtime/discovery/installation-paths.ts` 신규 작성
3. Test 파일 작성 + run
4. `onto-home.ts` marker 수정
5. Consumer 1-2 곳 치환
6. Validation gates (§3.3) 전수 통과 확인
7. PR 생성 + merge

## 5. 경계 — 이번 세션 범위 밖

- 실제 디렉토리 이동 (Phase 1-6)
- `bin/onto` 설치 로직 전면 개편 (Phase 0 의 `hasInstallationMarkers` 확장 범위 내)
- `dist/` 빌드 시 `.onto/` 포함 여부 (Phase 6 에서 package.json `files` 필드 갱신 시점)
- CLAUDE.md authority 위계 표 경로 갱신 (Phase 1-6 각각에서 해당 행만 수정)

## 6. Rollback 전략

각 phase PR 은 squash merge → 단일 commit. 실패 시 revert 1 회로 완전 복원.

Phase 0 은 파일 이동 없이 scaffolding 만 추가하므로 revert risk 0. 후속 phase 에서 문제 발생 시 해당 phase PR 만 revert, Phase 0 는 main 에 남아 다음 시도 시 재활용.

## 7. 미결정 항목 (Phase 1+ 에서 판단)

Phase 0 에서는 결정 불필요. Phase 1-6 진입 시 개별 판단:

- `development-records/` 의 위치 — 이관 여부 (option C 에 미포함, 현재는 root 유지)
- `scopes/`, `golden/`, `explorers/` 등 기타 root dir — ephemeral 또는 설계 산물로 이관 제외
- `dist/` 빌드 시 `.onto/` 리소스 bundling 방식 — Phase 6 에서 설계
- 설치된 타 product 가 onto 를 consume 할 때 경로 해석 — Phase 6 에서 확정
