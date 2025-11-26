#!/usr/bin/env tsx
/**
 * Schema Loading Validation Script
 * 
 * 이 스크립트는 모든 스키마가 올바르게 로드되는지 검증합니다.
 * 배포 전에 반드시 실행해야 합니다.
 * 
 * 사용법: tsx scripts/validate-schema-loading.ts
 */

import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

console.log('🔍 스키마 로딩 검증을 시작합니다...\n');

let hasError = false;
const errors: string[] = [];

try {
  // 동적 import를 사용하여 실제 모듈 로딩을 강제
  console.log('📦 스키마 모듈을 로드하는 중...');
  
  // @shared/schema를 직접 import
  const schemaModule = await import('@shared/schema');
  
  console.log('✅ 스키마 모듈 로드 성공\n');
  
  // 모든 주요 테이블이 정의되어 있는지 확인
  const requiredTables = [
    'users',
    'financialData',
    'ragEmbeddingSchemas',
    'ragDataVersionControl',
    'ragDataTamperingDetection',
    'ragDataAnomalyDetection',
    'ragDataProcessingLogs',
    'systemKillswitch',
    'adversarialAttackEvents',
    'benchmarkTestResults'
  ];
  
  console.log('🔍 필수 테이블 정의 확인 중...');
  for (const tableName of requiredTables) {
    if (!schemaModule[tableName]) {
      errors.push(`❌ 테이블 '${tableName}'이 정의되지 않았습니다.`);
      hasError = true;
    } else {
      console.log(`  ✅ ${tableName}`);
    }
  }
  
  // 모든 insert schema가 정의되어 있는지 확인
  const requiredInsertSchemas = [
    'insertUserSchema',
    'insertFinancialDataSchema',
    'insertRagEmbeddingSchemaSchema',
    'insertRagDataVersionControlSchema',
    'insertRagDataTamperingDetectionSchema',
    'insertRagDataAnomalyDetectionSchema',
    'insertRagDataProcessingLogSchema',
    'insertSystemKillswitchSchema',
    'insertAdversarialAttackEventSchema',
    'insertBenchmarkTestResultSchema'
  ];
  
  console.log('\n🔍 Insert Schema 정의 확인 중...');
  for (const schemaName of requiredInsertSchemas) {
    if (!schemaModule[schemaName]) {
      errors.push(`❌ Insert Schema '${schemaName}'이 정의되지 않았습니다.`);
      hasError = true;
    } else {
      console.log(`  ✅ ${schemaName}`);
    }
  }
  
  // 타입 export 확인 (타입은 런타임에 존재하지 않으므로 확인 불가)
  // 대신 타입이 사용되는지 확인하는 것은 TypeScript 컴파일러가 담당
  
  console.log('\n✅ 모든 스키마 검증 완료');
  
} catch (error: any) {
  console.error('\n❌ 스키마 로딩 중 오류 발생:');
  console.error(error.message);
  console.error('\n스택 트레이스:');
  console.error(error.stack);
  hasError = true;
  errors.push(`스키마 로딩 실패: ${error.message}`);
}

console.log('\n' + '='.repeat(60));

if (hasError) {
  console.error('\n❌ 검증 실패: 다음 오류가 발견되었습니다:\n');
  errors.forEach(err => console.error(err));
  console.error('\n⚠️  배포 전에 위 오류를 수정해주세요.');
  process.exit(1);
} else {
  console.log('\n✅ 모든 스키마가 올바르게 로드되었습니다!');
  console.log('✅ 배포 준비가 완료되었습니다.');
  process.exit(0);
}

