#!/bin/bash

# Deploy to Azure Container Registry Script
# This script builds and pushes Docker image to ACR

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ACR_NAME="${ACR_NAME:-your-acr-name}"
IMAGE_NAME="nh-financial-analysis"
IMAGE_TAG="${IMAGE_TAG:-latest}"
RESOURCE_GROUP="${RESOURCE_GROUP:-your-resource-group}"

echo -e "${GREEN}=== Azure Container Registry Deployment ===${NC}"

# Check if required tools are installed
command -v az >/dev/null 2>&1 || { echo -e "${RED}Azure CLI is not installed${NC}"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is not installed${NC}"; exit 1; }

# Login to Azure
echo -e "${YELLOW}Logging in to Azure...${NC}"
az login

# Login to ACR
echo -e "${YELLOW}Logging in to ACR...${NC}"
az acr login --name ${ACR_NAME}

# Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

# Tag image for ACR
echo -e "${YELLOW}Tagging image for ACR...${NC}"
docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}

# Push to ACR
echo -e "${YELLOW}Pushing image to ACR...${NC}"
docker push ${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}

echo -e "${GREEN}✓ Successfully pushed image to ${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}${NC}"

# Show image details
echo -e "\n${YELLOW}Image Details:${NC}"
az acr repository show --name ${ACR_NAME} --repository ${IMAGE_NAME}

echo -e "\n${GREEN}=== ACR Image Push Complete ===${NC}"
echo -e "Image: ${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}"
echo -e "\nNext steps:"
echo -e "1. Deploy to Azure App Service: ${YELLOW}./deploy-to-app-service.sh${NC}"
echo -e "2. Or manually configure Azure App Service to use this image"
echo -e "\n${YELLOW}Manual deployment:${NC}"
echo -e "  az webapp create --name <app-name> \\"
echo -e "    --resource-group <rg-name> \\"
echo -e "    --plan <plan-name> \\"
echo -e "    --deployment-container-image-name ${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}"
