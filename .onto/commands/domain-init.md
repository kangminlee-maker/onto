<!-- canonical-mirror-of: step-4-integration §5 -->

# `onto domain init` CLI Contract

Phase 4 v1 의 manifest producer CLI. **Principal 이 authority 를 행사하는 mechanism** — manifest.yaml 의 producer 는 Principal 만, CLI 는 Principal 의 도구. Step 1 §6.1 Authority 분리 원칙 canonical.

## 1. CLI 의 위치 + scope

**위치**: `~/.onto/domains/{domain}/manifest.yaml` 생성 / 갱신.

**scope 내부**:
- `manifest.yaml` producer (Principal authority via CLI mechanism)
- 3 branch — init / `--migrate-existing` / `--regenerate`
- non-interactive `--config <path>` (CI 환경)

**scope 밖**:
- reconstruct runtime 의 manifest consumption (`.onto/processes/reconstruct.md` §Domain Selection / §Phase 0)
- domain pack content (`concepts.md`, `structure_spec.md`, `logic_rules.md`, `domain_scope.md`, ...) authoring — 별도
- `onto domain manifest-migrate` (v1.1 backlog) — manifest_schema_version 1.0 → 2.0

## 1.1 Product-locality exception (Step 4 §5.1.1)

`.onto/principles/product-locality-principle.md` canonical 의 **3 scope 구별**:

| scope | 대상 | 위치 | product-locality 적용 |
|---|---|---|---|
| domain pack content (방법론 지식) | `concepts.md` 등 | `~/.onto/domains/{domain}/` (shared reference) | **예외** — cross-product 공유 |
| domain pack manifest | `manifest.yaml` | `~/.onto/domains/{domain}/manifest.yaml` (paired) | **예외** — pack content 와 동일 scope |
| product-specific state | `wip.yml` / `raw.yml` / `session-log.yml` / `rationale-queue.yaml` / `phase3-snapshot.yml` | `{product}/.onto/builds/{session}/` | **원칙 적용** |

shared-reference 예외 의미: "product 별 재정의 금지" 가 아닌 "domain pack 은 cross-product 재사용 asset 이므로 shared 위치가 자연". product-local override (`{product}/.onto/domains/{domain}/`) 는 v1.1 backlog (`domain-resolve-order` canonical 동시 도입).

## 2. Usage — 3 branches

```bash
# 1. 신규 pack (interactive)
onto domain init <name>

# 2. Legacy pack migrate (interactive) — manifest.yaml 부재인 기존 pack
onto domain init --migrate-existing <name>

# 3. Existing pack regenerate (interactive 또는 non-interactive)
onto domain init --regenerate <name>
onto domain init --regenerate <name> --config <path-to-config.yaml>
```

`--v0-only` flag 는 `onto domain init` 이 아닌 **reconstruct CLI 의 flag** (Step 1 §5.5 canonical pointer).

## 3. Interactive flow canonical sequence

Step 4 §5.3 mirror:

1. **Scan** — `~/.onto/domains/{name}/` 의 모든 `*.md` 나열. 빈 디렉토리 → "Empty directory. Create canonical files first (concepts.md, structure_spec.md, logic_rules.md, domain_scope.md). Abort." exit code 비-0
2. **Classify** — 각 파일의 `required: true | false` Principal 선택 (default: 4 canonical = `required: true`, 그 외 = `required: false`)
3. **`quality_tier`** 선언 — `full | partial | minimal` (Principal 자기 판정)
4. **`upgrade_status`** (`completed | in_progress | not_started`) + **`notes`** (free-form text)
5. **`domain_manifest_version`** 입력 — §6 semver grammar (e.g. `"0.1.0"` 신규 default)
6. **CLI 자동 populate**: `last_updated` = current ISO 8601 UTC (§4 Unenforced soft, CLI auto-write)
7. **`version_hash` 계산** + `manifest.yaml` atomic write (§5 algorithm)

## 4. Manifest.yaml 3-category governed-subject taxonomy

Step 4 §5.4.2 single canonical. 모든 governed subject (manifest field + pack-content 실제 파일) 는 정확히 3 top-level category 중 하나.

| governed subject | category | guard mechanism (Enforced 만) |
|---|---|---|
| `domain_name` | **Runtime-managed** | pre-load gate `path ↔ domain_name` consistency (`manifest_identity_mismatch` halt). hash input 제외 |
| `manifest_schema_version` | **Runtime-managed** | pre-load required + supported_list check (§7). hash input 제외 |
| `version_hash` | **Runtime-managed** | pre-load required + §5 재계산 비교 |
| `recovery_from_malformed` | **Runtime-managed** (audit signal) | CLI write/clear (§8). raw.yml mirror seat: `meta.manifest_recovery_from_malformed`. pre-load gate 미검증 (audit-only) |
| `referenced_files[].path` | **Enforced** | pack-spec guard (§5 hash input) |
| `referenced_files[].{required, min_headings}` | **Enforced** | pack-spec guard (§5 hash input) |
| `quality_tier` | **Enforced** | pack-spec guard (§5 hash input). raw.yml `domain_quality_tier` 와 1:1 mirror |
| `referenced_files[].path` 의 실제 파일 content | **Enforced** | pack-content guard (§5 hash input 의 pack_files_map) |
| `domain_manifest_version` | **Enforced** | semver guard (§6 grammar parse + comparator). closure scope: §9 narrow (intentional v1 limitation) |
| `notes` | **Unenforced soft** | — (Principal freeform) |
| `upgrade_status` | **Unenforced soft** | — (Principal freeform) |
| `last_updated` | **Unenforced soft** | CLI 자동 populate (write 시점 ISO 8601 UTC) |

**3 category 경계 원칙**:
- **Runtime-managed**: CLI / runtime 이 관리, Principal 편집 대상 아님
- **Enforced**: `--regenerate` 가 canonical 편집 경로. guard mechanism 이 runtime 감지 범위 내 manual drift 차단 — row-level exception (예: `domain_manifest_version` 의 §9 narrow scope) 는 row guard column 이 canonical
- **Unenforced soft**: manual edit 허용, runtime guard 없음

**§5 hash input set** (Step 4 §5.5 canonical):
- pack-content: `referenced_files[].path` 에 등재된 각 파일 bytes
- pack-spec: `quality_tier` + 각 `referenced_files[]` 의 `{path, required, min_headings}`
- 제외: `domain_name` / `manifest_schema_version` / `domain_manifest_version` / `version_hash` / `recovery_from_malformed` / soft fields

## 5. `version_hash` algorithm

Step 4 §5.5 canonical:

```
canonical_yaml(obj) = js-yaml dump with {sortKeys: true, noRefs: true, lineWidth: -1}

for each path in manifest.referenced_files[].path (sorted lexicographically):
  if file exists at ~/.onto/domains/{name}/{path}:
    file_hash = sha256(file_bytes_as_hex)
  else:
    file_hash = "__missing__"  # required: false 인 경우 정상, required: true 는 halt

pack_files_map = {"{path}": file_hash for each classified path}

referenced_files_spec = [
  {path, required, min_headings} for each referenced_files entry, sorted by path
]

hash_input = canonical_yaml({
  quality_tier: manifest.quality_tier,
  referenced_files_spec: referenced_files_spec,
  referenced_files_snapshot: pack_files_map
})

version_hash = "sha256:" + hex(sha256(hash_input))
```

`hash_algorithm = "sha256"` 기록. `lineWidth: -1` 은 YAML line-wrapping 비활성화 (re-serialization drift 방지). 본 algorithm 은 reconstruct runtime 의 `domain_files_content_hash` (Step 3 §3.7.1) 와 **별도** — manifest-level (pack 전체) vs element-level provenance.

## 6. `domain_manifest_version` semver grammar + comparator

Step 4 §5.6.1 canonical.

**Grammar** (semver subset):
```
domain_manifest_version = MAJOR "." MINOR "." PATCH
MAJOR | MINOR | PATCH = 1+ digit, no leading zero except "0"
```

valid: `"0.1.0"`, `"1.2.15"`. invalid: `"0.3"`, `"v0.3.0"`, `"0.03.0"`. pre-release / build-metadata (`-alpha`, `+abc`) 는 v1 unsupported.

**Comparator** (lexicographic tuple compare):
```
compare(new, old):
  (new_major, new_minor, new_patch) = parse(new)
  (old_major, old_minor, old_patch) = parse(old)
  new > old (strictly) iff
    new_major > old_major
    OR (new_major == old_major AND new_minor > old_minor)
    OR (new_major == old_major AND new_minor == old_minor AND new_patch > old_patch)
  otherwise → NOT greater (error)
```

**Bump enforcement** (§3 + `--regenerate`):

| scenario | bump rule |
|---|---|
| `onto domain init <name>` (신규) | Principal 선언 (통상 `"0.1.0"`). 기존 부재 — comparator 건너뜀 |
| `onto domain init --migrate-existing <name>` | legacy. comparator 건너뜀 |
| `onto domain init --regenerate <name>` (interactive, manifest readable) | Principal 이 `compare(new, old) > 0` 만족 입력. 위반 시 `manifest_version_not_incremented` |
| `onto domain init --regenerate <name> --config <path>` (non-interactive) | config `domain_manifest_version` 비교, `> 0` 필수 |
| `--regenerate` (manifest malformed, §8 recovery path) | 기존 version 읽을 수 없음 — **comparator 생략** (intentional discontinuity, §8) |

## 7. `manifest_schema_version` compatibility

CLI 는 현재 runtime `supported_manifest_schema_versions` 중 **가장 최신 version** 을 `manifest.yaml` 에 write (`"1.0"` v1 단일). v1.1+ 새 schema 도입 시 옵션 선택 (v1.1 backlog: config file 승격).

reconstruct runtime pre-load gate:
```
supported_manifest_schema_versions = ["1.0"]    # runtime 내부 정의 (v1.1 backlog: config 승격)
manifest.manifest_schema_version not in supported_list → manifest_malformed halt
```

## 8. Malformed manifest recovery + audit signal

Step 4 §5.4.2 + §5.6.1 canonical.

**Detection** (pre-load gate, version_hash 계산 이전):
- YAML parse error
- Required field missing (`manifest_schema_version`, `domain_name`, `domain_manifest_version`, `referenced_files`, `quality_tier`, `version_hash`)
- `domain_manifest_version` semver grammar 불일치

→ `manifest_malformed` (parse/required) OR `manifest_version_format_invalid` (semver) halt.

**Recovery path**:
```
onto domain init --regenerate <name>
```
기존 `manifest.yaml` 을 backup (bytes-level rename, broken 이어도 안전) → §3 interactive flow 재실행. parse 의존 없음.

**`recovery_from_malformed` audit signal**:
- CLI 가 malformed recovery path 에서 `true` 로 write
- 다음 `--regenerate` 에서 정상 path 시 `false` 로 재write (1회성 audit, 누적 아님)
- raw.yml mirror seat: `meta.manifest_recovery_from_malformed` (Step 4 §4.1)

**Intentional discontinuity** (§9 narrow scope 와 align):
- malformed recovery 시 comparator 생략 → 새 `domain_manifest_version` 이 기존보다 낮을 수도 있음
- raw.yml consumer (govern / learn) 는 `recovery_from_malformed: true` 로 audit (semver monotonicity 보장 X)

## 9. `domain_manifest_version` manual-edit closure scope (intentional v1 limitation)

Step 4 §5.6.2 canonical. §4 taxonomy 의 Enforced → semver guard 는 다음 두 경우만 차단:

1. **Malformed semver**: pre-load gate → `manifest_malformed` halt
2. **Non-bump regenerate**: `--regenerate` 시 comparator → `manifest_version_not_incremented` halt

**Closure scope 밖** (intentional v1 limitation):
- "YAML-valid manual semver bump + unchanged pack content" — Principal 이 manifest.yaml 을 editor 로 열어 `domain_manifest_version` 만 bump → version_hash 불변 → runtime guard 감지 못 함

차단하려면 `domain_manifest_version` 을 §5 hash input 에 포함해야 하나, 이는 schema-only migration 문제 재도입 (UF-evolution-01 trade-off). v1 은 "`--regenerate` 를 경유한 정상 경로" 와 "Principal 이 audit 의식한 manual bump" 구별하지 않음 (audit 가 필요하면 `--regenerate` 사용 원칙 강조).

v1.1 backlog: `manifest.yaml` signature / provenance trail 도입 시 재검토.

## 10. `--config <path>` non-interactive schema

Step 4 §5.6 canonical.

```yaml
# ~/onto-domain-init.yaml 예시
name: software-engineering
domain_manifest_version: "0.4.0"       # required (semver grammar)
referenced_files:
  - path: concepts.md
    required: true
    min_headings: 3
  - path: structure_spec.md
    required: true
  - path: logic_rules.md
    required: true
  - path: domain_scope.md
    required: true
  - path: dependency_rules.md
    required: false
quality_tier: full
upgrade_status: completed
notes: "3차 업그레이드 완료 (237K)"
```

**non-interactive 실행**:
- `--config` path YAML parse
- 필수 field 전수 존재 확인: `name`, `domain_manifest_version`, `referenced_files`, `quality_tier`, `upgrade_status`
- 부재 또는 invalid → §11 failure code emit
- 모든 field populate 후 §5 version_hash 계산 + `manifest.yaml` atomic write

## 11. Failure code canonical map

Step 4 §5.6.3 single authority. 4 codes + origin × recovery path matrix.

| error code | trigger | primary section |
|---|---|---|
| `manifest_malformed` | YAML parse fail OR manifest required field 누락 | pre-load gate |
| `manifest_version_format_invalid` | `domain_manifest_version` semver grammar 불일치 | pre-load gate + §6 grammar parse |
| `manifest_version_not_incremented` | `--regenerate` comparator non-bump | §6 comparator |
| `config_schema_invalid` | `--config <path>` YAML 의 required field 누락 또는 type invalid | §10 non-interactive path |

**Operator recovery guidance** (origin 별):

| error code | origin | recovery path |
|---|---|---|
| `manifest_malformed` | any | `onto domain init --regenerate {domain}` (§8 bytes-level backup, broken parse 의존 없음 — universal fallback) |
| `manifest_version_format_invalid` | interactive `--regenerate` | `onto domain init --regenerate {domain}` 재실행, semver grammar 입력 |
| `manifest_version_format_invalid` | non-interactive `--regenerate --config <path>` | config file 의 `domain_manifest_version` semver grammar 수정 후 동일 명령 재실행 |
| `manifest_version_not_incremented` | interactive | 재실행, `compare(new, old) > 0` 만족 입력 |
| `manifest_version_not_incremented` | non-interactive `--config` | config file 의 version bump 수정 후 동일 명령 재실행 |
| `config_schema_invalid` | non-interactive 전용 | config file 의 누락/invalid field 수정 후 동일 `onto domain init --regenerate {domain} --config <path>` 재실행 |

## 12. References

- **Step 4 protocol §5** (canonical content): `development-records/evolve/20260424-phase4-stage3-step4-integration.md §5`
- **Step 1 §6** (Authority 분리 원칙 + manifest.yaml schema): `development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md §6`
- **product-locality principle**: `.onto/principles/product-locality-principle.md`
- **reconstruct runtime consumption**: `.onto/processes/reconstruct.md §Domain Selection / §Phase 0 / §Phase 4`
