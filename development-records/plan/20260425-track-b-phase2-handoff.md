---
as_of: 2026-04-25
status: active
functional_area: track-b-phase2-role-files
purpose: |
  Track B phase 1 (canonical seat migration W-A-80~W-A-85) 완결 후 phase 2 (role 파일
  W-A-86/87 신설) 를 /clear 후 즉시 재개 가능하도록 self-contained entry.

  phase 2 는 document-only edit 2 W-ID batch — Step 2 §5.1 role body 를
  `.onto/roles/rationale-proposer.md` 로, Step 3 §5.1 role body 를
  `.onto/roles/rationale-reviewer.md` 로 copy + canonical-mirror-of marker.
source_refs:
  stage_3_wrap_up: "development-records/evolve/20260425-phase4-stage3-wrap-up.md §6.1a (authority seat table — W-A-86/W-A-87 row)"
  w_a_86_source: "development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md §5.1 (lines 553~642, 90 lines role body, English)"
  w_a_87_source: "development-records/evolve/20260423-phase4-stage3-step3-rationale-reviewer-protocol.md §5.1 (lines 971~1109, 139 lines role body, English)"
  w_a_80_pr: "PR #218 (a2c9063) — W-A-80 Hook α Phase 1 Stage Transition"
  phase1_batch_pr: "PR #219 (0f239f9) — W-A-81~85 batch canonical seat migration"
  marker_convention: "Stage 3 wrap-up §5.5 canonical 2-scope — W-A-86/87 은 `canonical-mirror-of` scope (authority seat 간 mirror)"
---

# Track B phase 2 handoff — role 파일 2 W-ID (W-A-86 + W-A-87)

## 0. /clear 후 첫 명령

```
development-records/plan/20260425-track-b-phase2-handoff.md 읽고 Track B phase 2 진행
```

본 handoff 는 self-contained. 이전 세션 memory 는 optional reference.

## 1. 전제 상태 확인

phase 2 진입 전 다음 상태 성립해야:

```bash
git checkout main && git pull --ff-only origin main
git log --oneline origin/main | grep -E "#218|#219" | head -3
# 확인:
#   0f239f9 feat(track-b): phase 1 batch — W-A-81~W-A-85 canonical seat migration (5 atomic commits) (#219)
#   a2c9063 feat(reconstruct): W-A-80 Phase 1 Stage Transition — Hook α canonical promotion (#218)

# phase 1 artifacts 확인
grep -l "canonical-mirror-of: step-" .onto/processes/reconstruct.md .onto/commands/domain-init.md
# 2 파일 모두 출력되어야 함

# phase 2 target 확인 (신설 위치)
ls .onto/roles/ | grep -E "rationale"
# 아직 없음 (phase 2 가 신설)
```

## 2. phase 2 scope

권장안 (단독 vs batch 비교, 주체자 2026-04-25 채택):
- **phase 1 (완결)**: batch — document-only, 6 W-ID 한 PR (W-A-80 단독 PR #218 + W-A-81~85 batch PR #219)
- **phase 2 (본 handoff)**: batch — document-only 2 W-ID 한 PR
- phase 3 (W-A-88~100): 단독 — runtime code, test/verify cycle, prereq sequencing
- phase 4 (W-A-101~104): batch — final coherence

## 2.1 W-A-86: `.onto/roles/rationale-proposer.md` 신설

**Source**: Step 2 protocol §5.1 role body (`development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md` lines 553~642, 90 lines, English).

**Target**: `.onto/roles/rationale-proposer.md` (신설 — 현재 미존재)

**내용**: Step 2 §5.1 body 전체 복사. 첫 줄 (또는 frontmatter 상단) 에 canonical-mirror-of marker 부착:

```markdown
<!-- canonical-mirror-of: step-2-rationale-proposer §5.1 -->
```

참고: Step 2 §5.1 는 이미 Axiology Adjudicator / 다른 `.onto/roles/*.md` 의 canonical spec 형식을 따름 (Perspective / Observation focus / Assertion type / Core questions / Procedure / Output schema / Boundary routing / Language / References).

## 2.2 W-A-87: `.onto/roles/rationale-reviewer.md` 신설

**Source**: Step 3 protocol §5.1 role body (`development-records/evolve/20260423-phase4-stage3-step3-rationale-reviewer-protocol.md` lines 971~1109, 139 lines, English).

**Target**: `.onto/roles/rationale-reviewer.md` (신설 — 현재 미존재)

**내용**: Step 3 §5.1 body 전체 복사 + marker:

```markdown
<!-- canonical-mirror-of: step-3-rationale-reviewer §5.1 -->
```

## 3. 진입 단계

### 3.1 branch 생성

```bash
git checkout -b track-b/phase2-batch-role-files
```

### 3.2 W-A-86 atomic commit

```bash
# Source 확인
sed -n '553,642p' development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md > /tmp/w-a-86-source.md

# 또는 직접 Read tool 로 line 553~642 읽고 .onto/roles/rationale-proposer.md 에 Write
# 첫 줄에 canonical-mirror-of marker 부착

git add .onto/roles/rationale-proposer.md
git commit -m "feat(roles): W-A-86 rationale-proposer.md 신설 — Hook α role canonical

Step 2 §5.1 role body (English canonical spec) 를 .onto/roles/rationale-proposer.md 에
이식 + canonical-mirror-of marker 부착.

Marker:
  <!-- canonical-mirror-of: step-2-rationale-proposer §5.1 -->

Stage 3 wrap-up §6.1a authority seat row #7 promotion. role body 는 Hook α runtime
(W-A-88) 이 agent spawn 시 참조하는 canonical spec.

Atomic commit — 단일 W-ID, document-only edit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### 3.3 W-A-87 atomic commit

```bash
# Source 확인
sed -n '971,1109p' development-records/evolve/20260423-phase4-stage3-step3-rationale-reviewer-protocol.md > /tmp/w-a-87-source.md

# 또는 직접 Read tool 로 line 971~1109 읽고 .onto/roles/rationale-reviewer.md 에 Write

git add .onto/roles/rationale-reviewer.md
git commit -m "feat(roles): W-A-87 rationale-reviewer.md 신설 — Hook γ role canonical

Step 3 §5.1 role body (English canonical spec) 를 .onto/roles/rationale-reviewer.md 에
이식 + canonical-mirror-of marker 부착.

Marker:
  <!-- canonical-mirror-of: step-3-rationale-reviewer §5.1 -->

Stage 3 wrap-up §6.1a authority seat row #8 promotion. role body 는 Hook γ runtime
(W-A-89) 이 agent spawn 시 참조하는 canonical spec.

phase 2 완결 (Track B 8/25 W-ID, 32%). 다음 phase 3 (W-A-88~100 runtime code) 단독 진행.

Atomic commit — 단일 W-ID, document-only edit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### 3.4 push + PR

```bash
git push -u origin track-b/phase2-batch-role-files

gh pr create --title "feat(track-b): phase 2 batch — W-A-86 + W-A-87 role 파일 신설 (2 atomic commits)" --body "..."
```

PR body template 은 §4 참조.

### 3.5 merge

```bash
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only origin main
```

## 4. PR body template

```markdown
## Summary

Track B phase 2 (role 파일 신설) batch — 2 atomic commits in single PR. Stage 3 Step 2 §5.1 + Step 3 §5.1 canonical role body 를 `.onto/roles/` 로 promotion.

## 2 atomic commits

| commit | W-ID | 작업 |
|---|---|---|
| - | W-A-86 | `.onto/roles/rationale-proposer.md` 신설 — Step 2 §5.1 role body (90 lines) + canonical-mirror-of marker |
| - | W-A-87 | `.onto/roles/rationale-reviewer.md` 신설 — Step 3 §5.1 role body (139 lines) + canonical-mirror-of marker |

## Mirror markers

- W-A-86: `<!-- canonical-mirror-of: step-2-rationale-proposer §5.1 -->`
- W-A-87: `<!-- canonical-mirror-of: step-3-rationale-reviewer §5.1 -->`

## Track B phase 진행률

| phase | status |
|---|---|
| phase 1 (W-A-80~W-A-85) | ✅ 6/6 완결 (PR #218 + #219) |
| **phase 2 (W-A-86~W-A-87)** | ✅ **2/2 완결 (본 PR)** |
| phase 3 (W-A-88~W-A-100) | 단독 진행 — runtime code |
| phase 4 (W-A-101~W-A-104) | batch — cross-cutting |

Track B 8/25 (32%) — phase 1+2 canonical seat + role 파일 모두 promotion 완결. 이후 runtime code (phase 3) 가 canonical seat 만 참조.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## 5. 이후 단계 (phase 2 완결 후)

**phase 3 진입 준비**: Track B W-A-88~W-A-100 (13 W-ID, runtime code). **단독 진행 권장** (각 W-ID 별 branch + commit + PR):

- W-A-88 Hook α runtime (Stage transition state machine + Proposer agent invocation + directive apply)
- W-A-89 Hook γ runtime (Phase 2 Step 2c state machine + Reviewer agent + retry)
- W-A-90 Hook δ runtime (Phase 3 rendering + priority score + 7-step partition + 4 bucket)
- W-A-91 `rationale-queue.yaml` artifact write
- W-A-92 `phase3-snapshot.yml` artifact write
- W-A-93 Phase 3.5 runtime (validation + apply + sweep + atomic fsync)
- W-A-94 raw.yml meta extended schema write
- W-A-95 `onto domain init` CLI 구현 (3 branches + interactive flow)
- W-A-96 `--config` non-interactive CLI
- **W-A-97 `version_hash` algorithm — prereq for W-A-95/96/99**
- W-A-98 Failure code canonical map runtime emit
- W-A-99 Pre-load gate (manifest_identity_mismatch + required field check + manifest_version_hash_mismatch)
- W-A-100 `recovery_from_malformed` audit signal write/clear + raw.yml mirror

**phase 3 sequencing 핵심 prereq** (Stage 3 wrap-up §4.3 canonical):
- W-A-101 (wip.yml schema) 는 모든 runtime code 의 base → **먼저 착수** (phase 4 이지만 phase 3 진입 전 추천)
- W-A-97 → prereq for W-A-95/96/99
- W-A-94 → prereq for W-A-100

대안 sequencing: phase 4 의 W-A-101 (wip.yml schema) 를 phase 3 직전 single commit 으로 먼저 진행 → 이후 phase 3 runtime code 가 schema-aware 로 작성 가능.

## 6. 위험 + 주의사항

### 6.1 Source line range drift

Step 2 / Step 3 protocol 의 §5.1 line range 는 2026-04-25 기준. 이후 Step 2/3 protocol 변경 (`r{N}-amendment` 등) 시 line 번호 이동 가능. 복사 전 최신 `grep -n "^### 5.1"` 로 재확인 권장.

### 6.2 Role body 의 English 유지

Step 2 §5.1 + Step 3 §5.1 는 **English canonical spec** — role 파일은 agent 가 read 하는 spec 이므로 `.onto/principles/output-language-boundary.md` + 기존 `.onto/roles/*.md` 관례와 일관하게 English 유지. 본 handoff 는 한국어 context 이지만 role body 이식 시 English 그대로 copy.

### 6.3 marker 위치

기존 `.onto/roles/*.md` (e.g. `axiology.md`, `semantics.md`) 를 확인해 marker 위치 convention 따름. 일반적으로 첫 줄 (frontmatter 상단 또는 H1 직전) 에 HTML comment.

### 6.4 phase 2 batch vs 단독 선택

phase 2 는 2 W-ID 만, 모두 document-only, dependency 없음 → **batch 권장** (단일 PR). 단독 진행도 가능 (각 W-ID 별 PR × 2) 하지만 PR round-trip 2 배 소요.

### 6.5 기존 roles 경로

기존 `.onto/roles/` 에 9 lens role + `synthesize.md` 존재 (10 파일). rationale-proposer / rationale-reviewer 는 lens 가 아닌 **별도 role** (Hook α / Hook γ). 동일 디렉토리 공존 OK.

## 7. 참조

- **Stage 3 wrap-up** (canonical source): `development-records/evolve/20260425-phase4-stage3-wrap-up.md`
  - §6.1a (authority seat row #7 W-A-86, row #8 W-A-87)
  - §4.1 (atomic commit 원칙)
  - §5.5 (mirror marker 2-scope canonical)
- **Step 2 protocol §5.1** (W-A-86 source): `development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md` lines 553~642
- **Step 3 protocol §5.1** (W-A-87 source): `development-records/evolve/20260423-phase4-stage3-step3-rationale-reviewer-protocol.md` lines 971~1109
- **Phase 4 Stage 3 Complete memory** (진행률 + 전체 context): `/Users/kangmin/.claude-2/projects/-Users-kangmin-cowork-onto-4/memory/project_phase4_stage3_complete.md`

## 8. Lifecycle

- **Active**: phase 2 완결 (2 W-ID merge) 시까지
- **Superseded**: phase 2 PR merge 시 handoff status `active` → `superseded-by-phase2-completion` 전환 — memory entry 에 PR # + commit hash 기록
- **Archive**: development-records/plan/ 에 유지 (delete 대상 아님)
