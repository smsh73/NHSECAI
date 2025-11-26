#!/bin/bash

# Download Docker Image from Azure Container Registry
# 이 스크립트는 ACR에서 배포 이미지를 다운로드합니다.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ACR_NAME="${ACR_NAME:-your-acr-name}"
IMAGE_NAME="${IMAGE_NAME:-nh-financial-analysis}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
SAVE_PATH="${SAVE_PATH:-./images}"

echo -e "${GREEN}=== Azure Container Registry Image Download ===${NC}"

# Check if required tools are installed
command -v az >/dev/null 2>&1 || { echo -e "${RED}Azure CLI is not installed${NC}"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is not installed${NC}"; exit 1; }

# Check if logged in to Azure
echo -e "${YELLOW}Checking Azure login status...${NC}"
az account show >/dev/null 2>&1 || {
    echo -e "${YELLOW}Not logged in to Azure. Logging in...${NC}"
    az login
}

# Login to ACR
echo -e "${YELLOW}Logging in to ACR: ${ACR_NAME}...${NC}"
az acr login --name ${ACR_NAME}

# Full image name
FULL_IMAGE_NAME="${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}"

# Pull image
echo -e "${YELLOW}Pulling image: ${FULL_IMAGE_NAME}...${NC}"
docker pull ${FULL_IMAGE_NAME}

# Create save directory if it doesn't exist
mkdir -p ${SAVE_PATH}

# Save image to tar file
TAR_FILE="${SAVE_PATH}/${IMAGE_NAME}-${IMAGE_TAG}.tar"
echo -e "${YELLOW}Saving image to: ${TAR_FILE}...${NC}"
docker save ${FULL_IMAGE_NAME} -o ${TAR_FILE}

# Get image size
IMAGE_SIZE=$(du -h ${TAR_FILE} | cut -f1)

echo -e "\n${GREEN}✓ Successfully downloaded and saved image${NC}"
echo -e "${YELLOW}Image Details:${NC}"
echo -e "  Name: ${FULL_IMAGE_NAME}"
echo -e "  Saved to: ${TAR_FILE}"
echo -e "  Size: ${IMAGE_SIZE}"
echo -e "\n${YELLOW}To load this image later:${NC}"
echo -e "  docker load -i ${TAR_FILE}"
echo -e "\n${YELLOW}To list available tags in ACR:${NC}"
echo -e "  az acr repository show-tags --name ${ACR_NAME} --repository ${IMAGE_NAME} --output table"
echo -e "\n${GREEN}=== Image Download Complete ===${NC}"

