#!/usr/bin/env node
/**
 * 샘플 데이터 초기화 스크립트
 * Docker 컨테이너 시작 시 자동 실행되도록 구성 가능
 */

import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

// Azure 환경에서는 환경변수를 직접 사용
if (!process.env.DATABASE_URL) {
  console.log('⚠️ DATABASE_URL이 설정되지 않았습니다. 샘플 데이터 생성을 건너뜁니다.');
  process.exit(0);
}

// 샘플 데이터 생성이 이미 완료되었는지 확인
async function checkSampleDataExists(pool) {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM users WHERE username = $1', ['admin']);
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    return false;
  }
}

// 간단한 샘플 데이터 생성 (최소 필수 데이터만)
async function createEssentialSampleData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // 연결 테스트
    await pool.query('SELECT NOW()');
    
    // 이미 데이터가 있으면 건너뛰기
    const exists = await checkSampleDataExists(pool);
    if (exists) {
      console.log('✅ 샘플 데이터가 이미 존재합니다.');
      return;
    }

    console.log('🚀 필수 샘플 데이터 생성 시작...');

    // 관리자 사용자 생성
    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    await pool.query(`
      INSERT INTO users (id, username, password, role, created_at)
      VALUES (gen_random_uuid(), 'admin', $1, 'admin', NOW())
      ON CONFLICT (username) DO NOTHING
    `, [adminPassword]);

    console.log('✅ 샘플 데이터 생성 완료');
  } catch (error) {
    console.error('❌ 샘플 데이터 생성 실패:', error.message);
    // 에러가 있어도 계속 진행 (애플리케이션 시작은 가능)
  } finally {
    await pool.end();
  }
}

// 직접 실행 시 또는 import 시 자동 실행
const shouldRun = process.env.INIT_SAMPLE_DATA === 'true' || import.meta.url.endsWith(process.argv[1]);
if (shouldRun) {
  createEssentialSampleData().catch(console.error);
}

export { createEssentialSampleData };

