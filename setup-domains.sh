#!/bin/bash
# onto-review 도메인 기본 문서 설치 스크립트
# 사용법:
#   ./setup-domains.sh              # 대화형 — 도메인 선택
#   ./setup-domains.sh --all        # 전체 설치
#   ./setup-domains.sh finance business  # 특정 도메인만 설치

set -e

# 경로 설정
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAINS_SRC="$SCRIPT_DIR/domains"
DOMAINS_DST="$HOME/.onto-review/domains"

# 색상
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

# 사용 가능한 도메인 목록
get_available_domains() {
    ls -d "$DOMAINS_SRC"/*/ 2>/dev/null | xargs -I{} basename {} | sort
}

# 도메인 파일 수 확인
count_files() {
    local domain="$1"
    ls "$DOMAINS_SRC/$domain"/*.md 2>/dev/null | wc -l | tr -d ' '
}

# 설치 상태 확인
check_status() {
    local domain="$1"
    local dst="$DOMAINS_DST/$domain"
    if [ ! -d "$dst" ]; then
        echo "not_installed"
    else
        local src_count=$(count_files "$domain")
        local dst_count=$(ls "$dst"/*.md 2>/dev/null | wc -l | tr -d ' ')
        if [ "$dst_count" -eq 0 ]; then
            echo "empty"
        elif [ "$dst_count" -lt "$src_count" ]; then
            echo "partial"
        else
            echo "installed"
        fi
    fi
}

# 단일 도메인 설치
install_domain() {
    local domain="$1"
    local src="$DOMAINS_SRC/$domain"
    local dst="$DOMAINS_DST/$domain"

    if [ ! -d "$src" ]; then
        echo -e "${RED}  ✗ '$domain' 도메인을 찾을 수 없습니다.${NC}"
        return 1
    fi

    mkdir -p "$dst/learnings"

    local installed=0
    local skipped=0
    local updated=0

    for f in "$src"/*.md; do
        local fname=$(basename "$f")
        local dst_file="$dst/$fname"

        if [ ! -f "$dst_file" ]; then
            cp "$f" "$dst_file"
            ((installed++))
        else
            # 파일이 이미 존재하면 내용 비교
            if ! diff -q "$f" "$dst_file" > /dev/null 2>&1; then
                cp "$f" "$dst_file"
                ((updated++))
            else
                ((skipped++))
            fi
        fi
    done

    echo -e "${GREEN}  ✓ $domain${NC}: ${installed}개 설치, ${updated}개 갱신, ${skipped}개 동일(건너뜀)"
    echo -e "    경로: $dst"
}

# 도메인 목록 표시
show_domains() {
    echo ""
    echo -e "${CYAN}사용 가능한 도메인:${NC}"
    echo ""

    local idx=1
    local available=$(get_available_domains)

    for domain in $available; do
        local file_count=$(count_files "$domain")
        local status=$(check_status "$domain")

        local status_label=""
        case $status in
            "installed") status_label="${GREEN}[설치됨]${NC}" ;;
            "partial")   status_label="${YELLOW}[부분 설치]${NC}" ;;
            "empty")     status_label="${YELLOW}[디렉토리만 존재]${NC}" ;;
            *)           status_label="${RED}[미설치]${NC}" ;;
        esac

        echo -e "  ${idx}. ${domain} (${file_count}개 파일) ${status_label}"
        ((idx++))
    done
    echo ""
}

# 메인 로직
main() {
    echo ""
    echo -e "${CYAN}━━━ onto-review 도메인 기본 문서 설치 ━━━${NC}"
    echo ""
    echo "도메인 기본 문서를 ~/.onto-review/domains/에 설치합니다."
    echo "기존 learnings(학습 축적)는 보존됩니다."
    echo ""

    local available=$(get_available_domains)

    if [ -z "$available" ]; then
        echo -e "${RED}설치 가능한 도메인이 없습니다. domains/ 디렉토리를 확인하세요.${NC}"
        exit 1
    fi

    # 인자 처리
    if [ "$1" = "--all" ]; then
        echo -e "전체 도메인을 설치합니다."
        echo ""
        for domain in $available; do
            install_domain "$domain"
        done
    elif [ $# -gt 0 ]; then
        echo -e "선택된 도메인을 설치합니다: $*"
        echo ""
        for domain in "$@"; do
            install_domain "$domain"
        done
    else
        # 대화형 모드
        show_domains

        echo "설치할 도메인을 선택하세요:"
        echo "  - 번호를 쉼표로 구분 (예: 1,3,5)"
        echo "  - 'all' 입력 시 전체 설치"
        echo "  - 'q' 입력 시 취소"
        echo ""
        read -p "선택: " choice

        if [ "$choice" = "q" ] || [ "$choice" = "Q" ]; then
            echo "취소되었습니다."
            exit 0
        fi

        if [ "$choice" = "all" ] || [ "$choice" = "ALL" ]; then
            echo ""
            for domain in $available; do
                install_domain "$domain"
            done
        else
            echo ""
            local domain_array=($available)
            IFS=',' read -ra selections <<< "$choice"
            for sel in "${selections[@]}"; do
                sel=$(echo "$sel" | tr -d ' ')
                local idx=$((sel - 1))
                if [ $idx -ge 0 ] && [ $idx -lt ${#domain_array[@]} ]; then
                    install_domain "${domain_array[$idx]}"
                else
                    echo -e "${RED}  ✗ '$sel'은 유효하지 않은 번호입니다.${NC}"
                fi
            done
        fi
    fi

    echo ""
    echo -e "${GREEN}설치 완료.${NC}"
    echo "프로젝트에서 도메인을 사용하려면 CLAUDE.md에 다음을 추가하세요:"
    echo ""
    echo "  domain: {도메인명}"
    echo "  secondary_domains: {보조 도메인1}, {보조 도메인2}"
    echo ""
}

main "$@"
