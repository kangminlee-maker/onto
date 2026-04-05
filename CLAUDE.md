# CLAUDE.md

## 개발 원칙

이 레포에서 작업할 때 아래 두 문서를 항상 참조한다.

1. `dev-docs/ontology-as-code-guideline.md` — Ontology as Code 원칙. 개념→계약→artifact→타입→구현의 일관성, LLM/runtime 소유 분리, prompt path와 implementation path의 artifact truth 일치.
2. `dev-docs/llm-native-development-guideline.md` — LLM-Native 개발 원칙. LLM/runtime/script 3계층 역할 분리, 의사결정 프레임(3-질문), Script-First Automation, semantic quality 우선.

## 작업 기준

- 새 기능을 만들기 전에 `ontology-as-code-guideline.md` Section 13 (Practical Checklist)을 점검한다.
- 작업을 어디에 놓을지 결정할 때 `llm-native-development-guideline.md`의 의사결정 프레임(3-질문)을 따른다.
- runtime이 semantic 판단을 먹고 있지 않은지 항상 확인한다.

## Authority 순서

1. `authority/core-lexicon.yaml`
2. `dev-docs/ontology-as-code-guideline.md`, `dev-docs/llm-native-development-guideline.md`
3. `dev-docs/productization-charter.md`, `dev-docs/development-methodology.md`
4. `dev-docs/llm-runtime-interface-principles.md`
5. 개별 contract 문서 (`dev-docs/review-*.md`)
6. TypeScript type/interface (`src/core-runtime/review/artifact-types.ts`)
7. runtime CLI 구현 (`src/core-runtime/cli/*.ts`)
