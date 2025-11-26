#!/bin/bash
# 배포 버전 준비 스크립트 (문서 업데이트 포함)

set -e

TODAY=$(date +%Y-%m-%d)
VERSION=${1:-$(date +%Y%m%d)}

echo "=========================================="
echo "배포 버전 준비"
echo "=========================================="
echo "날짜: ${TODAY}"
echo "버전: ${VERSION}"
echo ""

# 1. 문서 날짜 업데이트 및 아카이빙
echo "1. 문서 날짜 업데이트 및 아카이빙..."
bash scripts/update-doc-dates.sh

# 2. 변경이력 생성
echo ""
echo "2. 변경이력 생성..."
bash scripts/generate-changelog.sh

# 3. 종합 분석 문서 생성
echo ""
echo "3. 종합 분석 문서 생성..."
bash scripts/generate-comprehensive-menu-analysis.sh

# 4. 완료 메시지
echo ""
echo "=========================================="
echo "배포 준비 완료"
echo "=========================================="
echo "날짜: ${TODAY}"
echo "버전: ${VERSION}"
echo ""
echo "다음 단계:"
echo "  1. 소스코드 빌드: npm run build"
echo "  2. Docker 이미지 빌드: docker build -t aitrade-console:${VERSION} ."
echo "  3. ACR에 푸시: docker push <acr-name>.azurecr.io/aitrade-console:${VERSION}"
echo ""

