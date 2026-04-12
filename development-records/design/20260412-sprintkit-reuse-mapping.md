## 1. 공통 인프라 Primitives
판정 기준: `현재 사용`은 `src/core-runtime/design/adapters/**`의 직접 import만 기록했고, 그 외는 `디자인 어댑터 직접 사용 없음.`으로 두었다.
| 코드 | 심볼 | 파일 | 목적 | 현재 사용 |
|---|---|---|---|---|
| P001 | EventInput | src/core-runtime/scope-runtime/event-pipeline.ts | 호출자가 제공하는 새 이벤트 입력 필드만 제한하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P002 | PipelineResult | src/core-runtime/scope-runtime/event-pipeline.ts | 이벤트 파이프라인 append 결과의 성공/실패 shape를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P003 | appendScopeEvent | src/core-runtime/scope-runtime/event-pipeline.ts | gate 검증, envelope 생성, event append, materialized view 갱신을 한 번에 수행하는 커널 기록 함수다. | 디자인 어댑터 직접 사용 없음. |
| P004 | buildConstraintPool | src/core-runtime/scope-runtime/constraint-pool.ts | constraint 관련 이벤트들로부터 최신 constraint pool을 재구성하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P005 | isConstraintsResolved | src/core-runtime/scope-runtime/constraint-pool.ts | constraint pool이 모두 결정되었는지 판정하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P006 | findConstraint | src/core-runtime/scope-runtime/constraint-pool.ts | constraint pool에서 constraint ID로 항목을 찾는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P007 | readEvents | src/core-runtime/scope-runtime/event-store.ts | scope event NDJSON를 읽어 이벤트 배열로 복원하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P008 | appendEvent | src/core-runtime/scope-runtime/event-store.ts | 단일 이벤트를 NDJSON event store 끝에 append하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P009 | nextRevision | src/core-runtime/scope-runtime/event-store.ts | event store의 다음 revision 번호를 계산하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P010 | makeId | src/core-runtime/scope-runtime/id.ts | prefix와 순번으로 zero-padded 식별자를 만드는 함수다. | `code-product/compile/compile.ts`가 IMPL/CHG ID를 만들 때 직접 사용한다. |
| P011 | MAX_COMPILE_RETRIES | src/core-runtime/scope-runtime/constants.ts | scope-runtime 전역 정책 숫자를 담는 상수다. | 디자인 어댑터 직접 사용 없음. |
| P012 | CONVERGENCE_THRESHOLDS | src/core-runtime/scope-runtime/constants.ts | scope-runtime 전역 정책 숫자를 담는 상수다. | 디자인 어댑터 직접 사용 없음. |
| P013 | VERDICT_LOG_DISPLAY_COUNT | src/core-runtime/scope-runtime/constants.ts | scope-runtime 전역 정책 숫자를 담는 상수다. | 디자인 어댑터 직접 사용 없음. |
| P014 | INVALIDATED_COLLAPSE_THRESHOLD | src/core-runtime/scope-runtime/constants.ts | scope-runtime 전역 정책 숫자를 담는 상수다. | 디자인 어댑터 직접 사용 없음. |
| P015 | ID_PAD | src/core-runtime/scope-runtime/constants.ts | scope-runtime 전역 정책 숫자를 담는 상수다. | 디자인 어댑터 직접 사용 없음. |
| P016 | EXPLORATION_SUMMARY_THRESHOLD | src/core-runtime/scope-runtime/constants.ts | scope-runtime 전역 정책 숫자를 담는 상수다. | 디자인 어댑터 직접 사용 없음. |
| P017 | MAX_EXPLORATION_ROUNDS | src/core-runtime/scope-runtime/constants.ts | scope-runtime 전역 정책 숫자를 담는 상수다. | 디자인 어댑터 직접 사용 없음. |
| P018 | reduce | src/core-runtime/scope-runtime/reducer.ts | 이벤트 시퀀스로부터 현재 ScopeState를 순수하게 계산하는 reducer다. | 디자인 어댑터 직접 사용 없음. |
| P019 | canTransition | src/core-runtime/scope-runtime/state-machine.ts | 상태 전이 허용 여부와 다음 상태를 계산하는 state-machine API다. | 디자인 어댑터 직접 사용 없음. |
| P020 | canApplyGlobal | src/core-runtime/scope-runtime/state-machine.ts | 상태 전이 허용 여부와 다음 상태를 계산하는 state-machine API다. | 디자인 어댑터 직접 사용 없음. |
| P021 | canApplyObservational | src/core-runtime/scope-runtime/state-machine.ts | 상태 전이 허용 여부와 다음 상태를 계산하는 state-machine API다. | 디자인 어댑터 직접 사용 없음. |
| P022 | resolveTransition | src/core-runtime/scope-runtime/state-machine.ts | 상태 전이 허용 여부와 다음 상태를 계산하는 state-machine API다. | 디자인 어댑터 직접 사용 없음. |
| P023 | allowedTransitionEvents | src/core-runtime/scope-runtime/state-machine.ts | 상태 전이 허용 여부와 다음 상태를 계산하는 state-machine API다. | 디자인 어댑터 직접 사용 없음. |
| P024 | contentHash | src/core-runtime/scope-runtime/hash.ts | 문자열이나 버퍼를 SHA-256 해시로 바꾸는 함수다. | `code-product/compile/compile.ts`가 build spec, delta set, validation plan, brownfield detail 해시 생성에 직접 사용한다. |
| P025 | ACTOR_MAPPING | src/core-runtime/scope-runtime/gate-guard.ts | 이벤트 타입별 허용 actor 집합을 정의한 상수다. | 디자인 어댑터 직접 사용 없음. |
| P026 | GateResult | src/core-runtime/scope-runtime/gate-guard.ts | gate-guard 검증 성공/실패 결과 shape를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P027 | GateOptions | src/core-runtime/scope-runtime/gate-guard.ts | event validation에 전달되는 선택적 gate 옵션 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P028 | validateEvent | src/core-runtime/scope-runtime/gate-guard.ts | 상태 전이, 참조 무결성, 재시도 한도 등을 검사해 이벤트를 허용/거부하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P029 | ScopePaths | src/core-runtime/scope-runtime/scope-manager.ts | scope 디렉터리의 표준 경로 묶음을 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P030 | resolveScopePaths | src/core-runtime/scope-runtime/scope-manager.ts | scope ID로 표준 파일/디렉터리 경로를 계산하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P031 | normalizeProjectName | src/core-runtime/scope-runtime/scope-manager.ts | 프로젝트 이름을 scope ID에 쓸 slug로 정규화하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P032 | generateScopeId | src/core-runtime/scope-runtime/scope-manager.ts | 프로젝트명과 날짜 기반의 다음 scope ID를 생성하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P033 | BriefSourceEntry | src/core-runtime/scope-runtime/scope-manager.ts | brief 템플릿에 들어가는 source 요약 항목 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P034 | generateBriefTemplate | src/core-runtime/scope-runtime/scope-manager.ts | 입력 brief.md 기본 템플릿을 생성하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P035 | createScope | src/core-runtime/scope-runtime/scope-manager.ts | scope 디렉터리와 기본 하위 구조를 생성하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P036 | STATES | src/core-runtime/scope-runtime/types.ts | scope-runtime 상태/이벤트 집합을 고정하는 상수다. | 디자인 어댑터 직접 사용 없음. |
| P037 | State | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P038 | TERMINAL_STATES | src/core-runtime/scope-runtime/types.ts | scope-runtime 상태/이벤트 집합을 고정하는 상수다. | 디자인 어댑터 직접 사용 없음. |
| P039 | TRANSITION_EVENT_TYPES | src/core-runtime/scope-runtime/types.ts | scope-runtime 상태/이벤트 집합을 고정하는 상수다. | 디자인 어댑터 직접 사용 없음. |
| P040 | TransitionEventType | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P041 | GLOBAL_EVENT_TYPES | src/core-runtime/scope-runtime/types.ts | scope-runtime 상태/이벤트 집합을 고정하는 상수다. | 디자인 어댑터 직접 사용 없음. |
| P042 | GlobalEventType | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P043 | OBSERVATIONAL_EVENT_TYPES | src/core-runtime/scope-runtime/types.ts | scope-runtime 상태/이벤트 집합을 고정하는 상수다. | 디자인 어댑터 직접 사용 없음. |
| P044 | ObservationalEventType | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P045 | EventType | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P046 | Actor | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P047 | Perspective | src/core-runtime/scope-runtime/types.ts | constraint와 grounding에서 쓰는 3축 perspective 타입이다. | `code-product/compile/compile.ts`가 constraint 관점 타입으로 직접 사용한다. |
| P048 | Severity | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P049 | DecisionOwner | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P050 | ConstraintDecision | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P051 | DiscoveryStage | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P052 | AssumptionStatus | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P053 | FeedbackClassification | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P054 | EntryMode | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P055 | SurfaceType | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P056 | SourceEntry | src/core-runtime/scope-runtime/types.ts | 지원하는 grounding source 설정 엔트리의 유니온 타입이다. | `code-product/parsers/brief-parser.ts`가 추가 source 파싱 결과 타입으로 직접 사용한다. |
| P057 | SourceType | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P058 | sourceKey | src/core-runtime/scope-runtime/types.ts | source 엔트리를 안정적인 문자열 key로 정규화하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P059 | BrownfieldFileEntry | src/core-runtime/scope-runtime/types.ts | brownfield context의 개별 항목 shape를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P060 | BrownfieldDepEntry | src/core-runtime/scope-runtime/types.ts | brownfield context의 개별 항목 shape를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P061 | BrownfieldApiEntry | src/core-runtime/scope-runtime/types.ts | brownfield context의 개별 항목 shape를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P062 | BrownfieldSchemaEntry | src/core-runtime/scope-runtime/types.ts | brownfield context의 개별 항목 shape를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P063 | BrownfieldConfigEntry | src/core-runtime/scope-runtime/types.ts | brownfield context의 개별 항목 shape를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P064 | BrownfieldContext | src/core-runtime/scope-runtime/types.ts | brownfield Tier 1/2 요약 컨텍스트 구조를 정의하는 타입이다. | `code-product/compile/compile.ts`와 `compile-defense.ts`가 brownfield 입력 타입으로 직접 사용한다. |
| P065 | BrownfieldEnumDef | src/core-runtime/scope-runtime/types.ts | brownfield 상세 문서에 포함될 보조 정의 shape를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P066 | BrownfieldInvariant | src/core-runtime/scope-runtime/types.ts | brownfield 상세 문서에 포함될 보조 정의 shape를 정의하는 타입이다. | `code-product/compile/compile-defense.ts`가 brownfield invariant 타입으로 직접 사용한다. |
| P067 | BrownfieldDetail | src/core-runtime/scope-runtime/types.ts | brownfield 상세 artifact 전체 구조를 정의하는 타입이다. | `code-product/compile/compile.ts`와 `compile-defense.ts`가 brownfield detail 타입으로 직접 사용한다. |
| P068 | BrownfieldDetailSection | src/core-runtime/scope-runtime/types.ts | brownfield 상세 artifact의 섹션 단위 shape를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P069 | ValidationPlanEntry | src/core-runtime/scope-runtime/types.ts | validation plan 기본 항목의 최소 필드를 정의하는 타입이다. | `code-product/compile/compile-defense.ts`가 validation plan 엔트리 타입을 재수출하면서 직접 사용한다. |
| P070 | ValidationPlanItem | src/core-runtime/scope-runtime/types.ts | validation plan의 실행 가능한 상세 항목 shape를 정의하는 타입이다. | `code-product/compile/compile-defense.ts`와 `validators/validate.ts`가 validation plan 타입으로 직접 사용한다. |
| P071 | RealitySnapshot | src/core-runtime/scope-runtime/types.ts | grounding 완료 시점의 source hash 스냅샷 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P072 | formatPerspective | src/core-runtime/scope-runtime/types.ts | 내부 perspective 식별자를 사람이 읽는 라벨로 바꾸는 함수다. | `code-product/compile/compile.ts`가 perspective 라벨 렌더링에 직접 사용한다. |
| P073 | ValidationResult | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | `validators/validate.ts`가 최종 validation verdict 타입으로 직접 사용한다. |
| P074 | ScopeCreatedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P075 | ScopeClosedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P076 | ScopeDeferredPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P077 | ScopeRejectedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P078 | InputAttachedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P079 | GroundingStartedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P080 | GroundingCompletedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P081 | SnapshotMarkedStalePayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P082 | AlignProposedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P083 | AlignRevisedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P084 | AlignLockedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P085 | RedirectToGroundingPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P086 | RedirectToAlignPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P087 | SurfaceChangeRequiredPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P088 | SurfaceGeneratedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P089 | SurfaceRevisionRequestedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P090 | SurfaceRevisionAppliedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P091 | SurfaceConfirmedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P092 | EvidenceStatus | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P093 | isEvidenceUnverified | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | `code-product/compile/compile-defense.ts`가 미검증 증거 경고 판정에 직접 사용한다. |
| P094 | isPolicyChangeRequired | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | `code-product/compile/compile.ts`가 정책 변경 필요 constraint 필터링에 직접 사용한다. |
| P095 | ConstraintDiscoveredPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P096 | ConstraintDecisionRecordedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P097 | ConstraintClarifyRequestedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P098 | ConstraintClarifyResolvedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P099 | ConstraintEvidenceUpdatedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P100 | ConstraintInvalidatedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P101 | TargetLockedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P102 | CompileStartedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P103 | CompileCompletedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P104 | CompileConstraintGapFoundPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P105 | ApplyStartedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P106 | ApplyCompletedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P107 | ApplyDecisionGapFoundPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P108 | ValidationStartedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P109 | ValidationItemResult | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | `validators/validate.ts`가 validation 결과 배열 타입으로 직접 사용한다. |
| P110 | ValidationCompletedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P111 | FeedbackClassifiedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P112 | ConvergenceWarningPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P113 | ConvergenceDiagnosisPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P114 | ConvergenceBlockedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P115 | ConvergenceActionTakenPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P116 | DraftPacketRenderedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P117 | PrdRenderedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P118 | PreApplyReviewVerdict | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P119 | PreApplyReviewFinding | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P120 | PreApplyReviewCompletedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P121 | PrdReviewPerspective | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P122 | PrdReviewVerdict | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P123 | PrdReviewFinding | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P124 | PrdReviewCompletedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P125 | ExplorationStartedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P126 | ExplorationRoundCompletedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P127 | ExplorationPhaseTransitionedPayload | src/core-runtime/scope-runtime/types.ts | 각 이벤트 타입이 요구하는 payload 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P128 | PayloadMap | src/core-runtime/scope-runtime/types.ts | 이벤트 타입과 payload 타입의 대응표를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P129 | Event | src/core-runtime/scope-runtime/types.ts | event envelope 전체 구조를 정의하는 판별 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P130 | ConstraintStatus | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P131 | ConstraintEntry | src/core-runtime/scope-runtime/types.ts | constraint pool 안의 단일 constraint 레코드 구조를 정의하는 타입이다. | `code-product/compile/compile.ts`와 `compile-defense.ts`가 constraint 레코드 타입으로 직접 사용한다. |
| P132 | ConstraintPool | src/core-runtime/scope-runtime/types.ts | constraint 목록과 요약 카운터를 담는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P133 | VerdictLogEntry | src/core-runtime/scope-runtime/types.ts | scope verdict log에 남기는 레코드 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P134 | ScopeState | src/core-runtime/scope-runtime/types.ts | reducer가 산출하는 현재 scope 상태 구조를 정의하는 타입이다. | `compile.ts`, `compile-defense.ts`, `validators/validate.ts`가 상태 입력 타입으로 직접 사용한다. |
| P135 | AlignPacketContent | src/core-runtime/scope-runtime/types.ts | align packet 렌더링 입력 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P136 | ConstraintDetailPO | src/core-runtime/scope-runtime/types.ts | draft packet의 constraint detail 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P137 | ConstraintDetailBuilder | src/core-runtime/scope-runtime/types.ts | draft packet의 constraint detail 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P138 | ConstraintDetail | src/core-runtime/scope-runtime/types.ts | draft packet의 constraint detail 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P139 | DraftPacketContent | src/core-runtime/scope-runtime/types.ts | draft packet 렌더링 입력 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P140 | TransitionKind | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P141 | TransitionResult | src/core-runtime/scope-runtime/types.ts | 상태 전이 검사 결과의 개별 shape를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P142 | TransitionDenied | src/core-runtime/scope-runtime/types.ts | 상태 전이 검사 결과의 개별 shape를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P143 | TransitionOutcome | src/core-runtime/scope-runtime/types.ts | scope-runtime에서 쓰는 문자열 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P144 | scanVault | src/core-runtime/readers/scan-vault.ts | Obsidian vault를 scanDirectory 기반으로 스캔하고 key를 vault 형식으로 다시 쓰는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P145 | isBinaryFile | src/core-runtime/readers/file-utils.ts | 로컬 파일 트리 순회와 디렉터리 해시 계산을 위한 파일 유틸리티 함수다. | 디자인 어댑터 직접 사용 없음. |
| P146 | loadGitignorePatterns | src/core-runtime/readers/file-utils.ts | 로컬 파일 트리 순회와 디렉터리 해시 계산을 위한 파일 유틸리티 함수다. | 디자인 어댑터 직접 사용 없음. |
| P147 | normalizePath | src/core-runtime/readers/file-utils.ts | 로컬 파일 트리 순회와 디렉터리 해시 계산을 위한 파일 유틸리티 함수다. | 디자인 어댑터 직접 사용 없음. |
| P148 | WalkOptions | src/core-runtime/readers/file-utils.ts | 디렉터리 순회 시 제외 규칙을 넘기는 옵션 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P149 | walkDirectory | src/core-runtime/readers/file-utils.ts | 로컬 파일 트리 순회와 디렉터리 해시 계산을 위한 파일 유틸리티 함수다. | 디자인 어댑터 직접 사용 없음. |
| P150 | computeHashFromEntries | src/core-runtime/readers/file-utils.ts | 로컬 파일 트리 순회와 디렉터리 해시 계산을 위한 파일 유틸리티 함수다. | 디자인 어댑터 직접 사용 없음. |
| P151 | computeDirectoryHash | src/core-runtime/readers/file-utils.ts | 로컬 파일 트리 순회와 디렉터리 해시 계산을 위한 파일 유틸리티 함수다. | 디자인 어댑터 직접 사용 없음. |
| P152 | computeDirectoryHashFromMap | src/core-runtime/readers/file-utils.ts | 로컬 파일 트리 순회와 디렉터리 해시 계산을 위한 파일 유틸리티 함수다. | 디자인 어댑터 직접 사용 없음. |
| P153 | OntologyIndex | src/core-runtime/readers/ontology-index.ts | ontology YAML 3종을 파싱한 인메모리 lookup index 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P154 | ValueFilter | src/core-runtime/readers/ontology-index.ts | ontology index 내부 항목의 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P155 | GlossaryEntry | src/core-runtime/readers/ontology-index.ts | ontology index 내부 항목의 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P156 | Precondition | src/core-runtime/readers/ontology-index.ts | ontology index 내부 항목의 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P157 | ActionEntry | src/core-runtime/readers/ontology-index.ts | ontology index 내부 항목의 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P158 | TransitionGuard | src/core-runtime/readers/ontology-index.ts | ontology index 내부 항목의 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P159 | TransitionEntry | src/core-runtime/readers/ontology-index.ts | ontology index 내부 항목의 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P160 | buildOntologyIndex | src/core-runtime/readers/ontology-index.ts | glossary/actions/transitions YAML 문자열을 ontology index로 조립하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P161 | figmaSourceHashKey | src/core-runtime/readers/figma-adapter.ts | figma source용 source_hash key를 만드는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P162 | figmaSourceHash | src/core-runtime/readers/figma-adapter.ts | figma lastModified를 source_hash entry로 감싸는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P163 | DetectPatternsResult | src/core-runtime/readers/patterns/index.ts | pattern detector가 반환할 카테고리별 결과 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P164 | detectPatterns | src/core-runtime/readers/patterns/index.ts | 현재는 모든 패턴 카테고리를 빈 배열로 돌려주는 stub detector다. | 디자인 어댑터 직접 사용 없음. |
| P165 | ResolvedLocation | src/core-runtime/readers/ontology-resolve.ts | ontology source_code 참조를 실제 파일로 풀어낸 결과 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P166 | resolveCodeLocations | src/core-runtime/readers/ontology-resolve.ts | ontology의 자연어 source_code 참조를 파일 경로 후보로 해석하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P167 | ValueFilterResult | src/core-runtime/readers/ontology-query.ts | ontology query 결과와 그 하위 항목 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P168 | OntologyQueryResult | src/core-runtime/readers/ontology-query.ts | ontology query 결과와 그 하위 항목 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P169 | CodeLocation | src/core-runtime/readers/ontology-query.ts | ontology query 결과와 그 하위 항목 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P170 | ActionSummary | src/core-runtime/readers/ontology-query.ts | ontology query 결과와 그 하위 항목 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P171 | TransitionSummary | src/core-runtime/readers/ontology-query.ts | ontology query 결과와 그 하위 항목 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P172 | queryOntology | src/core-runtime/readers/ontology-query.ts | 키워드로 ontology index를 조회해 관련 entity, action, transition, code location을 모으는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P173 | SourceEntry | src/core-runtime/readers/types.ts | kernel SourceEntry 타입을 readers 표면으로 다시 노출하는 재수출 심볼이다. | 디자인 어댑터 직접 사용 없음. |
| P174 | sourceKey | src/core-runtime/readers/types.ts | kernel sourceKey 함수를 readers 표면으로 다시 노출하는 재수출 심볼이다. | 디자인 어댑터 직접 사용 없음. |
| P175 | ScanResult | src/core-runtime/readers/types.ts | scan 결과 전체 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P176 | FileEntry | src/core-runtime/readers/types.ts | scan된 파일의 경로/분류/언어/크기 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P177 | DepEdge | src/core-runtime/readers/types.ts | scan이 수집하는 패턴/문서 구조 항목의 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P178 | ApiPattern | src/core-runtime/readers/types.ts | scan이 수집하는 패턴/문서 구조 항목의 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P179 | SchemaPattern | src/core-runtime/readers/types.ts | scan이 수집하는 패턴/문서 구조 항목의 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P180 | ConfigPattern | src/core-runtime/readers/types.ts | scan이 수집하는 패턴/문서 구조 항목의 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P181 | DocStructure | src/core-runtime/readers/types.ts | scan이 수집하는 패턴/문서 구조 항목의 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P182 | PatternResult | src/core-runtime/readers/types.ts | pattern detector가 반환할 개별 패턴 항목의 유니온 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P183 | PatternDetector | src/core-runtime/readers/types.ts | content 기반 detector 구현이 따라야 할 인터페이스다. | 디자인 어댑터 직접 사용 없음. |
| P184 | toGroundingSource | src/core-runtime/readers/types.ts | SourceEntry를 grounding.started payload 형식으로 정규화하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P185 | emptyScanResult | src/core-runtime/readers/types.ts | 비어 있는 ScanResult 기본값을 만드는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P186 | ScanSkipped | src/core-runtime/readers/types.ts | ETag 304 cache hit으로 스캔을 생략한 결과 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P187 | isScanSkipped | src/core-runtime/readers/types.ts | scan 결과가 ScanSkipped인지 판별하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P188 | ScanError | src/core-runtime/readers/types.ts | scan 실패를 표현하는 에러 결과 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P189 | isScanError | src/core-runtime/readers/types.ts | scan 결과가 ScanError인지 판별하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P190 | CoverageGap | src/core-runtime/readers/code-chunk-collector.ts | 관련 코드 수집 후 남는 coverage gap 기록 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P191 | RelevantCodeChunks | src/core-runtime/readers/code-chunk-collector.ts | 6-viewpoint 코드 청크 묶음과 탐색 신뢰도 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P192 | CollectOptions | src/core-runtime/readers/code-chunk-collector.ts | 코드 청크 수집기의 max chunk 등 옵션 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P193 | collectRelevantChunks | src/core-runtime/readers/code-chunk-collector.ts | 6개 viewpoint collector 결과를 합쳐 관련 코드 청크 묶음을 만드는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P194 | buildBrownfield | src/core-runtime/readers/brownfield-builder.ts | scan 결과를 brownfield context/detail artifact 두 종류로 변환하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P195 | scanLocal | src/core-runtime/readers/scan-local.ts | 로컬 파일 또는 디렉터리를 스캔해 ScanResult를 만드는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P196 | scanDirectory | src/core-runtime/readers/scan-local.ts | 디렉터리 전체를 순회하며 패턴과 content hash를 수집하는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P197 | resolveGitHubToken | src/core-runtime/readers/scan-tarball.ts | GitHub tarball 다운로드용 토큰을 환경변수나 gh CLI에서 찾는 함수다. | 디자인 어댑터 직접 사용 없음. |
| P198 | CollectionViewpoint | src/core-runtime/readers/viewpoint-collectors.ts | 코드 청크 수집기가 지원하는 6개 viewpoint ID 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P199 | CodeChunk | src/core-runtime/readers/viewpoint-collectors.ts | viewpoint별 코드 청크와 search hint 구조를 정의하는 타입이다. | 디자인 어댑터 직접 사용 없음. |
| P200 | collectSemantics | src/core-runtime/readers/viewpoint-collectors.ts | 특정 viewpoint 관점에 맞는 코드 청크만 추려내는 collector 함수다. | 디자인 어댑터 직접 사용 없음. |
| P201 | collectDependency | src/core-runtime/readers/viewpoint-collectors.ts | 특정 viewpoint 관점에 맞는 코드 청크만 추려내는 collector 함수다. | 디자인 어댑터 직접 사용 없음. |
| P202 | collectLogic | src/core-runtime/readers/viewpoint-collectors.ts | 특정 viewpoint 관점에 맞는 코드 청크만 추려내는 collector 함수다. | 디자인 어댑터 직접 사용 없음. |
| P203 | collectStructure | src/core-runtime/readers/viewpoint-collectors.ts | 특정 viewpoint 관점에 맞는 코드 청크만 추려내는 collector 함수다. | 디자인 어댑터 직접 사용 없음. |
| P204 | collectPragmatics | src/core-runtime/readers/viewpoint-collectors.ts | 특정 viewpoint 관점에 맞는 코드 청크만 추려내는 collector 함수다. | 디자인 어댑터 직접 사용 없음. |
| P205 | collectEvolution | src/core-runtime/readers/viewpoint-collectors.ts | 특정 viewpoint 관점에 맞는 코드 청크만 추려내는 collector 함수다. | 디자인 어댑터 직접 사용 없음. |
## 2. B축 요구사항
- B-1-1: 9개 lens를 병렬·독립 실행하고 각 lens 입력/출력을 계약된 단위로 유지해야 한다. 출처: `processes/build.md` Lens/Boundary 원칙 + `roles/*.md` 개별 lens 정의.
- B-1-2: `axiology`만 New Perspectives를 제안하고 `synthesize`는 기존 lens 결과를 보존적으로 종합해야 한다. 출처: `roles/axiology.md`, `roles/synthesize.md`.
- B-2-1: Build coordinator는 patch 적용, certainty 재분류, 수렴 판단, epsilon 전처리를 결정론적으로 수행해야 한다. 출처: `processes/build.md` + `project_build_coordinator_redesign.md`.
- B-2-2: 규칙 해소 불가 충돌은 익명화한 뒤 fresh-context Axiology Adjudicator로 보내고, 해소 완료 material만 synthesize로 넘겨야 한다. 출처: `processes/build.md` + `project_build_coordinator_redesign.md`.
- B-3-1: Harness self-review는 새 엔진을 만들지 않고 기존 9-lens review 메커니즘을 harness 파일에 재사용해야 한다. 출처: `project_harness_self_review.md`.
- B-3-2: Harness review/수정은 격리 session, conflict 체크, 지연 큐, 실행 전 drift 재검증을 따라야 한다. 출처: `project_harness_self_review.md` 자동화 요구사항.
- B-3-3: Stage 3+는 no-domain fallback, evidence/provenance, boundary/degradation, discoverability, authority/lineage gate를 메꿔야 한다. 출처: `project_harness_self_review.md` self-review findings + `project_roles_refactor_v3_backlog.md` BL-1/BL-2/BL-4/BL-5.
## 3. 매핑 매트릭스
열은 `P001`~`P205`이며, 세부 심볼은 1절 표를 참조한다. 기본값은 `확인 불가`로 두고, 코드에서 직접 확인되는 재사용/명백한 불일치만 예외 처리했다.
|요구사항|P001|P002|P003|P004|P005|P006|P007|P008|P009|P010|P011|P012|P013|P014|P015|P016|P017|P018|P019|P020|P021|P022|P023|P024|P025|P026|P027|P028|P029|P030|P031|P032|P033|P034|P035|P036|P037|P038|P039|P040|P041|P042|P043|P044|P045|P046|P047|P048|P049|P050|P051|P052|P053|P054|P055|P056|P057|P058|P059|P060|P061|P062|P063|P064|P065|P066|P067|P068|P069|P070|P071|P072|P073|P074|P075|P076|P077|P078|P079|P080|P081|P082|P083|P084|P085|P086|P087|P088|P089|P090|P091|P092|P093|P094|P095|P096|P097|P098|P099|P100|P101|P102|P103|P104|P105|P106|P107|P108|P109|P110|P111|P112|P113|P114|P115|P116|P117|P118|P119|P120|P121|P122|P123|P124|P125|P126|P127|P128|P129|P130|P131|P132|P133|P134|P135|P136|P137|P138|P139|P140|P141|P142|P143|P144|P145|P146|P147|P148|P149|P150|P151|P152|P153|P154|P155|P156|P157|P158|P159|P160|P161|P162|P163|P164|P165|P166|P167|P168|P169|P170|P171|P172|P173|P174|P175|P176|P177|P178|P179|P180|P181|P182|P183|P184|P185|P186|P187|P188|P189|P190|P191|P192|P193|P194|P195|P196|P197|P198|P199|P200|P201|P202|P203|P204|P205|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|B-1-1|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|확인 불가|어댑터 추가|어댑터 추가|확인 불가|확인 불가|확인 불가|어댑터 추가|어댑터 추가|어댑터 추가|어댑터 추가|어댑터 추가|어댑터 추가|
|B-1-2|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|신규 설계 필요|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|신규 설계 필요|신규 설계 필요|신규 설계 필요|신규 설계 필요|신규 설계 필요|신규 설계 필요|
|B-2-1|확인 불가|확인 불가|어댑터 추가|재사용 그대로|재사용 그대로|재사용 그대로|어댑터 추가|확인 불가|어댑터 추가|재사용 그대로|어댑터 추가|어댑터 추가|확인 불가|확인 불가|확인 불가|어댑터 추가|어댑터 추가|재사용 그대로|어댑터 추가|어댑터 추가|어댑터 추가|어댑터 추가|어댑터 추가|재사용 그대로|어댑터 추가|확인 불가|확인 불가|어댑터 추가|확인 불가|어댑터 추가|확인 불가|어댑터 추가|확인 불가|어댑터 추가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|어댑터 추가|어댑터 추가|어댑터 추가|확인 불가|재사용 그대로|재사용 그대로|재사용 그대로|재사용 그대로|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|재사용 그대로|어댑터 추가|어댑터 추가|확인 불가|신규 설계 필요|확인 불가|재사용 그대로|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|재사용 그대로|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|재사용 그대로|어댑터 추가|확인 불가|어댑터 추가|확인 불가|어댑터 추가|확인 불가|확인 불가|확인 불가|어댑터 추가|재사용 그대로|재사용 그대로|재사용 그대로|어댑터 추가|확인 불가|확인 불가|어댑터 추가|어댑터 추가|어댑터 추가|어댑터 추가|어댑터 추가|어댑터 추가|
|B-2-2|확인 불가|확인 불가|신규 설계 필요|어댑터 추가|어댑터 추가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|신규 설계 필요|신규 설계 필요|신규 설계 필요|신규 설계 필요|신규 설계 필요|신규 설계 필요|어댑터 추가|신규 설계 필요|확인 불가|확인 불가|신규 설계 필요|확인 불가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|
|B-3-1|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|재사용 그대로|어댑터 추가|어댑터 추가|어댑터 추가|확인 불가|재사용 그대로|어댑터 추가|재사용 그대로|재사용 그대로|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|재사용 그대로|어댑터 추가|어댑터 추가|확인 불가|신규 설계 필요|확인 불가|재사용 그대로|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|재사용 그대로|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|재사용 그대로|어댑터 추가|확인 불가|어댑터 추가|확인 불가|어댑터 추가|확인 불가|확인 불가|확인 불가|어댑터 추가|어댑터 추가|재사용 그대로|재사용 그대로|어댑터 추가|확인 불가|확인 불가|어댑터 추가|어댑터 추가|어댑터 추가|어댑터 추가|어댑터 추가|어댑터 추가|
|B-3-2|확인 불가|확인 불가|재사용 그대로|어댑터 추가|어댑터 추가|어댑터 추가|재사용 그대로|확인 불가|어댑터 추가|확인 불가|어댑터 추가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|재사용 그대로|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|재사용 그대로|어댑터 추가|확인 불가|확인 불가|어댑터 추가|확인 불가|재사용 그대로|확인 불가|확인 불가|확인 불가|확인 불가|재사용 그대로|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|재사용 그대로|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|재사용 그대로|어댑터 추가|어댑터 추가|어댑터 추가|확인 불가|재사용 그대로|어댑터 추가|재사용 그대로|재사용 그대로|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|재사용 그대로|재사용 그대로|확인 불가|확인 불가|확인 불가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|재사용 그대로|어댑터 추가|확인 불가|재사용 그대로|확인 불가|재사용 그대로|확인 불가|확인 불가|확인 불가|어댑터 추가|어댑터 추가|재사용 그대로|재사용 그대로|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|
|B-3-3|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|어댑터 추가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|어댑터 추가|어댑터 추가|확인 불가|신규 설계 필요|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|신규 설계 필요|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|확인 불가|신규 설계 필요|신규 설계 필요|신규 설계 필요|신규 설계 필요|신규 설계 필요|신규 설계 필요|
## 4. 신규 설계 필요 영역
- (B-1-2 × P193, P200, P201, P202, P203, P204, P205): `collectRelevantChunks`와 6-viewpoint collectors는 semantics~evolution만 다루며, `axiology` 전용 New Perspectives slot이나 `synthesize`의 보존 규칙을 표현할 seat가 없다.
- (B-2-1 × P164): `detectPatterns`는 현재 모든 카테고리를 빈 배열로 반환하는 stub이라서 build coordinator가 요구하는 structural recognition 입력을 충분히 만들지 못한다.
- (B-2-2 × P003, P018, P019, P020, P021, P022, P023, P025, P028): 현재 scope runtime stack은 design scope 전이와 gate 검증만 모델링하며, `awaiting_adjudication`, 출처 익명화, fresh-context adjudicator handoff, adjudication result seat를 갖고 있지 않다.
- (B-3-1 × P164): Harness 파일을 기존 review 메커니즘으로 재사용하려면 최소한의 구조/패턴 추출이 필요하지만, 현재 detector는 모든 패턴을 비워서 반환한다.
- (B-3-3 × P164, P193, P200, P201, P202, P203, P204, P205): Stage 3+의 no-domain fallback, provenance/evidence, boundary/degradation, discoverability, authority/lineage gate는 현재 collector 체인에 표현되지 않으며, 기존 6-viewpoint 체인만으로는 해당 규약을 판정할 수 없다.
## 5. 결론
- B-1 재사용률: 4% — 일부 입력 수집기는 전용 adapter로 돌릴 수 있지만, 9-lens canonical semantics 자체는 별도 설계가 더 크다.
- B-2 재사용률: 14% — deterministic coordinator의 하위 조각은 꽤 재활용 가능하지만 adjudication handoff 상태는 새 설계가 필요하다.
- B-3 재사용률: 12% — harness 파일 스캔과 drift 관리 쪽은 재사용 폭이 있지만, stage 3+ 계약 갭은 collector 체인 바깥에서 메워야 한다.
