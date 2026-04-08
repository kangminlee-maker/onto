# Current Work Handoff

> 상태: Active
> 목적: 다음 `LLM`이 이 문서 하나를 읽고 현재 작업 상태를 이해한 뒤 바로 다음 작업을 이어갈 수 있게 한다.
> 작업 위치: `/Users/kangmin/cowork/onto`
> 현재 브랜치: `onto-harness`

---

## 1. 먼저 읽을 것

이 문서를 읽은 뒤 아래 순서로 읽는다.

1. `CLAUDE.md`
2. `AGENTS.md`
3. `authority/ontology-as-code-guideline.md`
4. `authority/llm-native-development-guideline.md`
5. `authority/llm-runtime-interface-principles.md`
6. `commands/review.md`
7. `processes/review/productized-live-path.md`
8. `processes/review/nested-spawn-coordinator-contract.md`

중요:

- 설치된 plugin/skill copy보다 이 레포의 문서와 코드가 authority다.
- 특히 `commands/review.md`와 `package.json`이 현재 repo-local canonical execution truth다.
- `CLAUDE.md`가 개발 원칙 문서 2개를 참조한다. 항상 확인한다.

---

## 2. 현재 상태 요약

### 2.1 달성된 것

- `review:invoke` canonical entrypoint가 작동한다.
- **글로벌 CLI** `onto review <target> <intent>` — 어디서든 실행 가능 (2026-04-06).
- `onto info` — resolved onto home, project root 표시.
- **Nested Spawn Coordinator**: `onto review --prepare-only` → Agent tool dispatch → `onto review --complete-session`. Codex/Claude CLI 없이 구독 내 작동.
- **`--prepare-only` 플래그**: 전처리 + 세션 준비까지만 수행. `PrepareOnlyResult` interface.
- **Role/Domain 해석 정책**: core roles는 ontoHome only (project override 금지). custom roles는 projectRoot → ontoHome fallback. terminal failure = error.
- **Config 적용 순서 체인**: 내장 기본값 → ontoHome config → projectRoot config → CLI 플래그 (last-wins: 나중에 적용되는 것이 이전 것을 덮어씀). 배열: replace, excluded_names: union.
- **Discovery 모듈**: `src/core-runtime/discovery/` — onto-home.ts, project-root.ts, config-chain.ts.
- **Executor 직접 경로 해석**: `npm run` 대신 `{ontoHome}/dist/` 또는 `{ontoHome}/src/` + tsx. `ONTO_HOME` env를 spawned executor에 전파.
- directory listing 필터 (62K → 348줄), embed truncation (300줄), kind `directory_listing` 통일.
- executor 5종: mock, subagent, agent-teams, codex, api (anthropic/openai).
- `--diff-range` git diff target 지원. Agent tool 경로 E2E 성공.
- synthesize packet에 Required Output Sections + Tagging Completeness Rule.
- Individual Lens Findings 참조가 final-output.md에 포함.
- **Coordinator State Machine (DeterministicStateEnforcer)**: `onto coordinator start` → `next` → `next` 패턴. 9개 state, 12 간선. auto state 전이는 완료 후 기록 (크래시 안전).
- E2E 테스트 **49건 ALL PASS**.
- **Codex CLI 재활성화됨** (v0.118.0). `subagent + codex` 경로 사용 가능.

### 2.2 작동하는 실행 경로

| 환경 | 방법 | 비용 | 상태 |
|---|---|---|---|
| Claude Code 세션 (state machine) | `onto coordinator start` → Agent dispatch → `onto coordinator next` × 2 | 구독 | **작동 (권장)** |
| Claude Code 세션 (기존) | `onto review --prepare-only` → Agent tool dispatch → `onto review --complete-session` | 구독 | **작동 (하위 호환)** |
| Claude Code 세션 (diff) | 위와 동일 + `--diff-range` | 구독 | **작동** |
| CLI (codex executor) | `onto review <target> <intent> --codex` | Codex 할당량 | **작동 (재활성화됨)** |
| 글로벌 CLI (어디서든) | `onto review <target> <intent> --executor-realization mock` | 무료 | **작동** |
| 글로벌 CLI (어디서든) | `onto review <target> <intent> --executor-realization api` | API 과금 | **작동** |
| repo-local CLI | `npm run review:invoke -- ...` | executor별 | **작동 (하위 호환)** |

### 2.3 작동하지 않는 것 / 제한

- **Claude CLI subprocess 경로 차단**: `--claude` 플래그 (subagent/agent-teams + claude CLI subprocess). 인증 버그 `anthropics/claude-code#8938` 미해결 + 복구 계획 없음. Agent Teams/Agent tool 경로는 정상 작동.
- **Platform scope**: macOS, Linux만 지원. Windows는 별도 설계.

### 2.4 실행 경로 복구 계획

| 차단된 경로 | 차단 원인 | 복구 조건 | 복구 행동 |
|---|---|---|---|
| api + anthropic | API 키 + 과금 필요 | `ANTHROPIC_API_KEY` 설정 | `--executor-realization api` E2E 검증 |

**참고**: Claude CLI subprocess 경로(`--claude`)는 복구 계획에서 제외. Agent Teams + Agent tool이 동일 기능을 구독 내에서 제공하므로 Claude CLI subprocess 경로의 실질적 가치가 없음.

---

## 3. 다음 작업

### 3.1 완료: Coordinator State Machine 구현

설계 v3 기반 구현 완료. E2E 49/49 ALL PASS.

| 파일 | 변경 |
|---|---|
| `src/core-runtime/cli/coordinator-state-machine.ts` | **신규**. 상태 전이 + auto state 실행 + dispatch 지시 생성 |
| `src/core-runtime/review/artifact-types.ts` | CoordinatorStateName, CoordinatorStateFile, CoordinatorStateTransition, CoordinatorAgentInstruction, CoordinatorStartResult, CoordinatorNextResult, ALLOWED_TRANSITIONS |
| `src/cli.ts` | `coordinator start`, `coordinator next`, `coordinator status` 서브커맨드 |
| `package.json` | coordinator:start/next/status 스크립트 추가 |
| `commands/review.md` | state machine 기반 coordinator 패턴으로 갱신 |
| `processes/review/nested-spawn-coordinator-contract.md` | state machine 기반 재서술 (7-phase → state machine) |
| `authority/core-lexicon.yaml` | DeterministicStateEnforcer, auto_state, await_state, terminal_state 등록 |
| E2E 테스트 | E45~E49: coordinator start/status/next-halt/next-terminal/full-cycle |

실행 패턴: `onto coordinator start <target> <intent>` → lens Agent dispatch → `onto coordinator next` → synthesize Agent dispatch → `onto coordinator next` → presentation

### 3.2 완료: Learn Phase 1 + 1.5 구현

커밋: `56e52b5` (구현), `f814d05` (Eval 버그 수정 5건)

**Phase 1 (C-1~C-4, C-6, C-6b, C-7)**: 기존 학습을 prompt packet에 자동 삽입
**Phase 1.5 (C-3c, C-5a, C-5b)**: 타도메인 규칙 포함 + tier 정렬 + 토큰 예산

| 파일 | 역할 |
|---|---|
| `src/core-runtime/learning/loader.ts` | 학습 로딩 파이프라인 전체 |
| `src/core-runtime/cli/materialize-review-prompt-packets.ts` | prompt packet 삽입 + manifest 기록 |
| `authority/core-lexicon.yaml` | 4개 용어 등록 |
| `.onto/temp/phase-1.5-design-draft.md` | Phase 1.5 설계 (2회 9-lens 리뷰) |
| `.onto/temp/learn-implementation-design-v4.md` | 전체 설계 v4 (5회 9-lens 리뷰) |

**Eval 결과**: CTRL vs EXP 비교 3/3 PASS (발견 수 +43%, Applied Learnings 명시 보고, 타도메인 기여 확인)

**환경변수**: `ONTO_LEARNING_LOAD_DISABLED=1` (전체 비활성), `ONTO_LEARNING_TIER_DISABLED=1` (Phase 1 fallback), `ONTO_LEARNING_CROSS_DOMAIN_DISABLED=1` (C-3c 비활성)

**주의**: `./bin/onto`는 `dist/` 우선 사용. 코드 변경 후 `npx tsc --outDir dist` 필수.

### 3.3 완료: Learn Phase 2 설계 (5회 9-lens 리뷰)

설계 문서: `/Users/kangmin/.claude-1/plans/logical-snuggling-parrot.md` (v4, R5 반영)

**리뷰 이력**:
- R1 (v1, 20260407-d724d7da): 13건 지적 → 전면 재설계
- R2 (v2, 20260407-acce5778): 6건 잔여
- R3 (v3, 20260407-3e8c4f9f): consensus 해소
- R4 (v3, 20260407-a7fb71c8): blocker 2건 + enhancement 5건
- R5 (v4, 20260407-be89dd41): IA-1 해소, IA-2 구현 시 해소

**최종 판정**: shadow-first 조건부 GO. blocker 0건 (구현 시 자연 해소).

### 3.4 완료: Learn Phase 2 구현 + 9-lens 리뷰 + Shadow Eval + Active 전환

커밋: `5bc854e` (구현 14파일), `5381531` (9-lens 리뷰 반영 13건), `c29b4c7` (onto_ rename), `be673b6` (multi-provider LLM)

**구현 범위**: A-7~A-14 DAG 오케스트레이터, C-11 피드백 마커, §1.6/§1.7 프롬프트 주입, coordinator Step 2.5 통합

| 파일 | 역할 |
|---|---|
| `src/core-runtime/learning/shared/mode.ts` | ExtractMode enum + validator |
| `src/core-runtime/learning/shared/patterns.ts` | regex 상수 (검증 + 소비 + LLM 출력) |
| `src/core-runtime/learning/shared/paths.ts` | 경로 리졸버 (읽기 + 쓰기 + dual-read) |
| `src/core-runtime/learning/shared/llm-caller.ts` | Multi-provider LLM 호출 (Anthropic/OpenAI/Codex) |
| `src/core-runtime/learning/shared/duplicate-check.ts` | A-10 content-level dedup |
| `src/core-runtime/learning/shared/semantic-classifier.ts` | A-11 의미 분류 (SEMANTIC_DECISIONS SSOT) |
| `src/core-runtime/learning/extractor.ts` | A-7~A-14 오케스트레이터 (~430줄) |
| `src/core-runtime/learning/feedback.ts` | C-11 이벤트 마커 파싱/매칭/부착 |
| `src/core-runtime/learning/prompt-sections.ts` | §1.6 Newly Learned + §1.7 Event Markers |
| `src/core-runtime/review/artifact-types.ts` | ExtractionManifest + discriminated union traces |

**9-lens 리뷰**: 세션 `20260407-e1ccffa5` (Codex, 9/9, 0 degraded). IAR 3건 + CONS 5건 + REC 10건 반영.

**E2E**: 48/49 PASS (E2 session-id-collision은 기존 이슈).

**Shadow Eval**: 10/10 세션, real lens 분류 성공률 91%, quarantine 0, error 0.

**Active 전환 검증**: 세션 `20260408-c1d8837b`, 2건 저장, learning_id + taxonomy_version 부착 확인.

**환경변수**:
- `ONTO_LEARNING_EXTRACT_MODE=active` — 학습 자동 추출 활성화
- `ANTHROPIC_API_KEY` — A-11 의미 분류 LLM 호출 (또는 `OPENAI_API_KEY`, Codex auth fallback)

**A-12r/A-12rej**: R1-U1에 의해 Phase 3으로 의도적 이연. 현재는 manifest ConflictProposal에만 기록.

### 3.5 완료: Learn Phase 3 상세 설계 (v9 final, 7회 리뷰)

**상태**: v2~v9까지 7회 9-lens self-review 완료. v9가 구현 진입 직전 final 설계.

**최종 설계 문서**: `.onto/temp/learn-phase3-design-v9.md`

**리뷰 이력**:
- v2 review (`20260408-fc04862e`): CONS 7 + CC 2 + D 2 + UF 7
- v3 review (`20260408-27a9deea`): CONS 4 + CC 1 + D 2 + UF 7 + AP 2
- v4 review (`20260408-0c777e97`): CONS 2 + CC 3 + D 1 + UF 8 + AP 1
- v5 review (`20260408-41e69b1c`): CONS 4 + CC 2 + D 2 + UF 6 + AP 1
- v6 review (`20260408-295e0b51`): CONS 5 + CC 1 + D 1 + UF 2 + AP 1
- v7 review (`20260408-42f47528`): CONS 4 + CC 1 + D 2 + UF 5 + AP 1
- v8 review (`20260408-ee929b92`): CONS 3 + CC 1 + D 1 + UF 4 + AP 1
- 진화적 관점 longitudinal 분석 (v2~v6 evolution.md): DD-20/21/22 도출

**핵심 설계 결정 (DD-1 ~ DD-23)**:
- **DD-1**: 2-Phase CLI + strict source-read-only Phase A
- **DD-7**: Panel canonical 타입 + array validator (criteria 1~5)
- **DD-8**: `.layout-version.yaml` + runtime gate
- **DD-15**: Phase B atomicity + `apply_verification_failed` + `state_persistence_failed` 분리
- **DD-16**: Recoverability checkpoint + protected backup + restore-manifest
- **DD-17**: AuditObligation ledger (status + carry-forward, expired_unattended ingress 포함)
- **DD-18**: CollectionResult canonical seats (project_items / global_items / candidate_items 분리)
- **DD-19**: P-14 lineage + DomainDoc slot_id/instance_id 분리
- **DD-20**: Artifact Registry (lazy init + write enforcement + pre-v7 reject)
- **DD-21**: AuditObligation 캡슐화 (TypeScript private field + construction invariants)
- **DD-22**: RecoveryContext single consumer (canonical attempt selection + freshness)
- **DD-23**: Recovery Resolution Artifact (`recovery-resolution.yaml` — operator decision seat)

**Phase 3 runtime 가정 (§12.7)**: short-lived CLI process. daemon/server는 범위 밖.

### 3.6 진행 중: Learn Phase 3 구현 (Step 1~6 완료, Step 7~13 남음)

**현재 상태**: shared infrastructure 구현 완료. 모든 단계에서 `npx tsc --noEmit` 통과.
다음 세션 진입점은 **Step 7: Collector**.

**Spec 문서**: `.onto/temp/learn-phase3-design-v9.md` (final, 7회 리뷰)

**구현 진입 전 읽을 파일** (필수):
1. `CLAUDE.md`, `AGENTS.md`
2. `authority/llm-native-development-guideline.md` (3-질문 프레임)
3. `authority/ontology-as-code-guideline.md`
4. **`.onto/temp/learn-phase3-design-v9.md` — final 설계**
5. **`.onto/temp/learn-phase3-design-v8.md`, `v7.md`, `v6.md` — DD-1~DD-22 본체 정의 (v9는 delta만 명시)**
6. `src/core-runtime/learning/extractor.ts` — Phase 2 패턴
7. `src/core-runtime/learning/shared/semantic-classifier.ts` — P-4 재사용
8. `src/core-runtime/learning/shared/duplicate-check.ts` — P-3 재사용
9. `processes/promote.md` — 기존 프로세스 (코드 기반으로 갱신할 대상)
10. `learning-rules.md` — 학습 저장/소비/승인 규칙

#### 완료된 단계 (1~6) — shared infrastructure

| Step | 파일 | DD | 검증 |
|---|---|---|---|
| **1. Types + Kernel** | `shared/audit-obligation-kernel.ts`, `promote/types.ts` | DD-21 dependency layering | tsc PASS |
| **2. Artifact Registry + 9 Specs** | `shared/artifact-registry.ts`, `shared/artifact-registry-init.ts`, `shared/specs/{promote-report,audit-state,emergency-log,layout-version,restore-manifest,prune-log,apply-execution-state,backup-metadata,promote-decisions,recovery-resolution}-spec.ts` + `spec-helpers.ts` | DD-20 (lazy init, write enforcement, pre-v7 reject, schema_version reject) | tsc PASS |
| **3. AuditObligation class** | `promote/audit-obligation.ts` | DD-21 (private fields, construction invariants, fromJSON 검증) | tsc PASS |
| **4. Audit State ledger** | `shared/audit-state.ts` | DD-17 (carry-forward, expired_unattended ingress 포함) | tsc PASS |
| **5. Recoverability** | `shared/recoverability.ts` | DD-16 (CheckpointPreparationResult transient + RecoverabilityCheckpoint persisted + restore-manifest + protection + prune) | tsc PASS |
| **6. Recovery Context + DD-23** | `shared/recovery-context.ts` (+ `shared/specs/recovery-resolution-spec.ts`는 Step 2에서 함께 등록 완료) | DD-22 (canonical attempt selection, source_kind enum 통일) + DD-23 (RecoveryResolution 영속화 + 재load) | tsc PASS |

**Step 1~6 핵심 결정 사항** (다음 세션에서 회귀 방지를 위해 기억):
- `REGISTRY.appendToFile()`이 emergency-log/prune-log JSONL을 위해 추가됨 (saveToFile과 별개)
- `BACKUP_ROOT = ~/.onto/backups`, `EMERGENCY_LOG_PATH = ~/.onto/emergency-log.jsonl`
- `RecoverySourceKind = "apply_state" | "emergency_log" | "checkpoint_manifest"` (artifact-family axis, v9 SYN-UF-SEM-01)
- `manual_escalation_required` 시 기존 RecoveryResolution 우선 read (DD-23)
- `AuditObligation.transition()`이 from을 mutation 전에 capture (v5 SYN-CONS-01 회귀 방지)
- `LEGAL_TRANSITIONS`에 `pending → expired_unattended`, `blocked → expired_unattended` 포함 (v6 회귀 방지)

#### 남은 단계 (7~13) — business logic + integration

7. **Collector** — `promote/collector.ts`
   - `learning-rules.md`, `processes/promote.md` Step 1~2 기반
   - `ParsedLearningItem` 파싱 (TAG_PATTERN/SOURCE_PATTERN/CONTENT_CAPTURE 재사용)
   - `BaselineHash` 캡처 (DD-10)
   - `CollectionResult` (DD-18 SST: project_items / global_items / candidate_items 분리)
   - mode별 candidate_items 정의: promote = `project_items.filter(role!=="insight")`, reclassify-insights = `global_items.filter(role==="insight")`
8. **Panel Reviewer + Judgment Auditor** — `promote/panel-reviewer.ts`, `promote/judgment-auditor.ts`
   - DD-2: 3-agent panel API 기반 (Agent Teams 미사용, `llm-caller.ts` 재사용)
   - DD-7: criteria 1~5 array validator
   - DD-12: hard gate (valid_member_count < 2 → panel_minimum_unmet)
   - DD-13: P-14 audit pre-step (lineage tracking)
   - DD-17: AuditObligation transitions during P-14
9. **보조 모듈**
   - `promote/retirement.ts` (DD-6: event marker 2개 이상 → 퇴역 후보)
   - `promote/degraded-state.ts` (DD-11 taxonomy)
   - `promote/apply-state.ts` (DD-15 atomicity)
   - `promote/health-snapshot.ts` (promote.md §9)
   - `promote/domain-doc-proposer.ts` (DD-19 slot_id/instance_id 분리)
10. **Orchestrators**
    - `promote/promoter.ts` (Phase A — strict source-read-only)
    - `promote/promote-executor.ts` (Phase B — DD-15 atomicity, recovery via DD-22/DD-23, emergency-log write/double-failure fallback)
11. **CLI 통합**
    - `cli/session-root-guard.ts` (DD-8 layout marker, inspect mode)
    - `cli/migrate-session-roots.ts` (legacy session migration)
    - `src/cli.ts` 서브명령 추가: `promote`, `reclassify-insights`, `migrate-session-roots`, `promote --resolve-conflict` (DD-23)
12. **Insight Reclassifier** — `promote/insight-reclassifier.ts` (DD-9, `onto reclassify-insights` 별도 명령)
13. **E2E 테스트** — 138건 (E-P1~E-P138)
    - 기존 `src/core-runtime/cli/e2e-review-invoke.test.sh` 패턴 재사용 또는 별도 `e2e-promote.test.sh` 신설

**구현 핵심 원칙** (v9 §14.2 — 모든 단계 적용):
- TypeScript strict mode + private fields (DD-21 mechanical enforcement)
- Single source of truth (캐시는 documented cache로 명시)
- Lazy init + fail-close default
- TDD: E-P1~E-P138은 spec과 동등
- LEGAL_TRANSITIONS에 expired_unattended ingress 포함 확인 (v6 회귀 방지)

**환경변수**:
- `ANTHROPIC_API_KEY` 또는 `OPENAI_API_KEY` (P-4/P-6/P-13/P-14 LLM 호출)
- 또는 Codex auth fallback (`~/.codex/auth.json` — `llm-caller.ts` 재사용)

**구현 시 결정 항목 (v9 §14.3)**:
- ~~`RecoverabilityCheckpoint.serialize`의 backups 배열 순서~~ → **결정됨**: alphabetic on source_kind (recoverability.ts)
- ~~`AuditObligation` deserialization missing field~~ → **결정됨**: 명시적 throw (audit-obligation.ts fromJSON)
- LLM call retry → 권고: extractor.ts 패턴 (1회 retry, fail-close)
- `recovery-resolution.yaml` 갱신 정책 (NQ-21) → 권고: append-only resolution_history
- `source_channel` 필드 사용 (NQ-22) → 권고: 미사용 시 제거 (현재 types.ts에 미포함 — 결정 완료)

**다음 세션 진입 명령**:
```bash
# 1. 컨텍스트 복원
cat development-records/handoff/20260406-current-work.md
cat .onto/temp/learn-phase3-design-v9.md     # delta only
cat .onto/temp/learn-phase3-design-v8.md     # DD-1~DD-22 본체

# 2. 현재 구현 파일 확인
ls src/core-runtime/learning/promote/
ls src/core-runtime/learning/shared/specs/

# 3. tsc 통과 확인
npx tsc --noEmit

# 4. Step 7 (Collector)부터 이어서 작업
```

### 3.4 진화 항목

1. directory target 패턴 기반 최소 파일 세트 포함 (enhancement)
2. git diff target의 kind/scope 분리 (enhancement, 영향 범위 큼)
3. lens rename (onto_ 접두사 제거 + CLI `lens` + `.lens/` + `LENS_HOME`) — 보류

---

## 4. 개발 원칙 요약

치환 작업 시 아래를 따른다 (`authority/ontology-as-code-guideline.md` §8.3):

> **"이것 없이 다음 실행이 성공할 수 있는가?"**
> - 아니오 → 지금 구현 (blocker)
> - 예 → 기록만 하고, 실행 성공 이후에 구현 (enhancement)

의사결정 프레임 (`authority/llm-native-development-guideline.md`):
1. 의미 판단 필요? → LLM
2. 경계 제어 필요? → runtime
3. 품질 무해 고정 가능? → script

---

## 5. 핵심 파일 맵

| 역할 | 파일 |
|---|---|
| 개발 원칙 | `CLAUDE.md`, `authority/ontology-as-code-guideline.md`, `authority/llm-native-development-guideline.md` |
| 진화 기록 | `dev-docs/tracking/20260406-discovered-enhancements.md` |
| E2E 테스트 | `src/core-runtime/cli/e2e-review-invoke.test.sh` (`npm run test:e2e`) |
| 실행 entrypoint | `src/core-runtime/cli/review-invoke.ts` |
| executor | `src/core-runtime/cli/subagent-review-unit-executor.ts`, `api-review-unit-executor.ts`, `agent-teams-review-unit-executor.ts` |
| artifact 유틸 | `src/core-runtime/review/review-artifact-utils.ts`, `materializers.ts` |
| 타입 | `src/core-runtime/review/artifact-types.ts` |
| 렌더러 | `src/core-runtime/cli/render-review-final-output.ts` |
| 설정 | `.onto/config.yml` |
| **스킬 (thin entrypoint)** | `commands/review.md` |
| **coordinator state machine** | `src/core-runtime/cli/coordinator-state-machine.ts` |
| **coordinator 계약** | `processes/review/nested-spawn-coordinator-contract.md` |
| **글로벌 CLI** | `src/cli.ts`, `bin/onto` |
| **discovery** | `src/core-runtime/discovery/onto-home.ts`, `project-root.ts`, `config-chain.ts` |

---

## 6. 이번 세션 요약

23건 커밋. 49/49 E2E ALL PASS. 주요 성과:

- Nested Spawn Coordinator + 글로벌 CLI `onto review` + `--prepare-only`
- Role/Domain 해석 정책 + Config 적용 순서 체인 + Lens registry
- Coordinator CLI helpers + Trust Boundary + Domain 해석 정책
- Synthesize heading fix + Lens findings refs + Tagging 규칙
- 9-lens self-review 5회 실행, 각 리뷰 결과 반영
- Coordinator State Machine v3 설계 완료 (3회 리뷰 iteration)
- **Coordinator State Machine 구현**: 8파일 변경, E2E 5건 추가 (E45~E49)
