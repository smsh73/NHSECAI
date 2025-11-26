// database/run-migration.mjs
// success_code 필드 추가 마이그레이션 실행 스크립트
// 날짜: 2025-11-03

import { readFileSync } from 'fs';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const { Pool } = pg;

// .env 파일 로드
dotenv.config();

// 현재 파일의 디렉토리 경로
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 데이터베이스 연결 설정
const DATABASE_URL = process.env.DATABASE_URL || 
  process.env.POSTGRES_URL || 
  process.env.POSTGRES_CONNECTION_STRING;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  console.error('다음 중 하나의 방법으로 설정해주세요:');
  console.error('1. .env 파일에 DATABASE_URL 추가');
  console.error('2. export DATABASE_URL=\'postgresql://user:pass@host:port/db\'');
  console.error('3. 또는 직접 연결 정보를 입력하세요');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL
});

try {
  console.log('📊 마이그레이션 시작: success_code 필드 추가');
  console.log('데이터베이스 URL:', DATABASE_URL.replace(/:[^:@]+@/, ':****@')); // 비밀번호 마스킹

  // 1. 데이터베이스 연결 테스트
  console.log('\n[1/4] 데이터베이스 연결 테스트...');
  await pool.query('SELECT 1');
  console.log('✅ 데이터베이스 연결 성공');

  // 2. application_logs 테이블 존재 확인
  console.log('\n[2/4] application_logs 테이블 확인...');
  const tableCheck = await pool.query(`
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'application_logs'
  `);
  
  if (tableCheck.rows.length === 0) {
    console.error('❌ application_logs 테이블이 존재하지 않습니다.');
    console.error('먼저 기본 스키마를 생성해야 합니다:');
    console.error('  ./database/init-database.sh');
    process.exit(1);
  }
  console.log('✅ application_logs 테이블 확인됨');

  // 3. success_code 컬럼 존재 여부 확인
  console.log('\n[3/4] success_code 컬럼 확인...');
  const columnCheck = await pool.query(`
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'application_logs' 
      AND column_name = 'success_code'
  `);
  
  if (columnCheck.rows.length > 0) {
    console.log('⚠️  success_code 컬럼이 이미 존재합니다.');
    console.log('마이그레이션을 계속 진행합니다 (IF NOT EXISTS로 안전하게 처리됨)');
  } else {
    console.log('✅ success_code 컬럼이 없습니다. 마이그레이션 진행합니다.');
  }

  // 4. 마이그레이션 실행
  console.log('\n[4/4] 마이그레이션 실행 중...');
  const migrationFile = join(__dirname, 'migration-add-success-code.sql');
  const sql = readFileSync(migrationFile, 'utf8');
  
  await pool.query(sql);
  
  console.log('✅ 마이그레이션 완료');

  // 마이그레이션 결과 확인
  console.log('\n📊 마이그레이션 결과 확인:');
  const result = await pool.query(`
    SELECT 
      column_name, 
      data_type, 
      character_maximum_length 
    FROM information_schema.columns 
    WHERE table_name = 'application_logs' 
      AND column_name = 'success_code'
  `);
  
  if (result.rows.length > 0) {
    const column = result.rows[0];
    console.log(`✅ 컬럼 정보:`);
    console.log(`   이름: ${column.column_name}`);
    console.log(`   타입: ${column.data_type}`);
    console.log(`   길이: ${column.character_maximum_length || 'N/A'}`);
  } else {
    console.log('⚠️  success_code 컬럼이 아직 존재하지 않습니다.');
  }

  console.log('\n✅ 마이그레이션 완료!');
  console.log('\n다음 단계:');
  console.log('1. 애플리케이션을 재시작하여 변경된 로깅 로직이 적용되도록 합니다');
  console.log('2. 새로운 로그를 생성하여 success_code가 저장되는지 확인합니다');
  console.log('3. 로그 뷰어에서 success_code가 표시되는지 확인합니다');

} catch (error) {
  console.error('❌ 마이그레이션 실패:');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  await pool.end();
}

