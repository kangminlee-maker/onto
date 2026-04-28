/**
 * Entry mode routing — single SSOT for surface/path/message lookup per entry_mode.
 *
 * post-PR #246 R1 review (evolution + conciseness lens 권고): process-mode
 * routing 이 *multiple consumers* (`draft.ts:handleGenerateSurface`,
 * `renderers/scope-md.ts:nextAction`, `adapters/code-product/compile/compile.ts`)
 * 에 분산되어 있었음. 향후 mode 추가 (예: architecture / policy) 시 multi-file
 * 동시 편집이 강제되어 silent drift 위험. 본 모듈이 단일 SSOT 로 흡수.
 *
 * 1. What it is — EntryMode 별 surface 경로 / 안내 메시지 / runtime-written
 *    skeleton 여부의 매핑 테이블.
 * 2. Why it exists — 분산된 3-way ternary 가 향후 mode 확장 시 silent drift
 *    위험을 만듦. 단일 SSOT 로 lookup 패턴 강제.
 * 3. How it relates — draft.ts 가 surface 생성 시 lookup, scope-md.ts 가
 *    next-action 메시지 lookup, compile.ts 가 surface 경로 fallback lookup.
 *    consumer 추가 시 본 모듈만 확장하면 됨.
 */
const ENTRY_MODE_ROUTING = {
    experience: {
        surfaceSubpath: "preview/",
        surfaceLabel: "surface/preview/",
        guideMessageAfterGeneration: "`cd surface/preview && npm run dev`로 mockup을 확인하세요.",
        nextActionAlignLocked: "방향이 확정되었습니다. 화면 설계를 시작하세요 (`/draft`를 실행하세요)",
        nextActionSurfaceIterating: "mockup을 확인하세요 (`cd surface/preview && npm run dev`). 수정이 필요하면 피드백을, 맞으면 '확정합니다'라고 말씀하세요",
        hasRuntimeWrittenSkeleton: false,
    },
    interface: {
        surfaceSubpath: "contract-diff/",
        surfaceLabel: "surface/contract-diff/",
        guideMessageAfterGeneration: "`surface/contract-diff/`의 API 명세를 확인하세요.",
        nextActionAlignLocked: "방향이 확정되었습니다. API 명세 설계를 시작하세요 (`/draft`를 실행하세요)",
        nextActionSurfaceIterating: "API 명세를 확인하세요 (`surface/contract-diff/`). 수정이 필요하면 피드백을, 맞으면 '확정합니다'라고 말씀하세요",
        hasRuntimeWrittenSkeleton: false,
    },
    process: {
        surfaceSubpath: "design-doc-draft.md",
        surfaceLabel: "surface/design-doc-draft.md",
        guideMessageAfterGeneration: "`surface/design-doc-draft.md`의 design 문서를 확인하세요.",
        nextActionAlignLocked: "방향이 확정되었습니다. design doc 작성을 시작하세요 (`/draft`를 실행하세요)",
        nextActionSurfaceIterating: "design doc 을 확인하세요 (`surface/design-doc-draft.md`). 수정이 필요하면 피드백을, 맞으면 '확정합니다'라고 말씀하세요",
        hasRuntimeWrittenSkeleton: true,
    },
};
/**
 * Lookup routing for an EntryMode. Total function — every EntryMode has
 * an entry. Adding a new EntryMode requires adding the routing here
 * (TypeScript exhaustiveness via Record<EntryMode, ...> 강제).
 */
export function getEntryModeRouting(mode) {
    return ENTRY_MODE_ROUTING[mode];
}
