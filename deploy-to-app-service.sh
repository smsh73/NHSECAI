#!/bin/bash

# Deploy to Azure App Service via Azure Container Registry
# This script:
# 1. Builds and pushes Docker image to ACR
# 2. Creates or updates Azure App Service
# 3. Configures environment variables
# 4. Deploys the container to App Service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Set these via environment variables or modify here
ACR_NAME="${ACR_NAME:-your-acr-name}"
RESOURCE_GROUP="${RESOURCE_GROUP:-nh-financial-rg}"
APP_SERVICE_PLAN="${APP_SERVICE_PLAN:-nh-financial-plan}"
APP_SERVICE_NAME="${APP_SERVICE_NAME:-nh-financial-app}"
IMAGE_NAME="nh-financial-analysis"
IMAGE_TAG="${IMAGE_TAG:-latest}"
LOCATION="${LOCATION:-koreacentral}"
SKU="${SKU:-B1}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  NH Investment & Securities AI Platform Deployment  ║${NC}"
echo -e "${BLUE}║  Target: Azure App Service + ACR                     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}\n"

# Check if required tools are installed
echo -e "${YELLOW}Checking prerequisites...${NC}"
command -v az >/dev/null 2>&1 || { echo -e "${RED}✗ Azure CLI is not installed${NC}"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}✗ Docker is not installed${NC}"; exit 1; }
echo -e "${GREEN}✓ All prerequisites met${NC}\n"

# Login to Azure
echo -e "${YELLOW}Step 1: Logging in to Azure...${NC}"
az login --output none 2>/dev/null || true
echo -e "${GREEN}✓ Logged in to Azure${NC}\n"

# Create Resource Group if it doesn't exist
echo -e "${YELLOW}Step 2: Creating Resource Group (if needed)...${NC}"
az group create --name ${RESOURCE_GROUP} --location ${LOCATION} --output none
echo -e "${GREEN}✓ Resource Group: ${RESOURCE_GROUP}${NC}\n"

# Create ACR if it doesn't exist
echo -e "${YELLOW}Step 3: Creating Azure Container Registry (if needed)...${NC}"
az acr create --resource-group ${RESOURCE_GROUP} --name ${ACR_NAME} --sku Basic --output none 2>/dev/null || true
echo -e "${GREEN}✓ ACR: ${ACR_NAME}.azurecr.io${NC}\n"

# Login to ACR
echo -e "${YELLOW}Step 4: Logging in to ACR...${NC}"
az acr login --name ${ACR_NAME}
echo -e "${GREEN}✓ Logged in to ACR${NC}\n"

# Build Docker image
echo -e "${YELLOW}Step 5: Building Docker image...${NC}"
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
echo -e "${GREEN}✓ Image built: ${IMAGE_NAME}:${IMAGE_TAG}${NC}\n"

# Tag image for ACR
echo -e "${YELLOW}Step 6: Tagging image for ACR...${NC}"
FULL_IMAGE_NAME="${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}"
docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${FULL_IMAGE_NAME}
echo -e "${GREEN}✓ Tagged: ${FULL_IMAGE_NAME}${NC}\n"

# Push to ACR
echo -e "${YELLOW}Step 7: Pushing image to ACR...${NC}"
docker push ${FULL_IMAGE_NAME}
echo -e "${GREEN}✓ Pushed to ACR${NC}\n"

# Enable Admin user on ACR (required for App Service to pull images)
echo -e "${YELLOW}Step 8: Enabling ACR admin user...${NC}"
az acr update -n ${ACR_NAME} --admin-enabled true --output none
ACR_USERNAME=$(az acr credential show -n ${ACR_NAME} --query username -o tsv)
ACR_PASSWORD=$(az acr credential show -n ${ACR_NAME} --query "passwords[0].value" -o tsv)
echo -e "${GREEN}✓ ACR admin enabled${NC}\n"

# Create App Service Plan if it doesn't exist
echo -e "${YELLOW}Step 9: Creating App Service Plan (if needed)...${NC}"
az appservice plan create \
  --name ${APP_SERVICE_PLAN} \
  --resource-group ${RESOURCE_GROUP} \
  --is-linux \
  --sku ${SKU} \
  --location ${LOCATION} \
  --output none 2>/dev/null || true
echo -e "${GREEN}✓ App Service Plan: ${APP_SERVICE_PLAN} (SKU: ${SKU})${NC}\n"

# Create or update App Service
echo -e "${YELLOW}Step 10: Creating/Updating App Service...${NC}"
az webapp create \
  --resource-group ${RESOURCE_GROUP} \
  --plan ${APP_SERVICE_PLAN} \
  --name ${APP_SERVICE_NAME} \
  --deployment-container-image-name ${FULL_IMAGE_NAME} \
  --docker-registry-server-url https://${ACR_NAME}.azurecr.io \
  --docker-registry-server-user ${ACR_USERNAME} \
  --docker-registry-server-password ${ACR_PASSWORD} \
  --output none 2>/dev/null || {
    echo -e "${BLUE}App Service already exists, updating...${NC}"
    az webapp config container set \
      --name ${APP_SERVICE_NAME} \
      --resource-group ${RESOURCE_GROUP} \
      --docker-custom-image-name ${FULL_IMAGE_NAME} \
      --docker-registry-server-url https://${ACR_NAME}.azurecr.io \
      --docker-registry-server-user ${ACR_USERNAME} \
      --docker-registry-server-password ${ACR_PASSWORD} \
      --output none
  }
echo -e "${GREEN}✓ App Service: ${APP_SERVICE_NAME}${NC}\n"

# Configure App Service settings
echo -e "${YELLOW}Step 11: Configuring App Service settings...${NC}"

# Set basic runtime settings
az webapp config set \
  --resource-group ${RESOURCE_GROUP} \
  --name ${APP_SERVICE_NAME} \
  --always-on true \
  --http20-enabled true \
  --output none

# Set port configuration (App listens on 5000)
az webapp config appsettings set \
  --resource-group ${RESOURCE_GROUP} \
  --name ${APP_SERVICE_NAME} \
  --settings WEBSITES_PORT=5000 \
  --output none

echo -e "${GREEN}✓ Basic settings configured${NC}\n"

# Configure environment variables
echo -e "${YELLOW}Step 12: Setting environment variables...${NC}"

# Set basic runtime environment variables
az webapp config appsettings set \
  --resource-group ${RESOURCE_GROUP} \
  --name ${APP_SERVICE_NAME} \
  --settings \
    NODE_ENV="production" \
    WEBSITES_ENABLE_APP_SERVICE_STORAGE="false" \
    WEBSITES_CONTAINER_START_TIME_LIMIT="1800" \
  --output none

echo -e "${GREEN}✓ Basic runtime settings configured${NC}"

echo -e "${BLUE}Note: Set these Azure App Service Application Settings manually or via Azure Portal:${NC}"
echo -e "${BLUE}  - DATABASE_URL (REQUIRED)${NC}"
echo -e "${BLUE}  - AZURE_DATABRICKS_HOST, AZURE_DATABRICKS_TOKEN, AZURE_DATABRICKS_HTTP_PATH${NC}"
echo -e "${BLUE}  - AZURE_OPENAI_PTU_ENDPOINT, AZURE_OPENAI_PTU_KEY, AZURE_OPENAI_PTU_DEPLOYMENT${NC}"
echo -e "${BLUE}  - AZURE_OPENAI_EMBEDDING_ENDPOINT, AZURE_OPENAI_EMBEDDING_KEY${NC}"
echo -e "${BLUE}  - AZURE_COSMOS_ENDPOINT, AZURE_COSMOS_KEY${NC}"
echo -e "${BLUE}  - AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_KEY${NC}"
echo -e "${BLUE}  - OPENAI_API_KEY (fallback)${NC}"
echo -e ""
echo -e "${YELLOW}Or use this command to set them:${NC}"
cat << 'EOF'

az webapp config appsettings set \
  --resource-group ${RESOURCE_GROUP} \
  --name ${APP_SERVICE_NAME} \
  --settings \
    DATABASE_URL="your-database-url" \
    AZURE_DATABRICKS_HOST="your-databricks-host" \
    AZURE_DATABRICKS_TOKEN="your-databricks-token" \
    AZURE_DATABRICKS_HTTP_PATH="your-databricks-http-path" \
    AZURE_OPENAI_PTU_ENDPOINT="your-openai-endpoint" \
    AZURE_OPENAI_PTU_KEY="your-openai-key" \
    AZURE_OPENAI_PTU_DEPLOYMENT="your-deployment-name" \
    AZURE_OPENAI_EMBEDDING_ENDPOINT="your-embedding-endpoint" \
    AZURE_OPENAI_EMBEDDING_KEY="your-embedding-key" \
    AZURE_COSMOS_ENDPOINT="your-cosmos-endpoint" \
    AZURE_COSMOS_KEY="your-cosmos-key" \
    AZURE_SEARCH_ENDPOINT="your-search-endpoint" \
    AZURE_SEARCH_KEY="your-search-key" \
    OPENAI_API_KEY="your-openai-fallback-key"

EOF
echo ""

# Enable continuous deployment from ACR
echo -e "${YELLOW}Step 13: Enabling continuous deployment...${NC}"
az webapp deployment container config \
  --name ${APP_SERVICE_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --enable-cd true \
  --output none
echo -e "${GREEN}✓ Continuous deployment enabled${NC}\n"

# Get App Service URL
APP_URL=$(az webapp show --name ${APP_SERVICE_NAME} --resource-group ${RESOURCE_GROUP} --query defaultHostName -o tsv)

echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            Deployment Completed Successfully!        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}📦 Container Image:${NC} ${FULL_IMAGE_NAME}"
echo -e "${BLUE}🌐 App Service URL:${NC} https://${APP_URL}"
echo -e "${BLUE}📊 Resource Group:${NC} ${RESOURCE_GROUP}"
echo -e "${BLUE}🏗️  App Service Plan:${NC} ${APP_SERVICE_PLAN} (${SKU})"
echo -e ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Configure environment variables via Azure Portal or CLI"
echo -e "  2. Configure custom domain and SSL (optional)"
echo -e "  3. Set up Azure Monitor and Application Insights"
echo -e "  4. Configure scaling rules (if using Standard tier or higher)"
echo -e "  5. Access your app at: ${GREEN}https://${APP_URL}${NC}"
echo -e ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  View logs:    az webapp log tail --name ${APP_SERVICE_NAME} --resource-group ${RESOURCE_GROUP}"
echo -e "  Restart app:  az webapp restart --name ${APP_SERVICE_NAME} --resource-group ${RESOURCE_GROUP}"
echo -e "  Scale up:     az appservice plan update --name ${APP_SERVICE_PLAN} --resource-group ${RESOURCE_GROUP} --sku P1V2"
echo -e ""
