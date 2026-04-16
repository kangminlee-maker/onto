# Govern Process (v0, bounded minimum surface)

> 프로젝트 규범의 변경 제안 + 문서-코드 drift 감지 항목을 큐로 관리하고,
> 주체자(principal)의 판정을 이벤트 로그로 기록하는 프로세스.
> v0 는 기록 인터페이스만 제공. 승인 강제 차단과 drift 자동 감지는 W-C-02.

## 0. Position in `onto`

| 축 | 설명 |
|---|---|
| 활동 분류 | 다섯 활동 (review / reconstruct / evolve / learn / **govern**) 중 하나. `authority/core-lexicon.yaml#activity_enum` 등재. |
| onto-direction §1.4 | govern 완료 기준 = 규범 등재·갱신·폐기 추적 + drift 정책 + Principal 승인 강제. 본 v0 는 "기록 추적" 부분만 충족. |
| Authority seat | 본 파일 (contract). commands/govern.md 가 entrypoint surface. `src/core-runtime/govern/` 이 구현 surface. |

## 1. Purpose

| 질문 | 답 |
|---|---|
| 무엇인가 | 프로젝트 규범 변경·drift 를 큐로 축적하고, 주체자 판정을 기록하는 프로세스 |
| 왜 존재하는가 | 규범 변경·drift 가 흩어지면 언제 무슨 판단이 있었는지 추적 불가 → 반복 재논의 비용 증가. 이력 존재가 드러나야 시간·비용 최소화 (이용자 관점 가치) 가능 |
| 다른 활동과의 관계 | review 는 산출물 검증, reconstruct 는 지식 재구조화, evolve 는 새 설계, learn 은 학습 축적. govern 은 **규범 자체의 변경을 관리**하며 위 4개 활동의 메타 레이어 |

## 2. Inputs

| 입력 | 출처 | 필수 |
|---|---|---|
| origin | 주체자 또는 drift engine | 필수 (`human` 또는 `system`) |
| target | 변경 대상 파일 경로 | 필수 |
| payload | JSON 객체 (자유 구조) | 필수 |
| prompted_by_drift_id | 사람이 drift 를 보고 올린 경우 drift 항목 id | 선택 |

## 3. Outputs (v0)

- `.onto/govern/queue.ndjson` 에 `submit` / `decide` 이벤트 append.
- CLI 출력: `{status, id, ...}` JSON. automation 용 가독.
- **v0 는 authority 파일을 자동 수정하지 않는다**. approve 후 파일 반영은 주체자 수동 편집 또는 W-C-02 책임.

## 4. State Machine

큐 단위(queue pattern) 이며 per-entry 생애주기는 단순:

```
(없음) ─submit→ pending ─decide(approve|reject)→ decided
```

v0 는 재판정 불가. `decide` 는 pending 상태에서만 허용.

**큐 전체의 생애주기는 없다** (evolve/reconstruct 의 scope 생애주기 패턴과 구별). 각 항목은 독립적이며, 여러 항목이 동시에 pending 상태로 공존한다.

## 5. Interface (bounded subcommand)

| 서브커맨드 | CLI 책임 | Agent 책임 |
|---|---|---|
| `onto govern submit` | 이벤트 append, id 생성, origin→tag 매핑 | payload JSON 구성 (대화 맥락에서 agent 가 수렴) |
| `onto govern list` | 이벤트 projection, 필터링, 렌더링 | (결정적, agent 관여 없음) |
| `onto govern decide` | 판정 이벤트 append, 재판정 guard | 판정 근거 text (`--reason`) 구성 |

**CLI 는 LLM 호출 없음** (evolve propose-align 원칙 동형). 비결정적 작업 (payload 작성, 판정 근거 정리) 은 agent 가 수행 후 결과를 CLI 에 제출.

## 6. Origin → Tag (deterministic)

| `origin` | `tag` | 의미 |
|---|---|---|
| `human` | `norm_change` | 주체자·기여자가 규범 변경 제안 |
| `system` | `drift` | 자동 감지 엔진이 문서-코드 불일치 보고 |

**편향 방지 설계**: 사람이 drift 감지 결과를 보고 제안을 올리는 경우, tag 는 `norm_change` (사람이 올렸으므로) 이되 `prompted_by_drift_id` 로 원본 drift 항목과 연결. 분류 기준이 "누가" 인지 "왜" 인지 모호해지는 것을 원천 차단.

## 7. Storage (event-sourced)

- 파일: `.onto/govern/queue.ndjson` (프로젝트 로컬, **project-locality-principle 준수**)
- 포맷: JSON Lines (append-only)
- 이벤트 타입:
  - `submit`: base entry. id 생성, 필수 필드 기록.
  - `decide`: verdict + reason 기록. id 는 기존 entry 참조.

projection: 모든 이벤트를 id 별로 그룹핑. `submit` 이 base, `decide` 가 있으면 status=decided + verdict 부착.

**drift engine 통합 계약 (W-C-02)**: drift engine 은 본 ndjson 에 `origin=system, tag=drift` 이벤트를 직접 append. CLI 를 거치지 않음 (scope-runtime event-pipeline 패턴과 동형). W-C-01 은 타입 정의 (`GovernSubmitEvent`) 만 계약으로 고정.

## 8. Scope Boundary (v0 vs 후속)

### v0 = 현 레포 한정

본 v0 는 **현 프로젝트 내부 규범** (authority/, processes/, commands/, design-principles/, roles/ 등) 의 변경 관리에만 적용한다. 다음은 범위 밖:

| 범위 밖 | 이유 | 처리 경로 |
|---|---|---|
| 글로벌 메타 규범 (onto 자체의 교차 프로젝트 원칙) | 전역 저장소 (~/.onto/govern/) 설계 필요 | **W-C-03** |
| 다른 레포의 규범 변경 | 프로젝트 간 의존 관계 모델링 필요 | **W-C-03** |
| 승인 후 자동 파일 수정 | diff 정확도 + rollback + 동시성 설계 필요 | **W-C-02** |
| drift 자동 감지 | 문서-코드 비교 엔진 필요 | **W-C-02** |
| pre-commit / CI / merge gate 차단 | 차단 지점 실측 기반 선정 필요 | **W-C-02** |

### dead-letter 방지

v0 는 기록만 하므로 decide 이후 consumer 가 없다. 이로 인한 dead-letter risk 를 방어하기 위해:

- `onto govern list --status decided` 조회를 명시적으로 지원. 판정 이력이 언제든 감사 가능.
- `decide` 출력의 `note` 필드에 후속 반영 경로 (주체자 수동 편집 / W-C-02) 를 명시.

### GC 정책

v0 는 GC 없음. queue.ndjson 이 커지면 (>1000 건) 수동 archive 로 대응. 자동 rotation·purge 는 W-C-02 이후 검토.

## 9. Validation

- **unit test**: `src/core-runtime/govern/cli.test.ts` — submit / list / decide 3 서브커맨드 + 경계 guard (invalid origin, non-object payload, unknown id, re-decide 거부).
- **E2E 검증 (v1 후속)**: 전체 시나리오 (drift 감지 → 큐 append → Principal 판정 → 반영) 는 W-C-02 완료 후 통합 E2E.

## 10. Related Work

- **선행 (reconstruct bounded minimum surface)**: `src/core-runtime/evolve/commands/reconstruct.ts` 3-step bounded path. W-A-74 (DL-020 해소) 에서 확립한 "v0 는 기록·CLI 만, 의사결정·차단은 v1" 패턴을 govern 에 동형 적용.
- **선행 (evolve propose-align CLI-agent 분리)**: `src/core-runtime/evolve/commands/propose-align.ts` 가 "CLI=상태기계, agent=대화 UX" 분리를 확립. govern 은 queue pattern 으로 session 생애주기 없이 적용.
- **후속 (W-C-02)**: drift engine + 승인 강제 차단. 본 v0 의 `GovernSubmitEvent` 타입을 계약으로 소비.
- **후속 (W-C-03)**: knowledge → principle 승격 + cross-project 규범. 본 v0 의 queue 개념 확장.

---

## 11. Drift Engine (W-C-02)

§1.3 "자기 적용과 자율성" 의 drift 정책을 구현하는 classifier + router. 변경 제안(change proposal) 을 3 분기로 분류하고, 필요 시 §7 큐에 append 한다.

### 11.1 3 분기 (§1.3 canonical)

| 분기 | 조건 | 처리 |
|---|---|---|
| `self_apply` | drift 양의 피드백 없는 local contained 변경 | 자체 실행 + 보고. 큐 append 없음. |
| `queue` | drift 증폭 가능성 있는 변경 | §7 큐에 `origin=system, tag=drift` 로 append. payload.route=queue. Principal 승인 대기. |
| `principal_direct` | govern 자체 변경, 핵심 가치(§1.0) 변경 | §7 큐에 append하되 payload.route=principal_direct marker. 자체 실행 불가, 반드시 Principal 직접 판정. |

### 11.2 v0 분류 규칙 (deterministic)

다음 우선순위로 순차 평가:

1. **governance_core → principal_direct**: target_files 중 어느 하나라도 다음 prefix 로 시작:
   - `authority/` (개념 SSOT + authority-adjacent data)
   - `design-principles/` (rank 2~4 개발 규범)
   - `processes/govern.md` (본 계약 자체 — self-modification 차단)
2. **local_docs_single → self_apply**: 규칙 1 미적용 AND `change_kind=docs_only` AND target_files 길이 1
3. **drift_default → queue**: 그 외 전부 (drift 가능성 default)

실제 diff 분석·authority 규칙 충돌 검출 등 **drift probe** 는 v0 범위 밖. classifier 는 target prefix + change_kind 만으로 결정적으로 판정. 구체 drift 감지 로직은 v1 이후 추가.

### 11.3 ChangeProposal 입력 schema

```typescript
interface ChangeProposal {
  summary: string;            // 필수, 비어있지 않은 문자열
  target_files: string[];     // 필수, 길이 ≥ 1
  change_kind:                // 필수 enum
    | "docs_only"
    | "code"
    | "config"
    | "mixed";
  rationale?: string;         // 선택
}
```

### 11.4 CLI surface

```
onto govern route --json <ChangeProposal-json> [--project-root <path>]
```

출력 (JSON):
- `status: "routed"`
- `route: "self_apply" | "queue" | "principal_direct"`
- `matched_rule: "governance_core" | "local_docs_single" | "drift_default"`
- `reason: string` — 규칙 근거
- `queue_event_id: string` (queue/principal_direct 일 때만)

### 11.5 queue 와의 계약

drift engine 이 큐에 append 할 때:
- `origin=system`, `tag=drift` 고정 (§6 매핑 준수).
- `submitted_by=drift-engine`.
- `payload` 에 원본 proposal + `route`, `matched_rule`, `reason` 기록.
- `principal_direct` 도 동일한 event schema 사용 — tag enum 을 v0 에서 확장하지 않는다 (schema stability). `payload.route` marker 로 구분.

### 11.6 수준 0→1 gate

§1.3 의 자율성 수준:
- **수준 0**: 모든 변경 Principal 승인 → drift engine 없을 때 또는 모든 분기 결과가 `queue`/`principal_direct` 로 강제될 때.
- **수준 1**: drift 없는 변경 자체 실행 + 나머지 큐 → `self_apply` 분기가 활성화된 상태 (본 v0 가 이 gate 를 연다).

v0 구현은 **수준 1 도달 조건** 을 충족한다:
- 3 분기 분류가 결정적으로 수행됨.
- `self_apply` 는 큐를 거치지 않고 caller 가 즉시 실행 가능.
- `queue`·`principal_direct` 는 §7 event-sourced 큐로 회귀.

### 11.7 v1 이후 (W-C-02 범위 밖)

- 실제 diff 분석 + authority 규칙 충돌 검출 (drift probe 본체).
- pre-commit / CI / merge gate 차단 강제 (decide approve 가 실제 merge 를 gating).
- 수준 2 (일부 drift 감수 변경 자체 실행) 로의 전이 기준 — 수준 1 운영 데이터 축적 후 재평가.
