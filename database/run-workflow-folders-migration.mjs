#!/usr/bin/env node

/**
 * Workflow Folders Migration Script (Node.js version)
 * This script adds workflow_folders table and updates workflows table
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATION_FILE = join(__dirname, '..', 'migrations', '001_add_workflow_folders.sql');

async function runMigration() {
  try {
    // Check DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.error('❌ Error: DATABASE_URL environment variable is not set');
      console.error('Please set DATABASE_URL before running this migration.');
      console.error("Example: export DATABASE_URL='postgresql://user:pass@host:port/db'");
      process.exit(1);
    }

    // Check if migration file exists
    try {
      readFileSync(MIGRATION_FILE, 'utf8');
    } catch (error) {
      console.error(`❌ Error: Migration file not found: ${MIGRATION_FILE}`);
      process.exit(1);
    }

    console.log('=== Workflow Folders Migration ===');
    console.log(`Database URL: ${process.env.DATABASE_URL.split('@')[0]}@***`);
    console.log(`Migration file: ${MIGRATION_FILE}`);

    // Read and execute migration
    const migrationSQL = readFileSync(MIGRATION_FILE, 'utf8');
    
    console.log('\n📝 Running migration...');
    execSync(`psql "${process.env.DATABASE_URL}" -f "${MIGRATION_FILE}"`, {
      stdio: 'inherit'
    });

    console.log('\n✅ Migration completed successfully!');

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const verifySQL = `
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
    `;

    execSync(`psql "${process.env.DATABASE_URL}" -c "${verifySQL}"`, {
      stdio: 'inherit'
    });

    console.log('\n✅ Migration verification complete!');
  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error(error.message);
    process.exit(1);
  }
}

runMigration();

