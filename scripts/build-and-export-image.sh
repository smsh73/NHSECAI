#!/bin/bash
# Docker 이미지 빌드 및 Export 스크립트

set -e

IMAGE_NAME="aitrade-console"
VERSION=$(date +%Y%m%d-%H%M%S)
FULL_IMAGE_NAME="${IMAGE_NAME}:${VERSION}"
EXPORT_FILE="AITradeConsole-deployment-image-${VERSION}.tar.gz"

echo "=========================================="
echo "Docker 이미지 빌드 및 Export"
echo "=========================================="
echo ""

# 1. Docker 이미지 빌드
echo "📦 Docker 이미지 빌드 중..."
docker build -t ${IMAGE_NAME}:latest -t ${FULL_IMAGE_NAME} .

if [ $? -ne 0 ]; then
    echo "❌ Docker 이미지 빌드 실패"
    exit 1
fi

echo "✅ Docker 이미지 빌드 완료"
echo ""

# 2. 이미지 export (압축)
echo "📤 Docker 이미지 Export 중..."
docker save ${FULL_IMAGE_NAME} | gzip > ${EXPORT_FILE}

if [ $? -ne 0 ]; then
    echo "❌ Docker 이미지 Export 실패"
    exit 1
fi

# 3. 파일 크기 확인
FILE_SIZE=$(du -h ${EXPORT_FILE} | cut -f1)
echo "✅ Docker 이미지 Export 완료"
echo ""
echo "=========================================="
echo "📋 Export 정보"
echo "=========================================="
echo "이미지 이름: ${FULL_IMAGE_NAME}"
echo "Export 파일: ${EXPORT_FILE}"
echo "파일 크기: ${FILE_SIZE}"
echo ""
echo "이미지 로드 방법:"
echo "  docker load < ${EXPORT_FILE}"
echo ""
echo "이미지 실행 방법:"
echo "  docker run -p 5000:5000 -e DATABASE_URL='your-db-url' ${FULL_IMAGE_NAME}"
echo "=========================================="

