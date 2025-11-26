// database/run-schema.mjs
import { readFileSync } from 'fs';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://nhadmin:nhinvestment12%23@nh-ai-admin-pg-dev.postgres.database.azure.com:5432/financial-analysis-dev?sslmode=require'
});

try {
  const sql = readFileSync('database/unified-schema.sql', 'utf8');
  console.log('SQL 파일 로드 완료');
  
  await pool.query(sql);
  console.log('✅ 통합 스키마 생성 완료');
  
} catch (error) {
  console.error('❌ 오류:', error.message);
  console.error(error);
} finally {
  await pool.end();
}
