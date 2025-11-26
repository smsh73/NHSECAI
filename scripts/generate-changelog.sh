#!/bin/bash
# 변경이력 파일 생성 스크립트

set -e

TODAY=$(date +%Y-%m-%d)
CHANGELOG_FILE="docs/CHANGELOG.md"

echo "=========================================="
echo "변경이력 파일 생성/업데이트"
echo "=========================================="
echo "날짜: ${TODAY}"
echo "파일: ${CHANGELOG_FILE}"
echo ""

# 파일이 없으면 생성
if [ ! -f "${CHANGELOG_FILE}" ]; then
  cat > "${CHANGELOG_FILE}" << 'EOF'
# 변경이력 (Changelog)

이 파일은 AITradeConsole 프로젝트의 주요 변경사항을 기록합니다.

EOF
fi

# 오늘 날짜 섹션이 이미 있는지 확인
if grep -q "## ${TODAY}" "${CHANGELOG_FILE}"; then
  echo "⚠️  ${TODAY} 변경이력이 이미 존재합니다. 건너뜁니다."
  exit 0
fi

# 오늘 날짜의 변경이력 추가
cat >> "${CHANGELOG_FILE}" << EOF

---

## ${TODAY}

### 문서 업데이트
- 모든 문서의 날짜를 ${TODAY}로 업데이트
- 문서 아카이빙 완료 (docs/archive/${TODAY}/)

### 주요 변경사항
- SQLite 완전 제거, PostgreSQL 전용으로 전환
- Azure 환경 전용 설정 적용
- 샘플 데이터 생성 기능 추가
- Docker 배포 지원

### 문서 생성
- 메뉴별 종합 분석 문서 생성 (2025-10-30_menu-comprehensive-analysis.md)
- 변경이력 자동화 설정

EOF

echo "✅ 변경이력 업데이트 완료: ${CHANGELOG_FILE}"

