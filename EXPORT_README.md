# Full Source Code Export (Complete Package)

This is a complete export of the aitradeconsole source code including:
- **Full Application Source Code**
- **Schema Migration Code**
- **Sample Data Generation Scripts**
- **Database Initialization Scripts**
- **Deployment Scripts**

**Export Date:** 20251031-080412
**Export Time:** Fri Oct 31 08:04:14 KST 2025

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
```bash
npm install
```

### 2. Database Setup
```bash
# Run schema migration
./database/init-database.sh

# Or manually
psql -h your-host -U your-user -d your-database -f database/create-complete-schema.sql
```

### 3. Generate Sample Data
```bash
# Option 1: Using Node.js script
node scripts/init-sample-data.js

# Option 2: Using comprehensive script
node scripts/create-comprehensive-sample-data.js

# Option 3: Using deployment script
node scripts/deploy-init-sample-data.js

# Option 4: Using SQL directly
psql -h your-host -U your-user -d your-database -f database/init-sample-data.sql
```

### 4. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 5. Build Application
```bash
npm run build
```

### 6. Run Application
```bash
npm start
```

## 📦 Database Schema

The complete database schema is defined in:
- `database/create-complete-schema.sql`
- `shared/schema.ts` (Drizzle ORM schema)

To apply the schema:
```bash
# PostgreSQL
psql -h host -U user -d database -f database/create-complete-schema.sql

# Or use the init script
./database/init-database.sh
```

## 📊 Sample Data

Sample data can be generated using multiple methods:

1. **JavaScript Scripts** (Recommended)
   - `scripts/init-sample-data.js`
   - `scripts/create-comprehensive-sample-data.js`
   - `scripts/deploy-init-sample-data.js`

2. **SQL Scripts**
   - `database/init-sample-data.sql`

3. **Seed Files**
   - `database/seeds/` directory contains workflow templates and seed data

## 🔧 Deployment

### Docker Deployment
```bash
# Build image
docker build -t nh-financial-analysis:latest .

# Run container
docker run -p 5000:5000 nh-financial-analysis:latest
```

### Azure Deployment
```bash
# Deploy to ACR
./deploy-to-acr.sh

# Deploy to App Service
./deploy-to-app-service.sh
```

## 📝 Important Notes

1. **Environment Variables**: Set up all required environment variables in `.env`
2. **Database Connection**: Configure PostgreSQL connection string
3. **Azure Services**: Configure Azure services (OpenAI, Databricks, CosmosDB, etc.)
4. **Dependencies**: Ensure Node.js 20+ is installed
5. **Database**: PostgreSQL 14+ required

## 📚 Additional Documentation

- Deployment: See `DEPLOYMENT.md`
- Azure Deployment: See `AZURE_APP_SERVICE_DEPLOYMENT.md`
- Sample Data: See `DEPLOYMENT_SAMPLE_DATA.md`
- API Documentation: See `docs/` directory

---

**Export Information:**
- Export Date: 20251031-080412
- Package Type: Full Source Code (Complete)
- Includes: Schema Migration + Sample Data Scripts
