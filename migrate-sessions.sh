#!/bin/bash
# onto-review 마이그레이션 스크립트
# 이전 버전의 런타임 데이터를 새 .onto-review/ 구조로 이동합니다.
#
# 마이그레이션 대상:
#   1. .claude/sessions/   → .onto-review/review/ 및 .onto-review/builds/
#   2. .claude/learnings/  → .onto-review/learnings/
#   3. .claude/ontology/   → .onto-review/builds/{세션ID}/
#   4. .onto-review/sessions/ 중간 계층 제거 (sessions/review/ → review/)
#   5. CLAUDE.md의 domain 설정 → .onto-review/config.yml (CLAUDE.md 비침습)
#   6. ~/.claude/agent-memory/ → ~/.onto-review/ (글로벌 데이터 분리)
#
# 사용법:
#   ./migrate-sessions.sh                # 현재 디렉토리의 프로젝트를 마이그레이션
#   ./migrate-sessions.sh /path/to/project  # 지정 프로젝트를 마이그레이션
#   ./migrate-sessions.sh --dry-run      # 실제 이동 없이 대상만 확인

set -e

# 색상
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

DRY_RUN=false
PROJECT_DIR=""

# 인자 처리
for arg in "$@"; do
    case "$arg" in
        --dry-run)
            DRY_RUN=true
            ;;
        *)
            PROJECT_DIR="$arg"
            ;;
    esac
done

# 프로젝트 디렉토리 결정
if [ -z "$PROJECT_DIR" ]; then
    PROJECT_DIR="$(pwd)"
fi

# 절대 경로로 변환
PROJECT_DIR="$(cd "$PROJECT_DIR" 2>/dev/null && pwd)" || {
    echo -e "${RED}디렉토리를 찾을 수 없습니다: $PROJECT_DIR${NC}"
    exit 1
}

NEW_DIR="$PROJECT_DIR/.onto-review"

echo ""
echo -e "${CYAN}━━━ onto-review 마이그레이션 ━━━${NC}"
echo ""
echo "프로젝트: $PROJECT_DIR"
echo ""

TOTAL_ACTIONS=0

# ─── 1단계: .claude/sessions/ → .onto-review/{프로세스}/ ───

OLD_SESSIONS="$PROJECT_DIR/.claude/sessions"

if [ -d "$OLD_SESSIONS" ]; then
    echo -e "${CYAN}[1/4] .claude/sessions/ 발견${NC}"

    for process_dir in "$OLD_SESSIONS"/*/; do
        [ -d "$process_dir" ] || continue
        process_name=$(basename "$process_dir")
        # buildfromcode → builds 변환
        [ "$process_name" = "buildfromcode" ] && process_name="builds"

        for session_dir in "$process_dir"*/; do
            [ -d "$session_dir" ] || continue
            session_id=$(basename "$session_dir")
            file_count=$(find "$session_dir" -type f | wc -l | tr -d ' ')
            echo -e "  ${process_name}/${session_id} (${file_count}개 파일)"
            ((TOTAL_ACTIONS++))

            if [ "$DRY_RUN" = false ]; then
                dst="$NEW_DIR/$process_name/$session_id"
                if [ -d "$dst" ]; then
                    # 이미 존재하면 라운드 디렉토리를 병합
                    for sub in "$session_dir"*/; do
                        [ -d "$sub" ] || continue
                        sub_name=$(basename "$sub")
                        if [ ! -d "$dst/$sub_name" ]; then
                            mv "$sub" "$dst/$sub_name"
                        fi
                    done
                else
                    mkdir -p "$(dirname "$dst")"
                    mv "$session_dir" "$dst"
                fi
                echo -e "    ${GREEN}→ .onto-review/${process_name}/${session_id}${NC}"
            fi
        done
    done

    if [ "$DRY_RUN" = false ]; then
        rm -rf "$OLD_SESSIONS"
        echo -e "  ${GREEN}.claude/sessions/ 삭제 완료${NC}"
    fi
    echo ""
else
    echo -e "[1/4] .claude/sessions/ — 없음 (건너뜀)"
    echo ""
fi

# ─── 2단계: .claude/learnings/ → .onto-review/learnings/ ───

OLD_LEARNINGS="$PROJECT_DIR/.claude/learnings"

if [ -d "$OLD_LEARNINGS" ]; then
    file_count=$(find "$OLD_LEARNINGS" -type f -name "*.md" | wc -l | tr -d ' ')
    echo -e "${CYAN}[2/4] .claude/learnings/ 발견 (${file_count}개 파일)${NC}"
    ((TOTAL_ACTIONS++))

    if [ "$DRY_RUN" = false ]; then
        mkdir -p "$NEW_DIR/learnings"
        for f in "$OLD_LEARNINGS"/*.md; do
            [ -f "$f" ] || continue
            fname=$(basename "$f")
            if [ ! -f "$NEW_DIR/learnings/$fname" ]; then
                mv "$f" "$NEW_DIR/learnings/$fname"
                echo -e "  ${GREEN}이동: $fname${NC}"
            else
                echo -e "  ${YELLOW}건너뜀: $fname (이미 존재)${NC}"
            fi
        done
        # .gitkeep 등 남은 파일 처리
        remaining=$(find "$OLD_LEARNINGS" -type f | wc -l | tr -d ' ')
        if [ "$remaining" -eq 0 ]; then
            rm -rf "$OLD_LEARNINGS"
            echo -e "  ${GREEN}.claude/learnings/ 삭제 완료${NC}"
        fi
    fi
    echo ""
else
    echo -e "[2/4] .claude/learnings/ — 없음 (건너뜀)"
    echo ""
fi

# ─── 3단계: .claude/ontology/ → .onto-review/builds/{세션ID}/ ───

OLD_ONTOLOGY="$PROJECT_DIR/.claude/ontology"

if [ -d "$OLD_ONTOLOGY" ]; then
    file_count=$(find "$OLD_ONTOLOGY" -type f | wc -l | tr -d ' ')
    echo -e "${CYAN}[3/4] .claude/ontology/ 발견 (${file_count}개 파일)${NC}"
    ((TOTAL_ACTIONS++))

    # 기존 build 세션 찾기 (가장 최근 builds 세션에 매핑)
    BUILD_SESSION=""
    if [ -d "$NEW_DIR/builds" ]; then
        BUILD_SESSION=$(ls -1 "$NEW_DIR/builds/" 2>/dev/null | sort -r | head -1)
    fi

    if [ -z "$BUILD_SESSION" ]; then
        # build 세션이 없으면 새로 생성
        BUILD_SESSION="migrated-$(date +%Y%m%d)"
        echo -e "  기존 build 세션 없음 → builds/${BUILD_SESSION}/ 생성"
    else
        echo -e "  기존 build 세션 발견 → builds/${BUILD_SESSION}/ 에 병합"
    fi

    if [ "$DRY_RUN" = false ]; then
        dst="$NEW_DIR/builds/$BUILD_SESSION"
        mkdir -p "$dst"
        for item in "$OLD_ONTOLOGY"/*; do
            [ -e "$item" ] || continue
            item_name=$(basename "$item")
            if [ ! -e "$dst/$item_name" ]; then
                mv "$item" "$dst/$item_name"
                echo -e "  ${GREEN}이동: $item_name${NC}"
            else
                echo -e "  ${YELLOW}건너뜀: $item_name (이미 존재)${NC}"
            fi
        done
        remaining=$(find "$OLD_ONTOLOGY" -type f 2>/dev/null | wc -l | tr -d ' ')
        if [ "$remaining" -eq 0 ]; then
            rm -rf "$OLD_ONTOLOGY"
            echo -e "  ${GREEN}.claude/ontology/ 삭제 완료${NC}"
        fi
    fi
    echo ""
else
    echo -e "[3/4] .claude/ontology/ — 없음 (건너뜀)"
    echo ""
fi

# ─── 4단계: .onto-review/sessions/ 중간 계층 제거 ───

OLD_SESSIONS_LAYER="$NEW_DIR/sessions"

if [ -d "$OLD_SESSIONS_LAYER" ]; then
    echo -e "${CYAN}[4/4] .onto-review/sessions/ 중간 계층 발견 — 제거합니다${NC}"
    ((TOTAL_ACTIONS++))

    for process_dir in "$OLD_SESSIONS_LAYER"/*/; do
        [ -d "$process_dir" ] || continue
        process_name=$(basename "$process_dir")
        # buildfromcode → builds 변환
        [ "$process_name" = "buildfromcode" ] && process_name="builds"
        [ "$process_name" = "build" ] && process_name="builds"

        for session_dir in "$process_dir"*/; do
            [ -d "$session_dir" ] || continue
            session_id=$(basename "$session_dir")
            echo -e "  sessions/${process_name}/${session_id}"

            if [ "$DRY_RUN" = false ]; then
                dst="$NEW_DIR/$process_name/$session_id"
                mkdir -p "$dst"
                for sub in "$session_dir"*/; do
                    [ -d "$sub" ] || continue
                    sub_name=$(basename "$sub")
                    if [ ! -d "$dst/$sub_name" ]; then
                        mv "$sub" "$dst/$sub_name"
                    fi
                done
                echo -e "    ${GREEN}→ .onto-review/${process_name}/${session_id}${NC}"
            fi
        done
    done

    if [ "$DRY_RUN" = false ]; then
        rm -rf "$OLD_SESSIONS_LAYER"
        echo -e "  ${GREEN}.onto-review/sessions/ 삭제 완료${NC}"
    fi
    echo ""
else
    echo -e "[4/4] .onto-review/sessions/ — 없음 (건너뜀)"
    echo ""
fi

# ─── 5단계: CLAUDE.md domain 설정 → .onto-review/config.yml ───

CLAUDE_MD="$PROJECT_DIR/CLAUDE.md"
CONFIG_YML="$NEW_DIR/config.yml"

if [ -f "$CLAUDE_MD" ] && [ ! -f "$CONFIG_YML" ]; then
    # CLAUDE.md에서 domain 관련 설정 추출
    DOMAIN=$(grep -E '^\s*(domain|agent-domain)\s*:' "$CLAUDE_MD" 2>/dev/null | head -1 | sed 's/.*:\s*//' | tr -d ' ')
    SECONDARY=$(grep -E '^\s*secondary_domains\s*:' "$CLAUDE_MD" 2>/dev/null | head -1 | sed 's/.*:\s*//')

    if [ -n "$DOMAIN" ]; then
        echo -e "${CYAN}[5/6] CLAUDE.md에서 도메인 설정 발견: ${DOMAIN}${NC}"
        ((TOTAL_ACTIONS++))

        if [ "$DRY_RUN" = false ]; then
            mkdir -p "$NEW_DIR"
            echo "domain: $DOMAIN" > "$CONFIG_YML"
            if [ -n "$SECONDARY" ]; then
                echo "secondary_domains: $SECONDARY" >> "$CONFIG_YML"
            fi
            echo -e "  ${GREEN}→ .onto-review/config.yml 생성 완료${NC}"
            echo -e "  ${YELLOW}CLAUDE.md의 domain/secondary_domains 줄은 수동으로 제거해 주세요.${NC}"
            echo -e "  ${YELLOW}(하위 호환: 제거하지 않아도 동작에 문제는 없습니다)${NC}"
        fi
        echo ""
    else
        echo -e "[5/6] CLAUDE.md에 도메인 설정 없음 (건너뜀)"
        echo ""
    fi
elif [ -f "$CONFIG_YML" ]; then
    echo -e "[5/6] .onto-review/config.yml 이미 존재 (건너뜀)"
    echo ""
else
    echo -e "[5/6] CLAUDE.md 없음 (건너뜀)"
    echo ""
fi

# ─── 6단계: ~/.claude/agent-memory/ → ~/.onto-review/ (글로벌 데이터) ───

OLD_GLOBAL="$HOME/.claude/agent-memory"
NEW_GLOBAL="$HOME/.onto-review"

if [ -d "$OLD_GLOBAL" ]; then
    file_count=$(find "$OLD_GLOBAL" -type f | wc -l | tr -d ' ')
    echo -e "${CYAN}[6/6] ~/.claude/agent-memory/ 발견 (${file_count}개 파일)${NC}"
    echo "  → ~/.onto-review/ 로 이동합니다."
    ((TOTAL_ACTIONS++))

    if [ "$DRY_RUN" = false ]; then
        # 하위 디렉토리별로 이동 (methodology, communication, domains)
        for subdir in "$OLD_GLOBAL"/*/; do
            [ -d "$subdir" ] || continue
            subname=$(basename "$subdir")
            dst="$NEW_GLOBAL/$subname"

            if [ -d "$dst" ]; then
                # 이미 존재하면 파일 단위로 병합 (기존 파일 덮어쓰지 않음)
                find "$subdir" -type f | while read -r srcfile; do
                    relpath="${srcfile#$subdir}"
                    dstfile="$dst/$relpath"
                    if [ ! -f "$dstfile" ]; then
                        mkdir -p "$(dirname "$dstfile")"
                        mv "$srcfile" "$dstfile"
                        echo -e "  ${GREEN}이동: $subname/$relpath${NC}"
                    else
                        echo -e "  ${YELLOW}건너뜀: $subname/$relpath (이미 존재)${NC}"
                    fi
                done
            else
                mkdir -p "$(dirname "$dst")"
                mv "$subdir" "$dst"
                echo -e "  ${GREEN}이동: $subname/${NC}"
            fi
        done

        # 빈 디렉토리 정리
        remaining=$(find "$OLD_GLOBAL" -type f 2>/dev/null | wc -l | tr -d ' ')
        if [ "$remaining" -eq 0 ]; then
            rm -rf "$OLD_GLOBAL"
            echo -e "  ${GREEN}~/.claude/agent-memory/ 삭제 완료${NC}"
        else
            echo -e "  ${YELLOW}${remaining}개 파일이 남아 있습니다. 수동 확인 필요: ~/.claude/agent-memory/${NC}"
        fi
    fi
    echo ""
else
    echo -e "[6/6] ~/.claude/agent-memory/ — 없음 (건너뜀)"
    echo ""
fi

# ─── 완료 ───

if [ $TOTAL_ACTIONS -eq 0 ]; then
    echo -e "${GREEN}마이그레이션 불필요 — 이전 버전의 데이터가 없습니다.${NC}"
else
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[dry-run] 실제 이동은 수행하지 않았습니다.${NC}"
    else
        echo -e "${GREEN}마이그레이션 완료.${NC}"
    fi
fi

echo ""
echo "최종 구조:"
echo ""
echo "  글로벌 (~/.onto-review/):"
echo "  ├── methodology/{agent-id}.md    # 방법론 학습"
echo "  ├── communication/               # 소통 학습"
echo "  └── domains/{domain}/            # 도메인 문서 + 글로벌 학습"
echo ""
echo "  프로젝트 ({project}/.onto-review/):"
echo "  ├── config.yml                   # 도메인 설정"
echo "  ├── review/{세션ID}/round1/     # review 결과"
echo "  ├── builds/{세션ID}/round0~N/   # build 결과"
echo "  └── learnings/                   # 프로젝트 수준 학습"
echo ""
