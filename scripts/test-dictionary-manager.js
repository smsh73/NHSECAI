#!/usr/bin/env node

/**
 * Dictionary Manager 기능 테스트 스크립트
 * - Dictionary Manager 페이지의 API 엔드포인트 테스트
 * - 환경변수와의 연동 확인
 * - CRUD 기능 검증
 */

import { storage } from '../server/storage.ts';
import { detailedLogger } from '../server/services/detailed-logger.ts';

const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(testName, passed, error = null) {
  if (passed) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}`);
    testResults.failed++;
    if (error) {
      testResults.errors.push({ test: testName, error: error.message || error });
      detailedLogger.logError('DICTIONARY_MANAGER_TEST', testName, error);
    }
  }
}

async function testSchemaInfoAPI() {
  try {
    console.log('\n🔍 Schema Info API 테스트');
    
    const schemaInfo = await storage.getSchemaInfo();
    
    logTest('Schema Info 조회', schemaInfo && schemaInfo.tables && Array.isArray(schemaInfo.tables));
    logTest('Schema Info 테이블 존재', schemaInfo.tables.length > 0);
    
    if (schemaInfo.tables.length > 0) {
      const firstTable = schemaInfo.tables[0];
      logTest('테이블 구조 검증', 
        firstTable.name && 
        firstTable.displayName && 
        firstTable.columns && 
        Array.isArray(firstTable.columns)
      );
    }
    
    return schemaInfo;
  } catch (error) {
    logTest('Schema Info API', false, error);
    return null;
  }
}

async function testDictionaryCRUD() {
  try {
    console.log('\n📚 Dictionary CRUD 테스트');
    
    // 1. 기본 Dictionary 조회/생성
    let defaultDictionary;
    try {
      const dictionaries = await storage.getDictionaries({ name: 'default' });
      if (dictionaries.length === 0) {
        defaultDictionary = await storage.createDictionary({
          name: 'default',
          description: '기본 Dictionary - 데이터베이스 스키마 사전',
          sourceId: 'default',
          isActive: true
        });
        logTest('기본 Dictionary 생성', true);
      } else {
        defaultDictionary = dictionaries[0];
        logTest('기본 Dictionary 조회', true);
      }
    } catch (error) {
      logTest('기본 Dictionary 처리', false, error);
      return;
    }
    
    // 2. Dictionary Entry 생성
    const testEntry = {
      dictionaryId: defaultDictionary.id,
      tableName: 'test_table',
      columnName: 'test_column',
      meaningKo: '테스트 컬럼',
      meaningEn: 'Test Column',
      meaningKokr: '테스트 컬럼',
      tags: ['test', 'sample'],
      notes: '테스트용 Dictionary Entry'
    };
    
    try {
      const createdEntry = await storage.createDictionaryEntry(testEntry);
      logTest('Dictionary Entry 생성', createdEntry && createdEntry.id);
      
      // 3. Dictionary Entry 조회
      const entries = await storage.getDictionaryEntries({
        dictionaryId: defaultDictionary.id,
        tableName: 'test_table'
      });
      logTest('Dictionary Entry 조회', entries.length > 0);
      
      // 4. Dictionary Entry 업데이트
      const updatedEntry = await storage.updateDictionaryEntry(createdEntry.id, {
        meaningKo: '업데이트된 테스트 컬럼',
        notes: '업데이트된 메모'
      });
      logTest('Dictionary Entry 업데이트', updatedEntry && updatedEntry.meaningKo === '업데이트된 테스트 컬럼');
      
      // 5. Dictionary Entry 삭제
      await storage.deleteDictionaryEntry(createdEntry.id);
      logTest('Dictionary Entry 삭제', true);
      
    } catch (error) {
      logTest('Dictionary Entry CRUD', false, error);
    }
    
  } catch (error) {
    logTest('Dictionary CRUD 전체', false, error);
  }
}

async function testEnvironmentVariables() {
  try {
    console.log('\n🔧 환경변수 테스트');
    
    const requiredEnvVars = [
      'DATABASE_URL',
      'NODE_ENV'
    ];
    
    const optionalEnvVars = [
      'AZURE_OPENAI_ENDPOINT',
      'AZURE_OPENAI_API_KEY',
      'AZURE_DATABRICKS_WORKSPACE_URL',
      'AZURE_DATABRICKS_ACCESS_TOKEN',
      'AZURE_SEARCH_ENDPOINT',
      'AZURE_SEARCH_API_KEY'
    ];
    
    // 필수 환경변수 확인
    for (const envVar of requiredEnvVars) {
      const exists = process.env[envVar] !== undefined;
      logTest(`필수 환경변수 ${envVar}`, exists);
    }
    
    // 선택적 환경변수 확인
    for (const envVar of optionalEnvVars) {
      const exists = process.env[envVar] !== undefined;
      logTest(`선택적 환경변수 ${envVar}`, exists);
    }
    
  } catch (error) {
    logTest('환경변수 테스트', false, error);
  }
}

async function testDatabaseConnection() {
  try {
    console.log('\n🗄️ 데이터베이스 연결 테스트');
    
    // 간단한 쿼리로 연결 테스트
    const schemaInfo = await storage.getSchemaInfo();
    logTest('데이터베이스 연결', schemaInfo !== null);
    
    // Dictionary 테이블 존재 확인
    const dictionaries = await storage.getDictionaries({});
    logTest('Dictionary 테이블 접근', Array.isArray(dictionaries));
    
  } catch (error) {
    logTest('데이터베이스 연결', false, error);
  }
}

async function runAllTests() {
  console.log('🚀 Dictionary Manager 기능 테스트 시작\n');
  
  try {
    await testEnvironmentVariables();
    await testDatabaseConnection();
    await testSchemaInfoAPI();
    await testDictionaryCRUD();
    
    console.log('\n📊 테스트 결과 요약');
    console.log(`✅ 성공: ${testResults.passed}`);
    console.log(`❌ 실패: ${testResults.failed}`);
    console.log(`📈 성공률: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ 실패한 테스트들:');
      testResults.errors.forEach(({ test, error }) => {
        console.log(`  - ${test}: ${error}`);
      });
    }
    
    if (testResults.failed === 0) {
      console.log('\n🎉 모든 테스트가 성공적으로 완료되었습니다!');
    } else {
      console.log('\n⚠️ 일부 테스트가 실패했습니다. 로그를 확인해주세요.');
    }
    
  } catch (error) {
    console.error('❌ 테스트 실행 중 오류 발생:', error);
    detailedLogger.logError('DICTIONARY_MANAGER_TEST', 'runAllTests', error);
  }
}

// 테스트 실행
runAllTests().catch(console.error);
