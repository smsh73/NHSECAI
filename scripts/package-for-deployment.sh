#!/bin/bash
# 배포용 소스코드 패키징 스크립트 (Docker 없이 사용 가능)

set -e

VERSION=$(date +%Y%m%d-%H%M%S)
PACKAGE_NAME="AITradeConsole-source-package-${VERSION}.tar.gz"

echo "=========================================="
echo "배포용 소스코드 패키징"
echo "=========================================="
echo ""

# 배포에 필요한 파일만 포함하여 패키징
echo "📦 소스코드 패키징 중..."

tar -czf ${PACKAGE_NAME} \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='.env*' \
  --exclude='logs' \
  --exclude='*.tar.gz' \
  --exclude='AITradeConsole-*.tar.gz' \
  --exclude='*.md' \
  --exclude='docs' \
  --exclude='.vscode' \
  --exclude='.idea' \
  --exclude='coverage' \
  --exclude='*.test.js' \
  --exclude='*.test.ts' \
  --exclude='__tests__' \
  . 2>&1

if [ $? -ne 0 ]; then
    echo "❌ 패키징 실패"
    exit 1
fi

FILE_SIZE=$(du -h ${PACKAGE_NAME} | cut -f1)
echo "✅ 패키징 완료"
echo ""
echo "=========================================="
echo "📋 패키지 정보"
echo "=========================================="
echo "패키지 이름: ${PACKAGE_NAME}"
echo "파일 크기: ${FILE_SIZE}"
echo ""
echo "사용 방법:"
echo "  1. 패키지 압축 해제: tar -xzf ${PACKAGE_NAME}"
echo "  2. 의존성 설치: npm ci"
echo "  3. 애플리케이션 빌드: npm run build"
echo "  4. 애플리케이션 실행: npm start"
echo ""
echo "또는 Docker 이미지 빌드:"
echo "  docker build -t aitrade-console:latest ."
echo "=========================================="

