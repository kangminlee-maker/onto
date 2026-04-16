## Align Packet: onto-direction.md §1.4 govern 활동의 완료 기준 — 규범 등재·갱신·폐기 추적 + drift 정책 명시 + 자기 변경 시 Principal 승인 강제 — 를 실현하기 위한 runtime 기반 없음. review/reconstruct/evolve 세 활동은 CLI 진입점 + process 계약 + runtime handler 가 모두 갖춰졌으나, govern 만 미착수 상태. 본 scope 는 govern 의 **CLI 진입점 + process 계약 + drift 훅 interface v0** 만 정의한다 (실 drift engine 은 W-C-02 소관).

### 1. 당신이 요청한 것 (To-be)

**원문:** "onto-direction.md §1.4 govern 활동의 완료 기준 — 규범 등재·갱신·폐기 추적 + drift 정책 명시 + 자기 변경 시 Principal 승인 강제 — 를 실현하기 위한 runtime 기반 없음. review/reconstruct/evolve 세 활동은 CLI 진입점 + process 계약 + runtime handler 가 모두 갖춰졌으나, govern 만 미착수 상태. 본 scope 는 govern 의 **CLI 진입점 + process 계약 + drift 훅 interface v0** 만 정의한다 (실 drift engine 은 W-C-02 소관)."

**시스템이 해석한 방향:**
govern 활동의 CLI 진입점 + process 계약 + drift 훅 interface v0 를 bounded minimum surface 로 정의한다. queue 기반 CLI (submit/list/decide), 프로젝트 로컬 저장, 사람·drift 구분은 origin 기반 tag, v0 는 기록만 (승인 강제 차단 로직은 W-C-02).

**제안된 범위:**

| 포함 | 동의하시나요? |
|------|-------------|
| commands/govern.md 신설 (submit/list/decide 3-command 명세) | |
| processes/govern.md 신설 (§1~§9 구조, review/reconstruct/evolve 와 동격) | |
| src/core-runtime/govern/cli.ts handler stub (bounded minimum surface) | |
| authority/core-lexicon.yaml 에 govern activity 등재 (v0.12.0) | |
| .onto/govern/queue.ndjson schema 정의 + drift_queue_entry 타입 선언 | |

| 제외 | 동의하시나요? |
|------|-------------|
| drift engine 실구현 (W-C-02) | |
| Principal 승인 강제 차단 로직 — pre-commit/CI/merge gate (W-C-02) | |
| knowledge → principle 승격 경로 (W-C-03) | |
| consumption feedback instrumentation (W-C-05) | |

**시나리오:**

> 규범 변경 제안 흐름: 작업자가 `onto govern submit --origin human --target authority/core-lexicon.yaml --json <변경>` → queue.ndjson 에 append (tag=규범_변경). Principal 이 `onto govern list` 로 대기 목록 확인. `onto govern decide <id> --verdict approve` 로 판정 기록.
>
> drift 감지 흐름: drift engine (W-C-02) 이 `.onto/govern/queue.ndjson` 에 origin=system, tag=drift 로 직접 append. Principal 이 `onto govern list` 에서 함께 확인. `onto govern decide <id> --verdict approve` (= 문서 수정 승인) 또는 `reject` (= 문서 유지·코드 수정) 로 해결 방향 결정.
>

---

### 2. 현재 현실 (As-is)

#### Experience 관점 — 지금 사용자가 보는 것

govern 활동은 onto-direction §1.4 에서 완료 기준이 명시되었으나 현재 미구현. 규범 변경·drift 를 추적하는 체계 자체가 없어 무슨 일이 있었는지 이력 조회 불가.

#### Policy 관점 — 지금 적용되는 규칙

onto-direction.md §1.4 govern 완료 기준 = 규범 등재·갱신·폐기 추적 + drift 정책 + Principal 승인 강제. project-locality-principle 은 프로젝트 고유 지식의 프로젝트 내 저장을 요구.

#### Code 관점 — 지금 시스템이 할 수 있는 것

src/core-runtime/evolve/commands/ 에 review/reconstruct/evolve handler 는 있음. govern handler 는 없음. src/cli.ts 의 govern subcommand 는 'not yet implemented' 분기로만 존재.

---

### 2.5 미검증 가정 — 소스 탐색에서 발견

아래 항목은 정책 문서에서 확인되지 않은 가정입니다. Approve 전에 확인을 권장합니다.

| CST-ID | 가정 출처 | 요약 | 확인 필요 사항 |
|--------|----------|------|--------------|
| C-001 | 요청자 주장, 별도 확인 필요 | govern item 의 유형 tag 기준은 누가 올렸는가 (origin): 사람=규범_변경, 자동감지=drift | 세션 대화 2026-04-15의 Q1 follow-up: origin 기준이 cleanest에서 확인 필요 |
| C-002 | 요청자 주장, 별도 확인 필요 | govern CLI 는 queue 패턴 (submit/list/decide) — session 패턴 아님 | 세션 대화 2026-04-15의 Q2: govern 본질은 queue 관리 (여러 건 쌓여 하나씩 판정)에서 확인 필요 |

---

### 3. 충돌 지점 (Tension)

요청한 것(to-be)과 현재 현실(as-is) 사이에 6건의 충돌이 발견되었습니다.

| CST-ID | 관점 | 요약 |
|--------|------|------|
| C-001 | Policy | govern item 의 유형 tag 기준은 누가 올렸는가 (origin): 사람=규범_변경, 자동감지=drift |
| C-002 | Code | govern CLI 는 queue 패턴 (submit/list/decide) — session 패턴 아님 |
| C-003 | Policy | queue 저장 위치는 프로젝트 내부 (.onto/govern/queue.ndjson) — 전역 아님 |
| C-004 | Policy | v0 에서 Principal 승인 강제는 '기록만' — 실제 차단은 W-C-02 |
| C-005 | Code | drift engine 과 govern 의 연결은 공유 파일 append — 별도 API 없음 |
| C-006 | Policy | lexicon v0.12.0 에서 govern 은 activity 로 등재 (review/reconstruct/evolve 와 동격) |

---

#### C-001 | Policy | govern item 의 유형 tag 기준은 누가 올렸는가 (origin): 사람=규범_변경, 자동감지=drift

**이것이 무엇인가:**
govern item 의 유형 tag 기준은 누가 올렸는가 (origin): 사람=규범_변경, 자동감지=drift

**왜 충돌하는가:**
tag 기준이 불명확하면 사람이 drift 를 계기로 제안을 올릴 때 어느 tag 인지 결정 불가

**처리하지 않으면:**
item 생성 시 어느 tag 인지 모호해져 Principal 이 매번 분류 판정을 해야 함 → 시간·비용 증가

**변경 규모:** low (일회성 결정)

**추천:** origin 기준 tag. 사람이 drift 를 보고 올린 제안은 tag=규범_변경 + payload.prompted_by_drift=<drift_item_id> 참조로 연결

---

#### C-002 | Code | govern CLI 는 queue 패턴 (submit/list/decide) — session 패턴 아님

**이것이 무엇인가:**
govern CLI 는 queue 패턴 (submit/list/decide) — session 패턴 아님

**왜 충돌하는가:**
review/reconstruct/evolve 는 '한 번에 한 건' 세션. govern 은 '여러 건 큐에서 하나씩 판정' — 본질이 다름

**처리하지 않으면:**
reconstruct/evolve 같은 session 패턴으로 만들면 queue 안의 각 item 을 session 화해야 하는 복잡도 발생

**변경 규모:** medium (CLI 구조 전체에 영향)

**추천:** queue 패턴. submit (신규 등록) / list (대기 목록) / decide <id> (판정) 3-command. drift 자동 감지는 CLI 를 거치지 않고 큐에 직접 append

---

#### C-003 | Policy | queue 저장 위치는 프로젝트 내부 (.onto/govern/queue.ndjson) — 전역 아님

**이것이 무엇인가:**
queue 저장 위치는 프로젝트 내부 (.onto/govern/queue.ndjson) — 전역 아님

**왜 충돌하는가:**
전역 저장은 git 이력 유실 + project-locality-principle 위반

**처리하지 않으면:**
전역 저장 시 git 추적 불가능 → 이력 유실. 프로젝트별 규범이 한 큐에 섞여 혼선

**변경 규모:** medium (cross-project govern 필요 시 재검토)

**추천:** 프로젝트 내부. cross-project 공유 govern (~/.onto/learnings/ 등) 은 W-C-03 에서 별도 설계

---

#### C-004 | Policy | v0 에서 Principal 승인 강제는 '기록만' — 실제 차단은 W-C-02

**이것이 무엇인가:**
v0 에서 Principal 승인 강제는 '기록만' — 실제 차단은 W-C-02

**왜 충돌하는가:**
W-C-01 에 강제 차단 포함 시 W-C-02 범위 침범 + reconstruct 패턴과 불일치

**처리하지 않으면:**
v0 에 차단 로직 추가 시 W-C-02 범위 침범. 지금 차단 지점 선정 시 실측 없는 편향 risk

**변경 규모:** medium

**추천:** v0 는 decide 결정을 기록만. pre-commit/CI/merge gate 선정은 W-C-02 에서 실측 후 결정

---

#### C-005 | Code | drift engine 과 govern 의 연결은 공유 파일 append — 별도 API 없음

**이것이 무엇인가:**
drift engine 과 govern 의 연결은 공유 파일 append — 별도 API 없음

**왜 충돌하는가:**
별도 API 도입 vs 공유 파일 append 중 선택

**처리하지 않으면:**
API 층 추가 시 W-C-02 구현에 coupling 증가. scope-runtime event-sourcing 패턴과 불일치

**변경 규모:** low

**추천:** event-sourcing 패턴. drift engine 이 .onto/govern/queue.ndjson 에 origin=system, tag=drift 로 append. W-C-01 에는 drift_queue_entry TypeScript 타입 선언 v0 만 포함

---

#### C-006 | Policy | lexicon v0.12.0 에서 govern 은 activity 로 등재 (review/reconstruct/evolve 와 동격)

**이것이 무엇인가:**
lexicon v0.12.0 에서 govern 은 activity 로 등재 (review/reconstruct/evolve 와 동격)

**왜 충돌하는가:**
entity/activity/term 중 어느 범주로 등재할지 결정 필요

**처리하지 않으면:**
entity 나 term 으로 등재 시 분류체계가 어긋나 lexicon 내 govern 위치 모호

**변경 규모:** low

**추천:** activity 로 등재. review/reconstruct/evolve 와 동일 구조 (목적, 완료 기준, 주체, 진입점) 로 기술

---

### 4. 지금 결정할 것

1. queue.ndjson 각 entry 의 구체 필드 스키마 (id, origin, tag, target, proposal_payload, status, verdict_log 등) — draft 단계에서 확정
2. lexicon v0.12.0 govern activity entry 의 정의문 (completion_criterion, decision_owner, entrypoint) 구체 문구 — draft 단계
3. commands/govern.md 의 구체 flag 명세 (--origin, --target, --verdict, --reason 등) — draft 단계
4. queue 파일 permissions 및 동시 append 시 lock 전략 — draft 단계 구현 세부

다음 중 번호로 선택해 주세요:

1. **Approve** — 이 방향과 범위에 동의합니다. Surface(화면 설계) 단계로 진행합니다.
2. **Revise** — Align Packet을 수정하고 싶습니다. 피드백을 주시면 수정 후 다시 보여드립니다. 소스는 다시 읽지 않습니다.
3. **Reject** — 이 scope를 거절하고 종료합니다.
4. **Redirect** — 소스를 다시 읽은 뒤 처음부터 재분석합니다. 소스 정보가 오래되었거나 부족한 경우에 선택하세요.

<details><summary>추가 선택지</summary>

5. **Review** — 6-Agent Panel Review를 요청합니다. 전문가 6인이 검토 후 보강된 Packet을 다시 제시합니다.

</details>

번호(1~4) 또는 자연어로 말씀해 주세요.
