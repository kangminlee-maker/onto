#!/bin/bash
# onto 학습 저장 구조 마이그레이션 스크립트
# 이전 3경로 구조를 새 2경로 + 축 태그 모델로 변환합니다.
#
# 마이그레이션 대상:
#   1. ~/.onto/methodology/{agent-id}.md → ~/.onto/learnings/{agent-id}.md ([methodology] 태그 부착)
#   2. ~/.onto/domains/{domain}/learnings/{agent-id}.md → ~/.onto/learnings/{agent-id}.md ([domain/{domain}] 태그 부착)
#
# 사용법:
#   ./migrate-learnings.sh              # 마이그레이션 실행
#   ./migrate-learnings.sh --dry-run    # 실제 변경 없이 대상만 확인

set -e

# 색상
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

DRY_RUN=false

# 인자 처리
for arg in "$@"; do
    case "$arg" in
        --dry-run)
            DRY_RUN=true
            ;;
        *)
            echo -e "${RED}알 수 없는 인자: $arg${NC}"
            echo "사용법: ./migrate-learnings.sh [--dry-run]"
            exit 1
            ;;
    esac
done

GLOBAL_DIR="$HOME/.onto"
METHODOLOGY_DIR="$GLOBAL_DIR/methodology"
DOMAINS_DIR="$GLOBAL_DIR/domains"
LEARNINGS_DIR="$GLOBAL_DIR/learnings"
BACKUP_DIR="$GLOBAL_DIR/_backup_migration_$(date +%Y%m%d)"

echo ""
echo -e "${CYAN}━━━ 학습 저장 구조 마이그레이션 (3경로 → 2경로 + 축 태그) ━━━${NC}"
echo ""

# ─── 마이그레이션 필요 여부 확인 ───

HAS_METHODOLOGY=false
HAS_DOMAIN_LEARNINGS=false

if [ -d "$METHODOLOGY_DIR" ] && [ "$(find "$METHODOLOGY_DIR" -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')" -gt 0 ]; then
    HAS_METHODOLOGY=true
fi

if [ -d "$DOMAINS_DIR" ]; then
    for domain_dir in "$DOMAINS_DIR"/*/; do
        [ -d "$domain_dir" ] || continue
        if [ -d "${domain_dir}learnings" ] && [ "$(find "${domain_dir}learnings" -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')" -gt 0 ]; then
            HAS_DOMAIN_LEARNINGS=true
            break
        fi
    done
fi

if [ "$HAS_METHODOLOGY" = false ] && [ "$HAS_DOMAIN_LEARNINGS" = false ]; then
    echo -e "${GREEN}마이그레이션 불필요 — 이전 구조(methodology/, domains/*/learnings/)가 없습니다.${NC}"
    echo ""
    exit 0
fi

# ─── 카운터 초기화 ───

SRC_TOTAL=0
DST_TOTAL=0
METHODOLOGY_COUNT=0
DOMAIN_COUNTS=""

# ─── 아이템 수 세기 함수 (- 로 시작하는 줄) ───

count_items() {
    local file="$1"
    if [ -f "$file" ]; then
        grep -c '^\s*- ' "$file" 2>/dev/null || echo 0
    else
        echo 0
    fi
}

# ─── 태그 부착 함수 ───
# 입력: 파일 내용 (stdin), 태그
# - [사실] 내용 → - [사실] [tag] 내용
# - [판단] 내용 → - [판단] [tag] 내용
# - 내용 (태그 없음) → - [tag] 내용
# 이미 해당 태그가 있으면 건너뜀

add_axis_tag() {
    local tag="$1"
    while IFS= read -r line; do
        # 학습 아이템이 아닌 줄은 그대로 출력 (헤더, 빈 줄 등)
        if ! echo "$line" | grep -qE '^\s*- '; then
            echo "$line"
            continue
        fi

        # 이미 해당 태그가 있으면 그대로
        if echo "$line" | grep -qF "[$tag]"; then
            echo "$line"
            continue
        fi

        # [사실] 또는 [판단] 태그가 있는 경우: 유형 태그 뒤에 축 태그 삽입
        if echo "$line" | grep -qE '^\s*- \[(사실|판단)\]'; then
            echo "$line" | sed -E "s/^(\s*- \[(사실|판단)\])/\1 [$tag]/"
        else
            # 유형 태그 없음: - 뒤에 축 태그 삽입
            echo "$line" | sed -E "s/^(\s*- )/\1[$tag] /"
        fi
    done
}

# ─── 백업 ───

if [ "$DRY_RUN" = false ]; then
    echo -e "${CYAN}백업 생성 중...${NC}"
    mkdir -p "$BACKUP_DIR"

    if [ "$HAS_METHODOLOGY" = true ]; then
        cp -r "$METHODOLOGY_DIR" "$BACKUP_DIR/methodology"
        echo -e "  ${GREEN}methodology/ → _backup_migration_$(date +%Y%m%d)/methodology/${NC}"
    fi

    if [ "$HAS_DOMAIN_LEARNINGS" = true ]; then
        mkdir -p "$BACKUP_DIR/domains"
        for domain_dir in "$DOMAINS_DIR"/*/; do
            [ -d "$domain_dir" ] || continue
            domain_name=$(basename "$domain_dir")
            if [ -d "${domain_dir}learnings" ]; then
                mkdir -p "$BACKUP_DIR/domains/$domain_name"
                cp -r "${domain_dir}learnings" "$BACKUP_DIR/domains/$domain_name/learnings"
                echo -e "  ${GREEN}domains/$domain_name/learnings/ → _backup_migration_$(date +%Y%m%d)/domains/$domain_name/learnings/${NC}"
            fi
        done
    fi
    echo ""
fi

# ─── 1단계: methodology/ → learnings/ ───

echo -e "${CYAN}[1/2] methodology/ 처리${NC}"

if [ "$HAS_METHODOLOGY" = true ]; then
    for agent_file in "$METHODOLOGY_DIR"/*.md; do
        [ -f "$agent_file" ] || continue
        agent_name=$(basename "$agent_file")
        item_count=$(count_items "$agent_file")
        SRC_TOTAL=$((SRC_TOTAL + item_count))
        METHODOLOGY_COUNT=$((METHODOLOGY_COUNT + item_count))

        echo -e "  $agent_name: ${item_count}개 아이템 → [methodology] 태그 부착"

        if [ "$DRY_RUN" = false ]; then
            mkdir -p "$LEARNINGS_DIR"
            dst="$LEARNINGS_DIR/$agent_name"

            # 태그 부착 후 임시 파일에 저장
            tagged_content=$(cat "$agent_file" | add_axis_tag "methodology")

            if [ -f "$dst" ]; then
                # 기존 파일에 추가 (빈 줄 구분)
                echo "" >> "$dst"
                echo "$tagged_content" >> "$dst"
                echo -e "    ${GREEN}→ learnings/$agent_name (병합)${NC}"
            else
                echo "$tagged_content" > "$dst"
                echo -e "    ${GREEN}→ learnings/$agent_name (생성)${NC}"
            fi
        fi
    done
else
    echo -e "  없음 (건너뜀)"
fi
echo ""

# ─── 2단계: domains/{domain}/learnings/ → learnings/ ───

echo -e "${CYAN}[2/2] domains/*/learnings/ 처리${NC}"

if [ "$HAS_DOMAIN_LEARNINGS" = true ]; then
    for domain_dir in "$DOMAINS_DIR"/*/; do
        [ -d "$domain_dir" ] || continue
        domain_name=$(basename "$domain_dir")
        domain_learnings="${domain_dir}learnings"

        [ -d "$domain_learnings" ] || continue

        domain_item_count=0

        for agent_file in "$domain_learnings"/*.md; do
            [ -f "$agent_file" ] || continue
            agent_name=$(basename "$agent_file")
            item_count=$(count_items "$agent_file")
            SRC_TOTAL=$((SRC_TOTAL + item_count))
            domain_item_count=$((domain_item_count + item_count))

            echo -e "  domains/$domain_name/learnings/$agent_name: ${item_count}개 아이템 → [domain/$domain_name] 태그 부착"

            if [ "$DRY_RUN" = false ]; then
                mkdir -p "$LEARNINGS_DIR"
                dst="$LEARNINGS_DIR/$agent_name"

                tagged_content=$(cat "$agent_file" | add_axis_tag "domain/$domain_name")

                if [ -f "$dst" ]; then
                    echo "" >> "$dst"
                    echo "$tagged_content" >> "$dst"
                    echo -e "    ${GREEN}→ learnings/$agent_name (병합)${NC}"
                else
                    echo "$tagged_content" > "$dst"
                    echo -e "    ${GREEN}→ learnings/$agent_name (생성)${NC}"
                fi
            fi
        done

        DOMAIN_COUNTS="$DOMAIN_COUNTS  $domain_name: ${domain_item_count}개\n"
    done
else
    echo -e "  없음 (건너뜀)"
fi
echo ""

# ─── 검증: 아이템 수 일치 확인 ───

if [ "$DRY_RUN" = false ] && [ -d "$LEARNINGS_DIR" ]; then
    for dst_file in "$LEARNINGS_DIR"/*.md; do
        [ -f "$dst_file" ] || continue
        dst_count=$(count_items "$dst_file")
        DST_TOTAL=$((DST_TOTAL + dst_count))
    done

    echo -e "${CYAN}━━━ 검증 ━━━${NC}"
    echo ""
    echo -e "  소스 아이템 합계: ${SRC_TOTAL}개"
    echo -e "  대상 아이템 합계: ${DST_TOTAL}개"

    if [ "$DST_TOTAL" -ge "$SRC_TOTAL" ]; then
        echo -e "  ${GREEN}검증 통과 (대상 >= 소스)${NC}"
    else
        echo -e "  ${RED}경고: 대상 아이템이 소스보다 적습니다. 백업에서 확인하세요.${NC}"
        echo -e "  ${RED}백업 위치: $BACKUP_DIR${NC}"
    fi
    echo ""
fi

# ─── 이전 디렉토리 정리 ───

if [ "$DRY_RUN" = false ]; then
    if [ "$HAS_METHODOLOGY" = true ]; then
        rm -rf "$METHODOLOGY_DIR"
        echo -e "${GREEN}methodology/ 삭제 완료${NC}"
    fi

    if [ "$HAS_DOMAIN_LEARNINGS" = true ]; then
        for domain_dir in "$DOMAINS_DIR"/*/; do
            [ -d "$domain_dir" ] || continue
            domain_learnings="${domain_dir}learnings"
            if [ -d "$domain_learnings" ]; then
                rm -rf "$domain_learnings"
                domain_name=$(basename "$domain_dir")
                echo -e "${GREEN}domains/$domain_name/learnings/ 삭제 완료${NC}"
            fi
        done
    fi
    echo ""
fi

# ─── 요약 ───

echo -e "${CYAN}━━━ 요약 ━━━${NC}"
echo ""
echo -e "  ┌─────────────────────┬────────────┐"
echo -e "  │ 소스                │ 아이템 수  │"
echo -e "  ├─────────────────────┼────────────┤"
printf "  │ methodology/        │ %10s │\n" "${METHODOLOGY_COUNT}개"

if [ -n "$DOMAIN_COUNTS" ]; then
    echo -e "$DOMAIN_COUNTS" | while IFS= read -r line; do
        [ -z "$line" ] && continue
        domain=$(echo "$line" | sed 's/^\s*//' | cut -d: -f1)
        count=$(echo "$line" | cut -d: -f2 | tr -d ' ')
        printf "  │ domain/%-13s│ %10s │\n" "$domain" "$count"
    done
fi

echo -e "  ├─────────────────────┼────────────┤"
printf "  │ 합계                │ %10s │\n" "${SRC_TOTAL}개"
echo -e "  └─────────────────────┴────────────┘"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[dry-run] 실제 변경은 수행하지 않았습니다.${NC}"
    echo -e "${YELLOW}실행하려면: ./migrate-learnings.sh${NC}"
else
    echo -e "${GREEN}마이그레이션 완료.${NC}"
    echo -e "백업 위치: $BACKUP_DIR"
fi

echo ""
echo "새 학습 구조:"
echo ""
echo "  ~/.onto/"
echo "  ├── learnings/{agent-id}.md        # 통합 학습 (축 태그 포함)"
echo "  ├── communication/common.md        # 소통 학습 (변경 없음)"
echo "  └── domains/{domain}/              # 도메인 문서 (learnings/ 제거됨)"
echo ""
echo "  아이템 형식: - [사실|판단] [methodology] [domain/SE] 내용 (출처: ...)"
echo ""
