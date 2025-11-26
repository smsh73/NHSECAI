#!/usr/bin/env node
/**
 * 배포 시 샘플 데이터 초기화 스크립트
 * Docker 컨테이너 시작 시 또는 수동으로 실행 가능
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Azure 환경에서는 환경변수를 직접 사용
if (!process.env.DATABASE_URL) {
  console.log('⚠️ DATABASE_URL이 설정되지 않았습니다.');
  process.exit(1);
}

async function initSampleData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🚀 샘플 데이터 초기화 시작...');
    
    // SQL 파일 읽기
    const sqlPath = join(__dirname, '..', 'database', 'init-sample-data.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    // SQL 문을 개별 실행 (한 번에 실행하면 에러 발생 가능)
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        try {
          await pool.query(trimmed);
        } catch (error) {
          // 일부 테이블이 없을 수 있으므로 경고만 출력
          if (!error.message.includes('does not exist')) {
            console.warn(`⚠️ SQL 실행 경고: ${error.message}`);
          }
        }
      }
    }
    
    console.log('✅ 샘플 데이터 초기화 완료');
  } catch (error) {
    console.error('❌ 샘플 데이터 초기화 실패:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initSampleData();

