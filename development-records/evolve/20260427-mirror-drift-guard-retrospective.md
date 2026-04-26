---
as_of: 2026-04-27
status: closed-retrospective
functional_area: mirror-drift-guard-postmortem
purpose: |
  Mirror Drift CI Guard design (v1 → v3.5) abandonment 의 retrospective.
  본 design 은 Phase 2 Track B PR #222 Codex 9-lens 리뷰의 evolution High
  finding 대응으로 시작 (2026-04-25), 11 reviews 거쳐 v3.5 까지 진화 후 implementation
  진입 단계 (Step 4/12 완료) 에서 fundamental premise 오류가 발견되어 폐기 결정 (2026-04-27).

  본 문서는 11 review 의 design evolution + fundamental flaw discovery + lessons
  를 archaeological 가치로 보존. design proposal `20260425-mirror-drift-guard-proposal.md`
  + handoff `20260425-mirror-guard-implementation-handoff.md` 자체는 backlog branch
  `backlog/mirror-drift-guard-proposal` 에 9 commits 형태로 보존 (main 미머지).

source_refs:
  # 본 retrospective 는 main 에 보존 — 단 아래 proposal/handoff/review session/
  # framework 은 backlog branch `backlog/mirror-drift-guard-proposal` 에만 존재
  # (main 미머지). 참조하려면 해당 branch checkout 또는 GitHub branch 보기.
  branch: backlog/mirror-drift-guard-proposal
  proposal: development-records/plan/20260425-mirror-drift-guard-proposal.md (v3.5, on backlog branch)
  handoff: development-records/plan/20260425-mirror-guard-implementation-handoff.md (on backlog branch)
  v1_review: .onto/review/20260425-6920538b/ (on backlog branch)
  v2_review: .onto/review/20260425-3c919d64/ (on backlog branch)
  v3_review: .onto/review/20260425-0b9ba453/ (on backlog branch)
  framework_externalized: .onto/processes/review/finding-dispatch.md (on backlog branch — main 미머지)
  trigger_pr: PR #222 (Track B phase 2 W-A-86/87 role 신설, merge 43d0cee — main 에 존재)
---

# Mirror Drift CI Guard — abandonment retrospective

## 1. 시도한 것

`.onto/` 의 mirror file (`.onto/commands/domain-init.md`, `.onto/roles/rationale-proposer.md`,
`.onto/roles/rationale-reviewer.md`) 와 `development-records/evolve/*.md` 의 §X.Y body 사이
byte-exact match 를 CI 에서 강제하는 자동 검증 mechanism.

각 mirror 의 첫 줄에 `<!-- canonical-mirror-of: {slug} -->` HTML comment marker 부착,
`.onto/authority/mirror-registry.yaml` 을 SSOT 로 두고 `.github/workflows/mirror-guard.yml`
이 PR 마다 verifier 실행 → drift 시 fail.

## 2. 11 Reviews 의 evolution

| version | 핵심 변경 | review session |
|---|---|---|
| v1 | 3-way 검증 (mirror + canonical + registry) + canonical/runtime 두 mirror type | 20260425-6920538b |
| v2 | runtime mirror 분리 → canonical only. retirement event 도입. 4-way 검증 | 20260425-3c919d64 |
| v3 | retirement 제거 (가상 use case). marker 의 §section 제거 → registry SSOT. 3-way 회귀. P2 canonical authoring contract enforce | (review 없이 immediate iteration) |
| v3.1 | Evolutionary milestones framework (M0~M5) 도입 | (immediate) |
| v3.2 | finding-dispatch.md externalize. CI workflow snippet 명시 | 20260425-0b9ba453 |
| v3.3 | Hybrid scope contraction — multi-marker (reconstruct.md 5 markers) M2.5 deferred. registry uniqueness 3-way invariant. CI trigger 7 paths | (immediate) |
| v3.4 | finding-dispatch.md 5 category self-consistency. handoff 문서 신설 | (immediate) |
| v3.5 | **P2 contract broaden — Form A (fence) + Form B (heading-bounded) auto-detect**. W-A-85 의 Form B 케이스 정상 처리 위함 | implementation 진입 시 sanity check 결과 반영 |

총 ~565 → ~590 lines. design + 13-step implementation sequencing 정의됨.

## 3. Implementation 진행 상태 (폐기 시점)

| Step | 작업 | 상태 |
|---|---|---|
| 0 | Design v3.5 (P2 broaden) | DONE — commit `c39320a` |
| 1 | mirror-registry.yaml 신설 | DONE |
| 2 | registry-loader.ts + 9 unit test | DONE |
| 3 | marker-scanner.ts + 10 test | DONE |
| 4 | body-extractor.ts (Form A/B auto-detect) + 13 test | DONE |
| 5~12 | comparator, verify orchestrator, CLI, workflow, marker migration, principles | 미진입 |

총 ~400 LoC + 32/32 unit tests passing. 모두 backlog branch 에만 존재 (main 미머지).

## 4. 발견된 fundamental flaw — authority 방향 반대

### 4.1 Sanity check 가 표면화한 신호

implementation Step 4 완료 후 실제 데이터로 검증:

| Mirror | Form | Byte-match |
|---|---|---|
| W-A-86 (`rationale-proposer.md`) | A | YES (3,362 chars 일치) |
| W-A-87 (`rationale-reviewer.md`) | A | YES (6,330 chars 일치) |
| W-A-85 (`domain-init.md`) | B | NO (canonical 26,349 / mirror 12,820 chars) |

W-A-85 의 mirror 는 user-facing CLI contract 로 독자적 형식 (`# H1` + `## 1.` re-numbered),
canonical §5 는 design rationale 형식 (`### 5.1` + `### 5.2` subsections). 두 문서가 substantive
하게 다름.

### 4.2 진짜 문제 — design 의 premise 가 charter 와 충돌

W-A-85 case 가 사용자에게 "이상함" 을 알리는 신호였고, 사용자 인풋으로 charter 직접 재확인:

**CLAUDE.md (line 23)**:
```
위계 밖: development-records/ (이력/참조)
```

**productization-charter.md §4.2 (line 94~105)**:
```
hardened runtime authority는 prose-only 문서를 직접 authority로 소비하지 않는다

prompt-backed reference path에서는 prose 문서가 reference execution source가 될 수 있다.

하지만 hardened runtime core는 궁극적으로 아래를 authoritative input으로 삼아야 한다.
1. machine-readable authority asset
2. typed artifact
3. typed contract

즉 prose `development-records/`는 설명과 source material일 수는 있어도,
hardened runtime의 최종 input authority가 되면 안 된다.
```

즉 `development-records/` 는:
- Authority 위계 밖 (CLAUDE.md)
- Prose, 설명, source material (charter §4.2)
- Hardened runtime 의 authoritative input 이 되면 안 됨 (charter §4.2)

본 design v1~v3.5 가 한 일은 **반대 방향**:
- `development-records/evolve/*.md` §X.Y 를 **canonical source (정본)** 으로 designate
- `.onto/` 의 mirror file 이 그것의 **derived copy** 라고 정의
- `.onto/` (hardened authority) 가 `development-records/` (prose record) 를 권위로 삼아 byte-exact 동기 의무

이는 charter §4.2 의 명시적 금지 ("prose 가 hardened runtime 의 input authority 가 되면 안 됨") 위반.

### 4.3 W-A-85 mismatch 의 진짜 의미

| 측면 | development-records/ | .onto/ |
|---|---|---|
| 시간 모델 | Snapshot (결정 시점 freeze) | Live (지속 evolution) |
| 소비자 | 사람 (review/audit/archaeology) | runtime (machine-readable, typed) |
| 변경 정책 | 결정 시점 후 immutable record | implementation refinement 진행 |
| Drift | 결정 직후부터 자연 발생 (정상) | authority 자체이므로 drift 개념 부적용 |

즉 `domain-init.md` 가 user-facing CLI contract 로 진화 (live authority) 하면서 canonical §5 (frozen design rationale snapshot) 와 자연 drift 가 발생한 것 — 이는 **architecture 정의상 정상 동작**, 문제 아님.

W-A-86/87 의 byte-match 는 최근 함께 authored 됐기 때문에 우연 일치. 시간 흐르면서 `.onto/roles/*` 가 implementation refinement 로 진화하면 자연 drift 예정.

v3.5 design 의 "byte-match 강제" 는 둘 중 하나를 강요해야 가능:
- (a) `development-records/` 를 freeze 강요 — record 의 정의에는 맞지만 design rationale evolution 막음
- (b) `.onto/` 의 자연 evolution 막음 — hardened authority 의 정의 자체와 충돌

둘 다 architecture 와 충돌. **byte-match 강제 자체가 부적절**.

## 5. 11 Reviews 가 발견 못 한 이유

본 review 들이 모두 **design 내부 일관성** 에 집중:
- P1 normalization 정확성
- Registry schema 단순화 (4-way → 3-way)
- Failure class 분리 (orphan → dangling-marker / dangling-entry / canonical-missing / canonical-malformed)
- Boundary scan invariant
- CI trigger path 의 self-application closure

**외부 정책 (productization-charter §4.2, CLAUDE.md authority 위계) 과의 정합성 검토 lens 가 review 에 없었음**.
finding-dispatch framework 의 5 categories (C-fundamental / C-trivial / C-deferred-evolutionary
/ C-design-refactor / C-positive) 도 외부 charter 위반 case 를 catch 하는 lens 가 부재.

## 6. Lessons

### 6.1 외부 charter 정합성 검토 lens 보강 필요

Design review framework 에 추가할 lens:
- **External charter consistency**: 본 design 이 CLAUDE.md authority 위계, productization-charter,
  rank 2 개발 원칙 등 상위 정책과 충돌 안 함을 확인
- 실행 시점: review 의 logic / structure / dependency / semantics 검토 직전, **review 진입 전제 조건 (precondition)** 로

### 6.2 "역방향 authority 매핑" 의 위험 신호

Design 이 다음 패턴을 가지면 외부 charter 충돌 의심:
- Authority 위계 밖 폴더 (`development-records/`) 를 권위 source 로 designate
- Prose 문서를 machine-readable runtime 의 input authority 로 정의
- "이력/참조" 폴더에 대해 byte-match / freeze / immutability 강요

### 6.3 Phase 2 review 의 원래 finding 재해석 필요

PR #222 Codex 9-lens 리뷰의 evolution High finding ("canonical mirror files duplicate
volatile workflow topology — synchronized edits required") 가 가리킨 진짜 우려는 무엇이었는가:
- (가설 A) `.onto/` 와 `development-records/` 사이 동기 — 본 design 이 푼 방향, charter 와 충돌
- (가설 B) `.onto/` 내부의 cross-reference 일관성 (예: `reconstruct.md` 가 언급하는 role behavior 와 `.onto/roles/*.md` 의 spec 사이 일관성)
- (가설 C) PR review 에서 발생한 ambiguity — finding 자체가 정밀하지 않았을 가능성

본 retrospective 는 가설 A 를 폐기. 가설 B 또는 C 는 별도 검증 trigger.

### 6.4 Backlog branch 의 가치

본 design 은 9 commits 동안 main 과 격리된 backlog branch 에서 evolution → 폐기 비용 0.
만약 v1 단계에서 main merge 됐다면 9 commits 의 retroactive cleanup + downstream impact 분석
필요했을 것. **머지 전 backlog 에서 충분히 evolution + 외부 정합성 검토** 가 dispose-friendly
설계의 핵심.

## 7. 폐기 후속

### 7.1 보존되는 것

- Backlog branch `backlog/mirror-drift-guard-proposal` (9 commits) — archaeology 용도 유지
- `development-records/plan/20260425-mirror-drift-guard-proposal.md` (v3.5 design) — branch 안에 보존
- `development-records/plan/20260425-mirror-guard-implementation-handoff.md` — branch 안에 보존
- 본 retrospective 문서 (`development-records/evolve/20260427-mirror-drift-guard-retrospective.md`) — main 에 머지될 lessons archive

### 7.2 제거되는 것 (backlog branch 내 cleanup commit)

- `src/core-runtime/mirror-guard/` 디렉토리 (registry-loader.ts, marker-scanner.ts, body-extractor.ts + 3 test, ~400 LoC)
- `.onto/authority/mirror-registry.yaml`
- `scripts/mirror-guard-sanity.ts`
- `vitest.config.ts` 의 `mirror-guard` include entry

### 7.3 그대로 두는 것

- 3 mirror file (`.onto/commands/domain-init.md`, `.onto/roles/rationale-proposer.md`,
  `.onto/roles/rationale-reviewer.md`) 의 첫 줄 `<!-- canonical-mirror-of: ... -->` marker —
  PR #218/#219/#222 에서 이미 main 에 부착된 상태. 본 폐기와 무관. **사람 reader 의 weak
  cross-reference link** 로 retain. 별도 cleanup 결정은 차후 track.
- `.onto/processes/review/finding-dispatch.md` (5 category framework) — design v3.2 에서 도입돼 backlog branch 에 보존. mirror guard 와 별개로 review framework 가치 있음 — 별도 evaluation 후 main merge 가능 (현재는 backlog 에만).

## 8. 차후 진입 trigger

다음 trigger 시 본 retrospective 재검토:
- (T1) Phase 3 진입 (W-A-88+) — `.onto/roles/*.md` 가 실제 runtime spawn spec 으로 consume 되기 시작 시점. 그때 진짜 drift 우려 (= 가설 B) 가 surface 되면 신규 design.
- (T2) 외부 charter consistency lens 가 finding-dispatch framework 에 추가됐을 때 — 본 폐기 finding 자체를 framework validation case 로 활용 가능.
- (T3) 다른 mirror-like 패턴 등장 시 — 본 retrospective 의 §6.2 위험 신호 적용.
