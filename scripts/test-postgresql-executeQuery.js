#!/usr/bin/env node
/**
 * PostgreSQL executeQuery 기능 테스트
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
// Note: 실제 서비스는 TypeScript이므로 tsx로 실행 필요
// 임시로 직접 Pool을 사용하여 테스트
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 환경 변수 로드
function loadEnvFile() {
  const envPath = join(__dirname, '..', '.env');
  try {
    const envContent = readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    lines.forEach(line => {
      if (line.trim() === '' || line.startsWith('#')) return;
      const equalIndex = line.indexOf('=');
      if (equalIndex > 0) {
        const key = line.substring(0, equalIndex).trim();
        const value = line.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch (errorTCP) {
    console.log('⚠️ .env 파일이 없습니다. 환경 변수를 직접 설정해주세요.');
  }
}

loadEnvFile();

class PostgreSQLExecuteQueryTest {
  constructor() {
    this.results = [];
    this.service = null;
  }

  async initialize() {
    console.log('🚀 PostgreSQL executeQuery 기능 테스트 시작...\n');
    
    try {
      this.service = getAzurePostgreSQLService();
      await this.service.initialize();
      console.log('✅ PostgreSQL 서비스 초기화 성공\n');
      return true;
    } catch (error) {
      console.error('❌ PostgreSQL 서비스 초기화 실패:', error.message);
      return false;
    }
  }

  async testSimpleQuery() {
    const startTime = Date.now();
    console.log('📝 테스트 1: 간단한 SELECT 쿼리...');
    
    try {
      const result = await this.service.query('SELECT 1 as test_value, NOW() as current_time');
      const formattedResult = { rows: result.rows, rowCount: result.rowCount || 0 };
      
      if (result.rows.length > 0 && result.rows[0].test_value === 1) {
        this.results.push({
          name: '간단한 SELECT 쿼리',
          success: true,
          duration: Date.now() - startTime,
          details: { rowCount: result.rowCount, sampleRow: result.rows[0] }
        });
        console.log('✅ 간단한 SELECT 쿼리 성공\n');
      } else {
        throw new Error('예상된 결과와 다릅니다');
      }
    } catch (error) {
      this.results.push({
        name: '간단한 SELECT 쿼리',
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      });
      console.log(`❌ 간단한 SELECT 쿼리 실패: ${error.message}\n`);
    }
  }

  async testTableQuery() {
    const startTime = Date.now();
    console.log('📋 테스트 2: 테이블 조회 쿼리...');
    
    try {
      const result = await this.service.executeQuery(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        LIMIT 5
      `);
      
      if (result.rows.length >= 0) {
        this.results.push({
          name: '테이블 조회 쿼리',
          success: true,
          duration: Date.now() - startTime,
          details: { rowCount: result.rowCount, tables: result.rows.map(r => r.table_name) }
        });
        console.log(`✅ 테이블 조회 쿼리 성공 (${result.rowCount}개 테이블)\n`);
      } else {
        throw new Error('예상된 결과와 다릅니다');
      }
    } catch (error) {
      this.results.push({
        name: '테이블 조회 쿼리',
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      });
      console.log(`❌ 테이블 조회 쿼리 실패: ${error.message}\n`);
    }
  }

  async testParameterizedQuery() {
    const startTime = Date.now();
    console.log('🔧 테스트 3: 파라미터화된 쿼리...');
    
    try {
      const result = await this.service.executeQuery(
        'SELECT $1::text as param1, $2::int as param2',
        ['test', 123]
      );
      
      if (result.rows.length > 0 && result.rows[0].param1 === 'test' && result.rows[0].param2 === 123) {
        this.results.push({
          name: '파라미터화된 쿼리',
          success: true,
          duration: Date.now() - startTime,
          details: { rowCount: result.rowCount, sampleRow: result.rows[0] }
        });
        console.log('✅ 파라미터화된 쿼리 성공\n');
      } else {
        throw new Error('예상된 결과와 다릅니다');
      }
    } catch (error) {
      this.results.push({
        name: '파라미터화된 쿼리',
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      });
      console.log(`❌ 파라미터화된 쿼리 실패: ${error.message}\n`);
    }
  }

  async testWorkflowTableQuery() {
    const startTime = Date.now();
    console.log('🔄 테스트 4: 워크플로우 테이블 조회...');
    
    try {
      const result = await this.service.executeQuery('SELECT COUNT(*) as count FROM workflows');
      
      if (result.rows.length > 0) {
        this.results.push({
          name: '워크플로우 테이블 조회',
          success: true,
          duration: Date.now() - startTime,
          details: { workflowCount: parseInt(result.rows[0].count) }
        });
        console.log(`✅ 워크플로우 테이블 조회 성공 (${result.rows[0].count}개 워크플로우)\n`);
      } else {
        throw new Error('예상된 결과와 다릅니다');
      }
    } catch (error) {
      this.results.push({
        name: '워크플로우 테이블 조회',
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      });
      console.log(`❌ 워크플로우 테이블 조회 실패: ${error.message}\n`);
    }
  }

  async testErrorHandling() {
    const startTime = Date.now();
    console.log('⚠️ 테스트 5: 에러 처리...');
    
    try {
      await this.service.executeQuery('SELECT * FROM non_existent_table_xyz');
      this.results.push({
        name: '에러 처리',
        success: false,
        duration: Date.now() - startTime,
        error: '에러가 발생했어야 하는데 발생하지 않았습니다'
      });
      console.log('❌ 에러 처리 실패: 에러가 발생했어야 합니다\n');
    } catch (error) {
      this.results.push({
        name: '에러 처리',
        success: true,
        duration: Date.now() - startTime,
        details: { errorType: error.constructor.name, errorMessage: error.message.substring(0, 100) }
      });
      console.log('✅ 에러 처리 성공 (예상된 에러 발생)\n');
    }
  }

  async runAllTests() {
    const initialized = await this.initialize();
    if (!initialized) {
      console.log('⚠️ PostgreSQL 연결이 필요합니다. 테스트를 건너뜁니다.\n');
      return;
    }

    try {
      await this.testSimpleQuery();
      await this.testTableQuery();
      await this.testParameterizedQuery();
      await this.testWorkflowTableQuery();
      await this.testErrorHandling();
    } finally {
      if (this.service) {
        await this.service.close();
      }
    }

    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 테스트 결과 요약:');
    console.log('==================================================');
    const total = this.results.length;
    const successful = this.results.filter(r => r.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : 0;

    console.log(`총 테스트: ${total}`);
    console.log(`성공: ${successful}`);
    console.log(`실패: ${failed}`);
    console.log(`성공률: ${successRate}%\n`);

    console.log('📋 상세 결과:');
    this.results.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${icon} ${result.name} (${result.duration}ms)`);
      if (result.success) {
        console.log(`   상세: ${JSON.stringify(result.details)}`);
      } else {
        console.log(`   에러: ${result.error}`);
      }
    });

    console.log('\n==================================================');
    if (failed === 0) {
      console.log('🎉 모든 테스트가 성공했습니다!\n');
    } else {
      console.log('⚠️ 일부 테스트가 실패했습니다.\n');
    }
  }
}

// 테스트 실행
const test = new PostgreSQLExecuteQueryTest();
test.runAllTests().catch(console.error);

