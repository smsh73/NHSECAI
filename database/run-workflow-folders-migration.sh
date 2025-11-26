#!/bin/bash

# Workflow Folders Migration Script
# This script adds workflow_folders table and updates workflows table

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Workflow Folders Migration ===${NC}"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    echo "Please set DATABASE_URL before running this migration."
    echo "Example: export DATABASE_URL='postgresql://user:pass@host:port/db'"
    exit 1
fi

# Check if migration file exists
MIGRATION_FILE="migrations/001_add_workflow_folders.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Database URL: ${DATABASE_URL%%@*}@***${NC}"
echo -e "${YELLOW}Migration file: $MIGRATION_FILE${NC}"

# Ask for confirmation
read -p "Do you want to proceed with the migration? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Migration cancelled.${NC}"
    exit 0
fi

# Run migration
echo -e "${GREEN}Running migration...${NC}"
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migration completed successfully!${NC}"
    
    # Verify migration
    echo -e "${YELLOW}Verifying migration...${NC}"
    psql "$DATABASE_URL" -c "
        SELECT 
            CASE 
                WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_folders') 
                THEN '✓ workflow_folders table exists'
                ELSE '✗ workflow_folders table missing'
            END as table_check,
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'workflows' AND column_name = 'folder_id'
                ) 
                THEN '✓ workflows.folder_id column exists'
                ELSE '✗ workflows.folder_id column missing'
            END as folder_id_check,
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'workflows' AND column_name = 'folder_path'
                ) 
                THEN '✓ workflows.folder_path column exists'
                ELSE '✗ workflows.folder_path column missing'
            END as folder_path_check;
    "
else
    echo -e "${RED}✗ Migration failed!${NC}"
    exit 1
fi

