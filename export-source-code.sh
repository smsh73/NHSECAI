#!/bin/bash

# Export Full Source Code
# 이 스크립트는 전체 소스코드를 압축 파일로 export합니다.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="${PROJECT_NAME:-aitradeconsole}"
EXPORT_DATE=$(date +%Y%m%d-%H%M%S)
EXPORT_DIR="${EXPORT_DIR:-./exports}"
EXPORT_PATH="${EXPORT_DIR}/source-code"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}=== Export Full Source Code ===${NC}"
echo -e "${BLUE}========================================${NC}"

# Get current directory name
CURRENT_DIR=$(basename $(pwd))
PROJECT_ROOT=$(pwd)

# Create export directory
mkdir -p ${EXPORT_PATH}

# Archive filename
ARCHIVE_NAME="${PROJECT_NAME}-source-${EXPORT_DATE}"
TEMP_DIR="${EXPORT_PATH}/${ARCHIVE_NAME}"
FINAL_ARCHIVE="${EXPORT_PATH}/${ARCHIVE_NAME}.tar.gz"

echo -e "\n${YELLOW}📦 Configuration:${NC}"
echo -e "  Project Name: ${PROJECT_NAME}"
echo -e "  Export Date: ${EXPORT_DATE}"
echo -e "  Archive: ${FINAL_ARCHIVE}"
echo -e "  Project Root: ${PROJECT_ROOT}"

# Create temporary directory for export
echo -e "\n${YELLOW}📁 Preparing export directory...${NC}"
rm -rf ${TEMP_DIR}
mkdir -p ${TEMP_DIR}

# Copy source files (excluding unnecessary files)
echo -e "\n${YELLOW}📋 Copying source files...${NC}"

# Directories to copy
DIRS_TO_COPY=(
    "client"
    "server"
    "shared"
    "scripts"
    "database"
    "docs"
    ".github"
)

# Files to copy
FILES_TO_COPY=(
    "package.json"
    "package-lock.json"
    "tsconfig.json"
    "vite.config.ts"
    "Dockerfile"
    "docker-compose.yml"
    "*.md"
    ".gitignore"
    ".env.example"
)

# Copy directories
for dir in "${DIRS_TO_COPY[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "  ✓ Copying: $dir"
        cp -r "$dir" "${TEMP_DIR}/"
    else
        echo -e "  ⚠ Skipping (not found): $dir"
    fi
done

# Copy files
for pattern in "${FILES_TO_COPY[@]}"; do
    if ls $pattern 1> /dev/null 2>&1; then
        echo -e "  ✓ Copying: $pattern"
        cp $pattern "${TEMP_DIR}/" 2>/dev/null || true
    fi
done

# Copy deployment scripts
echo -e "  ✓ Copying deployment scripts"
cp -f deploy-to-*.sh "${TEMP_DIR}/" 2>/dev/null || true
cp -f build-and-export-image.sh "${TEMP_DIR}/" 2>/dev/null || true
cp -f export-source-code.sh "${TEMP_DIR}/" 2>/dev/null || true
cp -f download-image.sh "${TEMP_DIR}/" 2>/dev/null || true

# Create .gitignore if it doesn't exist
if [ ! -f "${TEMP_DIR}/.gitignore" ]; then
    cat > "${TEMP_DIR}/.gitignore" << 'EOF'
# Dependencies
node_modules/
package-lock.json

# Build outputs
dist/
build/
*.log

# Environment files
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Exports
exports/
*.tar
*.tar.gz
EOF
fi

# Create README for export
cat > "${TEMP_DIR}/EXPORT_README.md" << EOF
# Source Code Export

This is an export of the ${PROJECT_NAME} source code.

**Export Date:** ${EXPORT_DATE}
**Export Time:** $(date)

## Contents

- **client/**: Frontend React application
- **server/**: Backend Express application
- **shared/**: Shared TypeScript types and schemas
- **scripts/**: Utility scripts
- **database/**: Database schema files
- **docs/**: Documentation
- **.github/**: GitHub Actions workflows
- **Dockerfile**: Docker build configuration
- **deployment scripts**: Deployment automation scripts

## Quick Start

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up environment variables:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. Build the application:
   \`\`\`bash
   npm run build
   \`\`\`

4. Run the application:
   \`\`\`bash
   npm start
   \`\`\`

## Deployment

See deployment scripts:
- \`deploy-to-acr.sh\`: Deploy to Azure Container Registry
- \`deploy-to-app-service.sh\`: Deploy to Azure App Service
- \`build-and-export-image.sh\`: Build and export Docker image
- \`download-image.sh\`: Download image from ACR

## Documentation

See \`docs/\` directory for detailed documentation.
EOF

# Create archive
echo -e "\n${YELLOW}🗜️  Creating archive...${NC}"
cd ${EXPORT_PATH}

# Check if temp directory exists and has content
if [ ! -d "${ARCHIVE_NAME}" ]; then
    echo -e "${RED}❌ Temporary directory does not exist: ${ARCHIVE_NAME}${NC}"
    exit 1
fi

# Create archive
tar -czf ${ARCHIVE_NAME}.tar.gz ${ARCHIVE_NAME} 2>&1

# Check if archive was created
if [ ! -f "${ARCHIVE_NAME}.tar.gz" ]; then
    echo -e "${RED}❌ Archive creation failed${NC}"
    exit 1
fi

# Calculate archive size
ARCHIVE_SIZE=$(du -h ${FINAL_ARCHIVE} | cut -f1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Archive created successfully${NC}"
    echo -e "\n${BLUE}📊 Export Details:${NC}"
    echo -e "  Archive: ${FINAL_ARCHIVE}"
    echo -e "  Size: ${ARCHIVE_SIZE}"
    echo -e "  Contents:"
    tar -tzf ${FINAL_ARCHIVE} | head -20 | sed 's/^/    /'
    if [ $(tar -tzf ${FINAL_ARCHIVE} | wc -l) -gt 20 ]; then
        echo -e "    ... ($(tar -tzf ${FINAL_ARCHIVE} | wc -l) total files)"
    fi
    
    echo -e "\n${YELLOW}To extract this archive:${NC}"
    echo -e "  tar -xzf ${FINAL_ARCHIVE}"
    
    # Clean up temp directory
    rm -rf ${TEMP_DIR}
else
    echo -e "${RED}❌ Archive creation failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}=== Source Code Export Complete ===${NC}"
echo -e "${BLUE}Archive exported to: ${FINAL_ARCHIVE}${NC}"

