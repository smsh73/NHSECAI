#!/bin/bash

# Export Full Source Code with Schema Migration and Sample Data
# 스키마 마이그레이션 코드와 샘플 데이터 생성 코드까지 모두 포함한 Full 소스코드 export

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
EXPORT_PATH="${EXPORT_DIR}/source-code-full"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}=== Export Full Source Code (Complete) ===${NC}"
echo -e "${BLUE}========================================${NC}"

# Get current directory name
CURRENT_DIR=$(basename $(pwd))
PROJECT_ROOT=$(pwd)

# Create export directory
mkdir -p ${EXPORT_PATH}

# Archive filename
ARCHIVE_NAME="${PROJECT_NAME}-full-source-${EXPORT_DATE}"
TEMP_DIR="${EXPORT_PATH}/${ARCHIVE_NAME}"
FINAL_ARCHIVE="${EXPORT_PATH}/${ARCHIVE_NAME}.tar.gz"

echo -e "\n${YELLOW}📦 Configuration:${NC}"
echo -e "  Project Name: ${PROJECT_NAME}"
echo -e "  Export Type: FULL (Schema Migration + Sample Data)"
echo -e "  Export Date: ${EXPORT_DATE}"
echo -e "  Archive: ${FINAL_ARCHIVE}"
echo -e "  Project Root: ${PROJECT_ROOT}"

# Create temporary directory for export
echo -e "\n${YELLOW}📁 Preparing export directory...${NC}"
rm -rf ${TEMP_DIR}
mkdir -p ${TEMP_DIR}

# Copy source files (including all necessary files)
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
cp -f export-full-source-code.sh "${TEMP_DIR}/" 2>/dev/null || true
cp -f download-image.sh "${TEMP_DIR}/" 2>/dev/null || true
cp -f CHECK_DOCKER_AND_EXPORT.sh "${TEMP_DIR}/" 2>/dev/null || true

# Verify critical files are included
echo -e "\n${YELLOW}🔍 Verifying critical files...${NC}"

# Schema files
SCHEMA_FILES=(
    "database/create-complete-schema.sql"
    "database/init-sample-data.sql"
    "database/unified-schema.sql"
    "database/schema-audit-logging.sql"
    "database/schema-service-management.sql"
)

echo -e "  Checking schema files..."
for file in "${SCHEMA_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "    ✓ Found: $file"
    else
        echo -e "    ⚠ Missing: $file"
    fi
done

# Sample data scripts
SAMPLE_DATA_SCRIPTS=(
    "scripts/init-sample-data.js"
    "scripts/create-comprehensive-sample-data.js"
    "scripts/deploy-init-sample-data.js"
    "scripts/insert-postgresql-sample-data.js"
)

echo -e "  Checking sample data scripts..."
for file in "${SAMPLE_DATA_SCRIPTS[@]}"; do
    if [ -f "$file" ]; then
        echo -e "    ✓ Found: $file"
    else
        echo -e "    ⚠ Missing: $file"
    fi
done

# Database initialization scripts
DB_INIT_SCRIPTS=(
    "database/init-database.sh"
    "database/run-schema.mjs"
)

echo -e "  Checking database init scripts..."
for file in "${DB_INIT_SCRIPTS[@]}"; do
    if [ -f "$file" ]; then
        echo -e "    ✓ Found: $file"
    else
        echo -e "    ⚠ Missing: $file"
    fi
done

# Create comprehensive README for export
cat > "${TEMP_DIR}/EXPORT_README.md" << EOF
# Full Source Code Export (Complete Package)

This is a complete export of the ${PROJECT_NAME} source code including:
- **Full Application Source Code**
- **Schema Migration Code**
- **Sample Data Generation Scripts**
- **Database Initialization Scripts**
- **Deployment Scripts**

**Export Date:** ${EXPORT_DATE}
**Export Time:** $(date)

## 📋 Contents

### Application Source
- **client/**: Frontend React application (Vite + TypeScript)
- **server/**: Backend Express application (Node.js + TypeScript)
- **shared/**: Shared TypeScript types and schemas (Drizzle ORM)

### Schema & Migration
- **database/create-complete-schema.sql**: Complete database schema
- **database/unified-schema.sql**: Unified schema definition
- **database/schema-*.sql**: Additional schema files
- **database/init-database.sh**: Database initialization script
- **database/run-schema.mjs**: Schema migration runner
- **database/seeds/**: Seed data and workflow templates

### Sample Data Generation
- **scripts/init-sample-data.js**: Main sample data initialization
- **scripts/create-comprehensive-sample-data.js**: Comprehensive sample data
- **scripts/deploy-init-sample-data.js**: Deployment-ready sample data
- **scripts/insert-postgresql-sample-data.js**: PostgreSQL sample data insertion
- **database/init-sample-data.sql**: SQL sample data script

### Deployment
- **Dockerfile**: Docker build configuration
- **deploy-to-acr.sh**: Azure Container Registry deployment
- **deploy-to-app-service.sh**: Azure App Service deployment
- **build-and-export-image.sh**: Docker image build and export

### Documentation
- **docs/**: Complete documentation
- **DEPLOYMENT.md**: Deployment guide
- **AZURE_APP_SERVICE_DEPLOYMENT.md**: Azure deployment guide
- **DEPLOYMENT_SAMPLE_DATA.md**: Sample data deployment guide

## 🚀 Quick Start

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Database Setup
\`\`\`bash
# Run schema migration
./database/init-database.sh

# Or manually
psql -h your-host -U your-user -d your-database -f database/create-complete-schema.sql
\`\`\`

### 3. Generate Sample Data
\`\`\`bash
# Option 1: Using Node.js script
node scripts/init-sample-data.js

# Option 2: Using comprehensive script
node scripts/create-comprehensive-sample-data.js

# Option 3: Using deployment script
node scripts/deploy-init-sample-data.js

# Option 4: Using SQL directly
psql -h your-host -U your-user -d your-database -f database/init-sample-data.sql
\`\`\`

### 4. Environment Setup
\`\`\`bash
cp .env.example .env
# Edit .env with your configuration
\`\`\`

### 5. Build Application
\`\`\`bash
npm run build
\`\`\`

### 6. Run Application
\`\`\`bash
npm start
\`\`\`

## 📦 Database Schema

The complete database schema is defined in:
- \`database/create-complete-schema.sql\`
- \`shared/schema.ts\` (Drizzle ORM schema)

To apply the schema:
\`\`\`bash
# PostgreSQL
psql -h host -U user -d database -f database/create-complete-schema.sql

# Or use the init script
./database/init-database.sh
\`\`\`

## 📊 Sample Data

Sample data can be generated using multiple methods:

1. **JavaScript Scripts** (Recommended)
   - \`scripts/init-sample-data.js\`
   - \`scripts/create-comprehensive-sample-data.js\`
   - \`scripts/deploy-init-sample-data.js\`

2. **SQL Scripts**
   - \`database/init-sample-data.sql\`

3. **Seed Files**
   - \`database/seeds/\` directory contains workflow templates and seed data

## 🔧 Deployment

### Docker Deployment
\`\`\`bash
# Build image
docker build -t nh-financial-analysis:latest .

# Run container
docker run -p 5000:5000 nh-financial-analysis:latest
\`\`\`

### Azure Deployment
\`\`\`bash
# Deploy to ACR
./deploy-to-acr.sh

# Deploy to App Service
./deploy-to-app-service.sh
\`\`\`

## 📝 Important Notes

1. **Environment Variables**: Set up all required environment variables in \`.env\`
2. **Database Connection**: Configure PostgreSQL connection string
3. **Azure Services**: Configure Azure services (OpenAI, Databricks, CosmosDB, etc.)
4. **Dependencies**: Ensure Node.js 20+ is installed
5. **Database**: PostgreSQL 14+ required

## 📚 Additional Documentation

- Deployment: See \`DEPLOYMENT.md\`
- Azure Deployment: See \`AZURE_APP_SERVICE_DEPLOYMENT.md\`
- Sample Data: See \`DEPLOYMENT_SAMPLE_DATA.md\`
- API Documentation: See \`docs/\` directory

---

**Export Information:**
- Export Date: ${EXPORT_DATE}
- Package Type: Full Source Code (Complete)
- Includes: Schema Migration + Sample Data Scripts
EOF

# Create deployment checklist
cat > "${TEMP_DIR}/DEPLOYMENT_CHECKLIST.md" << 'EOFCHECKLIST'
# Deployment Checklist

Use this checklist to ensure a complete deployment.

## Pre-Deployment
- [ ] Environment variables configured (.env)
- [ ] Database server accessible
- [ ] Azure services configured (if using)
- [ ] Dependencies installed (npm install)

## Database Setup
- [ ] Database created
- [ ] Schema migrated (database/create-complete-schema.sql)
- [ ] Sample data generated (scripts/init-sample-data.js)
- [ ] Database connection tested

## Application Setup
- [ ] Application built (npm run build)
- [ ] Port configuration checked
- [ ] Health check endpoint verified

## Deployment
- [ ] Docker image built (if using Docker)
- [ ] Image pushed to registry (if using)
- [ ] Application deployed
- [ ] Application accessible
- [ ] Logs monitored

## Post-Deployment
- [ ] API endpoints tested
- [ ] Frontend accessible
- [ ] Database queries working
- [ ] Sample data visible
- [ ] Error logs checked
EOFCHECKLIST

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

# Count files
FILE_COUNT=$(find ${ARCHIVE_NAME} -type f | wc -l | tr -d ' ')

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Archive created successfully${NC}"
    echo -e "\n${BLUE}📊 Export Details:${NC}"
    echo -e "  Archive: ${FINAL_ARCHIVE}"
    echo -e "  Size: ${ARCHIVE_SIZE}"
    echo -e "  Files: ${FILE_COUNT} files"
    echo -e "\n${YELLOW}📋 Included Components:${NC}"
    echo -e "  ✓ Full Application Source Code"
    echo -e "  ✓ Schema Migration Files"
    echo -e "  ✓ Sample Data Generation Scripts"
    echo -e "  ✓ Database Initialization Scripts"
    echo -e "  ✓ Deployment Scripts"
    echo -e "  ✓ Documentation"
    echo -e "\n${YELLOW}To extract this archive:${NC}"
    echo -e "  tar -xzf ${FINAL_ARCHIVE}"
    
    # Clean up temp directory
    rm -rf ${TEMP_DIR}
else
    echo -e "${RED}❌ Archive creation failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}=== Full Source Code Export Complete ===${NC}"
echo -e "${BLUE}Archive exported to: ${FINAL_ARCHIVE}${NC}"
echo -e "\n${YELLOW}This package includes:${NC}"
echo -e "  - Complete source code"
echo -e "  - Schema migration files"
echo -e "  - Sample data generation scripts"
echo -e "  - Database initialization scripts"
echo -e "  - All deployment scripts"

