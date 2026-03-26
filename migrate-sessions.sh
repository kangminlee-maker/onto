#!/bin/bash
# onto-review 세션 디렉토리 마이그레이션 스크립트
# .claude/sessions/ → .onto-review/ 로 기존 세션 데이터를 이동합니다.
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

OLD_DIR="$PROJECT_DIR/.claude/sessions"
NEW_DIR="$PROJECT_DIR/.onto-review"

echo ""
echo -e "${CYAN}━━━ onto-review 세션 디렉토리 마이그레이션 ━━━${NC}"
echo ""
echo "프로젝트: $PROJECT_DIR"
echo "이전 경로: .claude/sessions/"
echo "새 경로:   .onto-review/"
echo ""

# 이전 디렉토리 존재 확인
if [ ! -d "$OLD_DIR" ]; then
    echo -e "${GREEN}마이그레이션 불필요 — .claude/sessions/ 디렉토리가 없습니다.${NC}"
    echo ""
    exit 0
fi

# 기존 세션 데이터 확인
SESSION_COUNT=0
FILE_COUNT=0

echo -e "${CYAN}발견된 세션 데이터:${NC}"
echo ""

for process_dir in "$OLD_DIR"/*/; do
    [ -d "$process_dir" ] || continue
    process_name=$(basename "$process_dir")

    for session_dir in "$process_dir"*/; do
        [ -d "$session_dir" ] || continue
        session_id=$(basename "$session_dir")
        file_count=$(find "$session_dir" -type f | wc -l | tr -d ' ')

        echo -e "  ${process_name}/${session_id} (${file_count}개 파일)"
        ((SESSION_COUNT++))
        FILE_COUNT=$((FILE_COUNT + file_count))
    done
done

if [ $SESSION_COUNT -eq 0 ]; then
    echo -e "  (세션 데이터 없음)"
    echo ""
    echo -e "${GREEN}마이그레이션 불필요 — 세션 데이터가 비어 있습니다.${NC}"
    echo ""
    exit 0
fi

echo ""
echo "총 ${SESSION_COUNT}개 세션, ${FILE_COUNT}개 파일"
echo ""

# dry-run 모드
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[dry-run] 실제 이동은 수행하지 않습니다.${NC}"
    echo ""
    exit 0
fi

# 새 디렉토리가 이미 존재하고 내용이 있는 경우
if [ -d "$NEW_DIR" ] && [ "$(ls -A "$NEW_DIR" 2>/dev/null)" ]; then
    echo -e "${YELLOW}주의: .onto-review/ 디렉토리에 기존 데이터가 있습니다.${NC}"
    echo "기존 데이터를 유지하면서 병합합니다 (동일 경로의 파일은 덮어쓰지 않습니다)."
    echo ""
fi

# 마이그레이션 실행
moved=0
skipped=0

for process_dir in "$OLD_DIR"/*/; do
    [ -d "$process_dir" ] || continue
    process_name=$(basename "$process_dir")

    for session_dir in "$process_dir"*/; do
        [ -d "$session_dir" ] || continue
        session_id=$(basename "$session_dir")

        dst="$NEW_DIR/$process_name/$session_id"

        if [ -d "$dst" ]; then
            echo -e "${YELLOW}  건너뜀: ${process_name}/${session_id} (이미 존재)${NC}"
            ((skipped++))
        else
            mkdir -p "$(dirname "$dst")"
            mv "$session_dir" "$dst"
            echo -e "${GREEN}  이동됨: ${process_name}/${session_id}${NC}"
            ((moved++))
        fi
    done
done

echo ""

# 이전 디렉토리 정리
remaining=$(find "$OLD_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$remaining" -eq 0 ]; then
    rmdir "$OLD_DIR"/*/ 2>/dev/null || true
    rmdir "$OLD_DIR" 2>/dev/null || true
    echo -e "${GREEN}이전 디렉토리(.claude/sessions/) 정리 완료${NC}"
else
    echo -e "${YELLOW}이전 디렉토리에 ${remaining}개 파일이 남아 있습니다 (건너뛴 세션).${NC}"
    echo "수동 확인 후 삭제하세요: $OLD_DIR"
fi

echo ""
echo -e "${GREEN}마이그레이션 완료: ${moved}개 이동, ${skipped}개 건너뜀${NC}"
echo ""
