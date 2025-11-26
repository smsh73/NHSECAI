#!/usr/bin/env node
/**
 * 핵심 기능 테스트 스크립트
 * - 스키마 생성
 * - 워크플로우 에디터 저장/로드
 * - 노드 생성 관리
 * - JSON 입출력 기능
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';

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
    console.log('⚠️ .env 파일이 없습니다. 환경 변수를 직접 설정해주세요.');
  }
}

loadEnvFile();

class CoreFunctionalityTest {
  constructor() {
    this.results = [];
    this.pool = null;
  }

  async initialize() {
    console.log('🚀 핵심 기능 테스트 시작...\n');
    
    // PostgreSQL 연결 확인
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    }

    const isSQLite = process.env.DATABASE_URL.startsWith('sqlite:');
    if (isSQLite) {
      console.log('⚠️  현재 SQLite를 사용 중입니다. PostgreSQL로 전환하는 것을 권장합니다.');
      console.log('   PostgreSQL을 사용하려면 DATABASE_URL을 postgresql:// 형식으로 설정하세요.\n');
      return false;
    }

    try {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false
      });
      
      const result = await this.pool.query('SELECT NOW()');
      console.log('✅ PostgreSQL 연결 성공\n');
      return true;
    } catch (error) {
      console.error('❌ PostgreSQL 연결 실패:', error.message);
      return false;
    }
  }

  async testSchemaCreation() {
    const startTime = Date.now();
    console.log('📋 테스트 1: 스키마 생성 확인...');
    
    try {
      // 주요 테이블 존재 확인
      const tables = [
        'workflows',
        'workflow_nodes',
        'workflow_sessions',
        'workflow_session_data',
        'prompts',
        'api_calls'
      ];

      const results = [];
      for (const table of tables) {
        const result = await this.pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [table]);
        results.push({ table, exists: result.rows[0].exists });
      }

      const allExist = results.every(r => r.exists);
      const missingTables = results.filter(r => !r.exists).map(r => r.table);

      if (allExist) {
        this.results.push({
          name: '스키마 생성',
          success: true,
          duration: Date.now() - startTime,
          details: { tables: results.length, allExist: true }
        });
        console.log(`✅ 스키마 생성 확인 성공 (${results.length}개 테이블)\n`);
      } else {
        this.results.push({
          name: '스키마 생성',
          success: false,
          duration: Date.now() - startTime,
          error: `누락된 테이블: ${missingTables.join(', ')}`
        });
        console.log(`❌ 스키마 생성 확인 실패: 누락된 테이블 - ${missingTables.join(', ')}\n`);
      }
    } catch (error) {
      this.results.push({
        name: '스키마 생성',
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      });
      console.log(`❌ 스키마 생성 확인 실패: ${error.message}\n`);
    }
  }

  async testWorkflowEditor() {
    const startTime = Date.now();
    console.log('📝 테스트 2: 워크플로우 에디터 저장/로드...');
    
    try {
      const testWorkflowId = randomUUID();
      const testWorkflow = {
        id: testWorkflowId,
        name: `테스트 워크플로우 ${Date.now()}`,
        description: '핵심 기능 테스트용 워크플로우',
        definition: {
          nodes: [
            {
              id: 'node-1',
              type: 'prompt',
              position: { x: 100, y: 100 },
              data: { label: '프롬프트 노드' }
            }
          ],
          edges: []
        },
        isActive: true
      };

      // 워크플로우 저장
      await this.pool.query(`
        INSERT INTO workflows (id, name, description, definition, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, [
        testWorkflow.id,
        testWorkflow.name,
        testWorkflow.description,
        JSON.stringify(testWorkflow.definition),
        testWorkflow.isActive
      ]);

      // 워크플로우 로드
      const result = await this.pool.query('SELECT * FROM workflows WHERE id = $1', [testWorkflowId]);
      
      if (result.rows.length > 0) {
        // 정리
        await this.pool.query('DELETE FROM workflows WHERE id = $1', [testWorkflowId]);
        
        this.results.push({
          name: '워크플로우 에디터',
          success: true,
          duration: Date.now() - startTime,
          details: { workflowId: testWorkflowId, name: testWorkflow.name }
        });
        console.log(`✅ 워크플로우 에디터 저장/로드 성공\n`);
      } else {
        throw new Error('워크플로우를 찾을 수 없습니다');
      }
    } catch (error) {
      this.results.push({
        name: '워크플로우 에디터',
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      });
      console.log(`❌ 워크플로우 에디터 저장/로드 실패: ${error.message}\n`);
    }
  }

  async testNodeCreation() {
    const startTime = Date.now();
    console.log('🔧 테스트 3: 노드 생성 관리...');
    
    try {
      const testWorkflowId = randomUUID();
      const testNodeId = randomUUID();

      // 워크플로우 생성
      await this.pool.query(`
        INSERT INTO workflows (id, name, definition, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `, [
        testWorkflowId,
        '노드 테스트 워크플로우',
        JSON.stringify({ nodes: [], edges: [] }),
        true
      ]);

      // 노드 생성
      await this.pool.query(`
        INSERT INTO workflow_nodes (id, workflow_id, node_name, node_type, node_order, configuration, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        testNodeId,
        testWorkflowId,
        '테스트 노드',
        'prompt',
        1,
        JSON.stringify({ promptId: 'test-prompt' }),
        true
      ]);

      // 노드 조회
      const result = await this.pool.query('SELECT * FROM workflow_nodes WHERE id = $1', [testNodeId]);
      
      if (result.rows.length > 0) {
        // 정리
        await this.pool.query('DELETE FROM workflow_nodes WHERE workflow_id = $1', [testWorkflowId]);
        await this.pool.query('DELETE FROM workflows WHERE id = $1', [testWorkflowId]);
        
        this.results.push({
          name: '노드 생성 관리',
          success: true,
          duration: Date.now() - startTime,
          details: { nodeId: testNodeId, type: 'prompt' }
        });
        console.log(`✅ 노드 생성 관리 성공\n`);
      } else {
        throw new Error('노드를 찾을 수 없습니다');
      }
    } catch (error) {
      this.results.push({
        name: '노드 생성 관리',
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      });
      console.log(`❌ 노드 생성 관리 실패: ${error.message}\n`);
    }
  }

  async testJsonInputOutput() {
    const startTime = Date.now();
    console.log('📄 테스트 4: JSON 입출력 기능...');
    
    try {
      const testWorkflowId = randomUUID();
      const testSessionId = randomUUID();
      const testNodeId = randomUUID();
      const testData = {
        input: { message: '테스트 메시지', data: [1, 2, 3] },
        output: { result: 'success', processed: true }
      };

      // 워크플로우 생성 (세션 생성에 필요)
      await this.pool.query(`
        INSERT INTO workflows (id, name, definition, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `, [
        testWorkflowId,
        'JSON 테스트 워크플로우',
        JSON.stringify({ nodes: [], edges: [] }),
        true
      ]);

      // 워크플로우 세션 생성
      await this.pool.query(`
        INSERT INTO workflow_sessions (id, workflow_id, session_name, status, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [
        testSessionId,
        testWorkflowId,
        'JSON 테스트 세션',
        'pending'
      ]);

      // 노드 생성
      await this.pool.query(`
        INSERT INTO workflow_nodes (id, workflow_id, node_name, node_type, node_order, configuration, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        testNodeId,
        testWorkflowId,
        'JSON 테스트 노드',
        'prompt',
        1,
        JSON.stringify({ promptId: 'test-prompt' }),
        true
      ]);

      // 세션 데이터 저장 (JSON)
      await this.pool.query(`
        INSERT INTO workflow_session_data (id, session_id, data_key, data_value, data_type, created_by, created_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, NOW())
      `, [
        randomUUID(),
        testSessionId,
        'test_data',
        JSON.stringify(testData),
        'object',
        testNodeId
      ]);

      // 세션 데이터 조회
      const result = await this.pool.query(`
        SELECT data_value FROM workflow_session_data 
        WHERE session_id = $1 AND created_by = $2 AND data_key = $3
      `, [testSessionId, testNodeId, 'test_data']);

      if (result.rows.length > 0) {
        const retrievedData = result.rows[0].data_value;
        
        // JSON 데이터 비교 (키 순서 무시)
        const normalizeJson = (obj) => {
          if (typeof obj === 'string') {
            obj = JSON.parse(obj);
          }
          return JSON.stringify(obj, Object.keys(obj).sort());
        };
        
        const normalizedOriginal = normalizeJson(testData);
        const normalizedRetrieved = normalizeJson(retrievedData);
        
        // 정리
        await this.pool.query('DELETE FROM workflow_session_data WHERE session_id = $1', [testSessionId]);
        await this.pool.query('DELETE FROM workflow_nodes WHERE workflow_id = $1', [testWorkflowId]);
        await this.pool.query('DELETE FROM workflow_sessions WHERE id = $1', [testSessionId]);
        await this.pool.query('DELETE FROM workflows WHERE id = $1', [testWorkflowId]);

        if (normalizedRetrieved === normalizedOriginal) {
          this.results.push({
            name: 'JSON 입출력',
            success: true,
            duration: Date.now() - startTime,
            details: { dataSize: JSON.stringify(testData).length }
          });
          console.log(`✅ JSON 입출력 기능 성공\n`);
        } else {
          throw new Error('JSON 데이터가 일치하지 않습니다');
        }
      } else {
        throw new Error('저장된 데이터를 찾을 수 없습니다');
      }
    } catch (error) {
      // 정리
      try {
        await this.pool.query('DELETE FROM workflow_session_data WHERE session_id = $1', [testSessionId || '']);
        await this.pool.query('DELETE FROM workflow_nodes WHERE workflow_id = $1', [testWorkflowId || '']);
        await this.pool.query('DELETE FROM workflow_sessions WHERE id = $1', [testSessionId || '']);
        await this.pool.query('DELETE FROM workflows WHERE id = $1', [testWorkflowId || '']);
      } catch {}
      
      this.results.push({
        name: 'JSON 입출력',
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      });
      console.log(`❌ JSON 입출력 기능 실패: ${error.message}\n`);
    }
  }

  async runAllTests() {
    const connected = await this.initialize();
    if (!connected) {
      console.log('⚠️  PostgreSQL 연결이 필요합니다. 스키마 관련 테스트는 건너뜁니다.\n');
      return;
    }

    try {
      await this.testSchemaCreation();
      await this.testWorkflowEditor();
      await this.testNodeCreation();
      await this.testJsonInputOutput();
    } finally {
      if (this.pool) {
        await this.pool.end();
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
const test = new CoreFunctionalityTest();
test.runAllTests().catch(console.error);

