#!/bin/bash
# 문서 날짜 업데이트 및 아카이빙 스크립트

set -e

TODAY=$(date +%Y-%m-%d)
ARCHIVE_DIR="docs/archive/${TODAY}"
BACKUP_DIR="${ARCHIVE_DIR}/backup"

echo "=========================================="
echo "문서 날짜 업데이트 및 아카이빙"
echo "=========================================="
echo "오늘 날짜: ${TODAY}"
echo ""

# Archive 디렉토리 생성
mkdir -p "${ARCHIVE_DIR}"
mkdir -p "${BACKUP_DIR}"

# docs 폴더의 모든 .md 파일 찾기
for file in docs/*.md; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    
    # 아카이브 파일이나 CHANGELOG는 건너뛰기
    if [[ "$filename" == *"_${TODAY}.md" ]] || [[ "$filename" == "CHANGELOG.md" ]]; then
      continue
    fi
    
    echo "처리 중: ${filename}"
    
    # 백업 복사
    cp "$file" "${BACKUP_DIR}/${filename}"
    
    # 날짜 패턴 찾아서 교체
    # macOS용 sed (백업 파일 자동 생성 방지)
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' \
        -e "s/2025-01-[0-9][0-9]/${TODAY}/g" \
        -e "s/2025-10-[0-9][0-9]/${TODAY}/g" \
        -e "s/작성일.*2025-[0-9][0-9]-[0-9][0-9]/작성일: ${TODAY}/g" \
        -e "s/최종 업데이트.*2025-[0-9][0-9]-[0-9][0-9]/최종 업데이트: ${TODAY}/g" \
        -e "s/테스트 일시.*2025-[0-9][0-9]-[0-9][0-9]/테스트 일시: ${TODAY}/g" \
        -e "s/일자.*2025-[0-9][0-9]-[0-9][0-9]/일자: ${TODAY}/g" \
        "$file"
    else
      sed -i \
        -e "s/2025-01-[0-9][0-9]/${TODAY}/g" \
        -e "s/2025-10-[0-9][0-9]/${TODAY}/g" \
        -e "s/작성일.*2025-[0-9][0-9]-[0-9][0-9]/작성일: ${TODAY}/g" \
        -e "s/최종 업데이트.*2025-[0-9][0-9]-[0-9][0-9]/최종 업데이트: ${TODAY}/g" \
        -e "s/테스트 일시.*2025-[0-9][0-9]-[0-9][0-9]/테스트 일시: ${TODAY}/g" \
        -e "s/일자.*2025-[0-9][0-9]-[0-9][0-9]/일자: ${TODAY}/g" \
        "$file"
    fi
    
    # 날짜 포함된 새 파일명으로 아카이빙
    archive_name="${filename%.md}_${TODAY}.md"
    cp "$file" "${ARCHIVE_DIR}/${archive_name}"
    
    echo "  ✅ 업데이트 및 아카이빙 완료: ${archive_name}"
  fi
done

echo ""
echo "=========================================="
echo "완료"
echo "=========================================="
echo "백업 위치: ${BACKUP_DIR}"
echo "아카이브 위치: ${ARCHIVE_DIR}"
echo ""
