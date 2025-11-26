#!/bin/bash

# Build and Export Docker Image
# 이 스크립트는 Docker 이미지를 빌드하고 tar 파일로 export합니다.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="${IMAGE_NAME:-nh-financial-analysis}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
BUILD_DATE=$(date +%Y%m%d-%H%M%S)
EXPORT_DIR="${EXPORT_DIR:-./exports}"
EXPORT_PATH="${EXPORT_DIR}/docker-images"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}=== Build and Export Docker Image ===${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if Docker is installed
command -v docker >/dev/null 2>&1 || { 
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo -e "${YELLOW}Please install Docker: https://docs.docker.com/get-docker/${NC}"
    exit 1
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    echo -e "${YELLOW}Please start Docker Desktop or Docker daemon${NC}"
    exit 1
fi

# Create export directory
mkdir -p ${EXPORT_PATH}

# Full image name
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
TAR_FILE="${EXPORT_PATH}/${IMAGE_NAME}-${IMAGE_TAG}-${BUILD_DATE}.tar"

echo -e "\n${YELLOW}📦 Configuration:${NC}"
echo -e "  Image Name: ${FULL_IMAGE_NAME}"
echo -e "  Export Path: ${TAR_FILE}"
echo -e "  Build Date: ${BUILD_DATE}"

# Build Docker image
echo -e "\n${YELLOW}🔨 Building Docker image...${NC}"
docker build -t ${FULL_IMAGE_NAME} .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Docker image build failed${NC}"
    exit 1
fi

# Get image size
IMAGE_SIZE=$(docker images ${FULL_IMAGE_NAME} --format "{{.Size}}")
echo -e "  Image Size: ${IMAGE_SIZE}"

# Export image to tar file
echo -e "\n${YELLOW}💾 Exporting image to tar file...${NC}"
docker save ${FULL_IMAGE_NAME} -o ${TAR_FILE}

if [ $? -eq 0 ]; then
    # Get tar file size
    TAR_SIZE=$(du -h ${TAR_FILE} | cut -f1)
    echo -e "${GREEN}✅ Image exported successfully${NC}"
    echo -e "\n${BLUE}📊 Export Details:${NC}"
    echo -e "  File: ${TAR_FILE}"
    echo -e "  Size: ${TAR_SIZE}"
    echo -e "\n${YELLOW}To load this image later:${NC}"
    echo -e "  docker load -i ${TAR_FILE}"
else
    echo -e "${RED}❌ Image export failed${NC}"
    exit 1
fi

# Also create a latest symlink or copy
LATEST_TAR="${EXPORT_PATH}/${IMAGE_NAME}-${IMAGE_TAG}.tar"
cp ${TAR_FILE} ${LATEST_TAR}
echo -e "\n${GREEN}✅ Also created: ${LATEST_TAR}${NC}"

echo -e "\n${GREEN}=== Build and Export Complete ===${NC}"
echo -e "${BLUE}Image exported to: ${TAR_FILE}${NC}"

