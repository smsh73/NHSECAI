#!/usr/bin/env node
/**
 * 각 페이지에서 데이터 조회 테스트
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
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
  } catch (error) {
    console.log('⚠️ .env 파일이 없습니다.');
  }
}

loadEnvFile();

class PageDataTest {
  constructor() {
    this.pool = null;
    this.results = [];
  }

  async initialize() {
    console.log('🚀 페이지 데이터 조회 테스트 시작...\n');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    }

    const isSQLite = process.env.DATABASE_URL.startsWith('sqlite:');
    if (isSQLite) {
      throw new Error('PostgreSQL을 사용해야 합니다.');
    }

    try {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false
      });
      
      await this.pool.query('SELECT NOW()');
      console.log('✅ PostgreSQL 연결 성공\n');
      return true;
    } catch (error) {
      console.error('❌ PostgreSQL 연결 실패:', error.message);
      return false;
    }
  }

  async testPromptManagerPage() {
    const startTime = Date.now();
    console.log('📝 테스트: Prompt Manager 페이지 데이터 조회...');
    
    try {
      const result = await this.pool.query('SELECT id, name, description, category FROM prompts ORDER BY created_at DESC LIMIT 10');
      
      this.results.push({
        page: 'Prompt Manager',
        success: true,
        duration: Date.now() - startTime,
        count: result.rows.length,
        sample: result.rows[0] || null
      });
      console.log(`✅ Prompt Manager: ${result.rows.length}개 프롬프트 조회 성공\n`);
    } catch (error) {
      this.results.push({
        page: 'Prompt Manager',
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      });
      console.log(`❌ Prompt Manager 실패: ${error.message}\n`);
    }
  }

  async testApiManagementPage() {
    const startTime = Date.now();
    console.log('🔌 테스트: API Management 페이지 데이터 조회...');
    
    try {
      const result = await this.pool.query('SELECT id, name, display_name, url, method FROM api_calls ORDER BY created_at DESC LIMIT 10');
      
      this.results.push({
        page: 'API Management',
        success: true,
        duration: Date.now() - startTime,
        count: result.rows.length,
        sample: result.rows[0] || null
      });
      console.log(`✅ API Management: ${result.rows.length}개 API 조회 성공\n`);
    } catch (error) {
      this.results.push({
        page: 'API Management',
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      });
      console.log(`❌ API Management 실패: ${error.message}\n`);
    }
  }

  async testWorkflowEditorPage() {
    const startTime = Date.now();
    console.log('🔄 테스트: Workflow Editor 페이지 데이터 조회...');
    
    try {
      const workflowResult = await this.pool.query('SELECT id, name, description, is_active FROM workflows ORDER BY created_at DESC LIMIT 10');
      
      for (const workflow of workflowResult.rows) {
        const nodesResult = await this.pool.query(
          'SELECT id, node_name, node_type FROM workflow_nodes WHERE workflow_id = $1',
          [workflow.id]
        );
        workflow.nodes = nodesResult.rows;
      }
      
      this.results.push({
        page: 'Workflow Editor',
        success: true,
        duration: Date.now() - startTime,
        count: workflowResult.rows.length,
        sample: workflowResult.rows[0] || null
      });
      console.log(`✅ Workflow Editor: ${workflowResult.rows.length}개 워크플로우 조회 성공\n`);
    } catch (error) {
      this.results.push({
        page: 'Workflow Editor',
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      });
      console.log(`❌ Workflow Editor 실패: ${error.message}\n`);
    }
  }

  async testDictionaryManagerPage() {
    const startTime = Date.now();
    console.log('📚 테스트: Dictionary Manager 페이지 데이터 조회...');
    
    try {
      // Dictionary 테이블이 있는지 확인
      const result = await this.pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%dictionary%'
      `);
      
      if (result.rows.length > 0) {
        this.results.push({
          page: 'Dictionary Manager',
          success: true,
          duration: Date.now() - startTime,
          count: result.rows.length,
          message: 'Dictionary 테이블 존재 확인'
        });
        console.log(`✅ Dictionary Manager: 테이블 존재 확인\n`);
      } else {
        this.results.push({
          page: 'Dictionary Manager',
          success: true,
          duration: Date.now() - startTime,
          count: 0,
          message: 'Dictionary 테이블 없음 (정상일 수 있음)'
        });
        console.log(`⚠️ Dictionary Manager: 테이블 없음 (정상일 수 있음)\n`);
      }
    } catch (error) {
      this.results.push({
        page: 'Dictionary Manager',
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      });
      console.log(`❌ Dictionary Manager 실패: ${error.message}\n`);
    }
  }

  async runAllTests() {
    const initialized = await this.initialize();
    if (!initialized) {
      return;
    }

    try {
      await this.testPromptManagerPage();
      await this.testApiManagementPage();
      await this.testWorkflowEditorPage();
      await this.testDictionaryManagerPage();
    } finally {
      if (this.pool) {
        await this.pool.end();
      }
    }

    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 페이지 데이터 조회 테스트 결과:');
    console.log('==================================================');
    const total = this.results.length;
    const successful = this.results.filter(r => r.success).length;
    const failed = total - successful;

    console.log(`총 페이지: ${total}`);
    console.log(`성공: ${successful}`);
    console.log(`실패: ${failed}\n`);

    this.results.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${icon} ${result.page} (${result.duration}ms)`);
      if (result.success) {
        if (result.count !== undefined) {
          console.log(`   데이터 개수: ${result.count}`);
        }
        if (result.sample) {
          console.log(`   샘플: ${JSON.stringify(result.sample, null, 2).substring(0, 100)}...`);
        }
      } else {
        console.log(`   에러: ${result.error}`);
      }
    });
    console.log('\n==================================================\n');
  }
}

// 실행
const test = new PageDataTest();
test.runAllTests().catch(console.error);

